import { Controller, Get, Put, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get notifications with filter' })
  async getNotifications(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    return this.notificationService.getNotifications(req.user.id, page ? parseInt(page) : 1, 20, search, filter);
  }

  @Get('unread-count')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get unread count' })
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);
    return { count };
  }

  @Put(':id/read')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationService.markAsRead(req.user.id, id);
    return { message: 'Notifikasi ditandai sudah dibaca' };
  }

  @Put('read-all')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { message: 'Semua notifikasi ditandai sudah dibaca' };
  }

  @Delete(':id')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    await this.notificationService.deleteNotification(req.user.id, id);
    return { message: 'Notifikasi dihapus' };
  }

  @Delete('read/all')
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Delete all read notifications' })
  async deleteAllRead(@Req() req: any) {
    await this.notificationService.deleteAllRead(req.user.id);
    return { message: 'Semua notifikasi yang sudah dibaca dihapus' };
  }
}
