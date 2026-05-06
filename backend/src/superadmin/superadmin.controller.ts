import {
  Controller, Get, Put, Post, Body, UseGuards, Res, HttpCode,
  UseInterceptors, UploadedFile, BadRequestException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { SuperadminService } from './superadmin.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';

// Ensure upload directory exists at import time
const AUDIO_UPLOAD_DIR = join(process.cwd(), 'public', 'audio');
if (!existsSync(AUDIO_UPLOAD_DIR)) mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });

@ApiTags('SuperAdmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('superadmin')
export class SuperadminController {
  private readonly logger = new Logger(SuperadminController.name);
  constructor(private readonly superadminService: SuperadminService) {}

  // ── AI Settings ──
  @Get('settings/ai-toggle')
  @Roles('SUPERADMIN')
  async getAiToggle() {
    return this.superadminService.getAiConfig();
  }

  @Put('settings/ai-toggle')
  @Roles('SUPERADMIN')
  async setAiToggle(@Body() body: { enabled: boolean }) {
    return this.superadminService.toggleAi(body.enabled);
  }

  // ── API Settings (TTS + AI provider) ──
  @Get('settings/api')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get TTS and AI API settings (API keys are masked)' })
  async getApiSettings() {
    return this.superadminService.getApiSettings();
  }

  @Put('settings/api')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update TTS and AI API settings' })
  async updateApiSettings(@Body() body: { settings: { key: string; value: string; group: string }[] }) {
    return this.superadminService.updateApiSettings(body.settings || []);
  }

  // ── TTS Generate ──
  @Post('tts/generate')
  @Roles('SUPERADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate TTS audio from selected content blocks (returns MP3 binary)' })
  async generateTts(
    @Body() body: { blocks: { type: string; text: string }[]; filename?: string },
    @Res() res: Response,
  ) {
    if (!body.blocks || !Array.isArray(body.blocks) || body.blocks.length === 0) {
      throw new BadRequestException('blocks harus berupa array yang tidak kosong');
    }
    const audioBuffer = await this.superadminService.generateTts(body.blocks);
    const safeName = (body.filename || `narasi-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, '');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.mp3"`);
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  }

  // ── Audio Upload ──
  @Post('audio/upload')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Upload MP3 audio file for a content item (after TTS download)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: AUDIO_UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `narasi-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^audio\/(mpeg|mp3|mp4|ogg|wav)$/)) {
          return cb(new BadRequestException('Hanya file audio MP3/OGG/WAV yang diizinkan'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File audio tidak ditemukan dalam request');
    const url = `/audio/${file.filename}`;
    this.logger.log(`Audio uploaded: ${file.filename} (${file.size} bytes)`);
    return { url, filename: file.filename, size: file.size, message: 'Audio berhasil di-upload' };
  }

  // ── Donation Settings ──
  @Get('settings/donation')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get donation settings' })
  async getDonationSettings() {
    return this.superadminService.getDonationSettings();
  }

  @Put('settings/donation')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update donation settings' })
  async updateDonationSettings(@Body() body: {
    enabled: boolean;
    title?: string;
    message?: string;
    methods?: { type: string; label: string; value: string; icon?: string }[];
  }) {
    return this.superadminService.updateDonationSettings(body);
  }

  // ── Announcement Banner ──
  @Get('settings/announcement')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get announcement banner settings' })
  async getAnnouncement() {
    return this.superadminService.getAnnouncementSettings();
  }

  @Put('settings/announcement')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update announcement banner settings' })
  async updateAnnouncement(@Body() body: { enabled: boolean; text?: string; type?: string; link?: string }) {
    return this.superadminService.updateAnnouncementSettings(body);
  }
}
