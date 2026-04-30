import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Re-export JwtAuthGuard from its canonical location for backward compatibility
export { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No specific role required, just valid JWT
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) return false;

    // Role Hierarchy: SUPERADMIN > ADMIN > AUTHOR
    const hierarchy: Record<string, number> = {
      SUPERADMIN: 3,
      ADMIN: 2,
      AUTHOR: 1,
    };

    const userLevel = hierarchy[user.role] || 0;

    return requiredRoles.some(
      (role) => userLevel >= (hierarchy[role] || 99),
    );
  }
}
