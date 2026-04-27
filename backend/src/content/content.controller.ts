import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Public Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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
  async getList(
    @Query('age') age?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
  ) {
    return this.contentService.getList({ age, sort, page });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get specific content details by slug' })
  async getContentDetail(@Param('slug') slug: string) {
    return this.contentService.getContentDetail(slug);
  }
}
