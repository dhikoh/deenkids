import { Controller, Post, UseGuards, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@ApiTags('System')
@Controller('seed')
export class SeedController {
  private readonly logger = new Logger(SeedController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Run database seed (SuperAdmin only)' })
  async triggerSeed() {
    const existingContent = await this.prisma.contentNode.count();
    if (existingContent > 4) {
      return { message: 'Database sudah memiliki data. Seed dibatalkan untuk menghindari duplikat.' };
    }

    this.logger.log('🌱 Seed triggered by SuperAdmin');
    // Seed logic lives in prisma/seed.ts — run via CLI: npx prisma db seed
    return {
      message: 'Gunakan CLI untuk seed lengkap: npx prisma db seed. Endpoint ini hanya untuk validasi.',
    };
  }

  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize first SuperAdmin (only works if no users exist)' })
  async initFirstAdmin() {
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      return { message: 'Users already exist. Init blocked.' };
    }

    const hashedPassword = await bcrypt.hash(
      process.env.INIT_ADMIN_PASSWORD || 'ChangeMe123!',
      10,
    );

    await this.prisma.user.create({
      data: {
        name: 'Super Admin',
        email: process.env.INIT_ADMIN_EMAIL || 'admin@adably.id',
        passwordHash: hashedPassword,
        role: 'SUPERADMIN',
      },
    });

    this.logger.log('✅ First SuperAdmin created via /seed/init');
    return {
      message: 'SuperAdmin created. Login with the credentials set in INIT_ADMIN_EMAIL and INIT_ADMIN_PASSWORD env vars.',
    };
  }
}
