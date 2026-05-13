import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Req, HttpCode, BadRequestException, Logger } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReviewService } from './review.service';
import { StructureService } from './structure.service';
import { N8nService, SaveContentPayload } from '../n8n/n8n.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewAction } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly reviewService: ReviewService,
    private readonly structureService: StructureService,
    private readonly n8nService: N8nService,
  ) {}

  // ── Dashboard Stats ──
  @Get('dashboard/stats')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get dashboard statistics based on user role' })
  async getDashboardStats(@Req() req: any) {
    return this.adminService.getDashboardStats(req.user.id, req.user.role);
  }

  @Get('dashboard/scheduled-posts')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get upcoming scheduled social posts' })
  async getScheduledPosts(@Req() req: any) {
    return this.adminService.getScheduledPosts(req.user.id, req.user.role);
  }

  // ── Review Queue ──
  @Get('review')
  @Roles('ADMIN', 'SUPERADMIN')
  async getReviewQueue(@Query('page') page?: string) {
    return this.reviewService.getReviewQueue(page ? parseInt(page) : 1);
  }

  @Post('review/:id/approve')
  @Roles('ADMIN', 'SUPERADMIN')
  async approveContent(@Param('id') id: string, @Req() req: any, @Body() body: { notes?: string; manualScore?: number; pointAdjustment?: number; adjustmentReason?: string }) {
    return this.reviewService.reviewContent(id, req.user.id, ReviewAction.APPROVED, body.notes, body.manualScore, body.pointAdjustment, body.adjustmentReason);
  }

  @Post('review/:id/reject')
  @Roles('ADMIN', 'SUPERADMIN')
  async rejectContent(@Param('id') id: string, @Req() req: any, @Body() body: { notes: string; pointAdjustment?: number; adjustmentReason?: string }) {
    return this.reviewService.reviewContent(id, req.user.id, ReviewAction.REJECTED, body.notes, undefined, body.pointAdjustment, body.adjustmentReason);
  }

  @Post('review/:id/revision')
  @Roles('ADMIN', 'SUPERADMIN')
  async requestRevision(@Param('id') id: string, @Req() req: any, @Body() body: { notes: string; pointAdjustment?: number; adjustmentReason?: string }) {
    return this.reviewService.reviewContent(id, req.user.id, ReviewAction.REVISION_REQUESTED, body.notes, undefined, body.pointAdjustment, body.adjustmentReason);
  }

  @Post('review/:id/unpublish')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Unpublish content — pull back to REVISION for re-review' })
  async unpublishContent(@Param('id') id: string, @Req() req: any, @Body() body: { notes?: string }) {
    return this.reviewService.unpublishContent(id, req.user.id, body.notes);
  }

  // ── Content Node Structure ──
  @Get('structure')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get content structure tree filtered by group (PEMBELAJARAN or KISAH)' })
  async getStructure(@Query('group') group?: string) {
    return this.structureService.getStructure(group);
  }

  @Post('structure')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Create a new content node' })
  async createNode(@Body() body: { title: string; type: string; parentId?: string; ageGroups?: string[]; icon?: string; order?: number; description?: string; group?: string }) {
    return this.structureService.createNode(body);
  }

  @Put('structure/:id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Update a content node' })
  async updateNode(@Param('id') id: string, @Body() body: any) {
    return this.structureService.updateNode(id, body);
  }

  @Delete('structure/:id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Delete a content node' })
  async deleteNode(@Param('id') id: string) {
    return this.structureService.deleteNode(id);
  }

  @Get('structure/:id/contents')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get contents inside a specific node (for migration)' })
  async getNodeContents(@Param('id') id: string) {
    return this.structureService.getNodeContents(id);
  }

  @Put('structure/:id/move-contents')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Bulk move all contents from one node to another' })
  async bulkMoveContents(@Param('id') id: string, @Body() body: { targetNodeId: string }) {
    return this.structureService.bulkMoveContents(id, body.targetNodeId);
  }

  @Put('content/:id/assign-node')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Assign content to a specific node in the structure' })
  async assignContentToNode(@Param('id') id: string, @Body() body: { nodeId: string }) {
    return this.structureService.assignContentToNode(id, body.nodeId);
  }

  // ── All Contents for Admin ──
  @Get('contents')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get all contents for admin management' })
  async getAllContents(@Query('status') status?: string, @Query('page') page?: string, @Query('search') search?: string, @Query('age') age?: string) {
    return this.adminService.getAllContents(status, page ? parseInt(page) : 1, search, age);
  }

  // ── DRAFT Cleanup ──
  @Get('drafts')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'List DRAFT contents for cleanup — superadmin only' })
  async getDraftList(
    @Query('olderThan') olderThan?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getDraftList({
      olderThanDays: olderThan ? parseInt(olderThan) : undefined,
      type,
      page: page ? parseInt(page) : 1,
    });
  }

  @Delete('drafts/bulk')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Bulk soft-delete DRAFT items by IDs — superadmin only' })
  async bulkDeleteDrafts(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteDrafts(body.ids || []);
  }

  // ── Import AI Content ──

  /**
   * Import content from AI output (Gemini/ChatGPT).
   * Accepts raw text with markers like (paragraph), (dalil), (doa), etc.
   * Parses blocks, extracts metadata, and saves as DRAFT.
   * Uses JWT auth — SUPERADMIN only.
   */
  @Post('import-ai')
  @HttpCode(201)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Import AI-generated content — parse markers and save as DRAFT' })
  async importAiContent(@Body() body: { rawContent: string; type?: string; subType?: string; pov?: string; title?: string; nodeId?: string }) {
    if (!body.rawContent?.trim()) {
      throw new BadRequestException('rawContent wajib diisi');
    }
    if (body.rawContent.trim().length < 50) {
      throw new BadRequestException('Konten terlalu pendek (minimum 50 karakter)');
    }

    const type = body.type || 'KISAH';
    this.logger.log(`Admin import-ai: type=${type}, ${body.rawContent.length} chars`);

    // Extract metadata from raw content
    const meta = this.n8nService.extractMetaFromRaw(body.rawContent);

    const payload: SaveContentPayload = {
      title: body.title || '',
      rawContent: body.rawContent.trim(),
      type: type as any,
      subType: body.subType || undefined,
      nodeId: body.nodeId || undefined,
      pov: body.pov || undefined,
      openingText: meta.openingText,
      closingText: meta.closingText,
    };

    return this.n8nService.saveContent(payload);
  }
}
