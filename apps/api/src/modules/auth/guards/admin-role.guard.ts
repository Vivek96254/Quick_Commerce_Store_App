import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ADMIN_ROLES_KEY = 'adminRoles';

/**
 * Decorator to restrict endpoints to specific admin sub-roles.
 * Works alongside the existing @Roles('ADMIN', 'SUPER_ADMIN') guard.
 * SUPER_ADMIN always has access. ADMIN users are checked against their adminRole.
 */
export const AdminRoles = (...roles: string[]) =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    const metadataTarget = descriptor ? descriptor.value : target;
    Reflect.defineMetadata(ADMIN_ROLES_KEY, roles, metadataTarget);
    return descriptor ?? target;
  };

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAdminRoles = this.reflector.getAllAndOverride<string[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No admin-role restriction → allow
    if (!requiredAdminRoles || requiredAdminRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // SUPER_ADMIN always passes
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // ADMIN users — check their adminRole field
    if (user.role === 'ADMIN') {
      if (!user.adminRole) {
        throw new ForbiddenException(
          'Admin role not assigned. Contact a super-admin.',
        );
      }

      if (!requiredAdminRoles.includes(user.adminRole)) {
        throw new ForbiddenException(
          `Requires one of: ${requiredAdminRoles.join(', ')}`,
        );
      }

      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
