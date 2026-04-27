import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

@Controller('seed')
export class SeedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async triggerSeed(@Res() res: Response) {
    try {
      // Cek apakah SuperAdmin sudah ada
      const existingAdmin = await this.prisma.user.findFirst({
        where: { role: 'SUPERADMIN' }
      });

      if (existingAdmin) {
        return res.status(HttpStatus.OK).json({ message: 'Database already seeded. SuperAdmin exists.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash('DeenKidsAdmin2026!', 10);

      // Create SuperAdmin
      const superadmin = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          name: 'DeenKids SuperAdmin',
          email: 'admin@deenkids.com',
          passwordHash: hashedPassword,
          role: 'SUPERADMIN',
        },
      });

      // Create basic curriculum node
      const tauhidNode = await this.prisma.contentNode.create({
        data: {
          id: uuidv4(),
          title: 'Tauhid & Aqidah',
          slug: 'tauhid-aqidah',
          description: 'Mengenal Allah dan rukun iman',
          type: 'CATEGORY',
          ageGroups: ['SEMUA'],
          order: 1,
          isActive: true,
        }
      });

      // Create sample content
      await this.prisma.contentItem.create({
        data: {
          id: uuidv4(),
          nodeId: tauhidNode.id,
          title: 'Apakah Allah melihat saat aku sembunyi?',
          slug: 'apakah-allah-melihat-saat-sembunyi',
          type: 'QNA',
          status: 'PUBLISHED',
          authorId: superadmin.id,
          ageGroup: '5-7',
          metaTitle: 'Apakah Allah melihat?',
          metaDesc: 'Penjelasan tauhid untuk anak usia 5-7 tahun',
          viewCount: 150,
          likeCount: 45,
          bookmarkCount: 12,
          avgRating: 4.8,
          ratingCount: 5,
        }
      });

      return res.status(HttpStatus.CREATED).json({ 
        message: 'Seed executed successfully!',
        credentials: {
          email: 'admin@deenkids.com',
          password: 'DeenKidsAdmin2026!'
        }
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
        message: 'Seed failed', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
}
