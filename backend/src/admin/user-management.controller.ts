import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@ApiTags('User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UserManagementController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Create new user' })
  async createUser(@Req() req: any, @Body() body: { name: string; email: string; phone?: string; role: string; password: string }) {
    const caller = req.user;
    // Admin cannot create SUPERADMIN
    if (caller.role === 'ADMIN' && body.role === 'SUPERADMIN') {
      throw new Error('Admin tidak dapat membuat SuperAdmin');
    }
    if (body.role === 'AUTHOR' && !body.phone) {
      throw new Error('Nomor HP wajib untuk Author');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new Error('Email sudah terdaftar');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(body.password, salt);

    const user = await this.prisma.user.create({
      data: { name: body.name, email: body.email, phone: body.phone, role: body.role as any, passwordHash },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    return { data: user, message: `User ${body.name} berhasil dibuat` };
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Update user details' })
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; email?: string; phone?: string; role?: string; bankName?: string; bankAccount?: string; bankHolder?: string }) {
    const caller = req.user;
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new Error('User tidak ditemukan');
    // Admin cannot edit SuperAdmin
    if (caller.role === 'ADMIN' && target.role === 'SUPERADMIN') {
      throw new Error('Admin tidak dapat mengedit SuperAdmin');
    }
    if (caller.role === 'ADMIN' && body.role === 'SUPERADMIN') {
      throw new Error('Admin tidak dapat mengubah role ke SuperAdmin');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.role && { role: body.role as any }),
        ...(body.bankName !== undefined && { bankName: body.bankName }),
        ...(body.bankAccount !== undefined && { bankAccount: body.bankAccount }),
        ...(body.bankHolder !== undefined && { bankHolder: body.bankHolder }),
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
    if (!target) throw new Error('User tidak ditemukan');
    if (caller.role === 'ADMIN' && target.role === 'SUPERADMIN') {
      throw new Error('Admin tidak dapat menghapus SuperAdmin');
    }
    if (target.id === caller.id) throw new Error('Tidak dapat menghapus diri sendiri');

    await this.prisma.user.delete({ where: { id } });
    return { message: `User ${target.name} berhasil dihapus` };
  }

  @Put(':id/reset-password')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(@Req() req: any, @Param('id') id: string) {
    const caller = req.user;
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new Error('User tidak ditemukan');
    if (caller.role === 'ADMIN' && target.role === 'SUPERADMIN') {
      throw new Error('Admin tidak dapat mereset password SuperAdmin');
    }

    const newPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { newPassword, message: `Password ${target.name} berhasil direset. Password baru: ${newPassword}` };
  }
}
