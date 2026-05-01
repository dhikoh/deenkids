import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCheckerService } from './ai-checker.service';
import { RewardService } from '../reward/reward.service';
import { NotificationService } from '../notification/notification.service';
import { CreateContentDto, UpdateContentDto } from './dto/editor.dto';
import { sanitizeText, sanitizeJsonDeep } from '../common/utils/sanitize.util';
import slugify from 'slugify';

@Injectable()
export class EditorService {
  constructor(
    private prisma: PrismaService,
    private aiChecker: AiCheckerService,
    private rewardService: RewardService,
    private notificationService: NotificationService,
  ) {}

  async createContent(authorId: string, dto: CreateContentDto) {
    const author = await this.prisma.user.findUnique({ where: { id: authorId }, select: { role: true } });

    // Enforce daily submit limit (SUPERADMIN exempt)
    if (author?.role === 'AUTHOR') {
      const settings = await this.rewardService.getRewardSettings();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySubmits = await this.prisma.contentItem.count({
        where: { authorId, createdAt: { gte: todayStart } },
      });
      if (todaySubmits >= settings.maxSubmitPerDay) {
        throw new BadRequestException(
          `Batas submit harian sudah tercapai (${settings.maxSubmitPerDay} konten/hari). Coba lagi besok.`,
        );
      }
    }

    const slug = slugify(dto.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);
    const forcedStatus = author?.role === 'SUPERADMIN' ? (dto.status || 'DRAFT') : 'DRAFT';

    let aiResult = null;
    if (dto.useAiChecker) {
      aiResult = await this.aiChecker.validateContent(dto);
    }

    const content = await this.prisma.contentItem.create({
      data: {
        title: sanitizeText(dto.title),
        slug,
        description: dto.description ? sanitizeText(dto.description) : undefined,
        type: dto.type,
        status: forcedStatus,
        ageGroups: dto.ageGroups || ['3-5'],
        nodeId: dto.nodeId || null,
        authorId,
        displayAuthorName: author?.role === 'SUPERADMIN' ? sanitizeText((dto as any).displayAuthorName || '') || null : null,
        enableAudio: dto.enableAudio || false,
        metaTitle: dto.metaTitle ? sanitizeText(dto.metaTitle) : undefined,
        metaDesc: dto.metaDesc ? sanitizeText(dto.metaDesc) : undefined,
      },
    });

    // Create Detail based on Type
    if (dto.type === 'QNA' && dto.qnaDetail) {
      const sanitized = sanitizeJsonDeep(dto.qnaDetail);
      await this.prisma.qnaDetail.create({
        data: {
          contentId: content.id,
          question: sanitized.question || sanitizeText(dto.title),
          answerQuick: sanitized.answerQuick || '',
          dialogBlocks: sanitized.dialogBlocks || [],
          dalilBlocks: sanitized.dalilBlocks || [],
          analogyBlocks: sanitized.analogyBlocks || [],
          tipsBlocks: sanitized.tipsBlocks || [],
        },
      });
    } else if ((dto.type === 'ARTICLE' || dto.type === 'PEMBELAJARAN') && dto.articleDetail) {
      const sanitized = sanitizeJsonDeep(dto.articleDetail);
      await this.prisma.articleDetail.create({
        data: {
          contentId: content.id,
          coverUrl: sanitized.coverUrl,
          blocks: sanitized.blocks || [],
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
    if (age && age !== 'Semua') {
      where.OR = [{ ageGroups: { has: age } }, { ageGroups: { has: 'Semua Usia' } }];
    }

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
    // Author cannot edit published or in-review content — only Admin/SuperAdmin can
    if (['PUBLISHED', 'REVIEW'].includes(existing.status) && existing.authorId === userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Konten yang sedang direview atau sudah dipublikasikan hanya bisa diedit oleh Admin/SuperAdmin');
    }

    // Update main content
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const updateData: any = {
        title: dto.title ? sanitizeText(dto.title) : undefined,
        description: dto.description ? sanitizeText(dto.description) : dto.description,
        type: dto.type,
        ageGroups: dto.ageGroups || [],
        nodeId: dto.nodeId || null,
        enableAudio: dto.enableAudio || false,
        metaTitle: dto.metaTitle ? sanitizeText(dto.metaTitle) : dto.metaTitle,
        metaDesc: dto.metaDesc ? sanitizeText(dto.metaDesc) : dto.metaDesc,
        // Reset to draft if was in revision
        status: existing.status === 'REVISION' ? 'DRAFT' : existing.status,
    };
    // Only SuperAdmin can set displayAuthorName
    if (user?.role === 'SUPERADMIN' && (dto as any).displayAuthorName !== undefined) {
      updateData.displayAuthorName = sanitizeText((dto as any).displayAuthorName || '') || null;
    }
    const updated = await this.prisma.contentItem.update({
      where: { id: contentId },
      data: updateData,
    });

    // Update QnA Detail
    if (dto.type === 'QNA' && dto.qnaDetail) {
      const sanitized = sanitizeJsonDeep(dto.qnaDetail);
      await this.prisma.qnaDetail.upsert({
        where: { contentId },
        update: {
          question: sanitized.question,
          answerQuick: sanitized.answerQuick,
          dialogBlocks: sanitized.dialogBlocks || [],
          dalilBlocks: sanitized.dalilBlocks || [],
          analogyBlocks: sanitized.analogyBlocks || [],
          tipsBlocks: sanitized.tipsBlocks || [],
        },
        create: {
          contentId,
          question: sanitized.question || sanitizeText(dto.title || ''),
          answerQuick: sanitized.answerQuick || '',
          dialogBlocks: sanitized.dialogBlocks || [],
          dalilBlocks: sanitized.dalilBlocks || [],
          analogyBlocks: sanitized.analogyBlocks || [],
          tipsBlocks: sanitized.tipsBlocks || [],
        },
      });
    }

    // Update Article Detail
    if ((dto.type === 'ARTICLE' || dto.type === 'PEMBELAJARAN') && dto.articleDetail) {
      const sanitized = sanitizeJsonDeep(dto.articleDetail);
      await this.prisma.articleDetail.upsert({
        where: { contentId },
        update: {
          coverUrl: sanitized.coverUrl,
          blocks: sanitized.blocks || [],
        },
        create: {
          contentId,
          coverUrl: sanitized.coverUrl,
          blocks: sanitized.blocks || [],
        },
      });
    }

    // Update tags: decrement old, clear, add new
    if (dto.tags) {
      const oldTags = await this.prisma.contentItemTag.findMany({ where: { contentId }, select: { tagId: true } });
      if (oldTags.length > 0) {
        await this.prisma.contentTag.updateMany({
          where: { id: { in: oldTags.map(t => t.tagId) } },
          data: { usageCount: { decrement: 1 } },
        });
      }
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

    // Notify all ADMINs and SUPERADMINs about new review request
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notificationService.createNotification({
        userId: admin.id,
        actorId: userId,
        type: 'REVIEW_REQUEST',
        title: 'Konten Baru Menunggu Review 📝',
        message: `Konten "${content.title}" telah diajukan untuk ditinjau.`,
        linkUrl: '/admin/review',
      });
    }

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
