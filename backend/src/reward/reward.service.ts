import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, PointType } from '@prisma/client';

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  // In-memory settings cache with 5-minute TTL
  private settingsCache: { data: any; expiry: number } | null = null;
  private static readonly SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService, private notificationService: NotificationService) {}

  async addPoints(userId: string, amount: number, type: PointType, reason: string, contentId?: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.pointLedger.create({ data: { userId, amount, type, reason, contentId } });
      if (amount < 0) {
        // Prevent negative balance: clamp to 0
        const user = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
        const newBalance = Math.max(0, (user?.points || 0) + amount);
        await tx.user.update({ where: { id: userId }, data: { points: newBalance } });
      } else {
        await tx.user.update({ where: { id: userId }, data: { points: { increment: amount } } });
      }
    });
    this.logger.log(`${amount >= 0 ? '+' : ''}${amount} poin untuk user ${userId}: ${reason}`);
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

  async getMyWithdrawals(userId: string, page = 1) {
    const take = 10;
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.withdrawalRequest.count({ where: { userId } }),
    ]);
    return { data, meta: { page, totalPages: Math.ceil(total / take), total } };
  }

  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      where: { role: 'AUTHOR', points: { gt: 0 } },
      orderBy: { points: 'desc' },
      take: 50,
      select: { id: true, name: true, email: true, points: true, authorStats: { select: { totalPublished: true, totalViews: true } } },
    });
    return { data: users };
  }

  async requestWithdrawal(userId: string, pointsAmount: number) {
    const settings = await this.getRewardSettings();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (!user.bankName || !user.bankAccount || !user.bankHolder) {
      throw new BadRequestException('Lengkapi data rekening bank di profil sebelum withdraw');
    }
    if (pointsAmount < settings.minWithdrawalPoints) {
      throw new BadRequestException(`Minimal withdrawal ${settings.minWithdrawalPoints} poin`);
    }
    if (user.points < pointsAmount) {
      throw new BadRequestException(`Saldo tidak cukup. Saldo: ${user.points} poin`);
    }

    // Anti-spam: block if there's already a PENDING or APPROVED withdrawal
    const existingActive = await this.prisma.withdrawalRequest.findFirst({
      where: { userId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (existingActive) {
      throw new BadRequestException('Anda masih memiliki permintaan withdrawal yang sedang diproses. Tunggu hingga selesai sebelum mengajukan lagi.');
    }

    const rupiahAmount = pointsAmount * settings.pointToRupiah;

    // Atomic transaction: create request + deduct points in one go to prevent race condition
    const request = await this.prisma.$transaction(async (tx) => {
      // Race condition guard: conditional update ensures saldo is still sufficient
      const updated = await tx.user.updateMany({
        where: { id: userId, points: { gte: pointsAmount } },
        data: { points: { decrement: pointsAmount } },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Saldo tidak cukup atau sedang diproses request lain.');
      }

      const req = await tx.withdrawalRequest.create({
        data: { userId, pointsAmount, rupiahAmount, bankName: user.bankName, bankAccount: user.bankAccount, bankHolder: user.bankHolder },
      });

      await tx.pointLedger.create({
        data: { userId, amount: -pointsAmount, type: PointType.WITHDRAWAL, reason: `Withdrawal request #${req.id.slice(0, 8)}` },
      });

      return req;
    });

    // Notify superadmins (outside transaction — non-critical)
    await this.notificationService.notifySuperAdmins(
      userId,
      NotificationType.WITHDRAWAL_REQUESTED,
      'Permintaan Withdrawal Baru',
      `${user.name} meminta withdrawal ${pointsAmount} poin (Rp ${rupiahAmount.toLocaleString('id-ID')})`,
      '/admin/withdrawal-inbox',
    ).catch((err) => this.logger.warn(`Notifikasi withdrawal gagal: ${err.message}`));

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
    if (!request) throw new NotFoundException('Request tidak ditemukan');

    // Strict state machine validation
    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['DISBURSED'],
      REJECTED: [],
      DISBURSED: [],
    };
    const allowed = validTransitions[request.status] || [];
    if (!allowed.includes(action)) {
      throw new BadRequestException(`Tidak bisa mengubah status dari ${request.status} ke ${action}`);
    }

    if (action === 'REJECTED' && request.status === 'PENDING') {
      // Refund points
      await this.addPoints(request.userId, request.pointsAmount, PointType.EARNED, `Refund withdrawal ditolak #${id.slice(0, 8)}`);
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
    // Return cached settings if still valid
    if (this.settingsCache && Date.now() < this.settingsCache.expiry) {
      return this.settingsCache.data;
    }

    const keys = ['point_per_approved', 'point_views_milestone', 'point_likes_milestone', 'point_shares_milestone', 'point_rating_bonus', 'point_to_rupiah', 'min_withdrawal_points', 'max_submit_per_day'];
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const result = {
      pointPerApproved: parseInt(map.point_per_approved || '10'),
      pointViewsMilestone: parseInt(map.point_views_milestone || '5'),
      pointLikesMilestone: parseInt(map.point_likes_milestone || '3'),
      pointSharesMilestone: parseInt(map.point_shares_milestone || '3'),
      pointRatingBonus: parseInt(map.point_rating_bonus || '5'),
      pointToRupiah: parseInt(map.point_to_rupiah || '1000'),
      minWithdrawalPoints: parseInt(map.min_withdrawal_points || '50'),
      maxSubmitPerDay: parseInt(map.max_submit_per_day || '5'),
    };

    // Store in cache
    this.settingsCache = { data: result, expiry: Date.now() + RewardService.SETTINGS_CACHE_TTL };
    return result;
  }

  async updateRewardSettings(data: Record<string, string>) {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { group: 'reward', key, value },
      });
    }
    // Invalidate cache on settings update
    this.settingsCache = null;
    return { message: 'Pengaturan reward diperbarui' };
  }

  // ── Helper: Check if content has already been rewarded ──
  async hasRewardedForContent(contentId: string): Promise<boolean> {
    const existing = await this.prisma.pointLedger.findFirst({
      where: { contentId, type: PointType.EARNED, amount: { gt: 0 } },
    });
    return !!existing;
  }

  // ── Deduct points when content is unpublished ──
  async deductPointsForContent(contentId: string, authorId: string, contentTitle: string) {
    // Find the original reward for this content
    const reward = await this.prisma.pointLedger.findFirst({
      where: { contentId, type: PointType.EARNED, amount: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
    });
    if (!reward) {
      this.logger.log(`No reward found for content ${contentId}, skipping deduction`);
      return;
    }
    // Deduct the same amount that was originally awarded
    await this.addPoints(
      authorId,
      -reward.amount,
      PointType.DEDUCTION,
      `Konten di-unpublish: ${contentTitle}`,
      contentId,
    );
    this.logger.log(`Deducted ${reward.amount} poin from user ${authorId} for unpublished content: ${contentTitle}`);
  }

  // ── Admin manual penalty ──
  async adminDeductPoints(targetUserId: string, amount: number, reason: string, adminId: string) {
    if (amount <= 0) throw new BadRequestException('Jumlah poin harus lebih dari 0');
    if (!reason || reason.length < 5) throw new BadRequestException('Alasan wajib diisi (min. 5 karakter)');

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User tidak ditemukan');

    await this.addPoints(
      targetUserId,
      -amount,
      PointType.DEDUCTION,
      `Penalty oleh Admin: ${reason}`,
    );

    // Notify the user
    await this.notificationService.createNotification({
      userId: targetUserId,
      actorId: adminId,
      type: NotificationType.POINTS_EARNED,
      title: 'Poin Dikurangi ⚠️',
      message: `${amount} poin dikurangi. Alasan: ${reason}`,
      linkUrl: '/admin/rewards',
    });

    return { message: `${amount} poin berhasil dikurangi dari ${target.name}` };
  }
}
