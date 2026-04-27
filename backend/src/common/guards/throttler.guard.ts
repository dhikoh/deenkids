import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Skip throttling for CORS preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return true;
    }
    return false;
  }
}
