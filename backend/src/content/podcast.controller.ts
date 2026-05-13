import { Controller, Get, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Podcast')
@Controller('podcast')
export class PodcastController {
  private readonly logger = new Logger(PodcastController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get('feed.xml')
  @ApiOperation({ summary: 'Podcast RSS feed (iTunes/Spotify compatible) — public endpoint' })
  async getFeed(@Res() res: Response) {
    const siteUrl = this.config.get<string>('FRONTEND_URL') || 'https://adably.id';
    const podcastTitle = 'Adably — Edukasi Islam Anak. Dengan adab kita membangun peradaban islami';
    const podcastDescription = 'Konten edukasi Islam untuk anak usia 3-13 tahun. Kisah Islami, tanya jawab, pembelajaran, dan artikel — semuanya disajikan dengan cara yang menyenangkan dan sesuai Al-Quran & Sunnah.';
    const podcastAuthor = 'Adably';
    const podcastEmail = 'adably.id@gmail.com';
    const podcastLanguage = 'id';
    const podcastCategory = 'Religion &amp; Spirituality';
    const podcastSubCategory = 'Islam';
    const podcastImage = `${siteUrl}/icon-512.png`;

    // Fetch all published content with audio
    const contents = await this.prisma.contentItem.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        enableAudio: true,
        audioUrl: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        type: true,
        audioUrl: true,
        thumbnailUrl: true,
        ageGroups: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true } },
        node: { select: { title: true } },
      },
    });

    const typeLabel: Record<string, string> = {
      QNA: 'Tanya Jawab',
      PEMBELAJARAN: 'Pembelajaran',
      KISAH: 'Kisah',
      ARTICLE: 'Artikel',
    };

    // Build RSS XML
    const items = contents.map(c => {
      const pubDate = c.publishedAt ? new Date(c.publishedAt).toUTCString() : new Date(c.updatedAt).toUTCString();
      const category = typeLabel[c.type] || c.type;
      const ageLabel = (c.ageGroups || []).join(', ');
      const desc = this.escapeXml(c.description || `${category} untuk anak usia ${ageLabel} tahun`);
      const title = this.escapeXml(c.title);
      const author = this.escapeXml(c.author?.name || podcastAuthor);
      const link = `${siteUrl}/${c.type === 'QNA' ? 'qna' : c.type === 'ARTICLE' ? 'artikel' : c.type === 'KISAH' ? 'kisah' : 'pembelajaran'}/${c.slug}`;
      const image = c.thumbnailUrl || podcastImage;

      return `    <item>
      <title>${title}</title>
      <description><![CDATA[${desc}]]></description>
      <link>${link}</link>
      <guid isPermaLink="false">${c.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${c.audioUrl}" type="audio/mpeg" />
      <itunes:title>${title}</itunes:title>
      <itunes:author>${author}</itunes:author>
      <itunes:summary><![CDATA[${desc}]]></itunes:summary>
      <itunes:image href="${image}" />
      <itunes:duration>0</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:keywords>${category}, ${ageLabel} tahun, Islam, anak</itunes:keywords>
    </item>`;
    }).join('\n');

    const lastBuildDate = contents.length > 0
      ? new Date(contents[0].publishedAt || contents[0].updatedAt).toUTCString()
      : new Date().toUTCString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${this.escapeXml(podcastTitle)}</title>
    <description><![CDATA[${podcastDescription}]]></description>
    <link>${siteUrl}</link>
    <language>${podcastLanguage}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/api/podcast/feed.xml" rel="self" type="application/rss+xml" />
    <itunes:author>${podcastAuthor}</itunes:author>
    <itunes:owner>
      <itunes:name>${podcastAuthor}</itunes:name>
      <itunes:email>${podcastEmail}</itunes:email>
    </itunes:owner>
    <itunes:image href="${podcastImage}" />
    <itunes:category text="${podcastCategory}">
      <itunes:category text="${podcastSubCategory}" />
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    res.send(xml);

    this.logger.log(`📡 Podcast RSS feed served: ${contents.length} episodes`);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
