import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ─── Pembelajaran Tree (group = PEMBELAJARAN) ────────────────────────────────
  async getTree(age?: string) {
    const nodes = await this.prisma.contentNode.findMany({
      where: { isActive: true, group: 'PEMBELAJARAN' },
      orderBy: { order: 'asc' },
    });

    let filtered = nodes;
    if (age) filtered = nodes.filter(n => n.ageGroups.includes(age));

    const buildTree = (parentId: string | null = null): any[] =>
      filtered
        .filter(n => n.parentId === parentId)
        .map(n => ({ ...n, children: buildTree(n.id) }));

    return buildTree();
  }

  // ─── Kisah Tree (group = KISAH) ───────────────────────────────────────────────
  async getKisahTree() {
    const nodes = await this.prisma.contentNode.findMany({
      where: { isActive: true, group: 'KISAH' },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { contents: { where: { status: 'PUBLISHED', deletedAt: null } } } },
      },
    });

    const buildTree = (parentId: string | null = null): any[] =>
      nodes
        .filter(n => n.parentId === parentId)
        .map(n => ({
          ...n,
          contentCount: n._count.contents,
          children: buildTree(n.id),
        }));

    return buildTree();
  }

  // ─── Kisah listing by sub-category node ──────────────────────────────────────
  async getKisahByNode(nodeSlug: string, page = 1, limit = 12) {
    const node = await this.prisma.contentNode.findFirst({
      where: { slug: nodeSlug, isActive: true, group: 'KISAH' },
    });
    if (!node) throw new NotFoundException(`Sub-kategori Kisah tidak ditemukan: ${nodeSlug}`);

    // Collect all descendant node IDs (node + children + grandchildren)
    const allNodes = await this.prisma.contentNode.findMany({
      where: { isActive: true, group: 'KISAH' },
    });
    const getDescendantIds = (parentId: string): string[] => {
      const children = allNodes.filter(n => n.parentId === parentId);
      return [parentId, ...children.flatMap(c => getDescendantIds(c.id))];
    };
    const nodeIds = getDescendantIds(node.id);

    const skip = (page - 1) * limit;
    const where = { nodeId: { in: nodeIds }, type: 'KISAH' as any, status: 'PUBLISHED' as any, deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnailUrl: true,
          ageGroups: true,
          enableAudio: true,
          viewCount: true,
          likeCount: true,
          avgRating: true,
          ratingCount: true,
          publishedAt: true,
          displayAuthorName: true,
          author: { select: { name: true } },
          node: { select: { title: true, slug: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return {
      node: { id: node.id, title: node.title, slug: node.slug, description: node.description, icon: node.icon },
      data: data.map(item => ({
        ...item,
        authorName: item.displayAuthorName || item.author?.name || 'Anonim',
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Content Detail ───────────────────────────────────────────────────────────
  async getContentDetail(slug: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: {
        node: true,
        author: { select: { id: true, name: true } },
        qnaDetail: true,
        articleDetail: true,
        tags: { include: { tag: true } },
      },
    });

    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    const related = await this.getRelatedContent(content.id, content.nodeId);

    return {
      ...content,
      authorName: content.displayAuthorName || content.author?.name || 'Anonim',
      related,
    };
  }

  private async getRelatedContent(contentId: string, nodeId: string | null) {
    if (!nodeId) return [];
    return this.prisma.contentItem.findMany({
      where: { nodeId, id: { not: contentId }, status: 'PUBLISHED', deletedAt: null },
      take: 5,
      select: { id: true, title: true, slug: true, type: true, viewCount: true, thumbnailUrl: true, enableAudio: true },
    });
  }

  // ─── General Content List ─────────────────────────────────────────────────────
  async getList(query: { age?: string; sort?: string; page?: any; limit?: any; type?: string; search?: string }) {
    const { age, sort = 'newest', type, search } = query;
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    let orderBy: any = { publishedAt: 'desc' };
    switch (sort) {
      case 'most_read': orderBy = { viewCount: 'desc' }; break;
      case 'most_liked': orderBy = { likeCount: 'desc' }; break;
      case 'top_rated': orderBy = { avgRating: 'desc' }; break;
      case 'popular': orderBy = [{ likeCount: 'desc' }, { avgRating: 'desc' }, { viewCount: 'desc' }]; break;
    }

    const where: any = { status: 'PUBLISHED', deletedAt: null };
    const conditions: any[] = [];
    if (age && age !== 'Semua') conditions.push({ ageGroups: { has: age } });
    if (search) conditions.push({ OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] });
    if (conditions.length > 0) where.AND = conditions;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where, orderBy, skip, take: Number(limit),
        select: {
          id: true, title: true, slug: true, type: true, ageGroups: true,
          viewCount: true, likeCount: true, shareCount: true, avgRating: true,
          ratingCount: true, publishedAt: true, description: true, thumbnailUrl: true,
          enableAudio: true, displayAuthorName: true,
          author: { select: { name: true } },
          node: { select: { title: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } };
  }
}
