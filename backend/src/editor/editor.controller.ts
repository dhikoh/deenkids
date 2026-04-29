import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { EditorService } from './editor.service';
import { CreateContentDto, UpdateContentDto } from './dto/editor.dto';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('CMS Editor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('editor')
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  @Post('content')
  @ApiOperation({ summary: 'Create new content (QnA/Article/Media) with AI Check' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async createContent(@Req() req: any, @Body() dto: CreateContentDto) {
    return this.editorService.createContent(req.user.id, dto);
  }

  @Get('my-contents')
  @ApiOperation({ summary: 'Get all content items created by the logged-in user' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  async getMyContents(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.editorService.getMyContents(req.user.id, status, page ? parseInt(page) : 1);
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get a single content item for editing' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async getContentForEdit(@Req() req: any, @Param('id') id: string) {
    return this.editorService.getContentForEdit(req.user.id, req.user.role, id);
  }

  @Put('content/:id')
  @ApiOperation({ summary: 'Update an existing content item' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async updateContent(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.editorService.updateContent(req.user.id, req.user.role, id, dto);
  }

  @Delete('content/:id')
  @ApiOperation({ summary: 'Delete a content item (only drafts or own content)' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async deleteContent(@Req() req: any, @Param('id') id: string) {
    return this.editorService.deleteContent(req.user.id, req.user.role, id);
  }

  @Post('content/:id/submit')
  @ApiOperation({ summary: 'Submit content for review' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async submitForReview(@Req() req: any, @Param('id') id: string) {
    return this.editorService.submitForReview(req.user.id, id);
  }

  @Get('nodes')
  @ApiOperation({ summary: 'Get all content nodes for dropdown selection' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async getNodes() {
    return this.editorService.getNodes();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all available tags' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async getTags() {
    return this.editorService.getTags();
  }
}
