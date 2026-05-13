import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private prisma: PrismaService) {}

  // ── Dashboard Stats ──
  async getDashboardStats(userId: string, userRole: string) {
    if (userRole === 'AUTHOR') {
      // Editor sees their own stats only
      const [totalContents, published, inReview, totalViews, totalLikes] = await Promise.all([
        this.prisma.contentItem.count({ where: { authorId: userId, deletedAt: null } }),
        this.prisma.contentItem.count({ where: { authorId: userId, status: 'PUBLISHED', deletedAt: null } }),
        this.prisma.contentItem.count({ where: { authorId: userId, status: 'REVIEW', deletedAt: null } }),
        this.prisma.contentItem.aggregate({ where: { authorId: userId, deletedAt: null }, _sum: { viewCount: true } }),
        this.prisma.contentItem.aggregate({ where: { authorId: userId, deletedAt: null }, _sum: { likeCount: true } }),
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
      this.prisma.contentItem.aggregate({ where: { deletedAt: null }, _sum: { viewCount: true } }),
      this.prisma.contentItem.aggregate({ where: { deletedAt: null }, _sum: { likeCount: true } }),
      this.prisma.contentItem.count({ where: { deletedAt: null } }),
      this.prisma.contentItem.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.contentItem.count({ where: { status: 'REVIEW', deletedAt: null } }),
      this.prisma.user.count({ where: { role: 'AUTHOR' } }),
      this.prisma.contentItem.findMany({
        where: { status: 'REVIEW', deletedAt: null },
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

  // ── All Contents ──
  async getAllContents(status?: string, page: number = 1, search?: string, age?: string) {
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    const conditions: any[] = [];
    if (status) where.status = status;
    if (search) conditions.push({ title: { contains: search, mode: 'insensitive' } });
    if (age) conditions.push({ ageGroups: { has: age } });
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

  // ── DRAFT Cleanup ──
  async getDraftList(filters: { olderThanDays?: number; type?: string; page?: number }) {
    const { olderThanDays, type, page = 1 } = filters;
    const limit = 30;
    const skip = (page - 1) * limit;
    const where: any = { status: 'DRAFT', deletedAt: null };

    if (type) where.type = type;
    if (olderThanDays && olderThanDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      where.createdAt = { lte: cutoff };
    }

    const [data, total, totalDraft] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { createdAt: 'asc' }, // oldest first
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true } },
        },
      }),
      this.prisma.contentItem.count({ where }),
      this.prisma.contentItem.count({ where: { status: 'DRAFT', deletedAt: null } }),
    ]);

    // Calculate age in days for each item
    const now = new Date();
    const enriched = data.map(item => ({
      ...item,
      ageDays: Math.floor((now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), totalDraft },
    };
  }

  async bulkDeleteDrafts(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
    if (!ids?.length) return { deleted: 0, failed: [] };

    // Only allow deleting DRAFT items
    const validItems = await this.prisma.contentItem.findMany({
      where: { id: { in: ids }, status: 'DRAFT', deletedAt: null },
      select: { id: true, type: true },
    });
    const validIds = validItems.map(i => i.id);
    const failed = ids.filter(id => !validIds.includes(id));

    if (validIds.length === 0) return { deleted: 0, failed };

    // Soft-delete: set deletedAt
    await this.prisma.contentItem.updateMany({
      where: { id: { in: validIds } },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Bulk deleted ${validIds.length} DRAFT items: [${validIds.join(', ')}]`);
    return { deleted: validIds.length, failed };
  }

  // ── Scheduled Social Posts ──
  async getScheduledPosts(userId: string, userRole: string) {
    const where: any = {
      status: 'SCHEDULED',
      scheduledAt: { gte: new Date() },
    };

    // AUTHOR can only see their own content's scheduled posts
    if (userRole === 'AUTHOR') {
      where.content = { authorId: userId };
    }

    const posts = await this.prisma.socialPublishLog.findMany({
      where,
      include: {
        content: { select: { title: true, slug: true, type: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    return {
      data: posts.map(p => ({
        id: p.id,
        platform: p.platform,
        status: p.status,
        scheduledAt: p.scheduledAt,
        contentTitle: p.content?.title || '—',
        contentType: p.content?.type || '—',
      })),
      total: posts.length,
    };
  }
}
