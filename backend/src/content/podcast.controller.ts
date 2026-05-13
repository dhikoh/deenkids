import { Controller, Get, Put, Body, Res, Logger, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Podcast')
@Controller('podcast')
export class PodcastController {
  private readonly logger = new Logger(PodcastController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get podcast settings (SUPERADMIN only)
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get podcast settings' })
  async getSettings() {
    let settings = await this.prisma.podcastConfig.findFirst({ where: { id: 'default' } });
    if (!settings) {
      settings = await this.prisma.podcastConfig.create({ data: { id: 'default' } });
    }
    const apiUrl = this.config.get<string>('FRONTEND_URL')?.replace('adably.id', 'api.adably.id') || '';
    return { ...settings, feedUrl: `${apiUrl}/api/podcast/feed.xml` };
  }

  /**
   * Update podcast settings (SUPERADMIN only)
   */
  @Put('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Update podcast settings' })
  async updateSettings(@Body() body: { title?: string; description?: string; author?: string; coverUrl?: string; language?: string; category?: string; isActive?: boolean }) {
    return this.prisma.podcastConfig.upsert({
      where: { id: 'default' },
      update: body,
      create: { id: 'default', ...body },
    });
  }

  /**
   * Public RSS feed — this is what Spotify/Apple/Google crawls
   */
  @Get('feed.xml')
  @ApiOperation({ summary: 'Podcast RSS feed (iTunes/Spotify compatible) — public endpoint' })
  async getFeed(@Res() res: Response) {
    const siteUrl = this.config.get<string>('FRONTEND_URL') || 'https://adably.id';

    // Load settings from DB
    let settings = await this.prisma.podcastConfig.findFirst({ where: { id: 'default' } });
    if (!settings) {
      settings = await this.prisma.podcastConfig.create({ data: { id: 'default' } });
    }

    if (!settings.isActive) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Feed Inactive</title></channel></rss>');
      return;
    }

    const podcastImage = settings.coverUrl || `${siteUrl}/icon-512.png`;

    // Fetch all published content with audio
    const contents = await this.prisma.contentItem.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        enableAudio: true,
        audioUrl: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 200,
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
        node: { select: { title: true, slug: true } },
      },
    });

    const typeLabel: Record<string, string> = {
      QNA: 'Tanya Jawab',
      PEMBELAJARAN: 'Pembelajaran',
      KISAH: 'Kisah',
      ARTICLE: 'Artikel',
    };

    // Build episode items
    const items = contents.map(c => {
      const pubDate = c.publishedAt ? new Date(c.publishedAt).toUTCString() : new Date(c.updatedAt).toUTCString();
      const category = typeLabel[c.type] || c.type;
      const ageLabel = (c.ageGroups || []).join(', ');
      const desc = c.description || `${category} untuk anak usia ${ageLabel} tahun`;
      const author = c.author?.name || settings!.author;
      const typeSlug = c.type === 'QNA' ? 'qna' : c.type === 'ARTICLE' ? 'artikel' : c.type === 'KISAH' ? `kisah/${c.node?.slug || 'cerita'}` : 'pembelajaran';
      const link = `${siteUrl}/${typeSlug}/${c.slug}`;
      const image = c.thumbnailUrl || podcastImage;

      return `    <item>
      <title><![CDATA[${c.title}]]></title>
      <description><![CDATA[${desc}]]></description>
      <link>${link}</link>
      <guid isPermaLink="false">${c.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${c.audioUrl}" type="audio/mpeg" />
      <itunes:title><![CDATA[${c.title}]]></itunes:title>
      <itunes:author>${this.escapeXml(author)}</itunes:author>
      <itunes:summary><![CDATA[${desc}]]></itunes:summary>
      <itunes:image href="${image}" />
      <itunes:duration>0</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:keywords>${category}, ${ageLabel} tahun, Islam, anak</itunes:keywords>
      <itunes:episodeType>full</itunes:episodeType>
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
    <title>${this.escapeXml(settings.title)}</title>
    <description><![CDATA[${settings.description}]]></description>
    <link>${siteUrl}</link>
    <language>${settings.language}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl.replace('adably.id', 'api.adably.id')}/api/podcast/feed.xml" rel="self" type="application/rss+xml" />
    <itunes:author>${this.escapeXml(settings.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${this.escapeXml(settings.author)}</itunes:name>
      <itunes:email>adably.id@gmail.com</itunes:email>
    </itunes:owner>
    <itunes:image href="${podcastImage}" />
    <itunes:category text="${this.escapeXml(settings.category)}">
      <itunes:category text="Islam" />
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <copyright>© ${new Date().getFullYear()} ${this.escapeXml(settings.author)}</copyright>
${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
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
