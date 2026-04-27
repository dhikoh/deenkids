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
          username: 'superadmin',
          email: 'admin@deenkids.com',
          password_hash: hashedPassword,
          role: 'SUPERADMIN',
          full_name: 'DeenKids SuperAdmin',
          is_active: true,
        },
      });

      // Create basic curriculum node
      const tauhidNode = await this.prisma.contentNode.create({
        data: {
          id: uuidv4(),
          title: 'Tauhid & Aqidah',
          slug: 'tauhid-aqidah',
          description: 'Mengenal Allah dan rukun iman',
          node_type: 'CATEGORY',
          age_group: 'SEMUA',
          order_index: 1,
          is_active: true,
        }
      });

      // Create sample content
      await this.prisma.contentItem.create({
        data: {
          id: uuidv4(),
          node_id: tauhidNode.id,
          title: 'Apakah Allah melihat saat aku sembunyi?',
          slug: 'apakah-allah-melihat-saat-sembunyi',
          type: 'QNA',
          status: 'PUBLISHED',
          author_id: superadmin.id,
          content_blocks: JSON.stringify([
            {
              id: '1',
              type: 'text',
              content: 'Tentu saja nak, Allah melihat semua yang kita lakukan karena Allah adalah Al-Bashiir (Maha Melihat).'
            }
          ]),
          meta_title: 'Apakah Allah melihat?',
          meta_desc: 'Penjelasan tauhid untuk anak usia 5-7 tahun',
          view_count: 150,
          like_count: 45,
          bookmark_count: 12,
          avg_rating: 4.8,
          rating_count: 5,
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
