import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async createNotification(data: {
    userId: string;
    actorId?: string;
    type: NotificationType;
    title: string;
    message: string;
    linkUrl?: string;
  }) {
    return this.prisma.internalNotification.create({ data });
  }

  async notifyByRole(role: string, actorId: string | null, type: NotificationType, title: string, message: string, linkUrl?: string) {
    const users = await this.prisma.user.findMany({
      where: { role: role as any },
      select: { id: true },
    });
    const notifications = users.map(u => ({
      userId: u.id,
      actorId,
      type,
      title,
      message,
      linkUrl,
    }));
    if (notifications.length > 0) {
      await this.prisma.internalNotification.createMany({ data: notifications });
    }
    this.logger.log(`Notified ${notifications.length} ${role}(s): ${title}`);
  }

  async notifySuperAdmins(actorId: string | null, type: NotificationType, title: string, message: string, linkUrl?: string) {
    return this.notifyByRole('SUPERADMIN', actorId, type, title, message, linkUrl);
  }

  async notifyAdminsAndSuperAdmins(actorId: string | null, type: NotificationType, title: string, message: string, linkUrl?: string) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN'] as any } },
      select: { id: true },
    });
    const notifications = users.map(u => ({
      userId: u.id, actorId, type, title, message, linkUrl,
    }));
    if (notifications.length > 0) {
      await this.prisma.internalNotification.createMany({ data: notifications });
    }
  }

  async getNotifications(userId: string, page = 1, limit = 20, search?: string, filter?: string) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (filter === 'unread') where.isRead = false;
    if (filter === 'read') where.isRead = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.internalNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { actor: { select: { name: true } } },
      }),
      this.prisma.internalNotification.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.internalNotification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notifId: string) {
    return this.prisma.internalNotification.updateMany({
      where: { id: notifId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.internalNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async deleteNotification(userId: string, notifId: string) {
    return this.prisma.internalNotification.deleteMany({
      where: { id: notifId, userId },
    });
  }

  async deleteAllRead(userId: string) {
    return this.prisma.internalNotification.deleteMany({
      where: { userId, isRead: true },
    });
  }

  // Cron: cleanup notifications older than 30 days (runs daily at 3am)
  @Cron('0 3 * * *')
  async cleanupOldNotifications() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const result = await this.prisma.internalNotification.deleteMany({
      where: { createdAt: { lt: cutoff }, isRead: true },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old notifications (>30 days)`);
    }
  }
}
