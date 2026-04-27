import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('SuperAdmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('superadmin')
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('users')
  @Roles('SUPERADMIN')
  async getUsers() {
    return this.superadminService.getUsers();
  }

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
}
