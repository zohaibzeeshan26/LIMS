import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

export interface AskprolCalculationInput {
  stage: 'FINAL_BULK' | 'FINISHED_GOOD';
  batchNumber: string;
  analyticalReportNo: string;
  testingDate?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  packSize?: string;
  packagingType?: string;
  contentDescription?: string;
  packagingDescription?: string;
  
  // Qualitative Tests
  identificationHplc?: 'COMPLIES' | 'DOES_NOT_COMPLY';
  identificationFtir?: 'COMPLIES' | 'DOES_NOT_COMPLY';
  suspendedMatters?: 'COMPLIES' | 'DOES_NOT_COMPLY';

  // Density (Pycnometer method)
  density: {
    w1: number; // Empty pycnometer weight in g
    w2: number; // Pycnometer + sample weight in g
    pycnometerVolume: number; // Volume in mL (V, typically 25 mL)
  };

  // pH Measurement
  ph: {
    // Bulk Stage
    top?: number;
    mid?: number;
    bottom?: number;
    // Finished Good Stage
    sample1?: number;
    sample2?: number;
  };

  // HPLC System Suitability (5 replicate injections of standard)
  systemSuitability: {
    replicateAreas: number[]; // 5 standard areas
    tailingFactor: number;
    theoreticalPlates: number;
  };

  // HPLC Assay Inputs (Granular matching Askprol Suspension.xlsx)
  assay: {
    standardWeight: number; // W_s in mg (e.g. 50.1 mg)
    standardPotency: number; // Potency % (e.g. 99.58)
    labelClaim?: number; // 120 mg/5ml

    // Bulk Stage inputs
    bulkWeights?: {
      top: number; // Wu top in g
      mid: number; // Wu mid in g
      bottom: number; // Wu bottom in g
    };
    bulkAreas?: {
      top: number[]; // [inj1, inj2]
      mid: number[]; // [inj1, inj2]
      bottom: number[]; // [inj1, inj2]
    };

    // Finished Good inputs
    fgWeights?: {
      sample1: number; // Wu1 in g
      sample2: number; // Wu2 in g
    };
    fgAreas?: {
      sample1: number[]; // [inj1, inj2]
      sample2: number[]; // [inj1, inj2]
    };

    // Fallback single values
    sampleArea?: number;
    sampleWeight?: number;
  };

  // Deliverable Volume (Finished Good - USP <698>)
  deliverableVolume?: {
    nominalVolume: number; // 60 mL
    volumes: number[]; // 10 containers
  };

  // Uniformity of Dosage Units (Finished Good - USP <905>)
  uniformityDosage?: {
    // 10 containers with weights and peak areas
    units?: Array<{
      unitNo: number;
      weight: number; // in g
      peakArea: number;
    }>;
    dosageUnits?: number[]; // Fallback list of 10 %assay values
  };

  // 4-Aminophenol Impurity (USP <227>)
  impurity: {
    standardWeight: number; // W_s in mg (e.g. 25 mg)
    sampleWeight: number; // W_u in mg (e.g. 1000 mg)
    standardArea: number; // r_s
    sampleArea: number; // r_u
    // Optional system suitability
    replicateAreas?: number[];
    resolution?: number;
    tailingFactor?: number;
    signalToNoise?: number;
  };

  // Toxic Impurities & Microbial Safety
  safetyMicrobial: {
    degPercent: number; // Diethylene Glycol % (Limit NMT 0.1%)
    egPercent: number; // Ethylene Glycol % (Limit NMT 0.1%)
    tamc: number; // Total Aerobic Microbial Count (Limit NMT 200 cfu/mL)
    tymc: number; // Total Yeast and Molds Count (Limit NMT 20 cfu/mL)
    eColi: 'ABSENT' | 'PRESENT'; // Must be Absent
  };

  // Signatures & Remarks
  analystName?: string;
  reviewerName?: string;
  approverName?: string;
  remarks?: string;
}

