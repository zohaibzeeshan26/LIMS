import { api } from '@/lib/api';
import { AuditTrail } from '@/types/lims';

export interface AuditQuery {
  entityName?: string;
  action?: string;
  limit?: number;
  role?: string;
  userId?: string;
  performedByName?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const auditService = {
  getAll: (query?: AuditQuery) => {
    const params = new URLSearchParams();
    if (query?.entityName && query.entityName !== 'ALL') params.append('entityName', query.entityName);
    if (query?.action && query.action !== 'ALL') params.append('action', query.action);
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.role && query.role !== 'ALL') params.append('role', query.role);
    if (query?.userId && query.userId !== 'ALL') params.append('userId', query.userId);
    if (query?.performedByName) params.append('performedByName', query.performedByName);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.search) params.append('search', query.search);
    return api.get<AuditTrail[]>(`/audit?${params.toString()}`);
  },

  getByEntity: (entityName: string, entityId: string) =>
    api.get<AuditTrail[]>(`/audit/${entityName}/${entityId}`),

  logActivity: (data: {
    action: string;
    entityName?: string;
    entityId?: string;
    reasonForChange: string;
    diffPayload?: any;
    performedByName?: string;
    role?: string;
  }) => api.post<any>('/audit', data).catch((err) => console.warn('[LIMS Audit] logActivity failed:', err)),
};
