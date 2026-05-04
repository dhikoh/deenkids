import { Injectable } from '@nestjs/common';

/**
 * Builds social media captions from Adably content blocks.
 * Transforms structured content into engaging, platform-optimized captions.
 */
@Injectable()
export class SocialCaptionService {

  /**
   * Build a caption from content data and account defaults.
   */
  buildCaption(content: any, account: any): string {
    const parts: string[] = [];

    // 1. HOOK — based on content type
    parts.push(this.buildHook(content));

    // 2. ISI UTAMA
    const body = this.buildBody(content);
    if (body) parts.push(body);

    // 3. DALIL (first one only)
    const dalil = this.extractFirstBlock(content, 'dalil');
    if (dalil) {
      const entry = dalil.entries?.[0] || dalil;
      if (entry.translation && entry.source) {
        parts.push(`📖 "${this.truncate(entry.translation, 150)}"\n— ${entry.source}`);
      }
    }

    // 4. DOA (first one only)
    const doa = this.extractFirstBlock(content, 'doa');
    if (doa?.translation && doa?.source) {
      parts.push(`🤲 "${this.truncate(doa.translation, 150)}"\n— ${doa.source}`);
    }

    // 5. HIKMAH (if exists)
    const hikmah = this.extractFirstBlock(content, 'hikmah');
    if (hikmah?.text) {
      parts.push(`✨ ${this.truncate(hikmah.text, 150)}`);
    }

    // 6. CTA
    const slugPath = content.type === 'QNA' ? 'qna' : 'artikel';
    parts.push(`🔗 Baca selengkapnya di adably.id/${slugPath}/${content.slug}`);

    // 7. HASHTAG
    const contentTags = (content.tags || [])
      .map((t: any) => `#${(t.tag?.name || t.name || '').replace(/\s+/g, '')}`)
      .filter((h: string) => h.length > 1)
      .join(' ');
    const defaultTags = account?.defaultHashtags || '#adably #edukasiislami #parentingislami';
    parts.push(`${contentTags} ${defaultTags}`.trim());

    let caption = parts.join('\n\n');

    // 8. VALIDATE — IG max 2200 chars
    if (caption.length > 2200) {
      caption = this.trimToLimit(parts, 2200);
    }

    return caption;
  }

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

  private buildBody(content: any): string {
    // QNA: use answerQuick
    if (content.type === 'QNA' && content.qnaDetail?.answerQuick) {
      return this.truncate(content.qnaDetail.answerQuick, 300);
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

  private truncate(text: string, maxLen: number): string {
    if (!text) return '';
    const clean = text.replace(/\n+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.substring(0, maxLen - 3) + '...';
  }

  /**
   * Trim caption to fit IG 2200 char limit by removing optional sections from bottom.
   */
  private trimToLimit(parts: string[], limit: number): string {
    // Try removing hikmah, then doa, then dalil, then body
    const removable = [4, 3, 2, 1]; // indices of optional sections (hikmah, doa, dalil, body)
    let remaining = [...parts];
    for (const idx of removable) {
      if (remaining.join('\n\n').length <= limit) break;
      if (idx < remaining.length - 2) { // Keep hook, CTA, and hashtags
        remaining.splice(idx, 1);
      }
    }
    let result = remaining.join('\n\n');
    if (result.length > limit) {
      result = result.substring(0, limit - 3) + '...';
    }
    return result;
  }
}
