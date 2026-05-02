import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../reward/reward.service';
import { NotificationService } from '../notification/notification.service';
import { ReviewAction, PointType, ContentStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private prisma: PrismaService,
    private rewardService: RewardService,
    private notificationService: NotificationService,
  ) {}

  async getReviewQueue(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: { status: 'REVIEW', deletedAt: null },
        include: {
          author: { select: { name: true } },
          node: { select: { title: true } },
          tags: { include: { tag: true } },
          aiCheckResults: { orderBy: { checkedAt: 'desc' as const }, take: 1 },
        },
        orderBy: { updatedAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.contentItem.count({ where: { status: 'REVIEW', deletedAt: null } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async reviewContent(contentId: string, reviewerId: string, action: ReviewAction, notes?: string, manualScore?: number) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId, deletedAt: null },
      include: { aiCheckResults: { orderBy: { checkedAt: 'desc' }, take: 1 } },
    });

    if (!content) throw new NotFoundException('Content not found');

    // Status guard: hanya konten REVIEW yang bisa di-review
    if (content.status !== 'REVIEW') {
      throw new BadRequestException(
        `Konten berstatus "${content.status}" tidak bisa direview. Hanya konten berstatus REVIEW yang dapat ditinjau.`,
      );
    }

    // Allow SUPERADMIN to review their own content
    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
    if (content.authorId === reviewerId && reviewer?.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Anda tidak bisa mereview konten sendiri');
    }

    const aiCheck = content.aiCheckResults[0];
    let newStatus: ContentStatus = content.status;
    if (action === 'APPROVED') newStatus = ContentStatus.PUBLISHED;
    else if (action === 'REJECTED') newStatus = ContentStatus.DRAFT;
    else if (action === 'REVISION_REQUESTED') newStatus = ContentStatus.REVISION;

    await this.prisma.$transaction([
      this.prisma.contentItem.update({
        where: { id: contentId },
        data: {
          status: newStatus,
          ...(newStatus === ContentStatus.PUBLISHED && { publishedAt: new Date() }),
        },
      }),
      this.prisma.reviewHistory.create({
        data: {
          contentId,
          reviewerId,
          action,
          aiAssisted: !!aiCheck,
          aiScore: aiCheck?.score ?? null,
          manualScore,
          notes,
        },
      }),
    ]);

    // Award points to author when content is published (prevent double reward)
    if (action === 'APPROVED') {
      const alreadyRewarded = await this.rewardService.hasRewardedForContent(contentId);
      if (!alreadyRewarded) {
        const settings = await this.rewardService.getRewardSettings();
        await this.rewardService.addPoints(
          content.authorId,
          settings.pointPerApproved,
          PointType.EARNED,
          `Konten dipublikasikan: ${content.title}`,
          contentId,
        );
      } else {
        this.logger.log(`Content ${contentId} already rewarded, skipping double reward`);
      }
    }

    // Notify author about review result
    const notifMap: Record<string, { type: any; title: string; msg: string }> = {
      APPROVED: { type: 'CONTENT_APPROVED', title: 'Konten Anda Dipublikasikan ✅', msg: `Konten "${content.title}" telah disetujui dan dipublikasikan.${notes ? ' Catatan: ' + notes : ''}` },
      REJECTED: { type: 'CONTENT_REJECTED', title: 'Konten Ditolak ❌', msg: `Konten "${content.title}" ditolak. Alasan: ${notes || '-'}` },
      REVISION_REQUESTED: { type: 'REVISION_NEEDED', title: 'Revisi Diminta ✏️', msg: `Konten "${content.title}" perlu direvisi. Catatan: ${notes || '-'}` },
    };
    const notif = notifMap[action];
    if (notif) {
      await this.notificationService.createNotification({
        userId: content.authorId,
        actorId: reviewerId,
        type: notif.type,
        title: notif.title,
        message: notif.msg,
        linkUrl: '/admin/my-contents',
      });
    }

    return { message: `Konten berhasil di-${action.toLowerCase().replace('_', ' ')}` };
  }

  async unpublishContent(contentId: string, reviewerId: string, notes?: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id: contentId, deletedAt: null } });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    if (content.status !== 'PUBLISHED') {
      throw new BadRequestException(`Hanya konten PUBLISHED yang bisa di-unpublish. Status saat ini: "${content.status}"`);
    }

    await this.prisma.$transaction([
      this.prisma.contentItem.update({
        where: { id: contentId },
        data: { status: 'REVISION', publishedAt: null },
      }),
      this.prisma.reviewHistory.create({
        data: {
          contentId,
          reviewerId,
          action: ReviewAction.REVISION_REQUESTED,
          notes: notes || 'Konten di-unpublish untuk revisi oleh Admin.',
          aiAssisted: false,
        },
      }),
    ]);

    // Deduct points that were awarded when this content was published
    await this.rewardService.deductPointsForContent(contentId, content.authorId, content.title);

    // Notify author
    await this.notificationService.createNotification({
      userId: content.authorId,
      actorId: reviewerId,
      type: 'REVISION_NEEDED',
      title: 'Konten Di-unpublish untuk Revisi ✏️',
      message: `Konten "${content.title}" telah ditarik dari publikasi dan perlu direvisi. Poin terkait telah disesuaikan.${notes ? ' Catatan: ' + notes : ''}`,
      linkUrl: '/admin/my-contents',
    });

    return { message: `Konten "${content.title}" berhasil di-unpublish dan dikembalikan ke REVISION.` };
  }
}
