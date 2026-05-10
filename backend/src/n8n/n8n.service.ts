import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { ContentType, ContentStatus } from '@prisma/client';
import slugify from 'slugify';

/**
 * Parsed block from Gemini output â€” maps to Adably block JSON format.
 */
interface ParsedBlock {
  type: string;
  [key: string]: any;
}

/**
 * Payload sent by n8n after parsing Gemini output.
 */
export interface SaveContentPayload {
  title: string;
  description?: string;
  type: 'QNA' | 'ARTICLE' | 'PEMBELAJARAN' | 'KISAH';
  subType?: string;
  nodeId?: string;
  ageGroups?: string[];
  tags?: string[];
  openingText?: string;
  closingText?: string;
  pov?: string;
  /** Raw Gemini output â€” the service will parse blocks from this */
  rawContent?: string;
  /** Pre-parsed blocks (if n8n already parsed them) */
  blocks?: ParsedBlock[];
  /** QNA-specific fields */
  answerQuick?: string;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Save Content â€” creates DRAFT from parsed payload
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async saveContent(payload: SaveContentPayload) {
    // Find a SUPERADMIN user to attribute the content to
    const superadmin = await this.prisma.user.findFirst({
      where: { role: 'SUPERADMIN' },
      select: { id: true },
    });
    if (!superadmin) throw new BadRequestException('Tidak ada SUPERADMIN user ditemukan');

    const contentType = this.mapContentType(payload.type);
    const blocks = payload.blocks || this.parseRawContent(payload.rawContent || '');
    const slug = slugify(payload.title, { lower: true, strict: true }) + '-' + Date.now().toString(36);

    // Extract metadata (description, tags, ageGroups) from raw Gemini output
    if (payload.rawContent) {
      const meta = this.extractGeminiMetadata(payload.rawContent);
      if (meta.description && !payload.description) payload.description = meta.description;
      if (meta.tags.length > 0 && (!payload.tags || payload.tags.length === 0)) payload.tags = meta.tags;
      if (meta.ageGroups.length > 0 && (!payload.ageGroups || payload.ageGroups.length === 0)) payload.ageGroups = meta.ageGroups;
    }

    // Auto-add Kisah subType as tag
    if (contentType === ContentType.KISAH && payload.subType) {
      const subTypeTagMap: Record<string, string> = {
        SIRAH: 'Sirah Nabawiyah', QASHASH: 'Qashashul Anbiya',
        TELADAN: 'Teladan Sahabat', FIKSI: 'Cerita Fiksi Islami',
      };
      const subTag = subTypeTagMap[payload.subType.toUpperCase()];
      if (subTag) {
        if (!payload.tags) payload.tags = [];
        if (!payload.tags.includes(subTag)) payload.tags.push(subTag);
      }
    }

    // Step 1: Create the content item
    const content = await this.prisma.contentItem.create({
      data: {
        title: payload.title,
        slug,
        description: payload.description || '',
        type: contentType,
        status: ContentStatus.DRAFT,
        authorId: superadmin.id,
        ageGroups: payload.ageGroups || ['3-5'],
        openingText: payload.openingText || null,
        closingText: payload.closingText || null,
        pov: contentType === ContentType.ARTICLE ? (payload.pov || null) : null,
        enableAudio: true,
        audioTitle: true,
        audioDescription: true,
        openingAudio: true,
        closingAudio: true,
        nodeId: payload.nodeId || null,
      },
    });

    // Step 2: Create Detail based on Type (same pattern as EditorService)
    if (contentType === ContentType.QNA) {
      const qnaBlocks = blocks.filter(b => b.type !== 'quick_answer');
      const quickBlock = blocks.find(b => b.type === 'quick_answer');
      await this.prisma.qnaDetail.create({
        data: {
          contentId: content.id,
          question: payload.title,
          answerQuick: payload.answerQuick || quickBlock?.text || '',
          blocks: qnaBlocks as any,
          dialogBlocks: [],
          dalilBlocks: [],
          analogyBlocks: [],
          tipsBlocks: [],
        },
      });
    } else {
      await this.prisma.articleDetail.create({
        data: {
          contentId: content.id,
          blocks: blocks as any,
        },
      });
    }

    // Step 3: Handle tags (same pattern as EditorService)
    if (payload.tags && payload.tags.length > 0) {
      for (const tagName of payload.tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;
        const tagSlug = slugify(trimmed, { lower: true, strict: true });
        const tag = await this.prisma.contentTag.upsert({
          where: { slug: tagSlug },
          update: { usageCount: { increment: 1 } },
          create: { name: trimmed, slug: tagSlug, usageCount: 1 },
        });
        await this.prisma.contentItemTag.create({
          data: { contentId: content.id, tagId: tag.id },
        });
      }
    }

    this.logger.log(`n8n created content: ${content.id} (${content.type})`);
    return {
      success: true,
      data: { id: content.id, title: content.title, status: content.status, type: content.type },
    };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Submit â€” change status from DRAFT to REVIEW
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async submitContent(contentId: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      select: { id: true, status: true, title: true },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    if (content.status !== ContentStatus.DRAFT && content.status !== ContentStatus.REVISION) {
      throw new BadRequestException(`Konten berstatus ${content.status}, tidak bisa diajukan review`);
    }

    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { status: ContentStatus.REVIEW },
    });

