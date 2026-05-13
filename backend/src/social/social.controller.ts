import {
  Controller, Get, Post, Put, Delete,
  Query, Param, Body, Req, Res,
  UseGuards, Logger, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialTokenService } from './social-token.service';
import { YouTubeTokenService } from './youtube-token.service';
import { PublishSocialDto, UpdateSocialDefaultsDto } from './dto/social.dto';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@ApiTags('Social Media')
@ApiBearerAuth()
@Controller('social')
export class SocialController {
  private readonly logger = new Logger(SocialController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly socialService: SocialService,
    private readonly tokenService: SocialTokenService,
    private readonly ytTokenService: YouTubeTokenService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') || 'https://adably.id';
  }

  // ─── OAuth Flow ────────────────────────────────────────────────

  /**
   * GET /social/auth-url — Generate OAuth URL for Facebook login
   */
  @Get('auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  getAuthUrl() {
    const csrfState = randomBytes(16).toString('hex');
    const url = this.tokenService.getAuthUrl(csrfState);
    return { url, state: csrfState };
  }

  /**
   * GET /social/callback — OAuth callback from Facebook (redirect, no auth guard)
   */
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      this.logger.warn(`OAuth callback error: ${error || 'no code'}`);
      return res.redirect(`${this.frontendUrl}/admin/social-settings?error=oauth_denied`);
    }

    try {
      // We need the user ID — for callback flow, we store it temporarily
      // Since this is SuperAdmin only, we connect using a temporary approach
      // The frontend will call /social/connect after getting the code
      return res.redirect(`${this.frontendUrl}/admin/social-settings?code=${code}&state=${state}`);
    } catch (err) {
      this.logger.error(`OAuth callback failed: ${err.message}`);
      return res.redirect(`${this.frontendUrl}/admin/social-settings?error=callback_failed`);
    }
  }

  // ─── YouTube OAuth Flow ─────────────────────────────────────────

  /**
   * GET /social/youtube/auth-url — Generate OAuth URL for YouTube
   */
  @Get('youtube/auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  getYouTubeAuthUrl() {
    const csrfState = randomBytes(16).toString('hex');
    const url = this.ytTokenService.getAuthUrl(csrfState);
    return { url, state: csrfState };
  }

  /**
   * GET /social/youtube/callback — OAuth callback from Google
   */
  @Get('youtube/callback')
  async handleYouTubeCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      this.logger.warn(`YouTube OAuth callback error: ${error || 'no code'}`);
      return res.redirect(`${this.frontendUrl}/admin/social-settings?error=youtube_oauth_denied`);
    }
    return res.redirect(`${this.frontendUrl}/admin/social-settings?yt_code=${code}`);
  }

  /**
   * POST /social/youtube/connect — Connect YouTube account using OAuth code
   */
  @Post('youtube/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async connectYouTube(@Req() req: Request, @Body('code') code: string) {
    const userId = (req as any).user.id;
    const account = await this.socialService.connectYouTube(userId, code);
    return { success: true, data: account };
  }

  /**
   * POST /social/connect — Connect account using OAuth code (called by frontend after callback)
   */
  @Post('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async connectAccount(@Req() req: Request, @Body('code') code: string) {
    const userId = (req as any).user.id;
    const account = await this.socialService.connectAccount(userId, code);
    return { success: true, data: account };
  }

  // ─── Account Management ────────────────────────────────────────

  /**
   * GET /social/accounts — List connected social accounts
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async getAccounts(@Req() req: Request) {
    const userId = (req as any).user.id;
    const data = await this.socialService.getAccounts(userId);
    return { data };
  }

  /**
   * DELETE /social/accounts/:id — Disconnect account
   */
  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async disconnectAccount(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user.id;
    await this.socialService.disconnectAccount(id, userId);
    return { success: true };
  }

  /**
   * PUT /social/accounts/:id/defaults — Update default hashtags & caption template
   */
  @Put('accounts/:id/defaults')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async updateDefaults(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSocialDefaultsDto,
  ) {
    const userId = (req as any).user.id;
    const data = await this.socialService.updateDefaults(id, userId, dto);
    return { success: true, data };
  }

  // ─── Publishing ────────────────────────────────────────────────

  /**
   * POST /social/publish — Publish or schedule content to social media
   */
  @Post('publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async publishToSocial(@Req() req: Request, @Body() dto: PublishSocialDto) {
    const userId = (req as any).user.id;
    return this.socialService.handlePublish(userId, dto);
  }

  /**
   * GET /social/caption-preview — Generate caption preview for a content
   */
  @Get('caption-preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async getCaptionPreview(@Req() req: Request, @Query('contentId') contentId: string) {
    const userId = (req as any).user.id;
    return this.socialService.generateCaption(contentId, userId);
  }

  // ─── Logs & Monitoring ─────────────────────────────────────────

  /**
   * GET /social/logs — Fetch publish history (paginated)
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async getLogs(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('contentId') contentId?: string,
  ) {
    const userId = (req as any).user.id;
    return this.socialService.getLogs(userId, parseInt(page, 10) || 1, contentId);
  }

  /**
   * POST /social/retry/:logId — Retry a failed publish
   */
  @Post('retry/:logId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async retryPublish(@Req() req: Request, @Param('logId') logId: string) {
    const userId = (req as any).user.id;
    return this.socialService.retryPublish(logId, userId);
  }

  /**
   * DELETE /social/scheduled/:logId — Cancel a scheduled publish
   */
  @Delete('scheduled/:logId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async cancelScheduled(@Req() req: Request, @Param('logId') logId: string) {
    const userId = (req as any).user.id;
    return this.socialService.cancelScheduled(logId, userId);
  }

  // ─── Cron Settings ─────────────────────────────────────────────

  /**
   * GET /social/cron-settings — Get social cron job configuration
   */
  @Get('cron-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  async getCronSettings() {
    return this.socialService.getCronSettings();
  }

  /**
   * PUT /social/cron-settings — Update social cron job configuration
   */
  @Put('cron-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @HttpCode(200)
  async updateCronSettings(@Body() body: {
    publishEnabled?: boolean;
    publishInterval?: number;
    validateEnabled?: boolean;
    validateInterval?: number;
  }) {
    return this.socialService.updateCronSettings(body);
  }
}
