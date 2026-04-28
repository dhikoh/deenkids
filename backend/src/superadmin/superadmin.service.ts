import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AI_SETTING_KEY = 'ai_checker_enabled';
const DONATION_ENABLED_KEY = 'donation_enabled';
const DONATION_TITLE_KEY = 'donation_title';
const DONATION_MESSAGE_KEY = 'donation_message';
const DONATION_METHODS_KEY = 'donation_methods';

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(private prisma: PrismaService) {}

  // ── Users ──
  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        _count: { select: { contentItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['AUTHOR', 'ADMIN', 'SUPERADMIN'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('Role tidak valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, name: true, email: true, role: true },
    });

    this.logger.log(`Role updated: ${user.email} → ${role}`);
    return { data: updated, message: `Role ${user.name} berhasil diubah menjadi ${role}` };
  }

  // ── AI Config ──
  async getAiConfig() {
    const setting = await this.prisma.setting.findUnique({ where: { key: AI_SETTING_KEY } });
    return { aiEnabled: setting?.value === 'true' };
  }

  async toggleAi(enabled: boolean) {
    const setting = await this.prisma.setting.upsert({
      where: { key: AI_SETTING_KEY },
      update: { value: enabled.toString() },
      create: { key: AI_SETTING_KEY, value: enabled.toString(), group: 'ai' },
    });
    this.logger.log(`AI Toggle set to: ${enabled}`);
    return { aiEnabled: setting.value === 'true', message: 'AI Toggle updated successfully' };
  }

  // ── Donation Settings ──
  async getDonationSettings() {
    const [enabled, title, message, methods] = await Promise.all([
      this.prisma.setting.findUnique({ where: { key: DONATION_ENABLED_KEY } }),
      this.prisma.setting.findUnique({ where: { key: DONATION_TITLE_KEY } }),
      this.prisma.setting.findUnique({ where: { key: DONATION_MESSAGE_KEY } }),
      this.prisma.setting.findUnique({ where: { key: DONATION_METHODS_KEY } }),
    ]);

    return {
      enabled: enabled?.value === 'true',
      title: title?.value || 'Dukung Adably 🌱',
      message: message?.value || 'Dukung kami terus menyajikan konten parenting islami secara gratis.',
      methods: methods?.value ? JSON.parse(methods.value) : [],
    };
  }

  async updateDonationSettings(body: {
    enabled: boolean;
    title?: string;
    message?: string;
    methods?: { type: string; label: string; value: string; icon?: string }[];
  }) {
    await Promise.all([
      this.prisma.setting.upsert({
        where: { key: DONATION_ENABLED_KEY },
        update: { value: body.enabled.toString() },
        create: { key: DONATION_ENABLED_KEY, value: body.enabled.toString(), group: 'donation' },
      }),
      body.title !== undefined && this.prisma.setting.upsert({
        where: { key: DONATION_TITLE_KEY },
        update: { value: body.title },
        create: { key: DONATION_TITLE_KEY, value: body.title, group: 'donation' },
      }),
      body.message !== undefined && this.prisma.setting.upsert({
        where: { key: DONATION_MESSAGE_KEY },
        update: { value: body.message },
        create: { key: DONATION_MESSAGE_KEY, value: body.message, group: 'donation' },
      }),
      body.methods !== undefined && this.prisma.setting.upsert({
        where: { key: DONATION_METHODS_KEY },
        update: { value: JSON.stringify(body.methods) },
        create: { key: DONATION_METHODS_KEY, value: JSON.stringify(body.methods), group: 'donation' },
      }),
    ].filter(Boolean));

    this.logger.log('Donation settings updated');
    return { message: 'Pengaturan donasi berhasil disimpan' };
  }

  // ── Announcement Banner ──
  async getAnnouncementSettings() {
    const keys = ['announcement_enabled', 'announcement_text', 'announcement_type', 'announcement_link'];
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const get = (k: string) => settings.find(s => s.key === k)?.value;
    return {
      enabled: get('announcement_enabled') === 'true',
      text: get('announcement_text') || '',
      type: get('announcement_type') || 'info',
      link: get('announcement_link') || '',
    };
  }

  async updateAnnouncementSettings(body: { enabled: boolean; text?: string; type?: string; link?: string }) {
    const upsert = (key: string, value: string) => this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: 'announcement' },
    });
    await Promise.all([
      upsert('announcement_enabled', body.enabled.toString()),
      body.text !== undefined && upsert('announcement_text', body.text),
      body.type !== undefined && upsert('announcement_type', body.type),
      body.link !== undefined && upsert('announcement_link', body.link),
    ].filter(Boolean));
    this.logger.log('Announcement settings updated');
    return { message: 'Pengaturan pengumuman berhasil disimpan' };
  }
}
