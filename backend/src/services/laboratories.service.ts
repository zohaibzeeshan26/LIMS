import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export class LaboratoriesService {
  async findAllLaboratories() {
    return prisma.laboratory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            samples: true,
            sampleSubmissions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findLaboratorySamples(laboratoryId: string, query: any) {
    const lab = await prisma.laboratory.findFirst({
      where: {
        OR: [
          { id: laboratoryId },
          { code: { equals: laboratoryId, mode: 'insensitive' } },
          { name: { contains: laboratoryId, mode: 'insensitive' } },
        ],
      },
    });

    if (!lab) {
      throw new AppError(`Laboratory '${laboratoryId}' not found`, 404);
    }

    const where: any = { laboratoryId: lab.id };

    if (query.status) where.status = query.status;
    if (query.stageType) where.stageType = query.stageType;
    if (query.priority) where.priority = query.priority;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { sampleId: { contains: s, mode: 'insensitive' } },
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { recordNumber: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
      ];
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
        orderBy: { createdAt: 'desc' },
        include: {
          batch: { select: { id: true, batchNumber: true, drugProduct: true } },
          _count: { select: { tests: true, submissions: true } },
        },
      }),
    ]);

    return {
      laboratory: lab,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll() {
    const instruments = await prisma.instrument.findMany({
      include: {
        calibrationLogs: {
          orderBy: { calibrationDate: 'desc' },
          take: 3,
          include: { calibratedBy: { select: { fullName: true } } },
        },
        _count: { select: { sampleTests: true, calibrationLogs: true } },
      },
      orderBy: { equipmentCode: 'asc' },
    });

    const now = new Date();
    return instruments.map((inst) => {
      const isOverdue = new Date(inst.nextCalibrationDue) < now;
      const isDueSoon =
        !isOverdue &&
        new Date(inst.nextCalibrationDue).getTime() - now.getTime() < 14 * 24 * 60 * 60 * 1000;

      let computedStatus = inst.status;
      if (inst.status !== 'OUT_OF_SERVICE' && inst.status !== 'MAINTENANCE') {
        if (isOverdue || isDueSoon) {
          computedStatus = 'CALIBRATION_DUE';
        }
      }

      return {
        ...inst,
        status: computedStatus,
        isOverdue,
        isDueSoon,
      };
    });
  }

  async findOne(id: string) {
    const inst = await prisma.instrument.findUnique({
      where: { id },
      include: {
        calibrationLogs: {
          orderBy: { calibrationDate: 'desc' },
          include: { calibratedBy: { select: { fullName: true, employeeId: true } } },
        },
        sampleTests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            sample: { select: { sampleCode: true, materialName: true } },
            testSpecification: { select: { name: true } },
          },
        },
      },
    });

    if (!inst) throw new AppError('Instrument not found', 404);
    return inst;
  }

  async create(dto: any, user: any) {
    const frequency = dto.calibrationFrequencyDays || 90;
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + frequency);

    const instrument = await prisma.instrument.create({
      data: {
        equipmentCode: dto.equipmentCode,
        name: dto.name,
        model: dto.model,
        serialNumber: dto.serialNumber,
        manufacturer: dto.manufacturer,
        laboratoryRoom: dto.laboratoryRoom,
        status: dto.status || 'QUALIFIED',
        calibrationFrequencyDays: frequency,
        lastCalibrationDate: new Date(),
        nextCalibrationDue: nextDue,
        remarks: dto.remarks,
      },
    });

    await prisma.auditTrail.create({
      data: {
        entityName: 'Instrument',
        entityId: instrument.id,
        action: 'EQUIPMENT_REGISTERED',
        performedById: user.id,
        performedByName: user.fullName,
        role: user.role,
        reasonForChange: `Registered lab equipment ${instrument.equipmentCode}`,
      },
    });

    return instrument;
  }

  async logCalibration(id: string, dto: any, user: any) {
    const instrument = await prisma.instrument.findUnique({ where: { id } });
    if (!instrument) throw new AppError('Instrument not found', 404);

    const calibrationDate = new Date();
    const nextDue = new Date(calibrationDate);
    nextDue.setDate(nextDue.getDate() + instrument.calibrationFrequencyDays);

    const passed = dto.passed ?? true;
    const newStatus = passed ? 'QUALIFIED' : 'OUT_OF_SERVICE';

    return prisma.$transaction(async (tx) => {
      const log = await tx.calibrationLog.create({
        data: {
          instrumentId: id,
          calibrationDate,
          calibratedById: user.id,
          certificateNumber: dto.certificateNumber,
          standardUsed: dto.standardUsed,
          passed,
          nextDue,
          remarks: dto.remarks,
        },
      });

      const updatedInstrument = await tx.instrument.update({
        where: { id },
        data: {
          lastCalibrationDate: calibrationDate,
          nextCalibrationDue: nextDue,
          status: newStatus as any,
        },
      });

      await tx.auditTrail.create({
        data: {
          entityName: 'Instrument',
          entityId: id,
          action: 'CALIBRATION_LOGGED',
          performedById: user.id,
          performedByName: user.fullName,
          role: user.role,
          reasonForChange: `Recorded calibration certificate ${dto.certificateNumber}. Result: ${passed ? 'PASSED' : 'FAILED'}`,
        },
      });

      return { log, instrument: updatedInstrument };
    });
  }

  private normalizeLabKey(lab?: string): 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' {
    const u = (lab || '').toUpperCase();
    if (u === 'PENICILLIN' || u === 'PEN' || u === 'PL') return 'PENICILLIN';
    if (u === 'CEPHALOSPORIN' || u === 'CEPH' || u === 'SAF' || u === 'SEF' || u === 'CP') return 'CEPHALOSPORIN';
    return 'GENERAL';
  }

  private getLabWhereClause(labKey: 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN') {
    if (labKey === 'CEPHALOSPORIN') {
      return {
        OR: [
          { laboratoryType: 'CEPHALOSPORIN' as any },
          { laboratoryType: 'SAF' as any },
          { sampleId: { startsWith: 'CEPH/' } },
          { sampleCode: { startsWith: 'CEPH/' } },
        ],
      };
    }
    if (labKey === 'PENICILLIN') {
      return {
        OR: [
          { laboratoryType: 'PENICILLIN' as any },
          { sampleId: { startsWith: 'PEN/' } },
          { sampleCode: { startsWith: 'PEN/' } },
        ],
      };
    }
    return {
      OR: [
        { laboratoryType: 'GENERAL' as any },
        { sampleId: { startsWith: 'GL/' } },
        { sampleCode: { startsWith: 'GL/' } },
      ],
    };
  }

  private parseDateFilter(filter?: string, customStart?: string, customEnd?: string) {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let filterType = (filter || 'today').toLowerCase();
    let label = 'Today';

    if (filterType === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      label = 'Yesterday';
    } else if (filterType === 'last7days') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Last 7 Days';
    } else if (filterType === 'last30days') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Last 30 Days';
    } else if (filterType === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      label = `${customStart} to ${customEnd}`;
    } else {
      filterType = 'today';
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = 'Today';
    }

    return { filterType, start, end, label };
  }

  // Lab Operations Dashboard Summary across all 3 labs
  async getLabOperationsSummary(query: any, user?: any) {
    const { filterType, start, end, label } = this.parseDateFilter(query.filter, query.startDate, query.endDate);

    const labsConfig = [
      { id: 'general', key: 'GENERAL' as const, name: 'General Lab', code: 'GL' },
      { id: 'cephalosporin', key: 'CEPHALOSPORIN' as const, name: 'Cephalosporin Lab', code: 'CEPH' },
      { id: 'penicillin', key: 'PENICILLIN' as const, name: 'Penicillin Lab', code: 'PEN' },
    ];

    const labsData = await Promise.all(
      labsConfig.map(async (lab) => {
        const whereLab = this.getLabWhereClause(lab.key);

        const [
          totalSamples,
          receivedToday,
          assigned,
          underTesting,
          completed,
          pending,
          passed,
          failed,
        ] = await Promise.all([
          prisma.sample.count({ where: whereLab }),
          prisma.sample.count({
            where: {
              ...whereLab,
              createdAt: { gte: start, lte: end },
            },
          }),
          prisma.sample.count({
            where: {
              ...whereLab,
              OR: [
                { status: { in: ['ASSIGNED', 'ASSIGNED_FOR_TESTING'] as any } },
                { assignedToId: { not: null } },
              ],
            },
          }),
          prisma.sample.count({
            where: {
              ...whereLab,
              status: 'TESTING_IN_PROGRESS',
            },
          }),
          prisma.sample.count({
            where: {
              ...whereLab,
              status: { in: ['APPROVED', 'REJECTED', 'REVIEW_PENDING'] as any },
            },
          }),
          prisma.sample.count({
            where: {
              ...whereLab,
              status: { in: ['RECEIVED', 'LOGGED', 'PENDING_SUPERVISOR_ASSIGNMENT', 'ASSIGNED'] as any },
            },
          }),
          prisma.sample.count({
            where: {
              ...whereLab,
              status: 'APPROVED',
            },
          }),
          prisma.sample.count({
            where: {
              ...whereLab,
              OR: [
                { status: 'REJECTED' },
                { oosIncidents: { some: {} } },
              ],
            },
          }),
        ]);

        const finishedTotal = passed + failed;
        const passRate = finishedTotal > 0 ? ((passed / finishedTotal) * 100).toFixed(1) + '%' : '100.0%';

        return {
          id: lab.id,
          name: lab.name,
          code: lab.code,
          totalSamples,
          receivedToday,
          assigned,
          underTesting,
          completed,
          pending,
          passed,
          failed,
          passRate,
        };
      })
    );

    const overall = labsData.reduce(
      (acc, l) => ({
        totalSamples: acc.totalSamples + l.totalSamples,
        receivedToday: acc.receivedToday + l.receivedToday,
        assigned: acc.assigned + l.assigned,
        underTesting: acc.underTesting + l.underTesting,
        completed: acc.completed + l.completed,
        pending: acc.pending + l.pending,
        passed: acc.passed + l.passed,
        failed: acc.failed + l.failed,
      }),
      {
        totalSamples: 0,
        receivedToday: 0,
        assigned: 0,
        underTesting: 0,
        completed: 0,
        pending: 0,
        passed: 0,
        failed: 0,
      }
    );

    const overallFinished = overall.passed + overall.failed;
    const overallPassRate = overallFinished > 0 ? ((overall.passed / overallFinished) * 100).toFixed(1) + '%' : '100.0%';

    const daysCount = filterType === 'last30days' ? 14 : 7;
    const now = new Date();
    const workloadComparison: any[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      workloadComparison.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        general: 0,
        cephalosporin: 0,
        penicillin: 0,
        total: 0,
      });
    }

    const pastSamples = await prisma.sample.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        sampleId: true,
        sampleCode: true,
        laboratoryType: true,
        createdAt: true,
      },
    });

    for (const s of pastSamples) {
      const dateStr = s.createdAt.toISOString().slice(0, 10);
      const bucket = workloadComparison.find((b) => b.date === dateStr);
      if (bucket) {
        const isCeph =
          s.laboratoryType === 'CEPHALOSPORIN' ||
          s.laboratoryType === ('SAF' as any) ||
          (s.sampleId || '').startsWith('CEPH/');
        const isPen = s.laboratoryType === 'PENICILLIN' || (s.sampleId || '').startsWith('PEN/');
        if (isCeph) bucket.cephalosporin++;
        else if (isPen) bucket.penicillin++;
        else bucket.general++;
        bucket.total++;
      }
    }

    const performanceComparison = labsData.map((l) => ({
      labName: l.name,
      code: l.code,
      received: l.receivedToday,
      completed: l.completed,
      passed: l.passed,
      failed: l.failed,
      pending: l.pending,
      underTesting: l.underTesting,
      passRate: parseFloat(l.passRate) || 100,
    }));

    return {
      filter: {
        type: filterType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label,
      },
      overall: {
        ...overall,
        passRate: overallPassRate,
      },
      labs: labsData,
      workloadComparison,
      performanceComparison,
    };
  }

  // Individual Lab Operations Dashboard
  async getIndividualLabOperations(labIdParam: string, query: any, user?: any) {
    const labKey = this.normalizeLabKey(labIdParam);
    const labName =
      labKey === 'CEPHALOSPORIN'
        ? 'Cephalosporin Lab'
        : labKey === 'PENICILLIN'
        ? 'Penicillin Lab'
        : 'General Lab';
    const labCode = labKey === 'CEPHALOSPORIN' ? 'CEPH' : labKey === 'PENICILLIN' ? 'PEN' : 'GL';

    const { filterType, start, end, label } = this.parseDateFilter(query.filter, query.startDate, query.endDate);
    const whereLab = this.getLabWhereClause(labKey);

    const [
      totalSamples,
      receivedToday,
      assigned,
      underTesting,
      completed,
      pending,
      passed,
      failed,
    ] = await Promise.all([
      prisma.sample.count({ where: whereLab }),
      prisma.sample.count({
        where: {
          ...whereLab,
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.sample.count({
        where: {
          ...whereLab,
          OR: [
            { status: { in: ['ASSIGNED', 'ASSIGNED_FOR_TESTING'] as any } },
            { assignedToId: { not: null } },
          ],
        },
      }),
      prisma.sample.count({
        where: {
          ...whereLab,
          status: 'TESTING_IN_PROGRESS',
        },
      }),
      prisma.sample.count({
        where: {
          ...whereLab,
          status: { in: ['APPROVED', 'REJECTED', 'REVIEW_PENDING'] as any },
        },
      }),
      prisma.sample.count({
        where: {
          ...whereLab,
          status: { in: ['RECEIVED', 'LOGGED', 'PENDING_SUPERVISOR_ASSIGNMENT', 'ASSIGNED'] as any },
        },
      }),
      prisma.sample.count({
        where: {
          ...whereLab,
          status: 'APPROVED',
        },
      }),
      prisma.sample.count({
        where: {
          ...whereLab,
          OR: [
            { status: 'REJECTED' },
            { oosIncidents: { some: {} } },
          ],
        },
      }),
    ]);

    const finishedTotal = passed + failed;
    const passRate = finishedTotal > 0 ? ((passed / finishedTotal) * 100).toFixed(1) + '%' : '100.0%';

    // Analyst-wise assigned work
    const usersInLab = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { assignedSamples: { some: whereLab } },
          { assignedLab: { equals: labKey, mode: 'insensitive' } },
          { role: { in: ['QC_ANALYST', 'ANALYST', 'TESTING_ANALYST', 'ADMIN'] } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        department: true,
        role: true,
        assignedLab: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const analystsWorkload = await Promise.all(
      usersInLab.map(async (u) => {
        const analystWhere = {
          ...whereLab,
          assignedToId: u.id,
        };

        const [assignedCount, inProgressCount, completedCount, passedCount, failedCount] = await Promise.all([
          prisma.sample.count({ where: analystWhere }),
          prisma.sample.count({ where: { ...analystWhere, status: 'TESTING_IN_PROGRESS' } }),
          prisma.sample.count({ where: { ...analystWhere, status: { in: ['APPROVED', 'REJECTED', 'REVIEW_PENDING'] as any } } }),
          prisma.sample.count({ where: { ...analystWhere, status: 'APPROVED' } }),
          prisma.sample.count({ where: { ...analystWhere, OR: [{ status: 'REJECTED' }, { oosIncidents: { some: {} } }] } }),
        ]);

        return {
          analystId: u.id,
          analystName: u.fullName,
          username: u.username || '',
          designation: u.role || 'QC Analyst',
          department: u.department || 'Quality Control',
          assigned: assignedCount,
          inProgress: inProgressCount,
          completed: completedCount,
          pending: Math.max(0, assignedCount - completedCount),
          passed: passedCount,
          failed: failedCount,
        };
      })
    );

    const unassignedCount = await prisma.sample.count({
      where: {
        ...whereLab,
        assignedToId: null,
      },
    });

    const now = new Date();
    const dailyTrend: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dailyTrend.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        received: 0,
        completed: 0,
        passed: 0,
      });
    }

    const labPastSamples = await prisma.sample.findMany({
      where: {
        ...whereLab,
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    for (const s of labPastSamples) {
      const dateStr = s.createdAt.toISOString().slice(0, 10);
      const bucket = dailyTrend.find((b) => b.date === dateStr);
      if (bucket) {
        bucket.received++;
        if (s.status === 'APPROVED' || s.status === 'REJECTED' || s.status === 'REVIEW_PENDING') {
          bucket.completed++;
        }
        if (s.status === 'APPROVED') {
          bucket.passed++;
        }
      }
    }

    const testingProgress = {
      received: receivedToday,
      assigned,
      inAnalysis: underTesting,
      reviewPending: await prisma.sample.count({ where: { ...whereLab, status: 'REVIEW_PENDING' } }),
      approved: passed,
      rejected: failed,
    };

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const sampleWhere: any = { ...whereLab };
    if (query.status && query.status !== 'ALL') {
      sampleWhere.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      sampleWhere.OR = [
        { sampleId: { contains: s, mode: 'insensitive' } },
        { sampleCode: { contains: s, mode: 'insensitive' } },
        { recordNumber: { contains: s, mode: 'insensitive' } },
        { accessionNo: { contains: s, mode: 'insensitive' } },
        { nomenclature: { contains: s, mode: 'insensitive' } },
        { batchLotNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [sampleTotal, sampleRecords] = await Promise.all([
      prisma.sample.count({ where: sampleWhere }),
      prisma.sample.findMany({
        where: sampleWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, fullName: true, employeeId: true } },
          batch: { select: { id: true, batchNumber: true, drugProduct: true } },
          _count: { select: { tests: true, oosIncidents: true, coas: true } },
          tests: {
            select: {
              id: true,
              status: true,
              resultStatus: true,
              testSpecification: { select: { name: true, testCode: true } },
            },
          },
        },
      }),
    ]);

    const formattedSamples = sampleRecords.map((s) => {
      let result = 'PENDING';
      if (s.status === 'APPROVED') result = 'PASSED';
      else if (s.status === 'REJECTED' || s._count.oosIncidents > 0) result = 'FAILED';

      let testProgress = 'Received';
      if (s.status === 'APPROVED') testProgress = 'Approved';
      else if (s.status === 'REJECTED') testProgress = 'Rejected';
      else if (s.status === 'REVIEW_PENDING') testProgress = 'Quality Review';
      else if (s.status === 'TESTING_IN_PROGRESS') testProgress = 'In Analysis';
      else if (s.assignedTo) testProgress = 'Assigned';

      return {
        id: s.id,
        sampleId: s.sampleId || s.sampleCode || s.accessionNo || s.id,
        sampleCode: s.sampleCode || s.sampleId,
        recordNumber: s.recordNumber,
        nomenclature: s.nomenclature || s.materialName || 'Pharmaceutical Sample',
        batchLotNumber: s.batchLotNumber || s.lotNumber || s.batch?.batchNumber || '—',
        priority: s.priority,
        stageType: s.stageType,
        status: s.status,
        assignedToId: s.assignedTo?.id || null,
        assignedToName: s.assignedTo?.fullName || 'Unassigned',
        testProgress,
        result,
        testsCount: s._count.tests,
        tests: s.tests,
        hasOos: s._count.oosIncidents > 0,
        hasCoa: s._count.coas > 0,
        sampledAt: s.sampledAt,
        createdAt: s.createdAt,
      };
    });

    const recentActivities = await prisma.auditTrail.findMany({
      where: {
        OR: [
          { entityName: 'Sample' },
          { entityName: 'SampleTest' },
          { entityName: 'CertificateOfAnalysis' },
        ],
      },
      take: 12,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        performedByName: true,
        role: true,
        timestamp: true,
        reasonForChange: true,
        entityId: true,
        entityName: true,
      },
    });

    return {
      laboratory: {
        id: labIdParam,
        key: labKey,
        name: labName,
        code: labCode,
      },
      filter: {
        type: filterType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label,
      },
      metrics: {
        totalSamples,
        receivedToday,
        assigned,
        underTesting,
        completed,
        pending,
        passed,
        failed,
        passRate,
        unassignedCount,
      },
      analystsWorkload,
      dailyTrend,
      testingProgress,
      recentActivities,
      samples: {
        data: formattedSamples,
        meta: {
          total: sampleTotal,
          page,
          limit,
          totalPages: Math.ceil(sampleTotal / limit),
        },
      },
    };
  }
}

export const laboratoriesService = new LaboratoriesService();