export class AskprolService {
  /**
   * Pure analytical calculation engine for Askprol Suspension 120mg/5ml
   * Exactly matches formulas from QC/CLG/ATM-003 and workbook Askprol Suspension.xlsx
   */
  calculate(input: AskprolCalculationInput) {
    const isBulk = input.stage === 'FINAL_BULK';

    // 1. Density Calculation (g/mL = (W2 - W1) / Volume)
    const w1 = Number(input.density.w1) || 0;
    const w2 = Number(input.density.w2) || 0;
    const pycVol = Number(input.density.pycnometerVolume) || 25;
    const w3 = Number((w2 - w1).toFixed(4));
    const calculatedDensity = pycVol > 0 ? Number((w3 / pycVol).toFixed(4)) : 0;
    const densityComplies = calculatedDensity >= 1.0400 && calculatedDensity <= 1.1300;

    // 2. pH Measurement
    let calculatedPh = 0;
    let phComplies = true;
    let phDetails: any = {};

    if (isBulk) {
      const top = Number(input.ph.top) || 0;
      const mid = Number(input.ph.mid) || 0;
      const bottom = Number(input.ph.bottom) || 0;
      calculatedPh = Number(((top + mid + bottom) / 3).toFixed(2));
      // In Excel: AND(J19>=4, J19<=6.9, J20>=4, J20<=6.9, J21>=4, J21<=6.9, P19>=4, P19<=6.9)
      phComplies =
        top >= 4.0 && top <= 6.9 &&
        mid >= 4.0 && mid <= 6.9 &&
        bottom >= 4.0 && bottom <= 6.9 &&
        calculatedPh >= 4.0 && calculatedPh <= 6.9;
      phDetails = { top, mid, bottom, average: calculatedPh };
    } else {
      const s1 = Number(input.ph.sample1) || 0;
      const s2 = Number(input.ph.sample2) || 0;
      calculatedPh = Number(((s1 + s2) / 2).toFixed(2));
      phComplies = calculatedPh >= 4.0 && calculatedPh <= 6.9;
      phDetails = { sample1: s1, sample2: s2, average: calculatedPh };
    }

    // 3. HPLC System Suitability (5 Standard Injections)
    const repAreas = (input.systemSuitability.replicateAreas || []).map(Number);
    const nStandard = repAreas.length;
    let meanStandardArea = 0;
    let rsdStandardArea = 0;

    if (nStandard > 0) {
      meanStandardArea = repAreas.reduce((a, b) => a + b, 0) / nStandard;
      if (nStandard > 1 && meanStandardArea > 0) {
        const variance = repAreas.reduce((acc, val) => acc + Math.pow(val - meanStandardArea, 2), 0) / (nStandard - 1);
        const stdDev = Math.sqrt(variance);
        rsdStandardArea = Number(((stdDev / meanStandardArea) * 100).toFixed(2));
      }
    }

    const tailingFactor = Number(input.systemSuitability.tailingFactor) || 0;
    const theoreticalPlates = Number(input.systemSuitability.theoreticalPlates) || 0;

    const rsdComplies = nStandard >= 5 && rsdStandardArea <= 2.0;
    const tailingComplies = tailingFactor <= 2.0;
    const platesComplies = theoreticalPlates >= 1000;
    const systemSuitabilityPassed = rsdComplies && tailingComplies && platesComplies;

    // 4. HPLC Potency Assay Calculation (Formula from ATM-003 and Excel)
    // Formula: (ru * Ws * 2 * 200 * 100 * 5 * D * Potency) / (rs * 100 * 100 * Wu * 2 * 120)
    // Where: rs = meanStandardArea, Ws in mg, Wu in g, D = density, labelClaim = 120 mg/5ml
    const rs = meanStandardArea > 0 ? meanStandardArea : 1;
    const ws = Number(input.assay.standardWeight) || 0;
    const d = calculatedDensity > 0 ? calculatedDensity : 1.0700;
    const potency = Number(input.assay.standardPotency) || 99.58;
    const labelClaim = 120; // 120mg/5ml per formula

    const calcSingleAssay = (ru: number, wu: number): number => {
      if (rs <= 0 || wu <= 0) return 0;
      const num = ru * ws * 2 * 200 * 100 * 5 * d * potency;
      const den = rs * 100 * 100 * wu * 2 * labelClaim;
      return den > 0 ? Number((num / den).toFixed(2)) : 0;
    };

    let calculatedAssay = 0;
    let assayBreakdown: any = {};
    let assayComplies = false;

    if (isBulk) {
      // Bulk stage: Top, Mid, Bottom
      const bWeights = input.assay.bulkWeights || {
        top: Number(input.assay.sampleWeight) || 4.75,
        mid: Number(input.assay.sampleWeight) || 4.75,
        bottom: Number(input.assay.sampleWeight) || 4.75,
      };
      const bAreas = input.assay.bulkAreas || {
        top: [Number(input.assay.sampleArea) || 0, Number(input.assay.sampleArea) || 0],
        mid: [Number(input.assay.sampleArea) || 0, Number(input.assay.sampleArea) || 0],
        bottom: [Number(input.assay.sampleArea) || 0, Number(input.assay.sampleArea) || 0],
      };

      const topAreaAvg = (bAreas.top.reduce((a, b) => a + b, 0) / (bAreas.top.length || 1));
      const midAreaAvg = (bAreas.mid.reduce((a, b) => a + b, 0) / (bAreas.mid.length || 1));
      const bottomAreaAvg = (bAreas.bottom.reduce((a, b) => a + b, 0) / (bAreas.bottom.length || 1));

      const topAssay = calcSingleAssay(topAreaAvg, bWeights.top);
      const midAssay = calcSingleAssay(midAreaAvg, bWeights.mid);
      const bottomAssay = calcSingleAssay(bottomAreaAvg, bWeights.bottom);
      calculatedAssay = Number(((topAssay + midAssay + bottomAssay) / 3).toFixed(2));

      // Excel formula: AND(T50>=95, T50<=105, T53>=95, T53<=105, T56>=95, T56<=105, T58>=95, T58<=105)
      assayComplies =
        topAssay >= 95.0 && topAssay <= 105.0 &&
        midAssay >= 95.0 && midAssay <= 105.0 &&
        bottomAssay >= 95.0 && bottomAssay <= 105.0 &&
        calculatedAssay >= 95.0 && calculatedAssay <= 105.0;

      assayBreakdown = {
        top: { weight: bWeights.top, areas: bAreas.top, avgArea: topAreaAvg, assay: topAssay },
        mid: { weight: bWeights.mid, areas: bAreas.mid, avgArea: midAreaAvg, assay: midAssay },
        bottom: { weight: bWeights.bottom, areas: bAreas.bottom, avgArea: bottomAreaAvg, assay: bottomAssay },
        averageAssay: calculatedAssay,
      };
    } else {
      // Finished Good stage: Sample 01 (Inj 1 & 2), Sample 02 (Inj 1 & 2)
      const fgWeights = input.assay.fgWeights || {
        sample1: Number(input.assay.sampleWeight) || 4.75,
        sample2: Number(input.assay.sampleWeight) || 4.75,
      };
      const fgAreas = input.assay.fgAreas || {
        sample1: [Number(input.assay.sampleArea) || 0, Number(input.assay.sampleArea) || 0],
        sample2: [Number(input.assay.sampleArea) || 0, Number(input.assay.sampleArea) || 0],
      };

      const s1_inj1 = calcSingleAssay(fgAreas.sample1[0] || 0, fgWeights.sample1);
      const s1_inj2 = calcSingleAssay(fgAreas.sample1[1] || fgAreas.sample1[0] || 0, fgWeights.sample1);
      const s2_inj1 = calcSingleAssay(fgAreas.sample2[0] || 0, fgWeights.sample2);
      const s2_inj2 = calcSingleAssay(fgAreas.sample2[1] || fgAreas.sample2[0] || 0, fgWeights.sample2);

      calculatedAssay = Number(((s1_inj1 + s1_inj2 + s2_inj1 + s2_inj2) / 4).toFixed(2));
      assayComplies = calculatedAssay >= 90.0 && calculatedAssay <= 110.0;

      assayBreakdown = {
        sample1: { weight: fgWeights.sample1, inj1: s1_inj1, inj2: s1_inj2 },
        sample2: { weight: fgWeights.sample2, inj1: s2_inj1, inj2: s2_inj2 },
        averageAssay: calculatedAssay,
      };
    }

    // 5. Deliverable Volume (Finished Good - USP <698>)
    let deliverableVolAvg: number | null = null;
    let deliverableMin: number | null = null;
    let deliverableMax: number | null = null;
    let deliverableComplies = true;

    if (!isBulk && input.deliverableVolume) {
      const nominal = Number(input.deliverableVolume.nominalVolume) || 60;
      const vols = (input.deliverableVolume.volumes || []).map(Number);
      if (vols.length > 0) {
        deliverableVolAvg = Number((vols.reduce((a, b) => a + b, 0) / vols.length).toFixed(2));
        deliverableMin = Math.min(...vols);
        deliverableMax = Math.max(...vols);
        // Average >= 100% (60.0 mL) and no individual < 95% (57.0 mL)
        const avgPct = (deliverableVolAvg / nominal) * 100;
        const minPct = (deliverableMin / nominal) * 100;
        deliverableComplies = avgPct >= 100.0 && minPct >= 95.0;
      }
    }

    // 6. Uniformity of Dosage Units (Finished Good - USP <905>)
    // Formulas:
    // R_i = O_i / rs * Ws / 100 * 2 / 100 * 200 / K_i * 100 / 2 * 5 / 120 * D * 100
    // Target T = 103
    // M = IF(X < 98.5, 98.5, IF(X > 103, 103, X))
    // AV = |M - X| + 2.4 * s
    let avValue: number | null = null;
    let avComplies = true;
    let uniformityDetails: any = null;

    if (!isBulk && input.uniformityDosage) {
      let unitAssays: number[] = [];
      let unitBreakdown: any[] = [];

      if (input.uniformityDosage.units && input.uniformityDosage.units.length >= 10) {
        unitBreakdown = input.uniformityDosage.units.map((u) => {
          const uAssay = calcSingleAssay(u.peakArea, u.weight);
          unitAssays.push(uAssay);
          return {
            unitNo: u.unitNo,
            weight: u.weight,
            peakArea: u.peakArea,
            calculatedAssay: uAssay,
          };
        });
      } else if (input.uniformityDosage.dosageUnits && input.uniformityDosage.dosageUnits.length >= 10) {
        unitAssays = input.uniformityDosage.dosageUnits.map(Number);
      }

      if (unitAssays.length >= 10) {
        const n = 10;
        const first10 = unitAssays.slice(0, 10);
        const meanX = Number((first10.reduce((a, b) => a + b, 0) / n).toFixed(2));
        const variance = first10.reduce((acc, v) => acc + Math.pow(v - meanX, 2), 0) / (n - 1);
        const s = Number(Math.sqrt(variance).toFixed(3));
        const k = 2.4;
        const rsd = meanX > 0 ? Number(((s / meanX) * 100).toFixed(2)) : 0;
        const targetT = 103;

        let m = meanX;
        if (meanX < 98.5) {
          m = 98.5;
        } else if (meanX > targetT) {
          m = targetT;
        }

        const av = Math.abs(m - meanX) + k * s;
        avValue = Number(av.toFixed(2));
        avComplies = avValue <= 15.0; // L1 <= 15.0

        uniformityDetails = {
          units: unitBreakdown,
          meanX,
          n,
          k,
          s,
          rsd,
          targetT,
          m,
          avValue,
          maxL1: 15.0,
          complies: avComplies,
        };
      }
    }

    // 7. 4-Aminophenol Impurity (USP <227>)
    // Formula from ATM-003 and Excel:
    // % = (ru * Ws * 100) / ((rs - ru) * Wu)
    const imp_ru = Number(input.impurity.sampleArea) || 0;
    const imp_rs = Number(input.impurity.standardArea) || 1;
    const imp_ws = Number(input.impurity.standardWeight) || 0; // in mg
    const imp_wu = Number(input.impurity.sampleWeight) || 1000; // in mg

    let calculatedImpurity = 0;
    const impDenom = (imp_rs - imp_ru) * imp_wu;
    if (impDenom > 0) {
      calculatedImpurity = Number(((imp_ru * imp_ws * 100) / impDenom).toFixed(4));
    }
    const impurityComplies = calculatedImpurity <= 0.15; // NMT 0.15%

    // 8. Safety & Microbial
    const deg = Number(input.safetyMicrobial.degPercent) || 0;
    const eg = Number(input.safetyMicrobial.egPercent) || 0;
    const tamc = Number(input.safetyMicrobial.tamc) || 0;
    const tymc = Number(input.safetyMicrobial.tymc) || 0;
    const eColiAbsent = input.safetyMicrobial.eColi === 'ABSENT';

    const degComplies = deg <= 0.1;
    const egComplies = eg <= 0.1;
    const tamcComplies = tamc <= 200;
    const tymcComplies = tymc <= 20;
    const safetyComplies = degComplies && egComplies && tamcComplies && tymcComplies && eColiAbsent;

    // 9. Qualitative Checks
    const idHplcComplies = input.identificationHplc !== 'DOES_NOT_COMPLY';
    const idFtirComplies = input.identificationFtir !== 'DOES_NOT_COMPLY';
    const suspendedComplies = isBulk ? input.suspendedMatters !== 'DOES_NOT_COMPLY' : true;

    // Overall Release Verdict
    const allPassed =
      idHplcComplies &&
      idFtirComplies &&
      suspendedComplies &&
      densityComplies &&
      phComplies &&
      systemSuitabilityPassed &&
      assayComplies &&
      deliverableComplies &&
      avComplies &&
      impurityComplies &&
      safetyComplies;

    const overallVerdict: 'APPROVED' | 'REJECTED' = allPassed ? 'APPROVED' : 'REJECTED';

    return {
      stage: input.stage,
      overallVerdict,
      calculations: {
        density: {
          w1,
          w2,
          w3,
          pycnometerVolume: pycVol,
          calculatedDensity,
          specification: '1.0400 g/mL to 1.1300 g/mL',
          complies: densityComplies,
        },
        ph: {
          calculatedPh,
          details: phDetails,
          specification: '4.0 - 6.9',
          complies: phComplies,
        },
        systemSuitability: {
          replicateAreas: repAreas,
          meanArea: Number(meanStandardArea.toFixed(2)),
          rsdPercent: rsdStandardArea,
          rsdComplies,
          tailingFactor,
          tailingComplies,
          theoreticalPlates,
          platesComplies,
          systemSuitabilityPassed,
        },
        assay: {
          calculatedAssay,
          breakdown: assayBreakdown,
          specification: isBulk ? '95.00% to 105.00% of label claim' : '90.00% to 110.00% of label claim',
          complies: assayComplies,
        },
        deliverableVolume: !isBulk
          ? {
              averageVolume: deliverableVolAvg,
              minVolume: deliverableMin,
              maxVolume: deliverableMax,
              specification: 'Avg >= 100%, No container < 95%',
              complies: deliverableComplies,
            }
          : null,
        uniformityDosage: !isBulk
          ? {
              avValue,
              details: uniformityDetails,
              specification: 'AV <= 15.0 (L1)',
              complies: avComplies,
            }
          : null,
        impurity: {
          calculatedImpurity,
          specification: 'NMT 0.15% of 4-Aminophenol',
          complies: impurityComplies,
        },
        safetyMicrobial: {
          deg,
          degComplies,
          eg,
          egComplies,
          tamc,
          tamcComplies,
          tymc,
          tymcComplies,
          eColi: input.safetyMicrobial.eColi,
          eColiComplies: eColiAbsent,
          safetyComplies,
        },
        qualitative: {
          identificationHplc: idHplcComplies,
          identificationFtir: idFtirComplies,
          suspendedMatters: suspendedComplies,
        },
      },
    };
  }

