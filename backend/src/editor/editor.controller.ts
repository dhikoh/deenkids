import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { EditorService } from './editor.service';
import { CreateContentDto } from './dto/editor.dto';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('CMS Editor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('editor')
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  @Post('content')
  @ApiOperation({ summary: 'Create new content (QnA/Article/Media) with AI Check' })
  // @Roles('EDITOR', 'ADMIN', 'SUPERADMIN')
  async createContent(@Req() req: any, @Body() dto: CreateContentDto) {
    // Req.user comes from JwtStrategy
    return this.editorService.createContent(req.user.id, dto);
  }
}
