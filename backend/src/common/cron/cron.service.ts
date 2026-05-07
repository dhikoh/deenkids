import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RewardService } from '../../reward/reward.service';
import { StorageService } from '../storage/storage.service';
import { SocialService } from '../../social/social.service';
import { PointType } from '@prisma/client';
import * as fs from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => RewardService)) private readonly rewardService: RewardService,
    private readonly socialService: SocialService,
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
      where: { status: 'PUBLISHED', deletedAt: null },
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

  // Cleanup proof images older than 3 months (financial record stays in DB)
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
        try {
          // Delete from MinIO object storage (safe no-op if URL doesn't match)
          await this.storageService.deleteFile(d.proofUrl);
          deleted++;
        } catch {}
        // Clear proofUrl but keep the financial record
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
    // Pre-filter: only fetch content that has reached at least one milestone threshold
    const contents = await this.prisma.contentItem.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [
          { viewCount: { gte: 500 } },
          { likeCount: { gte: 50 } },
          { shareCount: { gte: 100 } },
          { avgRating: { gte: 4.5 }, ratingCount: { gte: 10 } },
        ],
      },
      select: { id: true, authorId: true, viewCount: true, likeCount: true, shareCount: true, avgRating: true, ratingCount: true, title: true },
    });

    if (contents.length === 0) return;

    const settingRows = await this.prisma.setting.findMany({ where: { key: { in: ['point_views_milestone', 'point_likes_milestone', 'point_shares_milestone', 'point_rating_bonus'] } } });
    const settings = Object.fromEntries(settingRows.map(s => [s.key, s.value]));
    const viewBonus = parseInt(settings.point_views_milestone || '5');
    const likeBonus = parseInt(settings.point_likes_milestone || '3');
    const shareBonus = parseInt(settings.point_shares_milestone || '3');
    const ratingBonus = parseInt(settings.point_rating_bonus || '5');

    // Batch-fetch all existing bonuses for these contents (eliminates N+1)
    const contentIds = contents.map(c => c.id);
    const existingBonuses = await this.prisma.pointLedger.groupBy({
      by: ['contentId', 'reason'],
      where: { contentId: { in: contentIds }, type: PointType.BONUS },
      _count: { id: true },
    });
    // Build lookup: contentId -> { 'Bonus views': count, 'Bonus likes': count, ... }
    const bonusMap = new Map<string, Map<string, number>>();
    for (const b of existingBonuses) {
      if (!b.contentId) continue;
      if (!bonusMap.has(b.contentId)) bonusMap.set(b.contentId, new Map());
      const prefix = b.reason.split(' ').slice(0, 2).join(' '); // "Bonus views", "Bonus likes", etc.
      const current = bonusMap.get(b.contentId)!.get(prefix) || 0;
      bonusMap.get(b.contentId)!.set(prefix, current + b._count.id);
    }

    const getBonusCount = (contentId: string, prefix: string) => bonusMap.get(contentId)?.get(prefix) || 0;

    let awarded = 0;
    for (const c of contents) {
      // Views milestone (every 500 views)
      const viewMilestones = Math.floor(c.viewCount / 500);
      if (viewMilestones > getBonusCount(c.id, 'Bonus views')) {
        await this.rewardService.addPoints(c.authorId, viewBonus, PointType.BONUS, `Bonus views ${viewMilestones * 500}: ${c.title}`, c.id);
        awarded++;
      }
      // Likes milestone (every 50 likes)
      const likeMilestones = Math.floor(c.likeCount / 50);
      if (likeMilestones > getBonusCount(c.id, 'Bonus likes')) {
        await this.rewardService.addPoints(c.authorId, likeBonus, PointType.BONUS, `Bonus likes ${likeMilestones * 50}: ${c.title}`, c.id);
        awarded++;
      }
      // Shares milestone (every 100 shares)
      const shareMilestones = Math.floor(c.shareCount / 100);
      if (shareMilestones > getBonusCount(c.id, 'Bonus shares')) {
        await this.rewardService.addPoints(c.authorId, shareBonus, PointType.BONUS, `Bonus shares ${shareMilestones * 100}: ${c.title}`, c.id);
        awarded++;
      }
      // Rating bonus (avg >= 4.5 with min 10 ratings — one-time)
      if (c.avgRating >= 4.5 && c.ratingCount >= 10 && getBonusCount(c.id, 'Bonus rating') === 0) {
        await this.rewardService.addPoints(c.authorId, ratingBonus, PointType.BONUS, `Bonus rating ⭐${c.avgRating.toFixed(1)}: ${c.title}`, c.id);
        awarded++;
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

  // Cleanup resolved error reports older than 30 days
  @Cron('0 5 * * 0') // Every Sunday at 5AM
  async cleanupOldErrorReports() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const result = await this.prisma.errorReport.deleteMany({
      where: {
        isResolved: true,
        lastSeenAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      this.logger.log(`🧹 Cleaned up ${result.count} resolved error reports older than 30 days`);
    }
  }

  // Auto-purge trashed content older than 30 days
  @Cron('0 3 * * *') // Every day at 3AM
  async purgeExpiredTrash() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // Cleanup MinIO files before deleting records
    const toDelete = await this.prisma.contentItem.findMany({
      where: { deletedAt: { lt: cutoff, not: null } },
      select: { audioUrl: true, thumbnailUrl: true, socialThumbnailUrl: true },
    });
    for (const item of toDelete) {
      if (item.audioUrl) await this.storageService.deleteFile(item.audioUrl).catch(() => {});
      if (item.thumbnailUrl) await this.storageService.deleteFile(item.thumbnailUrl).catch(() => {});
      if (item.socialThumbnailUrl) await this.storageService.deleteFile(item.socialThumbnailUrl).catch(() => {});
    }

    const result = await this.prisma.contentItem.deleteMany({
      where: {
        deletedAt: { lt: cutoff, not: null },
      },
    });
    if (result.count > 0) {
      this.logger.log(`🗑️ Purged ${result.count} trash items older than 30 days (files cleaned from MinIO)`);
    }
  }

  // Weekly: clean orphan tags (usageCount=0, no linked content)
  @Cron('0 4 * * 1') // Every Monday at 4AM
  async cleanupOrphanTags() {
    // Find tags with zero usage that have no ContentItemTag relations
    const orphans = await this.prisma.contentTag.findMany({
      where: {
        usageCount: { lte: 0 },
        items: { none: {} },
      },
      select: { id: true },
    });
    if (orphans.length > 0) {
      await this.prisma.contentTag.deleteMany({
        where: { id: { in: orphans.map(t => t.id) } },
      });
      this.logger.log(`🏷️ Cleaned up ${orphans.length} orphan tags`);
    }
  }

  // ─── Social Media Cron Jobs ──────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledSocialPosts() {
    try {
      const shouldRun = await this.socialService.shouldCronRun('publish');
      if (!shouldRun) return;
      this.logger.log('📱 Running scheduled social post processing...');
      await this.socialService.processScheduledPosts();
    } catch (err) {
      this.logger.error(`Social scheduled post processing failed: ${err.message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async validateSocialTokens() {
    try {
      const shouldRun = await this.socialService.shouldCronRun('validate');
      if (!shouldRun) return;
      this.logger.log('🔐 Running social token validation...');
      await this.socialService.validateAllTokens();
    } catch (err) {
      this.logger.error(`Social token validation failed: ${err.message}`);
    }
  }
}