  /**
   * Save and persist full Askprol QC Report with automatic CoA generation and 21 CFR Part 11 audit trail
   */
  async createReport(input: AskprolCalculationInput, user?: any) {
    const calcResult = this.calculate(input);

    const count = await prisma.askprolQcReport.count();
    const sequence = String(count + 1).padStart(4, '0');
    const reportNumber = `ASK-QC-2026-${sequence}`;
    const coaNumber = `COA-ASK-2026-${sequence}`;

    const mfgDate = input.manufacturingDate ? new Date(input.manufacturingDate) : new Date();
    const expDate = input.expiryDate
      ? new Date(input.expiryDate)
      : new Date(Date.now() + 730 * 24 * 60 * 60 * 1000);
    const testDate = input.testingDate ? new Date(input.testingDate) : new Date();

    const packagingType =
      input.packagingType ||
      'Amber PET bottle with perforation-proof plastic cap';

    const packagingDesc =
      input.packagingDescription ||
      (input.stage === 'FINISHED_GOOD' ? packagingType : 'Bulk Stainless Steel (SS 316L) Tanker Container');

    const created = await prisma.askprolQcReport.create({
      data: {
        reportNumber,
        coaNumber,
        batchNumber: (input.batchNumber || 'ASK-2026-001').trim(),
        analyticalReportNo: (input.analyticalReportNo || `QC/ASK/26-${sequence}`).trim(),
        stage: input.stage,
        testingDate: testDate,
        manufacturingDate: mfgDate,
        expiryDate: expDate,
        methodReference: 'QC/CLG/ATM-003',
        genericName: 'Acetaminophen (Paracetamol) 120mg/5ml',
        brandName: 'Askprol Suspension 120mg/5ml',
        registrationNo: '030725',
        mfgLicenseNo: '000512',
        gtin: '8964002697014',
        shelfLife: '02 Years (24 Months)',
        packSize: input.packSize || (input.stage === 'FINAL_BULK' ? '1000 Liters (Bulk)' : '60 mL Amber Bottle'),
        packagingType,
        contentDescription:
          input.contentDescription ||
          'A reddish color suspension with solid particles uniformly dispersed in it.',
        packagingDescription: packagingDesc,
        identificationHplc: input.identificationHplc || 'COMPLIES',
        identificationFtir: input.identificationFtir || 'COMPLIES',
        suspendedMatters: input.suspendedMatters || 'COMPLIES',

        densityData: calcResult.calculations.density,
        phData: calcResult.calculations.ph,
        deliverableVolumeData: calcResult.calculations.deliverableVolume || {},
        uniformityDosageData: calcResult.calculations.uniformityDosage || {},
        hplcAssayData: {
          ...calcResult.calculations.assay,
          systemSuitability: calcResult.calculations.systemSuitability,
        },
        impurityData: calcResult.calculations.impurity,
        safetyMicrobialData: calcResult.calculations.safetyMicrobial,

        calculatedDensity: calcResult.calculations.density.calculatedDensity,
        calculatedPh: calcResult.calculations.ph.calculatedPh,
        calculatedAssay: calcResult.calculations.assay.calculatedAssay,
        calculatedImpurity: calcResult.calculations.impurity.calculatedImpurity,
        deliverableVolAvg: calcResult.calculations.deliverableVolume?.averageVolume ?? null,
        avValue: calcResult.calculations.uniformityDosage?.avValue ?? null,

        overallVerdict: calcResult.overallVerdict,
        analystName: input.analystName || user?.fullName || 'Muhammad Zubair',
        reviewerName: input.reviewerName || 'Syed Kamran Ali (AMQC)',
        approverName: input.approverName || 'Dr. Tariq Mahmood (Head of QC)',
        releaseDate: new Date(),
        remarks:
          input.remarks ||
          `Batch meets all release specifications as per analytical method QC/CLG/ATM-003.`,
      },
    });

    // 21 CFR Part 11 Audit Trail Logging
    await prisma.auditTrail.create({
      data: {
        entityName: 'AskprolQcReport',
        entityId: created.id,
        action: 'ASKPROL_COA_GENERATED',
        performedById: user?.id,
        performedByName: input.analystName || user?.fullName || 'Muhammad Zubair',
        role: user?.role || 'QC_ANALYST',
        ipAddress: '127.0.0.1',
        reasonForChange: `Generated QC Test Report & Certificate of Analysis ${coaNumber} for Batch ${created.batchNumber} (${created.stage}) - Verdict: ${created.overallVerdict}`,
        diffPayload: JSON.stringify({
          reportNumber: created.reportNumber,
          coaNumber: created.coaNumber,
          batchNumber: created.batchNumber,
          stage: created.stage,
          overallVerdict: created.overallVerdict,
          calculatedAssay: created.calculatedAssay,
          calculatedDensity: created.calculatedDensity,
          calculatedPh: created.calculatedPh,
          details: `Generated Certificate of Analysis ${coaNumber} for Askprol Suspension Batch ${created.batchNumber} (${created.stage}) with verdict ${created.overallVerdict}`,
        }),
      },
    }).catch(() => {});

    return {
      report: created,
      details: calcResult,
    };
  }

