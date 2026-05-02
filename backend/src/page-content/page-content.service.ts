import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeText, sanitizeJsonDeep } from '../common/utils/sanitize.util';

@Injectable()
export class PageContentService {
  constructor(private prisma: PrismaService) {}

  async getBySlug(slug: string) {
    const page = await this.prisma.pageContent.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException(`Halaman "${slug}" tidak ditemukan`);
    return { data: page };
  }

  async updatePage(slug: string, data: { title?: string; content?: any }, userId: string) {
    const existing = await this.prisma.pageContent.findUnique({ where: { slug } });

    const sanitizedTitle = data.title ? sanitizeText(data.title) : undefined;
    const sanitizedContent = data.content ? sanitizeJsonDeep(data.content) : undefined;

    if (existing) {
      const updated = await this.prisma.pageContent.update({
        where: { slug },
        data: {
          ...(sanitizedTitle && { title: sanitizedTitle }),
          ...(sanitizedContent && { content: sanitizedContent }),
          updatedBy: userId,
        },
      });
      return { data: updated, message: 'Halaman berhasil diperbarui' };
    }

    // Create if not exists (upsert behavior)
    const created = await this.prisma.pageContent.create({
      data: {
        slug,
        title: sanitizedTitle || slug,
        content: sanitizedContent || {},
        updatedBy: userId,
      },
    });
    return { data: created, message: 'Halaman berhasil dibuat' };
  }

  async ensureDefaults() {
    const defaults = [
      {
        slug: 'about',
        title: 'Tentang Adably',
        content: {
          sections: [
            { type: 'hero', title: 'Tentang Adably', subtitle: 'Platform Edukasi Parenting Islami' },
            { type: 'text', title: 'Misi Kami', body: 'Membantu orang tua Muslim mendidik anak sesuai nilai-nilai Islam melalui konten yang terstruktur, terpercaya, dan mudah dipahami.' },
            { type: 'text', title: 'Visi', body: 'Menjadi platform rujukan utama parenting Islami di Indonesia yang mengedepankan nilai Al-Quran dan Sunnah.' },
          ],
        },
      },
      {
        slug: 'contact',
        title: 'Kontak CS',
        content: {
          whatsapp: '',
          displayName: 'CS Adably',
          defaultMessage: 'Assalamualaikum, saya ingin bertanya tentang Adably.',
          isActive: false,
        },
      },
    ];

    for (const d of defaults) {
      const exists = await this.prisma.pageContent.findUnique({ where: { slug: d.slug } });
      if (!exists) {
        await this.prisma.pageContent.create({ data: d });
      }
    }
  }
}
