import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Authentication required',
      });
      return;
    }

    const userRole = (req.user as any)?.role;
    if (allowedRoles.length > 0) {
      if (userRole === Role.SUPER_ADMIN) {
        return next();
      }
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          statusCode: 403,
          message: `Forbidden: Access requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${userRole}`,
        });
        return;
      }
    }

    next();
  };
}

