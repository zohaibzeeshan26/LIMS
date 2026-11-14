import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSampleDto } from './dto/create-sample.dto';
import { UpdateSampleDto } from './dto/update-sample.dto';
import { SubmissionDestination, SubmissionStatus, SampleStatus, Priority, Role } from '@prisma/client';
import { SubmitSampleDto, UpdateSubmissionStatusDto } from './dto/submit-sample.dto';

@Injectable()
export class SamplingService {
  constructor(private prisma: PrismaService) {}

  async generateSampleCode(
    laboratory?: string,
    stageOrType?: string,
    explicitSection?: string
  ): Promise<string> {
    // 1. Determine Laboratory Prefix (GL = General, PEN = Penicillin, CEPH = Cephalosporin)
    let labPrefix = 'GL';
    const rawLab = (laboratory || '').toString().toUpperCase();
    if (rawLab === 'PENICILLIN' || rawLab === 'PEN' || rawLab === 'PL') {
      labPrefix = 'PEN';
    } else if (rawLab === 'CEPHALOSPORIN' || rawLab === 'CEPH' || rawLab === 'CP' || rawLab === 'SAF' || rawLab === 'SEF') {
      labPrefix = 'CEPH';
    } else {
      labPrefix = 'GL';
    }

    // 2. Determine Section Prefix (SB = Semi Basics / Semi Basic, F = Formulation)
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

    // 3. Find all existing samples matching this laboratory and section prefix
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

  async getNextSampleIdPreview(
    laboratory?: string,
    section?: string,
    stageType?: string
  ) {
    const nextSampleCode = await this.generateSampleCode(laboratory, stageType, section);
    const nextAccessionNo = await this.generateAccessionNo(laboratory, stageType, section);
    return {
      sampleCode: nextSampleCode,
      sampleId: nextSampleCode,
      accessionNo: nextAccessionNo,
      laboratory: laboratory || 'GENERAL',
      section: section || 'semi-base',
    };
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

    // Match all existing samples in this section and laboratory
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

  getUserAssignedLab(user?: any): 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' | 'ALL' {
    if (!user) return 'ALL';
    const role = user.role || '';
    if (
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'HOD' ||
      role === 'AUDITOR' ||
      role === 'DEPUTY_MANAGER' ||
      role === 'DOCUMENTATION_MANAGER' ||
      role === 'LAB_TECHNICIAN' ||
      role === 'SAMPLE_REGISTRATION'
    ) {
      return 'ALL';
    }
    const dept = (user.department || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();

    if (dept.includes('penicillin') || email.includes('pen') || uname.includes('pen')) {
      return 'PENICILLIN';
    }
    if (dept.includes('cephalosporin') || dept.includes('ceph') || email.includes('ceph') || uname.includes('ceph')) {
      return 'CEPHALOSPORIN';
    }
    if (dept.includes('general') || email.includes('gen') || uname.includes('gen')) {
      return 'GENERAL';
    }
    return 'ALL';
  }

  async checkSampleIdAvailability(sampleCode: string) {
    const existing = await this.prisma.sample.findUnique({
      where: { sampleCode: sampleCode.trim() },
      select: { id: true, sampleCode: true, materialName: true, accessionNo: true },
    });
    return {
      sampleCode,
      isAvailable: !existing,
      existingSample: existing || null,
    };
  }

  async create(createSampleDto: CreateSampleDto, user: any) {
    const userAssignedLab = this.getUserAssignedLab(user);
    const rawReqLab = createSampleDto.laboratory ? (createSampleDto.laboratory as string).toUpperCase() : undefined;
    let targetLab: 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' = 'GENERAL';
    if (rawReqLab === 'PENICILLIN' || rawReqLab === 'PEN' || rawReqLab === 'PL') {
      targetLab = 'PENICILLIN';
    } else if (rawReqLab === 'CEPHALOSPORIN' || rawReqLab === 'CEPH' || rawReqLab === 'CP' || rawReqLab === 'SAF' || rawReqLab === 'SEF') {
      targetLab = 'CEPHALOSPORIN';
    } else {
      targetLab = 'GENERAL';
    }

    if (userAssignedLab !== 'ALL') {
      targetLab = userAssignedLab;
    }

    createSampleDto.laboratory = targetLab as any;

    const labRecord = await this.prisma.laboratory.findFirst({
      where: {
        OR: [
          { code: targetLab === 'PENICILLIN' ? 'PEN' : targetLab === 'CEPHALOSPORIN' ? 'CEPH' : 'GEN' },
          { code: targetLab === 'CEPHALOSPORIN' ? 'SAF' : targetLab },
          { name: { contains: targetLab, mode: 'insensitive' } },
        ],
      },
    });

    let sampleCode = createSampleDto.sampleCode?.trim();
    if (sampleCode) {
      const existing = await this.prisma.sample.findUnique({
        where: { sampleCode },
      });
      if (existing) {
        throw new ConflictException(
          `Sample ID '${sampleCode}' already exists in registry (Accession No: ${existing.accessionNo}). Please specify a unique ID or use auto-generation.`
        );
      }
    } else {
      sampleCode = await this.generateSampleCode(
        createSampleDto.laboratory,
        createSampleDto.stageType || (createSampleDto as any).sampleType,
        (createSampleDto as any).section
      );
    }

    const mfgDate = createSampleDto.mfgDate ? new Date(createSampleDto.mfgDate) : null;
    const expDate = createSampleDto.expDate ? new Date(createSampleDto.expDate) : null;

    if (mfgDate && expDate && expDate < mfgDate) {
      throw new BadRequestException('Validation Failed: Expiry Date cannot be earlier than Manufacturing Date.');
    }

    if (createSampleDto.sampleQty <= 0) {
      throw new BadRequestException('Validation Failed: Sample Quantity must be a positive number greater than 0.');
    }

    const barcode = createSampleDto.barcode?.trim() || sampleCode;
    const stageTypeVal = (createSampleDto.stageType || createSampleDto.sampleType || 'Finished Product').toString().trim();
    const accessionNo =
      createSampleDto.accessionNo ||
      (await this.generateAccessionNo(
        createSampleDto.laboratory,
        stageTypeVal,
        (createSampleDto as any).section
      ));
    const samplingDate = createSampleDto.samplingDate ? new Date(createSampleDto.samplingDate) : new Date();
    const validEnum = ['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB'].includes(stageTypeVal)
      ? (stageTypeVal as any)
      : null;

    return this.prisma.$transaction(async (tx) => {
      const sample = await tx.sample.create({
        data: {
          accessionNo,
          sampleCode,
          recordNumber: accessionNo,
          sampleId: sampleCode,
          barcode,
          samplingDate,
          sampledAt: samplingDate,
          materialName: createSampleDto.materialName || createSampleDto.nomenclature || 'Unnamed Material',
          nomenclature: createSampleDto.nomenclature || createSampleDto.materialName || 'Unnamed Material',
          lotNumber: createSampleDto.lotNumber || null,
          batchLotNumber: createSampleDto.lotNumber || null,
          mfgDate,
          manufacturingDate: mfgDate,
          expDate,
          expiryDate: expDate,
          submittedBy: createSampleDto.submittedBy || user.fullName,
          stageType: stageTypeVal,
          sampleType: validEnum,
          batchId: createSampleDto.batchId || null,
          sourceSupplier: createSampleDto.sourceSupplier,
          samplingLocation: createSampleDto.samplingLocation || 'Laboratory Receiving Bay',
          sampleQty: createSampleDto.sampleQty,
          quantity: createSampleDto.sampleQty,
          unit: createSampleDto.unit,
          priority: (createSampleDto.priority as any) || Priority.ROUTINE,
          storageCondition: createSampleDto.storageCondition || 'Controlled Room Temp 20-25°C',
          laboratoryId: labRecord?.id || null,
          laboratoryType: ((createSampleDto.laboratory as string)?.toUpperCase() === 'PENICILLIN' ? 'PENICILLIN' : (createSampleDto.laboratory as string)?.toUpperCase() === 'CEPHALOSPORIN' ? 'CEPHALOSPORIN' : 'GENERAL') as any,
          chainOfCustody: createSampleDto.chainOfCustody || `Sample logged by ${user.fullName} (${user.employeeId})`,
          remarks: createSampleDto.remarks,
          accessionedById: user.id,
          assignedToId: createSampleDto.assignedToId || null,
          status: SampleStatus.RECEIVED,
        },
      });

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
              analystId: createSampleDto.assignedToId || null,
            },
          });
        }
      }

