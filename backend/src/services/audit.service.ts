import { prisma } from '../config/prisma';

export class AuditService {
  async findAll(query: { entityName?: string; action?: string; limit?: number }) {
    const where: any = {};
    if (query.entityName) where.entityName = query.entityName;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };

    return prisma.auditTrail.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(query.limit) || 100,
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            department: true,
            role: true,
          },
        },
      },
    });
  }

  async getByEntity(entityName: string, entityId: string) {
    return prisma.auditTrail.findMany({
      where: { entityName, entityId },
      orderBy: { timestamp: 'desc' },
      include: {
        performedBy: {
          select: {
            fullName: true,
            employeeId: true,
            role: true,
          },
        },
      },
    });
  }

  async create(data: {
    entityName?: string;
    entityId?: string;
    action: string;
    performedById?: string;
    performedByName: string;
    role: string;
    ipAddress?: string;
    reasonForChange?: string;
    diffPayload?: string;
  }) {
    return prisma.auditTrail.create({
      data: {
        entityName: data.entityName || 'System',
        entityId: data.entityId || 'GLOBAL',
        action: data.action,
        performedById: data.performedById,
        performedByName: data.performedByName,
        role: data.role,
        ipAddress: data.ipAddress || '127.0.0.1',
        reasonForChange: data.reasonForChange || 'Laboratory operational activity recorded',
        diffPayload: data.diffPayload,
      },
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            department: true,
            role: true,
          },
        },
      },
    });
  }
}

export const auditService = new AuditService();
