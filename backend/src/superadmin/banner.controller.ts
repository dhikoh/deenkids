import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { RolesGuard, JwtAuthGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Sponsor Banners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('superadmin/banners')
export class BannerController {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  @Get()
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'List all banners' })
  async listBanners() {
    const data = await this.prisma.sponsorBanner.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    return { data };
  }

  @Post()
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Create a new banner with image upload — stored in MinIO' })
  @UseInterceptors(FileInterceptor('image', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\//)) {
        return cb(new BadRequestException('Hanya file gambar yang diperbolehkan'), false);
      }
      cb(null, true);
    },
  }))
  async createBanner(@Body() body: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Gambar wajib diupload');

    const imageUrl = await this.storageService.uploadFile(
      file.buffer,
      file.mimetype,
      file.originalname,
      'banners',
    );

    const banner = await this.prisma.sponsorBanner.create({
      data: {
        title: body.title || 'Sponsor Banner',
        imageUrl,
        linkUrl: body.linkUrl || null,
        isActive: body.isActive === 'true' || body.isActive === true,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        priority: parseInt(body.priority) || 0,
        notes: body.notes || null,
      },
    });
    return { data: banner };
  }

  @Put(':id')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update banner details' })
  async updateBanner(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.priority !== undefined) data.priority = parseInt(body.priority) || 0;
    if (body.notes !== undefined) data.notes = body.notes;

    const banner = await this.prisma.sponsorBanner.update({ where: { id }, data });
    return { data: banner };
  }

  @Put(':id/toggle')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Toggle banner active/inactive' })
  async toggleBanner(@Param('id') id: string) {
    const existing = await this.prisma.sponsorBanner.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Banner tidak ditemukan');
    const banner = await this.prisma.sponsorBanner.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return { data: banner };
  }

  @Delete(':id')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Delete a banner and its image from MinIO' })
  async deleteBanner(@Param('id') id: string) {
    const existing = await this.prisma.sponsorBanner.findUnique({ where: { id } });
    if (existing?.imageUrl) {
      await this.storageService.deleteFile(existing.imageUrl);
    }
    await this.prisma.sponsorBanner.delete({ where: { id } });
    return { message: 'Banner dihapus' };
  }
}
