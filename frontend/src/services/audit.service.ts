import { api } from '@/lib/api';
import { AuditTrail } from '@/types/lims';

export const auditService = {
  getAll: (query?: { entityName?: string; action?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (query?.entityName) params.append('entityName', query.entityName);
    if (query?.action) params.append('action', query.action);
    if (query?.limit) params.append('limit', String(query.limit));
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
