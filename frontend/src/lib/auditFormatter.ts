import { formatDateTime, formatRelativeTime } from './date';

export interface FormattedAuditItem {
  id: string;
  userName: string;
  userRole: string;
  roleBadge: { label: string; badgeClass: string; isNonAdmin: boolean };
  actionLabel: { label: string; colorClass: string };
  actionRaw: string;
  entityName: string;
  details: string;
  reason: string;
  timestamp: string;
  timeDisplay: string;
  dateDisplay: string;
  relativeTime: string;
  isNonAdmin: boolean;
}

export function formatAuditAction(action: string): { label: string; colorClass: string } {
  switch (action) {
    case 'CRITICAL_IMMEDIATE_SAMPLE':
      return { label: 'CRITICAL (24h SLA)', colorClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
    case 'URGENT_PRIORITY_SAMPLE':
      return { label: 'URGENT (1h-2d SLA)', colorClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    case 'SAMPLE_ACCESSIONED':
      return { label: 'Sample Intake', colorClass: 'bg-blue-50 text-blue-700 border-blue-200 font-bold' };
    case 'SAMPLE_UPDATED':
      return { label: 'Sample Modified', colorClass: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' };
    case 'SAMPLE_STATUS_CHANGED':
    case 'SUBMISSION_STATUS_UPDATED':
      return { label: 'Status Changed', colorClass: 'bg-purple-50 text-purple-700 border-purple-200 font-bold' };
    case 'SAMPLE_SUBMITTED_TO_WORKFLOW':
      return { label: 'Lab Dispatched', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' };
    case 'TASK_ASSIGNED':
      return { label: 'Task Assigned', colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-bold' };
    case 'TASK_STATUS_UPDATED':
      return { label: 'Task Updated', colorClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' };
    case 'TEST_RESULT_RECORDED':
      return { label: 'Result Logged', colorClass: 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold' };
    case 'WORKSHEET_COMPLETED':
      return { label: 'Worksheet Verified', colorClass: 'bg-teal-50 text-teal-800 border-teal-300 font-bold' };
    case 'USER_LOGIN':
      return { label: 'User Logged In', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' };
    case 'USER_LOGOUT':
      return { label: 'User Logged Out', colorClass: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold' };
    case 'USER_CREATED':
      return { label: 'User Provisioned', colorClass: 'bg-violet-50 text-violet-800 border-violet-300 font-bold' };
    case 'USER_ROLE_UPDATED':
      return { label: 'Role Changed', colorClass: 'bg-purple-50 text-purple-800 border-purple-300 font-bold' };
    case 'PASSWORD_RESET':
      return { label: 'Password Reset', colorClass: 'bg-rose-50 text-rose-800 border-rose-300 font-bold' };
    case 'USER_STATUS_TOGGLED':
      return { label: 'Account Status', colorClass: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' };
    case 'BATCH_CREATED':
      return { label: 'Batch Created', colorClass: 'bg-teal-50 text-teal-700 border-teal-200 font-bold' };
    case 'ASKPROL_COA_GENERATED':
    case 'ASKPROL_REPORT_SAVED':
      return { label: 'Askprol CoA Generated', colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
    default:
      return {
        label: action ? action.replace(/_/g, ' ') : 'Action Logged',
        colorClass: 'bg-slate-50 text-slate-700 border-slate-200',
      };
  }
}

export function formatAuditRole(role: string): { label: string; badgeClass: string; isNonAdmin: boolean } {
  const normalized = (role || '').toUpperCase();
  const isNonAdmin = normalized !== 'ADMIN' && normalized !== 'SUPER_ADMIN';
  switch (normalized) {
    case 'SUPER_ADMIN':
      return { label: 'Super Admin', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-bold', isNonAdmin: false };
    case 'ADMIN':
    case 'HOD':
      return { label: 'HOD', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold', isNonAdmin: false };
    case 'QA_MANAGER':
      return { label: 'QA Manager', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 font-bold', isNonAdmin: true };
    case 'MANAGER':
      return { label: 'QC Manager', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 font-bold', isNonAdmin: true };
    case 'DEPUTY_MANAGER':
      return { label: 'Deputy Manager', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold', isNonAdmin: true };
    case 'SHIFT_INCHARGE':
      return { label: 'Shift In-Charge', badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 font-bold', isNonAdmin: true };
    case 'TESTING_ANALYST':
      return { label: 'Testing Analyst', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold', isNonAdmin: true };
    case 'QC_ANALYST':
    case 'ANALYST':
      return { label: 'QC Analyst', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold', isNonAdmin: true };
    case 'LAB_TECHNICIAN':
      return { label: 'Lab Analyst', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold', isNonAdmin: true };
    case 'AUDITOR':
      return { label: 'Auditor', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold', isNonAdmin: true };
    default:
      return {
        label: role ? role.replace(/_/g, ' ') : 'Staff',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        isNonAdmin,
      };
  }
}

export function formatAuditDetails(log: {
  action?: string;
  entityName?: string;
  reasonForChange?: string | null;
  diffPayload?: string | null;
}): string {
  if (log.diffPayload) {
    try {
      const parsed = JSON.parse(log.diffPayload);
      if (parsed.details) {
        return parsed.details;
      }
      if (parsed.previous && parsed.updated) {
        const changes: string[] = [];
        for (const key of Object.keys(parsed.updated)) {
          const prev = parsed.previous[key];
          const curr = parsed.updated[key];
          if (prev !== curr && curr !== undefined) {
            changes.push(`${key}: ${prev ?? '—'} → ${curr}`);
          }
        }
        const changeStr = changes.length > 0 ? changes.join(', ') : 'Updated record attributes';
        return log.reasonForChange ? `${changeStr} (${log.reasonForChange})` : changeStr;
      }
      if (parsed.sampleCode || parsed.accessionNo) {
        const code = parsed.sampleCode || parsed.accessionNo;
        const mat = parsed.materialName || parsed.nomenclature || '';
        const lot = parsed.lotNumber ? `[Batch: ${parsed.lotNumber}]` : '';
        const sla = parsed.sla ? `[${parsed.sla}]` : '';
        const qty = parsed.qty ? `(${parsed.qty})` : '';
        const base = [code, mat, lot, sla, qty].filter(Boolean).join(' ');
        return log.reasonForChange ? `${base} - ${log.reasonForChange}` : base;
      }
      if (parsed.previousStatus || parsed.newStatus) {
        const str = `${parsed.sampleCode || 'Sample'}: ${parsed.previousStatus || '—'} → ${parsed.newStatus}`;
        return log.reasonForChange ? `${str} (${log.reasonForChange})` : str;
      }
      if (parsed.destinationLab) {
        return `Routed to ${parsed.destinationLab} Lab${log.reasonForChange ? ` - ${log.reasonForChange}` : ''}`;
      }
    } catch {
      // not json, continue
    }
  }
  return log.reasonForChange || `${log.action || 'Action'} performed on ${log.entityName || 'System'}`;
}

export function parseAuditItem(log: any): FormattedAuditItem {
  const roleInfo = formatAuditRole(log.role || log.performedBy?.role || 'QC_ANALYST');
  const actionInfo = formatAuditAction(log.action || '');
  const details = formatAuditDetails(log);
  
  const timestamp = log.timestamp || new Date().toISOString();
  const timeDisplay = formatDateTime(timestamp, 'hh:mm a');
  const dateDisplay = formatDateTime(timestamp, 'dd MMM yyyy');
  const relativeTime = formatRelativeTime(timestamp);

  return {
    id: log.id,
    userName: log.performedByName || log.performedBy?.fullName || 'Staff User',
    userRole: log.role || 'QC_ANALYST',
    roleBadge: roleInfo,
    actionLabel: actionInfo,
    actionRaw: log.action || '',
    entityName: log.entityName || 'System',
    details,
    reason: log.reasonForChange || '',
    timestamp,
    timeDisplay,
    dateDisplay,
    relativeTime,
    isNonAdmin: roleInfo.isNonAdmin,
  };
}
