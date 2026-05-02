import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/auth.dto';

/** Maximum concurrent sessions per user */
const MAX_SESSIONS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    
    // Generate Tokens
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Save refresh token to DB
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // ── Session limit enforcement (non-blocking) ──
    try {
      const allTokens = await this.prisma.refreshToken.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (allTokens.length > MAX_SESSIONS) {
        const tokensToDelete = allTokens.slice(MAX_SESSIONS).map(t => t.id);
        await this.prisma.refreshToken.deleteMany({
          where: { id: { in: tokensToDelete } },
        });
        this.logger.log(`🔒 Pruned ${tokensToDelete.length} old sessions for user ${user.id}`);
      }

      // Record login in history (non-blocking)
      await this.prisma.loginHistory.create({
        data: { userId: user.id, ip: ip || null, userAgent: userAgent || null },
      }).catch(err => this.logger.warn(`Login history failed: ${err.message}`));

      // Keep only last 50 login records per user
      const historyCount = await this.prisma.loginHistory.count({ where: { userId: user.id } });
      if (historyCount > 50) {
        const oldest = await this.prisma.loginHistory.findMany({
          where: { userId: user.id },
          orderBy: { loginAt: 'asc' },
          take: historyCount - 50,
          select: { id: true },
        });
        await this.prisma.loginHistory.deleteMany({
          where: { id: { in: oldest.map(h => h.id) } },
        });
      }
    } catch (err) {
      this.logger.warn(`Session management error (non-fatal): ${err.message}`);
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh token rotation: invalidate old token, issue new pair.
   * Prevents token reuse attacks — if a stolen token is used after rotation,
   * the legitimate user's session will have already invalidated it.
   */
  async refreshTokens(oldRefreshToken: string) {
    // 1. Verify JWT signature
    let payload: any;
    try {
      payload = this.jwtService.verify(oldRefreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau sudah expired');
    }

    // 2. Check token exists in DB (not yet revoked)
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { token: oldRefreshToken, userId: payload.sub },
    });

    if (!storedToken) {
      // Token reuse detected — invalidate ALL user's refresh tokens (security measure)
      await this.prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
      throw new UnauthorizedException('Token reuse terdeteksi. Semua sesi telah di-logout untuk keamanan.');
    }

    // 3. Delete the old token (rotation)
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // 4. Fetch current user data (role may have changed)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // 5. Generate new token pair
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = this.jwtService.sign(newPayload);
    const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

    // 6. Store new refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
    return { success: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Password saat ini salah');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens on password change (security)
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Password berhasil diubah. Silahkan login ulang.' };
  }
}
