import { Controller, Get, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PageContentService } from './page-content.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Pages')
@Controller()
export class PageContentController {
  constructor(private readonly pageContentService: PageContentService) {}

  // ── Public endpoint ──
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get public page content by slug' })
  async getPublicPage(@Param('slug') slug: string) {
    return this.pageContentService.getBySlug(slug);
  }

  // ── Admin endpoint ──
  @Get('admin/pages/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get page content for admin editing' })
  async getPageForEdit(@Param('slug') slug: string) {
    return this.pageContentService.getBySlug(slug);
  }

  @Put('admin/pages/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update page content (SuperAdmin only)' })
  async updatePage(@Param('slug') slug: string, @Body() body: { title?: string; content?: any }, @Req() req: any) {
    return this.pageContentService.updatePage(slug, body, req.user.id);
  }
}
