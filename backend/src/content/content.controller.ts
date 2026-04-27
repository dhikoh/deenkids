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

  @Get(':slug')
  @ApiOperation({ summary: 'Get specific content details by slug' })
  async getContentDetail(@Param('slug') slug: string) {
    return this.contentService.getContentDetail(slug);
  }
}
