import { Controller, Get, Param, Query } from '@nestjs/common';
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
  async getList(
    @Query('age') age?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('type') type?: string,
  ) {
    return this.contentService.getList({ age, sort, page, type });
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
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (type) where.type = type;
    if (age) where.ageGroup = age;

    const [data, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where, take, skip,
        orderBy: { publishedAt: 'desc' },
        select: { id: true, title: true, slug: true, description: true, type: true, ageGroup: true, viewCount: true, likeCount: true, avgRating: true, publishedAt: true },
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

  @Get('donation/testimonials')
  @ApiOperation({ summary: 'Get verified donation testimonials' })
  async getDonationTestimonials() {
    const data = await this.prisma.donationSubmission.findMany({
      where: { verified: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, amount: true, message: true, createdAt: true },
    });
    return { data };
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

  @Get(':slug')
  @ApiOperation({ summary: 'Get specific content details by slug' })
  async getContentDetail(@Param('slug') slug: string) {
    return this.contentService.getContentDetail(slug);
  }
}
