import { prisma } from '../config/prisma';

export class AuditService {
  async findAll(query: {
    entityName?: string;
    action?: string;
    limit?: number;
    role?: string;
    userId?: string;
    performedByName?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const where: any = {};
    if (query.entityName && query.entityName !== 'ALL') {
      where.entityName = query.entityName;
    }
    if (query.action && query.action !== 'ALL') {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.role && query.role !== 'ALL') {
      where.role = { contains: query.role, mode: 'insensitive' };
    }
    if (query.userId && query.userId !== 'ALL') {
      where.performedById = query.userId;
    }
    if (query.performedByName) {
      where.performedByName = { contains: query.performedByName, mode: 'insensitive' };
    }
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }
    if (query.search) {
      where.OR = [
        { performedByName: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityName: { contains: query.search, mode: 'insensitive' } },
        { reasonForChange: { contains: query.search, mode: 'insensitive' } },
      ];
    }

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
            username: true,
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
