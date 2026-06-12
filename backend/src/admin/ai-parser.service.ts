import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentType, ContentStatus } from '@prisma/client';
import slugify from 'slugify';

interface ParsedBlock {
  type: string;
  [key: string]: any;
}

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
  /** Raw Gemini output — the service will parse blocks from this */
  rawContent?: string;
  /** Pre-parsed blocks (if frontend already parsed them) */
  blocks?: ParsedBlock[];
  /** QNA-specific fields */
  answerQuick?: string;
}

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // Save Content — creates DRAFT from parsed payload
  // ═══════════════════════════════════════════════════════════════

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

    // Step 2: Create Detail based on Type
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

    // Step 3: Handle tags
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

    this.logger.log(`AI Content parsed and saved: ${content.id} (${content.type})`);
    return {
      success: true,
      data: { id: content.id, title: content.title, status: content.status, type: content.type },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Parse Raw Gemini Output into Blocks
  // ═══════════════════════════════════════════════════════════════

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

    let cleaned = this.stripMarkdown(raw);
    const lines = cleaned.split('\n');
    const markerPositions: { type: string; lineIndex: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const m = trimmed.match(/^[^a-zA-Z0-9]*\((\w+)\)[^a-zA-Z0-9]*$/);
      if (m) {
        const type = m[1].toLowerCase();
        if (AiParserService.VALID_TYPES.includes(type)) {
          markerPositions.push({ type, lineIndex: i });
        }
      }
    }

    if (markerPositions.filter(m => m.type !== 'opening' && m.type !== 'closing').length < 2) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const sepCount = (line.match(/[\u2501\u2550\u2500\u254C]/g) || []).length;
        if (sepCount >= 2) {
          const upper = line.toUpperCase();
          for (const [keyword, blockType] of Object.entries(AiParserService.HEADER_TYPE_MAP)) {
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

    const merged: ParsedBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type === 'heading' && blocks[i].text) {
        if (i + 1 < blocks.length && blocks[i + 1].type === 'paragraph') {
          blocks[i + 1].heading = blocks[i].text;
          continue;
        }
      }
      merged.push(blocks[i]);
    }
    const finalBlocks = merged;

    if (finalBlocks.length === 0 && raw.trim()) {
      finalBlocks.push({ type: 'paragraph', text: this.stripMarkdown(raw).trim() });
    }

    return finalBlocks;
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/^---+\s*$/gm, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2')
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

  extractMetaFromRaw(raw: string): { openingText?: string; closingText?: string } {
    const result: { openingText?: string; closingText?: string } = {};
    const lines = raw.split('\n');

    let openingLineIdx = -1;
    let closingLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const m = trimmed.match(/^[^a-zA-Z0-9]*\((opening|closing)\)[^a-zA-Z0-9]*$/i);
      if (m) {
        const type = m[1].toLowerCase();
        if (type === 'opening') openingLineIdx = i;
        if (type === 'closing') closingLineIdx = i;
      }
    }

    if (openingLineIdx >= 0) {
      const contentStart = openingLineIdx + 1;
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

    if (closingLineIdx >= 0) {
      const text = lines.slice(closingLineIdx + 1).join('\n').trim();
      if (text) result.closingText = text;
    }

    return result;
  }

  private extractGeminiMetadata(raw: string): { description: string; tags: string[]; ageGroups: string[] } {
    const result = { description: '', tags: [] as string[], ageGroups: [] as string[] };

    const descMatch = raw.match(/(?:Deskripsi(?:\s*Singkat)?)\s*:\s*(.+)/i);
    if (descMatch) {
      result.description = descMatch[1].replace(/^[\["'""]+|[\]"'""]+$/g, '').trim();
    }

    const tagMatch = raw.match(/Tag\s*:\s*(.+)/i);
    if (tagMatch) {
      result.tags = tagMatch[1]
        .split(/[,ØŒ]/)
        .map(t => t.replace(/^[\["'""]+|[\]"'""]+$/g, '').trim())
        .filter(t => t.length > 0 && t.length < 50);
    }

    const ageMatch = raw.match(/(?:Kelompok\s*)?Usia\s*:\s*(.+)/i);
    if (ageMatch) {
      const ageText = ageMatch[1];
      const validAges = ['3-5', '5-7', '7-10', '10-13'];
      for (const age of validAges) {
        if (ageText.includes(age) || ageText.includes(age.replace('-', 'â€“'))) {
          result.ageGroups.push(age);
        }
      }
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
