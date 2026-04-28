import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(private prisma: PrismaService, private notificationService: NotificationService) {}

  async addPoints(userId: string, amount: number, type: string, reason: string, contentId?: string) {
    await this.prisma.$transaction([
      this.prisma.pointLedger.create({ data: { userId, amount, type, reason, contentId } }),
      this.prisma.user.update({ where: { id: userId }, data: { points: { increment: amount } } }),
    ]);
    this.logger.log(`+${amount} poin untuk user ${userId}: ${reason}`);
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    const settings = await this.getRewardSettings();
    return {
      points: user?.points || 0,
      rupiahValue: (user?.points || 0) * settings.pointToRupiah,
      pointToRupiah: settings.pointToRupiah,
      minWithdrawal: settings.minWithdrawalPoints,
    };
  }

  async getLedger(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.pointLedger.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.pointLedger.count({ where: { userId } }),
    ]);
    return { data, meta: { page, totalPages: Math.ceil(total / take), total } };
  }

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { role: 'AUTHOR' },
      orderBy: { points: 'desc' },
      take: 50,
      select: { id: true, name: true, email: true, points: true, authorStats: { select: { totalPublished: true, totalViews: true } } },
    });
    return { data: users };
  }

  async requestWithdrawal(userId: string, pointsAmount: number) {
    const settings = await this.getRewardSettings();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');
    if (!user.bankName || !user.bankAccount || !user.bankHolder) {
      throw new Error('Lengkapi data rekening bank di profil sebelum withdraw');
    }
    if (pointsAmount < settings.minWithdrawalPoints) {
      throw new Error(`Minimal withdrawal ${settings.minWithdrawalPoints} poin`);
    }
    if (user.points < pointsAmount) {
      throw new Error(`Saldo tidak cukup. Saldo: ${user.points} poin`);
    }

    const rupiahAmount = pointsAmount * settings.pointToRupiah;

    const request = await this.prisma.withdrawalRequest.create({
      data: { userId, pointsAmount, rupiahAmount, bankName: user.bankName, bankAccount: user.bankAccount, bankHolder: user.bankHolder },
    });

    // Deduct points immediately
    await this.addPoints(userId, -pointsAmount, 'WITHDRAWAL', `Withdrawal request #${request.id.slice(0, 8)}`);

    // Notify superadmins
    await this.notificationService.notifySuperAdmins(
      userId,
      NotificationType.WITHDRAWAL_REQUESTED,
      'Permintaan Withdrawal Baru',
      `${user.name} meminta withdrawal ${pointsAmount} poin (Rp ${rupiahAmount.toLocaleString('id-ID')})`,
      '/admin/withdrawal-inbox',
    );

    return { data: request, message: 'Permintaan withdrawal berhasil dikirim' };
  }

  async getWithdrawals(page = 1) {
    const take = 20;
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        orderBy: { createdAt: 'desc' }, take, skip,
        include: { user: { select: { name: true, email: true, phone: true } } },
      }),
      this.prisma.withdrawalRequest.count(),
    ]);
    return { data, meta: { page, totalPages: Math.ceil(total / take), total } };
  }

  async processWithdrawal(id: string, action: 'APPROVED' | 'REJECTED' | 'DISBURSED', adminId: string, notes?: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request) throw new Error('Request tidak ditemukan');

    if (action === 'REJECTED' && request.status === 'PENDING') {
      // Refund points
      await this.addPoints(request.userId, request.pointsAmount, 'EARNED', `Refund dari withdrawal ditolak #${id.slice(0, 8)}`);
    }

    await this.prisma.withdrawalRequest.update({
      where: { id },
      data: { status: action, processedBy: adminId, processedAt: new Date(), notes },
    });

    // Notify author
    const statusMap: Record<string, string> = {
      APPROVED: 'disetujui, menunggu transfer',
      REJECTED: 'ditolak',
      DISBURSED: 'telah ditransfer',
    };
    await this.notificationService.createNotification({
      userId: request.userId,
      actorId: adminId,
      type: NotificationType.WITHDRAWAL_PROCESSED,
      title: `Withdrawal ${statusMap[action]}`,
      message: `Withdrawal Rp ${request.rupiahAmount.toLocaleString('id-ID')} ${statusMap[action]}.${notes ? ` Catatan: ${notes}` : ''}`,
      linkUrl: '/admin/rewards',
    });

    return { message: `Withdrawal ${statusMap[action]}` };
  }

  async getRewardSettings() {
    const keys = ['point_per_approved', 'point_views_milestone', 'point_likes_milestone', 'point_to_rupiah', 'min_withdrawal_points', 'max_submit_per_day'];
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    return {
      pointPerApproved: parseInt(map.point_per_approved || '10'),
      pointViewsMilestone: parseInt(map.point_views_milestone || '5'),
      pointLikesMilestone: parseInt(map.point_likes_milestone || '3'),
      pointToRupiah: parseInt(map.point_to_rupiah || '1000'),
      minWithdrawalPoints: parseInt(map.min_withdrawal_points || '50'),
      maxSubmitPerDay: parseInt(map.max_submit_per_day || '5'),
    };
  }

  async updateRewardSettings(data: Record<string, string>) {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { group: 'reward', key, value },
      });
    }
    return { message: 'Pengaturan reward diperbarui' };
  }

  // Called by cron — check engagement milestones
  async checkEngagementMilestones() {
    const contents = await this.prisma.contentItem.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, authorId: true, viewCount: true, likeCount: true, title: true },
    });
    const settings = await this.getRewardSettings();

    for (const content of contents) {
      // Check views milestones (every 500 views)
      const viewMilestones = Math.floor(content.viewCount / 500);
      if (viewMilestones > 0) {
        const existingViewBonuses = await this.prisma.pointLedger.count({
          where: { contentId: content.id, type: 'BONUS', reason: { startsWith: 'Bonus views' } },
        });
        if (viewMilestones > existingViewBonuses) {
          await this.addPoints(content.authorId, settings.pointViewsMilestone, 'BONUS', `Bonus views milestone ${viewMilestones * 500} views: ${content.title}`, content.id);
        }
      }

      // Check likes milestones (every 50 likes)
      const likeMilestones = Math.floor(content.likeCount / 50);
      if (likeMilestones > 0) {
        const existingLikeBonuses = await this.prisma.pointLedger.count({
          where: { contentId: content.id, type: 'BONUS', reason: { startsWith: 'Bonus likes' } },
        });
        if (likeMilestones > existingLikeBonuses) {
          await this.addPoints(content.authorId, settings.pointLikesMilestone, 'BONUS', `Bonus likes milestone ${likeMilestones * 50} likes: ${content.title}`, content.id);
        }
      }
    }
  }
}
