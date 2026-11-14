import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { AuthUser } from '../types/express';

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Authentication token is required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { sub: string; email: string; role: any };

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        role: true,
        username: true,
        fullName: true,
        employeeId: true,
        department: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: Account is inactive or user not found',
      });
      return;
    }

    req.user = user as AuthUser;

    // RBAC GUARD (Requirement 9 & 11): HOD role has strictly Read-Only surveillance permissions.
    // HOD can monitor all modules, users, and activities, but CANNOT add, edit, delete, assign, approve, or modify data.
    const isHOD =
      user.role === 'HOD' ||
      (user.role === 'ADMIN' &&
        (user.username === 'admin.office' ||
          user.employeeId?.includes('HOD') ||
          user.fullName?.toUpperCase().includes('HOD')));
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (isHOD && isMutation) {
      const url = req.originalUrl || req.url || '';
      // Allow logging an audit activity, logout, and document deletion approval/rejection only
      const isAllowedAudit = url.includes('/audit');
      const isAllowedLogout = url.includes('/auth/logout');
      const isAllowedDocApproval =
        url.includes('/approve-deletion') || url.includes('/reject-deletion');

      if (!isAllowedAudit && !isAllowedLogout && !isAllowedDocApproval) {
        res.status(403).json({
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Forbidden: HOD role has strictly Read-Only surveillance permissions across Citi Pharma LIMS. Adding, editing, deleting, assigning, approving, or modifying data is strictly prohibited.',
        });
        return;
      }
    }

    next();
  } catch (err: any) {
    res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Invalid or expired token',
    });
  }
}
