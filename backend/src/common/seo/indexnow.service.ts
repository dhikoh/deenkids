import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * IndexNow Service — Instant URL indexing for search engines.
 * Notifies Bing, Yandex, and other IndexNow-compatible engines
 * when content is published, updated, or removed.
 *
 * Also handles sitemap ping to Google and Bing for faster discovery.
 *
 * This is 100% white-hat SEO — officially supported by Microsoft and Yandex.
 * Fire-and-forget: failures are logged but never block the main flow.
 */
@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);
  private readonly enabled: boolean;
  private readonly host: string;
  private readonly key: string;
  private readonly keyLocation: string;
  private readonly sitemapUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.host = this.config.get<string>('INDEXNOW_HOST') || 'adably.id';
    this.key = this.config.get<string>('INDEXNOW_KEY') || '';
    this.enabled = !!this.key;
    this.keyLocation = `https://${this.host}/${this.key}.txt`;
    this.sitemapUrl = `https://${this.host}/sitemap.xml`;

    if (!this.enabled) {
      this.logger.warn('⚠️  INDEXNOW_KEY not set — instant indexing disabled. Set INDEXNOW_KEY env var.');
    }
  }

  /**
   * Submit a single URL for instant indexing.
   * Also pings sitemap to Google/Bing for faster discovery.
   * Non-blocking — errors are caught and logged.
   */
  async submitUrl(path: string): Promise<void> {
    if (!this.enabled) return;
    const url = `https://${this.host}${path}`;
    try {
      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: this.host,
          key: this.key,
          keyLocation: this.keyLocation,
          urlList: [url],
        }),
      });
      if (response.ok || response.status === 202) {
        this.logger.log(`🔍 IndexNow: submitted ${url} (${response.status})`);
      } else {
        this.logger.warn(`⚠️  IndexNow: ${url} returned ${response.status}`);
      }
    } catch (err) {
      this.logger.warn(`⚠️  IndexNow failed for ${url}: ${err.message}`);
    }

    // Auto-ping sitemap after each publish (fire-and-forget)
    this.pingSitemap().catch(() => {});
  }

  /**
   * Submit multiple URLs in a single batch (max 10,000 per batch).
   */
  async submitUrls(paths: string[]): Promise<void> {
    if (!this.enabled || paths.length === 0) return;
    const urlList = paths.map(p => `https://${this.host}${p}`);
    try {
      const response = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: this.host,
          key: this.key,
          keyLocation: this.keyLocation,
          urlList,
        }),
      });
      this.logger.log(`🔍 IndexNow batch: ${paths.length} URLs submitted (${response.status})`);
    } catch (err) {
      this.logger.warn(`⚠️  IndexNow batch failed: ${err.message}`);
    }
  }

  /**
   * Ping Google and Bing that our sitemap has been updated.
   * This triggers faster crawling and re-indexing.
   */
  async pingSitemap(): Promise<{ google: number | null; bing: number | null }> {
    const results: { google: number | null; bing: number | null } = { google: null, bing: null };

    // Google Sitemap Ping
    try {
      const gRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(this.sitemapUrl)}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      results.google = gRes.status;
      this.logger.log(`🌐 Google sitemap ping: ${gRes.status}`);
    } catch (err) {
      this.logger.warn(`⚠️  Google sitemap ping failed: ${err.message}`);
    }

    // Bing Sitemap Ping (IndexNow-compatible engines)
    try {
      const bRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(this.sitemapUrl)}`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      results.bing = bRes.status;
      this.logger.log(`🌐 Bing sitemap ping: ${bRes.status}`);
    } catch (err) {
      this.logger.warn(`⚠️  Bing sitemap ping failed: ${err.message}`);
    }

    return results;
  }

  /**
   * Bulk submit ALL published content URLs to IndexNow.
   * Use for one-time burst when setting up GEO for the first time.
   * Returns count of submitted URLs.
   */
  async submitAllPublishedContent(): Promise<{ submitted: number; paths: string[] }> {
    const contents = await this.prisma.contentItem.findMany({
      where: { status: 'PUBLISHED' },
      select: { type: true, slug: true, node: { select: { slug: true } } },
    });

    if (contents.length === 0) {
      this.logger.warn('No published content found to submit.');
      return { submitted: 0, paths: [] };
    }

    // Build all URL paths
    const paths: string[] = [
      '/',            // homepage
      '/qna',         // QNA listing
      '/artikel',     // Artikel listing
      '/kisah',       // Kisah listing
      '/pembelajaran', // Pembelajaran listing
    ];

    for (const content of contents) {
      paths.push(this.buildContentPath(content));
    }

    // Submit in batches of 500 (IndexNow allows up to 10,000)
    const batchSize = 500;
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      await this.submitUrls(batch);
      // Small delay between batches to be polite
      if (i + batchSize < paths.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Also ping sitemap
    await this.pingSitemap();

    this.logger.log(`🚀 Bulk submit complete: ${paths.length} URLs submitted to IndexNow`);
    return { submitted: paths.length, paths };
  }

  /**
   * Build the public URL path for a content item (used by caller).
   */
  buildContentPath(content: { type: string; slug: string; node?: { slug?: string } | null }): string {
    switch (content.type) {
      case 'QNA': return `/qna/${content.slug}`;
      case 'ARTICLE': return `/artikel/${content.slug}`;
      case 'KISAH': return `/kisah/${content.node?.slug || 'uncategorized'}/${content.slug}`;
      case 'PEMBELAJARAN': return `/pembelajaran/${content.slug}`;
      default: return `/${content.slug}`;
    }
  }
}
