import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/profile')
export class ProfileController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get my profile' })
  async getProfile(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, bio: true, role: true, bankName: true, bankAccount: true, bankHolder: true, points: true, locale: true, createdAt: true },
    });
    return { data: user };
  }

  @Put()
  @ApiOperation({ summary: 'Update my profile' })
  async updateProfile(@Req() req: any, @Body() body: { name?: string; phone?: string; bio?: string; locale?: string }) {
    const updated = await this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.locale && { locale: body.locale }),
      },
      select: { id: true, name: true, email: true, phone: true, bio: true, locale: true },
    });
    return { data: updated, message: 'Profil berhasil diperbarui' };
  }

  @Put('bank')
  @ApiOperation({ summary: 'Update bank info for withdrawal' })
  async updateBank(@Req() req: any, @Body() body: { bankName: string; bankAccount: string; bankHolder: string }) {
    const updated = await this.prisma.user.update({
      where: { id: req.user.id },
      data: { bankName: body.bankName, bankAccount: body.bankAccount, bankHolder: body.bankHolder },
      select: { bankName: true, bankAccount: true, bankHolder: true },
    });
    return { data: updated, message: 'Data rekening berhasil diperbarui' };
  }
}
