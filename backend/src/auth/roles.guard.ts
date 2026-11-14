import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    // ADMIN, SUPER_ADMIN, and HOD have direct access with existing authenticated session
    if (
      user.role === Role.ADMIN ||
      user.role === Role.SUPER_ADMIN ||
      (user.role as any) === 'HOD'
    ) {
      return true;
    }
    return requiredRoles.includes(user.role);
  }
}