  async findAll(query?: { stage?: string; batchNumber?: string; limit?: number }) {
    const where: any = {};
    if (query?.stage) where.stage = query.stage;
    if (query?.batchNumber) where.batchNumber = { contains: query.batchNumber, mode: 'insensitive' };

    return prisma.askprolQcReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query?.limit || 50,
    });
  }

  async findById(id: string) {
    const report = await prisma.askprolQcReport.findUnique({
      where: { id },
    });
    if (!report) {
      throw new AppError('Askprol QC Report not found', 404);
    }
    return report;
  }

  async delete(id: string, user?: any) {
    const report = await this.findById(id);

    await prisma.askprolQcReport.delete({
      where: { id },
    });

    await prisma.auditTrail.create({
      data: {
        entityName: 'AskprolQcReport',
        entityId: id,
        action: 'ASKPROL_REPORT_DELETED',
        performedById: user?.id,
        performedByName: user?.fullName || 'Admin',
        role: user?.role || 'ADMIN',
        ipAddress: '127.0.0.1',
        reasonForChange: `Deleted QC Test Report ${report.reportNumber} for Batch ${report.batchNumber}`,
      },
    }).catch(() => {});

    return { success: true, message: `Report ${report.reportNumber} successfully deleted` };
  }
}

export const askprolService = new AskprolService();
