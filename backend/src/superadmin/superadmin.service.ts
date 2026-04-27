import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AI_SETTING_KEY = 'ai_checker_enabled';

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

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
}
