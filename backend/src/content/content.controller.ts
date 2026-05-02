import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ContentService } from './content.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Public Content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('tree')
  @ApiOperation({ summary: 'Get Content Curriculum Tree' })
  @ApiQuery({ name: 'age', required: false, description: 'Filter by age group e.g. 3-5' })
  async getTree(@Query('age') age?: string) {
    return this.contentService.getTree(age);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get sorted and filtered list of contents' })
  @ApiQuery({ name: 'age', required: false })
  @ApiQuery({ name: 'sort', required: false, description: 'newest, most_read, most_liked, top_rated, popular' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getList(
    @Query('age') age?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return this.contentService.getList({ age, sort, page, type, search, limit });
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all content tags' })
  async getTags() {
    const tags = await this.prisma.contentTag.findMany({
      orderBy: { usageCount: 'desc' },
      take: 50,
    });
    return { data: tags };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search content by query' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'age', required: false })
  @ApiQuery({ name: 'page', required: false })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('age') age?: string,
    @Query('page') page?: string,
  ) {
    if (!q || q.length < 2) return { data: [], meta: { total: 0 } };
    const take = 20;
    const skip = ((page ? parseInt(page) : 1) - 1) * take;
    const where: any = {
      status: 'PUBLISHED',
      deletedAt: null,
    };
    // Search + age filter combined with AND
    const conditions: any[] = [];
    if (q) {
      conditions.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] });
    }
    if (type) where.type = type;
    if (age) {
      conditions.push({ ageGroups: { has: age } });
    }
    if (conditions.length > 0) where.AND = conditions;

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where, take, skip,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, title: true, slug: true, description: true, type: true, nodeId: true, ageGroups: true, viewCount: true, likeCount: true, avgRating: true, publishedAt: true },
      }),
      this.prisma.contentItem.count({ where }),
    ]);
    return { data, meta: { page: page ? parseInt(page) : 1, totalPages: Math.ceil(total / take), total } };
  }

  @Get('donation')
  @ApiOperation({ summary: 'Get public donation settings' })
  async getDonation() {
    const [enabled, title, message, methods] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'donation_enabled' } }),
      this.prisma.setting.findUnique({ where: { key: 'donation_title' } }),
      this.prisma.setting.findUnique({ where: { key: 'donation_message' } }),
      this.prisma.setting.findUnique({ where: { key: 'donation_methods' } }),
    ]);
    return {
      enabled: enabled?.value === 'true',
      title: title?.value || 'Dukung Adably 🌱',
      message: message?.value || '',
      methods: methods?.value ? JSON.parse(methods.value) : [],
    };
  }

  @Get('announcement')
  @ApiOperation({ summary: 'Get active announcement banner' })
  async getAnnouncement() {
    const [enabled, text, type, link] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: 'announcement_enabled' } }),
      this.prisma.setting.findUnique({ where: { key: 'announcement_text' } }),
      this.prisma.setting.findUnique({ where: { key: 'announcement_type' } }),
      this.prisma.setting.findUnique({ where: { key: 'announcement_link' } }),
    ]);
    return {
      enabled: enabled?.value === 'true',
      text: text?.value || '',
      type: type?.value || 'info',
      link: link?.value || '',
    };
  }

  @Get('ai-status')
  @ApiOperation({ summary: 'Get global AI checker status (public, no auth)' })
  async getAiStatus() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'ai_checker_enabled' } });
    return { aiEnabled: setting?.value === 'true' };
  }

  @Get('banners/active')
  @ApiOperation({ summary: 'Get active sponsor banners for public display' })
  async getActiveBanners() {
    const now = new Date();
    const banners = await this.prisma.sponsorBanner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, imageUrl: true, linkUrl: true },
    });
    // Increment impressions
    if (banners.length > 0) {
      await this.prisma.sponsorBanner.updateMany({
        where: { id: { in: banners.map(b => b.id) } },
        data: { impressions: { increment: 1 } },
      });
    }
    return { data: banners };
  }

  @Post('banners/:id/click')
  @ApiOperation({ summary: 'Track banner click' })
  async trackBannerClick(@Param('id') id: string) {
    await this.prisma.sponsorBanner.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    }).catch(() => {});
    return { ok: true };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Get multiple contents by IDs (for bookmarks)' })
  async getBatch(@Body() body: { ids: string[] }) {
    if (!body.ids || body.ids.length === 0) return { data: [] };
    const items = await this.prisma.contentItem.findMany({
      where: { id: { in: body.ids.slice(0, 50) }, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, title: true, slug: true, description: true, type: true, ageGroups: true, viewCount: true, likeCount: true, avgRating: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    return { data: items };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get specific content details by slug' })
  async getContentDetail(@Param('slug') slug: string) {
    return this.contentService.getContentDetail(slug);
  }
}
