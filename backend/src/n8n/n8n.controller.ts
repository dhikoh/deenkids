import {
  Controller, Post, Get, Param, Body, UseGuards, HttpCode,
  Logger, BadRequestException, Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { N8nApiKeyGuard } from '../common/guards/n8n-api-key.guard';
import { N8nService, SaveContentPayload } from './n8n.service';
import { N8nPromptService, GeneratePromptDto, GenerateThumbPromptDto } from './n8n-prompt.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('N8N Automation')
@ApiHeader({ name: 'X-N8N-API-Key', description: 'API key for n8n authentication', required: true })
@UseGuards(N8nApiKeyGuard)
@SkipThrottle()
@Controller('n8n')
export class N8nController {
  private readonly logger = new Logger(N8nController.name);

  constructor(
    private readonly n8nService: N8nService,
    private readonly promptService: N8nPromptService,
  ) {}

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

  /**
   * Export saved content as .txt or .doc file for Telegram delivery.
   * Query param: ?format=txt (default) | ?format=doc
   */
  @Get('export-txt/:id')
  @ApiOperation({ summary: 'Export content as .txt or .doc file for Telegram' })
  async exportAsTxt(
    @Param('id') id: string,
    @Res() res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ) {
    // Read format from query string manually (avoid importing Query to keep imports minimal)
    const formatParam = (res.req as any)?.query?.format;
    const format: 'txt' | 'doc' = formatParam === 'doc' ? 'doc' : 'txt';

    const { filename, content, mimeType } = await this.n8nService.exportContentAsTxt(id, format);
    const safeFilename = encodeURIComponent(filename);
    res.setHeader('Content-Type', `${mimeType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Content-Length', Buffer.byteLength(content, 'utf-8').toString());
    res.send(content);
  }

  /**
   * Generate content prompt (same quality as web prompt generator).
   */
  @Post('generate-prompt')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate content prompt for Gemini' })
  async generatePrompt(@Body() body: GeneratePromptDto) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title wajib diisi');
    }
    if (!body.type) {
      throw new BadRequestException('type wajib diisi (QNA/ARTICLE/PEMBELAJARAN/KISAH)');
    }
    this.logger.log(`n8n generate-prompt: "${body.title}" (${body.type})`);
    const prompt = this.promptService.generatePrompt(body);
    return { success: true, prompt };
  }

  /**
   * Generate thumbnail image prompt.
   */
  @Post('generate-thumb-prompt')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate thumbnail prompt for AI image generator' })
  async generateThumbPrompt(@Body() body: GenerateThumbPromptDto) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title wajib diisi');
    }
    if (!body.ratio) {
      throw new BadRequestException('ratio wajib diisi (16:9/1:1/4:5)');
    }
    this.logger.log(`n8n generate-thumb-prompt: "${body.title}" (${body.ratio})`);
    const prompt = this.promptService.generateThumbnailPrompt(body);
    return { success: true, prompt };
  }
}
