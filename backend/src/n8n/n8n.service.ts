import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentType, ContentStatus } from '@prisma/client';
import slugify from 'slugify';

/**
 * Parsed block from Gemini output — maps to Adably block JSON format.
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
  ageGroups?: string[];
  tags?: string[];
  openingText?: string;
  closingText?: string;
  pov?: string;
  /** Raw Gemini output — the service will parse blocks from this */
  rawContent?: string;
  /** Pre-parsed blocks (if n8n already parsed them) */
  blocks?: ParsedBlock[];
  /** QNA-specific fields */
  answerQuick?: string;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════
  // Save Content — creates DRAFT from parsed payload
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Submit — change status from DRAFT to REVIEW
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Get Status
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Parse Raw Gemini Output into Blocks
  // ═══════════════════════════════════════════════

  // Header keyword → block type mapping (for fallback when Gemini drops markers)
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

    // Strategy 1: Find markers using (type) pattern — e.g. "(paragraph)", "(dalil)"
    const markers: { type: string; index: number }[] = [];
    const lineMarkerRegex = /^.*\((\w+)\).*$/gm;
    let match: RegExpExecArray | null;

    while ((match = lineMarkerRegex.exec(raw)) !== null) {
      const type = match[1].toLowerCase();
      if (N8nService.VALID_TYPES.includes(type)) {
        markers.push({ type, index: match.index + match[0].length });
      }
    }

    // Strategy 2: If few markers found, try fallback header pattern ━━━ KEYWORD ━━━
    if (markers.filter(m => m.type !== 'opening' && m.type !== 'closing').length < 2) {
      const headerRegex = /^[━─═]{2,}[^━─═\n]*$/gm;
      let headerMatch: RegExpExecArray | null;
      while ((headerMatch = headerRegex.exec(raw)) !== null) {
        const line = headerMatch[0];
        // Try to match known keywords in this header line
        for (const [keyword, blockType] of Object.entries(N8nService.HEADER_TYPE_MAP)) {
          if (line.toUpperCase().includes(keyword)) {
            // Check if this marker already exists (from strategy 1)
            const alreadyFound = markers.some(m => Math.abs(m.index - (headerMatch!.index + line.length)) < 50 && m.type === blockType);
            if (!alreadyFound) {
              markers.push({ type: blockType, index: headerMatch.index + line.length });
            }
            break; // First keyword match wins
          }
        }
      }
      // Sort markers by position after adding fallback markers
      markers.sort((a, b) => a.index - b.index);
    }

    // Extract content between markers
    for (let i = 0; i < markers.length; i++) {
      const start = markers[i].index;
      const end = i + 1 < markers.length
        ? raw.lastIndexOf('\n', markers[i + 1].index - markers[i + 1].type.length - 10)
        : raw.length;
      const section = raw.substring(start, end > start ? end : raw.length).trim();
      if (!section) continue;

      const block = this.parseSectionToBlock(markers[i].type, section);
      if (block) blocks.push(block);
    }

    // Post-process: detect headings within paragraph blocks (short bold lines)
    const finalBlocks: ParsedBlock[] = [];
    for (const block of blocks) {
      if (block.type === 'paragraph' && block.text) {
        const lines = block.text.split('\n');
        let currentParagraph = '';
        for (const line of lines) {
          const trimmed = line.trim();
          // Heuristic: short line (≤60 chars), no period at end, not empty → heading
          if (trimmed.length > 0 && trimmed.length <= 60 && !trimmed.endsWith('.') && !trimmed.endsWith('!') && !trimmed.endsWith('?') && !trimmed.startsWith('-') && !trimmed.startsWith('•') && /^[A-Z\u00C0-\u024F]/.test(trimmed) && currentParagraph.length > 100) {
            // Flush current paragraph
            if (currentParagraph.trim()) finalBlocks.push({ type: 'paragraph', text: currentParagraph.trim() });
            finalBlocks.push({ type: 'heading', text: trimmed });
            currentParagraph = '';
          } else {
            currentParagraph += (currentParagraph ? '\n' : '') + line;
          }
        }
        if (currentParagraph.trim()) finalBlocks.push({ type: 'paragraph', text: currentParagraph.trim() });
      } else {
        finalBlocks.push(block);
      }
    }

    // Fallback: if no blocks found, treat entire raw as one paragraph
    if (finalBlocks.length === 0 && raw.trim()) {
      finalBlocks.push({ type: 'paragraph', text: raw.trim() });
    }

    return finalBlocks;
  }

  private parseSectionToBlock(type: string, section: string): ParsedBlock | null {
    switch (type) {
      case 'quick_answer':
      case 'paragraph':
      case 'tip':
      case 'hikmah':
        return { type, text: this.cleanSectionText(section) };

      case 'analogy': {
        const titleMatch = section.match(/(?:Judul|Title)\s*:\s*[""\u201c]?([^""\u201d\n]+)/i);
        const textContent = section.replace(/(?:Judul|Title)\s*:\s*[""\u201c]?[^""\u201d\n]+[""\u201d]?\s*/i, '').trim();
        return { type: 'analogy', title: titleMatch?.[1]?.trim() || '', text: this.cleanSectionText(textContent) };
      }

      case 'dalil': {
        const entries = this.parseDalilEntries(section);
        return entries.length > 0 ? { type: 'dalil', entries } : null;
      }

      case 'doa': {
        const titleMatch = section.match(/(?:Judul|Title)\s*:\s*[""\u201c]?([^""\u201d\n]+)/i);
        const arabicMatch = section.match(/(?:Arab|Arabic)\s*:\s*(.+)/i);
        const translationMatch = section.match(/(?:Terjemah(?:an)?|Translation)\s*:\s*[""\u201c]?([^""\u201d\n]+)/i);
        const sourceMatch = section.match(/Sumber\s*:\s*(.+)/i);
        const urlMatch = section.match(/Sumber\s*URL\s*:\s*(https?:\/\/[^\s]+)/i);
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
        const lines = section.split('\n').filter(l => l.trim());
        const entries: { role: string; text: string }[] = [];
        for (const line of lines) {
          const dialogMatch = line.match(/^-?\s*\[([^\]]+)\]\s*[""\u201c]?([^""\u201d]+)[""\u201d]?/i);
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
      const translationMatch = part.match(/(?:Terjemah(?:an)?|Translation)\s*:\s*[""\u201c]?([^""\u201d\n]+)/i);
      const sourceMatch = part.match(/Sumber\s*:\s*(.+)/i);
      const urlMatch = part.match(/Sumber\s*URL\s*:\s*(https?:\/\/[^\s]+)/i);
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
    return text.replace(/^[━═─\-\s*]+/gm, '').replace(/[━═─]+$/gm, '').trim();
  }

  // ═══════════════════════════════════════════════
  // Extract opening/closing from raw text
  // ═══════════════════════════════════════════════

  extractMetaFromRaw(raw: string): { openingText?: string; closingText?: string } {
    const result: { openingText?: string; closingText?: string } = {};

    // Strategy 1: marker (opening) / (closing)
    const openingMatch = raw.match(/\(opening\)\s*━*\s*\n([\s\S]*?)(?=\n.*?\((?:quick_answer|paragraph|dalil|analogy|tip|hikmah|doa|closing)\)|$)/i);
    if (openingMatch) result.openingText = openingMatch[1].trim();
    const closingMatch = raw.match(/\(closing\)\s*━*\s*\n([\s\S]*?)$/i);
    if (closingMatch) result.closingText = closingMatch[1].trim();

    // Strategy 2: fallback header pattern ━━━ PEMBUKAAN ━━━ / ━━━ PENUTUPAN ━━━
    if (!result.openingText) {
      const headerOpen = raw.match(/━+[^━\n]*(?:PEMBUKAAN|MUKADIMAH)[^━\n]*━+\s*\n([\s\S]*?)(?=\n━+[^━\n]*(?:BLOK|KONTEN|JAWABAN|DIALOG)[^━\n]*━+|$)/i);
      if (headerOpen) result.openingText = headerOpen[1].trim();
    }
    if (!result.closingText) {
      const headerClose = raw.match(/━+[^━\n]*PENUTUPAN[^━\n]*━+\s*\n([\s\S]*?)$/i);
      if (headerClose) result.closingText = headerClose[1].trim();
    }

    return result;
  }

  // ═══════════════════════════════════════════════
  // Extract metadata (description, tags, ageGroups) from Gemini output
  // ═══════════════════════════════════════════════

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
        .split(/[,،]/)
        .map(t => t.replace(/^[\["'""]+|[\]"'""]+$/g, '').trim())
        .filter(t => t.length > 0 && t.length < 50);
    }

    // Extract age groups: "Kelompok Usia: 3-5, 5-7 tahun" or "Usia: 3–10 tahun"
    const ageMatch = raw.match(/(?:Kelompok\s*)?Usia\s*:\s*(.+)/i);
    if (ageMatch) {
      const ageText = ageMatch[1];
      const validAges = ['3-5', '5-7', '7-10', '10-13'];
      for (const age of validAges) {
        if (ageText.includes(age) || ageText.includes(age.replace('-', '–'))) {
          result.ageGroups.push(age);
        }
      }
      // Handle range like "3–10" → includes 3-5, 5-7, 7-10
      const rangeMatch = ageText.match(/(\d+)[–\-](\d+)/);
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

  // ═══════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════

  private mapContentType(type: string): ContentType {
    const map: Record<string, ContentType> = {
      QNA: ContentType.QNA,
      ARTICLE: ContentType.ARTICLE,
      PEMBELAJARAN: ContentType.PEMBELAJARAN,
      KISAH: ContentType.KISAH,
    };
    return map[type.toUpperCase()] || ContentType.QNA;
  }
}
