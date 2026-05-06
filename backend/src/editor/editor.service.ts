import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCheckerService } from './ai-checker.service';
import { RewardService } from '../reward/reward.service';
import { NotificationService } from '../notification/notification.service';
import { CreateContentDto, UpdateContentDto } from './dto/editor.dto';
import { sanitizeText, sanitizeJsonDeep } from '../common/utils/sanitize.util';
import { PointType } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class EditorService {
  private readonly logger = new Logger(EditorService.name);
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
        thumbnailUrl: dto.thumbnailUrl ? sanitizeText(dto.thumbnailUrl) : null,
        socialThumbnailUrl: dto.socialThumbnailUrl ? sanitizeText(dto.socialThumbnailUrl) : null,
        type: dto.type,
        status: forcedStatus,
        ageGroups: dto.ageGroups || ['3-5'],
        nodeId: dto.nodeId || null,
        authorId,
        displayAuthorName: author?.role === 'SUPERADMIN' ? sanitizeText((dto as any).displayAuthorName || '') || null : null,
        enableAudio: dto.type === 'KISAH' ? (dto.enableAudio !== false) : (dto.enableAudio || false),
        audioTitle: dto.audioTitle !== undefined ? dto.audioTitle : true,
        audioDescription: dto.audioDescription !== undefined ? dto.audioDescription : true,
        audioUrl: dto.audioUrl ? sanitizeText(dto.audioUrl) : null,
        pov: dto.type === 'ARTICLE' ? (dto.pov || null) : null,
        metaTitle: dto.metaTitle ? sanitizeText(dto.metaTitle) : undefined,
        metaDesc: dto.metaDesc ? sanitizeText(dto.metaDesc) : undefined,
        // Set publishedAt if SuperAdmin directly creates as PUBLISHED
        ...(forcedStatus === 'PUBLISHED' && { publishedAt: new Date() }),
      },
    });

    // Award points if SuperAdmin directly published on creation
    if (forcedStatus === 'PUBLISHED') {
      try {
        const settings = await this.rewardService.getRewardSettings();
        await this.rewardService.addPoints(
          authorId, settings.pointPerApproved, PointType.EARNED,
          `Konten dipublikasikan: ${content.title}`, content.id,
        );
      } catch (err) {
        this.logger.warn(`Reward on direct publish failed (non-fatal): ${err.message}`);
      }
    }

    // Create Detail based on Type
    if (dto.type === 'QNA' && dto.qnaDetail) {
      const sanitized = sanitizeJsonDeep(dto.qnaDetail);
      await this.prisma.qnaDetail.create({
        data: {
          contentId: content.id,
          question: sanitized.question || sanitizeText(dto.title),
          answerQuick: sanitized.answerQuick || '',
          answerQuickReferenceUrl: sanitized.answerQuickReferenceUrl || null,
          blocks: sanitized.blocks || [],
          // Legacy fields — kept empty during dual-phase migration
          dialogBlocks: [],
          dalilBlocks: [],
          analogyBlocks: [],
          tipsBlocks: [],
        },
      });
    } else if ((dto.type === 'ARTICLE' || dto.type === 'PEMBELAJARAN' || dto.type === 'KISAH') && dto.articleDetail) {
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
    const where: any = { authorId, deletedAt: null };
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
      where: { id: contentId, deletedAt: null },
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
    const existing = await this.prisma.contentItem.findUnique({ where: { id: contentId, deletedAt: null } });
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

    // Determine new status:
    // - SuperAdmin can explicitly set status (e.g., PUBLISHED) via dto.status
    // - REVISION → DRAFT reset for non-SuperAdmin
    // - Otherwise keep existing status
    let newStatus = existing.status;
    if (user?.role === 'SUPERADMIN' && dto.status) {
      newStatus = dto.status;
    } else if (existing.status === 'REVISION') {
      newStatus = 'DRAFT';
    }

    const updateData: any = {
        title: dto.title ? sanitizeText(dto.title) : undefined,
        description: dto.description ? sanitizeText(dto.description) : dto.description,
        thumbnailUrl: dto.thumbnailUrl !== undefined ? (dto.thumbnailUrl ? sanitizeText(dto.thumbnailUrl) : null) : undefined,
        socialThumbnailUrl: dto.socialThumbnailUrl !== undefined ? (dto.socialThumbnailUrl ? sanitizeText(dto.socialThumbnailUrl) : null) : undefined,
        // NOTE: 'type' is immutable after creation — never updated here to prevent orphan detail records
        ageGroups: dto.ageGroups || [],
        nodeId: dto.nodeId || null,
        enableAudio: existing.type === 'KISAH' ? (dto.enableAudio !== false) : (dto.enableAudio ?? existing.enableAudio),
        audioTitle: dto.audioTitle !== undefined ? dto.audioTitle : existing.audioTitle,
        audioDescription: dto.audioDescription !== undefined ? dto.audioDescription : existing.audioDescription,
        audioUrl: dto.audioUrl !== undefined ? (dto.audioUrl ? sanitizeText(dto.audioUrl) : null) : existing.audioUrl,
        metaTitle: dto.metaTitle ? sanitizeText(dto.metaTitle) : dto.metaTitle,
        metaDesc: dto.metaDesc ? sanitizeText(dto.metaDesc) : dto.metaDesc,
        pov: existing.type === 'ARTICLE' ? (dto.pov !== undefined ? (dto.pov || null) : existing.pov) : null,
        status: newStatus,
    };

    // Set publishedAt when status changes to PUBLISHED
    if (newStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    // Only SuperAdmin can set displayAuthorName
    if (user?.role === 'SUPERADMIN' && (dto as any).displayAuthorName !== undefined) {
      updateData.displayAuthorName = sanitizeText((dto as any).displayAuthorName || '') || null;
    }
    const updated = await this.prisma.contentItem.update({
      where: { id: contentId },
      data: updateData,
    });

    // Award points if SuperAdmin directly published (prevent double reward)
    if (newStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      try {
        const alreadyRewarded = await this.rewardService.hasRewardedForContent(contentId);
        if (!alreadyRewarded) {
          const settings = await this.rewardService.getRewardSettings();
          await this.rewardService.addPoints(
            existing.authorId, settings.pointPerApproved, PointType.EARNED,
            `Konten dipublikasikan: ${existing.title}`, contentId,
          );
        }
      } catch (err) {
        this.logger.warn(`Reward on direct publish failed (non-fatal): ${err.message}`);
      }

      // Notify the author that their content was published
      if (existing.authorId !== userId) {
        await this.notificationService.createNotification({
          userId: existing.authorId,
          actorId: userId,
          type: 'CONTENT_APPROVED',
          title: 'Konten Anda Dipublikasikan ✅',
          message: `Konten "${existing.title}" telah diterbitkan langsung oleh SuperAdmin.`,
          linkUrl: '/admin/my-contents',
        });
      }
    }

    // Update QnA Detail — use existing.type (immutable) to route to correct detail table
    if (existing.type === 'QNA' && dto.qnaDetail) {
      const sanitized = sanitizeJsonDeep(dto.qnaDetail);
      await this.prisma.qnaDetail.upsert({
        where: { contentId },
        update: {
          question: sanitized.question,
          answerQuick: sanitized.answerQuick,
          answerQuickReferenceUrl: sanitized.answerQuickReferenceUrl || null,
          blocks: sanitized.blocks || [],
          // Legacy fields — kept empty during dual-phase migration
          dialogBlocks: [],
          dalilBlocks: [],
          analogyBlocks: [],
          tipsBlocks: [],
        },
        create: {
          contentId,
          question: sanitized.question || sanitizeText(dto.title || ''),
          answerQuick: sanitized.answerQuick || '',
          answerQuickReferenceUrl: sanitized.answerQuickReferenceUrl || null,
          blocks: sanitized.blocks || [],
          // Legacy fields — kept empty during dual-phase migration
          dialogBlocks: [],
          dalilBlocks: [],
          analogyBlocks: [],
          tipsBlocks: [],
        },
      });
    }

    // Update Article/Pembelajaran/Kisah Detail
    if (['ARTICLE', 'PEMBELAJARAN', 'KISAH'].includes(existing.type) && dto.articleDetail) {
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
        // Floor negative usageCount to 0 (prevent ghost data)
        await this.prisma.contentTag.updateMany({
          where: { usageCount: { lt: 0 } },
          data: { usageCount: 0 },
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
    const existing = await this.prisma.contentItem.findUnique({ where: { id: contentId, deletedAt: null } });
    if (!existing) throw new NotFoundException('Konten tidak ditemukan');
    if (existing.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Anda tidak memiliki akses');
    }
    // Only allow Author to delete non-published content
    if (existing.status === 'PUBLISHED' && userRole === 'AUTHOR') {
      throw new ForbiddenException('Editor tidak bisa menghapus konten yang sudah dipublikasikan');
    }

    // Soft delete: move to trash
    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: {
        deletedAt: new Date(),
        previousStatus: existing.status,
      },
    });

    // Notify author if deleted by someone else (Admin/SuperAdmin)
    if (existing.authorId !== userId) {
      await this.notificationService.createNotification({
        userId: existing.authorId,
        actorId: userId,
        type: 'SYSTEM_ALERT',
        title: 'Konten Dipindahkan ke Sampah 🗑️',
        message: `Konten "${existing.title}" telah dipindahkan ke tempat sampah oleh Admin. Konten akan dihapus permanen dalam 30 hari.`,
        linkUrl: '/admin/trash',
      });
    }

    return { message: 'Konten dipindahkan ke Tempat Sampah' };
  }

  async submitForReview(userId: string, contentId: string) {
    const content = await this.prisma.contentItem.findUnique({ where: { id: contentId, deletedAt: null } });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    // Allow Admin/SuperAdmin to submit others' content for review
    const caller = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (content.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(caller?.role || '')) {
      throw new ForbiddenException('Bukan konten Anda');
    }
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

  async getNodes(group?: string) {
    const where: any = { isActive: true };
    if (group) where.group = group;
    const nodes = await this.prisma.contentNode.findMany({
      where,
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, title: true, type: true, parentId: true, ageGroups: true, group: true },
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

  // ═══════════════════════════════════════════════════════
  // TRASH / RECYCLE BIN
  // ═══════════════════════════════════════════════════════

  async getTrash(userId: string, userRole: string, page: number = 1, search?: string) {
    const limit = 20;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: { not: null } };

    // Author: only own trash. Admin/SuperAdmin: all trash.
    if (!['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      where.authorId = userId;
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { name: true } },
          node: { select: { title: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async restoreFromTrash(userId: string, userRole: string, contentId: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    if (!content.deletedAt) throw new BadRequestException('Konten tidak ada di Tempat Sampah');

    // Author: only own. Admin/SuperAdmin: any.
    if (content.authorId !== userId && !['ADMIN', 'SUPERADMIN'].includes(userRole)) {
      throw new ForbiddenException('Anda tidak memiliki akses');
    }

    // All restored content goes to DRAFT — must go through review again
    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: {
        deletedAt: null,
        previousStatus: null,
        status: 'DRAFT',
      },
    });

    // Notify author if restored by someone else
    if (content.authorId !== userId) {
      await this.notificationService.createNotification({
        userId: content.authorId,
        actorId: userId,
        type: 'SYSTEM_ALERT',
        title: 'Konten Dipulihkan ♻️',
        message: `Konten "${content.title}" telah dipulihkan dari Tempat Sampah oleh Admin. Status dikembalikan ke Draft.`,
        linkUrl: '/admin/my-contents',
      });
    }

    return { message: 'Konten berhasil dipulihkan ke Draft' };
  }

  async permanentlyDelete(userId: string, userRole: string, contentId: string) {
    // Only SUPERADMIN can permanently delete
    if (userRole !== 'SUPERADMIN') {
      throw new ForbiddenException('Hanya SuperAdmin yang bisa menghapus permanen');
    }

    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    if (!content.deletedAt) throw new BadRequestException('Konten harus ada di Tempat Sampah terlebih dahulu');

    // Hard delete — Prisma cascade will clean up all related data
    await this.prisma.contentItem.delete({ where: { id: contentId } });

    return { message: 'Konten dihapus permanen' };
  }

  async emptyTrash(userId: string, userRole: string) {
    // Only SUPERADMIN can empty trash
    if (userRole !== 'SUPERADMIN') {
      throw new ForbiddenException('Hanya SuperAdmin yang bisa mengosongkan Tempat Sampah');
    }

    const result = await this.prisma.contentItem.deleteMany({
      where: { deletedAt: { not: null } },
    });

    return { message: `${result.count} konten dihapus permanen dari Tempat Sampah` };
  }
}
