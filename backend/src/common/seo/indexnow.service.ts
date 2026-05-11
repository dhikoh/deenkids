import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * IndexNow Service — Instant URL indexing for search engines.
 * Notifies Bing, Yandex, and other IndexNow-compatible engines
 * when content is published, updated, or removed.
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

  constructor(private config: ConfigService) {
    this.host = this.config.get<string>('INDEXNOW_HOST') || 'adably.id';
    this.key = this.config.get<string>('INDEXNOW_KEY') || '';
    this.enabled = !!this.key;
    this.keyLocation = `https://${this.host}/${this.key}.txt`;

    if (!this.enabled) {
      this.logger.warn('⚠️  INDEXNOW_KEY not set — instant indexing disabled. Set INDEXNOW_KEY env var.');
    }
  }

  /**
   * Submit a single URL for instant indexing.
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
