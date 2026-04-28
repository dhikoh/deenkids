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

  @Get(':slug')
  @ApiOperation({ summary: 'Get specific content details by slug' })
  async getContentDetail(@Param('slug') slug: string) {
    return this.contentService.getContentDetail(slug);
  }
}

