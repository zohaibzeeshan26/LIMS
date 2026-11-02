import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { entityName?: string; action?: string; limit?: number }) {
    const where: any = {};
    if (query.entityName) where.entityName = query.entityName;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };

    return this.prisma.auditTrail.findMany({
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
    return this.prisma.auditTrail.findMany({
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
    entityName: string;
    entityId: string;
    action: string;
    performedById?: string;
    performedByName: string;
    role: string;
    ipAddress?: string;
    reasonForChange?: string;
    diffPayload?: string;
  }) {
    return this.prisma.auditTrail.create({
      data: {
        entityName: data.entityName,
        entityId: data.entityId,
        action: data.action,
        performedById: data.performedById,
        performedByName: data.performedByName,
        role: data.role,
        ipAddress: data.ipAddress || '127.0.0.1',
        reasonForChange: data.reasonForChange,
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
