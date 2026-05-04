import { Injectable } from '@nestjs/common';

/**
 * Builds social media captions from Adably content blocks.
 * Transforms structured content into engaging, platform-optimized captions.
 *
 * Caption structure (top to bottom):
 * 1. HOOK — title + emoji based on content type
 * 2. ISI UTAMA — body excerpt
 * 3. DALIL — quote text (without source)
 * 4. DOA — prayer text (without source)
 * 5. HIKMAH — key takeaway
 * 6. SUMBER — collected dalil/doa sources
 * 7. LINK — web URL to the full content
 * 8. HASHTAG — content tags + account default hashtags (always last)
 */
@Injectable()
export class SocialCaptionService {

  /**
   * Build a caption from content data and account defaults.
   */
  buildCaption(content: any, account: any): string {
    const sections: string[] = [];
    const sources: string[] = [];

    // 1. HOOK — based on content type
    sections.push(this.buildHook(content));

    // 2. ISI UTAMA
    const body = this.buildBody(content);
    if (body) sections.push(body);

    // 3. DALIL (quote only — source collected separately)
    const dalil = this.extractFirstBlock(content, 'dalil');
    if (dalil) {
      const entry = dalil.entries?.[0] || dalil;
      if (entry.translation) {
        sections.push(`📖 "${this.truncate(entry.translation, 150)}"`);
        if (entry.source) sources.push(entry.source);
      }
    }

    // 4. DOA (quote only — source collected separately)
    const doa = this.extractFirstBlock(content, 'doa');
    if (doa?.translation) {
      sections.push(`🤲 "${this.truncate(doa.translation, 150)}"`);
      if (doa.source) sources.push(doa.source);
    }

    // 5. HIKMAH
    const hikmah = this.extractFirstBlock(content, 'hikmah');
    if (hikmah?.text) {
      sections.push(`✨ ${this.truncate(hikmah.text, 150)}`);
    }

    // ─── FOOTER (always at the bottom) ───────────────────────

    // 6. SUMBER — collected references from dalil/doa
    if (sources.length > 0) {
      const sourceLines = sources.map(s => `• ${s}`).join('\n');
      sections.push(`📌 Sumber:\n${sourceLines}`);
    }

    // 7. LINK — web URL to the full content
    const contentUrl = this.buildContentUrl(content);
    sections.push(`🔗 ${contentUrl}`);

    // 8. HASHTAG — content tags + account default hashtags (always last)
    const contentHashtags = (content.tags || [])
      .map((t: any) => `#${(t.tag?.name || t.name || '').replace(/\s+/g, '')}`)
      .filter((h: string) => h.length > 1)
      .join(' ');
    const defaultHashtags = account?.defaultHashtags || '#adably #edukasiislami #parentingislami';
    sections.push(`${contentHashtags} ${defaultHashtags}`.trim());

    let caption = sections.join('\n\n');

    // VALIDATE — IG max 2200 chars
    if (caption.length > 2200) {
      caption = this.trimToLimit(sections, 2200);
    }

    return caption;
  }

  // ─── Hook Builder ──────────────────────────────────────────

  private buildHook(content: any): string {
    const title = content.title || '';
    switch (content.type) {
      case 'QNA': return `${title} 🤔`;
      case 'PEMBELAJARAN': return `Tahukah kamu? ${title} 📚`;
      case 'ARTICLE': return `${title} 📝`;
      case 'KISAH': return `Kisah ${title} ✨`;
      default: return title;
    }
  }

  // ─── Body Builder ──────────────────────────────────────────

  private buildBody(content: any): string {
    // QNA: use answerQuick
    if (content.type === 'QNA' && content.qnaDetail?.answerQuick) {
      return this.truncate(content.qnaDetail.answerQuick, 300);
    }

    // KISAH: use description or first paragraph with narrative teaser
    if (content.type === 'KISAH') {
      if (content.description) {
        return this.truncate(content.description, 300);
      }
      const blocks = this.getAllBlocks(content);
      const firstParagraph = blocks.find((b: any) => b.type === 'paragraph');
      if (firstParagraph?.text) {
        return this.truncate(firstParagraph.text, 250) + '...';
      }
      return '';
    }

    // Description
    if (content.description) {
      return this.truncate(content.description, 300);
    }

    // Fallback: first paragraph block
    const blocks = this.getAllBlocks(content);
    const firstParagraph = blocks.find((b: any) => b.type === 'paragraph');
    if (firstParagraph?.text) {
      return this.truncate(firstParagraph.text, 200) + '...';
    }

    return '';
  }

  // ─── URL Builder ───────────────────────────────────────────

  /**
   * Build the correct web URL based on content type.
   * - QNA → adably.id/qna/{slug}
   * - KISAH → adably.id/kisah/{nodeSlug}/{slug}
   * - ARTICLE / PEMBELAJARAN → adably.id/artikel/{slug}
   */
  private buildContentUrl(content: any): string {
    const baseUrl = 'adably.id';
    switch (content.type) {
      case 'QNA':
        return `${baseUrl}/qna/${content.slug}`;
      case 'KISAH': {
        const nodeSlug = content.node?.slug || 'kisah';
        return `${baseUrl}/kisah/${nodeSlug}/${content.slug}`;
      }
      default:
        return `${baseUrl}/artikel/${content.slug}`;
    }
  }

  // ─── Block Extractors ──────────────────────────────────────

  private extractFirstBlock(content: any, blockType: string): any {
    const blocks = this.getAllBlocks(content);
    return blocks.find((b: any) => b.type === blockType) || null;
  }

  private getAllBlocks(content: any): any[] {
    // Unified blocks from articleDetail or qnaDetail
    const articleBlocks = content.articleDetail?.blocks;
    const qnaBlocks = content.qnaDetail?.blocks;
    const blocks = articleBlocks || qnaBlocks || [];
    if (!Array.isArray(blocks)) return [];
    return blocks;
  }

  // ─── Text Utilities ────────────────────────────────────────

  private truncate(text: string, maxLen: number): string {
    if (!text) return '';
    const clean = text.replace(/\n+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.substring(0, maxLen - 3) + '...';
  }

  /**
   * Trim caption to fit IG 2200 char limit by removing optional sections.
   * Priority: keep hook, link, hashtag — remove hikmah, doa, dalil, body as needed.
   */
  private trimToLimit(sections: string[], limit: number): string {
    // Clone sections to avoid mutating the original
    let remaining = [...sections];

    // Sections to try removing (indices from top): hikmah(4), doa(3), dalil(2), body(1)
    // But indices shift as we remove — so remove from highest index first
    // Fixed sections: hook(0), sumber(len-3), link(len-2), hashtag(len-1)
    const removableCount = remaining.length - 4; // everything except hook + 3 footer items
    for (let i = removableCount; i >= 1; i--) {
      if (remaining.join('\n\n').length <= limit) break;
      if (i < remaining.length - 3) { // Don't remove footer items (last 3)
        remaining.splice(i, 1);
      }
    }

    let result = remaining.join('\n\n');
    if (result.length > limit) {
      result = result.substring(0, limit - 3) + '...';
    }
    return result;
  }
}
