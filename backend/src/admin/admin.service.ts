import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewAction } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
    if (content.authorId === reviewerId) {
      throw new ForbiddenException('Anda tidak bisa mereview konten sendiri');
    }

    const aiCheck = content.aiCheckResults[0];
    let newStatus = content.status;
    if (action === 'APPROVED') newStatus = 'PUBLISHED';
    else if (action === 'REJECTED') newStatus = 'DRAFT';
    else if (action === 'REVISION_REQUESTED') newStatus = 'REVISION';

    await this.prisma.$transaction([
      this.prisma.contentItem.update({
        where: { id: contentId },
        data: {
          status: newStatus,
          publishedAt: newStatus === 'PUBLISHED' ? new Date() : null,
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
  async getAllContents(status?: string, page: number = 1) {
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

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