    return { success: true, message: `Konten "${content.title}" diajukan untuk review` };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Get Status
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getStatus(contentId: string) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      select: {
        id: true, title: true, status: true, type: true,
        createdAt: true, updatedAt: true,
        thumbnailUrl: true, socialThumbnailUrl: true,
      },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');
    return { success: true, data: content };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Parse Raw Gemini Output into Blocks
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Header keyword â†’ block type mapping (for fallback when Gemini drops markers)
  private static readonly HEADER_TYPE_MAP: Record<string, string> = {
    'ISI KONTEN': 'paragraph', 'KONTEN': 'paragraph',
    'ANALOGI': 'analogy', 'ANALOGI ORGANIK': 'analogy', 'ANALOGI KONTEKSTUAL': 'analogy',
    'TIPS': 'tip', 'CATATAN': 'tip', 'CATATAN / TIPS': 'tip',
    'HIKMAH': 'hikmah', 'HIKMAH / PELAJARAN': 'hikmah', 'PELAJARAN': 'hikmah',
    'DOA': 'doa',
    'DALIL': 'dalil', 'LANDASAN': 'dalil', 'DALIL / LANDASAN': 'dalil',
    'DIALOG': 'dialog', 'SIMULASI DIALOG': 'dialog',
    'PEMBUKAAN': 'opening', 'MUKADIMAH': 'opening', 'PEMBUKAAN / MUKADIMAH': 'opening',
    'PENUTUPAN': 'closing',
    'JAWABAN INSTAN': 'quick_answer',
    'REFERENSI': 'dalil', 'REFERENSI SUMBER': 'dalil',
  };

  private static readonly VALID_TYPES = ['quick_answer', 'paragraph', 'dalil', 'analogy', 'tip', 'hikmah', 'doa', 'dialog', 'heading', 'opening', 'closing'];

