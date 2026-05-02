import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async getTree(age?: string) {
    // 1. Get all active nodes
    const nodes = await this.prisma.contentNode.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    // 2. Filter by age if provided
    let filteredNodes = nodes;
    if (age) {
      filteredNodes = nodes.filter(node => node.ageGroups.includes(age));
    }

    // 3. Build tree
    const buildTree = (parentId: string | null = null) => {
      return filteredNodes
        .filter(node => node.parentId === parentId)
        .map(node => ({
          ...node,
          children: buildTree(node.id),
        }));
    };

    return buildTree();
  }

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

    if (!content) {
      throw new NotFoundException('Konten tidak ditemukan');
    }

    // Process related content
    const related = await this.getRelatedContent(content.id, content.nodeId);

    // Return with resolved author name (alias takes priority)
    return {
      ...content,
      authorName: content.displayAuthorName || content.author?.name || 'Anonim',
      related,
    };
  }

  private async getRelatedContent(contentId: string, nodeId: string | null) {
    if (!nodeId) return [];
    const sameNode = await this.prisma.contentItem.findMany({
      where: {
        nodeId,
        id: { not: contentId },
        status: 'PUBLISHED',
        deletedAt: null,
      },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        viewCount: true,
      },
    });

    return sameNode;
  }

  async getList(query: { age?: string; sort?: string; page?: any; limit?: any; type?: string; search?: string }) {
    const age = query.age;
    const sort = query.sort || 'newest';
    const type = query.type;
    const search = query.search;
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    let orderBy: any = { publishedAt: 'desc' };
    
    switch (sort) {
      case 'most_read':
        orderBy = { viewCount: 'desc' };
        break;
      case 'most_liked':
        orderBy = { likeCount: 'desc' };
        break;
      case 'top_rated':
        orderBy = { avgRating: 'desc' };
        break;
      case 'popular':
        orderBy = [
          { likeCount: 'desc' },
          { avgRating: 'desc' },
          { viewCount: 'desc' }
        ];
        break;
      default:
        orderBy = { publishedAt: 'desc' };
    }

    const where: any = { status: 'PUBLISHED', deletedAt: null };
    const conditions: any[] = [];
    if (age && age !== 'Semua') {
      conditions.push({ ageGroups: { has: age } });
    }
    if (search) {
      conditions.push({ OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] });
    }
    if (conditions.length > 0) where.AND = conditions;
    if (type) {
      where.type = type;
    }

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy,
        skip,
        take: Number(limit),
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          ageGroups: true,
          viewCount: true,
          likeCount: true,
          shareCount: true,
          avgRating: true,
          ratingCount: true,
          publishedAt: true,
          description: true,
          displayAuthorName: true,
          author: { select: { name: true } },
          node: { select: { title: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        }
      }),
      this.prisma.contentItem.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
