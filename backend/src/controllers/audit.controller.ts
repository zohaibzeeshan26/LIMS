import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        entityName,
        action,
        limit,
        role,
        userId,
        performedByName,
        startDate,
        endDate,
        search,
      } = req.query;

      const result = await auditService.findAll({
        entityName: entityName as string,
        action: action as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        role: role as string,
        userId: userId as string,
        performedByName: performedByName as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getByEntity(req: Request, res: Response, next: NextFunction) {
    try {
      const { entityName, entityId } = req.params;
      const result = await auditService.getByEntity(entityName as string, entityId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const ipAddress = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      const body = req.body || {};

      const result = await auditService.create({
        entityName: body.entityName || 'System',
        entityId: body.entityId || user?.id || 'GLOBAL',
        action: body.action || 'OPERATIONAL_ACTION',
        performedById: user?.id,
        performedByName: body.performedByName || user?.fullName || user?.username || 'Staff User',
        role: body.role || user?.role || 'QC_ANALYST',
        ipAddress,
        reasonForChange: body.reasonForChange || 'Laboratory operational activity recorded',
        diffPayload: typeof body.diffPayload === 'object' ? JSON.stringify(body.diffPayload) : body.diffPayload,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
