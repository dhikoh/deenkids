import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialTokenService } from './social-token.service';
import { SocialCaptionService } from './social-caption.service';
import { PublishSocialDto } from './dto/social.dto';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: SocialTokenService,
    private readonly captionService: SocialCaptionService,
  ) {}

  // ─── Account Management ────────────────────────────────────────

  async getAccounts(userId: string) {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        pageName: true,
        pageId: true,
        igAccountId: true,
        igUsername: true,
        profilePictureUrl: true,
        defaultHashtags: true,
        captionTemplate: true,
        isActive: true,
        connectedAt: true,
      },
    });
  }

  async connectAccount(userId: string, code: string) {
    // Exchange code for long-lived user token
    const userToken = await this.tokenService.exchangeCodeForToken(code);

    // Fetch pages
    const pages = await this.tokenService.fetchPages(userToken);
    if (!pages.length) {
      throw new BadRequestException('Tidak ditemukan Facebook Page yang Anda kelola.');
    }

    // Use the first page (most common case for single-page businesses)
    const page = pages[0];
    const pageToken = page.access_token; // Page token from long-lived user token = never-expires

    // Fetch IG business account
    const ig = await this.tokenService.fetchIgAccount(page.id, pageToken);

    // Encrypt the page token before storing
    const encryptedToken = this.tokenService.encryptToken(pageToken);

    // Upsert — update if page already exists, create if not
    const account = await this.prisma.socialAccount.upsert({
      where: { pageId: page.id },
      update: {
        userId,
        pageName: page.name,
        pageAccessToken: encryptedToken,
        igAccountId: ig.igId,
        igUsername: ig.igUsername,
        profilePictureUrl: ig.profilePictureUrl,
        isActive: true,
      },
      create: {
        userId,
        platform: 'META',
        pageName: page.name,
        pageId: page.id,
        pageAccessToken: encryptedToken,
        igAccountId: ig.igId,
        igUsername: ig.igUsername,
        profilePictureUrl: ig.profilePictureUrl,
      },
    });

    this.logger.log(`✅ Social account connected: ${page.name} (IG: ${ig.igUsername || 'none'})`);
    return account;
  }

  async disconnectAccount(accountId: string, userId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new NotFoundException('Akun sosial tidak ditemukan');

    // Cancel all scheduled posts for this account
    await this.prisma.socialPublishLog.updateMany({
      where: { socialAccountId: accountId, status: 'SCHEDULED' },
      data: { status: 'CANCELLED' },
    });

    // Delete the account
    await this.prisma.socialAccount.delete({ where: { id: accountId } });
    this.logger.log(`🔌 Social account disconnected: ${account.pageName}`);
  }

  async updateDefaults(accountId: string, userId: string, data: { defaultHashtags?: string; captionTemplate?: string }) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new NotFoundException('Akun sosial tidak ditemukan');

    return this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        defaultHashtags: data.defaultHashtags !== undefined ? data.defaultHashtags : undefined,
        captionTemplate: data.captionTemplate !== undefined ? data.captionTemplate : undefined,
      },
    });
  }

  // ─── Caption Generation ────────────────────────────────────────

  async generateCaption(contentId: string, userId: string) {
    const content = await this.getContentWithDetails(contentId);
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, isActive: true },
    });

    return {
      caption: this.captionService.buildCaption(content, account),
      imageUrl: content.socialThumbnailUrl || content.thumbnailUrl || null,
    };
  }

  // ─── Publishing ────────────────────────────────────────────────

  async handlePublish(userId: string, dto: PublishSocialDto) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, isActive: true },
    });
    if (!account) {
      throw new BadRequestException('Belum ada akun sosial media yang terhubung. Hubungkan di Pengaturan Sosmed.');
    }

    const content = await this.getContentWithDetails(dto.contentId);
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    const imageUrl = content.socialThumbnailUrl || content.thumbnailUrl;
    if (!imageUrl) {
      throw new BadRequestException('Konten harus memiliki thumbnail untuk di-publish ke sosial media.');
    }

    const results: any[] = [];

    for (const platform of dto.platforms) {
      if (!['INSTAGRAM', 'FACEBOOK'].includes(platform)) continue;

      if (dto.mode === 'SCHEDULED') {
        if (!dto.scheduledAt) throw new BadRequestException('Tanggal jadwal wajib diisi untuk mode SCHEDULED');
        const log = await this.prisma.socialPublishLog.create({
          data: {
            contentId: dto.contentId,
            socialAccountId: account.id,
            platform,
            caption: dto.caption,
            imageUrl,
            status: 'SCHEDULED',
            scheduledAt: new Date(dto.scheduledAt),
          },
        });
        results.push({ platform, status: 'SCHEDULED', logId: log.id, scheduledAt: dto.scheduledAt });
      } else {
        // IMMEDIATE — publish now
        const result = await this.publishNow(account, content, platform, dto.caption, imageUrl);
        results.push(result);
      }
    }

    return { success: true, results };
  }

  /**
   * Actually publish to a platform (used by both immediate & cron-scheduled).
   */
  async publishNow(account: any, content: any, platform: string, caption: string, imageUrl: string, logId?: string) {
    const pageToken = this.tokenService.decryptToken(account.pageAccessToken);

    // Create or update log
    const log = logId
      ? await this.prisma.socialPublishLog.update({
          where: { id: logId },
          data: { status: 'PUBLISHING' },
        })
      : await this.prisma.socialPublishLog.create({
          data: {
            contentId: content.id,
            socialAccountId: account.id,
            platform,
            caption,
            imageUrl,
            status: 'PUBLISHING',
          },
        });

    try {
      let postId: string | null = null;
      let postUrl: string | null = null;

      if (platform === 'INSTAGRAM') {
        const result = await this.publishToInstagram(account.igAccountId, pageToken, imageUrl, caption);
        postId = result.postId;
        postUrl = result.postUrl;
      } else if (platform === 'FACEBOOK') {
        const result = await this.publishToFacebook(account.pageId, pageToken, imageUrl, caption);
        postId = result.postId;
        postUrl = result.postUrl;
      }

      // Update log with success
      await this.prisma.socialPublishLog.update({
        where: { id: log.id },
        data: { status: 'PUBLISHED', postId, postUrl, publishedAt: new Date(), error: null },
      });

      this.logger.log(`📱 Published to ${platform}: ${postUrl}`);
      return { platform, status: 'PUBLISHED', postUrl, postId, logId: log.id };
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      await this.prisma.socialPublishLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: errorMsg, retryCount: { increment: 1 } },
      });
      this.logger.error(`❌ Publish to ${platform} failed: ${errorMsg}`);
      return { platform, status: 'FAILED', error: errorMsg, logId: log.id };
    }
  }

  // ─── Instagram API ─────────────────────────────────────────────

  private async publishToInstagram(igAccountId: string, pageToken: string, imageUrl: string, caption: string) {
    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: pageToken,
      }),
    });
    const containerData = await containerRes.json();
    if (containerData.error) {
      throw new Error(`IG container: ${containerData.error.message}`);
    }

    // Step 2: Publish container
    const publishUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: pageToken,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(`IG publish: ${publishData.error.message}`);
    }

    // Step 3: Get permalink
    const permalinkUrl = `https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${pageToken}`;
    const permalinkRes = await fetch(permalinkUrl);
    const permalinkData = await permalinkRes.json();

    return {
      postId: publishData.id,
      postUrl: permalinkData.permalink || `https://www.instagram.com/`,
    };
  }

  // ─── Facebook API ──────────────────────────────────────────────

  private async publishToFacebook(pageId: string, pageToken: string, imageUrl: string, caption: string) {
    const url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        message: caption,
        access_token: pageToken,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`FB publish: ${data.error.message}`);
    }

    // Get permalink
    const postId = data.post_id || data.id;
    let postUrl = `https://www.facebook.com/${postId}`;
    try {
      const linkRes = await fetch(`https://graph.facebook.com/v19.0/${postId}?fields=permalink_url&access_token=${pageToken}`);
      const linkData = await linkRes.json();
      if (linkData.permalink_url) postUrl = linkData.permalink_url;
    } catch {
      // Use fallback URL
    }

    return { postId, postUrl };
  }

  // ─── Retry & Cancel ────────────────────────────────────────────

  async retryPublish(logId: string, userId: string) {
    const log = await this.prisma.socialPublishLog.findFirst({
      where: { id: logId, status: 'FAILED' },
      include: { socialAccount: true, content: { include: { qnaDetail: true, articleDetail: true, tags: { include: { tag: true } } } } },
    });
    if (!log) throw new NotFoundException('Log tidak ditemukan atau status bukan FAILED');
    if (log.socialAccount.userId !== userId) throw new BadRequestException('Akses ditolak');

    return this.publishNow(log.socialAccount, log.content, log.platform, log.caption, log.imageUrl, log.id);
  }

  async cancelScheduled(logId: string, userId: string) {
    const log = await this.prisma.socialPublishLog.findFirst({
      where: { id: logId, status: 'SCHEDULED' },
      include: { socialAccount: true },
    });
    if (!log) throw new NotFoundException('Log tidak ditemukan atau status bukan SCHEDULED');
    if (log.socialAccount.userId !== userId) throw new BadRequestException('Akses ditolak');

    await this.prisma.socialPublishLog.update({
      where: { id: logId },
      data: { status: 'CANCELLED' },
    });
    return { success: true };
  }

  // ─── Logs ──────────────────────────────────────────────────────

  async getLogs(userId: string, page: number = 1, contentId?: string) {
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = { socialAccount: { userId } };
    if (contentId) where.contentId = contentId;

    const [data, total] = await Promise.all([
      this.prisma.socialPublishLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          content: { select: { title: true, slug: true, type: true, thumbnailUrl: true } },
        },
      }),
      this.prisma.socialPublishLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Token Validation (for cron) ──────────────────────────────

  async validateAllTokens() {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { isActive: true },
    });

    for (const account of accounts) {
      const valid = await this.tokenService.validateToken(account.pageAccessToken);
      if (!valid) {
        await this.prisma.socialAccount.update({
          where: { id: account.id },
          data: { isActive: false },
        });
        this.logger.warn(`⚠️ Token invalid for ${account.pageName} — deactivated`);
      }
    }
  }

  /**
   * Process all scheduled posts that are due (for cron).
   */
  async processScheduledPosts() {
    const duePosts = await this.prisma.socialPublishLog.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
      },
      include: {
        socialAccount: true,
        content: { include: { qnaDetail: true, articleDetail: true, tags: { include: { tag: true } } } },
      },
    });

    for (const log of duePosts) {
      if (!log.socialAccount.isActive) {
        await this.prisma.socialPublishLog.update({
          where: { id: log.id },
          data: { status: 'CANCELLED', error: 'Akun sosial media sudah dinonaktifkan' },
        });
        continue;
      }
      await this.publishNow(log.socialAccount, log.content, log.platform, log.caption, log.imageUrl, log.id);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async getContentWithDetails(contentId: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId, deletedAt: null },
      include: {
        qnaDetail: true,
        articleDetail: true,
        tags: { include: { tag: true } },
        node: true,
      },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    return content;
  }

  // ─── Cron Settings ────────────────────────────────────────────

  private readonly CRON_KEYS = {
    publishEnabled: 'social_cron_publish_enabled',
    publishInterval: 'social_cron_publish_interval',
    publishLastRun: 'social_cron_publish_last_run',
    validateEnabled: 'social_cron_validate_enabled',
    validateInterval: 'social_cron_validate_interval',
    validateLastRun: 'social_cron_validate_last_run',
  };

  async getCronSettings() {
    const keys = Object.values(this.CRON_KEYS);
    const settings = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const get = (k: string) => settings.find(s => s.key === k)?.value;

    return {
      publishEnabled: get(this.CRON_KEYS.publishEnabled) !== 'false', // default true
      publishInterval: parseInt(get(this.CRON_KEYS.publishInterval) || '1', 10),
      publishLastRun: get(this.CRON_KEYS.publishLastRun) || null,
      validateEnabled: get(this.CRON_KEYS.validateEnabled) !== 'false', // default true
      validateInterval: parseInt(get(this.CRON_KEYS.validateInterval) || '24', 10),
      validateLastRun: get(this.CRON_KEYS.validateLastRun) || null,
    };
  }

  async updateCronSettings(data: {
    publishEnabled?: boolean;
    publishInterval?: number;
    validateEnabled?: boolean;
    validateInterval?: number;
  }) {
    const upsert = (key: string, value: string) =>
      this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value, group: 'social_cron' },
      });

    const ops: Promise<any>[] = [];
    if (data.publishEnabled !== undefined) ops.push(upsert(this.CRON_KEYS.publishEnabled, String(data.publishEnabled)));
    if (data.publishInterval !== undefined) ops.push(upsert(this.CRON_KEYS.publishInterval, String(data.publishInterval)));
    if (data.validateEnabled !== undefined) ops.push(upsert(this.CRON_KEYS.validateEnabled, String(data.validateEnabled)));
    if (data.validateInterval !== undefined) ops.push(upsert(this.CRON_KEYS.validateInterval, String(data.validateInterval)));

    await Promise.all(ops);
    this.logger.log(`⚙️ Social cron settings updated`);
    return { message: 'Pengaturan otomasi berhasil disimpan' };
  }

  /**
   * Check if a specific cron job should run now.
   * Returns true if enabled AND enough time has passed since last run.
   * Also updates lastRun timestamp when returning true.
   */
  async shouldCronRun(type: 'publish' | 'validate'): Promise<boolean> {
    const enabledKey = type === 'publish' ? this.CRON_KEYS.publishEnabled : this.CRON_KEYS.validateEnabled;
    const intervalKey = type === 'publish' ? this.CRON_KEYS.publishInterval : this.CRON_KEYS.validateInterval;
    const lastRunKey = type === 'publish' ? this.CRON_KEYS.publishLastRun : this.CRON_KEYS.validateLastRun;

    const [enabledSetting, intervalSetting, lastRunSetting] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: enabledKey } }),
      this.prisma.setting.findUnique({ where: { key: intervalKey } }),
      this.prisma.setting.findUnique({ where: { key: lastRunKey } }),
    ]);

    // Check enabled (default: true if no setting exists)
    if (enabledSetting?.value === 'false') return false;

    // Check interval
    const interval = parseInt(intervalSetting?.value || (type === 'publish' ? '1' : '24'), 10);
    const lastRun = lastRunSetting?.value ? new Date(lastRunSetting.value) : null;

    if (lastRun) {
      const intervalMs = type === 'publish'
        ? interval * 60 * 1000        // minutes → ms
        : interval * 60 * 60 * 1000;  // hours → ms
      const elapsed = Date.now() - lastRun.getTime();
      if (elapsed < intervalMs) return false;
    }

    // Update lastRun timestamp
    await this.prisma.setting.upsert({
      where: { key: lastRunKey },
      update: { value: new Date().toISOString() },
      create: { key: lastRunKey, value: new Date().toISOString(), group: 'social_cron' },
    });

    return true;
  }
}
