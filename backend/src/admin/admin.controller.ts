import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReviewService } from './review.service';
import { StructureService } from './structure.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewAction } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reviewService: ReviewService,
    private readonly structureService: StructureService,
  ) {}

  // ── Dashboard Stats ──
  @Get('dashboard/stats')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get dashboard statistics based on user role' })
  async getDashboardStats(@Req() req: any) {
    return this.adminService.getDashboardStats(req.user.id, req.user.role);
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
}
