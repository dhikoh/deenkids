import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentType } from '@prisma/client';

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
  async getKisahByNode(nodeSlug: string, page = 1, limit = 12, search?: string) {
    const node = await this.prisma.contentNode.findFirst({
      where: { slug: nodeSlug, isActive: true, group: 'KISAH' },
    });
    if (!node) throw new NotFoundException(`Sub-kategori Kisah tidak ditemukan: ${nodeSlug}`);

    // Collect all descendant node IDs (node + children + grandchildren)
    const allNodes = await this.prisma.contentNode.findMany({
      where: { isActive: true, group: 'KISAH' },
    });
    const getDescendantIds = (parentId: string, visited = new Set<string>()): string[] => {
      if (visited.has(parentId)) return []; // Prevent circular reference
      visited.add(parentId);
      const children = allNodes.filter(n => n.parentId === parentId);
      return [parentId, ...children.flatMap(c => getDescendantIds(c.id, visited))];
    };
    const nodeIds = getDescendantIds(node.id);

    const skip = (page - 1) * limit;
    const baseWhere: any = { nodeId: { in: nodeIds }, type: 'KISAH' as any, status: 'PUBLISHED' as any, deletedAt: null };
    const conditions: any[] = [];
    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where = conditions.length > 0 ? { ...baseWhere, AND: conditions } : baseWhere;

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
          type: true,
          enableAudio: true,
          audioUrl: true,
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

    const tagIds = content.tags?.map(t => t.tagId) || [];
    const related = await this.getRelatedContent(content.id, content.nodeId, tagIds, content.type);

    return {
      ...content,
      authorName: content.displayAuthorName || content.author?.name || 'Anonim',
      related,
    };
  }

  // ─── Related Content (3-layer algorithm) ────────────────────────────────────
  private async getRelatedContent(
    contentId: string,
    nodeId: string | null,
    tagIds: string[],
    contentType: string,
  ) {
    const LIMIT = 5;
    const baseWhere = { status: 'PUBLISHED' as const, deletedAt: null };
    const selectFields = {
      id: true, title: true, slug: true, type: true,
      viewCount: true, thumbnailUrl: true, enableAudio: true,
      description: true,
      node: { select: { slug: true } },
    };
    const collected = new Set<string>([contentId]);
    const results: any[] = [];

    // Layer 1: Tag matching (paling relevan — konten dengan tag yang sama)
    if (tagIds.length > 0 && results.length < LIMIT) {
      const tagMatches = await this.prisma.contentItem.findMany({
        where: {
          ...baseWhere,
          id: { notIn: [...collected] },
          tags: { some: { tagId: { in: tagIds } } },
        },
        take: LIMIT * 2, // fetch extra to allow dedup & sorting
        orderBy: { viewCount: 'desc' },
        select: {
          ...selectFields,
          tags: { select: { tagId: true } },
        },
      });

      // Sort by number of matching tags (descending)
      const scored = tagMatches.map(item => ({
        ...item,
        matchScore: item.tags.filter(t => tagIds.includes(t.tagId)).length,
      }));
      scored.sort((a, b) => b.matchScore - a.matchScore);

      for (const item of scored) {
        if (results.length >= LIMIT) break;
        if (collected.has(item.id)) continue;
        collected.add(item.id);
        const { tags: _tags, matchScore: _score, ...rest } = item;
        results.push(rest);
      }
    }

    // Layer 2: Same node (fill remaining slots)
    if (results.length < LIMIT && nodeId) {
      const nodeMatches = await this.prisma.contentItem.findMany({
        where: { ...baseWhere, nodeId, id: { notIn: [...collected] } },
        take: LIMIT - results.length,
        orderBy: { viewCount: 'desc' },
        select: selectFields,
      });
      for (const item of nodeMatches) {
        if (results.length >= LIMIT) break;
        collected.add(item.id);
        results.push(item);
      }
    }

    // Layer 3: Same type fallback (fill any remaining)
    if (results.length < LIMIT) {
      const typeMatches = await this.prisma.contentItem.findMany({
        where: { ...baseWhere, type: contentType as ContentType, id: { notIn: [...collected] } },
        take: LIMIT - results.length,
        orderBy: { viewCount: 'desc' },
        select: selectFields,
      });
      for (const item of typeMatches) {
        if (results.length >= LIMIT) break;
        collected.add(item.id);
        results.push(item);
      }
    }

    return results;
  }

  // ─── General Content List ─────────────────────────────────────────────────────
  async getList(query: { age?: string; sort?: string; page?: any; limit?: any; type?: string; search?: string; pov?: string; nodeSlug?: string }) {
    const { age, sort = 'newest', type, search, pov, nodeSlug } = query;
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
    if (pov) where.pov = pov;

    // Filter by nodeSlug: resolve slug → node IDs (including descendants)
    if (nodeSlug) {
      const allNodes = await this.prisma.contentNode.findMany({ where: { isActive: true } });
      const targetNode = allNodes.find(n => n.slug === nodeSlug);
      if (targetNode) {
        const getDescendantIds = (parentId: string, visited = new Set<string>()): string[] => {
          if (visited.has(parentId)) return []; // Prevent circular reference
          visited.add(parentId);
          const children = allNodes.filter(n => n.parentId === parentId);
          return [parentId, ...children.flatMap(c => getDescendantIds(c.id, visited))];
        };
        where.nodeId = { in: getDescendantIds(targetNode.id) };
      } else {
        // nodeSlug not found — return empty rather than all content
        return { data: [], meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where, orderBy, skip, take: Number(limit),
        select: {
          id: true, title: true, slug: true, type: true, ageGroups: true,
          viewCount: true, likeCount: true, shareCount: true, avgRating: true,
          ratingCount: true, publishedAt: true, description: true, thumbnailUrl: true,
          enableAudio: true, audioUrl: true, displayAuthorName: true, pov: true,
          author: { select: { name: true } },
          node: { select: { title: true, slug: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) } };
  }
}
