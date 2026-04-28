import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`🧹 Cleaned up ${result.count} expired refresh tokens`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async recalcAuthorStats() {
    const authors = await this.prisma.user.findMany({
      where: { role: { in: ['AUTHOR', 'ADMIN', 'SUPERADMIN'] } },
      select: { id: true },
    });

    for (const author of authors) {
      const stats = await this.prisma.contentItem.aggregate({
        where: { authorId: author.id, status: 'PUBLISHED' },
        _count: true,
        _sum: { viewCount: true, likeCount: true },
        _avg: { avgRating: true },
      });

      await this.prisma.authorStat.upsert({
        where: { authorId: author.id },
        update: {
          totalPublished: stats._count || 0,
          totalViews: stats._sum.viewCount || 0,
          totalLikes: stats._sum.likeCount || 0,
          avgContentRating: stats._avg.avgRating || 0,
        },
        create: {
          authorId: author.id,
          totalPublished: stats._count || 0,
          totalViews: stats._sum.viewCount || 0,
          totalLikes: stats._sum.likeCount || 0,
          avgContentRating: stats._avg.avgRating || 0,
        },
      });
    }
    this.logger.log(`📊 Recalculated stats for ${authors.length} authors`);
  }

  // Cleanup proof images older than 3 months (data stays in DB)
  @Cron('0 4 1 * *') // 1st of every month at 4AM
  async cleanupOldProofImages() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const oldDonations = await this.prisma.donationSubmission.findMany({
      where: { createdAt: { lt: threeMonthsAgo }, proofUrl: { not: null } },
      select: { id: true, proofUrl: true },
    });

    let deleted = 0;
    for (const d of oldDonations) {
      if (d.proofUrl) {
        const filePath = join(process.cwd(), d.proofUrl);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch {}
        // Clear proofUrl but keep financial record
        await this.prisma.donationSubmission.update({
          where: { id: d.id },
          data: { proofUrl: null },
        });
      }
    }
    this.logger.log(`🗑️ Cleaned up ${deleted} proof images older than 3 months`);
  }
}
