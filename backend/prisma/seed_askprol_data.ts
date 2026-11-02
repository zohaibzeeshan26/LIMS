import { PrismaClient, TestCategory, TestStatus, ResultStatus, BatchStatus, SampleStatus, Priority, LaboratoryType, SampleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING OFFICIAL ASKPROL SUSPENSION 120mg/5ml ATM-003 DATA ---');

  // 1. Get or create General Lab
  let generalLab = await prisma.laboratory.findFirst({
    where: { OR: [{ code: 'GL' }, { name: 'General Lab' }] },
  });
  if (!generalLab) {
    generalLab = await prisma.laboratory.create({
      data: { name: 'General Lab', code: 'GL', isActive: true },
    });
  }

  // 2. Get active analyst user (e.g. analyst1 or analyst or admin)
  const analystUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'analyst1' },
        { username: 'analyst' },
        { role: 'ANALYST' },
      ],
    },
  });

  const adminUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: 'admin' }, { role: 'ADMIN' }],
    },
  });

  const assignedUserId = analystUser?.id || adminUser?.id;

  // 3. Ensure Instruments exist
  const instrumentsData = [
    {
      equipmentCode: 'HPLC-01',
      name: 'Agilent 1260 Infinity II HPLC',
      model: '1260 Infinity II',
      serialNumber: 'DEAG014298',
      manufacturer: 'Agilent Technologies',
      laboratoryRoom: 'Room 204 - Chromatography Suite',
      status: 'QUALIFIED' as const,
      calibrationFrequencyDays: 180,
      lastCalibrationDate: new Date('2026-05-15'),
      nextCalibrationDue: new Date('2026-11-15'),
    },
    {
      equipmentCode: 'HPLC-02',
      name: 'Waters Alliance e2695 HPLC',
      model: 'Alliance e2695',
      serialNumber: 'WAT-881920',
      manufacturer: 'Waters Corporation',
      laboratoryRoom: 'Room 204 - Chromatography Suite',
      status: 'QUALIFIED' as const,
      calibrationFrequencyDays: 180,
      lastCalibrationDate: new Date('2026-06-01'),
      nextCalibrationDue: new Date('2026-12-01'),
    },
    {
      equipmentCode: 'PH-01',
      name: 'Mettler Toledo SevenDirect pH Meter',
      model: 'SD20 SevenDirect',
      serialNumber: 'MT-PH-2026-09',
      manufacturer: 'Mettler Toledo',
      laboratoryRoom: 'Room 201 - Wet Chemistry Lab',
      status: 'QUALIFIED' as const,
      calibrationFrequencyDays: 30,
      lastCalibrationDate: new Date('2026-10-01'),
      nextCalibrationDue: new Date('2026-11-01'),
    },
  ];

  for (const inst of instrumentsData) {
    await prisma.instrument.upsert({
      where: { equipmentCode: inst.equipmentCode },
      update: inst,
      create: inst,
    });
  }

  const hplcInstrument = await prisma.instrument.findUnique({ where: { equipmentCode: 'HPLC-01' } });
  const phInstrument = await prisma.instrument.findUnique({ where: { equipmentCode: 'PH-01' } });

  // 4. Create Master Test Specifications from QC/CLG/ATM-003 Version 06
  const specifications = [
    {
      testCode: 'SPEC-ASK-BULK-ASSAY',
      name: 'Assay by HPLC (Acetaminophen) - Final Bulk',
      category: TestCategory.CHROMATOGRAPHY,
      pharmacopeiaMethod: 'USP <621>',
      defaultMinLimit: 95.00,
      defaultMaxLimit: 105.00,
      defaultTarget: 100.00,
      unit: '%',
      procedureOverview: 'Isocratic HPLC: L1 Column 3.9mm x 30cm, UV 243nm, Flow 1.5 mL/min, Ambient, Injection 10 uL. Top, Mid, Bottom sampling.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-FG-ASSAY',
      name: 'Assay by HPLC (Acetaminophen) - Finished Pack',
      category: TestCategory.CHROMATOGRAPHY,
      pharmacopeiaMethod: 'USP <621>',
      defaultMinLimit: 90.00,
      defaultMaxLimit: 110.00,
      defaultTarget: 100.00,
      unit: '%',
      procedureOverview: 'Duplicate sampling from 60mL amber container. L1 Column 3.9mm x 30cm, UV 243nm, Flow 1.5 mL/min.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-PH',
      name: 'pH Determination',
      category: TestCategory.CHEMICAL,
      pharmacopeiaMethod: 'USP <791>',
      defaultMinLimit: 4.00,
      defaultMaxLimit: 6.90,
      defaultTarget: 5.45,
      unit: 'pH',
      procedureOverview: 'Calibrated pH meter with thermal probe. Shake sample well before testing.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-DENSITY',
      name: 'Density Determination (Pycnometer)',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'In-House',
      defaultMinLimit: 1.0400,
      defaultMaxLimit: 1.1300,
      defaultTarget: 1.0850,
      unit: 'g/mL',
      procedureOverview: 'Gay-Lussac Pycnometer: Empty (W1), With Sample (W2), Sample wt (W3 = W2 - W1). Density = W3 / Volume.',
      requiresInstrument: false,
    },
    {
      testCode: 'SPEC-ASK-DELIV-VOL',
      name: 'Deliverable Volume (10 Containers)',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'USP <698>',
      defaultMinLimit: 100.00,
      defaultMaxLimit: 110.00,
      defaultTarget: 100.00,
      unit: '%',
      procedureOverview: 'Discharge 10 containers into graduated cylinders, drain 10 min. Average NLT 100%, no container < 95%.',
      requiresInstrument: false,
    },
    {
      testCode: 'SPEC-ASK-DOSAGE-UNIF',
      name: 'Uniformity of Dosage Units (AV)',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'USP <905>',
      defaultMinLimit: 0.00,
      defaultMaxLimit: 15.00,
      defaultTarget: 0.00,
      unit: 'AV',
      procedureOverview: '10 dosage units tested by HPLC. Acceptance Value AV = |M - X| + 2.4s. Target T = 103, L1 <= 15.0.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-IMPURITY',
      name: '4-Aminophenol Impurities by HPLC',
      category: TestCategory.CHROMATOGRAPHY,
      pharmacopeiaMethod: 'USP <227>',
      defaultMinLimit: 0.00,
      defaultMaxLimit: 0.15,
      defaultTarget: 0.02,
      unit: '%',
      procedureOverview: 'LC-Gradient: L85 Column 4.6x15cm, UV 300nm, Flow 1.0 mL/min, 30°C. NMT 0.15% relative to Acetaminophen.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-SUSPENDED',
      name: 'Suspended Matters Test',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'In-House',
      defaultMinLimit: null,
      defaultMaxLimit: null,
      defaultTarget: null,
      unit: 'Text',
      procedureOverview: 'Shake 3-5 min, centrifuge min 10mL at 3500 rpm for 10 min. All suspended particles must settle down.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-ID-HPLC',
      name: 'Identification by HPLC',
      category: TestCategory.CHROMATOGRAPHY,
      pharmacopeiaMethod: 'USP <621>',
      defaultMinLimit: null,
      defaultMaxLimit: null,
      defaultTarget: null,
      unit: 'Text',
      procedureOverview: 'Retention time of Acetaminophen peak of sample solution corresponds to standard solution.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-ID-FTIR',
      name: 'Identification by FTIR',
      category: TestCategory.CHEMICAL,
      pharmacopeiaMethod: 'USP <197>',
      defaultMinLimit: null,
      defaultMaxLimit: null,
      defaultTarget: null,
      unit: 'Text',
      procedureOverview: 'IR Spectrum complies with USP Acetaminophen Standard.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-DESC-CONTENT',
      name: 'Description of Content',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'As per BMR',
      defaultMinLimit: null,
      defaultMaxLimit: null,
      defaultTarget: null,
      unit: 'Text',
      procedureOverview: 'A reddish color suspension with solid particles uniformly dispersed in it.',
      requiresInstrument: false,
    },
    {
      testCode: 'SPEC-ASK-DESC-PACKING',
      name: 'Description of Packing',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'As per BMR',
      defaultMinLimit: null,
      defaultMaxLimit: null,
      defaultTarget: null,
      unit: 'Text',
      procedureOverview: 'Filled in amber PET / Glass bottle with perforation proof cap. Labeled & packed in export/commercial packing.',
      requiresInstrument: false,
    },
    {
      testCode: 'SPEC-ASK-DEG-EG',
      name: 'Diethylene Glycol & Ethylene Glycol',
      category: TestCategory.CHEMICAL,
      pharmacopeiaMethod: 'WHO QAS/23.922',
      defaultMinLimit: 0.00,
      defaultMaxLimit: 0.10,
      defaultTarget: 0.01,
      unit: '%',
      procedureOverview: 'DEG & EG: Not more than 0.1% each as per QC/CLG/ATM-045.',
      requiresInstrument: true,
    },
    {
      testCode: 'SPEC-ASK-MICROBIAL',
      name: 'Microbial Contamination Tests',
      category: TestCategory.MICROBIOLOGICAL,
      pharmacopeiaMethod: 'USP <1111>',
      defaultMinLimit: 0.00,
      defaultMaxLimit: 200.00,
      defaultTarget: 0.00,
      unit: 'cfu/mL',
      procedureOverview: 'TAMC <= 200 cfu/ml, TYMC <= 20 cfu/ml, E.Coli Must be Absent as per QC/MLG/SOP-004.',
      requiresInstrument: false,
    },
  ];

  const createdSpecs: Record<string, any> = {};
  for (const s of specifications) {
    const spec = await prisma.testSpecification.upsert({
      where: { testCode: s.testCode },
      update: s,
      create: s,
    });
    createdSpecs[s.testCode] = spec;
  }
  console.log(`✓ Upserted ${Object.keys(createdSpecs).length} master test specifications.`);

  // 5. Create Askprol Batches
  const bulkBatchNumber = 'ASK-BLK-2026-042';
  const bulkBatch = await prisma.batch.upsert({
    where: { batchNumber: bulkBatchNumber },
    update: {
      drugProduct: 'Askprol Suspension 120mg/5ml (Paracetamol)',
      dosageForm: 'Oral Suspension',
      batchSize: '1000 Liters (Bulk Tanker)',
      manufacturingDate: new Date('2026-10-25'),
      expiryDate: new Date('2028-10-25'),
      status: BatchStatus.QUARANTINE,
      notes: 'QC/CLG/ATM-003 Final Bulk analytical testing',
    },
    create: {
      batchNumber: bulkBatchNumber,
      drugProduct: 'Askprol Suspension 120mg/5ml (Paracetamol)',
      dosageForm: 'Oral Suspension',
      batchSize: '1000 Liters (Bulk Tanker)',
      manufacturingDate: new Date('2026-10-25'),
      expiryDate: new Date('2028-10-25'),
      status: BatchStatus.QUARANTINE,
      notes: 'QC/CLG/ATM-003 Final Bulk analytical testing',
    },
  });

  const fgBatchNumber = 'ASK-2026-B101';
  const fgBatch = await prisma.batch.upsert({
    where: { batchNumber: fgBatchNumber },
    update: {
      drugProduct: 'Askprol Suspension 120mg/5ml (Paracetamol)',
      dosageForm: 'Oral Suspension',
      batchSize: '16,666 Bottles (60mL Amber PET)',
      manufacturingDate: new Date('2026-10-27'),
      expiryDate: new Date('2028-10-27'),
      status: BatchStatus.QUARANTINE,
      notes: 'QC/CLG/ATM-003 Finished Pack release testing',
    },
    create: {
      batchNumber: fgBatchNumber,
      drugProduct: 'Askprol Suspension 120mg/5ml (Paracetamol)',
      dosageForm: 'Oral Suspension',
      batchSize: '16,666 Bottles (60mL Amber PET)',
      manufacturingDate: new Date('2026-10-27'),
      expiryDate: new Date('2028-10-27'),
      status: BatchStatus.QUARANTINE,
      notes: 'QC/CLG/ATM-003 Finished Pack release testing',
    },
  });

  // 6. Create Samples
  // 6a. Final Bulk Sample
  const bulkSampleCode = 'GL/SB-ASK-042';
  const bulkSample = await prisma.sample.upsert({
    where: { sampleCode: bulkSampleCode },
    update: {
      nomenclature: 'Askprol Suspension 120mg/5ml (Final Bulk)',
      materialName: 'Askprol Suspension 120mg/5ml (Final Bulk)',
      stageType: 'FINAL_BULK',
      sampleType: SampleType.IN_PROCESS,
      batchLotNumber: bulkBatchNumber,
      batchId: bulkBatch.id,
      laboratoryId: generalLab.id,
      laboratoryType: LaboratoryType.GENERAL,
      priority: Priority.URGENT,
      status: SampleStatus.ASSIGNED_FOR_TESTING,
      assignedToId: assignedUserId,
      remarks: 'ATM-003 Bulk Stage: Homogeneity testing (Top, Mid, Bottom)',
    },
    create: {
      sampleCode: bulkSampleCode,
      sampleId: bulkSampleCode,
      recordNumber: bulkSampleCode,
      accessionNo: 'ACC-ASK-BLK-042',
      nomenclature: 'Askprol Suspension 120mg/5ml (Final Bulk)',
      materialName: 'Askprol Suspension 120mg/5ml (Final Bulk)',
      stageType: 'FINAL_BULK',
      sampleType: SampleType.IN_PROCESS,
      batchLotNumber: bulkBatchNumber,
      batchId: bulkBatch.id,
      laboratoryId: generalLab.id,
      laboratoryType: LaboratoryType.GENERAL,
      priority: Priority.URGENT,
      status: SampleStatus.ASSIGNED_FOR_TESTING,
      assignedToId: assignedUserId,
      remarks: 'ATM-003 Bulk Stage: Homogeneity testing (Top, Mid, Bottom)',
    },
  });

  // 6b. Finished Pack Sample
  const fgSampleCode = 'GL/F-ASK-101';
  const fgSample = await prisma.sample.upsert({
    where: { sampleCode: fgSampleCode },
    update: {
      nomenclature: 'Askprol Suspension 120mg/5ml (Finished Pack)',
      materialName: 'Askprol Suspension 120mg/5ml (Finished Pack)',
      stageType: 'FINISHED_PRODUCT',
      sampleType: SampleType.FINISHED_PRODUCT,
      batchLotNumber: fgBatchNumber,
      batchId: fgBatch.id,
      laboratoryId: generalLab.id,
      laboratoryType: LaboratoryType.GENERAL,
      priority: Priority.URGENT,
      status: SampleStatus.ASSIGNED_FOR_TESTING,
      assignedToId: assignedUserId,
      remarks: 'ATM-003 Finished Pack Stage: Full release specification testing & CoA generation',
    },
    create: {
      sampleCode: fgSampleCode,
      sampleId: fgSampleCode,
      recordNumber: fgSampleCode,
      accessionNo: 'ACC-ASK-FG-101',
      nomenclature: 'Askprol Suspension 120mg/5ml (Finished Pack)',
      materialName: 'Askprol Suspension 120mg/5ml (Finished Pack)',
      stageType: 'FINISHED_PRODUCT',
      sampleType: SampleType.FINISHED_PRODUCT,
      batchLotNumber: fgBatchNumber,
      batchId: fgBatch.id,
      laboratoryId: generalLab.id,
      laboratoryType: LaboratoryType.GENERAL,
      priority: Priority.URGENT,
      status: SampleStatus.ASSIGNED_FOR_TESTING,
      assignedToId: assignedUserId,
      remarks: 'ATM-003 Finished Pack Stage: Full release specification testing & CoA generation',
    },
  });

  // 7. Seed Tests for Final Bulk Sample
  const bulkTests = [
    {
      specCode: 'SPEC-ASK-BULK-ASSAY',
      instrumentId: hplcInstrument?.id,
      minLimit: 95.00,
      maxLimit: 105.00,
      targetValue: 100.00,
      unit: '%',
    },
    {
      specCode: 'SPEC-ASK-PH',
      instrumentId: phInstrument?.id,
      minLimit: 4.00,
      maxLimit: 6.90,
      targetValue: 5.45,
      unit: 'pH',
    },
    {
      specCode: 'SPEC-ASK-DENSITY',
      instrumentId: null,
      minLimit: 1.0400,
      maxLimit: 1.1300,
      targetValue: 1.0850,
      unit: 'g/mL',
    },
    {
      specCode: 'SPEC-ASK-SUSPENDED',
      instrumentId: null,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
    {
      specCode: 'SPEC-ASK-ID-HPLC',
      instrumentId: hplcInstrument?.id,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
    {
      specCode: 'SPEC-ASK-ID-FTIR',
      instrumentId: null,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
    {
      specCode: 'SPEC-ASK-DESC-CONTENT',
      instrumentId: null,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
  ];

  for (const t of bulkTests) {
    const spec = createdSpecs[t.specCode];
    if (!spec) continue;

    const existing = await prisma.sampleTest.findFirst({
      where: { sampleId: bulkSample.id, testSpecificationId: spec.id },
    });

    if (!existing) {
      await prisma.sampleTest.create({
        data: {
          sampleId: bulkSample.id,
          testSpecificationId: spec.id,
          instrumentId: t.instrumentId,
          analystId: assignedUserId,
          status: TestStatus.PENDING,
          resultStatus: ResultStatus.NOT_TESTED,
          minLimit: t.minLimit,
          maxLimit: t.maxLimit,
          targetValue: t.targetValue,
          unit: t.unit,
        },
      });
    }
  }

  // 8. Seed Tests for Finished Pack Sample
  const fgTests = [
    {
      specCode: 'SPEC-ASK-FG-ASSAY',
      instrumentId: hplcInstrument?.id,
      minLimit: 90.00,
      maxLimit: 110.00,
      targetValue: 100.00,
      unit: '%',
    },
    {
      specCode: 'SPEC-ASK-PH',
      instrumentId: phInstrument?.id,
      minLimit: 4.00,
      maxLimit: 6.90,
      targetValue: 5.45,
      unit: 'pH',
    },
    {
      specCode: 'SPEC-ASK-DENSITY',
      instrumentId: null,
      minLimit: 1.0400,
      maxLimit: 1.1300,
      targetValue: 1.0850,
      unit: 'g/mL',
    },
    {
      specCode: 'SPEC-ASK-DELIV-VOL',
      instrumentId: null,
      minLimit: 100.00,
      maxLimit: 110.00,
      targetValue: 100.00,
      unit: '%',
    },
    {
      specCode: 'SPEC-ASK-DOSAGE-UNIF',
      instrumentId: hplcInstrument?.id,
      minLimit: 0.00,
      maxLimit: 15.00,
      targetValue: 0.00,
      unit: 'AV',
    },
    {
      specCode: 'SPEC-ASK-IMPURITY',
      instrumentId: hplcInstrument?.id,
      minLimit: 0.00,
      maxLimit: 0.15,
      targetValue: 0.02,
      unit: '%',
    },
    {
      specCode: 'SPEC-ASK-DEG-EG',
      instrumentId: null,
      minLimit: 0.00,
      maxLimit: 0.10,
      targetValue: 0.01,
      unit: '%',
    },
    {
      specCode: 'SPEC-ASK-MICROBIAL',
      instrumentId: null,
      minLimit: 0.00,
      maxLimit: 200.00,
      targetValue: 0.00,
      unit: 'cfu/mL',
    },
    {
      specCode: 'SPEC-ASK-ID-HPLC',
      instrumentId: hplcInstrument?.id,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
    {
      specCode: 'SPEC-ASK-ID-FTIR',
      instrumentId: null,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
    {
      specCode: 'SPEC-ASK-DESC-CONTENT',
      instrumentId: null,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
    {
      specCode: 'SPEC-ASK-DESC-PACKING',
      instrumentId: null,
      minLimit: null,
      maxLimit: null,
      targetValue: null,
      unit: 'Qualitative',
    },
  ];

  for (const t of fgTests) {
    const spec = createdSpecs[t.specCode];
    if (!spec) continue;

    const existing = await prisma.sampleTest.findFirst({
      where: { sampleId: fgSample.id, testSpecificationId: spec.id },
    });

    if (!existing) {
      await prisma.sampleTest.create({
        data: {
          sampleId: fgSample.id,
          testSpecificationId: spec.id,
          instrumentId: t.instrumentId,
          analystId: assignedUserId,
          status: TestStatus.PENDING,
          resultStatus: ResultStatus.NOT_TESTED,
          minLimit: t.minLimit,
          maxLimit: t.maxLimit,
          targetValue: t.targetValue,
          unit: t.unit,
        },
      });
    }
  }

  console.log(`✓ Seeded ${bulkTests.length} tests for Final Bulk sample ${bulkSampleCode}`);
  console.log(`✓ Seeded ${fgTests.length} tests for Finished Pack sample ${fgSampleCode}`);
  console.log('--- ALL ASKPROL TESTING DATA READY IN DATABASE ---');
}

main()
  .catch((e) => {
    console.error('Error seeding Askprol data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
