import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { SubmissionStatus } from '@prisma/client';

export class SamplingService {
  getUserAssignedLab(user: any): string {
    if (!user) return 'ALL';
    if (user.assignedLab) {
      const a = user.assignedLab.toUpperCase();
      if (a.includes('PEN')) return 'PENICILLIN';
      if (a.includes('CEPH') || a.includes('SAF')) return 'CEPHALOSPORIN';
      if (a.includes('GEN')) return 'GENERAL';
    }

    const email = (user.email || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const dept = (user.department || '').toLowerCase();
    const role = user.role;

    if (
      role === 'ADMIN' ||
      role === 'QA_MANAGER' ||
      role === 'AUDITOR' ||
      role === 'MANAGER' ||
      role === 'DEPUTY_MANAGER' ||
      role === 'SHIFT_INCHARGE'
    ) {
      return 'ALL';
    }

    if (
      email.includes('ceph.analyst') ||
      username.includes('ceph.analyst') ||
      dept === 'cephalosporin lab' ||
      dept === 'cephalosporin' ||
      email.includes('saf.analyst') ||
      dept === 'saf lab'
    ) {
      return 'CEPHALOSPORIN';
    }

    if (
      email.includes('pen.analyst') ||
      username.includes('pen.analyst') ||
      dept === 'penicillin lab' ||
      dept === 'penicillin'
    ) {
      return 'PENICILLIN';
    }

    if (email.includes('gen.analyst') || dept === 'general lab') {
      return 'GENERAL';
    }

    return 'ALL';
  }

  async generateSampleCode(
    laboratory?: string,
    stageOrType?: string,
    explicitSection?: string
  ): Promise<string> {
    let labPrefix = 'GL';
    const rawLab = (laboratory || '').toString().toUpperCase();
    if (rawLab === 'PENICILLIN' || rawLab === 'PEN' || rawLab === 'PL') {
      labPrefix = 'PEN';
    } else if (
      rawLab === 'CEPHALOSPORIN' ||
      rawLab === 'CEPH' ||
      rawLab === 'CP' ||
      rawLab === 'SAF' ||
      rawLab === 'SEF'
    ) {
      labPrefix = 'CEPH';
    } else {
      labPrefix = 'GL';
    }

    let secPrefix = 'SB';
    const s = (explicitSection || stageOrType || '').toString().toLowerCase();

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

    const existingSamples = await prisma.sample.findMany({
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

    return `${prefix}${maxNumber + 1}`;
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
    const year = new Date().getFullYear();
    const count = await prisma.sample.count();
    const labCode = (laboratory || 'GEN').substring(0, 3).toUpperCase();
    return `ACC-${year}-${labCode}-${String(count + 1).padStart(4, '0')}`;
  }

  async checkSampleIdAvailability(sampleCode: string) {
    const cleanCode = (sampleCode || '').trim();
    if (!cleanCode) {
      return { sampleCode: '', isAvailable: false, message: 'Sample Code cannot be empty' };
    }

    const existing = await prisma.sample.findFirst({
      where: {
        OR: [
          { sampleCode: { equals: cleanCode, mode: 'insensitive' } },
          { sampleId: { equals: cleanCode, mode: 'insensitive' } },
          { recordNumber: { equals: cleanCode, mode: 'insensitive' } },
        ],
      },
      select: { id: true, sampleCode: true, nomenclature: true, status: true },
    });

    return {
      sampleCode: cleanCode,
      isAvailable: !existing,
      existingSample: existing || null,
    };
  }

  async getSampleMetrics(laboratory?: string, user?: any) {
    let normalizedLab: string | undefined = undefined;
    const userAssignedLab = this.getUserAssignedLab(user);

    if (userAssignedLab !== 'ALL') {
      normalizedLab = userAssignedLab;
    } else if (laboratory) {
      const u = laboratory.toString().toUpperCase();
      if (u === 'SEF' || u === 'SAF' || u === 'CP' || u.includes('CEPH')) {
        normalizedLab = 'CEPHALOSPORIN';
      } else if (u === 'PENICILLIN' || u === 'PEN' || u === 'PL') {
        normalizedLab = 'PENICILLIN';
      } else if (u === 'GENERAL' || u === 'GEN' || u === 'GL') {
        normalizedLab = 'GENERAL';
      }
    }

    const labCondition =
      normalizedLab === 'CEPHALOSPORIN'
        ? { laboratoryType: { in: ['CEPHALOSPORIN', 'SAF'] as any } }
        : normalizedLab && ['PENICILLIN', 'GENERAL'].includes(normalizedLab)
        ? { laboratoryType: normalizedLab as any }
        : {};

    const [
      total,
      received,
      inTesting,
      reviewPending,
      approved,
      rejected,
      urgentCount,
      activeBatches,
      totalBatches,
      generalCount,
      penicillinCount,
      cephalosporinCount,
    ] = await Promise.all([
      prisma.sample.count({ where: { ...labCondition } }),
      prisma.sample.count({ where: { status: 'RECEIVED', ...labCondition } }),
      prisma.sample.count({ where: { status: 'TESTING_IN_PROGRESS', ...labCondition } }),
      prisma.sample.count({ where: { status: 'REVIEW_PENDING', ...labCondition } }),
      prisma.sample.count({ where: { status: 'APPROVED', ...labCondition } }),
      prisma.sample.count({ where: { status: 'REJECTED', ...labCondition } }),
      prisma.sample.count({
        where: {
          priority: { in: ['URGENT', 'STAT'] },
          status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] },
          ...labCondition,
        },
      }),
      prisma.batch.count({ where: { status: { notIn: ['RELEASED', 'REJECTED'] } } }),
      prisma.batch.count(),
      prisma.sample.count({ where: { laboratoryType: 'GENERAL' } }),
      prisma.sample.count({ where: { laboratoryType: 'PENICILLIN' } }),
      prisma.sample.count({
        where: {
          OR: [{ laboratoryType: 'CEPHALOSPORIN' }, { laboratoryType: 'SAF' }],
        },
      }),
    ]);

    // Compute sub-section metrics (Semi-Basics vs Formulation) for each analytical laboratory
    const getLabSectionBreakdown = async (labTypes: any[]) => {
      const [semiBase, formulation, urgent] = await Promise.all([
        prisma.sample.count({
          where: {
            laboratoryType: { in: labTypes },
            OR: [
              { sampleCode: { contains: '/SB', mode: 'insensitive' } },
              { sampleId: { contains: '/SB', mode: 'insensitive' } },
              { stageType: { contains: '[Semi Basic', mode: 'insensitive' } },
              { stageType: { contains: '[Semi Base', mode: 'insensitive' } },
              { sampleType: { in: ['RAW_MATERIAL', 'IN_PROCESS'] } },
            ],
            NOT: [
              { sampleCode: { contains: '/F-', mode: 'insensitive' } },
              { sampleId: { contains: '/F-', mode: 'insensitive' } },
            ],
          },
        }),
        prisma.sample.count({
          where: {
            laboratoryType: { in: labTypes },
            OR: [
              { sampleCode: { contains: '/F-', mode: 'insensitive' } },
              { sampleId: { contains: '/F-', mode: 'insensitive' } },
              { sampleType: { in: ['FINISHED_PRODUCT', 'STABILITY'] } },
              { remarks: { contains: '[Formulation]', mode: 'insensitive' } },
            ],
            NOT: [
              { sampleCode: { contains: '/SB', mode: 'insensitive' } },
              { sampleId: { contains: '/SB', mode: 'insensitive' } },
            ],
          },
        }),
        prisma.sample.count({
          where: {
            laboratoryType: { in: labTypes },
            priority: { in: ['URGENT', 'STAT'] },
            status: { notIn: ['APPROVED', 'REJECTED', 'ARCHIVED'] },
          },
        }),
      ]);
      return { semiBase, formulation, urgent };
    };

    const [generalSections, penicillinSections, cephalosporinSections] = await Promise.all([
      getLabSectionBreakdown(['GENERAL']),
      getLabSectionBreakdown(['PENICILLIN']),
      getLabSectionBreakdown(['CEPHALOSPORIN', 'SAF']),
    ]);

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
      byLab: {
        general: generalCount,
        penicillin: penicillinCount,
        cephalosporin: cephalosporinCount,
      },
      byLabSections: {
        general: generalSections,
        penicillin: penicillinSections,
        cephalosporin: cephalosporinSections,
      },
    };
  }

