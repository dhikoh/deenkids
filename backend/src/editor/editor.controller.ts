import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EditorService } from './editor.service';
import { CreateContentDto, UpdateContentDto } from './dto/editor.dto';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageService } from '../common/storage/storage.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('CMS Editor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('editor')
export class EditorController {
  constructor(
    private readonly editorService: EditorService,
    private readonly storageService: StorageService,
  ) {}

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
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'age', required: false })
  async getMyContents(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('age') age?: string,
  ) {
    return this.editorService.getMyContents(req.user.id, status, page ? parseInt(page) : 1, search, age);
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
  @ApiOperation({ summary: 'Get content nodes for dropdown — filter by group (PEMBELAJARAN or KISAH)' })
  @ApiQuery({ name: 'group', required: false })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async getNodes(@Query('group') group?: string) {
    return this.editorService.getNodes(group);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all available tags' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async getTags() {
    return this.editorService.getTags();
  }

  // ── Image Upload — stored in MinIO object storage ──────────────────────
  @Post('upload')
  @ApiOperation({ summary: 'Upload image for content blocks — stored in MinIO object storage' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\//)) {
        return cb(new BadRequestException('Hanya file gambar yang diperbolehkan'), false);
      }
      cb(null, true);
    },
  }))
  async uploadFile(@UploadedFile() file: any): Promise<{ url: string }> {
    if (!file) throw new BadRequestException('File tidak ditemukan');
    const url = await this.storageService.uploadFile(
      file.buffer,
      file.mimetype,
      file.originalname,
      'content',
    );
    return { url };
  }

  // ── Audio Upload — stored in MinIO object storage ─────────────────────
  @Post('audio/upload')
  @ApiOperation({ summary: 'Upload audio MP3 for content narration — all roles' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @UseInterceptors(FileInterceptor('audio', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^audio\/(mpeg|mp3|mp4|ogg|wav|x-m4a|webm)/)) {
        return cb(new BadRequestException('Hanya file audio MP3/OGG/WAV yang diizinkan'), false);
      }
      cb(null, true);
    },
  }))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File audio tidak ditemukan dalam request');
    const url = await this.storageService.uploadFile(
      file.buffer,
      file.mimetype,
      file.originalname,
      'audio',
    );
    return { url, filename: file.originalname, size: file.size, message: 'Audio berhasil di-upload' };
  }

  // ═══════════════════════════════════════════════════════
  // TRASH / RECYCLE BIN
  // ═══════════════════════════════════════════════════════

  @Get('trash')
  @ApiOperation({ summary: 'Get trashed (soft-deleted) content items' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getTrash(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    return this.editorService.getTrash(req.user.id, req.user.role, page ? parseInt(page) : 1, search);
  }

  @Post('trash/:id/restore')
  @ApiOperation({ summary: 'Restore content from trash to DRAFT status' })
  @Roles('AUTHOR', 'ADMIN', 'SUPERADMIN')
  async restoreFromTrash(@Req() req: any, @Param('id') id: string) {
    return this.editorService.restoreFromTrash(req.user.id, req.user.role, id);
  }

  // Note: /trash/empty must be registered BEFORE /trash/:id to avoid route collision
  @Delete('trash/empty')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete ALL trashed items (SuperAdmin only)' })
  @Roles('SUPERADMIN')
  async emptyTrash(@Req() req: any) {
    return this.editorService.emptyTrash(req.user.id, req.user.role);
  }

  @Delete('trash/:id')
  @ApiOperation({ summary: 'Permanently delete a single trashed item (SuperAdmin only)' })
  @Roles('SUPERADMIN')
  async permanentlyDelete(@Req() req: any, @Param('id') id: string) {
    return this.editorService.permanentlyDelete(req.user.id, req.user.role, id);
  }
}
