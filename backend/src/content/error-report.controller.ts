import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { SubmitErrorReportDto } from './dto/error-report.dto';

// Valid categories — prevent garbage data
const VALID_CATEGORIES = ['JS_ERROR', 'REACT_CRASH', 'API_ERROR', 'PROMISE_REJECT'];

// ─── Public endpoint: receive error reports from frontend ───
@ApiTags('Error Reporting')
@Controller('error-report')
export class ErrorReportPublicController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 reports per minute per IP
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit frontend error report (public, rate-limited)' })
  async submitErrorReport(@Body() dto: SubmitErrorReportDto) {
    // Fields are already validated by DTO + ValidationPipe
    const message = dto.message.substring(0, 1000);
    const stack = dto.stack || null;
    const source = dto.source || null;
    const userAgent = dto.userAgent || null;
    const userId = dto.userId || null;
    const category = VALID_CATEGORIES.includes(dto.category || '') ? dto.category! : 'JS_ERROR';
    const httpStatus = typeof dto.httpStatus === 'number' ? dto.httpStatus : null;

    // Create fingerprint from message + source to group identical errors
    const fingerprint = createHash('sha256')
      .update(`${message}|${source || ''}|${category}`)
      .digest('hex')
      .substring(0, 64);

    // Upsert: if same error already exists, increment count
    await this.prisma.errorReport.upsert({
      where: { fingerprint },
      update: {
        occurrences: { increment: 1 },
        lastSeenAt: new Date(),
        // Update stack/userAgent with latest data
        ...(stack && { stack }),
        ...(userAgent && { userAgent }),
        ...(userId && { userId }),
        ...(httpStatus && { httpStatus }),
        isResolved: false, // Re-open if previously resolved
      },
      create: {
        fingerprint,
        message,
        stack,
        source,
        userAgent,
        userId,
        category,
        httpStatus,
      },
    });

    return { ok: true };
  }
}

// ─── Admin endpoint: view and manage error reports ───
@ApiTags('Error Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/error-reports')
export class ErrorReportAdminController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'List error reports with pagination, filters, and sorting' })
  async listErrors(
    @Query('page') page?: string,
    @Query('resolved') resolved?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const limit = 20;
    const skip = ((parseInt(page || '1') || 1) - 1) * limit;
    const where: any = {};

    if (resolved === 'true') where.isResolved = true;
    else if (resolved === 'false') where.isResolved = false;

    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy === 'occurrences'
      ? { occurrences: 'desc' as const }
      : { lastSeenAt: 'desc' as const };

    const [data, total, unresolvedCount] = await Promise.all([
      this.prisma.errorReport.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.errorReport.count({ where }),
      this.prisma.errorReport.count({ where: { isResolved: false } }),
    ]);

    return {
      data,
      unresolvedCount,
      meta: {
        page: parseInt(page || '1'),
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('stats')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Get error report summary stats' })
  async getStats() {
    const [total, unresolved, last24h, apiErrors] = await Promise.all([
      this.prisma.errorReport.count(),
      this.prisma.errorReport.count({ where: { isResolved: false } }),
      this.prisma.errorReport.count({
        where: { lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.errorReport.count({
        where: { category: 'API_ERROR', isResolved: false },
      }),
    ]);
    return { total, unresolved, last24h, apiErrors };
  }

  @Put(':id/resolve')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Mark error as resolved' })
  async resolveError(@Param('id') id: string) {
    await this.prisma.errorReport.update({
      where: { id },
      data: { isResolved: true },
    });
    return { message: 'Error ditandai resolved' };
  }

  @Put(':id/reopen')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Reopen a resolved error' })
  async reopenError(@Param('id') id: string) {
    await this.prisma.errorReport.update({
      where: { id },
      data: { isResolved: false },
    });
    return { message: 'Error dibuka kembali' };
  }

  @Put('resolve-all')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Mark all errors as resolved' })
  async resolveAll() {
    const result = await this.prisma.errorReport.updateMany({
      where: { isResolved: false },
      data: { isResolved: true },
    });
    return { message: `${result.count} error ditandai resolved` };
  }

  @Delete(':id')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Delete a single error report' })
  async deleteError(@Param('id') id: string) {
    await this.prisma.errorReport.delete({ where: { id } });
    return { message: 'Error dihapus' };
  }

  @Delete('bulk/resolved')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Delete all resolved error reports' })
  async deleteResolved() {
    const result = await this.prisma.errorReport.deleteMany({
      where: { isResolved: true },
    });
    return { message: `${result.count} error resolved dihapus` };
  }
}
