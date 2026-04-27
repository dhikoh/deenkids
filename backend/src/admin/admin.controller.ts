import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewAction } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('review')
  @Roles('ADMIN', 'SUPERADMIN')
  async getReviewQueue(@Query('page') page?: string) {
    return this.adminService.getReviewQueue(page ? parseInt(page) : 1);
  }

  @Post('review/:id/approve')
  @Roles('ADMIN', 'SUPERADMIN')
  async approveContent(@Param('id') id: string, @Req() req: any, @Body() body: { notes?: string, manualScore?: number }) {
    return this.adminService.reviewContent(id, req.user.id, ReviewAction.APPROVED, body.notes, body.manualScore);
  }

  @Post('review/:id/reject')
  @Roles('ADMIN', 'SUPERADMIN')
  async rejectContent(@Param('id') id: string, @Req() req: any, @Body() body: { notes: string }) {
    return this.adminService.reviewContent(id, req.user.id, ReviewAction.REJECTED, body.notes);
  }

  @Post('review/:id/revision')
  @Roles('ADMIN', 'SUPERADMIN')
  async requestRevision(@Param('id') id: string, @Req() req: any, @Body() body: { notes: string }) {
    return this.adminService.reviewContent(id, req.user.id, ReviewAction.REVISION_REQUESTED, body.notes);
  }
}
