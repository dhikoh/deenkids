import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialTokenService } from './social-token.service';
import { PublishSocialDto } from './dto/social.dto';
import { VideoGeneratorService } from './video-generator.service';
import { YouTubeTokenService } from './youtube-token.service';
import { YouTubeUploadService } from './youtube-upload.service';
import { TikTokTokenService } from './tiktok-token.service';
import { TikTokUploadService } from './tiktok-upload.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: SocialTokenService,
    private readonly videoGenerator: VideoGeneratorService,
    private readonly ytTokenService: YouTubeTokenService,
    private readonly ytUploadService: YouTubeUploadService,
    private readonly ttTokenService: TikTokTokenService,
    private readonly ttUploadService: TikTokUploadService,
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

  /**
   * Connect a YouTube channel via Google OAuth.
   */
  async connectYouTube(userId: string, code: string) {
    const { accessToken, refreshToken } = await this.ytTokenService.exchangeCodeForTokens(code);
    const channel = await this.ytTokenService.fetchChannelInfo(accessToken);
    const encryptedToken = this.ytTokenService.encryptToken(refreshToken);

    const account = await this.prisma.socialAccount.upsert({
      where: { ytChannelId: channel.channelId },
      update: {
        userId,
        pageName: channel.channelTitle,
        pageAccessToken: encryptedToken,
        ytChannelTitle: channel.channelTitle,
        profilePictureUrl: channel.thumbnailUrl,
        isActive: true,
      },
      create: {
        userId,
        platform: 'YOUTUBE',
        pageName: channel.channelTitle,
        pageAccessToken: encryptedToken,
        ytChannelId: channel.channelId,
        ytChannelTitle: channel.channelTitle,
        profilePictureUrl: channel.thumbnailUrl,
      },
    });

    this.logger.log(`✅ YouTube channel connected: ${channel.channelTitle} (${channel.channelId})`);
    return account;
  }

  async connectTikTok(userId: string, code: string) {
    const tokens = await this.ttTokenService.exchangeCodeForTokens(code);
    const userInfo = await this.ttTokenService.getUserInfo(tokens.accessToken);

    const account = await this.prisma.socialAccount.upsert({
      where: { tiktokOpenId: tokens.openId },
      update: {
        userId,
        pageName: userInfo.displayName,
        pageAccessToken: tokens.refreshToken,
        tiktokUsername: userInfo.displayName,
        profilePictureUrl: userInfo.avatarUrl,
        isActive: true,
      },
      create: {
        userId,
        platform: 'TIKTOK',
        pageName: userInfo.displayName,
        pageAccessToken: tokens.refreshToken,
        tiktokOpenId: tokens.openId,
        tiktokUsername: userInfo.displayName,
        profilePictureUrl: userInfo.avatarUrl,
      },
    });

    this.logger.log(`✅ TikTok connected: ${userInfo.displayName} (${tokens.openId})`);
    return account;
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

  // ─── Stats ─────────────────────────────────────────────────────

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [allLogs, monthlyLogs, recentLogs] = await Promise.all([
      this.prisma.socialPublishLog.groupBy({
        by: ['platform', 'status'],
        _count: { id: true },
      }),
      this.prisma.socialPublishLog.groupBy({
        by: ['platform', 'status'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      this.prisma.socialPublishLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { content: { select: { title: true, type: true } } },
      }),
    ]);

    // Aggregate all-time stats
    let totalAll = 0, totalSuccess = 0;
    const platformBreakdown: Record<string, { total: number; success: number; failed: number; scheduled: number }> = {};

    for (const row of allLogs) {
      const count = row._count.id;
      totalAll += count;
      if (row.status === 'PUBLISHED') totalSuccess += count;

      if (!platformBreakdown[row.platform]) {
        platformBreakdown[row.platform] = { total: 0, success: 0, failed: 0, scheduled: 0 };
      }
      platformBreakdown[row.platform].total += count;
      if (row.status === 'PUBLISHED') platformBreakdown[row.platform].success += count;
      else if (row.status === 'FAILED') platformBreakdown[row.platform].failed += count;
      else if (row.status === 'SCHEDULED') platformBreakdown[row.platform].scheduled += count;
    }

    // Monthly totals
    let monthlyTotal = 0, monthlySuccess = 0;
    for (const row of monthlyLogs) {
      monthlyTotal += row._count.id;
      if (row.status === 'PUBLISHED') monthlySuccess += row._count.id;
    }

    return {
      totalPublish: totalAll,
      totalSuccess,
      successRate: totalAll > 0 ? Math.round((totalSuccess / totalAll) * 100) : 0,
      monthlyPublish: monthlyTotal,
      monthlySuccess,
      platformBreakdown,
      recentActivity: recentLogs.map(l => ({
        id: l.id,
        platform: l.platform,
        status: l.status,
        contentTitle: l.content?.title || '—',
        contentType: l.content?.type || '—',
        publishedAt: l.publishedAt,
        createdAt: l.createdAt,
        error: l.error,
      })),
    };
  }

  // ─── Caption Generation ────────────────────────────────────────

  async generateCaption(contentId: string, userId: string) {
    const content = await this.getContentWithDetails(contentId);
    const account = await this.prisma.socialAccount.findFirst({
      where: { userId, isActive: true },
    });

    const tagCount = content.tags?.length || 0;
    const hasDescription = !!(content.description && content.description.trim().length > 0);

    return {
      caption: this.buildSimpleCaption(content, account),
      imageUrl: content.socialThumbnailUrl || content.thumbnailUrl || null,
      hasAudio: !!(content.enableAudio && content.audioUrl),
      hasDescription,
      tagCount,
      contentTitle: content.title || '',
    };
  }

  /**
   * Build a simple caption: Title + Description + Link + Hashtags
   * Used for ALL social media platforms (IG, FB, YouTube, TikTok)
   */
  private buildSimpleCaption(content: any, account: any): string {
    const sections: string[] = [];

    // 1. HOOK — title with emoji
    const emojiMap: Record<string, string> = { QNA: '🤔', PEMBELAJARAN: '📚', ARTICLE: '📝', KISAH: '✨' };
    const emoji = emojiMap[content.type] || '';
    sections.push(`${content.title} ${emoji}`.trim());

    // 2. DESKRIPSI SINGKAT — content.description only
    if (content.description && content.description.trim()) {
      sections.push(content.description.trim());
    }

    // 3. LINK
    const contentUrl = this.buildContentUrl(content);
    sections.push(`🔗 ${contentUrl}`);

    // 4. HASHTAG
    const contentHashtags = (content.tags || [])
      .map((t: any) => `#${(t.tag?.name || t.name || '').replace(/\s+/g, '')}`)
      .filter((h: string) => h.length > 1)
      .join(' ');
    const defaultHashtags = account?.defaultHashtags || '#adably #edukasiislami #parentingislami';
    sections.push(`${contentHashtags} ${defaultHashtags}`.trim());

    return sections.join('\n\n');
  }

  /** Build content URL based on type */
  private buildContentUrl(content: any): string {
    const baseUrl = 'https://adably.id';
    switch (content.type) {
      case 'QNA': return `${baseUrl}/qna/${content.slug}`;
      case 'KISAH': return `${baseUrl}/kisah/${content.node?.slug || 'kisah'}/${content.slug}`;
      default: return `${baseUrl}/artikel/${content.slug}`;
    }
  }

  // ─── Publishing ────────────────────────────────────────────────

  async handlePublish(userId: string, dto: PublishSocialDto) {
    const content = await this.getContentWithDetails(dto.contentId);
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    const imageUrl = content.socialThumbnailUrl || content.thumbnailUrl;
    if (!imageUrl) {
      throw new BadRequestException('Konten harus memiliki thumbnail untuk di-publish ke sosial media.');
    }

    const results: any[] = [];

    // Determine if we can publish as video (has audio)
    const hasAudio = !!(content.enableAudio && content.audioUrl);

    // Generate videos if audio is available (separate aspect ratios)
    let socialVideoUrl: string | null = null; // 9:16 for IG/FB
    let ytVideoUrl: string | null = null;     // 16:9 for YouTube

    if (hasAudio) {
      const hasSocialPlatforms = dto.platforms.some(p => ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'].includes(p));
      const hasYouTube = dto.platforms.includes('YOUTUBE');

      try {
        if (hasSocialPlatforms) {
          // Prefer storyboard video (multi-image with transitions) over static image+audio
          if (content.storyboardMp4Url) {
            socialVideoUrl = content.storyboardMp4Url;
            this.logger.log(`🎬 Using storyboard video for social: ${socialVideoUrl}`);
          } else {
            // Fallback: generate static image + audio video
            const socialThumb = content.socialThumbnailUrl || content.thumbnailUrl;
            if (socialThumb) {
              socialVideoUrl = await this.videoGenerator.generateVideo(socialThumb, content.audioUrl!, content.slug || content.id, '9:16');
              this.logger.log(`🎬 Social video (9:16) generated: ${socialVideoUrl}`);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`⚠️ Social video generation failed: ${err.message}`);
      }

      try {
        if (hasYouTube) {
          // Prefer storyboard video for YouTube too
          if (content.storyboardMp4Url) {
            ytVideoUrl = content.storyboardMp4Url;
            this.logger.log(`🎬 Using storyboard video for YouTube: ${ytVideoUrl}`);
          } else {
            const ytThumb = content.thumbnailUrl;
            if (ytThumb) {
              ytVideoUrl = await this.videoGenerator.generateVideo(ytThumb, content.audioUrl!, `${content.slug || content.id}_yt`, '16:9');
              this.logger.log(`🎬 YouTube video (16:9) generated: ${ytVideoUrl}`);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`⚠️ YouTube video generation failed: ${err.message}`);
      }
    }

    for (const platform of dto.platforms) {
      if (!['INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK'].includes(platform)) continue;

      // Find appropriate account for this platform
      const platformType = platform === 'YOUTUBE' ? 'YOUTUBE' : platform === 'TIKTOK' ? 'TIKTOK' : 'META';
      const account = await this.prisma.socialAccount.findFirst({
        where: { userId, platform: platformType, isActive: true },
      });
      if (!account) {
        results.push({ platform, status: 'FAILED', error: `Akun ${platform} belum terhubung` });
        continue;
      }

      // Determine media for this platform
      const isYouTube = platform === 'YOUTUBE';
      const isTikTok = platform === 'TIKTOK';
      const mediaUrl = isYouTube ? (ytVideoUrl || imageUrl) : (socialVideoUrl || imageUrl);
      const isVideo = isYouTube ? !!ytVideoUrl : !!socialVideoUrl;

      if (isTikTok) {
        // TikTok uses dedicated upload path (video only, 9:16)
        if (!socialVideoUrl) {
          results.push({ platform: 'TIKTOK', status: 'FAILED', error: 'Konten harus memiliki audio untuk publish ke TikTok' });
          continue;
        }
        try {
          const refreshed = await this.ttTokenService.refreshAccessToken(account.pageAccessToken);
          // Update stored refresh token
          await this.prisma.socialAccount.update({ where: { id: account.id }, data: { pageAccessToken: refreshed.refreshToken } });

          const ttResult = await this.ttUploadService.uploadVideo(
            refreshed.accessToken,
            socialVideoUrl,
            dto.caption.substring(0, 150),
          );

          await this.prisma.socialPublishLog.create({
            data: {
              contentId: content.id,
              socialAccountId: account.id,
              platform: 'TIKTOK',
              caption: dto.caption,
              imageUrl: socialVideoUrl,
              status: 'PUBLISHED',
              postId: ttResult.publishId,
              publishedAt: new Date(),
            },
          });

          results.push({ platform: 'TIKTOK', status: 'PUBLISHED', postId: ttResult.publishId, isVideo: true });
        } catch (err) {
          const errorMsg = err.message || 'TikTok upload gagal';
          await this.prisma.socialPublishLog.create({
            data: {
              contentId: content.id,
              socialAccountId: account.id,
              platform: 'TIKTOK',
              caption: dto.caption,
              imageUrl: socialVideoUrl,
              status: 'FAILED',
              error: errorMsg,
            },
          });
          results.push({ platform: 'TIKTOK', status: 'FAILED', error: errorMsg, isVideo: true });
          this.logger.error(`❌ TikTok publish failed: ${errorMsg}`);
        }
      } else if (isYouTube) {
        // YouTube uses dedicated upload path
        if (!ytVideoUrl) {
          results.push({ platform: 'YOUTUBE', status: 'FAILED', error: 'Konten harus memiliki audio untuk publish ke YouTube' });
          continue;
        }
        try {
          const tags = content.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [];
          // YouTube description: deskripsi singkat + link + hashtag (tanpa judul — sudah di title)
          const ytDescription = [
            content.description || content.title,
            '',
            `🔗 Selengkapnya: ${this.buildContentUrl(content)}`,
            '',
            tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ') + ' #adably #edukasiislami',
          ].join('\n');
          const ytResult = await this.ytUploadService.uploadVideo(
            account.pageAccessToken, // encrypted refresh token
            ytVideoUrl,
            content.title,
            ytDescription,
            tags,
          );

          await this.prisma.socialPublishLog.create({
            data: {
              contentId: content.id,
              socialAccountId: account.id,
              platform: 'YOUTUBE',
              caption: ytDescription,
              imageUrl: ytVideoUrl,
              status: 'PUBLISHED',
              postId: ytResult.videoId,
              postUrl: ytResult.videoUrl,
              publishedAt: new Date(),
            },
          });

          results.push({ platform: 'YOUTUBE', status: 'PUBLISHED', postUrl: ytResult.videoUrl, postId: ytResult.videoId, isVideo: true });
        } catch (err) {
          const errorMsg = err.message || 'YouTube upload gagal';
          await this.prisma.socialPublishLog.create({
            data: {
              contentId: content.id,
              socialAccountId: account.id,
              platform: 'YOUTUBE',
              caption: dto.caption,
              imageUrl: ytVideoUrl,
              status: 'FAILED',
              error: errorMsg,
            },
          });
          results.push({ platform: 'YOUTUBE', status: 'FAILED', error: errorMsg, isVideo: true });
          this.logger.error(`❌ YouTube publish failed: ${errorMsg}`);
        }
      } else {
        // Meta platforms (IG/FB)
        if (dto.mode === 'SCHEDULED') {
          if (!dto.scheduledAt) throw new BadRequestException('Tanggal jadwal wajib diisi untuk mode SCHEDULED');
          const log = await this.prisma.socialPublishLog.create({
            data: {
              contentId: dto.contentId,
              socialAccountId: account.id,
              platform,
              caption: dto.caption,
              imageUrl: mediaUrl,
              status: 'SCHEDULED',
              scheduledAt: new Date(dto.scheduledAt),
            },
          });
          results.push({ platform, status: 'SCHEDULED', logId: log.id, scheduledAt: dto.scheduledAt, isVideo });
        } else {
          const result = await this.publishNow(account, content, platform, dto.caption, mediaUrl, isVideo);
          results.push(result);
        }
      }
    }

    return { success: true, results };
  }

  /**
   * Actually publish to a platform (used by both immediate & cron-scheduled).
   */
  async publishNow(account: any, content: any, platform: string, caption: string, mediaUrl: string, isVideo: boolean = false, logId?: string) {
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
            imageUrl: mediaUrl,
            status: 'PUBLISHING',
          },
        });

    try {
      let postId: string | null = null;
      let postUrl: string | null = null;

      if (platform === 'INSTAGRAM') {
        const result = isVideo
          ? await this.publishVideoToInstagram(account.igAccountId, pageToken, mediaUrl, caption)
          : await this.publishToInstagram(account.igAccountId, pageToken, mediaUrl, caption);
        postId = result.postId;
        postUrl = result.postUrl;
      } else if (platform === 'FACEBOOK') {
        const result = isVideo
          ? await this.publishVideoToFacebook(account.pageId, pageToken, mediaUrl, caption)
          : await this.publishToFacebook(account.pageId, pageToken, mediaUrl, caption);
        postId = result.postId;
        postUrl = result.postUrl;
      }

      // Update log with success
      await this.prisma.socialPublishLog.update({
        where: { id: log.id },
        data: { status: 'PUBLISHED', postId, postUrl, publishedAt: new Date(), error: null },
      });

      this.logger.log(`📱 Published ${isVideo ? 'video' : 'image'} to ${platform}: ${postUrl}`);
      return { platform, status: 'PUBLISHED', postUrl, postId, logId: log.id, isVideo };
    } catch (err) {
      const errorMsg = err.message || 'Unknown error';
      await this.prisma.socialPublishLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: errorMsg, retryCount: { increment: 1 } },
      });
      this.logger.error(`❌ Publish to ${platform} failed: ${errorMsg}`);
      return { platform, status: 'FAILED', error: errorMsg, logId: log.id, isVideo };
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

    // Step 2: Wait for container to be ready (IG needs time to process the image)
    const containerId = containerData.id;
    await this.waitForContainerReady(containerId, pageToken);

    // Step 3: Publish container
    const publishUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageToken,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(`IG publish: ${publishData.error.message}`);
    }

    // Step 4: Get permalink
    const permalinkUrl = `https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${pageToken}`;
    const permalinkRes = await fetch(permalinkUrl);
    const permalinkData = await permalinkRes.json();

    return {
      postId: publishData.id,
      postUrl: permalinkData.permalink || `https://www.instagram.com/`,
    };
  }

  /**
   * Poll IG container status until it's FINISHED or timeout.
   * Instagram takes 5-30s to process uploaded images before they can be published.
   */
  private async waitForContainerReady(containerId: string, pageToken: string, maxWaitMs = 30000): Promise<void> {
    const pollInterval = 2000; // 2 seconds between checks
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${pageToken}`;
      const res = await fetch(statusUrl);
      const data = await res.json();

      if (data.status_code === 'FINISHED') {
        this.logger.log(`📸 IG container ${containerId} ready`);
        return;
      }

      if (data.status_code === 'ERROR') {
        throw new Error(`IG container processing failed: ${data.status || 'unknown error'}`);
      }

      // IN_PROGRESS — wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout — try publish anyway (sometimes status_code isn't returned but container is ready)
    this.logger.warn(`⚠️ IG container ${containerId} — timeout waiting for FINISHED status, attempting publish anyway`);
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

    // Facebook Photos API returns: { id: "photoId", post_id: "pageId_photoId" }
    const photoId = data.id;
    const postId = data.post_id || `${pageId}_${photoId}`;

    // Try to get permalink via Graph API (use post_id for feed posts)
    let postUrl = `https://www.facebook.com/${pageId}/posts/${photoId}`;
    try {
      const linkRes = await fetch(`https://graph.facebook.com/v19.0/${postId}?fields=permalink_url&access_token=${pageToken}`);
      const linkData = await linkRes.json();
      if (linkData.permalink_url) {
        postUrl = linkData.permalink_url;
      }
    } catch {
      this.logger.warn(`⚠️ Could not fetch FB permalink for ${postId}, using fallback`);
    }

    this.logger.log(`📘 FB photo published: postId=${postId}, url=${postUrl}`);
    return { postId, postUrl };
  }

  // ─── Video Publishing (Instagram Reels) ────────────────────────

  private async publishVideoToInstagram(igAccountId: string, pageToken: string, videoUrl: string, caption: string) {
    // Step 1: Create video container (Reels)
    const containerUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        caption,
        media_type: 'REELS',
        access_token: pageToken,
      }),
    });
    const containerData = await containerRes.json();
    if (containerData.error) {
      throw new Error(`IG video container: ${containerData.error.message}`);
    }

    // Step 2: Wait for video processing (videos take longer than images)
    const containerId = containerData.id;
    await this.waitForContainerReady(containerId, pageToken, 120000); // 2 min for video

    // Step 3: Publish container
    const publishUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageToken,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) {
      throw new Error(`IG video publish: ${publishData.error.message}`);
    }

    // Step 4: Get permalink
    const permalinkUrl = `https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${pageToken}`;
    const permalinkRes = await fetch(permalinkUrl);
    const permalinkData = await permalinkRes.json();

    return {
      postId: publishData.id,
      postUrl: permalinkData.permalink || `https://www.instagram.com/`,
    };
  }

  // ─── Video Publishing (Facebook) ───────────────────────────────

  private async publishVideoToFacebook(pageId: string, pageToken: string, videoUrl: string, caption: string) {
    const url = `https://graph.facebook.com/v19.0/${pageId}/videos`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: videoUrl,
        description: caption,
        access_token: pageToken,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`FB video publish: ${data.error.message}`);
    }

    const videoId = data.id;

    // Try to get permalink via Graph API
    let postUrl = `https://www.facebook.com/${pageId}/videos/${videoId}`;
    try {
      const linkRes = await fetch(`https://graph.facebook.com/v19.0/${videoId}?fields=permalink_url&access_token=${pageToken}`);
      const linkData = await linkRes.json();
      if (linkData.permalink_url) {
        postUrl = linkData.permalink_url;
      }
    } catch {
      this.logger.warn(`⚠️ Could not fetch FB video permalink for ${videoId}, using fallback`);
    }

    this.logger.log(`📘 FB video published: videoId=${videoId}, url=${postUrl}`);
    return { postId: videoId, postUrl };
  }

  // ─── Retry & Cancel ────────────────────────────────────────────

  async retryPublish(logId: string, userId: string) {
    const log = await this.prisma.socialPublishLog.findFirst({
      where: { id: logId, status: 'FAILED' },
      include: { socialAccount: true, content: { include: { qnaDetail: true, articleDetail: true, tags: { include: { tag: true } } } } },
    });
    if (!log) throw new NotFoundException('Log tidak ditemukan atau status bukan FAILED');
    if (log.socialAccount.userId !== userId) throw new BadRequestException('Akses ditolak');

    return this.publishNow(log.socialAccount, log.content, log.platform, log.caption, log.imageUrl, false, log.id);
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
      await this.publishNow(log.socialAccount, log.content, log.platform, log.caption, log.imageUrl, false, log.id);
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
      publishEnabled: get(this.CRON_KEYS.publishEnabled) === 'true', // default false — SuperAdmin must enable
      publishInterval: parseInt(get(this.CRON_KEYS.publishInterval) || '1', 10),
      publishLastRun: get(this.CRON_KEYS.publishLastRun) || null,
      validateEnabled: get(this.CRON_KEYS.validateEnabled) === 'true', // default false — SuperAdmin must enable
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

    // Check enabled (default: OFF — must be explicitly enabled by SuperAdmin)
    if (enabledSetting?.value !== 'true') return false;

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
