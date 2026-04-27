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
    if (age && age !== 'Semua') {
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
      where: { slug, status: 'PUBLISHED' },
      include: {
        node: true,
        qnaDetail: true,
        articleDetail: true,
        mediaDetail: true,
        tags: { include: { tag: true } },
      },
    });

    if (!content) {
      throw new NotFoundException('Konten tidak ditemukan');
    }

    // Process related content (placeholder logic for now)
    const related = await this.getRelatedContent(content.id, content.nodeId);

    return { ...content, related };
  }

  private async getRelatedContent(contentId: string, nodeId: string) {
    // Strategy 1: Same Node (excluding self), max 5
    const sameNode = await this.prisma.contentItem.findMany({
      where: {
        nodeId,
        id: { not: contentId },
        status: 'PUBLISHED',
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

  async getList(query: { age?: string; sort?: string; page?: number; limit?: number }) {
    const { age, sort = 'newest', page = 1, limit = 10 } = query;
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
        // For Prisma, we sort by multiple fields to simulate popular
        orderBy = [
          { likeCount: 'desc' },
          { avgRating: 'desc' },
          { viewCount: 'desc' }
        ];
        break;
      default:
        orderBy = { publishedAt: 'desc' };
    }

    const where: any = { status: 'PUBLISHED' };
    if (age && age !== 'Semua') {
      where.ageGroup = age;
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
          ageGroup: true,
          viewCount: true,
          likeCount: true,
          avgRating: true,
          publishedAt: true,
          author: { select: { name: true } }
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
