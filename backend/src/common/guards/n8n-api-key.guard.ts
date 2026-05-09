import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that validates the X-N8N-API-Key header against the
 * 'n8n_api_key' entry in the Setting table.
 * Used exclusively by the N8nController endpoints.
 */
@Injectable()
export class N8nApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(N8nApiKeyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-n8n-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Header X-N8N-API-Key wajib disertakan');
    }

    const setting = await this.prisma.setting.findUnique({
      where: { key: 'n8n_api_key' },
    });

    if (!setting || !setting.value) {
      this.logger.warn('n8n_api_key belum dikonfigurasi di Setting');
      throw new UnauthorizedException('n8n API key belum dikonfigurasi');
    }

    if (apiKey !== setting.value) {
      throw new UnauthorizedException('n8n API key tidak valid');
    }

    return true;
  }
}
