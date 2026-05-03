import { Controller, Post, Get, Put, Param, Body, Query, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { StorageService } from '../common/storage/storage.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

@ApiTags('Public')
@Controller('content')
export class PublicFormController {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private storageService: StorageService,
  ) {}

  @Post('donation/submit')
  @ApiOperation({ summary: 'Submit donation with optional proof upload' })
  @UseInterceptors(FileInterceptor('proof', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg)$/)) {
        return cb(new Error('Hanya file gambar (jpg, png, webp) yang diperbolehkan'), false);
      }
      cb(null, true);
    },
  }))
  async submitDonation(
    @Body() body: { name: string; amount: string; method: string; message?: string },
    @UploadedFile() file?: any,
  ) {
    let proofUrl: string | null = null;
    if (file) {
      proofUrl = await this.storageService.uploadFile(
        file.buffer,
        file.mimetype,
        file.originalname,
        'proofs',
      );
    }

    const donation = await this.prisma.donationSubmission.create({
      data: {
        name: body.name,
        amount: parseInt(body.amount) || 0,
        method: body.method,
        message: body.message,
        proofUrl,
      },
    });

    // Notify superadmins
    await this.notificationService.notifySuperAdmins(
      null,
      NotificationType.DONATION_RECEIVED,
      'Donasi Baru Masuk! 🎉',
      `${body.name} mengirim donasi Rp ${parseInt(body.amount).toLocaleString('id-ID')} via ${body.method}`,
      '/admin/donation-inbox',
    );

    return { message: 'Terima kasih! Donasi Anda akan segera diverifikasi.', data: donation };
  }

  @Get('donation/testimonials')
  @ApiOperation({ summary: 'Get verified donations for public display' })
  async getTestimonials() {
    const donations = await this.prisma.donationSubmission.findMany({
      where: { isVerified: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { name: true, amount: true, method: true, message: true, createdAt: true },
    });
    return { data: donations };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback / kritik & saran' })
  async submitFeedback(@Body() body: { name: string; email?: string; type: string; message: string }) {
    const feedback = await this.prisma.feedbackSubmission.create({
      data: {
        name: body.name,
        email: body.email,
        type: (body.type?.toUpperCase() || 'SARAN') as any,
        message: body.message,
      },
    });

    await this.notificationService.notifySuperAdmins(
      null,
      NotificationType.FEEDBACK_RECEIVED,
      `Feedback Baru: ${body.type}`,
      `${body.name}: "${body.message.substring(0, 100)}..."`,
      '/admin/feedback',
    );

    return { message: 'Terima kasih atas masukan Anda!' };
  }
}

// ─── Admin Donation + Feedback Controllers ───
@ApiTags('Admin Donation & Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminInboxController {
  constructor(private prisma: PrismaService) {}

  @Get('donation/submissions')
  @Roles('ADMIN', 'SUPERADMIN')
  async getDonationSubmissions(@Query('page') page?: string) {
    const limit = 20;
    const skip = ((parseInt(page || '1') || 1) - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.donationSubmission.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.donationSubmission.count(),
    ]);
    return { data, meta: { total, page: parseInt(page || '1'), limit, totalPages: Math.ceil(total / limit) } };
  }

  @Put('donation/submissions/:id/verify')
  @Roles('SUPERADMIN')
  async verifyDonation(@Param('id') id: string, @Req() req: any) {
    await this.prisma.donationSubmission.update({
      where: { id },
      data: { isVerified: true, verifiedAt: new Date(), verifiedBy: req.user.id },
    });
    return { message: 'Donasi berhasil diverifikasi' };
  }

  @Get('donation/report')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Financial report — total donations by month' })
  async getDonationReport() {
    const all = await this.prisma.donationSubmission.findMany({
      where: { isVerified: true },
      select: { amount: true, createdAt: true, method: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalAmount = all.reduce((sum, d) => sum + d.amount, 0);
    const totalCount = all.length;

    // Group by month
    const byMonth: Record<string, { total: number; count: number }> = {};
    for (const d of all) {
      const key = `${d.createdAt.getFullYear()}-${String(d.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { total: 0, count: 0 };
      byMonth[key].total += d.amount;
      byMonth[key].count++;
    }

    return { totalAmount, totalCount, byMonth };
  }

  @Get('feedback')
  @Roles('ADMIN', 'SUPERADMIN')
  async getFeedback(@Query('page') page?: string, @Query('search') search?: string) {
    const limit = 20;
    const skip = ((parseInt(page || '1') || 1) - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.feedbackSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.feedbackSubmission.count({ where }),
    ]);
    return { data, meta: { total, page: parseInt(page || '1'), limit, totalPages: Math.ceil(total / limit) } };
  }

  @Put('feedback/:id/read')
  @Roles('ADMIN', 'SUPERADMIN')
  async markFeedbackRead(@Param('id') id: string) {
    await this.prisma.feedbackSubmission.update({ where: { id }, data: { isRead: true } });
    return { message: 'Feedback ditandai sudah dibaca' };
  }

  // ── Public Settings (no auth) ──
  @Get('settings/public')
  @ApiOperation({ summary: 'Get public site settings (donation, announcement)' })
  async getPublicSettings() {
    const keys = ['donation_enabled', 'donation_title', 'donation_message', 'donation_methods', 'announcement_enabled', 'announcement_text', 'announcement_type', 'announcement_link'];
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const get = (k: string) => settings.find(s => s.key === k)?.value;
    return {
      donation: {
        enabled: get('donation_enabled') === 'true',
        title: get('donation_title') || 'Dukung Adably 🌱',
        message: get('donation_message') || '',
        methods: get('donation_methods') ? JSON.parse(get('donation_methods')!) : [],
      },
      announcement: {
        enabled: get('announcement_enabled') === 'true',
        text: get('announcement_text') || '',
        type: get('announcement_type') || 'info',
        link: get('announcement_link') || '',
      },
    };
  }
}
