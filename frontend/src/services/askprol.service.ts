import { api } from '@/lib/api';

export interface AskprolCalculationPayload {
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
  
  // Qualitative tests
  identificationHplc?: 'COMPLIES' | 'DOES_NOT_COMPLY';
  identificationFtir?: 'COMPLIES' | 'DOES_NOT_COMPLY';
  suspendedMatters?: 'COMPLIES' | 'DOES_NOT_COMPLY';

  // Density calculation inputs
  density: {
    w1: number;
    w2: number;
    pycnometerVolume: number;
  };

  // pH measurement inputs
  ph: {
    top?: number;
    mid?: number;
    bottom?: number;
    sample1?: number;
    sample2?: number;
  };

  // HPLC System suitability inputs
  systemSuitability: {
    replicateAreas: number[];
    tailingFactor: number;
    theoreticalPlates: number;
  };

  // HPLC Assay calculation inputs (Matches Askprol Suspension.xlsx)
  assay: {
    standardWeight: number;
    standardPotency: number;
    labelClaim?: number;

    // Bulk stage granular
    bulkWeights?: {
      top: number;
      mid: number;
      bottom: number;
    };
    bulkAreas?: {
      top: number[];
      mid: number[];
      bottom: number[];
    };

    // Finished Good stage granular
    fgWeights?: {
      sample1: number;
      sample2: number;
    };
    fgAreas?: {
      sample1: number[];
      sample2: number[];
    };

    // Fallback single values
    sampleArea?: number;
    sampleWeight?: number;
  };

  // Deliverable Volume (Finished Good - USP <698>)
  deliverableVolume?: {
    nominalVolume: number;
    volumes: number[];
  };

  // Uniformity of Dosage Units (Finished Good - USP <905>)
  uniformityDosage?: {
    units?: Array<{
      unitNo: number;
      weight: number;
      peakArea: number;
    }>;
    dosageUnits?: number[];
  };

  // 4-Aminophenol Impurity
  impurity: {
    standardWeight: number;
    sampleWeight: number;
    standardArea: number;
    sampleArea: number;
    resolution?: number;
    tailingFactor?: number;
    signalToNoise?: number;
    rsdPercent?: number;
    retentionTime?: number;
  };

  // Safety & Microbial
  safetyMicrobial: {
    degPercent: number;
    egPercent: number;
    tamc: number;
    tymc: number;
    eColi: 'ABSENT' | 'PRESENT';
  };

  analystName?: string;
  reviewerName?: string;
  approverName?: string;
  remarks?: string;
}

export interface AskprolCalculationResult {
  stage: 'FINAL_BULK' | 'FINISHED_GOOD';
  overallVerdict: 'APPROVED' | 'REJECTED';
  calculations: {
    density: {
      w1: number;
      w2: number;
      w3: number;
      pycnometerVolume: number;
      calculatedDensity: number;
      specification: string;
      complies: boolean;
    };
    ph: {
      calculatedPh: number;
      details?: any;
      specification: string;
      complies: boolean;
    };
    systemSuitability: {
      replicateAreas: number[];
      meanArea: number;
      rsdPercent: number;
      rsdComplies: boolean;
      tailingFactor: number;
      tailingComplies: boolean;
      theoreticalPlates: number;
      platesComplies: boolean;
      systemSuitabilityPassed: boolean;
    };
    assay: {
      calculatedAssay: number;
      breakdown?: any;
      specification: string;
      complies: boolean;
    };
    deliverableVolume?: {
      averageVolume: number | null;
      minVolume?: number | null;
      maxVolume?: number | null;
      specification: string;
      complies: boolean;
    } | null;
    uniformityDosage?: {
      avValue: number | null;
      details?: any;
      specification: string;
      complies: boolean;
    } | null;
    impurity: {
      calculatedImpurity: number;
      specification: string;
      complies: boolean;
    };
    safetyMicrobial: {
      deg: number;
      degComplies: boolean;
      eg: number;
      egComplies: boolean;
      tamc: number;
      tamcComplies: boolean;
      tymc: number;
      tymcComplies: boolean;
      eColi: 'ABSENT' | 'PRESENT';
      eColiComplies: boolean;
      safetyComplies: boolean;
    };
    qualitative: {
      identificationHplc: boolean;
      identificationFtir: boolean;
      suspendedMatters: boolean;
    };
  };
}

export const askprolService = {
  calculate: (data: AskprolCalculationPayload) =>
    api.post<AskprolCalculationResult>('/askprol/calculate', data),

  createReport: (data: AskprolCalculationPayload) =>
    api.post<{ report: any; details: AskprolCalculationResult }>('/askprol/reports', data),

  getAllReports: (query?: { stage?: string; batchNumber?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.stage) params.append('stage', query.stage);
    if (query?.batchNumber) params.append('batchNumber', query.batchNumber);
    if (query?.limit) params.append('limit', String(query.limit));
    return api.get<any[]>(`/askprol/reports?${params.toString()}`);
  },

  getReportById: (id: string) =>
    api.get<any>(`/askprol/reports/${id}`),

  deleteReport: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/askprol/reports/${id}`),
};
