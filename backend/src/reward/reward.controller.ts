import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RewardService } from './reward.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RewardController {
  constructor(private rewardService: RewardService) {}

  // Author endpoints
  @Get('admin/points/balance')
  @ApiOperation({ summary: 'Get my point balance' })
  async getBalance(@Req() req: any) {
    return this.rewardService.getBalance(req.user.id);
  }

  @Get('admin/points/ledger')
  @ApiOperation({ summary: 'Get my point history' })
  async getLedger(@Req() req: any, @Query('page') page?: string) {
    return this.rewardService.getLedger(req.user.id, page ? parseInt(page) : 1);
  }

  @Get('admin/points/withdrawals')
  @ApiOperation({ summary: 'Get my withdrawal history' })
  async getMyWithdrawals(@Req() req: any, @Query('page') page?: string) {
    return this.rewardService.getMyWithdrawals(req.user.id, page ? parseInt(page) : 1);
  }

  @Post('admin/points/withdraw')
  @Roles('AUTHOR')
  @ApiOperation({ summary: 'Request point withdrawal' })
  async requestWithdrawal(@Req() req: any, @Body() body: { pointsAmount: number }) {
    return this.rewardService.requestWithdrawal(req.user.id, body.pointsAmount);
  }

  // SuperAdmin endpoints
  @Get('superadmin/points/leaderboard')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get author leaderboard' })
  async getLeaderboard() {
    return this.rewardService.getLeaderboard();
  }

  @Get('superadmin/withdrawals')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'List withdrawal requests' })
  async getWithdrawals(@Query('page') page?: string) {
    return this.rewardService.getWithdrawals(page ? parseInt(page) : 1);
  }

  @Put('superadmin/withdrawals/:id/process')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Process withdrawal (approve/reject/disburse)' })
  async processWithdrawal(@Req() req: any, @Param('id') id: string, @Body() body: { action: 'APPROVED' | 'REJECTED' | 'DISBURSED'; notes?: string }) {
    return this.rewardService.processWithdrawal(id, body.action, req.user.id, body.notes);
  }

  @Get('superadmin/reward-settings')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get reward settings' })
  async getSettings() {
    return this.rewardService.getRewardSettings();
  }

  @Put('superadmin/reward-settings')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update reward settings' })
  async updateSettings(@Body() body: Record<string, string>) {
    return this.rewardService.updateRewardSettings(body);
  }

  @Post('superadmin/users/:id/deduct-points')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Manually deduct points from a user (admin penalty)' })
  async deductPoints(@Req() req: any, @Param('id') id: string, @Body() body: { amount: number; reason: string }) {
    return this.rewardService.adminDeductPoints(id, body.amount, body.reason, req.user.id);
  }
}
