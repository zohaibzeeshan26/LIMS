import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { SampleQueryDto } from './dto/sample-query.dto';
import { SampleStatus, SubmissionStatus, Priority, Role } from '@prisma/client';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class SamplesService {
  constructor(private prisma: PrismaService) {}

  async generateSampleCode(
    laboratory?: string,
    stageOrType?: string,
    explicitSection?: string
  ): Promise<string> {
    let labPrefix = 'GL';
    const rawLab = (laboratory || '').toString().toUpperCase();
    if (rawLab === 'PENICILLIN' || rawLab === 'PEN' || rawLab === 'PL') {
      labPrefix = 'PEN';
    } else if (rawLab === 'CEPHALOSPORIN' || rawLab === 'CEPH' || rawLab === 'CP' || rawLab === 'SAF' || rawLab === 'SEF') {
      labPrefix = 'CEPH';
    } else {
      labPrefix = 'GL';
    }

    let secPrefix = 'SB';
    const s = ((explicitSection || stageOrType) || '').toString().toLowerCase();

    if (
      s === 'formulation' ||
      s.includes('[formulation]') ||
      s.includes('finish') ||
      s.includes('coat') ||
      s.includes('fill') ||
      s.includes('packag') ||
      s.includes('stabilit')
    ) {
      secPrefix = 'F';
    } else {
      secPrefix = 'SB';
    }

    const prefix = `${labPrefix}/${secPrefix}-`;

    const existingSamples = await this.prisma.sample.findMany({
      where: {
        OR: [
          { sampleCode: { startsWith: `${labPrefix}/${secPrefix}` } },
          { sampleId: { startsWith: `${labPrefix}/${secPrefix}` } },
          { recordNumber: { startsWith: `${labPrefix}/${secPrefix}` } },
        ],
      },
      select: { sampleCode: true, sampleId: true, recordNumber: true },
    });

    const regex = new RegExp(`^${labPrefix}\\/${secPrefix}[-\\/](\\d+)$`, 'i');
    let maxNumber = 0;

    for (const item of existingSamples) {
      const candidates = [item.sampleCode, item.sampleId, item.recordNumber].filter(Boolean);
      for (const cand of candidates) {
        const match = cand!.trim().match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}${nextNumber}`;
  }

  async generateRecordNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.sample.count();
    const sequence = (count + 1).toString().padStart(4, '0');
    return `REC-${year}-${sequence}`;
  }

  async generateAccessionNo(
    laboratory?: string,
    stageType?: string,
    section?: string
  ): Promise<string> {
    const sec = (section || '').toString().toLowerCase();
    const st = (stageType || '').toString().toLowerCase();
    let secPrefix = 'SB';
    if (
      sec.includes('form') ||
      sec.includes('fm') ||
      st.includes('[formulation]') ||
      st.includes('finish') ||
      st.includes('coat') ||
      st.includes('fill') ||
      st.includes('packag') ||
      st.includes('stabilit')
    ) {
      secPrefix = 'F';
    }

    const lab = (laboratory || 'GENERAL').toString().toUpperCase();
    let labPrefix = 'GL';
    if (lab === 'SEF' || lab === 'SAF' || lab === 'CP' || lab.includes('CEPH')) {
      labPrefix = 'CEPH';
    } else if (lab.includes('PEN')) {
      labPrefix = 'PEN';
    }

    const existingSamples = await this.prisma.sample.findMany({
      where: {
        OR: [
          { sampleCode: { startsWith: `${labPrefix}/${secPrefix}` } },
          { sampleId: { startsWith: `${labPrefix}/${secPrefix}` } },
          { recordNumber: { startsWith: `${labPrefix}/${secPrefix}` } },
          ...(secPrefix === 'SB'
            ? [
                { stageType: { contains: '[Semi Basics]', mode: 'insensitive' as const } },
                { stageType: { contains: '[Semi Basic]', mode: 'insensitive' as const } },
              ]
            : [
                { stageType: { contains: '[Formulation]', mode: 'insensitive' as const } },
              ]),
        ],
      },
      select: { sampleCode: true, sampleId: true, recordNumber: true, accessionNo: true },
    });

    const codeRegex = new RegExp(`^(${labPrefix}|CP|PL|GL)\\/${secPrefix}[-\\/](\\d+)$`, 'i');
    const accRegex = /^A-(\d+)$/i;
    let maxNumber = 0;

    for (const item of existingSamples) {
      const candidates = [item.sampleCode, item.sampleId, item.recordNumber].filter(Boolean);
      for (const cand of candidates) {
        const match = cand!.trim().match(codeRegex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
      if (item.accessionNo) {
        const matchAcc = item.accessionNo.trim().match(accRegex);
        if (matchAcc && matchAcc[1]) {
          const num = parseInt(matchAcc[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `A-${nextNumber.toString().padStart(4, '0')}`;
  }

  private async resolveLaboratory(laboratoryId?: string, laboratoryNameOrCode?: string) {
    if (laboratoryId) {
      const lab = await this.prisma.laboratory.findUnique({ where: { id: laboratoryId } });
      if (lab) return lab;
    }

    if (laboratoryNameOrCode) {
      const u = laboratoryNameOrCode.toUpperCase();
      let searchCode = laboratoryNameOrCode;
      if (u === 'PENICILLIN' || u === 'PEN' || u === 'PL') searchCode = 'PEN';
      else if (u === 'CEPHALOSPORIN' || u === 'CEPH' || u === 'SAF' || u === 'SEF' || u === 'CP') searchCode = 'CEPH';
      else if (u === 'GENERAL' || u === 'GEN' || u === 'GL') searchCode = 'GEN';

      const lab = await this.prisma.laboratory.findFirst({
        where: {
          OR: [
            { code: { equals: searchCode, mode: 'insensitive' } },
            { code: { equals: laboratoryNameOrCode, mode: 'insensitive' } },
            { name: { contains: laboratoryNameOrCode, mode: 'insensitive' } },
          ],
        },
      });
      if (lab) return lab;
    }

    // Default to General Lab if available
    const defaultLab = await this.prisma.laboratory.findFirst({
      where: { code: 'GEN' },
    });
    return defaultLab;
  }

  async create(createSampleDto: CreateSampleDto, user: any) {
    // 1. Uniqueness Policy Enforcement
    const targetSampleId = (createSampleDto.sampleId || createSampleDto.sampleCode)?.trim();
    if (targetSampleId) {
      const existing = await this.prisma.sample.findFirst({
        where: {
          OR: [{ sampleId: targetSampleId }, { sampleCode: targetSampleId }],
        },
      });
      if (existing) {
        throw new ConflictException(
          `Duplicate Sample ID '${targetSampleId}' violates uniqueness policy. Sample ID must be globally unique across all laboratories.`,
        );
      }
    }

    const stageType = (createSampleDto.stageType || createSampleDto.sampleType || 'Finished Product').toString().trim();
    const sampleId =
      targetSampleId ||
      (await this.generateSampleCode(
        (createSampleDto as any).laboratoryType || createSampleDto.laboratory,
        stageType,
        (createSampleDto as any).section
      ));
    const recordNumber =
      createSampleDto.recordNumber?.trim() ||
      createSampleDto.accessionNo?.trim() ||
      (await this.generateRecordNumber());
    const accessionNo =
      createSampleDto.accessionNo?.trim() ||
      (await this.generateAccessionNo(
        (createSampleDto as any).laboratoryType || createSampleDto.laboratory,
        stageType,
        (createSampleDto as any).section
      ));

    // 2. Validate Dates & Quantities
    const mfgDate = createSampleDto.manufacturingDate || createSampleDto.mfgDate
      ? new Date(createSampleDto.manufacturingDate || createSampleDto.mfgDate!)
      : null;
    const expDate = createSampleDto.expiryDate || createSampleDto.expDate
      ? new Date(createSampleDto.expiryDate || createSampleDto.expDate!)
      : null;

    if (mfgDate && expDate && expDate < mfgDate) {
      throw new BadRequestException('Validation Failed: Expiry Date cannot be earlier than Manufacturing Date.');
    }

    const quantity = Number(createSampleDto.quantity ?? createSampleDto.sampleQty ?? 1);
    if (quantity <= 0) {
      throw new BadRequestException('Validation Failed: Quantity must be a positive number greater than 0.');
    }

    const quantityUnit = (createSampleDto.quantityUnit || createSampleDto.unit || 'units').trim();
    const nomenclature = (createSampleDto.nomenclature || createSampleDto.materialName || 'Unnamed Sample').trim();
    const batchLotNumber = createSampleDto.batchLotNumber || createSampleDto.lotNumber || null;
    const sampledAt = createSampleDto.sampledAt || createSampleDto.samplingDate
      ? new Date(createSampleDto.sampledAt || createSampleDto.samplingDate!)
      : new Date();

    // 3. Resolve Laboratory
    const lab = await this.resolveLaboratory(
      createSampleDto.laboratoryId,
      createSampleDto.laboratory as string,
    );

    const barcode = (createSampleDto as any).barcode?.trim() || sampleId;

    // 4. Database Transaction for Atomic Sample Creation & Audit Logging
    return this.prisma.$transaction(async (tx) => {
      const sample = await tx.sample.create({
        data: {
          recordNumber,
          sampleId,
          laboratoryId: lab?.id || null,
          laboratoryType: (lab?.code === 'PEN'
            ? 'PENICILLIN'
            : lab?.code === 'CEPH' || lab?.code === 'SAF'
            ? 'CEPHALOSPORIN'
            : 'GENERAL') as any,
          nomenclature,
          stageType,
          quantity,
          quantityUnit,
          batchLotNumber,
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          submittedByUserId: createSampleDto.submittedByUserId || user?.id || null,
          receivedByUserId: createSampleDto.receivedByUserId || null,
          sampledAt,
          status: createSampleDto.status || SampleStatus.RECEIVED,

          // Legacy fields for backward compatibility
          accessionNo,
          sampleCode: sampleId,
          materialName: nomenclature,
          lotNumber: batchLotNumber,
          mfgDate,
          expDate,
          submittedBy: createSampleDto.submittedBy || user?.fullName || 'QC Staff',
          sampleType: ['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB'].includes(stageType)
            ? (stageType as any)
            : null,
          batchId: createSampleDto.batchId || null,
          sourceSupplier: createSampleDto.sourceSupplier,
          samplingLocation: createSampleDto.samplingLocation || 'Laboratory Receiving Bay',
          sampleQty: quantity,
          unit: quantityUnit,
          storageCondition: createSampleDto.storageCondition || 'Controlled Room Temp 20-25°C',
          priority: (createSampleDto.priority as any) || 'ROUTINE',
          chainOfCustody: createSampleDto.chainOfCustody || `Sample logged by ${user?.fullName || 'System'} (${user?.employeeId || 'ID'})`,
          remarks: createSampleDto.remarks,
          accessionedById: user?.id || null,
          assignedToId: createSampleDto.assignedToId || null,
          barcode,
        },
        include: {
          laboratory: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
          receivedByUser: { select: { id: true, fullName: true, employeeId: true } },
          batch: true,
        },
      });

      // 5. Audit Log (Normalized AuditLog Entity)
      await tx.auditLog.create({
        data: {
          userId: user?.id || null,
          action: 'SAMPLE_CREATED',
          entityType: 'Sample',
          entityId: sample.id,
          newValues: {
            sampleId: sample.sampleId,
            recordNumber: sample.recordNumber,
            nomenclature: sample.nomenclature,
            laboratoryId: sample.laboratoryId,
            laboratoryName: lab?.name || 'N/A',
            stageType: sample.stageType,
            quantity: sample.quantity,
            quantityUnit: sample.quantityUnit,
            batchLotNumber: sample.batchLotNumber,
            status: sample.status,
          },
        },
      });

      // 6. 21 CFR Part 11 Audit Trail
      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: sample.id,
          action: 'SAMPLE_ACCESSIONED',
          performedById: user?.id || null,
          performedByName: user?.fullName || 'System Admin',
          role: user?.role || 'ADMIN',
          reasonForChange: `Initial intake of sample ${sample.sampleId} (${sample.recordNumber})`,
          diffPayload: JSON.stringify({
            sampleId: sample.sampleId,
            recordNumber: sample.recordNumber,
            nomenclature: sample.nomenclature,
            quantity: `${sample.quantity} ${sample.quantityUnit}`,
          }),
        },
      });

      // 7. Optional Test Specification Attachment
      if (createSampleDto.testSpecificationIds && createSampleDto.testSpecificationIds.length > 0) {
        const specs = await tx.testSpecification.findMany({
          where: { id: { in: createSampleDto.testSpecificationIds } },
        });

        for (const spec of specs) {
          await tx.sampleTest.create({
            data: {
              sampleId: sample.id,
              testSpecificationId: spec.id,
              minLimit: spec.defaultMinLimit,
              maxLimit: spec.defaultMaxLimit,
              targetValue: spec.defaultTarget,
              unit: spec.unit,
              status: 'PENDING',
              resultStatus: 'NOT_TESTED',
            },
          });
        }
      }

      return sample;
    });
  }

  async findAll(query: SampleQueryDto, user?: any) {
    const where: any = {};

    // Filter by Archival Status
    if (query.isArchived !== undefined) {
      where.isArchived = query.isArchived === 'true' || query.isArchived === true;
    }

    // Filter by Status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by Stage Type / Sample Type
    if (query.stageType || query.sampleType) {
      const stageVal = (query.stageType || query.sampleType)!.trim();
      where.OR = [
        { stageType: { contains: stageVal, mode: 'insensitive' } },
        { stageType: { equals: stageVal, mode: 'insensitive' } },
      ];
    }

    // Filter by Priority
    if (query.priority) {
      where.priority = query.priority;
    }

    // Filter by Laboratory (ID, Code, or Name)
    if (query.laboratoryId) {
      where.laboratoryId = query.laboratoryId;
    } else if (query.laboratory) {
      where.OR = [
        { laboratoryId: query.laboratory },
        { laboratory: { code: { equals: query.laboratory, mode: 'insensitive' } } },
        { laboratory: { name: { contains: query.laboratory, mode: 'insensitive' } } },
      ];
    }

    // Filter by Specific Fields
    if (query.sampleId) {
      where.OR = [
        { sampleId: { contains: query.sampleId, mode: 'insensitive' } },
        { sampleCode: { contains: query.sampleId, mode: 'insensitive' } },
      ];
    }

    if (query.recordNumber) {
      where.OR = [
        { recordNumber: { contains: query.recordNumber, mode: 'insensitive' } },
        { accessionNo: { contains: query.recordNumber, mode: 'insensitive' } },
      ];
    }

    if (query.nomenclature) {
      where.nomenclature = { contains: query.nomenclature, mode: 'insensitive' };
    }

    if (query.batchLotNumber || query.batchNumber) {
      const bn = query.batchLotNumber || query.batchNumber;
      where.OR = [
        { batchLotNumber: { contains: bn, mode: 'insensitive' } },
        { lotNumber: { contains: bn, mode: 'insensitive' } },
        { batch: { batchNumber: { contains: bn, mode: 'insensitive' } } },
      ];
    }

    if (query.batchId) {
      where.batchId = query.batchId;
    }

    // Date Range Filters
    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) {
        dateFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.sampledAt = dateFilter;
    }

    // Full-Text Search
    if (query.search) {
      const s = query.search.trim();
      const searchConditions = [
        { sampleId: { contains: s, mode: 'insensitive' } },
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { recordNumber: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
        { materialName: { contains: s, mode: 'insensitive' } },
        { batchLotNumber: { contains: s, mode: 'insensitive' } },
        { lotNumber: { contains: s, mode: 'insensitive' } },
        { submittedBy: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
        { batch: { batchNumber: { contains: s, mode: 'insensitive' } } },
      ];

      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Lab Section filter (semi-base or formulation)
    if (query.section) {
      const sec = query.section.toString().toLowerCase();
      let sectionCond: any[] = [];
      let excludeCond: any[] = [];
      if (
        sec === 'semi-base' ||
        sec === 'semi-basics' ||
        sec === 'semi-basic' ||
        sec === 'semibase' ||
        sec === 'semibasics' ||
        sec === 'semibasic' ||
        sec === 'semi' ||
        sec === 'basic' ||
        sec === 'basics' ||
        sec === 'sb'
      ) {
        sectionCond = [
          { sampleCode: { contains: '/SB', mode: 'insensitive' } },
          { sampleId: { contains: '/SB', mode: 'insensitive' } },
          { recordNumber: { contains: '/SB', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Basics]', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Basic]', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Base]', mode: 'insensitive' } },
          { stageType: { contains: 'Bulk', mode: 'insensitive' } },
          { stageType: { contains: 'Core', mode: 'insensitive' } },
          { stageType: { contains: 'Blend', mode: 'insensitive' } },
          { stageType: { contains: 'Granul', mode: 'insensitive' } },
          { stageType: { contains: 'In-Process', mode: 'insensitive' } },
          { stageType: { contains: 'Inprocess', mode: 'insensitive' } },
          { stageType: { contains: 'Vendor', mode: 'insensitive' } },
          { stageType: { contains: 'Quarantine', mode: 'insensitive' } },
          { stageType: { contains: 'Retest', mode: 'insensitive' } },
          { stageType: { contains: 'Raw Material', mode: 'insensitive' } },
          { stageType: { contains: 'Water', mode: 'insensitive' } },
          { stageType: { contains: 'Cleaning', mode: 'insensitive' } },
          { sampleType: { in: ['IN_PROCESS', 'RAW_MATERIAL', 'WATER_PURIFIED'] } },
          { remarks: { contains: '[Semi Basics]', mode: 'insensitive' } },
          { remarks: { contains: '[Semi Basic]', mode: 'insensitive' } },
          { remarks: { contains: '[Semi Base]', mode: 'insensitive' } },
        ];
        excludeCond = [
          { sampleCode: { contains: '/F-', mode: 'insensitive' } },
          { sampleId: { contains: '/F-', mode: 'insensitive' } },
          { stageType: { contains: '[Formulation]', mode: 'insensitive' } },
          { remarks: { contains: '[Formulation]', mode: 'insensitive' } },
        ];
      } else if (sec === 'formulation' || sec === 'formulations' || sec === 'fm') {
        sectionCond = [
          { sampleCode: { contains: '/F-', mode: 'insensitive' } },
          { sampleCode: { contains: '/F/', mode: 'insensitive' } },
          { sampleId: { contains: '/F-', mode: 'insensitive' } },
          { recordNumber: { contains: '/F-', mode: 'insensitive' } },
          { stageType: { contains: '[Formulation]', mode: 'insensitive' } },
          { stageType: { contains: 'Finish', mode: 'insensitive' } },
          { stageType: { contains: 'Coat', mode: 'insensitive' } },
          { stageType: { contains: 'Fill', mode: 'insensitive' } },
          { stageType: { contains: 'Packag', mode: 'insensitive' } },
          { stageType: { contains: 'Stabilit', mode: 'insensitive' } },
          { stageType: { contains: 'Process Validation', mode: 'insensitive' } },
          { sampleType: { in: ['FINISHED_PRODUCT', 'STABILITY'] } },
          { remarks: { contains: '[Formulation]', mode: 'insensitive' } },
        ];
        excludeCond = [
          { sampleCode: { contains: '/SB', mode: 'insensitive' } },
          { sampleId: { contains: '/SB', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Basic', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Base', mode: 'insensitive' } },
          { remarks: { contains: '[Semi Basic', mode: 'insensitive' } },
        ];
      }

      if (sectionCond.length > 0) {
        const fullSectionCriteria: any[] = [{ OR: sectionCond }];
        if (excludeCond.length > 0) {
          fullSectionCriteria.push({ NOT: { OR: excludeCond } });
        }

        if (where.AND) {
          where.AND.push(...fullSectionCriteria);
        } else if (where.OR) {
          where.AND = [{ OR: where.OR }, ...fullSectionCriteria];
          delete where.OR;
        } else {
          where.AND = fullSectionCriteria;
        }
      }
    }

    const page = Math.max(1, parseInt((query.page as any) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((query.limit as any) || '10', 10)));
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      'recordNumber',
      'sampleId',
      'sampledAt',
      'nomenclature',
      'createdAt',
      'status',
      'quantity',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy as string)
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, data] = await Promise.all([
      this.prisma.sample.count({ where }),
      this.prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          laboratory: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
          receivedByUser: { select: { id: true, fullName: true, employeeId: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true, username: true } },
          batch: { select: { id: true, batchNumber: true, drugProduct: true, status: true } },
          tests: {
            include: {
              testSpecification: true,
              instrument: true,
              analyst: { select: { id: true, fullName: true, employeeId: true, username: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { tests: true, submissions: true, oosIncidents: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string, user?: any) {
    const sample = await this.prisma.sample.findFirst({
      where: {
        OR: [{ id }, { sampleId: id }, { sampleCode: id }, { recordNumber: id }, { accessionNo: id }],
      },
      include: {
        laboratory: true,
        submittedByUser: { select: { id: true, fullName: true, employeeId: true, department: true } },
        receivedByUser: { select: { id: true, fullName: true, employeeId: true, department: true } },
        accessionedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
        assignedTo: { select: { id: true, fullName: true, employeeId: true, department: true } },
        batch: true,
        submissions: {
          include: {
            laboratory: true,
            submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
        tests: {
          include: {
            testSpecification: true,
            instrument: true,
            analyst: { select: { id: true, fullName: true, employeeId: true } },
            oosIncidents: true,
          },
        },
        oosIncidents: {
          include: {
            reportedBy: { select: { id: true, fullName: true } },
            qaManager: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Sample '${id}' not found in registry`);
    }


    return sample;
  }

  async update(id: string, updateSampleDto: UpdateSampleDto, user: any) {
    const existing = await this.prisma.sample.findFirst({
      where: {
        OR: [{ id }, { sampleId: id }, { sampleCode: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`Sample '${id}' not found`);
    }

    const { reasonForChange, ...updateData } = updateSampleDto;

    return this.prisma.$transaction(async (tx) => {
      const parsedUpdateData: any = { ...updateData };

      if (updateData.manufacturingDate || updateData.mfgDate) {
        parsedUpdateData.manufacturingDate = new Date(updateData.manufacturingDate || updateData.mfgDate!);
        parsedUpdateData.mfgDate = parsedUpdateData.manufacturingDate;
      }
      if (updateData.expiryDate || updateData.expDate) {
        parsedUpdateData.expiryDate = new Date(updateData.expiryDate || updateData.expDate!);
        parsedUpdateData.expDate = parsedUpdateData.expiryDate;
      }
      if (updateData.quantity !== undefined) {
        parsedUpdateData.quantity = Number(updateData.quantity);
        parsedUpdateData.sampleQty = parsedUpdateData.quantity;
      }
      if (updateData.quantityUnit) {
        parsedUpdateData.unit = updateData.quantityUnit;
      }
      if (updateData.nomenclature) {
        parsedUpdateData.materialName = updateData.nomenclature;
      }
      if (updateData.batchLotNumber) {
        parsedUpdateData.lotNumber = updateData.batchLotNumber;
      }
      if (updateData.stageType || updateData.sampleType) {
        const stageVal = (updateData.stageType || updateData.sampleType)!.toString().trim();
        parsedUpdateData.stageType = stageVal;
        parsedUpdateData.sampleType = ['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB'].includes(stageVal)
          ? (stageVal as any)
          : null;
      }

      // Check unique sampleId constraint if being modified
      if (updateData.sampleId && updateData.sampleId !== existing.sampleId) {
        const conflict = await tx.sample.findFirst({
          where: {
            OR: [{ sampleId: updateData.sampleId }, { sampleCode: updateData.sampleId }],
            id: { not: existing.id },
          },
        });
        if (conflict) {
          throw new ConflictException(`Cannot update: Sample ID '${updateData.sampleId}' already in use.`);
        }
        parsedUpdateData.sampleCode = updateData.sampleId;
      }

      const updated = await tx.sample.update({
        where: { id: existing.id },
        data: parsedUpdateData,
        include: {
          laboratory: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
          receivedByUser: { select: { id: true, fullName: true, employeeId: true } },
          batch: true,
        },
      });

      // Audit Log with previous and new values
      await tx.auditLog.create({
        data: {
          userId: user?.id || null,
          action: 'SAMPLE_UPDATED',
          entityType: 'Sample',
          entityId: existing.id,
          previousValues: {
            sampleId: existing.sampleId,
            nomenclature: existing.nomenclature,
            status: existing.status,
            quantity: existing.quantity,
            batchLotNumber: existing.batchLotNumber,
          },
          newValues: {
            sampleId: updated.sampleId,
            nomenclature: updated.nomenclature,
            status: updated.status,
            quantity: updated.quantity,
            batchLotNumber: updated.batchLotNumber,
          },
        },
      });

      // 21 CFR Part 11 Audit Trail
      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: existing.id,
          action: 'SAMPLE_UPDATED',
          performedById: user?.id || null,
          performedByName: user?.fullName || 'System',
          role: user?.role || 'QC_ANALYST',
          reasonForChange: reasonForChange || 'Sample record updated with verified analytical attributes',
          diffPayload: JSON.stringify({
            previous: { status: existing.status, nomenclature: existing.nomenclature },
            new: { status: updated.status, nomenclature: updated.nomenclature },
          }),
        },
      });

      return updated;
    });
  }

  // Non-destructive Archival Workflow
  async archive(id: string, reason: string | undefined, user: any) {
    const existing = await this.prisma.sample.findFirst({
      where: { OR: [{ id }, { sampleId: id }] },
    });
    if (!existing) throw new NotFoundException(`Sample '${id}' not found`);

    return this.prisma.$transaction(async (tx) => {
      const archived = await tx.sample.update({
        where: { id: existing.id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archivedByUserId: user?.id || null,
          status: SampleStatus.ARCHIVED,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user?.id || null,
          action: 'SAMPLE_ARCHIVED',
          entityType: 'Sample',
          entityId: existing.id,
          previousValues: { isArchived: false, status: existing.status },
          newValues: { isArchived: true, status: SampleStatus.ARCHIVED, reason: reason || 'Archived per protocol retention' },
        },
      });

      return archived;
    });
  }

  // Non-destructive Cancellation Workflow
  async cancel(id: string, reason: string, user: any) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('A non-empty justification reason is mandatory to cancel a laboratory sample under 21 CFR Part 11.');
    }

    const existing = await this.prisma.sample.findFirst({
      where: { OR: [{ id }, { sampleId: id }] },
    });
    if (!existing) throw new NotFoundException(`Sample '${id}' not found`);

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.sample.update({
        where: { id: existing.id },
        data: {
          status: SampleStatus.CANCELLED,
          cancellationReason: reason.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user?.id || null,
          action: 'SAMPLE_CANCELLED',
          entityType: 'Sample',
          entityId: existing.id,
          previousValues: { status: existing.status },
          newValues: { status: SampleStatus.CANCELLED, cancellationReason: reason.trim() },
        },
      });

      return cancelled;
    });
  }

  // Prevent Silent Permanent Deletion
  async delete(id: string) {
    throw new ForbiddenException(
      'Direct permanent deletion of pharmaceutical records is strictly prohibited under cGMP and 21 CFR Part 11 regulations. Please use the auditable archival or cancellation workflow.',
    );
  }

  // Workflow Submissions
  async createSubmission(sampleId: string, dto: CreateSubmissionDto, user: any) {
    const sample = await this.prisma.sample.findFirst({
      where: { OR: [{ id: sampleId }, { sampleId }, { sampleCode: sampleId }] },
    });
    if (!sample) throw new NotFoundException(`Sample '${sampleId}' not found`);

    const lab = await this.resolveLaboratory(dto.destinationLabId, dto.destinationLaboratory);

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.sampleSubmission.create({
        data: {
          sampleId: sample.id,
          destinationLaboratory: dto.destinationLaboratory,
          destinationLabId: lab?.id || null,
          submittedByUserId: user?.id || null,
          submittedByName: user?.fullName || 'QC Submitter',
          submittedAt: new Date(),
          status: SubmissionStatus.SUBMITTED,
          remarks: dto.remarks || null,
        },
        include: {
          laboratory: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user?.id || null,
          action: 'SAMPLE_SUBMITTED',
          entityType: 'SampleSubmission',
          entityId: submission.id,
          newValues: {
            sampleId: sample.id,
            sampleCode: sample.sampleId || sample.sampleCode,
            destinationLaboratory: dto.destinationLaboratory,
            destinationLabId: lab?.id,
            status: SubmissionStatus.SUBMITTED,
          },
        },
      });

      return submission;
    });
  }

  async getSampleSubmissions(sampleId: string) {
    const sample = await this.prisma.sample.findFirst({
      where: { OR: [{ id: sampleId }, { sampleId }, { sampleCode: sampleId }] },
    });
    if (!sample) throw new NotFoundException(`Sample '${sampleId}' not found`);

    return this.prisma.sampleSubmission.findMany({
      where: { sampleId: sample.id },
      include: {
        laboratory: true,
        submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async assignTest(sampleId: string, testSpecificationId: string, analystId?: string, user?: any) {
    const sample = await this.prisma.sample.findFirst({
      where: { OR: [{ id: sampleId }, { sampleId }, { sampleCode: sampleId }] },
    });
    if (!sample) throw new NotFoundException('Sample not found');

    const spec = await this.prisma.testSpecification.findUnique({ where: { id: testSpecificationId } });
    if (!spec) throw new NotFoundException('Test specification not found');

    const test = await this.prisma.sampleTest.create({
      data: {
        sampleId: sample.id,
        testSpecificationId,
        analystId: analystId || null,
        minLimit: spec.defaultMinLimit,
        maxLimit: spec.defaultMaxLimit,
        targetValue: spec.defaultTarget,
        unit: spec.unit,
        status: 'PENDING',
        resultStatus: 'NOT_TESTED',
      },
      include: {
        testSpecification: true,
        analyst: { select: { id: true, fullName: true } },
      },
    });

    if (user) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'TEST_ASSIGNED',
          entityType: 'SampleTest',
          entityId: test.id,
          newValues: {
            sampleId: sample.id,
            testSpecificationId: spec.id,
            testName: spec.name,
          },
        },
      });
    }

    return test;
  }

  async getSampleMetrics(laboratoryIdOrCode?: string) {
    const where: any = {};
    if (laboratoryIdOrCode) {
      const lab = await this.resolveLaboratory(laboratoryIdOrCode, laboratoryIdOrCode);
      if (lab) {
        where.laboratoryId = lab.id;
      }
    }

    const total = await this.prisma.sample.count({ where });
    const received = await this.prisma.sample.count({ where: { ...where, status: 'RECEIVED' } });
    const inTesting = await this.prisma.sample.count({ where: { ...where, status: 'TESTING_IN_PROGRESS' } });
    const reviewPending = await this.prisma.sample.count({ where: { ...where, status: 'REVIEW_PENDING' } });
    const approved = await this.prisma.sample.count({ where: { ...where, status: 'APPROVED' } });
    const rejected = await this.prisma.sample.count({ where: { ...where, status: 'REJECTED' } });
    const archived = await this.prisma.sample.count({ where: { ...where, isArchived: true } });
    const urgentCount = await this.prisma.sample.count({
      where: {
        ...where,
        priority: { in: ['URGENT', 'STAT'] },
        status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED', 'CANCELLED'] },
      },
    });

    return {
      total,
      received,
      inTesting,
      reviewPending,
      approved,
      rejected,
      archived,
      urgentCount,
    };
  }

}
