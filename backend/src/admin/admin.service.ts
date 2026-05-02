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
}
