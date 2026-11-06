import { api } from '@/lib/api';
import { Instrument } from '@/types/lims';

export interface LabOperationsSummaryResponse {
  filter: {
    type: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  overall: {
    totalSamples: number;
    receivedToday: number;
    assigned: number;
    underTesting: number;
    completed: number;
    pending: number;
    passed: number;
    failed: number;
    passRate: string;
  };
  labs: Array<{
    id: 'general' | 'cephalosporin' | 'penicillin';
    name: string;
    code: string;
    totalSamples: number;
    receivedToday: number;
    assigned: number;
    underTesting: number;
    completed: number;
    pending: number;
    passed: number;
    failed: number;
    passRate: string;
  }>;
  workloadComparison: Array<{
    date: string;
    label: string;
    general: number;
    cephalosporin: number;
    penicillin: number;
    total: number;
  }>;
  performanceComparison: Array<{
    labName: string;
    code: string;
    received: number;
    completed: number;
    passed: number;
    failed: number;
    pending: number;
    underTesting: number;
    passRate: number;
  }>;
}

export interface IndividualLabOperationsResponse {
  laboratory: {
    id: string;
    key: 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN';
    name: string;
    code: string;
  };
  filter: {
    type: string;
    startDate: string;
    endDate: string;
    label: string;
  };
  metrics: {
    totalSamples: number;
    receivedToday: number;
    assigned: number;
    underTesting: number;
    completed: number;
    pending: number;
    passed: number;
    failed: number;
    passRate: string;
    unassignedCount: number;
  };
  analystsWorkload: Array<{
    analystId: string;
    analystName: string;
    username: string;
    designation: string;
    department: string;
    assigned: number;
    inProgress: number;
    completed: number;
    pending: number;
    passed: number;
    failed: number;
  }>;
  dailyTrend: Array<{
    date: string;
    label: string;
    received: number;
    completed: number;
    passed: number;
  }>;
  testingProgress: {
    received: number;
    assigned: number;
    inAnalysis: number;
    reviewPending: number;
    approved: number;
    rejected: number;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    performedByName: string;
    role: string;
    timestamp: string;
    reasonForChange: string | null;
    entityId: string;
    entityName: string;
  }>;
  samples: {
    data: Array<{
      id: string;
      sampleId: string;
      sampleCode: string;
      recordNumber?: string;
      nomenclature: string;
      batchLotNumber: string;
      priority: string;
      stageType: string;
      status: string;
      assignedToId: string | null;
      assignedToName: string;
      testProgress: string;
      result: string;
      testsCount: number;
      tests: any[];
      hasOos: boolean;
      hasCoa: boolean;
      sampledAt: string;
      createdAt: string;
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export const laboratoriesService = {
  getInstruments: () => api.get<Instrument[]>('/laboratories/instruments'),

  getInstrumentById: (id: string) => api.get<Instrument>(`/laboratories/instruments/${id}`),

  createInstrument: (data: any) => api.post<Instrument>('/laboratories/instruments', data),

  logCalibration: (id: string, data: any) =>
    api.post<any>(`/laboratories/instruments/${id}/calibration`, data),

  getOperationsSummary: (params?: { filter?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.filter) q.set('filter', params.filter);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return api.get<LabOperationsSummaryResponse>(`/laboratories/operations/summary${qs}`);
  },

  getIndividualOperations: (
    labId: string,
    params?: { filter?: string; startDate?: string; endDate?: string; page?: number; limit?: number; status?: string; search?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.filter) q.set('filter', params.filter);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', params.page.toString());
    if (params?.limit) q.set('limit', params.limit.toString());
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return api.get<IndividualLabOperationsResponse>(`/laboratories/operations/${labId}${qs}`);
  },
};
