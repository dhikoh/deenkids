import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

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
}
