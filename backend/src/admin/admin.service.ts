import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../reward/reward.service';
import { NotificationService } from '../notification/notification.service';
import { ReviewAction, PointType, ContentStatus } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private rewardService: RewardService, private notificationService: NotificationService) {}

  // ── Dashboard Stats ──
  async getDashboardStats(userId: string, userRole: string) {
    if (userRole === 'AUTHOR') {
      // Editor sees their own stats only
      const [totalContents, published, inReview, totalViews, totalLikes] = await Promise.all([
        this.prisma.contentItem.count({ where: { authorId: userId } }),
        this.prisma.contentItem.count({ where: { authorId: userId, status: 'PUBLISHED' } }),
        this.prisma.contentItem.count({ where: { authorId: userId, status: 'REVIEW' } }),
        this.prisma.contentItem.aggregate({ where: { authorId: userId }, _sum: { viewCount: true } }),
        this.prisma.contentItem.aggregate({ where: { authorId: userId }, _sum: { likeCount: true } }),
      ]);
      return {
        role: 'AUTHOR',
        totalContents,
        published,
        inReview,
        totalViews: totalViews._sum.viewCount || 0,
        totalLikes: totalLikes._sum.likeCount || 0,
      };
    }

    // Admin/SuperAdmin see platform-wide stats
    const [totalViews, totalLikes, totalContent, publishedContent, inReview, totalEditors, recentReviewQueue] = await Promise.all([
      this.prisma.contentItem.aggregate({ _sum: { viewCount: true } }),
      this.prisma.contentItem.aggregate({ _sum: { likeCount: true } }),
      this.prisma.contentItem.count(),
      this.prisma.contentItem.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.contentItem.count({ where: { status: 'REVIEW' } }),
      this.prisma.user.count({ where: { role: 'AUTHOR' } }),
      this.prisma.contentItem.findMany({
        where: { status: 'REVIEW' },
        include: { author: { select: { name: true } }, aiCheckResults: { orderBy: { checkedAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      role: userRole,
      totalViews: totalViews._sum.viewCount || 0,
      totalLikes: totalLikes._sum.likeCount || 0,
      totalContent,
      publishedContent,
      inReview,
      totalEditors,
      recentReviewQueue: recentReviewQueue.map(item => ({
        id: item.id,
        title: item.title,
        author: item.author?.name,
        aiScore: item.aiCheckResults?.[0]?.score ?? null,
        updatedAt: item.updatedAt,
      })),
    };
  }

  // ── Review Queue ──
  async getReviewQueue(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: { status: 'REVIEW' },
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
      this.prisma.contentItem.count({ where: { status: 'REVIEW' } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async reviewContent(contentId: string, reviewerId: string, action: ReviewAction, notes?: string, manualScore?: number) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
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

    // Award points to author when content is published
    if (action === 'APPROVED') {
      const settings = await this.rewardService.getRewardSettings();
      await this.rewardService.addPoints(
        content.authorId,
        settings.pointPerApproved,
        PointType.EARNED,
        `Konten dipublikasikan: ${content.title}`,
        contentId,
      );
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

  // ── Content Node Structure (Kurikulum) ──
  async getStructure() {
    const nodes = await this.prisma.contentNode.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { contents: true } },
      },
    });

    const buildTree = (parentId: string | null = null): any[] => {
      return nodes
        .filter(n => n.parentId === parentId)
        .map(n => ({
          ...n,
          contentCount: n._count.contents,
          children: buildTree(n.id),
        }));
    };

    return { data: buildTree() };
  }

  async createNode(body: { title: string; type: string; parentId?: string; ageGroups?: string[]; icon?: string; order?: number; description?: string }) {
    const slug = slugify(body.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
    const node = await this.prisma.contentNode.create({
      data: {
        title: body.title,
        slug,
        type: body.type as any,
        parentId: body.parentId || null,
        ageGroups: body.ageGroups || ['3-5', '5-7', '7-10'],
        icon: body.icon,
        order: body.order || 0,
        description: body.description,
      },
    });
    return { data: node, message: 'Node berhasil dibuat' };
  }

  async updateNode(id: string, body: any) {
    const existing = await this.prisma.contentNode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Node tidak ditemukan');

    const updated = await this.prisma.contentNode.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        ageGroups: body.ageGroups ?? existing.ageGroups,
        icon: body.icon ?? existing.icon,
        order: body.order ?? existing.order,
        isActive: body.isActive ?? existing.isActive,
        parentId: body.parentId !== undefined ? body.parentId : existing.parentId,
      },
    });

    return { data: updated, message: 'Node berhasil diperbarui' };
  }

  async deleteNode(id: string) {
    const existing = await this.prisma.contentNode.findUnique({
      where: { id },
      include: { _count: { select: { contents: true, children: true } } },
    });
    if (!existing) throw new NotFoundException('Node tidak ditemukan');
    if (existing._count.contents > 0) {
      throw new BadRequestException('Tidak bisa menghapus node yang masih memiliki konten');
    }
    if (existing._count.children > 0) {
      throw new BadRequestException('Tidak bisa menghapus node yang masih memiliki sub-node');
    }

    await this.prisma.contentNode.delete({ where: { id } });
    return { message: 'Node berhasil dihapus' };
  }

  async assignContentToNode(contentId: string, nodeId: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    const node = await this.prisma.contentNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Node tidak ditemukan');

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { nodeId },
    });

    return { message: `Konten "${content.title}" dipindahkan ke "${node.title}"` };
  }
  // ── All Contents ──
  async getAllContents(status?: string, page: number = 1, search?: string, age?: string) {
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    const conditions: any[] = [];
    if (status) where.status = status;
    if (search) conditions.push({ title: { contains: search, mode: 'insensitive' } });
    if (age && age !== 'Semua') conditions.push({ ageGroups: { has: age } });
    if (conditions.length > 0) where.AND = conditions;

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { name: true, role: true } },
          node: { select: { title: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Unpublish / Re-review Published Content ──
  async unpublishContent(contentId: string, reviewerId: string, notes?: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id: contentId } });
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

    // Notify author
    await this.notificationService.createNotification({
      userId: content.authorId,
      actorId: reviewerId,
      type: 'REVISION_NEEDED',
      title: 'Konten Di-unpublish untuk Revisi ✏️',
      message: `Konten "${content.title}" telah ditarik dari publikasi dan perlu direvisi.${notes ? ' Catatan: ' + notes : ''}`,
      linkUrl: '/admin/my-contents',
    });

    return { message: `Konten "${content.title}" berhasil di-unpublish dan dikembalikan ke REVISION.` };
  }
}
