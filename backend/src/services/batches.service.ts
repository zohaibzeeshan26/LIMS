import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import crypto from 'crypto';

export class BatchesService {
  async findAll() {
    return prisma.batch.findMany({
      include: {
        samples: {
          select: {
            id: true,
            sampleCode: true,
            materialName: true,
            sampleType: true,
            status: true,
            tests: { select: { id: true, status: true, resultStatus: true } },
          },
        },
        coa: {
          select: {
            id: true,
            certificateNumber: true,
            status: true,
            issuedDate: true,
            authorizedBy: { select: { fullName: true } },
          },
        },
        _count: { select: { samples: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        samples: {
          include: {
            tests: {
              include: {
                testSpecification: true,
                instrument: true,
                analyst: { select: { fullName: true } },
              },
            },
            accessionedBy: { select: { fullName: true } },
          },
        },
        coa: {
          include: {
            authorizedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
          },
        },
      },
    });

    if (!batch) throw new AppError('Batch not found', 404);
    return batch;
  }

  async create(dto: any, user: any) {
    const batch = await prisma.batch.create({
      data: {
        batchNumber: dto.batchNumber,
        drugProduct: dto.drugProduct,
        dosageForm: dto.dosageForm,
        batchSize: dto.batchSize,
        manufacturingDate: new Date(dto.manufacturingDate),
        expiryDate: new Date(dto.expiryDate),
        status: 'QUARANTINE',
        notes: dto.notes,
      },
    });

    await prisma.auditTrail.create({
      data: {
        entityName: 'Batch',
        entityId: batch.id,
        action: 'BATCH_CREATED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Created production batch ${batch.batchNumber}`,
      },
    });

    return batch;
  }

  async getAllCoas() {
    return prisma.certificateOfAnalysis.findMany({
      orderBy: { issuedDate: 'desc' },
      include: {
        authorizedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            role: true,
            department: true,
          },
        },
        batch: {
          include: {
            samples: {
              include: {
                tests: {
                  include: { testSpecification: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async releaseBatch(id: string, decision: 'RELEASED' | 'REJECTED', notes: string, user: any) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        samples: {
          include: {
            tests: true,
          },
        },
      },
    });

    if (!batch) throw new AppError('Batch not found', 404);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.batch.update({
        where: { id },
        data: {
          status: decision,
          notes: notes ? `${batch.notes || ''}\n[${decision}]: ${notes}` : batch.notes,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Batch',
          entityId: batch.id,
          action: `BATCH_${decision}`,
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: notes || `Batch release decision: ${decision}`,
        },
      });

      return updated;
    });
  }

  async issueCoa(dto: any, user: any) {
    const batch = await prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        samples: {
          include: { tests: { include: { testSpecification: true } } },
        },
      },
    });

    if (!batch) throw new AppError('Batch not found', 404);

    const year = new Date().getFullYear();
    const count = await prisma.certificateOfAnalysis.count();
    const certificateNumber = `COA-${year}-${String(count + 1).padStart(4, '0')}`;
    const digitalSignatureHash = crypto
      .createHash('sha256')
      .update(`${batch.batchNumber}:${certificateNumber}:${new Date().toISOString()}`)
      .digest('hex');

    return prisma.$transaction(async (tx) => {
      const coa = await tx.certificateOfAnalysis.create({
        data: {
          batchId: batch.id,
          certificateNumber,
          signatureHash: digitalSignatureHash,
          issuedDate: new Date(),
          authorizedById: user.id,
          status: 'ISSUED',
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'CertificateOfAnalysis',
          entityId: coa.id,
          action: 'COA_ISSUED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `Issued CoA ${certificateNumber} for batch ${batch.batchNumber}`,
        },
      });

      return coa;
    });
  }
}

export const batchesService = new BatchesService();
