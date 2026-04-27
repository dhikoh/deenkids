import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiCheckerService } from './ai-checker.service';
import { CreateContentDto, UpdateContentDto } from './dto/editor.dto';
import slugify from 'slugify';

@Injectable()
export class EditorService {
  constructor(
    private prisma: PrismaService,
    private aiChecker: AiCheckerService,
  ) {}

  async createContent(authorId: string, dto: CreateContentDto) {
    const slug = slugify(dto.title, { lower: true, strict: true });
    
    // Check if slug exists
    const existing = await this.prisma.contentItem.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('Judul sudah digunakan (slug duplicate)');

    let aiResult = null;

    // Optional AI Validation
    if (dto.useAiChecker) {
      aiResult = await this.aiChecker.validateContent(dto);
      if (aiResult.score < 70) {
        // We can either block it or save as draft with issues
      }
    }

    const content = await this.prisma.contentItem.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        type: dto.type,
        status: dto.status || 'DRAFT',
        ageGroup: dto.ageGroup,
        nodeId: dto.nodeId,
        authorId,
        metaTitle: dto.metaTitle,
        metaDesc: dto.metaDesc,
      },
    });

    // Create Detail based on Type
    if (dto.type === 'QNA' && dto.qnaDetail) {
      await this.prisma.qnaDetail.create({
        data: {
          contentId: content.id,
          question: dto.qnaDetail.question,
          answerQuick: dto.qnaDetail.answerQuick,
          dialogBlocks: dto.qnaDetail.dialogBlocks || [],
          dalilBlocks: dto.qnaDetail.dalilBlocks || [],
          analogyBlocks: dto.qnaDetail.analogyBlocks || [],
          tipsBlocks: dto.qnaDetail.tipsBlocks || [],
        },
      });
    } else if (dto.type === 'ARTICLE' && dto.articleDetail) {
      await this.prisma.articleDetail.create({
        data: {
          contentId: content.id,
          coverUrl: dto.articleDetail.coverUrl,
          blocks: dto.articleDetail.blocks || [],
        },
      });
    }

    // Save AI Result History
    if (aiResult) {
      await this.prisma.aiCheckResult.create({
        data: {
          contentId: content.id,
          score: aiResult.score,
          breakdown: aiResult.breakdown,
          issues: aiResult.issues,
          suggestions: aiResult.suggestions,
        },
      });
    }

    return content;
  }
}
