import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

// Role hierarchy: SUPERADMIN > ADMIN > AUTHOR
const ROLE_LEVEL: Record<string, number> = { AUTHOR: 1, ADMIN: 2, SUPERADMIN: 3 };

function assertCanManage(callerRole: string, targetRole: string, label = 'mengelola') {
  if (ROLE_LEVEL[callerRole] <= ROLE_LEVEL[targetRole]) {
    throw new ForbiddenException(`Anda tidak dapat ${label} user dengan role ${targetRole}`);
  }
}

function getAllowedRoles(callerRole: string): string[] {
  if (callerRole === 'SUPERADMIN') return ['AUTHOR', 'ADMIN'];
  if (callerRole === 'ADMIN') return ['AUTHOR'];
  return [];
}

@ApiTags('User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UserManagementController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Req() req: any) {
    const caller = req.user;
    const users = await this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true, bio: true,
        bankName: true, bankAccount: true, bankHolder: true, points: true,
        _count: { select: { contentItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Admin cannot see SuperAdmin details
    if (caller.role === 'ADMIN') {
      return users.map(u => u.role === 'SUPERADMIN' ? { ...u, email: '***', phone: '***', bankName: null, bankAccount: null, bankHolder: null } : u);
    }
    return users;
  }

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Create new user' })
  async createUser(@Req() req: any, @Body() body: { name: string; email: string; phone?: string; role: string; password: string }) {
    const caller = req.user;
    const allowed = getAllowedRoles(caller.role);
    if (!allowed.includes(body.role)) {
      throw new ForbiddenException(`Anda hanya dapat membuat user dengan role: ${allowed.join(', ')}`);
    }
    if (!body.name || !body.email || !body.password) throw new BadRequestException('Nama, email, dan password wajib diisi');
    if (body.password.length < 6) throw new BadRequestException('Password minimal 6 karakter');

    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new BadRequestException('Email sudah terdaftar');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(body.password, salt);

    const user = await this.prisma.user.create({
      data: { name: body.name, email: body.email, phone: body.phone || null, role: body.role as any, passwordHash },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    return { data: user, message: `User ${body.name} berhasil dibuat` };
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Update user details (name, email, phone, role, bank)' })
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; email?: string; phone?: string; role?: string; bankName?: string; bankAccount?: string; bankHolder?: string }) {
    const caller = req.user;
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User tidak ditemukan');

    // Cannot edit yourself via this endpoint (use /admin/profile)
    if (target.id === caller.id) throw new ForbiddenException('Gunakan halaman Profil untuk mengedit akun sendiri');

    // Check hierarchy: caller must be higher rank than target
    assertCanManage(caller.role, target.role, 'mengedit');

    // If changing role, validate allowed roles
    if (body.role && body.role !== target.role) {
      const allowed = getAllowedRoles(caller.role);
      if (!allowed.includes(body.role)) {
        throw new ForbiddenException(`Anda hanya dapat mengubah role ke: ${allowed.join(', ')}`);
      }
    }

    // If changing email, check uniqueness
    if (body.email && body.email !== target.email) {
      const dup = await this.prisma.user.findUnique({ where: { email: body.email } });
      if (dup) throw new BadRequestException('Email sudah digunakan user lain');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.role && { role: body.role as any }),
        ...(body.bankName !== undefined && { bankName: body.bankName || null }),
        ...(body.bankAccount !== undefined && { bankAccount: body.bankAccount || null }),
        ...(body.bankHolder !== undefined && { bankHolder: body.bankHolder || null }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, bankName: true, bankAccount: true, bankHolder: true },
    });
    return { data: updated, message: 'User berhasil diperbarui' };
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    const caller = req.user;
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User tidak ditemukan');
    if (target.id === caller.id) throw new ForbiddenException('Tidak dapat menghapus diri sendiri');
    assertCanManage(caller.role, target.role, 'menghapus');

    await this.prisma.user.delete({ where: { id } });
    return { message: `User ${target.name} berhasil dihapus` };
  }

  @Put(':id/reset-password')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Reset user password to random string' })
  async resetPassword(@Req() req: any, @Param('id') id: string) {
    const caller = req.user;
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User tidak ditemukan');
    assertCanManage(caller.role, target.role, 'mereset password');

    const newPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { newPassword, message: `Password ${target.name} berhasil direset` };
  }

  @Put(':id/set-password')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Set custom password for user (SuperAdmin only)' })
  async setPassword(@Req() req: any, @Param('id') id: string, @Body() body: { password: string }) {
    const caller = req.user;
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User tidak ditemukan');
    assertCanManage(caller.role, target.role, 'mengatur password');

    if (!body.password || body.password.length < 6) throw new BadRequestException('Password minimal 6 karakter');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(body.password, salt);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { message: `Password ${target.name} berhasil diubah` };
  }
}
