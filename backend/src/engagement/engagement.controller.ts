import { Controller, Post, Body } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { ToggleEngagementDto, SubmitRatingDto } from './dto/engagement.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Engagement')
@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

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