  async findAll(query: any, user?: any) {
    const where: any = {};
    const userAssignedLab = this.getUserAssignedLab(user);

    // 1. Status Filter
    if (query.status) {
      if (typeof query.status === 'string' && query.status.includes(',')) {
        where.status = { in: query.status.split(',').map((s: string) => s.trim()).filter(Boolean) };
      } else {
        where.status = query.status;
      }
    }

    // 2. Category / Stage Type / Sample Type Filter
    const cat = (query.category || query.stageType || query.stage || query.sampleType)?.toString().trim();
    if (cat) {
      const catCond: any[] = [
        { stageType: { contains: cat, mode: 'insensitive' } },
        { nomenclature: { contains: cat, mode: 'insensitive' } },
        { materialName: { contains: cat, mode: 'insensitive' } },
      ];
      const upper = cat.toUpperCase().replace(/\s+/g, '_');
      if (['RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'PACKAGING_MATERIAL', 'CONTROL_SAMPLE', 'RETENTION_SAMPLE'].includes(upper)) {
        catCond.push({ sampleType: upper as any });
      }
      if (where.AND) {
        where.AND.push({ OR: catCond });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: catCond }];
        delete where.OR;
      } else {
        where.AND = [{ OR: catCond }];
      }
    }

    // 3. Priority Filter
    if (query.priority) {
      if (typeof query.priority === 'string' && query.priority.includes(',')) {
        where.priority = { in: query.priority.split(',').map((p: string) => p.trim()).filter(Boolean) };
      } else {
        where.priority = query.priority;
      }
    }