  parseRawContent(raw: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    if (!raw.trim()) return blocks;

    // Strip markdown formatting from the entire raw text first
    let cleaned = this.stripMarkdown(raw);

    // Split into lines for precise marker detection
    const lines = cleaned.split('\n');

    // Strategy 1: Find lines that are marker patterns like "(paragraph)", "(dalil)"
    // A marker line is one where the primary content is (type)
    const markerPositions: { type: string; lineIndex: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Match lines like "(paragraph)", "  (dalil)  ", "(opening)"
      const m = trimmed.match(/^[^a-zA-Z0-9]*\((\w+)\)[^a-zA-Z0-9]*$/);
      if (m) {
        const type = m[1].toLowerCase();
        if (N8nService.VALID_TYPES.includes(type)) {
          markerPositions.push({ type, lineIndex: i });
        }
      }
    }

    // Strategy 2: Fallback — detect header patterns (when AI ignores marker format)
    if (markerPositions.filter(m => m.type !== 'opening' && m.type !== 'closing').length < 2) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match separator-heavy lines
        const sepCount = (line.match(/[\u2501\u2550\u2500\u254C]/g) || []).length;
        if (sepCount >= 2) {
          const upper = line.toUpperCase();
          for (const [keyword, blockType] of Object.entries(N8nService.HEADER_TYPE_MAP)) {
            if (upper.includes(keyword)) {
              const alreadyFound = markerPositions.some(m => m.lineIndex === i);
              if (!alreadyFound) {
                markerPositions.push({ type: blockType, lineIndex: i });
              }
              break;
            }
          }
        }
      }
      markerPositions.sort((a, b) => a.lineIndex - b.lineIndex);
    }

    // Extract section content between markers
    for (let i = 0; i < markerPositions.length; i++) {
      const contentStart = markerPositions[i].lineIndex + 1;
      const contentEnd = i + 1 < markerPositions.length
        ? markerPositions[i + 1].lineIndex
        : lines.length;

      const sectionLines = lines.slice(contentStart, contentEnd);
      const section = sectionLines.join('\n').trim();
      if (!section) continue;

      const block = this.parseSectionToBlock(markerPositions[i].type, section);
      if (block) blocks.push(block);
    }

    // Post-process: merge heading blocks into the following paragraph
    const merged: ParsedBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === 'heading' && blocks[i].text) {
        // Look for next paragraph block to merge into
        if (i + 1 < blocks.length && blocks[i + 1].type === 'paragraph') {
          blocks[i + 1].heading = blocks[i].text;
          // Skip the heading block — it's now merged into the next paragraph
          continue;
        }
        // If no paragraph follows, keep heading as-is (edge case)
      }
      merged.push(blocks[i]);
    }
    const finalBlocks = merged;

    // Fallback: if no blocks found, treat entire raw as one paragraph
    if (finalBlocks.length === 0 && raw.trim()) {
      finalBlocks.push({ type: 'paragraph', text: this.stripMarkdown(raw).trim() });
    }

    return finalBlocks;
  }

  /**
   * Strip markdown formatting: **, __, ##, *, ---, ~~
   * Preserves the text content itself.
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/^#{1,6}\s+/gm, '')         // ## headings
      .replace(/\*\*([^*]+)\*\*/g, '$1')    // **bold**
      .replace(/__([^_]+)__/g, '$1')        // __bold__
      .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, '$1')  // *italic*
      .replace(/~~([^~]+)~~/g, '$1')        // ~~strike~~
      .replace(/^---+\s*$/gm, '')           // --- rules
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2')  // [text](url) → url
      .trim();
  }

  private parseSectionToBlock(type: string, section: string): ParsedBlock | null {
    switch (type) {
      case 'quick_answer':
      case 'paragraph':
      case 'tip':
      case 'hikmah':
        return { type, text: this.cleanSectionText(section) };

      case 'analogy': {
        const titleMatch = section.match(/(?:Judul|Title)\s*:\s*["\u201c]?([^"\u201d\n]+)/i);
        const textContent = section.replace(/(?:Judul|Title)\s*:\s*["\u201c]?[^"\u201d\n]+["\u201d]?\s*/i, '').trim();
        return { type: 'analogy', title: titleMatch?.[1]?.trim() || '', text: this.cleanSectionText(textContent) };
      }

      case 'dalil': {
        const entries = this.parseDalilEntries(section);
        return entries.length > 0 ? { type: 'dalil', entries } : null;
      }

      case 'doa': {
        const titleMatch = section.match(/(?:Judul|Title)\s*:\s*["\u201c]?([^"\u201d\n]+)/i);
        const arabicMatch = section.match(/(?:Arab|Arabic)\s*:\s*(.+)/i);
        const translationMatch = section.match(/(?:Terjemah(?:an)?|Translation)\s*:\s*["\u201c]?([^"\u201d\n]+)/i);
        const sourceMatch = section.match(/Sumber\s*:\s*(.+)/i);
        const urlMatch = section.match(/Sumber\s*URL\s*:\s*(https?:\/\/[^\s\)\]]+)/i);
        return {
          type: 'doa',
          title: titleMatch?.[1]?.trim() || '',
          arabic: arabicMatch?.[1]?.trim() || '',
          translation: translationMatch?.[1]?.trim() || '',
          source: sourceMatch?.[1]?.trim() || '',
          sourceUrl: urlMatch?.[1]?.trim() || '',
        };
      }

      case 'dialog': {
        const dLines = section.split('\n').filter(l => l.trim());
        const entries: { role: string; text: string }[] = [];
        for (const line of dLines) {
          const dialogMatch = line.match(/^-?\s*\[([^\]]+)\]\s*["\u201c]?([^"\u201d]+)["\u201d]?/i);
          if (dialogMatch) {
            entries.push({ role: dialogMatch[1].trim(), text: dialogMatch[2].trim() });
          }
        }
        return entries.length > 0 ? { type: 'dialog', entries } : null;
      }

      case 'heading':
        return { type: 'heading', text: this.cleanSectionText(section) };

      case 'opening':
      case 'closing':
        return null; // Handled as contentItem fields, not blocks

      default:
        return { type: 'paragraph', text: this.cleanSectionText(section) };
    }
  }

  private parseDalilEntries(section: string): any[] {
    const entries: any[] = [];
    const dalilParts = section.split(/(?:Dalil\s*\d+\s*:)/i).filter(p => p.trim());
    for (const part of dalilParts) {
      const arabicMatch = part.match(/(?:Arab|Arabic)\s*:\s*(.+)/i);
      const translationMatch = part.match(/(?:Terjemah(?:an)?|Translation)\s*:\s*["\u201c]?([^"\u201d\n]+)/i);
      const sourceMatch = part.match(/Sumber\s*:\s*(.+)/i);
      const urlMatch = part.match(/Sumber\s*URL\s*:\s*(https?:\/\/[^\s\)\]]+)/i);
      if (arabicMatch || translationMatch) {
        entries.push({
          arabic: arabicMatch?.[1]?.trim() || '',
          translation: translationMatch?.[1]?.trim() || '',
          source: sourceMatch?.[1]?.trim() || '',
          sourceUrl: urlMatch?.[1]?.trim() || '',
        });
      }
    }
    return entries;
  }

  private cleanSectionText(text: string): string {
    return text
      .replace(/^[\u2501\u2550\u2500\-\s*]+/gm, '')
      .replace(/[\u2501\u2550\u2500]+$/gm, '')
      .replace(/^Poin\s*\d+\s*:\s*/gm, '\ud83d\udca1 ')
      .replace(/^Hikmah\s*:\s*/gm, '')
      .replace(/^Penjelasan\s*:\s*/gm, '')
      .replace(/^\u2022\s*/gm, '')
      .trim();
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Extract opening/closing from raw text
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // ═══════════════════════════════════════════════
  // Extract opening/closing from raw text (line-based, consistent with parseRawContent)
  // ═══════════════════════════════════════════════

  extractMetaFromRaw(raw: string): { openingText?: string; closingText?: string } {
    const result: { openingText?: string; closingText?: string } = {};
    const lines = raw.split('\n');

    // Find marker lines for opening and closing
    let openingLineIdx = -1;
    let closingLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Match lines like "(opening)", "  (closing)  ", or separator-wrapped markers
      const m = trimmed.match(/^[^a-zA-Z0-9]*\((opening|closing)\)[^a-zA-Z0-9]*$/i);
      if (m) {
        const type = m[1].toLowerCase();
        if (type === 'opening') openingLineIdx = i;
        if (type === 'closing') closingLineIdx = i;
      }
    }

    // Extract opening text: from line after (opening) to next marker or closingLineIdx
    if (openingLineIdx >= 0) {
      const contentStart = openingLineIdx + 1;
      // Find next marker after opening
      let contentEnd = lines.length;
      for (let i = contentStart; i < lines.length; i++) {
        const t = lines[i].trim();
        const mk = t.match(/^[^a-zA-Z0-9]*\((\w+)\)[^a-zA-Z0-9]*$/i);
        if (mk && ['paragraph','quick_answer','dalil','analogy','tip','hikmah','doa','dialog','heading','closing'].includes(mk[1].toLowerCase())) {
          contentEnd = i;
          break;
        }
      }
      const text = lines.slice(contentStart, contentEnd).join('\n').trim();
      if (text) result.openingText = text;
    }

    // Extract closing text: from line after (closing) to end
    if (closingLineIdx >= 0) {
      const text = lines.slice(closingLineIdx + 1).join('\n').trim();
      if (text) result.closingText = text;
    }

    return result;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Extract metadata (description, tags, ageGroups) from Gemini output
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private extractGeminiMetadata(raw: string): { description: string; tags: string[]; ageGroups: string[] } {
    const result = { description: '', tags: [] as string[], ageGroups: [] as string[] };

    // Extract description: "Deskripsi Singkat: ..." or "Deskripsi: ..."
    const descMatch = raw.match(/(?:Deskripsi(?:\s*Singkat)?)\s*:\s*(.+)/i);
    if (descMatch) {
      result.description = descMatch[1].replace(/^[\["'""]+|[\]"'""]+$/g, '').trim();
    }

    // Extract tags: "Tag: sholat, ibadah, anak, islam"
    const tagMatch = raw.match(/Tag\s*:\s*(.+)/i);
    if (tagMatch) {
      result.tags = tagMatch[1]
        .split(/[,ØŒ]/)
        .map(t => t.replace(/^[\["'""]+|[\]"'""]+$/g, '').trim())
        .filter(t => t.length > 0 && t.length < 50);
    }

    // Extract age groups: "Kelompok Usia: 3-5, 5-7 tahun" or "Usia: 3â€“10 tahun"
    const ageMatch = raw.match(/(?:Kelompok\s*)?Usia\s*:\s*(.+)/i);
    if (ageMatch) {
      const ageText = ageMatch[1];
      const validAges = ['3-5', '5-7', '7-10', '10-13'];
      for (const age of validAges) {
        if (ageText.includes(age) || ageText.includes(age.replace('-', 'â€“'))) {
          result.ageGroups.push(age);
        }
      }
      // Handle range like "3â€“10" â†’ includes 3-5, 5-7, 7-10
      const rangeMatch = ageText.match(/(\d+)[â€“\-](\d+)/);
      if (rangeMatch && result.ageGroups.length === 0) {
        const lo = parseInt(rangeMatch[1]);
        const hi = parseInt(rangeMatch[2]);
        if (lo <= 5 && hi >= 3) result.ageGroups.push('3-5');
        if (lo <= 7 && hi >= 5) result.ageGroups.push('5-7');
        if (lo <= 10 && hi >= 7) result.ageGroups.push('7-10');
        if (lo <= 13 && hi >= 10) result.ageGroups.push('10-13');
      }
    }

    return result;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Helpers
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  private mapContentType(type: string): ContentType {
    const map: Record<string, ContentType> = {
      QNA: ContentType.QNA,
      ARTICLE: ContentType.ARTICLE,
      PEMBELAJARAN: ContentType.PEMBELAJARAN,
      KISAH: ContentType.KISAH,
    };
    return map[type.toUpperCase()] || ContentType.QNA;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Export Content as .txt File
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async exportContentAsTxt(
    contentId: string,
    format: 'txt' | 'rtf' = 'txt',
  ): Promise<{ filename: string; content: string; mimeType: string }> {
    // Fetch contentItem with tags
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        tags: { include: { tag: true } },
      },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    // Fetch detail based on type
    let detail: any = null;
    if (content.type === ContentType.QNA) {
      detail = await this.prisma.qnaDetail.findUnique({ where: { contentId } });
    } else {
      detail = await this.prisma.articleDetail.findUnique({ where: { contentId } });
    }

    const slug = content.slug || content.id;

    if (format === 'rtf') {
      const fileContent = this.formatContentAsRtf(content, detail);
      return {
        filename: `hasil_${slug.substring(0, 40)}.rtf`,
        content: fileContent,
        mimeType: 'application/rtf',
      };
    }

    // â”€â”€ TXT format â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const lines: string[] = [];
    const sep = 'â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•';

    lines.push(sep);
    lines.push('ADABLY - KONTEN DRAFT');
    lines.push(sep);
    lines.push(`ID      : ${content.id}`);
    lines.push(`Judul   : ${content.title}`);
    lines.push(`Tipe    : ${content.type}`);
    lines.push(`Status  : ${content.status}`);
    lines.push(`Usia    : ${(content.ageGroups || []).join(', ')}`);
    lines.push(`Tag     : ${content.tags.map((t: any) => t.tag.name).join(', ') || '-'}`);
    if (content.description) lines.push(`Deskripsi: ${content.description}`);
    lines.push(sep);
    lines.push('');

    if (content.openingText) {
      lines.push('-- PEMBUKAAN --');
      lines.push(content.openingText);
      lines.push('');
    }

    if (content.type === ContentType.QNA && detail) {
      if (detail.answerQuick) {
        lines.push('==== BLOK: JAWABAN INSTAN ====');
        lines.push(detail.answerQuick);
        lines.push('');
      }
      const blocks: ParsedBlock[] = (detail.blocks as ParsedBlock[]) || [];
      this.formatBlocksToTxt(blocks, lines);
    } else if (detail) {
      const blocks: ParsedBlock[] = (detail.blocks as ParsedBlock[]) || [];
      this.formatBlocksToTxt(blocks, lines);
    }

    if (content.closingText) {
      lines.push('-- PENUTUPAN --');
      lines.push(content.closingText);
      lines.push('');
    }

    lines.push(sep);
    lines.push(`Buka di dashboard: https://adably.id/admin`);
    lines.push(sep);

    return {
      filename: `hasil_${slug.substring(0, 40)}.txt`,
      content: lines.join('\n'),
      mimeType: 'text/plain',
    };
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Upload Thumbnail from Bot (Telegram â†’ MinIO â†’ DB)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async uploadThumbnailFromBot(
    contentId: string,
    type: 'web' | 'sosmed',
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ url: string; field: string; title: string }> {
    // Validate content exists
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      select: { id: true, title: true, thumbnailUrl: true, socialThumbnailUrl: true },
    });
    if (!content) throw new NotFoundException('Konten tidak ditemukan');

    const field = type === 'web' ? 'thumbnailUrl' : 'socialThumbnailUrl';
    const oldUrl = type === 'web' ? content.thumbnailUrl : content.socialThumbnailUrl;

    // Delete old thumbnail from MinIO if exists
    if (oldUrl) {
      await this.storageService.deleteFile(oldUrl).catch(err =>
        this.logger.warn(`âš ï¸  Failed to cleanup old ${field}: ${err.message}`),
      );
      this.logger.log(`ðŸ—‘ï¸  Old ${field} deleted: ${oldUrl}`);
    }

    // Upload new file to MinIO
    const folder = type === 'web' ? 'thumbnail' : 'social-thumbnail';
    const url = await this.storageService.uploadFile(
      fileBuffer,
      mimeType,
      fileName,
      folder,
    );

    // Update DB
    await this.prisma.contentItem.update({
      where: { id: contentId },
      data: { [field]: url },
    });

    this.logger.log(`âœ… Thumbnail uploaded: ${field} = ${url} (content: ${contentId})`);
    return { url, field, title: content.title };
  }

  // â”€â”€ RTF helper: escape special RTF characters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private rtfEsc(s: string): string {
    return (s || '')
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n/g, '\\line ');
  }

  private rtfUnicode(s: string): string {
    // Convert non-ASCII characters to RTF unicode escape sequences
    return this.rtfEsc(s).replace(/[^\x00-\x7F]/g, (ch) => {
      const code = ch.charCodeAt(0);
      return `\\u${code}?`;
    });
  }

  private formatContentAsRtf(content: any, detail: any): string {
    const u = (s: string) => this.rtfUnicode(s);
    const tags = content.tags?.map((t: any) => t.tag.name).join(', ') || '-';
    const ages = (content.ageGroups || []).join(', ');

    const lines: string[] = [];

    // RTF header
    lines.push('{\\rtf1\\ansi\\deff0');
    lines.push('{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Arial;}}');
    lines.push('{\\colortbl;\\red26\\green60\\blue94;\\red136\\green136\\blue136;\\red68\\green68\\blue68;}');
    lines.push('\\widowctrl\\hyphauto\\ftnbj');
    lines.push('\\margl1440\\margr1440\\margt1440\\margb1440');

    // Title
    lines.push(`\\pard\\sb200\\sa200{\\f1\\fs36\\b\\cf1 ${u(content.title)}}\\par`);

    // Meta table
    lines.push(`{\\f1\\fs20\\cf2 Tipe: ${u(content.type)} | Status: ${u(content.status)} | Usia: ${u(ages)} | Tag: ${u(tags)}}\\par`);
    if (content.description) {
      lines.push(`{\\f1\\fs20\\cf2 Deskripsi: ${u(content.description)}}\\par`);
    }
    lines.push('\\pard\\sb100\\sa100\\brdrb\\brdrs\\brdrw10\\brsp20 \\par');

    // Opening
    if (content.openingText) {
      lines.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Pembukaan}\\par`);
      lines.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(content.openingText)}}\\par`);
    }

    // Blocks
    const renderBlock = (block: ParsedBlock): string => {
      const parts: string[] = [];
      switch (block.type) {
        case 'heading':
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs26\\b\\cf1 ${u(block.text || '')}}\\par`);
          break;
        case 'paragraph':
          if (block.heading) parts.push(`\\pard\\sb200\\sa100{\\f1\\fs24\\b ${u(block.heading)}}\\par`);
          parts.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(block.text || '')}}\\par`);
          break;
        case 'quick_answer':
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Jawaban Instan}\\par`);
          parts.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(block.text || '')}}\\par`);
          break;
        case 'tip':
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Tips Orang Tua}\\par`);
          parts.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(block.text || '')}}\\par`);
          break;
        case 'hikmah':
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Hikmah}\\par`);
          parts.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(block.text || '')}}\\par`);
          break;
        case 'analogy':
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Analogi: ${u(block.title || '')}}\\par`);
          parts.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(block.text || '')}}\\par`);
          break;
        case 'dalil': {
          const entries = (block.entries || []) as any[];
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Dalil / Landasan}\\par`);
          entries.forEach((e: any, i: number) => {
            parts.push(`\\pard\\sb100\\sa60{\\f1\\fs20\\b Dalil ${i + 1}:}\\par`);
            if (e.arabic) parts.push(`\\pard\\sb60\\sa60\\qr{\\f0\\fs24 ${u(e.arabic)}}\\par`);
            if (e.translation) parts.push(`\\pard\\sb60\\sa60{\\f0\\fs20\\i ${u(e.translation)}}\\par`);
            if (e.source) parts.push(`\\pard\\sb40\\sa40{\\f0\\fs20 Sumber: ${u(e.source)}}\\par`);
            if (e.sourceUrl) parts.push(`\\pard\\sb40\\sa40{\\f0\\fs20 URL: ${u(e.sourceUrl)}}\\par`);
          });
          break;
        }
        case 'doa':
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Doa: ${u(block.title || '')}}\\par`);
          if (block.arabic) parts.push(`\\pard\\sb100\\sa60\\qr{\\f0\\fs24 ${u(block.arabic)}}\\par`);
          if (block.translation) parts.push(`\\pard\\sb60\\sa60{\\f0\\fs20\\i ${u(block.translation)}}\\par`);
          if (block.source) parts.push(`\\pard\\sb40\\sa40{\\f0\\fs20 Sumber: ${u(block.source)}}\\par`);
          if (block.sourceUrl) parts.push(`\\pard\\sb40\\sa40{\\f0\\fs20 URL: ${u(block.sourceUrl)}}\\par`);
          break;
        case 'dialog': {
          const entries = (block.entries || []) as any[];
          parts.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Dialog}\\par`);
          entries.forEach((e: any) => {
            parts.push(`\\pard\\sb60\\sa60{\\f0\\fs22 {\\b [${u(e.role)}]} \"${u(e.text)}\"}\\par`);
          });
          break;
        }
        default:
          if (block.text) parts.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(block.text)}}\\par`);
      }
      return parts.join('\n');
    };

    if (content.type === ContentType.QNA && detail) {
      if (detail.answerQuick) {
        lines.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Jawaban Instan}\\par`);
        lines.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(detail.answerQuick)}}\\par`);
      }
      const blocks: ParsedBlock[] = (detail.blocks as ParsedBlock[]) || [];
      blocks.forEach(b => lines.push(renderBlock(b)));
    } else if (detail) {
      const blocks: ParsedBlock[] = (detail.blocks as ParsedBlock[]) || [];
      blocks.forEach(b => lines.push(renderBlock(b)));
    }

    // Closing
    if (content.closingText) {
      lines.push(`\\pard\\sb200\\sa100{\\f1\\fs22\\b Penutupan}\\par`);
      lines.push(`\\pard\\sb100\\sa100{\\f0\\fs22 ${u(content.closingText)}}\\par`);
    }

    // Footer
    lines.push('\\pard\\sb200\\sa100\\brdrb\\brdrs\\brdrw10\\brsp20 \\par');
    lines.push(`\\pard\\sb100\\sa100{\\f1\\fs18\\cf2 Buka di dashboard: https://adably.id/admin}\\par`);
    lines.push('}'); // close RTF document

    return lines.join('\n');
  }

  private formatContentAsHtmlDoc(content: any, detail: any): string {
    const tags = content.tags?.map((t: any) => t.tag.name).join(', ') || '-';
    const ages = (content.ageGroups || []).join(', ');

    const esc = (s: string) =>
      (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const renderBlock = (block: ParsedBlock): string => {
      switch (block.type) {
        case 'paragraph':
          return `<p style="margin:10px 0;line-height:1.8;">${esc(block.text || '')}</p>`;
        case 'heading':
          return `<h3 style="margin:16px 0 6px;color:#1a3c5e;">${esc(block.text || '')}</h3>`;
        case 'quick_answer':
          return `<div style="background:#e8f5e9;padding:12px;border-left:4px solid #4caf50;margin:10px 0;"><b>Jawaban Instan</b><p>${esc(block.text || '')}</p></div>`;
        case 'tip':
          return `<div style="background:#fff8e1;padding:12px;border-left:4px solid #ff9800;margin:10px 0;"><b>Tips Orang Tua</b><p>${esc(block.text || '')}</p></div>`;
        case 'hikmah':
          return `<div style="background:#f3e5f5;padding:12px;border-left:4px solid #9c27b0;margin:10px 0;"><b>Hikmah</b><p>${esc(block.text || '')}</p></div>`;
        case 'analogy':
          return `<div style="background:#e3f2fd;padding:12px;border-left:4px solid #2196f3;margin:10px 0;"><b>Analogi: ${esc(block.title || '')}</b><p>${esc(block.text || '')}</p></div>`;
        case 'dalil': {
          const entries = (block.entries || []) as any[];
          return `<div style="background:#fafafa;border:1px solid #ddd;padding:12px;margin:10px 0;">
<b>Dalil / Landasan</b>
${entries.map((e, i) => `<div style="margin-top:8px;"><b>Dalil ${i + 1}:</b><br>
${e.arabic ? `<span style="font-size:1.3em;direction:rtl;display:block;text-align:right;">${esc(e.arabic)}</span>` : ''}
${e.translation ? `<i>${esc(e.translation)}</i><br>` : ''}
${e.source ? `Sumber: ${esc(e.source)}<br>` : ''}
${e.sourceUrl ? `URL: <a href="${esc(e.sourceUrl)}">${esc(e.sourceUrl)}</a>` : ''}
</div>`).join('')}</div>`;
        }
        case 'doa':
          return `<div style="background:#fce4ec;padding:12px;border-left:4px solid #e91e63;margin:10px 0;">
<b>Doa: ${esc(block.title || '')}</b>
${block.arabic ? `<div style="font-size:1.3em;direction:rtl;text-align:right;margin:8px 0;">${esc(block.arabic)}</div>` : ''}
${block.translation ? `<i>${esc(block.translation)}</i><br>` : ''}
${block.source ? `Sumber: ${esc(block.source)}<br>` : ''}
${block.sourceUrl ? `URL: <a href="${esc(block.sourceUrl)}">${esc(block.sourceUrl)}</a>` : ''}
</div>`;
        case 'dialog': {
          const entries = (block.entries || []) as any[];
          return `<div style="background:#f5f5f5;padding:12px;margin:10px 0;"><b>Dialog</b>
${entries.map(e => `<div><b>[${esc(e.role)}]</b> "${esc(e.text)}"</div>`).join('')}</div>`;
        }
        default:
          return block.text ? `<p>${esc(block.text)}</p>` : '';
      }
    };

    let bodyHtml = '';
    if (content.openingText) {
      bodyHtml += `<div style="background:#e8eaf6;padding:12px;margin:10px 0;border-left:4px solid #3f51b5;"><b>Pembukaan</b><p>${esc(content.openingText)}</p></div>`;
    }

    if (content.type === ContentType.QNA && detail) {
      if (detail.answerQuick) {
        bodyHtml += `<div style="background:#e8f5e9;padding:12px;border-left:4px solid #4caf50;margin:10px 0;"><b>Jawaban Instan</b><p>${esc(detail.answerQuick)}</p></div>`;
      }
      const blocks: ParsedBlock[] = (detail.blocks as ParsedBlock[]) || [];
      bodyHtml += blocks.map(renderBlock).join('');
    } else if (detail) {
      const blocks: ParsedBlock[] = (detail.blocks as ParsedBlock[]) || [];
      bodyHtml += blocks.map(renderBlock).join('');
    }

    if (content.closingText) {
      bodyHtml += `<div style="background:#e8eaf6;padding:12px;margin:10px 0;border-left:4px solid #3f51b5;"><b>Penutupan</b><p>${esc(content.closingText)}</p></div>`;
    }

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${esc(content.title)}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;}</style>
</head><body>
<h1 style="color:#1a3c5e;">${esc(content.title)}</h1>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
<tr><td style="padding:4px 8px;"><b>Tipe</b></td><td>${esc(content.type)}</td></tr>
<tr><td style="padding:4px 8px;"><b>Status</b></td><td>${esc(content.status)}</td></tr>
<tr><td style="padding:4px 8px;"><b>Usia</b></td><td>${esc(ages)}</td></tr>
<tr><td style="padding:4px 8px;"><b>Tag</b></td><td>${esc(tags)}</td></tr>
${content.description ? `<tr><td style="padding:4px 8px;"><b>Deskripsi</b></td><td>${esc(content.description)}</td></tr>` : ''}
</table>
${bodyHtml}
<hr><p style="color:#888;font-size:0.85em;">Buka di dashboard: <a href="https://adably.id/admin">adably.id/admin</a></p>
</body></html>`;
  }

  private formatBlocksToTxt(blocks: ParsedBlock[], lines: string[]): void {
    const BLOCK_LABEL: Record<string, string> = {
      paragraph: 'ISI KONTEN',
      heading: 'JUDUL BABAK',
      dalil: 'DALIL',
      analogy: 'ANALOGI',
      tip: 'TIPS',
      hikmah: 'HIKMAH',
      doa: 'DOA',
      dialog: 'DIALOG',
      quick_answer: 'JAWABAN INSTAN',
    };

    for (const block of blocks) {
      const label = BLOCK_LABEL[block.type] || block.type.toUpperCase();
      lines.push(`â•â•â•â• BLOK: ${label} â•â•â•â•`);

      switch (block.type) {
        case 'paragraph':
        case 'tip':
        case 'hikmah':
        case 'quick_answer':
          if (block.heading) lines.push(`[Sub-judul: ${block.heading}]`);
          lines.push(block.text || '');
          break;

        case 'heading':
          lines.push(block.text || '');
          break;

        case 'analogy':
          if (block.title) lines.push(`Judul: ${block.title}`);
          if (block.text) lines.push(`Isi  : ${block.text}`);
          break;

        case 'dalil':
          if (block.entries && Array.isArray(block.entries)) {
            block.entries.forEach((e: any, i: number) => {
              lines.push(`Dalil ${i + 1}:`);
              if (e.arabic) lines.push(`  Arab     : ${e.arabic}`);
              if (e.translation) lines.push(`  Terjemah : ${e.translation}`);
              if (e.source) lines.push(`  Sumber   : ${e.source}`);
              if (e.sourceUrl) lines.push(`  URL      : ${e.sourceUrl}`);
            });
          }
          break;

        case 'doa':
          if (block.title) lines.push(`Judul    : ${block.title}`);
          if (block.arabic) lines.push(`Arab     : ${block.arabic}`);
          if (block.translation) lines.push(`Terjemah : ${block.translation}`);
          if (block.source) lines.push(`Sumber   : ${block.source}`);
          if (block.sourceUrl) lines.push(`URL      : ${block.sourceUrl}`);
          break;

        case 'dialog':
          if (block.entries && Array.isArray(block.entries)) {
            block.entries.forEach((e: any) => {
              lines.push(`  [${e.role}] "${e.text}"`);
            });
          }
          break;

        default:
          if (block.text) lines.push(block.text);
      }

      lines.push('');
    }
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Upload Content File â€” REMOVED
  // File parsing via Telegram bot has been replaced by
  // web Import Konten AI (POST /admin/import-ai) which
  // accepts plain text directly â€” no file format issues.
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
}