      const isUrgentPriority = sample.priority === 'URGENT' || sample.priority === 'STAT';
      const slaTurnaround = isUrgentPriority ? '1 Hr - 2 Days SLA' : '5 - 15 Days SLA';

      const priorityAction = isUrgentPriority
        ? 'URGENT_PRIORITY_SAMPLE'
        : 'SAMPLE_ACCESSIONED';

      const priorityReason = isUrgentPriority
        ? `[URGENT NOTICE: ${slaTurnaround}] Sample ${sample.sampleCode} flagged with fast-track URGENT testing window (1 Hr - 2 Days)`
        : `[ROUTINE NOTICE: ${slaTurnaround}] Sample ${sample.sampleCode} accession and routine testing intake`;

      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: sample.id,
          action: priorityAction,
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: priorityReason,
          diffPayload: JSON.stringify({
            accessionNo,
            sampleCode,
            materialName: sample.materialName,
            nomenclature: sample.nomenclature,
            lotNumber: sample.lotNumber,
            sampleType: sample.sampleType,
            priority: sample.priority,
            sla: slaTurnaround,
            laboratory: sample.laboratoryType,
            qty: `${sample.sampleQty} ${sample.unit}`,
          }),
        },
      });

      return tx.sample.findUnique({
        where: { id: sample.id },
        include: {
          batch: true,
          accessionedBy: { select: { id: true, fullName: true, employeeId: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          tests: {
            include: {
              testSpecification: true,
              instrument: true,
              analyst: { select: { id: true, fullName: true } },
            },
          },
        },
      });
    });
  }

  async findAll(query: any, user?: any) {
    const where: any = {};
    const userAssignedLab = this.getUserAssignedLab(user);

    if (query.status) {
      if (typeof query.status === 'string' && query.status.includes(',')) {
        const statuses = query.status.split(',').map((s: string) => s.trim()).filter(Boolean);
        where.status = { in: statuses };
      } else {
        where.status = query.status;
      }
    }
    if (query.sampleType || query.stage || query.stageType) {
      const s = (query.stageType || query.stage || query.sampleType)?.trim();
      if (s) {
        where.stageType = { contains: s, mode: 'insensitive' };
      }
    }
    if (query.priority) {
      if (typeof query.priority === 'string' && query.priority.includes(',')) {
        const priorities = query.priority.split(',').map((p: string) => p.trim()).filter(Boolean);
        where.priority = { in: priorities };
      } else {
        where.priority = query.priority;
      }
    }
    if (query.batchId) where.batchId = query.batchId;

    if (userAssignedLab !== 'ALL') {
      if (userAssignedLab === 'CEPHALOSPORIN') {
        where.laboratoryType = { in: ['CEPHALOSPORIN', 'SAF'] };
      } else {
        where.laboratoryType = userAssignedLab as any;
      }
    } else {
      const rawLab = query.laboratory || query.lab;
      let lab: string | undefined = undefined;
      if (rawLab) {
        const u = rawLab.toString().toUpperCase();
        if (u === 'SEF' || u === 'SAF' || u === 'CP' || u.includes('CEPH')) {
          lab = 'CEPHALOSPORIN';
        } else if (u === 'PENICILLIN' || u === 'PEN' || u === 'PL') {
          lab = 'PENICILLIN';
        } else if (u === 'GENERAL' || u === 'GEN' || u === 'GL') {
          lab = 'GENERAL';
        }
      }
      if (lab === 'CEPHALOSPORIN') {
        where.laboratoryType = { in: ['CEPHALOSPORIN', 'SAF'] };
      } else if (lab && ['PENICILLIN', 'GENERAL'].includes(lab)) {
        where.laboratoryType = lab as any;
      }
    }

    // Specific searches
    if (query.sampleId) {
      where.sampleCode = { contains: query.sampleId.trim(), mode: 'insensitive' };
    }

    if (query.nomenclature) {
      where.OR = [
        { nomenclature: { contains: query.nomenclature.trim(), mode: 'insensitive' } },
        { materialName: { contains: query.nomenclature.trim(), mode: 'insensitive' } },
      ];
    }

    if (query.batchNumber) {
      const bTerm = query.batchNumber.trim();
      const batchCond = [
        { lotNumber: { contains: bTerm, mode: 'insensitive' } },
        { batch: { batchNumber: { contains: bTerm, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: batchCond }];
        delete where.OR;
      } else {
        where.OR = batchCond;
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

    // Date range filter
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
      where.samplingDate = dateFilter;
    }

    // General multi-field search
    if (query.search) {
      const s = query.search.trim();
      const searchConditions = [
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
        { materialName: { contains: s, mode: 'insensitive' } },
        { lotNumber: { contains: s, mode: 'insensitive' } },
        { submittedBy: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
        { sourceSupplier: { contains: s, mode: 'insensitive' } },
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

    // Sorting
    const allowedSortFields = [
      'accessionNo',
      'samplingDate',
      'nomenclature',
      'sampleCode',
      'sampleType',
      'sampleQty',
      'lotNumber',
      'mfgDate',
      'expDate',
      'submittedBy',
      'createdAt',
      'status',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'accessionNo';
    const sortOrder = query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    const orderBy: any = [{ [sortBy]: sortOrder }, { createdAt: sortOrder }];

    // Pagination
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.sample.count({ where }),
      this.prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          batch: { select: { id: true, batchNumber: true, drugProduct: true, status: true } },
          laboratory: { select: { id: true, name: true, code: true } },
          accessionedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true, department: true } },
          tests: {
            select: {
              id: true,
              status: true,
              resultStatus: true,
              testSpecification: { select: { name: true, testCode: true } },
            },
          },
          submissions: {
            select: {
              id: true,
              destinationLaboratory: true,
              status: true,
              submittedByName: true,
              submissionDate: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { tests: true, oosIncidents: true, submissions: true } },
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

  async findOne(idOrCode: string, user?: any) {
    const sample = await this.prisma.sample.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { sampleCode: idOrCode },
          { sampleId: idOrCode },
          { accessionNo: idOrCode },
          { barcode: idOrCode },
        ],
      },
      include: {
        batch: true,
        laboratory: { select: { id: true, name: true, code: true } },
        accessionedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
        assignedTo: { select: { id: true, fullName: true, employeeId: true, department: true } },
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
        submissions: {
          include: {
            submittedByUser: { select: { id: true, fullName: true, employeeId: true, department: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with identifier '${idOrCode}' not found`);
    }


    return sample;
  }

  async update(id: string, updateSampleDto: UpdateSampleDto, user: any) {
    const existing = await this.prisma.sample.findFirst({
      where: {
        OR: [
          { id },
          { sampleCode: id },
          { sampleId: id },
          { accessionNo: id },
        ],
      },
    });
    if (!existing) {
      throw new NotFoundException(`Sample with ID or code ${id} not found`);
    }

    const { reasonForChange, ...updateData } = updateSampleDto;

    return this.prisma.$transaction(async (tx) => {
      let chainOfCustodyUpdate = existing.chainOfCustody;
      if (updateData.status && updateData.status !== existing.status) {
        chainOfCustodyUpdate = `${existing.chainOfCustody || ''}\n[${new Date().toISOString()}] Status transitioned to ${updateData.status} by ${user.fullName}`;
      }

      const parsedUpdateData: any = { ...updateData };
      if ('mfgDate' in updateData) {
        parsedUpdateData.mfgDate = updateData.mfgDate ? new Date(updateData.mfgDate) : null;
      }
      if ('expDate' in updateData) {
        parsedUpdateData.expDate = updateData.expDate ? new Date(updateData.expDate) : null;
      }
      if (updateData.stageType || updateData.sampleType) {
        const stageVal = (updateData.stageType || updateData.sampleType)!.toString().trim();
        parsedUpdateData.stageType = stageVal;
        parsedUpdateData.sampleType = ['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB'].includes(stageVal)
          ? (stageVal as any)
          : null;
      }

      const updated = await tx.sample.update({
        where: { id: existing.id },
        data: {
          ...parsedUpdateData,
          chainOfCustody: updateData.chainOfCustody || chainOfCustodyUpdate,
        },
        include: {
          batch: true,
          accessionedBy: { select: { id: true, fullName: true, employeeId: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          tests: {
            include: {
              testSpecification: true,
              instrument: true,
              analyst: { select: { id: true, fullName: true } },
            },
          },
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: id,
          action: 'SAMPLE_UPDATED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: reasonForChange || 'Sample attributes updated via Sampling Records Portal',
          diffPayload: JSON.stringify({
            previous: {
              nomenclature: existing.nomenclature,
              lotNumber: existing.lotNumber,
              sampleQty: existing.sampleQty,
              status: existing.status,
              submittedBy: existing.submittedBy,
              assignedToId: existing.assignedToId,
            },
            updated: {
              nomenclature: updated.nomenclature,
              lotNumber: updated.lotNumber,
              sampleQty: updated.sampleQty,
              status: updated.status,
              submittedBy: updated.submittedBy,
              assignedToId: updated.assignedToId,
            },
          }),
        },
      });

      return updated;
    });
  }

  async getSampleMetrics(laboratory?: string, user?: any) {
    const userAssignedLab = this.getUserAssignedLab(user);
    const targetLab = userAssignedLab !== 'ALL' ? userAssignedLab : laboratory;
    const rawLab = targetLab?.toUpperCase();
    const normalizedLab =
      (rawLab === 'SEF' || rawLab === 'SAF' || rawLab === 'CP' || rawLab?.includes('CEPH'))
        ? 'CEPHALOSPORIN'
        : (rawLab === 'PENICILLIN' || rawLab === 'PL' || rawLab === 'PEN')
        ? 'PENICILLIN'
        : (rawLab === 'GENERAL' || rawLab === 'GL' || rawLab === 'GEN')
        ? 'GENERAL'
        : undefined;
    const labCondition =
      normalizedLab === 'CEPHALOSPORIN'
        ? { laboratoryType: { in: ['CEPHALOSPORIN', 'SAF'] as any } }
        : normalizedLab && ['PENICILLIN', 'GENERAL'].includes(normalizedLab)
        ? { laboratoryType: normalizedLab as any }
        : {};

    const total = await this.prisma.sample.count({ where: { ...labCondition } });
    const received = await this.prisma.sample.count({ where: { status: 'RECEIVED', ...labCondition } });
    const inTesting = await this.prisma.sample.count({ where: { status: 'TESTING_IN_PROGRESS', ...labCondition } });
    const reviewPending = await this.prisma.sample.count({ where: { status: 'REVIEW_PENDING', ...labCondition } });
    const approved = await this.prisma.sample.count({ where: { status: 'APPROVED', ...labCondition } });
    const rejected = await this.prisma.sample.count({ where: { status: 'REJECTED', ...labCondition } });
    const urgentCount = await this.prisma.sample.count({
      where: {
        priority: { in: ['URGENT', 'STAT'] },
        status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] },
        ...labCondition,
      },
    });

    const [generalCount, penicillinCount, cephalosporinCount] = await Promise.all([
      this.prisma.sample.count({ where: { laboratoryType: 'GENERAL' } }),
      this.prisma.sample.count({ where: { laboratoryType: 'PENICILLIN' } }),
      this.prisma.sample.count({
        where: {
          OR: [
            { laboratoryType: 'CEPHALOSPORIN' },
            { laboratoryType: 'SAF' },
          ],
        },
      }),
    ]);

    const activeBatches = await this.prisma.batch.count({
      where: {
        status: { notIn: ['RELEASED', 'REJECTED'] },
      },
    });
    const totalBatches = await this.prisma.batch.count();

    const byLab = {
      general: generalCount,
      penicillin: penicillinCount,
      cephalosporin: cephalosporinCount,
    };

    return {
      total,
      received,
      inTesting,
      reviewPending,
      approved,
      rejected,
      urgentCount,
      activeBatches,
      totalBatches,
      byLab,
    };
  }

  async submitToWorkflow(sampleId: string, dto: SubmitSampleDto, user: any) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      include: { batch: true },
    });
    if (!sample) {
      throw new NotFoundException(`Sample with ID ${sampleId} not found`);
    }

    const userAssignedLab = this.getUserAssignedLab(user);


    // Prevent accidental duplicate submissions to the same destination lab while active
    const activeExisting = await this.prisma.sampleSubmission.findFirst({
      where: {
        sampleId,
        destinationLaboratory: dto.destinationLab,
        status: {
          in: [
            SubmissionStatus.DRAFT,
            SubmissionStatus.REGISTERED,
            SubmissionStatus.SUBMITTED,
            SubmissionStatus.RECEIVED,
            SubmissionStatus.IN_PROGRESS,
          ],
        },
      },
    });

    if (activeExisting) {
      throw new ConflictException(
        `Sample '${sample.sampleCode}' already has an active workflow submission to ${dto.destinationLab} Laboratory in status '${activeExisting.status}'. Duplicate submissions are prevented.`
      );
    }

    const initialStatus = dto.status || SubmissionStatus.SUBMITTED;

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.sampleSubmission.create({
        data: {
          sampleId,
          destinationLaboratory: dto.destinationLab || 'General Lab',
          destinationLabEnum: dto.destinationLab as any,
          submittedByUserId: user.id,
          submittedByName: `${user.fullName} (${user.employeeId})`,
          submissionDate: new Date(),
          status: initialStatus,
          remarks: dto.remarks || null,
        },
        include: {
          sample: {
            select: {
              id: true,
              sampleCode: true,
              accessionNo: true,
              materialName: true,
              nomenclature: true,
              laboratory: true,
              status: true,
            },
          },
          submittedByUser: {
            select: {
              id: true,
              fullName: true,
              employeeId: true,
              department: true,
            },
          },
        },
      });

      // Update sample custody trail
      const custodyNote = `\n[${new Date().toISOString()}] Sample submitted to ${dto.destinationLab} Lab by ${user.fullName} (${user.employeeId}) - Status: ${initialStatus}${dto.remarks ? ` [Remarks: ${dto.remarks}]` : ''}`;
      await tx.sample.update({
        where: { id: sampleId },
        data: {
          chainOfCustody: `${sample.chainOfCustody || ''}${custodyNote}`,
          status: sample.status === 'RECEIVED' ? 'ASSIGNED' : sample.status,
        },
      });

      // Record 21 CFR Part 11 Audit Trail
      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submission.id,
          action: 'SAMPLE_SUBMITTED_TO_WORKFLOW',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: dto.remarks || `Sample workflow intake routed to ${dto.destinationLab} Laboratory`,
          diffPayload: JSON.stringify({
            sampleCode: sample.sampleCode,
            accessionNo: sample.accessionNo,
            destinationLab: dto.destinationLab,
            status: initialStatus,
            submittedByName: submission.submittedByName,
          }),
        },
      });

      return submission;
    });
  }

  async getSampleSubmissions(sampleId: string) {
    return this.prisma.sampleSubmission.findMany({
      where: { sampleId },
      include: {
        submittedByUser: {
          select: { id: true, fullName: true, employeeId: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSubmissions(query?: any) {
    const where: any = {};
    if (query?.destinationLab) where.destinationLaboratory = query.destinationLab;
    if (query?.status) where.status = query.status;
    if (query?.sampleId) where.sampleId = query.sampleId;

    return this.prisma.sampleSubmission.findMany({
      where,
      include: {
        sample: {
          select: {
            id: true,
            sampleCode: true,
            accessionNo: true,
            nomenclature: true,
            materialName: true,
            sampleType: true,
            sampleQty: true,
            unit: true,
            laboratory: true,
            status: true,
          },
        },
        submittedByUser: {
          select: { id: true, fullName: true, employeeId: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubmissionStatus(submissionId: string, dto: UpdateSubmissionStatusDto, user: any) {
    const existing = await this.prisma.sampleSubmission.findUnique({
      where: { id: submissionId },
      include: { sample: true },
    });
    if (!existing) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    // Valid status transitions
    const VALID_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
      DRAFT: [SubmissionStatus.REGISTERED, SubmissionStatus.SUBMITTED, SubmissionStatus.CANCELLED],
      REGISTERED: [SubmissionStatus.SUBMITTED, SubmissionStatus.CANCELLED],
      SUBMITTED: [SubmissionStatus.RECEIVED, SubmissionStatus.REJECTED, SubmissionStatus.CANCELLED],
      RECEIVED: [SubmissionStatus.IN_PROGRESS, SubmissionStatus.REJECTED],
      IN_PROGRESS: [SubmissionStatus.COMPLETED, SubmissionStatus.REJECTED],
      COMPLETED: [],
      REJECTED: [SubmissionStatus.SUBMITTED], // QA re-submission
      CANCELLED: [],
    };

    const allowedNext = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from '${existing.status}' to '${dto.status}'. Allowed transitions: ${
          allowedNext.join(', ') || 'None (Terminal status)'
        }.`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sampleSubmission.update({
        where: { id: submissionId },
        data: {
          status: dto.status,
          remarks: dto.remarks ? `${existing.remarks ? `${existing.remarks}\n` : ''}${dto.remarks}` : existing.remarks,
        },
        include: {
          sample: true,
          submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
        },
      });

      // Update sample custody trail
      const statusNote = `\n[${new Date().toISOString()}] Workflow submission to ${existing.destinationLaboratory} Lab transitioned from ${existing.status} to ${dto.status} by ${user.fullName} (${user.role})${dto.reasonForChange ? ` [Reason: ${dto.reasonForChange}]` : ''}`;
      await tx.sample.update({
        where: { id: existing.sampleId },
        data: {
          chainOfCustody: `${existing.sample.chainOfCustody || ''}${statusNote}`,
        },
      });

      // Record 21 CFR Part 11 Audit Trail
      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submissionId,
          action: 'SUBMISSION_STATUS_UPDATED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: dto.reasonForChange || `Submission status transitioned to ${dto.status}`,
          diffPayload: JSON.stringify({
            previousStatus: existing.status,
            newStatus: dto.status,
            destinationLab: existing.destinationLaboratory,
            sampleCode: existing.sample.sampleCode,
          }),
        },
      });

      return updated;
    });
  }
}