    // 4. Batch / Lot Number Filter (supports batchNumber, batchNo, lotNumber, batchId)
    if (query.batchNumber || query.batchNo || query.lotNumber || query.batchId) {
      const b = (query.batchNumber || query.batchNo || query.lotNumber || query.batchId).toString().trim();
      if (b) {
        const batchConditions = [
          { lotNumber: { contains: b, mode: 'insensitive' } },
          { batchLotNumber: { contains: b, mode: 'insensitive' } },
        ];
        if (where.AND) {
          where.AND.push({ OR: batchConditions });
        } else if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: batchConditions }];
          delete where.OR;
        } else {
          where.AND = [{ OR: batchConditions }];
        }
      }
    }

    // 5. Laboratory Access & Target Filter
    if (userAssignedLab !== 'ALL') {
      if (userAssignedLab === 'CEPHALOSPORIN') {
        where.laboratoryType = { in: ['CEPHALOSPORIN', 'SAF'] };
      } else {
        where.laboratoryType = userAssignedLab as any;
      }
    } else {
      const rawLab = query.laboratory || query.lab;
      if (rawLab) {
        const u = rawLab.toString().toUpperCase();
        if (u === 'SEF' || u === 'SAF' || u === 'CP' || u.includes('CEPH')) {
          where.laboratoryType = { in: ['CEPHALOSPORIN', 'SAF'] };
        } else if (u === 'PENICILLIN' || u === 'PEN' || u === 'PL') {
          where.laboratoryType = 'PENICILLIN';
        } else if (u === 'GENERAL' || u === 'GEN' || u === 'GL') {
          where.laboratoryType = 'GENERAL';
        }
      }
    }

    // 6. Sample ID / Accession No Filter
    if (query.sampleId) {
      const sId = query.sampleId.toString().trim();
      const sampleIdConditions = [
        { sampleCode: { contains: sId, mode: 'insensitive' } },
        { sampleId: { contains: sId, mode: 'insensitive' } },
        { accessionNo: { contains: sId, mode: 'insensitive' } },
        { recordNumber: { contains: sId, mode: 'insensitive' } },
      ];
      if (where.AND) {
        where.AND.push({ OR: sampleIdConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: sampleIdConditions }];
        delete where.OR;
      } else {
        where.AND = [{ OR: sampleIdConditions }];
      }
    }

    // 7. Nomenclature / Material Name Filter
    if (query.nomenclature) {
      const n = query.nomenclature.toString().trim();
      const nomConditions = [
        { nomenclature: { contains: n, mode: 'insensitive' } },
        { materialName: { contains: n, mode: 'insensitive' } },
      ];
      if (where.AND) {
        where.AND.push({ OR: nomConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: nomConditions }];
        delete where.OR;
      } else {
        where.AND = [{ OR: nomConditions }];
      }
    }

    // 8. MFG Date Filter
    if (query.mfgDate) {
      const rawMfg = query.mfgDate.toString().trim();
      const d = new Date(rawMfg);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        const mfgCond = [
          { mfgDate: { gte: start, lte: end } },
          { manufacturingDate: { gte: start, lte: end } },
        ];
        if (where.AND) {
          where.AND.push({ OR: mfgCond });
        } else if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: mfgCond }];
          delete where.OR;
        } else {
          where.AND = [{ OR: mfgCond }];
        }
      }
    }

    // 9. EXP Date Filter
    if (query.expDate) {
      const rawExp = query.expDate.toString().trim();
      const d = new Date(rawExp);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        const expCond = [
          { expDate: { gte: start, lte: end } },
          { expiryDate: { gte: start, lte: end } },
        ];
        if (where.AND) {
          where.AND.push({ OR: expCond });
        } else if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: expCond }];
          delete where.OR;
        } else {
          where.AND = [{ OR: expCond }];
        }
      }
    }

    // 10. Date Range Filter (From Date / To Date for sampling intake)
    if (query.startDate || query.endDate) {
      const dateRangeCond: any = {};
      if (query.startDate) {
        const sDate = new Date(query.startDate.toString().trim());
        if (!isNaN(sDate.getTime())) {
          sDate.setHours(0, 0, 0, 0);
          dateRangeCond.gte = sDate;
        }
      }
      if (query.endDate) {
        const eDate = new Date(query.endDate.toString().trim());
        if (!isNaN(eDate.getTime())) {
          eDate.setHours(23, 59, 59, 999);
          dateRangeCond.lte = eDate;
        }
      }
      if (dateRangeCond.gte || dateRangeCond.lte) {
        const samplingCond = [
          { samplingDate: dateRangeCond },
          { sampledAt: dateRangeCond },
        ];
        if (where.AND) {
          where.AND.push({ OR: samplingCond });
        } else if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: samplingCond }];
          delete where.OR;
        } else {
          where.AND = [{ OR: samplingCond }];
        }
      }
    }

    // 11. Universal Keyword / Text Search across ALL fields
    if (query.search) {
      const s = query.search.trim();
      const searchConditions: any[] = [
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { sampleId: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { recordNumber: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
        { materialName: { contains: s, mode: 'insensitive' } },
        { lotNumber: { contains: s, mode: 'insensitive' } },
        { batchLotNumber: { contains: s, mode: 'insensitive' } },
        { stageType: { contains: s, mode: 'insensitive' } },
        { submittedBy: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
      ];
      const d = new Date(s);
      if (!isNaN(d.getTime()) && s.length >= 8) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        searchConditions.push(
          { mfgDate: { gte: start, lte: end } },
          { manufacturingDate: { gte: start, lte: end } },
          { expDate: { gte: start, lte: end } },
          { expiryDate: { gte: start, lte: end } }
        );
      }

      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.AND = [{ OR: searchConditions }];
      }
    }

    // Sub-section filter (semi-base vs formulation)
    if (query.section) {
      const sec = query.section.toString().toLowerCase();
      let sectionCond: any[] = [];
      let excludeCond: any[] = [];

      if (sec === 'semi-base' || sec === 'semi-basics' || sec === 'semi_base') {
        sectionCond = [
          { sampleCode: { contains: '/SB', mode: 'insensitive' } },
          { sampleId: { contains: '/SB', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Basic', mode: 'insensitive' } },
          { stageType: { contains: '[Semi Base', mode: 'insensitive' } },
          { sampleType: { in: ['RAW_MATERIAL', 'IN_PROCESS'] } },
        ];
        excludeCond = [
          { sampleCode: { contains: '/F-', mode: 'insensitive' } },
          { sampleId: { contains: '/F-', mode: 'insensitive' } },
        ];
      } else if (sec === 'formulation') {
        sectionCond = [
          { sampleCode: { contains: '/F-', mode: 'insensitive' } },
          { sampleId: { contains: '/F-', mode: 'insensitive' } },
          { sampleType: { in: ['FINISHED_PRODUCT', 'STABILITY'] } },
          { remarks: { contains: '[Formulation]', mode: 'insensitive' } },
        ];
        excludeCond = [
          { sampleCode: { contains: '/SB', mode: 'insensitive' } },
          { sampleId: { contains: '/SB', mode: 'insensitive' } },
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

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          batch: { select: { id: true, batchNumber: true, drugProduct: true, status: true } },
          laboratory: { select: { id: true, name: true, code: true } },
          accessionedBy: { select: { id: true, fullName: true, employeeId: true, department: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true, department: true } },
          tests: {
            include: {
              testSpecification: true,
              instrument: true,
              analyst: { select: { id: true, fullName: true, employeeId: true, username: true } },
            },
            orderBy: { createdAt: 'asc' },
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

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrCode: string, user?: any) {
    const sample = await prisma.sample.findFirst({
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
      throw new AppError(`Sample with identifier '${idOrCode}' not found`, 404);
    }

    return sample;
  }

  async create(createDto: any, user: any) {
    const rawLab = (createDto.laboratory || createDto.laboratoryType || 'GENERAL').toString().toUpperCase();
    let laboratoryType = 'GENERAL';
    if (rawLab.includes('CEPH') || rawLab === 'SAF' || rawLab === 'SEF') {
      laboratoryType = 'CEPHALOSPORIN';
    } else if (rawLab.includes('PEN')) {
      laboratoryType = 'PENICILLIN';
    }

    const stageTypeVal = (createDto.stageType || createDto.sampleType || 'Finished Product').toString().trim();
    let sampleTypeEnum: any = null;
    const lowerStage = stageTypeVal.toLowerCase();
    if (lowerStage.includes('raw') || lowerStage.includes('api') || lowerStage.includes('excipient')) {
      sampleTypeEnum = 'RAW_MATERIAL';
    } else if (lowerStage.includes('process') || lowerStage.includes('blend') || lowerStage.includes('granul') || lowerStage.includes('core')) {
      sampleTypeEnum = 'IN_PROCESS';
    } else if (lowerStage.includes('stability')) {
      sampleTypeEnum = 'STABILITY';
    } else if (lowerStage.includes('water')) {
      sampleTypeEnum = 'WATER_PURIFIED';
    } else if (lowerStage.includes('swab') || lowerStage.includes('environ')) {
      sampleTypeEnum = 'ENVIRONMENTAL_SWAB';
    } else {
      sampleTypeEnum = 'FINISHED_PRODUCT';
    }

    let priorityEnum: any = 'ROUTINE';
    const prioStr = (createDto.priority || '').toString().toUpperCase();
    if (['ROUTINE', 'URGENT', 'STABILITY', 'STAT'].includes(prioStr)) {
      priorityEnum = prioStr;
    } else if (prioStr === 'NORMAL') {
      priorityEnum = 'ROUTINE';
    } else if (prioStr === 'HIGH') {
      priorityEnum = 'URGENT';
    }

    const sampleCode =
      createDto.sampleCode ||
      (await this.generateSampleCode(laboratoryType, createDto.stageType, createDto.section));

    const accessionNo =
      createDto.accessionNo ||
      (await this.generateAccessionNo(laboratoryType, createDto.stageType, createDto.section));

    const labRecord = await prisma.laboratory.findFirst({
      where: {
        code: {
          in: laboratoryType === 'CEPHALOSPORIN'
            ? ['CEPH', 'CEPHALOSPORIN']
            : laboratoryType === 'PENICILLIN'
            ? ['PEN', 'PENICILLIN']
            : ['GL', 'GEN', 'GENERAL'],
          mode: 'insensitive',
        },
      },
    });

    const mfgDate = createDto.mfgDate ? new Date(createDto.mfgDate) : null;
    const expDate = createDto.expDate ? new Date(createDto.expDate) : null;
    const samplingDate = createDto.samplingDate ? new Date(createDto.samplingDate) : new Date();
    const qty = createDto.sampleQty ? parseFloat(createDto.sampleQty) : 1;
    const unitStr = createDto.unit || 'units';

    return prisma.$transaction(async (tx) => {
      const sample = await tx.sample.create({
        data: {
          sampleCode,
          sampleId: sampleCode,
          accessionNo,
          recordNumber: accessionNo,
          barcode: createDto.barcode || sampleCode,
          materialName: createDto.materialName || createDto.nomenclature || 'Pharmaceutical Substance',
          nomenclature: createDto.nomenclature || createDto.materialName || 'Pharmaceutical Substance',
          lotNumber: createDto.lotNumber || 'N/A',
          batchLotNumber: createDto.lotNumber || null,
          sampleType: sampleTypeEnum,
          stageType: stageTypeVal,
          laboratoryId: labRecord?.id || null,
          laboratoryType: laboratoryType as any,
          priority: priorityEnum,
          sampleQty: qty,
          quantity: qty,
          unit: unitStr,
          quantityUnit: unitStr,
          storageCondition: createDto.storageCondition || 'Controlled Room Temp 20-25°C',
          submittedBy: createDto.submittedBy || user.fullName,
          sourceSupplier: createDto.sourceSupplier || null,
          samplingLocation: createDto.samplingLocation || 'Laboratory Receiving Bay',
          samplingDate,
          sampledAt: samplingDate,
          mfgDate,
          manufacturingDate: mfgDate,
          expDate,
          expiryDate: expDate,
          accessionedById: user.id,
          batchId: createDto.batchId || null,
          status: 'RECEIVED',
          chainOfCustody: `[${new Date().toISOString()}] Accessioned by ${user.fullName} (${user.employeeId})`,
          remarks: createDto.remarks || null,
        },
        include: {
          batch: true,
          accessionedBy: { select: { id: true, fullName: true, employeeId: true } },
          tests: true,
        },
      });

      if (createDto.testSpecificationIds && createDto.testSpecificationIds.length > 0) {
        const specs = await tx.testSpecification.findMany({
          where: { id: { in: createDto.testSpecificationIds } },
        });

        for (const spec of specs) {
          await tx.sampleTest.create({
            data: {
              sampleId: sample.id,
              testSpecificationId: spec.id,
              status: 'PENDING',
              resultStatus: 'NOT_TESTED',
              analystId: createDto.assignedToId || null,
            },
          });
        }
      }

      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: sample.id,
          action: 'SAMPLE_ACCESSIONED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `New sample accessioned: ${sample.sampleCode}`,
        },
      });

      return sample;
    });
  }

  async update(id: string, updateDto: any, user: any) {
    const existing = await prisma.sample.findFirst({
      where: {
        OR: [{ id }, { sampleCode: id }, { sampleId: id }, { accessionNo: id }],
      },
    });

    if (!existing) {
      throw new AppError(`Sample with ID or code ${id} not found`, 404);
    }

    const { reasonForChange, ...data } = updateDto;

    // Resolve assignedToId if it was provided as employeeId, username, or id
    if (data.assignedToId) {
      const userRecord = await prisma.user.findFirst({
        where: {
          OR: [
            { id: data.assignedToId },
            { employeeId: data.assignedToId },
            { username: data.assignedToId },
          ],
        },
      });
      if (userRecord) {
        data.assignedToId = userRecord.id;
      } else {
        delete data.assignedToId;
      }
    }

    return prisma.$transaction(async (tx) => {
      let chainOfCustodyUpdate = existing.chainOfCustody;
      if (data.status && data.status !== existing.status) {
        chainOfCustodyUpdate = `${existing.chainOfCustody || ''}\n[${new Date().toISOString()}] Status transitioned to ${data.status} by ${user.fullName}`;
      }

      const updated = await tx.sample.update({
        where: { id: existing.id },
        data: {
          ...data,
          chainOfCustody: data.chainOfCustody || chainOfCustodyUpdate,
        },
        include: {
          batch: true,
          accessionedBy: { select: { id: true, fullName: true, employeeId: true } },
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          tests: true,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Sample',
          entityId: updated.id,
          action: 'SAMPLE_UPDATED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: reasonForChange || `Sample updated: ${updated.sampleCode}`,
        },
      });

      return updated;
    });
  }

  async submitToWorkflow(sampleId: string, dto: any, user: any) {
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId },
      include: { batch: true },
    });

    if (!sample) {
      throw new AppError(`Sample with ID ${sampleId} not found`, 404);
    }

    const destinationLab = dto.destinationLab || 'General Lab';

    return prisma.$transaction(async (tx) => {
      const submission = await tx.sampleSubmission.create({
        data: {
          sampleId,
          destinationLaboratory: destinationLab,
          destinationLabEnum: dto.destinationLabEnum || 'GENERAL',
          submittedByUserId: user.id,
          submittedByName: `${user.fullName} (${user.employeeId})`,
          submissionDate: new Date(),
          status: dto.status || SubmissionStatus.SUBMITTED,
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
              status: true,
            },
          },
        },
      });

      await tx.sample.update({
        where: { id: sampleId },
        data: {
          status: 'TESTING_IN_PROGRESS',
          chainOfCustody: `${sample.chainOfCustody || ''}\n[${new Date().toISOString()}] Submitted to ${destinationLab} by ${user.fullName}`,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submission.id,
          action: 'SAMPLE_SUBMITTED_TO_WORKFLOW',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `Sample ${sample.sampleCode} routed to ${destinationLab}`,
        },
      });

      return submission;
    });
  }

  async getSampleSubmissions(sampleId: string) {
    return prisma.sampleSubmission.findMany({
      where: { sampleId },
      include: {
        submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllSubmissions(query: any) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.destinationLab) where.destinationLaboratory = query.destinationLab;

    return prisma.sampleSubmission.findMany({
      where,
      include: {
        sample: true,
        submittedByUser: { select: { id: true, fullName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubmissionStatus(submissionId: string, dto: any, user: any) {
    const submission = await prisma.sampleSubmission.findUnique({
      where: { id: submissionId },
      include: { sample: true },
    });

    if (!submission) {
      throw new AppError(`Submission ${submissionId} not found`, 404);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.sampleSubmission.update({
        where: { id: submissionId },
        data: {
          status: dto.status,
          remarks: dto.remarks ? `${submission.remarks || ''}\n${dto.remarks}` : submission.remarks,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'SampleSubmission',
          entityId: submissionId,
          action: 'SUBMISSION_STATUS_UPDATED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: dto.reasonForChange || `Submission status updated to ${dto.status}`,
        },
      });

      return updated;
    });
  }
}

export const samplingService = new SamplingService();
