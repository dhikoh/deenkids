import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

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

    // Role Hierarchy: SUPERADMIN > ADMIN > EDITOR
    const hierarchy = {
      SUPERADMIN: 3,
      ADMIN: 2,
      EDITOR: 1,
    };

    const userLevel = hierarchy[user.role as keyof typeof hierarchy] || 0;
    
    // Check if user's role level is at least the level of ANY of the required roles
    return requiredRoles.some((role) => userLevel >= (hierarchy[role as keyof typeof hierarchy] || 99));
  }
}
