import { Controller, Get, Post, Res, UseGuards, UseInterceptors, UploadedFile, Body, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

@ApiTags('Export, Import & Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
@Controller('superadmin')
export class ExportImportController {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════

  @Get('export')
  @ApiOperation({ summary: 'Export all data as JSON' })
  async exportData(@Res() res: Response) {
    const [users, settings, contentNodes, contentTags, contentItems, contentItemTags, authorStats, pointLedgers, rewards] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, phone: true, bio: true, bankName: true, bankAccount: true, bankHolder: true, points: true, locale: true } }),
      this.prisma.setting.findMany(),
      this.prisma.contentNode.findMany(),
      this.prisma.contentTag.findMany(),
      this.prisma.contentItem.findMany({
        include: { qnaDetail: true, articleDetail: true, mediaDetail: true, tags: true },
      }),
      this.prisma.contentItemTag.findMany(),
      this.prisma.authorStat.findMany(),
      this.prisma.pointLedger.findMany(),
      this.prisma.reward.findMany(),
    ]);

    const exportData = {
      version: '8.0',
      exportedAt: new Date().toISOString(),
      users, settings, contentNodes, contentTags, contentItems, contentItemTags, authorStats, pointLedgers, rewards,
    };

    const filename = `adably-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  }

  // ═══════════════════════════════════════
  // IMPORT
  // ═══════════════════════════════════════

  @Post('import')
  @ApiOperation({ summary: 'Import data from JSON' })
  @UseInterceptors(FileInterceptor('file'))
  async importData(@UploadedFile() file: Express.Multer.File, @Body() body: { mode?: string }) {
    if (!file) throw new Error('File wajib diupload');
    const data = JSON.parse(file.buffer.toString());
    const mode = body.mode || 'skip'; // 'overwrite' | 'skip'

    let stats = { users: 0, settings: 0, nodes: 0, tags: 0, content: 0 };

    // 1. Users (by email)
    for (const u of data.users || []) {
      const existing = await this.prisma.user.findUnique({ where: { email: u.email } });
      if (existing && mode === 'skip') continue;
      if (existing && mode === 'overwrite') {
        await this.prisma.user.update({ where: { email: u.email }, data: { name: u.name, role: u.role, phone: u.phone, bio: u.bio, bankName: u.bankName, bankAccount: u.bankAccount, bankHolder: u.bankHolder, points: u.points || 0 } });
      } else if (!existing) {
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('adably123', 10);
        await this.prisma.user.create({ data: { ...u, passwordHash: hash, id: undefined } });
      }
      stats.users++;
    }

    // 2. Settings (by key)
    for (const s of data.settings || []) {
      const existing = await this.prisma.setting.findUnique({ where: { key: s.key } });
      if (existing && mode === 'skip') continue;
      await this.prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value, group: s.group }, create: { key: s.key, value: s.value, group: s.group } });
      stats.settings++;
    }

    // 3. Content Nodes (by slug)
    for (const n of data.contentNodes || []) {
      const existing = await this.prisma.contentNode.findUnique({ where: { slug: n.slug } });
      if (existing && mode === 'skip') continue;
      await this.prisma.contentNode.upsert({
        where: { slug: n.slug },
        update: { title: n.title, description: n.description, icon: n.icon, type: n.type, order: n.order, ageGroups: n.ageGroups },
        create: { title: n.title, slug: n.slug, description: n.description, icon: n.icon, type: n.type, order: n.order, ageGroups: n.ageGroups },
      });
      stats.nodes++;
    }

    // 4. Tags (by slug)
    for (const t of data.contentTags || []) {
      const existing = await this.prisma.contentTag.findUnique({ where: { slug: t.slug } });
      if (existing && mode === 'skip') continue;
      await this.prisma.contentTag.upsert({ where: { slug: t.slug }, update: { name: t.name, usageCount: t.usageCount }, create: { name: t.name, slug: t.slug, usageCount: t.usageCount } });
      stats.tags++;
    }

    // 5. Content Items (by slug) — simplified, tags handled separately
    for (const c of data.contentItems || []) {
      const existing = await this.prisma.contentItem.findUnique({ where: { slug: c.slug } });
      if (existing && mode === 'skip') continue;
      // Remap authorId by email
      const author = await this.prisma.user.findFirst({ where: { role: { in: ['AUTHOR', 'ADMIN', 'SUPERADMIN'] } } });
      if (!author) continue;
      const { qnaDetail, articleDetail, mediaDetail, tags, ...itemData } = c;
      const cleanData = { ...itemData, id: undefined, authorId: author.id };
      await this.prisma.contentItem.upsert({
        where: { slug: c.slug },
        update: { title: cleanData.title, description: cleanData.description, viewCount: cleanData.viewCount, likeCount: cleanData.likeCount, avgRating: cleanData.avgRating },
        create: cleanData,
      });
      stats.content++;
    }

    return { message: `Import selesai. Users: ${stats.users}, Settings: ${stats.settings}, Nodes: ${stats.nodes}, Tags: ${stats.tags}, Content: ${stats.content}` };
  }

  // ═══════════════════════════════════════
  // DATABASE BACKUP
  // ═══════════════════════════════════════

  @Get('backup/list')
  @ApiOperation({ summary: 'List backup files' })
  async listBackups() {
    const dir = join(process.cwd(), 'backups');
    if (!existsSync(dir)) return { data: [] };
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .map(f => ({ filename: f, size: readFileSync(join(dir, f)).length, created: f.replace('adably-backup-', '').replace('.sql', '') }))
      .sort((a, b) => b.created.localeCompare(a.created));
    return { data: files };
  }

  @Get('backup/download/:filename')
  @ApiOperation({ summary: 'Download a backup file' })
  async downloadBackup(@Res() res: Response, @Query('filename') filename: string) {
    const filepath = join(process.cwd(), 'backups', filename);
    if (!existsSync(filepath)) throw new Error('Backup tidak ditemukan');
    res.download(filepath);
  }

  @Post('backup/trigger')
  @ApiOperation({ summary: 'Trigger manual backup' })
  async triggerBackup() {
    const dir = join(process.cwd(), 'backups');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const filename = `adably-backup-${new Date().toISOString().slice(0, 10)}.sql`;
    const filepath = join(dir, filename);
    const dbUrl = process.env.DATABASE_URL || '';

    try {
      execSync(`pg_dump "${dbUrl}" > "${filepath}"`, { timeout: 60000 });
      return { message: `Backup berhasil: ${filename}` };
    } catch (e: any) {
      return { message: `Backup gagal: ${e.message}. Gunakan Export JSON sebagai alternatif.` };
    }
  }

  // ═══════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════

  @Get('audit-log')
  @ApiOperation({ summary: 'List audit logs' })
  async getAuditLogs(@Query('page') page?: string, @Query('action') action?: string) {
    const take = 30;
    const skip = ((page ? parseInt(page) : 1) - 1) * take;
    const where = action ? { action } : {};
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { page: page ? parseInt(page) : 1, totalPages: Math.ceil(total / take), total } };
  }

  @Get('audit-log/export-csv')
  @ApiOperation({ summary: 'Export audit log as CSV' })
  async exportAuditCSV(@Res() res: Response) {
    const logs = await this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 });
    const header = 'Waktu,User ID,Aksi,Entity Type,Entity ID,Detail,IP\n';
    const rows = logs.map(l => `"${l.createdAt.toISOString()}","${l.userId || ''}","${l.action}","${l.entityType}","${l.entityId || ''}","${JSON.stringify(l.details || {}).replace(/"/g, '""')}","${l.ipAddress || ''}"`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.send(header + rows);
  }
}
