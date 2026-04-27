import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperadminService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAiConfig() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'AI_TOGGLE' } });
    return { aiEnabled: setting?.value === 'true' };
  }

  async toggleAi(enabled: boolean) {
    const setting = await this.prisma.setting.upsert({
      where: { key: 'AI_TOGGLE' },
      update: { value: enabled.toString() },
      create: { key: 'AI_TOGGLE', value: enabled.toString(), group: 'system' }
    });
    return { aiEnabled: setting.value === 'true', message: 'AI Toggle updated successfully' };
  }
}
