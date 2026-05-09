import {
  Controller, Post, Get, Param, Body, UseGuards, HttpCode,
  Logger, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { N8nApiKeyGuard } from '../common/guards/n8n-api-key.guard';
import { N8nService, SaveContentPayload } from './n8n.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('N8N Automation')
@ApiHeader({ name: 'X-N8N-API-Key', description: 'API key for n8n authentication', required: true })
@UseGuards(N8nApiKeyGuard)
@SkipThrottle()
@Controller('n8n')
export class N8nController {
  private readonly logger = new Logger(N8nController.name);

  constructor(private readonly n8nService: N8nService) {}

  /**
   * Save content from parsed Gemini output.
   * Accepts either pre-parsed blocks or raw text for server-side parsing.
   */
  @Post('save-content')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create content from n8n bot (raw or pre-parsed)' })
  async saveContent(@Body() body: SaveContentPayload) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title wajib diisi');
    }
    if (!body.type) {
      throw new BadRequestException('type wajib diisi (QNA/ARTICLE/PEMBELAJARAN/KISAH)');
    }

    // If raw content provided but no blocks, extract opening/closing meta
    if (body.rawContent && !body.blocks?.length) {
      const meta = this.n8nService.extractMetaFromRaw(body.rawContent);
      if (meta.openingText && !body.openingText) body.openingText = meta.openingText;
      if (meta.closingText && !body.closingText) body.closingText = meta.closingText;
    }

    this.logger.log(`n8n save-content: "${body.title}" (${body.type})`);
    return this.n8nService.saveContent(body);
  }

  /**
   * Submit a content item for review (DRAFT → REVIEW).
   */
  @Post('submit/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit content for admin review' })
  async submitContent(@Param('id') id: string) {
    return this.n8nService.submitContent(id);
  }

  /**
   * Get content status by ID.
   */
  @Get('status/:id')
  @ApiOperation({ summary: 'Check content status' })
  async getStatus(@Param('id') id: string) {
    return this.n8nService.getStatus(id);
  }
}
