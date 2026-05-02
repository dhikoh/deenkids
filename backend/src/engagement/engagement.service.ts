import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EngagementService {
  constructor(private prisma: PrismaService) {}

  private async validateContent(contentId: string) {
    const exists = await this.prisma.contentItem.findFirst({ where: { id: contentId, deletedAt: null, status: 'PUBLISHED' }, select: { id: true } });
    if (!exists) throw new NotFoundException('Konten tidak ditemukan');
  }

  async toggleLike(contentId: string, userHash: string) {
    await this.validateContent(contentId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contentLike.findUnique({
        where: { contentId_userHash: { contentId, userHash } },
      });

      if (existing) {
        await tx.contentLike.delete({ where: { id: existing.id } });
        await tx.contentItem.update({
          where: { id: contentId },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false };
      } else {
        await tx.contentLike.create({ data: { contentId, userHash } });
        await tx.contentItem.update({
          where: { id: contentId },
          data: { likeCount: { increment: 1 } },
        });
        return { liked: true };
      }
    });
  }

  async toggleBookmark(contentId: string, userHash: string) {
    await this.validateContent(contentId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contentBookmark.findUnique({
        where: { contentId_userHash: { contentId, userHash } },
      });

      if (existing) {
        await tx.contentBookmark.delete({ where: { id: existing.id } });
        await tx.contentItem.update({
          where: { id: contentId },
          data: { bookmarkCount: { decrement: 1 } },
        });
        return { bookmarked: false };
      } else {
        await tx.contentBookmark.create({ data: { contentId, userHash } });
        await tx.contentItem.update({
          where: { id: contentId },
          data: { bookmarkCount: { increment: 1 } },
        });
        return { bookmarked: true };
      }
    });
  }

  async submitRating(contentId: string, userHash: string, rating: number) {
    await this.validateContent(contentId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contentRating.findUnique({
        where: { contentId_userHash: { contentId, userHash } },
      });

      if (existing) {
        await tx.contentRating.update({ where: { id: existing.id }, data: { rating } });
      } else {
        await tx.contentRating.create({ data: { contentId, userHash, rating } });
        await tx.contentItem.update({
          where: { id: contentId },
          data: { ratingCount: { increment: 1 } },
        });
      }

      // Use DB aggregate instead of fetching all records
      const agg = await tx.contentRating.aggregate({
        where: { contentId },
        _avg: { rating: true },
      });
      const avg = agg._avg.rating || 0;

      await tx.contentItem.update({
        where: { id: contentId },
        data: { avgRating: avg },
      });

      return { avgRating: avg };
    });
  }

  async recordView(contentId: string, userHash: string) {
    await this.validateContent(contentId);

    // Deduplicate: max 1 view per user per 24h
    const viewExists = await this.prisma.contentView.findFirst({
      where: {
        contentId,
        userHash,
        viewedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (!viewExists) {
      await this.prisma.$transaction([
        this.prisma.contentView.create({ data: { contentId, userHash } }),
        this.prisma.contentItem.update({
          where: { id: contentId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
    }

    return { success: true };
  }

  async recordShare(contentId: string, userHash?: string) {
    await this.validateContent(contentId);

    // Spam guard: max 1 share count per userHash per 24h
    if (userHash) {
      const recentShare = await this.prisma.contentView.findFirst({
        where: {
          contentId,
          userHash: `share:${userHash}`,
          viewedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (recentShare) return { success: true }; // Already counted

      // Track share via ContentView (reuse table, prefix userHash)
      await this.prisma.contentView.create({
        data: { contentId, userHash: `share:${userHash}` },
      });
    }

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { shareCount: { increment: 1 } },
    });
    return { success: true };
  }

  async getStatus(contentId: string, userHash: string) {
    const [liked, bookmarked, rating] = await Promise.all([
      this.prisma.contentLike.findUnique({
        where: { contentId_userHash: { contentId, userHash } },
        select: { id: true },
      }),
      this.prisma.contentBookmark.findUnique({
        where: { contentId_userHash: { contentId, userHash } },
        select: { id: true },
      }),
      this.prisma.contentRating.findUnique({
        where: { contentId_userHash: { contentId, userHash } },
        select: { rating: true },
      }),
    ]);
    return {
      liked: !!liked,
      bookmarked: !!bookmarked,
      userRating: rating?.rating ?? null,
    };
  }
}
