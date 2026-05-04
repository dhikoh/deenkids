import { Injectable } from '@nestjs/common';

/**
 * Builds social media captions from Adably content blocks.
 * Transforms structured content into engaging, platform-optimized captions.
 *
 * Caption structure (top to bottom):
 * 1. HOOK — title + emoji based on content type
 * 2. BODY — answerQuick (QNA) or description
 * 3. ALL BLOCKS — in editor order, skip only: dialog, quick_answer
 * 4. SUMBER — collected dalil/doa sources
 * 5. LINK — web URL to the full content
 * 6. HASHTAG — content tags + account default hashtags (always last)
 */
@Injectable()
export class SocialCaptionService {

  /**
   * Build a caption from content data and account defaults.
   * Iterates ALL blocks in order, skipping only dialog (not suitable for social media).
   */
  buildCaption(content: any, account: any): string {
    const sections: string[] = [];
    const sources: string[] = [];

    // 1. HOOK — based on content type
    sections.push(this.buildHook(content));

    // 2. BODY — main excerpt
    const body = this.buildBody(content);
    if (body) sections.push(body);

    // 3. ALL BLOCKS — iterate in editor order, skip dialog & quick_answer
    const blocks = this.getAllBlocks(content);
    for (const block of blocks) {
      const rendered = this.renderBlock(block, sources);
      if (rendered) sections.push(rendered);
    }

    // ─── FOOTER (always at the bottom, fixed order) ─────────

    // Mark where footer starts (so trimToLimit knows what to protect)
    const footerStartIndex = sections.length;

    // 4. SUMBER — collected references from dalil/doa
    if (sources.length > 0) {
      const sourceLines = sources.map(s => `• ${s}`).join('\n');
      sections.push(`📌 Sumber:\n${sourceLines}`);
    }

    // 5. LINK — web URL to the full content
    const contentUrl = this.buildContentUrl(content);
    sections.push(`🔗 ${contentUrl}`);

    // 6. HASHTAG — content tags converted to hashtags + account default hashtags (ALWAYS LAST)
    const contentHashtags = (content.tags || [])
      .map((t: any) => `#${(t.tag?.name || t.name || '').replace(/\s+/g, '')}`)
      .filter((h: string) => h.length > 1)
      .join(' ');
    const defaultHashtags = account?.defaultHashtags || '#adably #edukasiislami #parentingislami';
    sections.push(`${contentHashtags} ${defaultHashtags}`.trim());

    let caption = sections.join('\n\n');

    // VALIDATE — IG max 2200 chars
    if (caption.length > 2200) {
      const footerCount = sections.length - footerStartIndex;
      caption = this.trimToLimit(sections, 2200, footerCount);
    }

    return caption;
  }

  // ─── Block Renderer ────────────────────────────────────────

  /**
   * Render a single block to caption text.
   * Returns null for blocks that should be skipped.
   * Collects dalil/doa sources into the sources array for the footer.
   */
  private renderBlock(block: any, sources: string[]): string | null {
    switch (block.type) {
      // SKIP — dialog not suitable for social media captions
      case 'dialog':
        return null;

      // SKIP — quick_answer already handled in body section
      case 'quick_answer':
        return null;

      // Paragraph — full text content
      case 'paragraph':
        if (block.text) return this.cleanText(block.text);
        return null;

      // Dalil — full quote (source collected to footer)
      case 'dalil': {
        const entries = block.entries || [block];
        const parts: string[] = [];
        for (const entry of entries) {
          if (entry.translation) {
            parts.push(`📖 "${this.cleanText(entry.translation)}"`);
            if (entry.source) sources.push(entry.source);
          }
        }
        return parts.length > 0 ? parts.join('\n') : null;
      }

      // Doa — full prayer quote (source collected to footer)
      case 'doa':
        if (block.translation) {
          const doaText = `🤲 "${this.cleanText(block.translation)}"`;
          if (block.source) sources.push(block.source);
          return doaText;
        }
        return null;

      // Hikmah — full key takeaway
      case 'hikmah':
        if (block.text) return `✨ ${this.cleanText(block.text)}`;
        return null;

      // Analogy — full comparison text
      case 'analogy': {
        if (!block.text) return null;
        const title = block.title ? `${block.title}: ` : '';
        return `🧩 ${title}${this.cleanText(block.text)}`;
      }

      // Tip — full practical advice
      case 'tip':
        if (block.text) return `ℹ️ ${this.cleanText(block.text)}`;
        return null;

      // Image — include caption text only (not URL)
      case 'image':
        if (block.caption) return block.caption;
        return null;

      // Video — include caption text only (not URL)
      case 'video':
        if (block.caption) return block.caption;
        return null;

      default:
        return null;
    }
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
    // QNA: use answerQuick as primary body (full text)
    if (content.type === 'QNA' && content.qnaDetail?.answerQuick) {
      return this.cleanText(content.qnaDetail.answerQuick);
    }

    // All types: use description if available (full text)
    if (content.description) {
      return this.cleanText(content.description);
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

  private getAllBlocks(content: any): any[] {
    // Unified blocks from articleDetail or qnaDetail
    const articleBlocks = content.articleDetail?.blocks;
    const qnaBlocks = content.qnaDetail?.blocks;
    const blocks = articleBlocks || qnaBlocks || [];
    if (!Array.isArray(blocks)) return [];
    return blocks;
  }

  // ─── Text Utilities ────────────────────────────────────────

  /**
   * Clean text — remove excessive newlines, trim whitespace.
   * No character limit — text is shown in full.
   */
  private cleanText(text: string): string {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Trim caption to fit IG 2200 char limit by removing content blocks from bottom up.
   * Footer items (sumber/link/hashtag) are always preserved.
   * @param footerCount — dynamic count of footer items (2 if no sources, 3 if sources exist)
   */
  private trimToLimit(sections: string[], limit: number, footerCount: number): string {
    let remaining = [...sections];

    // Remove content blocks from bottom up, but never remove:
    // - index 0 (hook)
    // - last N items (footer: sumber/link/hashtag)
    while (remaining.join('\n\n').length > limit && remaining.length > footerCount + 1) {
      // Remove the last content block (just before footer)
      const removeIdx = remaining.length - footerCount - 1;
      if (removeIdx <= 0) break; // Keep at least the hook
      remaining.splice(removeIdx, 1);
    }

    let result = remaining.join('\n\n');
    if (result.length > limit) {
      result = result.substring(0, limit - 3) + '...';
    }
    return result;
  }
}
