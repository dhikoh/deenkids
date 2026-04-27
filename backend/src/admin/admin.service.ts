import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewAction } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getReviewQueue(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: { status: 'REVIEW' },
        include: { author: { select: { name: true } } },
        orderBy: { updatedAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.contentItem.count({ where: { status: 'REVIEW' } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reviewContent(contentId: string, reviewerId: string, action: ReviewAction, notes?: string, manualScore?: number) {
    const content = await this.prisma.contentItem.findUnique({
      where: { id: contentId },
      include: { aiCheckResults: { orderBy: { checkedAt: 'desc' }, take: 1 } }
    });

    if (!content) throw new NotFoundException('Content not found');
    
    // Anti-bias rule: Admin cannot review their own content
    if (content.authorId === reviewerId) {
      throw new ForbiddenException('You cannot review your own content');
    }

    const aiCheck = content.aiCheckResults[0];
    const aiAssisted = !!aiCheck;
    const aiScore = aiCheck ? aiCheck.score : null;

    let newStatus = content.status;
    if (action === 'APPROVED') newStatus = 'PUBLISHED';
    else if (action === 'REJECTED') newStatus = 'REJECTED' as any; // Assuming REJECTED is in enum, wait it's not. It's ARCHIVED or DRAFT? Let's use DRAFT for rejected.
    else if (action === 'REVISION_REQUESTED') newStatus = 'REVISION';

    if (action === 'REJECTED') newStatus = 'DRAFT'; // Assuming 'REJECTED' isn't a ContentStatus, we revert to DRAFT.

    await this.prisma.$transaction([
      this.prisma.contentItem.update({
        where: { id: contentId },
        data: { 
          status: newStatus,
          publishedAt: newStatus === 'PUBLISHED' ? new Date() : null
        },
      }),
      this.prisma.reviewHistory.create({
        data: {
          contentId,
          reviewerId,
          action,
          aiAssisted,
          aiScore,
          manualScore,
          notes,
        },
      }),
    ]);

    return { message: `Content successfully ${action.toLowerCase()}` };
  }
}
