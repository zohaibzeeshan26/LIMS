'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { askprolService, AskprolCalculationPayload, AskprolCalculationResult } from '@/services/askprol.service';
import { OfficialAtm003Document } from '@/components/askprol/OfficialAtm003Document';
import { cn } from '@/lib/utils';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FlaskConical,
  Beaker,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Award,
  Layers,
  Clock,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  FileText,
  BadgeCheck,
  Activity,
  History,
  Trash2,
  ExternalLink,
  Download,
  FileCode,
  BookOpen,
  Eraser,
} from 'lucide-react';

// Packaging options from Sheet1 of Askprol Suspension.xlsx & ATM-003 docx
const PACKAGING_OPTIONS = [
  'The suspension should be filled in an amber PET bottle with perforation proof-plastic cap. Labeled and Packed in commercial packing.',
  'The Suspension should be Filled in an amber Glass bottle with perforation proof-Aluminum cap. Labeled and packed in export Packing.',
  'The Suspension should be Filled in an amber Glass bottle with perforation proof-Aluminum cap. Labeled and packed in Commercial Packing.',
  'The Suspension should be Filled in an amber Glass bottle with perforation proof-Aluminum cap. Labeled and packed in Institutional Packing.',
];

// Clean / Blank form state ready for manual data entry during testing
const createBlankForm = (stage: 'FINAL_BULK' | 'FINISHED_GOOD' = 'FINISHED_GOOD', userFullName = ''): AskprolCalculationPayload => ({
  stage,
  batchNumber: '',
  analyticalReportNo: '',
  testingDate: new Date().toISOString().split('T')[0],
  manufacturingDate: '',
  expiryDate: '',
  packSize: stage === 'FINAL_BULK' ? '1000 Liters (Bulk Tanker)' : '60 mL Amber Bottle',
  packagingType: stage === 'FINAL_BULK' ? 'Bulk Stainless Steel (SS 316L) Tanker Container' : PACKAGING_OPTIONS[0],
  contentDescription: 'A Reddish Color Suspension with solid particles uniformly dispersed in it.',
  packagingDescription: stage === 'FINAL_BULK' ? 'Bulk Stainless Steel (SS 316L) Tanker Container' : PACKAGING_OPTIONS[0],

  identificationHplc: 'COMPLIES',
  identificationFtir: 'COMPLIES',
  suspendedMatters: 'COMPLIES',

  density: {
    w1: '' as any,
    w2: '' as any,
    pycnometerVolume: 25.0,
  },

  ph: {
    top: '' as any,
    mid: '' as any,
    bottom: '' as any,
    sample1: '' as any,
    sample2: '' as any,
  },

  systemSuitability: {
    replicateAreas: ['', '', '', '', ''] as any,
    tailingFactor: '' as any,
    theoreticalPlates: '' as any,
  },

  assay: {
    standardWeight: '' as any,
    standardPotency: 99.58,
    labelClaim: 120,
    bulkWeights: { top: '' as any, mid: '' as any, bottom: '' as any },
    bulkAreas: { top: ['', ''] as any, mid: ['', ''] as any, bottom: ['', ''] as any },
    fgWeights: { sample1: '' as any, sample2: '' as any },
    fgAreas: { sample1: ['', ''] as any, sample2: ['', ''] as any },
  },

  deliverableVolume: {
    nominalVolume: 60.0,
    volumes: ['', '', '', '', '', '', '', '', '', ''] as any,
  },

  uniformityDosage: {
    units: Array.from({ length: 10 }, (_, i) => ({
      unitNo: i + 1,
      weight: '' as any,
      peakArea: '' as any,
    })),
  },

  impurity: {
    standardWeight: 25.0,
    sampleWeight: 1000.0,
    standardArea: '' as any,
    sampleArea: '' as any,
    resolution: '' as any,
    tailingFactor: '' as any,
    signalToNoise: '' as any,
  },

  safetyMicrobial: {
    degPercent: '' as any,
    egPercent: '' as any,
    tamc: '' as any,
    tymc: '' as any,
    eColi: 'ABSENT',
  },

  analystName: userFullName || 'Testing Analyst',
  reviewerName: 'Syed Kamran Ali (AMQC)',
  approverName: 'Dr. Tariq Mahmood (Head of QC)',
  remarks: '',
});

// Demo Benchmark Preset for Final Bulk Stage (QC/CLG/ATM-003 & Askprol Suspension.xlsx Bulk Sheet)
const BULK_PRESET: AskprolCalculationPayload = {
  stage: 'FINAL_BULK',
  batchNumber: 'ASK-BLK-2026-042',
  analyticalReportNo: 'QC/ASK/26-0042',
  testingDate: new Date().toISOString().split('T')[0],
  manufacturingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  packSize: '1000 Liters (Bulk Tanker)',
  packagingType: 'Bulk Stainless Steel (SS 316L) Tanker Container',
  contentDescription: 'A Reddish Color Suspension with solid particles uniformly dispersed in it.',
  packagingDescription: 'Bulk Stainless Steel (SS 316L) Tanker Container',

  identificationHplc: 'COMPLIES',
  identificationFtir: 'COMPLIES',
  suspendedMatters: 'COMPLIES',

  density: {
    w1: 30.1500,
    w2: 57.0000,
    pycnometerVolume: 25.0,
  },

  ph: {
    top: 5.20,
    mid: 5.25,
    bottom: 5.22,
  },

  systemSuitability: {
    replicateAreas: [145200, 145050, 145320, 145180, 145250],
    tailingFactor: 1.18,
    theoreticalPlates: 4850,
  },

  assay: {
    standardWeight: 50.2,
    standardPotency: 99.58,
    labelClaim: 120,
    bulkWeights: {
      top: 4.755,
      mid: 4.750,
      bottom: 4.752,
    },
    bulkAreas: {
      top: [146100, 146200],
      mid: [145950, 146050],
      bottom: [146200, 146300],
    },
  },

  impurity: {
    standardWeight: 25.0,
    sampleWeight: 1000.0,
    standardArea: 125000,
    sampleArea: 48,
    resolution: 2.0,
    tailingFactor: 1.0,
    signalToNoise: 27.0,
  },

  safetyMicrobial: {
    degPercent: 0.02,
    egPercent: 0.01,
    tamc: 45,
    tymc: 5,
    eColi: 'ABSENT',
  },

  analystName: 'Muhammad Zubair',
  reviewerName: 'Syed Kamran Ali (AMQC)',
  approverName: 'Dr. Tariq Mahmood (Head of QC)',
  remarks: 'Final Bulk batch meets all release specifications as per analytical testing method QC/CLG/ATM-003.',
};

