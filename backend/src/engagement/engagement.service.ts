import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EngagementService {
  constructor(private prisma: PrismaService) {}

  private async validateContent(contentId: string) {
    const exists = await this.prisma.contentItem.findUnique({ where: { id: contentId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Konten tidak ditemukan');
  }

  async toggleLike(contentId: string, userHash: string) {
    await this.validateContent(contentId);
    const existing = await this.prisma.contentLike.findUnique({
      where: { contentId_userHash: { contentId, userHash } },
    });

    if (existing) {
      await this.prisma.contentLike.delete({ where: { id: existing.id } });
      await this.prisma.contentItem.update({
        where: { id: contentId },
        data: { likeCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      await this.prisma.contentLike.create({
        data: { contentId, userHash },
      });
      await this.prisma.contentItem.update({
        where: { id: contentId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  async toggleBookmark(contentId: string, userHash: string) {
    const existing = await this.prisma.contentBookmark.findUnique({
      where: { contentId_userHash: { contentId, userHash } },
    });

    if (existing) {
      await this.prisma.contentBookmark.delete({ where: { id: existing.id } });
      await this.prisma.contentItem.update({
        where: { id: contentId },
        data: { bookmarkCount: { decrement: 1 } },
      });
      return { bookmarked: false };
    } else {
      await this.prisma.contentBookmark.create({
        data: { contentId, userHash },
      });
      await this.prisma.contentItem.update({
        where: { id: contentId },
        data: { bookmarkCount: { increment: 1 } },
      });
      return { bookmarked: true };
    }
  }

  async submitRating(contentId: string, userHash: string, rating: number) {
    const existing = await this.prisma.contentRating.findUnique({
      where: { contentId_userHash: { contentId, userHash } },
    });

    if (existing) {
      // Update existing rating
      await this.prisma.contentRating.update({
        where: { id: existing.id },
        data: { rating },
      });
    } else {
      // Create new rating
      await this.prisma.contentRating.create({
        data: { contentId, userHash, rating },
      });
      await this.prisma.contentItem.update({
        where: { id: contentId },
        data: { ratingCount: { increment: 1 } },
      });
    }

    // Recalculate average rating
    const allRatings = await this.prisma.contentRating.findMany({
      where: { contentId },
    });
    const avg = allRatings.reduce((acc, curr) => acc + curr.rating, 0) / allRatings.length;

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { avgRating: avg },
    });

    return { avgRating: avg };
  }

  async recordView(contentId: string, userHash: string) {
    // Basic implementation to avoid spamming views from same user
    const viewExists = await this.prisma.contentView.findFirst({
      where: {
        contentId,
        userHash,
        viewedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24h
        },
      },
    });

    if (!viewExists) {
      await this.prisma.contentView.create({
        data: { contentId, userHash },
      });
      await this.prisma.contentItem.update({
        where: { id: contentId },
        data: { viewCount: { increment: 1 } },
      });
    }
    
    return { success: true };
  }

  async recordShare(contentId: string) {
    await this.validateContent(contentId);
    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { shareCount: { increment: 1 } },
    });
    return { success: true };
  }
}
