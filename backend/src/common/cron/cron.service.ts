import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RewardService } from '../../reward/reward.service';
import { PointType } from '@prisma/client';
import * as fs from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RewardService)) private readonly rewardService: RewardService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`🧹 Cleaned up ${result.count} expired refresh tokens`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async recalcAuthorStats() {
    // Batch: get all author stats in one query using groupBy
    const stats = await this.prisma.contentItem.groupBy({
      by: ['authorId'],
      where: { status: 'PUBLISHED' },
      _count: true,
      _sum: { viewCount: true, likeCount: true },
      _avg: { avgRating: true },
    });

    for (const s of stats) {
      await this.prisma.authorStat.upsert({
        where: { authorId: s.authorId },
        update: {
          totalPublished: s._count || 0,
          totalViews: s._sum.viewCount || 0,
          totalLikes: s._sum.likeCount || 0,
          avgContentRating: s._avg.avgRating || 0,
        },
        create: {
          authorId: s.authorId,
          totalPublished: s._count || 0,
          totalViews: s._sum.viewCount || 0,
          totalLikes: s._sum.likeCount || 0,
          avgContentRating: s._avg.avgRating || 0,
        },
      });
    }
    this.logger.log(`📊 Recalculated stats for ${stats.length} authors`);
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

  // Award bonus points for engagement milestones
  @Cron(CronExpression.EVERY_HOUR)
  async checkEngagementMilestones() {
    const contents = await this.prisma.contentItem.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, authorId: true, viewCount: true, likeCount: true, shareCount: true, avgRating: true, ratingCount: true, title: true },
    });

    const settingRows = await this.prisma.setting.findMany({ where: { key: { in: ['point_views_milestone', 'point_likes_milestone', 'point_shares_milestone', 'point_rating_bonus'] } } });
    const settings = Object.fromEntries(settingRows.map(s => [s.key, s.value]));
    const viewBonus = parseInt(settings.point_views_milestone || '5');
    const likeBonus = parseInt(settings.point_likes_milestone || '3');
    const shareBonus = parseInt(settings.point_shares_milestone || '3');
    const ratingBonus = parseInt(settings.point_rating_bonus || '5');

    let awarded = 0;
    for (const c of contents) {
      // Views milestone (every 500 views)
      const viewMilestones = Math.floor(c.viewCount / 500);
      if (viewMilestones > 0) {
        const existing = await this.prisma.pointLedger.count({
          where: { contentId: c.id, type: PointType.BONUS, reason: { startsWith: 'Bonus views' } },
        });
        if (viewMilestones > existing) {
          await this.rewardService.addPoints(
            c.authorId, viewBonus, PointType.BONUS,
            `Bonus views ${viewMilestones * 500}: ${c.title}`, c.id,
          );
          awarded++;
        }
      }
      // Likes milestone (every 50 likes)
      const likeMilestones = Math.floor(c.likeCount / 50);
      if (likeMilestones > 0) {
        const existing = await this.prisma.pointLedger.count({
          where: { contentId: c.id, type: PointType.BONUS, reason: { startsWith: 'Bonus likes' } },
        });
        if (likeMilestones > existing) {
          await this.rewardService.addPoints(
            c.authorId, likeBonus, PointType.BONUS,
            `Bonus likes ${likeMilestones * 50}: ${c.title}`, c.id,
          );
          awarded++;
        }
      }
      // Shares milestone (every 100 shares)
      const shareMilestones = Math.floor(c.shareCount / 100);
      if (shareMilestones > 0) {
        const existing = await this.prisma.pointLedger.count({
          where: { contentId: c.id, type: PointType.BONUS, reason: { startsWith: 'Bonus shares' } },
        });
        if (shareMilestones > existing) {
          await this.rewardService.addPoints(
            c.authorId, shareBonus, PointType.BONUS,
            `Bonus shares ${shareMilestones * 100}: ${c.title}`, c.id,
          );
          awarded++;
        }
      }
      // Rating bonus (avg >= 4.5 with min 10 ratings — one-time)
      if (c.avgRating >= 4.5 && c.ratingCount >= 10) {
        const existing = await this.prisma.pointLedger.count({
          where: { contentId: c.id, type: PointType.BONUS, reason: { startsWith: 'Bonus rating' } },
        });
        if (existing === 0) {
          await this.rewardService.addPoints(
            c.authorId, ratingBonus, PointType.BONUS,
            `Bonus rating ⭐${c.avgRating.toFixed(1)}: ${c.title}`, c.id,
          );
          awarded++;
        }
      }
    }
    if (awarded > 0) this.logger.log(`🏆 Awarded ${awarded} engagement bonuses`);
  }

  // Daily database backup
  @Cron('0 2 * * *') // Every day at 2AM
  async dailyDatabaseBackup() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      this.logger.warn('⚠️ DATABASE_URL not set, skipping backup');
      return;
    }

    const dir = join(process.cwd(), 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `adably-backup-${new Date().toISOString().slice(0, 10)}.sql`;
    const filepath = join(dir, filename);

    try {
      // Use execFileSync with array args to prevent shell injection
      const output = execFileSync('pg_dump', [dbUrl], { timeout: 120000 });
      fs.writeFileSync(filepath, output);
      this.logger.log(`💾 Backup berhasil: ${filename}`);
    } catch (e: any) {
      this.logger.warn(`⚠️ Backup gagal: ${e.message}`);
    }

    // Cleanup backups older than 7 days
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
      if (files.length > 7) {
        for (const old of files.slice(0, files.length - 7)) {
          fs.unlinkSync(join(dir, old));
        }
        this.logger.log(`🧹 Cleaned up ${files.length - 7} old backups`);
      }
    } catch {}
  }

  // Weekly cleanup: prune old ContentView records (>90 days)
  @Cron('0 4 * * 0') // Every Sunday at 4AM
  async cleanupOldContentViews() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const result = await this.prisma.contentView.deleteMany({
      where: { viewedAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`🧹 Cleaned up ${result.count} content views older than 90 days`);
    }
  }
}
