import { api } from '@/lib/api';
import { Sample, PaginatedResponse } from '@/types/lims';

export interface SamplingFilters {
  status?: string;
  sampleType?: string;
  stage?: string;
  category?: string;
  priority?: string;
  search?: string;
  laboratory?: string;
  lab?: string;
  sampleId?: string;
  nomenclature?: string;
  batchNumber?: string;
  mfgDate?: string;
  expDate?: string;
  startDate?: string;
  endDate?: string;
  section?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const samplingService = {
  getAll: (query?: SamplingFilters) => {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.sampleType) params.append('sampleType', query.sampleType);
    if (query?.stage) params.append('stage', query.stage);
    if (query?.category) params.append('category', query.category);
    if (query?.priority) params.append('priority', query.priority);
    if (query?.search) params.append('search', query.search);
    if (query?.laboratory) params.append('laboratory', query.laboratory);
    if (query?.lab) params.append('lab', query.lab);
    if (query?.sampleId) params.append('sampleId', query.sampleId);
    if (query?.nomenclature) params.append('nomenclature', query.nomenclature);
    if (query?.batchNumber) params.append('batchNumber', query.batchNumber);
    if (query?.mfgDate) params.append('mfgDate', query.mfgDate);
    if (query?.expDate) params.append('expDate', query.expDate);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.section) params.append('section', query.section);
    if (query?.page !== undefined) params.append('page', query.page.toString());
    if (query?.limit !== undefined) params.append('limit', query.limit.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);
    return api.get<PaginatedResponse<Sample>>(`/sampling?${params.toString()}`);
  },

  getById: (id: string) => {
    const trimmed = (id || '').trim();
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      return api.get<Sample>(`/sampling/by-code?code=${encodeURIComponent(trimmed)}`);
    }
    return api.get<Sample>(`/sampling/${encodeURIComponent(trimmed)}`);
  },

  create: (data: any) => api.post<Sample>('/sampling', data),

  update: (id: string, data: any) => api.patch<Sample>(`/sampling/${id}`, data),

  getMetrics: (laboratory?: string) => {
    const params = new URLSearchParams();
    if (laboratory) params.append('laboratory', laboratory);
    return api.get<any>(`/sampling/metrics?${params.toString()}`);
  },

  checkSampleId: (sampleCode: string) =>
    api.get<{ sampleCode: string; isAvailable: boolean; existingSample: any }>(
      `/sampling/check-sample-id/${encodeURIComponent(sampleCode)}`
    ),

  getNextSampleId: (query: { laboratory?: string; section?: string; stageType?: string }) => {
    const params = new URLSearchParams();
    if (query.laboratory) params.append('laboratory', query.laboratory);
    if (query.section) params.append('section', query.section);
    if (query.stageType) params.append('stageType', query.stageType);
    return api.get<{ sampleCode: string; sampleId: string; accessionNo?: string; laboratory: string; section: string }>(
      `/sampling/next-sample-id?${params.toString()}`
    );
  },

  submitToWorkflow: (
    sampleId: string,
    data: {
      destinationLab: 'MICROBIOLOGY' | 'CHEMICAL' | 'PHYSICAL';
      status?: string;
      remarks?: string;
    }
  ) => api.post<any>(`/sampling/${sampleId}/submit`, data),

  getSampleSubmissions: (sampleId: string) =>
    api.get<any[]>(`/sampling/${sampleId}/submissions`),

  getAllSubmissions: (query?: any) => {
    const params = new URLSearchParams();
    if (query?.destinationLab) params.append('destinationLab', query.destinationLab);
    if (query?.status) params.append('status', query.status);
    return api.get<any[]>(`/sampling/submissions/all?${params.toString()}`);
  },

  updateSubmissionStatus: (
    submissionId: string,
    data: { status: string; reasonForChange?: string; remarks?: string }
  ) => api.patch<any>(`/sampling/submissions/${submissionId}/status`, data),

};
