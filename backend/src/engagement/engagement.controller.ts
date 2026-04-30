import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { ToggleEngagementDto, SubmitRatingDto } from './dto/engagement.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Engagement')
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get engagement status for a content/user pair' })
  async getStatus(@Query('contentId') contentId: string, @Query('userHash') userHash: string) {
    return this.engagementService.getStatus(contentId, userHash);
  }

  @Post('like')
  @ApiOperation({ summary: 'Toggle Like for a content' })
  async toggleLike(@Body() dto: ToggleEngagementDto) {
    return this.engagementService.toggleLike(dto.contentId, dto.userHash);
  }

  @Post('bookmark')
  @ApiOperation({ summary: 'Toggle Bookmark for a content' })
  async toggleBookmark(@Body() dto: ToggleEngagementDto) {
    return this.engagementService.toggleBookmark(dto.contentId, dto.userHash);
  }

  @Post('rating')
  @ApiOperation({ summary: 'Submit Star Rating (1-5)' })
  async submitRating(@Body() dto: SubmitRatingDto) {
    return this.engagementService.submitRating(dto.contentId, dto.userHash, dto.rating);
  }

  @Post('view')
  @ApiOperation({ summary: 'Record Content View' })
  async recordView(@Body() dto: ToggleEngagementDto) {
    return this.engagementService.recordView(dto.contentId, dto.userHash);
  }

  @Post('share')
  @ApiOperation({ summary: 'Record Content Share' })
  async recordShare(@Body() body: { contentId: string }) {
    return this.engagementService.recordShare(body.contentId);
  }
}