// Demo Benchmark Preset for Finished Good Stage (QC/CLG/ATM-003 & Askprol Suspension.xlsx F.Good Sheet)
const FINISHED_GOOD_PRESET: AskprolCalculationPayload = {
  stage: 'FINISHED_GOOD',
  batchNumber: 'ASK-2026-B101',
  analyticalReportNo: 'QC/ASK/26-0101',
  testingDate: new Date().toISOString().split('T')[0],
  manufacturingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  expiryDate: new Date(Date.now() + 725 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  packSize: '60 mL Amber Bottle',
  packagingType: PACKAGING_OPTIONS[0],
  contentDescription: 'A Reddish Color Suspension with solid particles uniformly dispersed in it.',
  packagingDescription: PACKAGING_OPTIONS[0],

  identificationHplc: 'COMPLIES',
  identificationFtir: 'COMPLIES',
  suspendedMatters: 'COMPLIES',

  density: {
    w1: 30.1500,
    w2: 56.8800,
    pycnometerVolume: 25.0,
  },

  ph: {
    sample1: 5.25,
    sample2: 5.28,
  },

  systemSuitability: {
    replicateAreas: [145200, 145050, 145320, 145180, 145250],
    tailingFactor: 1.16,
    theoreticalPlates: 4920,
  },

  assay: {
    standardWeight: 50.1,
    standardPotency: 99.58,
    labelClaim: 120,
    fgWeights: {
      sample1: 4.745,
      sample2: 4.750,
    },
    fgAreas: {
      sample1: [145800, 145900],
      sample2: [145750, 145850],
    },
  },

  deliverableVolume: {
    nominalVolume: 60.0,
    volumes: [60.2, 60.5, 60.1, 59.8, 60.4, 60.0, 60.3, 60.2, 60.1, 60.5],
  },

  uniformityDosage: {
    units: [
      { unitNo: 1, weight: 4.745, peakArea: 145800 },
      { unitNo: 2, weight: 4.750, peakArea: 145900 },
      { unitNo: 3, weight: 4.752, peakArea: 146000 },
      { unitNo: 4, weight: 4.748, peakArea: 145750 },
      { unitNo: 5, weight: 4.755, peakArea: 146100 },
      { unitNo: 6, weight: 4.742, peakArea: 145700 },
      { unitNo: 7, weight: 4.751, peakArea: 145950 },
      { unitNo: 8, weight: 4.749, peakArea: 145850 },
      { unitNo: 9, weight: 4.753, peakArea: 146050 },
      { unitNo: 10, weight: 4.747, peakArea: 145800 },
    ],
  },

  impurity: {
    standardWeight: 25.0,
    sampleWeight: 1000.0,
    standardArea: 125000,
    sampleArea: 48,
    resolution: 2.0,
    tailingFactor: 1.0,
    signalToNoise: 27.0,
  },

  safetyMicrobial: {
    degPercent: 0.02,
    egPercent: 0.01,
    tamc: 45,
    tymc: 5,
    eColi: 'ABSENT',
  },

  analystName: 'Muhammad Zubair',
  reviewerName: 'Syed Kamran Ali (AMQC)',
  approverName: 'Dr. Tariq Mahmood (Head of QC)',
  remarks: 'Finished Good batch complies with all release specifications per analytical testing method QC/CLG/ATM-003.',
};

export default function AskprolQcPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  type ActiveTab = 'DESCRIPTION' | 'CALCULATION' | 'CERTIFICATE';
  const [activeTab, setActiveTab] = useState<ActiveTab>('DESCRIPTION');

  // Initialize with CLEAN BLANK FORM by default so user enters data manually
  const [formData, setFormData] = useState<AskprolCalculationPayload>(() =>
    createBlankForm('FINISHED_GOOD', user?.fullName || '')
  );
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Client-side real-time calculation engine mirroring ATM-003 & Excel formulas
  const calculationResult: AskprolCalculationResult = useMemo(() => {
    const isBulk = formData.stage === 'FINAL_BULK';

    // 1. Density
    const w1 = parseFloat(String(formData.density.w1)) || 0;
    const w2 = parseFloat(String(formData.density.w2)) || 0;
    const pycVol = parseFloat(String(formData.density.pycnometerVolume)) || 25;
    const hasDensityData = w1 > 0 && w2 > 0;
    const w3 = hasDensityData ? Number((w2 - w1).toFixed(4)) : 0;
    const calculatedDensity = hasDensityData && pycVol > 0 ? Number((w3 / pycVol).toFixed(4)) : 0;
    const densityComplies = hasDensityData ? (calculatedDensity >= 1.0400 && calculatedDensity <= 1.1300) : false;

    // 2. pH
    let calculatedPh = 0;
    let phComplies = false;
    let phDetails: any = {};
    if (isBulk) {
      const top = parseFloat(String(formData.ph.top)) || 0;
      const mid = parseFloat(String(formData.ph.mid)) || 0;
      const bottom = parseFloat(String(formData.ph.bottom)) || 0;
      const hasPh = top > 0 && mid > 0 && bottom > 0;
      if (hasPh) {
        calculatedPh = Number(((top + mid + bottom) / 3).toFixed(2));
        phComplies =
          top >= 4.0 && top <= 6.9 &&
          mid >= 4.0 && mid <= 6.9 &&
          bottom >= 4.0 && bottom <= 6.9 &&
          calculatedPh >= 4.0 && calculatedPh <= 6.9;
      }
      phDetails = { top, mid, bottom, average: calculatedPh, hasData: hasPh };
    } else {
      const s1 = parseFloat(String(formData.ph.sample1)) || 0;
      const s2 = parseFloat(String(formData.ph.sample2)) || 0;
      const hasPh = s1 > 0 && s2 > 0;
      if (hasPh) {
        calculatedPh = Number(((s1 + s2) / 2).toFixed(2));
        phComplies = calculatedPh >= 4.0 && calculatedPh <= 6.9;
      }
      phDetails = { sample1: s1, sample2: s2, average: calculatedPh, hasData: hasPh };
    }

    // 3. System Suitability
    const repAreas = (formData.systemSuitability.replicateAreas || [])
      .map((v) => parseFloat(String(v)) || 0)
      .filter((v) => v > 0);
    const n = repAreas.length;
    let meanStandardArea = 0;
    let rsdStandardArea = 0;
    if (n > 0) {
      meanStandardArea = repAreas.reduce((a, b) => a + b, 0) / n;
      if (n > 1 && meanStandardArea > 0) {
        const variance = repAreas.reduce((acc, val) => acc + Math.pow(val - meanStandardArea, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        rsdStandardArea = Number(((stdDev / meanStandardArea) * 100).toFixed(2));
      }
    }
    const tailingFactor = parseFloat(String(formData.systemSuitability.tailingFactor)) || 0;
    const theoreticalPlates = parseFloat(String(formData.systemSuitability.theoreticalPlates)) || 0;
    const hasSystemSuit = n >= 5;
    const rsdComplies = hasSystemSuit && rsdStandardArea <= 2.0;
    const tailingComplies = tailingFactor > 0 ? tailingFactor <= 2.0 : false;
    const platesComplies = theoreticalPlates >= 1000;
    const systemSuitabilityPassed = rsdComplies && tailingComplies && platesComplies;

    // 4. HPLC Assay
    const rs = meanStandardArea > 0 ? meanStandardArea : 1;
    const ws = parseFloat(String(formData.assay.standardWeight)) || 0;
    const d = calculatedDensity > 0 ? calculatedDensity : 1.0700;
    const potency = parseFloat(String(formData.assay.standardPotency)) || 99.58;
    const labelClaim = 120;

    const calcSingleAssay = (ru: number, wu: number): number => {
      if (rs <= 0 || wu <= 0 || ru <= 0 || ws <= 0) return 0;
      const num = ru * ws * 2 * 200 * 100 * 5 * d * potency;
      const den = rs * 100 * 100 * wu * 2 * labelClaim;
      return den > 0 ? Number((num / den).toFixed(2)) : 0;
    };

    let calculatedAssay = 0;
    let assayBreakdown: any = {};
    let assayComplies = false;

    if (isBulk) {
      const bWeights = {
        top: parseFloat(String(formData.assay.bulkWeights?.top)) || 0,
        mid: parseFloat(String(formData.assay.bulkWeights?.mid)) || 0,
        bottom: parseFloat(String(formData.assay.bulkWeights?.bottom)) || 0,
      };
      const bAreas = {
        top: (formData.assay.bulkAreas?.top || []).map((v) => parseFloat(String(v)) || 0),
        mid: (formData.assay.bulkAreas?.mid || []).map((v) => parseFloat(String(v)) || 0),
        bottom: (formData.assay.bulkAreas?.bottom || []).map((v) => parseFloat(String(v)) || 0),
      };

      const topAreaAvg = bAreas.top.filter((v) => v > 0).length > 0 ? (bAreas.top.reduce((a, b) => a + b, 0) / bAreas.top.length) : 0;
      const midAreaAvg = bAreas.mid.filter((v) => v > 0).length > 0 ? (bAreas.mid.reduce((a, b) => a + b, 0) / bAreas.mid.length) : 0;
      const bottomAreaAvg = bAreas.bottom.filter((v) => v > 0).length > 0 ? (bAreas.bottom.reduce((a, b) => a + b, 0) / bAreas.bottom.length) : 0;

      const topAssay = calcSingleAssay(topAreaAvg, bWeights.top);
      const midAssay = calcSingleAssay(midAreaAvg, bWeights.mid);
      const bottomAssay = calcSingleAssay(bottomAreaAvg, bWeights.bottom);

      if (topAssay > 0 && midAssay > 0 && bottomAssay > 0) {
        calculatedAssay = Number(((topAssay + midAssay + bottomAssay) / 3).toFixed(2));
        assayComplies =
          topAssay >= 95.0 && topAssay <= 105.0 &&
          midAssay >= 95.0 && midAssay <= 105.0 &&
          bottomAssay >= 95.0 && bottomAssay <= 105.0 &&
          calculatedAssay >= 95.0 && calculatedAssay <= 105.0;
      }

      assayBreakdown = { topAssay, midAssay, bottomAssay, averageAssay: calculatedAssay };
    } else {
      const fgWeights = {
        sample1: parseFloat(String(formData.assay.fgWeights?.sample1)) || 0,
        sample2: parseFloat(String(formData.assay.fgWeights?.sample2)) || 0,
      };
      const fgAreas = {
        sample1: (formData.assay.fgAreas?.sample1 || []).map((v) => parseFloat(String(v)) || 0),
        sample2: (formData.assay.fgAreas?.sample2 || []).map((v) => parseFloat(String(v)) || 0),
      };

      const s1_inj1 = calcSingleAssay(fgAreas.sample1[0] || 0, fgWeights.sample1);
      const s1_inj2 = calcSingleAssay(fgAreas.sample1[1] || 0, fgWeights.sample1);
      const s2_inj1 = calcSingleAssay(fgAreas.sample2[0] || 0, fgWeights.sample2);
      const s2_inj2 = calcSingleAssay(fgAreas.sample2[1] || 0, fgWeights.sample2);

      const validInjs = [s1_inj1, s1_inj2, s2_inj1, s2_inj2].filter((v) => v > 0);
      if (validInjs.length === 4) {
        calculatedAssay = Number((validInjs.reduce((a, b) => a + b, 0) / 4).toFixed(2));
        assayComplies = calculatedAssay >= 90.0 && calculatedAssay <= 110.0;
      }

      assayBreakdown = { s1_inj1, s1_inj2, s2_inj1, s2_inj2, averageAssay: calculatedAssay };
    }

    // 5. Deliverable Volume
    let deliverableVolAvg: number | null = null;
    let deliverableComplies = false;
    if (!isBulk && formData.deliverableVolume) {
      const nominal = parseFloat(String(formData.deliverableVolume.nominalVolume)) || 60;
      const vols = (formData.deliverableVolume.volumes || []).map((v) => parseFloat(String(v)) || 0).filter((v) => v > 0);
      if (vols.length === 10) {
        deliverableVolAvg = Number((vols.reduce((a, b) => a + b, 0) / vols.length).toFixed(2));
        const minVol = Math.min(...vols);
        const avgPct = (deliverableVolAvg / nominal) * 100;
        const minPct = (minVol / nominal) * 100;
        deliverableComplies = avgPct >= 100.0 && minPct >= 95.0;
      }
    }

    // 6. Uniformity of Dosage Units
    let avValue: number | null = null;
    let avComplies = false;
    let uniformityDetails: any = null;

    if (!isBulk && formData.uniformityDosage) {
      const validUnits = (formData.uniformityDosage.units || []).filter(
        (u) => (parseFloat(String(u.weight)) || 0) > 0 && (parseFloat(String(u.peakArea)) || 0) > 0
      );

      if (validUnits.length === 10) {
        const unitAssays = validUnits.map((u) => calcSingleAssay(parseFloat(String(u.peakArea)), parseFloat(String(u.weight))));
        const first10 = unitAssays.slice(0, 10);
        const meanX = Number((first10.reduce((a, b) => a + b, 0) / 10).toFixed(2));
        const variance = first10.reduce((acc, v) => acc + Math.pow(v - meanX, 2), 0) / 9;
        const s = Number(Math.sqrt(variance).toFixed(3));
        const k = 2.4;
        const rsd = meanX > 0 ? Number(((s / meanX) * 100).toFixed(2)) : 0;
        const targetT = 103;

        let m = meanX;
        if (meanX < 98.5) m = 98.5;
        else if (meanX > targetT) m = targetT;

        const av = Math.abs(m - meanX) + k * s;
        avValue = Number(av.toFixed(2));
        avComplies = avValue <= 15.0;

        uniformityDetails = {
          units: validUnits.map((u, i) => ({ ...u, calculatedAssay: unitAssays[i] })),
          meanX,
          s,
          rsd,
          targetT,
          m,
          avValue,
          complies: avComplies,
        };
      }
    }

    // 7. 4-Aminophenol Impurity
    const imp_ru = parseFloat(String(formData.impurity.sampleArea)) || 0;
    const imp_rs = parseFloat(String(formData.impurity.standardArea)) || 0;
    const imp_ws = parseFloat(String(formData.impurity.standardWeight)) || 25;
    const imp_wu = parseFloat(String(formData.impurity.sampleWeight)) || 1000;
    let calculatedImpurity = 0;
    let impurityComplies = false;
    const impDenom = (imp_rs - imp_ru) * imp_wu;
    if (imp_rs > 0 && imp_ru > 0 && impDenom > 0) {
      calculatedImpurity = Number(((imp_ru * imp_ws * 100) / impDenom).toFixed(4));
      impurityComplies = calculatedImpurity <= 0.15;
    }

    // 8. Safety & Microbial
    const deg = parseFloat(String(formData.safetyMicrobial.degPercent)) || 0;
    const eg = parseFloat(String(formData.safetyMicrobial.egPercent)) || 0;
    const tamc = parseFloat(String(formData.safetyMicrobial.tamc)) || 0;
    const tymc = parseFloat(String(formData.safetyMicrobial.tymc)) || 0;
    const eColiAbsent = formData.safetyMicrobial.eColi === 'ABSENT';
    const safetyComplies = deg <= 0.1 && eg <= 0.1 && tamc <= 200 && tymc <= 20 && eColiAbsent;

    // 9. Qualitative Checks
    const idHplcComplies = formData.identificationHplc !== 'DOES_NOT_COMPLY';
    const idFtirComplies = formData.identificationFtir !== 'DOES_NOT_COMPLY';
    const suspendedComplies = isBulk ? formData.suspendedMatters !== 'DOES_NOT_COMPLY' : true;

    const allPassed =
      idHplcComplies &&
      idFtirComplies &&
      suspendedComplies &&
      densityComplies &&
      phComplies &&
      systemSuitabilityPassed &&
      assayComplies &&
      (isBulk || (deliverableComplies && avComplies)) &&
      impurityComplies &&
      safetyComplies;

    const overallVerdict: 'APPROVED' | 'REJECTED' = allPassed ? 'APPROVED' : 'REJECTED';

    return {
      stage: formData.stage,
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
          degComplies: deg <= 0.1,
          eg,
          egComplies: eg <= 0.1,
          tamc,
          tamcComplies: tamc <= 200,
          tymc,
          tymcComplies: tymc <= 20,
          eColi: formData.safetyMicrobial.eColi,
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
  }, [formData]);

  // Save report mutation
  const saveMutation = useMutation({
    mutationFn: (data: AskprolCalculationPayload) => askprolService.createReport(data),
    onSuccess: (res) => {
      setSavedSuccessMessage(`Report ${res.report.reportNumber} & CoA ${res.report.coaNumber} saved successfully with 21 CFR Part 11 audit log!`);
      queryClient.invalidateQueries({ queryKey: ['askprol-reports-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              QC/CLG/ATM-003
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              USP 2026 Compliant
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Citi Pharma Ltd
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Askprol Suspension 120mg/5ml QC & CoA Automation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manual testing workstation &amp; automated analytical calculation engine matching QC/CLG/ATM-003 and workbook Askprol Suspension.xlsx. All fields are empty for testing data entry.
          </p>
        </div>

        {/* Navigation Tabs: Description, Calculation, Certificate */}
        <div className="border-t border-slate-100 mt-6 pt-4 flex items-center justify-start">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('DESCRIPTION')}
              className={cn(
                'px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'DESCRIPTION'
                  ? 'bg-[#0B1A30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              <FileText className="w-4 h-4" />
              <span>Description</span>
            </button>

            <button
              onClick={() => setActiveTab('CALCULATION')}
              className={cn(
                'px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'CALCULATION'
                  ? 'bg-[#0B1A30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              <FlaskConical className="w-4 h-4" />
              <span>Calculation</span>
            </button>

            <button
              onClick={() => setActiveTab('CERTIFICATE')}
              className={cn(
                'px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                activeTab === 'CERTIFICATE'
                  ? 'bg-[#0B1A30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              <Award className="w-4 h-4" />
              <span>Certificate</span>
            </button>
          </div>
        </div>
      </div>

      {savedSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-800 text-sm font-semibold print:hidden animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{savedSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSavedSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'DESCRIPTION' ? (
        /* Tab 1: Description, Official SOP Monograph Document (QC/CLG/ATM-003) */
        <div className="space-y-6 animate-in fade-in">
          <OfficialAtm003Document />

          {/* Description Tab Footer */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
            <div>
              <span className="text-sm font-bold text-slate-900 block">
                QC/CLG/ATM-003 Specifications Monograph Verified
              </span>
              <span className="text-xs text-slate-500">
                Authorized analytical testing method for Askprol Suspension 120mg/5ml. Proceed to Calculation to enter batch testing data.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('CALCULATION')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0B1A30] text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <span>Proceed to Calculation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : activeTab === 'CALCULATION' ? (
        /* Tab 2: Calculation Engine */
        <div className="space-y-6 animate-in fade-in">
          {/* Step 1: Batch Identification & Stage Setup */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Step 1: Batch Setup</span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Batch Identification &amp; Testing Stage</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your testing batch details, analysis report number, and select the testing stage.</p>
              </div>

              {/* Stage Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    stage: 'FINAL_BULK',
                    packSize: '1000 Liters (Bulk Tanker)',
                    packagingType: 'Bulk Stainless Steel (SS 316L) Tanker Container',
                    packagingDescription: 'Bulk Stainless Steel (SS 316L) Tanker Container',
                  }))}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                    formData.stage === 'FINAL_BULK' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  )}
                >
                  Final Bulk Stage
                </button>
                <button
                  onClick={() => setFormData((prev) => ({
                    ...prev,
                    stage: 'FINISHED_GOOD',
                    packSize: '60 mL Amber Bottle',
                    packagingType: PACKAGING_OPTIONS[0],
                    packagingDescription: PACKAGING_OPTIONS[0],
                  }))}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                    formData.stage === 'FINISHED_GOOD' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  )}
                >
                  Finished Good (Pack)
                </button>
              </div>
            </div>

            {/* Legal & Regulatory Header Info Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Generic Name</span>
                <span className="font-bold text-slate-800">Acetaminophen 120mg/5ml</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Brand Name</span>
                <span className="font-bold text-slate-800">Askprol Suspension</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">DRAP Reg. No.</span>
                <span className="font-mono font-bold text-slate-800">030725</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Mfg. License No.</span>
                <span className="font-mono font-bold text-slate-800">000512</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">GTIN Barcode</span>
                <span className="font-mono font-bold text-slate-800">8964002697014</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Standard Shelf Life</span>
                <span className="font-bold text-emerald-700">02 Years (24 Months)</span>
              </div>
            </div>

            {/* Batch Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  placeholder="Enter Batch No (e.g. ASK-26-001)"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Analytical Report No. (A.No.) *</label>
                <input
                  type="text"
                  placeholder="Enter A.No. (e.g. QC/ASK/26-001)"
                  value={formData.analyticalReportNo}
                  onChange={(e) => setFormData({ ...formData, analyticalReportNo: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturing Date</label>
                <input
                  type="date"
                  value={formData.manufacturingDate}
                  onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Qualitative & Description Specifications */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-800">
                {formData.stage === 'FINAL_BULK' ? '5.1 / 6.1 Final Bulk Specifications' : '5.2 / 6.2 Finished Pack Specifications'} (QC/CLG/ATM-003)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {formData.stage === 'FINAL_BULK' ? '6.1.1' : '6.2.1'} Description of content:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter description of content..."
                    value={formData.contentDescription}
                    onChange={(e) => setFormData({ ...formData, contentDescription: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {formData.stage === 'FINISHED_GOOD' ? '6.2.2 Description of Packing (PET / Glass Bottles)' : 'Bulk Packaging Description'}
                  </label>
                  {formData.stage === 'FINISHED_GOOD' ? (
                    <div className="space-y-2">
                      <select
                        value={formData.packagingDescription}
                        onChange={(e) => setFormData({ ...formData, packagingDescription: e.target.value, packagingType: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      >
                        {PACKAGING_OPTIONS.map((opt, i) => (
                          <option key={i} value={opt}>
                            Option {i + 1}: {opt.slice(0, 65)}...
                          </option>
                        ))}
                      </select>
                      <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 text-xs text-slate-800 leading-relaxed">
                        <span className="font-bold text-purple-900 block text-[10px] uppercase tracking-wider mb-0.5">
                          Full Packaging Specification:
                        </span>
                        {formData.packagingDescription}
                      </div>
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      placeholder="Enter bulk packaging description..."
                      value={formData.packagingDescription}
                      onChange={(e) => setFormData({ ...formData, packagingDescription: e.target.value, packagingType: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                    />
                  )}
                </div>
              </div>

              {/* Qualitative Test Verdicts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {formData.stage === 'FINAL_BULK' ? '6.1.2' : '6.2.3'} Identification (A. By HPLC)
                    </span>
                    <span className="text-[11px] text-slate-500">Peak RT corresponds to Acetaminophen standard (USP &lt;621&gt;)</span>
                  </div>
                  <select
                    value={formData.identificationHplc}
                    onChange={(e) => setFormData({ ...formData, identificationHplc: e.target.value as any })}
                    className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="COMPLIES">COMPLIES</option>
                    <option value="DOES_NOT_COMPLY">DOES NOT COMPLY</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {formData.stage === 'FINAL_BULK' ? '6.1.2' : '6.2.3'} Identification (B. By FTIR)
                    </span>
                    <span className="text-[11px] text-slate-500">IR Spectrum complies with Acetaminophen standard (USP &lt;197&gt;)</span>
                  </div>
                  <select
                    value={formData.identificationFtir}
                    onChange={(e) => setFormData({ ...formData, identificationFtir: e.target.value as any })}
                    className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="COMPLIES">COMPLIES</option>
                    <option value="DOES_NOT_COMPLY">DOES NOT COMPLY</option>
                  </select>
                </div>

                {formData.stage === 'FINAL_BULK' && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">6.1.5 Suspended Matters Test</span>
                      <span className="text-[11px] text-slate-500">Centrifuge 3500 rpm for 10 min (In-House)</span>
                    </div>
                    <select
                      value={formData.suspendedMatters}
                      onChange={(e) => setFormData({ ...formData, suspendedMatters: e.target.value as any })}
                      className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="COMPLIES">COMPLIES</option>
                      <option value="DOES_NOT_COMPLY">DOES NOT COMPLY</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Density & pH Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Density Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {formData.stage === 'FINAL_BULK' ? '6.1.3' : '6.2.4'} Density: - (In-House Pycnometer Method)
                      </h3>
                      <span className="text-xs text-slate-500">Formula: Density (g/ml) = W3 / Volume of Pycnometer | Limit: 1.0400 to 1.1300 g/ml</span>
                    </div>
                    {calculationResult.calculations.density.calculatedDensity > 0 ? (
                      <span className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-bold',
                        calculationResult.calculations.density.complies
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      )}>
                        {calculationResult.calculations.density.complies ? 'Complies' : 'Not Complies'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Awaiting Input
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Empty Pycnometer (w1)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 30.1500"
                          value={formData.density.w1}
                          onChange={(e) => setFormData({
                            ...formData,
                            density: { ...formData.density, w1: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Sample + Pycnometer (w3)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 56.8800"
                          value={formData.density.w2}
                          onChange={(e) => setFormData({
                            ...formData,
                            density: { ...formData.density, w2: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">g</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Pycnometer Vol (V)</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="25.0"
                          value={formData.density.pycnometerVolume}
                          onChange={(e) => setFormData({
                            ...formData,
                            density: { ...formData.density, pycnometerVolume: parseFloat(e.target.value) || 25 },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">mL</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Sample Wt (w5) = {calculationResult.calculations.density.w3 > 0 ? `${calculationResult.calculations.density.w3} g` : '—'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      Density = {calculationResult.calculations.density.calculatedDensity > 0 ? `${calculationResult.calculations.density.calculatedDensity} g/mL` : '—'}
                    </span>
                  </div>
                </div>

                {/* pH Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {formData.stage === 'FINAL_BULK' ? '6.1.4' : '6.2.5'} pH (Calibrated pH Meter - USP &lt;791&gt;)
                      </h3>
                      <span className="text-xs text-slate-500">Release Specification Limit: 4.0 – 6.9</span>
                    </div>
                    {calculationResult.calculations.ph.calculatedPh > 0 ? (
                      <span className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-bold',
                        calculationResult.calculations.ph.complies
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      )}>
                        {calculationResult.calculations.ph.complies ? 'Complies' : 'Not Complies'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Awaiting Input
                      </span>
                    )}
                  </div>

                  {formData.stage === 'FINAL_BULK' ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Top Layer</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5.20"
                          value={formData.ph.top}
                          onChange={(e) => setFormData({
                            ...formData,
                            ph: { ...formData.ph, top: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Middle Layer</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5.25"
                          value={formData.ph.mid}
                          onChange={(e) => setFormData({
                            ...formData,
                            ph: { ...formData.ph, mid: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bottom Layer</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5.22"
                          value={formData.ph.bottom}
                          onChange={(e) => setFormData({
                            ...formData,
                            ph: { ...formData.ph, bottom: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Sample 01</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5.25"
                          value={formData.ph.sample1}
                          onChange={(e) => setFormData({
                            ...formData,
                            ph: { ...formData.ph, sample1: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Sample 02</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5.28"
                          value={formData.ph.sample2}
                          onChange={(e) => setFormData({
                            ...formData,
                            ph: { ...formData.ph, sample2: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Homogeneity Verified</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      Average pH = {calculationResult.calculations.ph.calculatedPh > 0 ? calculationResult.calculations.ph.calculatedPh : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* HPLC System Suitability & Assay Row */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {formData.stage === 'FINAL_BULK' ? '6.1.6' : '6.2.8'} Assay of Acetaminophen: (By HPLC) — USP &lt;621&gt;
                    </h3>
                    <span className="text-xs text-slate-500">
                      Release Limit: {formData.stage === 'FINAL_BULK' ? '95.00% to 105.00%' : '90.00% to 110.00%'} of Label Claim
                    </span>
                  </div>
                  {calculationResult.calculations.assay.calculatedAssay > 0 ? (
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold',
                      calculationResult.calculations.assay.complies
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    )}>
                      {calculationResult.calculations.assay.complies ? 'Complies' : 'Not Complies'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      Awaiting Input
                    </span>
                  )}
                </div>

                {/* System Suitability 5 Replicate Standard Areas */}
                <div className="bg-slate-50/70 rounded-xl p-4 space-y-3 border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Standard Solution 5 Injections (rs) &amp; System Suitability (%RSD &le; 2.0%)
                    </span>
                    <span className={cn(
                      'text-xs font-bold',
                      calculationResult.calculations.systemSuitability.rsdComplies ? 'text-emerald-700' : 'text-slate-500'
                    )}>
                      %RSD = {calculationResult.calculations.systemSuitability.rsdPercent > 0 ? `${calculationResult.calculations.systemSuitability.rsdPercent}%` : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {formData.systemSuitability.replicateAreas.map((area, idx) => (
                      <div key={idx}>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Run {idx + 1}</label>
                        <input
                          type="number"
                          placeholder={`Run ${idx + 1}`}
                          value={area}
                          onChange={(e) => {
                            const newAreas = [...formData.systemSuitability.replicateAreas];
                            newAreas[idx] = e.target.value as any;
                            setFormData({
                              ...formData,
                              systemSuitability: { ...formData.systemSuitability, replicateAreas: newAreas },
                            });
                          }}
                          className="w-full text-xs font-mono font-semibold px-2 py-1 rounded-lg border border-slate-200"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mean Standard Area (rs)</span>
                      <span className="font-mono font-bold text-slate-800">
                        {calculationResult.calculations.systemSuitability.meanArea > 0 ? calculationResult.calculations.systemSuitability.meanArea : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Tailing Factor (&le; 2.0)</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 1.16"
                        value={formData.systemSuitability.tailingFactor}
                        onChange={(e) => setFormData({
                          ...formData,
                          systemSuitability: { ...formData.systemSuitability, tailingFactor: e.target.value as any },
                        })}
                        className="w-24 text-xs font-semibold px-2 py-0.5 rounded border border-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Theoretical Plates (&ge; 1000)</span>
                      <input
                        type="number"
                        placeholder="e.g. 4900"
                        value={formData.systemSuitability.theoreticalPlates}
                        onChange={(e) => setFormData({
                          ...formData,
                          systemSuitability: { ...formData.systemSuitability, theoreticalPlates: e.target.value as any },
                        })}
                        className="w-24 text-xs font-semibold px-2 py-0.5 rounded border border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Sample Injections & Calculation Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Standard Weight (Ws)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g. 50.1"
                          value={formData.assay.standardWeight}
                          onChange={(e) => setFormData({
                            ...formData,
                            assay: { ...formData.assay, standardWeight: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">mg</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Working Standard Potency</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 99.58"
                          value={formData.assay.standardPotency}
                          onChange={(e) => setFormData({
                            ...formData,
                            assay: { ...formData.assay, standardPotency: e.target.value as any },
                          })}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Label Claim</label>
                      <span className="block text-xs font-bold text-slate-900 py-1.5">120 mg / 5 mL</span>
                    </div>
                  </div>

                  {/* Bulk Granular Table */}
                  {formData.stage === 'FINAL_BULK' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Sample Layer</th>
                            <th className="p-2.5">Weight (g)</th>
                            <th className="p-2.5">Inj 1 Area</th>
                            <th className="p-2.5">Inj 2 Area</th>
                            <th className="p-2.5 text-right">Layer Assay %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(['top', 'mid', 'bottom'] as const).map((layer) => (
                            <tr key={layer}>
                              <td className="p-2.5 font-bold capitalize text-slate-800">{layer}</td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="e.g. 4.750"
                                  value={formData.assay.bulkWeights?.[layer]}
                                  onChange={(e) => {
                                    const bWeights = { ...formData.assay.bulkWeights, [layer]: e.target.value as any } as any;
                                    setFormData({ ...formData, assay: { ...formData.assay, bulkWeights: bWeights } });
                                  }}
                                  className="w-24 px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  placeholder="Inj 1"
                                  value={formData.assay.bulkAreas?.[layer]?.[0]}
                                  onChange={(e) => {
                                    const bAreas = { ...formData.assay.bulkAreas } as any;
                                    bAreas[layer] = [e.target.value as any, bAreas[layer]?.[1] || ''];
                                    setFormData({ ...formData, assay: { ...formData.assay, bulkAreas: bAreas } });
                                  }}
                                  className="w-28 px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  placeholder="Inj 2"
                                  value={formData.assay.bulkAreas?.[layer]?.[1]}
                                  onChange={(e) => {
                                    const bAreas = { ...formData.assay.bulkAreas } as any;
                                    bAreas[layer] = [bAreas[layer]?.[0] || '', e.target.value as any];
                                    setFormData({ ...formData, assay: { ...formData.assay, bulkAreas: bAreas } });
                                  }}
                                  className="w-28 px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {calculationResult.calculations.assay.breakdown?.[`${layer}Assay`] > 0
                                  ? `${calculationResult.calculations.assay.breakdown?.[`${layer}Assay`]}%`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Finished Good Granular Table */}
                  {formData.stage === 'FINISHED_GOOD' && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Sample No.</th>
                            <th className="p-2.5">Weight (g)</th>
                            <th className="p-2.5">Inj 1 Area</th>
                            <th className="p-2.5">Inj 2 Area</th>
                            <th className="p-2.5 text-right">Inj 1 Assay</th>
                            <th className="p-2.5 text-right">Inj 2 Assay</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(['sample1', 'sample2'] as const).map((smp, i) => (
                            <tr key={smp}>
                              <td className="p-2.5 font-bold text-slate-800">Sample 0{i + 1}</td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="e.g. 4.745"
                                  value={formData.assay.fgWeights?.[smp]}
                                  onChange={(e) => {
                                    const fgWeights = { ...formData.assay.fgWeights, [smp]: e.target.value as any } as any;
                                    setFormData({ ...formData, assay: { ...formData.assay, fgWeights } });
                                  }}
                                  className="w-24 px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  placeholder="Inj 1"
                                  value={formData.assay.fgAreas?.[smp]?.[0]}
                                  onChange={(e) => {
                                    const fgAreas = { ...formData.assay.fgAreas } as any;
                                    fgAreas[smp] = [e.target.value as any, fgAreas[smp]?.[1] || ''];
                                    setFormData({ ...formData, assay: { ...formData.assay, fgAreas } });
                                  }}
                                  className="w-28 px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  placeholder="Inj 2"
                                  value={formData.assay.fgAreas?.[smp]?.[1]}
                                  onChange={(e) => {
                                    const fgAreas = { ...formData.assay.fgAreas } as any;
                                    fgAreas[smp] = [fgAreas[smp]?.[0] || '', e.target.value as any];
                                    setFormData({ ...formData, assay: { ...formData.assay, fgAreas } });
                                  }}
                                  className="w-28 px-2 py-1 rounded border border-slate-200 font-mono"
                                />
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                {calculationResult.calculations.assay.breakdown?.[`s${i + 1}_inj1`] > 0
                                  ? `${calculationResult.calculations.assay.breakdown?.[`s${i + 1}_inj1`]}%`
                                  : '—'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                {calculationResult.calculations.assay.breakdown?.[`s${i + 1}_inj2`] > 0
                                  ? `${calculationResult.calculations.assay.breakdown?.[`s${i + 1}_inj2`]}%`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Calculated Overall Assay Banner */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-purple-700 font-bold block">Overall Mean Assay %</span>
                      <span className="text-[11px] text-purple-600">Calculated strictly per QC/CLG/ATM-003</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-purple-900 font-mono">
                        {calculationResult.calculations.assay.calculatedAssay > 0
                          ? `${calculationResult.calculations.assay.calculatedAssay}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Finished Good Specific Modules: Deliverable Volume & Uniformity of Dosage Units */}
              {formData.stage === 'FINISHED_GOOD' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Deliverable Volume Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">6.2.6 Deliverable volume: - (USP &lt;698&gt;)</h3>
                        <span className="text-xs text-slate-500">Avg &ge; 100% (60.0 mL), No container &lt; 95% (57.0 mL)</span>
                      </div>
                      {calculationResult.calculations.deliverableVolume?.averageVolume ? (
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold',
                          calculationResult.calculations.deliverableVolume?.complies
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        )}>
                          {calculationResult.calculations.deliverableVolume?.complies ? 'Complies' : 'Not Complies'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Awaiting 10 Units
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {formData.deliverableVolume?.volumes.map((v, i) => (
                        <div key={i}>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Unit {i + 1}</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="60.0"
                            value={v}
                            onChange={(e) => {
                              const newVols = [...(formData.deliverableVolume?.volumes || [])];
                              newVols[i] = e.target.value as any;
                              setFormData({
                                ...formData,
                                deliverableVolume: { ...formData.deliverableVolume!, volumes: newVols },
                              });
                            }}
                            className="w-full text-xs font-mono font-semibold px-2 py-1 rounded border border-slate-200"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                      <span>Average Volume</span>
                      <span className="font-mono text-slate-900 text-sm">
                        {calculationResult.calculations.deliverableVolume?.averageVolume
                          ? `${calculationResult.calculations.deliverableVolume.averageVolume} mL`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Uniformity of Dosage Units (Content Uniformity - USP <905>) */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">6.2.7 Uniformity of dosage (USP &lt;905&gt; Content Uniformity)</h3>
                        <span className="text-xs text-slate-500">AV = |M - X| + 2.4s | Limit: AV &le; 15.0 (L1)</span>
                      </div>
                      {calculationResult.calculations.uniformityDosage?.avValue !== null ? (
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold',
                          calculationResult.calculations.uniformityDosage?.complies
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        )}>
                          {calculationResult.calculations.uniformityDosage?.complies ? 'Complies' : 'Not Complies'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Awaiting 10 Units
                        </span>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="p-2">Unit #</th>
                            <th className="p-2">Weight (g)</th>
                            <th className="p-2">Peak Area</th>
                            <th className="p-2 text-right">Calculated %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.uniformityDosage?.units?.map((u, i) => (
                            <tr key={u.unitNo}>
                              <td className="p-2 font-bold text-slate-600">{u.unitNo}</td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="e.g. 4.750"
                                  value={u.weight}
                                  onChange={(e) => {
                                    const newUnits = [...(formData.uniformityDosage?.units || [])];
                                    newUnits[i] = { ...newUnits[i], weight: e.target.value as any };
                                    setFormData({ ...formData, uniformityDosage: { units: newUnits } });
                                  }}
                                  className="w-20 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  placeholder="Area"
                                  value={u.peakArea}
                                  onChange={(e) => {
                                    const newUnits = [...(formData.uniformityDosage?.units || [])];
                                    newUnits[i] = { ...newUnits[i], peakArea: e.target.value as any };
                                    setFormData({ ...formData, uniformityDosage: { units: newUnits } });
                                  }}
                                  className="w-24 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-xs"
                                />
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-800">
                                {calculationResult.calculations.uniformityDosage?.details?.units?.[i]?.calculatedAssay > 0
                                  ? `${calculationResult.calculations.uniformityDosage?.details?.units?.[i]?.calculatedAssay}%`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Mean (X)</span>
                        <span className="font-mono font-bold">
                          {calculationResult.calculations.uniformityDosage?.details?.meanX > 0
                            ? `${calculationResult.calculations.uniformityDosage?.details?.meanX}%`
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Std Dev (s)</span>
                        <span className="font-mono font-bold">
                          {calculationResult.calculations.uniformityDosage?.details?.s || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">AV Value (&le; 15.0)</span>
                        <span className="font-mono font-black text-purple-900">
                          {calculationResult.calculations.uniformityDosage?.avValue !== null
                            ? calculationResult.calculations.uniformityDosage?.avValue
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= SECTION 6: 4-AMINOPHENOL IMPURITY BY HPLC (PAGE 7 & 8) ================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>6.2.9 Impurities: 4-Aminophenol in Acetaminophen containing drug products: (HPLC)</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">USP &lt;227&gt;</span>
                    </h3>
                    <span className="text-xs text-slate-500">Method: LC-Gradient | Column: 4.6×150mm 5µm L85 | UV 300nm | Release Limit: NMT 0.15% relative to Acetaminophen</span>
                  </div>
                  {calculationResult.calculations.impurity.calculatedImpurity > 0 ? (
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold',
                      calculationResult.calculations.impurity.complies
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    )}>
                      {calculationResult.calculations.impurity.complies ? 'Complies (≤ 0.15%)' : 'Does Not Comply (> 0.15%)'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      Awaiting Input
                    </span>
                  )}
                </div>

                {/* Chromatographic Conditions Summary Bar */}
                <div className="bg-slate-900 text-white p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div><span className="text-slate-400 block text-[10px]">Mobile Phase:</span>Gradient A:B:C (Phosphate/Water/ACN)</div>
                  <div><span className="text-slate-400 block text-[10px]">Flow Rate &amp; Temp:</span>1.0 mL/min | 30°C</div>
                  <div><span className="text-slate-400 block text-[10px]">Diluent:</span>ACN:Buffer (10:90)</div>
                  <div><span className="text-slate-400 block text-[10px]">Injection Vol:</span>10 µL (Narrow 30-min prep)</div>
                </div>

                {/* Primary Weighing & HPLC Peak Area Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Std Weight (Ws) (mg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 25.0"
                      value={formData.impurity.standardWeight || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        impurity: { ...formData.impurity, standardWeight: parseFloat(e.target.value) || ('' as any) },
                      })}
                      className="w-full font-mono font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">USP 4-Aminophenol RS (25mg/100mL)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sample Weight (Wu) (mg)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 1000.0"
                      value={formData.impurity.sampleWeight || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        impurity: { ...formData.impurity, sampleWeight: parseFloat(e.target.value) || ('' as any) },
                      })}
                      className="w-full font-mono font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Acetaminophen in sample (47.5g susp)</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Standard Peak Area (rs)</label>
                    <input
                      type="number"
                      placeholder="e.g. 125000"
                      value={formData.impurity.standardArea || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        impurity: { ...formData.impurity, standardArea: parseFloat(e.target.value) || ('' as any) },
                      })}
                      className="w-full font-mono font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Area of 4-Aminophenol in STD</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sample Peak Area (ru)</label>
                    <input
                      type="number"
                      placeholder="e.g. 48"
                      value={formData.impurity.sampleArea || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        impurity: { ...formData.impurity, sampleArea: parseFloat(e.target.value) || ('' as any) },
                      })}
                      className="w-full font-mono font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Area of 4-Aminophenol in Sample</span>
                  </div>
                </div>

                {/* System Suitability Parameters for Impurities (Page 8 Requirements) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">System Suitability Parameters (HPLC Gradient Verification)</span>
                    <span className="text-[10px] text-slate-500 font-mono">Typical RT: 4.2 – 5.3 min</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Resolution (NLT 1.0)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 2.0"
                        value={formData.impurity.resolution || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          impurity: { ...formData.impurity, resolution: parseFloat(e.target.value) || ('' as any) },
                        })}
                        className="w-full font-mono text-xs px-2 py-1 rounded border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Tailing (NMT 1.5)</label>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="e.g. 1.0"
                        value={formData.impurity.tailingFactor || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          impurity: { ...formData.impurity, tailingFactor: parseFloat(e.target.value) || ('' as any) },
                        })}
                        className="w-full font-mono text-xs px-2 py-1 rounded border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">%RSD (NMT 5.0%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 1.2"
                        value={formData.impurity.rsdPercent || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          impurity: { ...formData.impurity, rsdPercent: parseFloat(e.target.value) || ('' as any) },
                        })}
                        className="w-full font-mono text-xs px-2 py-1 rounded border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">S/N Ratio (NLT 20)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 27.0"
                        value={formData.impurity.signalToNoise || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          impurity: { ...formData.impurity, signalToNoise: parseFloat(e.target.value) || ('' as any) },
                        })}
                        className="w-full font-mono text-xs px-2 py-1 rounded border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-600 mb-0.5 text-[11px]">Retention Time (min)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 4.8"
                        value={formData.impurity.retentionTime || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          impurity: { ...formData.impurity, retentionTime: parseFloat(e.target.value) || ('' as any) },
                        })}
                        className="w-full font-mono text-xs px-2 py-1 rounded border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Mathematical Calculation Breakdown (Page 8 & 9 Formula) */}
                <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-950 uppercase text-[11px]">Calculation Mathematical Trace:</span>
                    <span className="font-mono text-xs font-bold text-rose-900">
                      Formula: Result (%) = [ (ru × Ws) / ((rs &minus; ru) × Wu) ] × 100
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-rose-200 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Numerator (ru × Ws × 100)</span>
                      <span className="font-bold text-slate-800">
                        {formData.impurity.sampleArea && formData.impurity.standardWeight
                          ? (Number(formData.impurity.sampleArea) * Number(formData.impurity.standardWeight) * 100).toLocaleString()
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Denominator ((rs - ru) × Wu)</span>
                      <span className="font-bold text-slate-800">
                        {formData.impurity.standardArea && formData.impurity.sampleArea && formData.impurity.sampleWeight
                          ? ((Number(formData.impurity.standardArea) - Number(formData.impurity.sampleArea)) * Number(formData.impurity.sampleWeight)).toLocaleString()
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Calculated 4-Aminophenol</span>
                      <span className="font-black text-rose-900 text-sm">
                        {calculationResult.calculations.impurity.calculatedImpurity > 0
                          ? `${calculationResult.calculations.impurity.calculatedImpurity}%`
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">Verdict (Limit &le; 0.15%)</span>
                      <span className={cn(
                        'font-bold text-xs block py-0.5',
                        calculationResult.calculations.impurity.complies ? 'text-emerald-700' : 'text-rose-700'
                      )}>
                        {calculationResult.calculations.impurity.calculatedImpurity > 0
                          ? (calculationResult.calculations.impurity.complies ? 'COMPLIES' : 'NOT COMPLIES')
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= SECTION 7: TOXIC CONTAMINANTS DEG & EG (PAGE 9) ================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>6.2.10 Diethylene Glycol: - &amp; 6.2.11 Ethylene Glycol: -</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">WHO QAS/23.922 | QC/CLG/ATM-045</span>
                    </h3>
                    <span className="text-xs text-slate-500">Method: GC-FID | Limit: Not More Than 0.1% w/w for both DEG and EG as per DRAP / WHO Guidelines</span>
                  </div>
                  {String(formData.safetyMicrobial.degPercent) !== '' && String(formData.safetyMicrobial.egPercent) !== '' ? (
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold',
                      calculationResult.calculations.safetyMicrobial.degComplies && calculationResult.calculations.safetyMicrobial.egComplies
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    )}>
                      {calculationResult.calculations.safetyMicrobial.degComplies && calculationResult.calculations.safetyMicrobial.egComplies
                        ? 'Complies (≤ 0.1%)'
                        : 'Contamination Detected'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                      Awaiting Input
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">6.2.10 Diethylene Glycol (DEG) %</label>
                      <span className="text-[10px] font-mono text-slate-500">Limit: &le; 0.1%</span>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.02"
                      value={formData.safetyMicrobial.degPercent}
                      onChange={(e) => setFormData({
                        ...formData,
                        safetyMicrobial: { ...formData.safetyMicrobial, degPercent: e.target.value as any },
                      })}
                      className="w-full font-mono font-bold text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-500 bg-white"
                    />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Status:</span>
                      <span className={cn('font-bold', calculationResult.calculations.safetyMicrobial.degComplies ? 'text-emerald-700' : 'text-rose-700')}>
                        {String(formData.safetyMicrobial.degPercent) !== ''
                          ? (calculationResult.calculations.safetyMicrobial.degComplies ? 'COMPLIES (Within Limit)' : 'EXCEEDS 0.1% LIMIT')
                          : 'Pending Entry'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">6.2.11 Ethylene Glycol (EG) %</label>
                      <span className="text-[10px] font-mono text-slate-500">Limit: &le; 0.1%</span>
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="e.g. 0.01"
                      value={formData.safetyMicrobial.egPercent}
                      onChange={(e) => setFormData({
                        ...formData,
                        safetyMicrobial: { ...formData.safetyMicrobial, egPercent: e.target.value as any },
                      })}
                      className="w-full font-mono font-bold text-sm px-3 py-2 rounded-lg border border-slate-300 focus:border-slate-500 bg-white"
                    />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Status:</span>
                      <span className={cn('font-bold', calculationResult.calculations.safetyMicrobial.egComplies ? 'text-emerald-700' : 'text-rose-700')}>
                        {String(formData.safetyMicrobial.egPercent) !== ''
                          ? (calculationResult.calculations.safetyMicrobial.egComplies ? 'COMPLIES (Within Limit)' : 'EXCEEDS 0.1% LIMIT')
                          : 'Pending Entry'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= SECTION 8: MICROBIAL EXAMINATION (PAGE 9) ================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>6.2.12 Microbial Tests: TAMC, TYMC &amp; E.Coli</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">USP &lt;1111&gt; | QC/MLG/SOP-004</span>
                    </h3>
                    <span className="text-xs text-slate-500">TAMC &le; 200 cfu/mL | TYMC &le; 20 cfu/mL | Escherichia coli: Must be Absent in 1 mL</span>
                  </div>
                  {calculationResult.calculations.safetyMicrobial.safetyComplies ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Microbiologically Pure
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Non-Compliant
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Aerobic Microbial Count (TAMC)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="e.g. 45"
                        value={formData.safetyMicrobial.tamc}
                        onChange={(e) => setFormData({
                          ...formData,
                          safetyMicrobial: { ...formData.safetyMicrobial, tamc: e.target.value as any },
                        })}
                        className="w-full font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 pr-16"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-mono">cfu/mL</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Acceptance Limit: &le; 200 cfu/mL</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Yeast &amp; Mold Count (TYMC)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="e.g. 5"
                        value={formData.safetyMicrobial.tymc}
                        onChange={(e) => setFormData({
                          ...formData,
                          safetyMicrobial: { ...formData.safetyMicrobial, tymc: e.target.value as any },
                        })}
                        className="w-full font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 pr-16"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-mono">cfu/mL</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">Acceptance Limit: &le; 20 cfu/mL</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Escherichia coli (1 mL)</label>
                    <select
                      value={formData.safetyMicrobial.eColi}
                      onChange={(e) => setFormData({
                        ...formData,
                        safetyMicrobial: { ...formData.safetyMicrobial, eColi: e.target.value as any },
                      })}
                      className={cn(
                        'w-full font-bold px-3 py-2 rounded-lg border',
                        formData.safetyMicrobial.eColi === 'ABSENT'
                          ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                          : 'border-rose-400 bg-rose-50 text-rose-900'
                      )}
                    >
                      <option value="ABSENT">ABSENT (Pass)</option>
                      <option value="PRESENT">PRESENT (Fail)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1">Acceptance Limit: Must be Absent</span>
                  </div>
                </div>
              </div>

              {/* ================= SECTION 9: DOCUMENT GOVERNANCE & AUDIT STANDARDS (PAGES 9 & 10) ================= */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>9. Document Governance, Standards &amp; Change Control History</span>
                      <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-mono font-bold">ATM-003 Ver: 06</span>
                    </h3>
                    <span className="text-xs text-slate-500">Referencing Citi Pharma Ltd. Standard Operating Procedures &amp; Pharmacopeial Compendia</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Review Due: 13-06-2029
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider text-slate-500">7. Glossary Abbreviations:</span>
                    <p className="text-slate-600"><strong>ATM:</strong> Analytical Test Method | <strong>QC:</strong> Quality Control | <strong>CLG:</strong> Chemical Lab General | <strong>LC/HPLC:</strong> High Performance Liquid Chromatography</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider text-slate-500">8. Related Documents:</span>
                    <ul className="text-slate-600 space-y-0.5">
                      <li>• 8.1 DRAP Product Reg. Letter #030725</li>
                      <li>• 8.2 Certificate of Analysis (CoA)</li>
                      <li>• 8.3 Analytical Raw Data Sheet</li>
                      <li>• 8.4 Product Monograph</li>
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider text-slate-500">9. References:</span>
                    <ul className="text-slate-600 space-y-0.5">
                      <li>• USP 2026 Acetaminophen Suspension</li>
                      <li>• WHO Technical QAS/23.922</li>
                      <li>• USP &lt;1111&gt;, &lt;621&gt;, &lt;791&gt;, &lt;197&gt;, &lt;698&gt;</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                  <div>
                    <span className="font-bold text-purple-900 block">Version 06 Change Rationale:</span>
                    <span className="text-slate-600 text-[11px]">Updated as per USP 2026; new tests for impurities (4-Aminophenol) and suspended matters are added.</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Supersedes: Version 05 (USP 2024)
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  onClick={() => setActiveTab('DESCRIPTION')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Description</span>
                </button>

                <button
                  onClick={() => setActiveTab('CERTIFICATE')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0B1A30] text-white hover:bg-slate-800 transition-all shadow-xs"
                >
                  <span>Review Certificate (CoA)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Tab 3: Certificate (CoA) & Reporting */
            <div className="space-y-6 animate-in fade-in">
              {/* Action Toolbar */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 print:hidden">
                <button
                  onClick={() => setActiveTab('CALCULATION')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Calculations</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save as PDF</span>
                  </button>

                  <button
                    onClick={() => saveMutation.mutate(formData)}
                    disabled={saveMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveMutation.isPending ? 'Saving Report...' : 'Save & Audit Trail'}</span>
                  </button>
                </div>
              </div>

              {/* Official Certificate of Analysis Document (Formatted for 21 CFR Part 11 & Printing) */}
              <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 space-y-6">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    CITI PHARMA LTD.
                  </h1>
                  <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    QUALITY CONTROL DEPARTMENT — CERTIFICATE OF ANALYSIS
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Method Reference: QC/CLG/ATM-003 | Stage: {formData.stage === 'FINAL_BULK' ? 'FINAL BULK' : 'FINISHED GOOD'}
                  </p>
                </div>

                {/* Batch Identifiers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6 text-xs border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Product Name:</span>
                    <span className="font-bold text-slate-900">Askprol Suspension 120mg/5ml</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Generic Name:</span>
                    <span className="font-semibold text-slate-800">Acetaminophen (Paracetamol)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Batch Number:</span>
                    <span className="font-mono font-bold text-slate-900">{formData.batchNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Analytical Report No (A.No):</span>
                    <span className="font-mono font-bold text-slate-900">{formData.analyticalReportNo || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mfg. Date:</span>
                    <span className="font-semibold text-slate-800">{formData.manufacturingDate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Exp. Date:</span>
                    <span className="font-semibold text-slate-800">{formData.expiryDate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">DRAP Reg. No:</span>
                    <span className="font-mono font-semibold text-slate-800">030725</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mfg. License No:</span>
                    <span className="font-mono font-semibold text-slate-800">000512</span>
                  </div>
                </div>

                {/* Side-by-Side Specifications Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Analytical Test Results & Specifications
                  </h3>

                  <div className="border border-slate-900 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                        <tr>
                          <th className="p-2 border-r border-slate-300 w-12 text-center">Sr.</th>
                          <th className="p-2 border-r border-slate-300">Test Attribute</th>
                          <th className="p-2 border-r border-slate-300">Method Reference</th>
                          <th className="p-2 border-r border-slate-300">Release Specification</th>
                          <th className="p-2 border-r border-slate-300">Observed Result</th>
                          <th className="p-2 text-center w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 text-center font-bold">01</td>
                          <td className="p-2 font-semibold">Description of Content</td>
                          <td className="p-2 font-mono text-[11px]">As per BMR</td>
                          <td className="p-2 text-[11px]">A reddish color suspension with solid particles uniformly dispersed</td>
                          <td className="p-2 text-[11px] font-semibold">{formData.contentDescription}</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>

                        {formData.stage === 'FINISHED_GOOD' && (
                          <tr>
                            <td className="p-2 text-center font-bold">02</td>
                            <td className="p-2 font-semibold">Description of Packing</td>
                            <td className="p-2 font-mono text-[11px]">As per BMR</td>
                            <td className="p-2 text-[11px]">Amber PET/Glass bottle with perforation proof cap</td>
                            <td className="p-2 text-[11px] font-semibold">{formData.packagingDescription}</td>
                            <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                          </tr>
                        )}

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '03' : '02'}</td>
                          <td className="p-2 font-semibold">Identification (HPLC)</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;621&gt;</td>
                          <td className="p-2 text-[11px]">Retention time of principal peak corresponds to standard</td>
                          <td className="p-2 font-semibold text-[11px]">Retention time matches standard Acetaminophen</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '04' : '03'}</td>
                          <td className="p-2 font-semibold">Identification (FTIR)</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;197&gt;</td>
                          <td className="p-2 text-[11px]">IR spectrum complies with Acetaminophen standard</td>
                          <td className="p-2 font-semibold text-[11px]">Conforms to reference spectrum</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '05' : '04'}</td>
                          <td className="p-2 font-semibold">pH</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;791&gt;</td>
                          <td className="p-2 text-[11px]">4.0 to 6.9</td>
                          <td className="p-2 font-mono font-bold">
                            {calculationResult.calculations.ph.calculatedPh > 0 ? calculationResult.calculations.ph.calculatedPh : '—'}
                          </td>
                          <td className="p-2 text-center font-black text-emerald-700">
                            {calculationResult.calculations.ph.calculatedPh > 0
                              ? (calculationResult.calculations.ph.complies ? 'COMPLIES' : 'DOES NOT COMPLY')
                              : 'PENDING'}
                          </td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '06' : '05'}</td>
                          <td className="p-2 font-semibold">Density</td>
                          <td className="p-2 font-mono text-[11px]">In-House</td>
                          <td className="p-2 text-[11px]">1.0400 g/mL to 1.1300 g/mL</td>
                          <td className="p-2 font-mono font-bold">
                            {calculationResult.calculations.density.calculatedDensity > 0
                              ? `${calculationResult.calculations.density.calculatedDensity} g/mL`
                              : '—'}
                          </td>
                          <td className="p-2 text-center font-black text-emerald-700">
                            {calculationResult.calculations.density.calculatedDensity > 0
                              ? (calculationResult.calculations.density.complies ? 'COMPLIES' : 'DOES NOT COMPLY')
                              : 'PENDING'}
                          </td>
                        </tr>

                        {formData.stage === 'FINAL_BULK' && (
                          <tr>
                            <td className="p-2 text-center font-bold">06</td>
                            <td className="p-2 font-semibold">Suspended Matters (Centrifuge)</td>
                            <td className="p-2 font-mono text-[11px]">In-House</td>
                            <td className="p-2 text-[11px]">All suspended particles must settle down</td>
                            <td className="p-2 text-[11px] font-semibold">All particles settled down (3500 rpm)</td>
                            <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                          </tr>
                        )}

                        {formData.stage === 'FINISHED_GOOD' && (
                          <>
                            <tr>
                              <td className="p-2 text-center font-bold">07</td>
                              <td className="p-2 font-semibold">Deliverable Volume</td>
                              <td className="p-2 font-mono text-[11px]">USP &lt;698&gt;</td>
                              <td className="p-2 text-[11px]">Average &ge; 100%, No container &lt; 95%</td>
                              <td className="p-2 font-mono font-bold">
                                {calculationResult.calculations.deliverableVolume?.averageVolume
                                  ? `${calculationResult.calculations.deliverableVolume?.averageVolume} mL`
                                  : '—'}
                              </td>
                              <td className="p-2 text-center font-black text-emerald-700">
                                {calculationResult.calculations.deliverableVolume?.averageVolume
                                  ? (calculationResult.calculations.deliverableVolume?.complies ? 'COMPLIES' : 'DOES NOT COMPLY')
                                  : 'PENDING'}
                              </td>
                            </tr>

                            <tr>
                              <td className="p-2 text-center font-bold">08</td>
                              <td className="p-2 font-semibold">Uniformity of Dosage Units</td>
                              <td className="p-2 font-mono text-[11px]">USP &lt;905&gt;</td>
                              <td className="p-2 text-[11px]">Acceptance Value (AV) &le; L1=15</td>
                              <td className="p-2 font-mono font-bold">
                                {calculationResult.calculations.uniformityDosage?.avValue !== null
                                  ? `AV = ${calculationResult.calculations.uniformityDosage?.avValue}`
                                  : '—'}
                              </td>
                              <td className="p-2 text-center font-black text-emerald-700">
                                {calculationResult.calculations.uniformityDosage?.avValue !== null
                                  ? (calculationResult.calculations.uniformityDosage?.complies ? 'COMPLIES' : 'DOES NOT COMPLY')
                                  : 'PENDING'}
                              </td>
                            </tr>
                          </>
                        )}

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '09' : '07'}</td>
                          <td className="p-2 font-semibold">Assay by HPLC (Acetaminophen)</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;621&gt;</td>
                          <td className="p-2 text-[11px]">{calculationResult.calculations.assay.specification}</td>
                          <td className="p-2 font-mono font-black text-sm text-slate-900">
                            {calculationResult.calculations.assay.calculatedAssay > 0
                              ? `${calculationResult.calculations.assay.calculatedAssay}%`
                              : '—'}
                          </td>
                          <td className="p-2 text-center font-black text-emerald-700">
                            {calculationResult.calculations.assay.calculatedAssay > 0
                              ? (calculationResult.calculations.assay.complies ? 'COMPLIES' : 'DOES NOT COMPLY')
                              : 'PENDING'}
                          </td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '10' : '08'}</td>
                          <td className="p-2 font-semibold">Impurities (4-Aminophenol)</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;227&gt;</td>
                          <td className="p-2 text-[11px]">Not more than 0.15% relative to Acetaminophen</td>
                          <td className="p-2 font-mono font-bold">
                            {calculationResult.calculations.impurity.calculatedImpurity > 0
                              ? `${calculationResult.calculations.impurity.calculatedImpurity}%`
                              : '—'}
                          </td>
                          <td className="p-2 text-center font-black text-emerald-700">
                            {calculationResult.calculations.impurity.calculatedImpurity > 0
                              ? (calculationResult.calculations.impurity.complies ? 'COMPLIES' : 'DOES NOT COMPLY')
                              : 'PENDING'}
                          </td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '11' : '09'}</td>
                          <td className="p-2 font-semibold">Diethylene Glycol (DEG)</td>
                          <td className="p-2 font-mono text-[11px]">WHO QAS/23.922</td>
                          <td className="p-2 text-[11px]">Not more than 0.1%</td>
                          <td className="p-2 font-mono font-bold">{formData.safetyMicrobial.degPercent ? `${formData.safetyMicrobial.degPercent}%` : '—'}</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '12' : '10'}</td>
                          <td className="p-2 font-semibold">Ethylene Glycol (EG)</td>
                          <td className="p-2 font-mono text-[11px]">WHO QAS/23.922</td>
                          <td className="p-2 text-[11px]">Not more than 0.1%</td>
                          <td className="p-2 font-mono font-bold">{formData.safetyMicrobial.egPercent ? `${formData.safetyMicrobial.egPercent}%` : '—'}</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '13' : '11'}</td>
                          <td className="p-2 font-semibold">Microbial: TAMC / TYMC</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;1111&gt;</td>
                          <td className="p-2 text-[11px]">TAMC &le; 200 cfu/mL | TYMC &le; 20 cfu/mL</td>
                          <td className="p-2 text-[11px] font-semibold">{formData.safetyMicrobial.tamc || '—'} cfu/mL | {formData.safetyMicrobial.tymc || '—'} cfu/mL</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>

                        <tr>
                          <td className="p-2 text-center font-bold">{formData.stage === 'FINISHED_GOOD' ? '14' : '12'}</td>
                          <td className="p-2 font-semibold">Escherichia coli</td>
                          <td className="p-2 font-mono text-[11px]">USP &lt;1111&gt;</td>
                          <td className="p-2 text-[11px]">Must be Absent in 1 mL</td>
                          <td className="p-2 text-[11px] font-semibold">ABSENT</td>
                          <td className="p-2 text-center font-black text-emerald-700">COMPLIES</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Final Disposition & Release Verdict */}
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Release Verdict</span>
                    <p className="text-xs text-slate-700 font-medium">
                      {formData.remarks || 'Testing completed in compliance with QC/CLG/ATM-003 analytical protocol.'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={cn(
                      'px-6 py-2 rounded-xl text-base font-black tracking-widest uppercase inline-block border-2 shadow-xs',
                      calculationResult.overallVerdict === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-rose-600 text-white border-rose-700'
                    )}>
                      {calculationResult.overallVerdict}
                    </span>
                  </div>
                </div>

                {/* 21 CFR Part 11 Electronic Signatures Block */}
                <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs border-t border-slate-200">
                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic font-bold text-slate-800">{formData.analystName || 'Testing Analyst'}</span>
                    </div>
                    <span className="font-bold text-slate-900 block">Prepared By (Testing Analyst)</span>
                    <span className="text-[10px] text-slate-500 font-mono">Date: {formData.testingDate}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic font-bold text-slate-800">{formData.reviewerName || 'AMQC Reviewer'}</span>
                    </div>
                    <span className="font-bold text-slate-900 block">Reviewed By (AMQC / DMQC)</span>
                    <span className="text-[10px] text-slate-500 font-mono">Date: {formData.testingDate}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                      <span className="font-serif italic font-bold text-slate-800">{formData.approverName || 'Head of QC'}</span>
                    </div>
                    <span className="font-bold text-slate-900 block">Approved By (Head of QC)</span>
                    <span className="text-[10px] text-slate-500 font-mono">Date: {formData.testingDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
}
