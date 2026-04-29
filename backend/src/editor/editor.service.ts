import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCheckerService } from './ai-checker.service';
import { CreateContentDto, UpdateContentDto } from './dto/editor.dto';
import slugify from 'slugify';

@Injectable()
export class EditorService {
  constructor(
    private prisma: PrismaService,
    private aiChecker: AiCheckerService,
  ) {}

  async createContent(authorId: string, dto: CreateContentDto) {
    const slug = slugify(dto.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);

    const author = await this.prisma.user.findUnique({ where: { id: authorId }, select: { role: true } });
    const forcedStatus = author?.role === 'SUPERADMIN' ? (dto.status || 'DRAFT') : 'DRAFT';

    let aiResult = null;
    if (dto.useAiChecker) {
      aiResult = await this.aiChecker.validateContent(dto);
    }

    const content = await this.prisma.contentItem.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        type: dto.type,
        status: forcedStatus,
        ageGroups: dto.ageGroups || ['3-5'],
        nodeId: dto.nodeId || null,
        authorId,
        displayAuthorName: author?.role === 'SUPERADMIN' ? (dto as any).displayAuthorName || null : null,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
      },
    });

    // Create Detail based on Type
    if (dto.type === 'QNA' && dto.qnaDetail) {
      await this.prisma.qnaDetail.create({
        data: {
          contentId: content.id,
          question: dto.qnaDetail.question || dto.title,
          answerQuick: dto.qnaDetail.answerQuick || '',
          dialogBlocks: dto.qnaDetail.dialogBlocks || [],
          dalilBlocks: dto.qnaDetail.dalilBlocks || [],
          analogyBlocks: dto.qnaDetail.analogyBlocks || [],
          tipsBlocks: dto.qnaDetail.tipsBlocks || [],
        },
      });
    } else if (dto.type === 'ARTICLE' && dto.articleDetail) {
      await this.prisma.articleDetail.create({
        data: {
          contentId: content.id,
          coverUrl: dto.articleDetail.coverUrl,
          blocks: dto.articleDetail.blocks || [],
        },
      });
    }

    // Handle tags
    if (dto.tags && dto.tags.length > 0) {
      for (const tagName of dto.tags) {
        const tag = await this.prisma.contentTag.upsert({
          where: { slug: slugify(tagName, { lower: true, strict: true }) },
          update: { usageCount: { increment: 1 } },
          create: {
            name: tagName,
            slug: slugify(tagName, { lower: true, strict: true }),
            usageCount: 1,
          },
        });
        await this.prisma.contentItemTag.create({
          data: { contentId: content.id, tagId: tag.id },
        });
      }
    }

    // Save AI Result
    if (aiResult) {
      await this.prisma.aiCheckResult.create({
        data: {
          contentId: content.id,
          score: aiResult.score,
          breakdown: aiResult.breakdown,
          issues: aiResult.issues,
          suggestions: aiResult.suggestions,
        },
      });
    }

    return { data: content, aiCheck: aiResult };
  }

  async getMyContents(authorId: string, status?: string, page: number = 1, search?: string, age?: string) {
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = { authorId };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (age && age !== 'Semua') where.ageGroups = { has: age };

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          node: { select: { title: true, slug: true } },
          tags: { include: { tag: true } },
          reviewHistory: { orderBy: { createdAt: 'desc' as const }, take: 1, include: { reviewer: { select: { name: true } } } },
          _count: { select: { views: true, likes: true, ratings: true } },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getContentForEdit(userId: string, userRole: string, contentId: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        node: true,
        qnaDetail: true,
        articleDetail: true,
        mediaDetail: true,
        tags: { include: { tag: true } },
        reviewHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { reviewer: { select: { name: true } } },
        },
      },
    });

    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    if (content.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke konten ini');
    }

    return { data: content };
  }

  async updateContent(userId: string, userRole: string, contentId: string, dto: UpdateContentDto) {
    const existing = await this.prisma.contentItem.findUnique({ where: { id: contentId } });
    if (!existing) throw new NotFoundException('Konten tidak ditemukan');
    if (existing.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Anda tidak memiliki akses ke konten ini');
    }
    // Author cannot edit published content — only Admin/SuperAdmin can
    if (existing.status === 'PUBLISHED' && existing.authorId === userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Konten yang sudah dipublikasikan hanya bisa diedit oleh Admin/SuperAdmin');
    }

    // Update main content
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const updateData: any = {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        ageGroups: dto.ageGroups || [],
        nodeId: dto.nodeId || null,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
        // Reset to draft if was in revision
        status: existing.status === 'REVISION' ? 'DRAFT' : existing.status,
    };
    // Only SuperAdmin can set displayAuthorName
    if (user?.role === 'SUPERADMIN' && (dto as any).displayAuthorName !== undefined) {
      updateData.displayAuthorName = (dto as any).displayAuthorName || null;
    }
    const updated = await this.prisma.contentItem.update({
      where: { id: contentId },
      data: updateData,
    });

    // Update QnA Detail
    if (dto.type === 'QNA' && dto.qnaDetail) {
      await this.prisma.qnaDetail.upsert({
        where: { contentId },
        update: {
          question: dto.qnaDetail.question,
          answerQuick: dto.qnaDetail.answerQuick,
          dialogBlocks: dto.qnaDetail.dialogBlocks || [],
          dalilBlocks: dto.qnaDetail.dalilBlocks || [],
          analogyBlocks: dto.qnaDetail.analogyBlocks || [],
          tipsBlocks: dto.qnaDetail.tipsBlocks || [],
        },
        create: {
          contentId,
          question: dto.qnaDetail.question || dto.title,
          answerQuick: dto.qnaDetail.answerQuick || '',
          dialogBlocks: dto.qnaDetail.dialogBlocks || [],
          dalilBlocks: dto.qnaDetail.dalilBlocks || [],
          analogyBlocks: dto.qnaDetail.analogyBlocks || [],
          tipsBlocks: dto.qnaDetail.tipsBlocks || [],
        },
      });
    }

    // Update Article Detail
    if (dto.type === 'ARTICLE' && dto.articleDetail) {
      await this.prisma.articleDetail.upsert({
        where: { contentId },
        update: {
          coverUrl: dto.articleDetail.coverUrl,
          blocks: dto.articleDetail.blocks || [],
        },
        create: {
          contentId,
          coverUrl: dto.articleDetail.coverUrl,
          blocks: dto.articleDetail.blocks || [],
        },
      });
    }

    // Update tags: clear old, add new
    if (dto.tags) {
      await this.prisma.contentItemTag.deleteMany({ where: { contentId } });
      for (const tagName of dto.tags) {
        const tag = await this.prisma.contentTag.upsert({
          where: { slug: slugify(tagName, { lower: true, strict: true }) },
          update: { usageCount: { increment: 1 } },
          create: { name: tagName, slug: slugify(tagName, { lower: true, strict: true }), usageCount: 1 },
        });
        await this.prisma.contentItemTag.create({
          data: { contentId, tagId: tag.id },
        });
      }
    }

    return { data: updated, message: 'Konten berhasil diperbarui' };
  }

  async deleteContent(userId: string, userRole: string, contentId: string) {
    const existing = await this.prisma.contentItem.findUnique({ where: { id: contentId } });
    if (!existing) throw new NotFoundException('Konten tidak ditemukan');
    if (existing.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Anda tidak memiliki akses');
    }
    // Only allow delete if not published (safety)
    if (existing.status === 'PUBLISHED' && userRole === 'AUTHOR') {
      throw new ForbiddenException('Editor tidak bisa menghapus konten yang sudah dipublikasikan');
    }

    await this.prisma.contentItem.delete({ where: { id: contentId } });
    return { message: 'Konten berhasil dihapus' };
  }

  async submitForReview(userId: string, contentId: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    if (content.authorId !== userId) throw new ForbiddenException('Bukan konten Anda');
    if (!['DRAFT', 'REVISION'].includes(content.status)) {
      throw new BadRequestException('Hanya konten Draft atau Revisi yang bisa diajukan');
    }

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { status: 'REVIEW' },
    });

    return { message: 'Konten berhasil diajukan untuk review' };
  }

  async getNodes() {
    const nodes = await this.prisma.contentNode.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, title: true, type: true, parentId: true, ageGroups: true },
    });

    // Build nested tree for dropdown
    const buildTree = (parentId: string | null = null): any[] => {
      return nodes
        .filter(n => n.parentId === parentId)
        .map(n => ({ ...n, children: buildTree(n.id) }));
    };

    return { data: buildTree() };
  }

  async getTags() {
    const tags = await this.prisma.contentTag.findMany({
      orderBy: { usageCount: 'desc' },
      take: 100,
    });
    return { data: tags };
  }
}
