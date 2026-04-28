import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('SuperAdmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  // ── Users ──
  @Get('users')
  @Roles('SUPERADMIN')
  async getUsers() {
    return this.superadminService.getUsers();
  }

  @Put('users/:id/role')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.superadminService.updateUserRole(id, body.role);
  }

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
