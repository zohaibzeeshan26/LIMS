'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/date';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Code2,
  User,
  Clock,
  Terminal,
  ArrowLeft,
  FileText,
  Lock,
} from 'lucide-react';

export default function AuditPage() {
  const [entityFilter, setEntityFilter] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', { entityName: entityFilter, action: actionSearch }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityFilter) params.append('entityName', entityFilter);
      if (actionSearch) params.append('action', actionSearch);
      params.append('limit', '100');
      return api.get<any[]>(`/audit?${params.toString()}`);
    },
  });

  const auditLogsList: any[] = React.useMemo(() => {
    if (!auditLogs) return [];
    if (Array.isArray(auditLogs)) return auditLogs;
    if (Array.isArray((auditLogs as any).data)) return (auditLogs as any).data;
    return [];
  }, [auditLogs]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Return to QC Executive Dashboard"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Dashboard</span>
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              21 CFR Part 11 Certified
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-blue-600" />
            <span>21 CFR Part 11 Electronic Audit Vault</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-evident, cryptographically sequenced record of all sample intakes, analytical modifications, QA sign-offs, and logins.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs font-bold shadow-2xs shrink-0 self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Audit Log Immutability: Active</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="Filter by action (e.g. RESULT, BATCH, SAMPLE, CALIBRATION)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Audit Entities</option>
              <option value="Sample">Sample Accession & Custody</option>
              <option value="SampleTest">Sample Analytical Tests</option>
              <option value="Batch">Production Batches & Lots</option>
              <option value="CertificateOfAnalysis">Certificate of Analysis (CoA)</option>
              <option value="Instrument">Instrument Metrology</option>
              <option value="OosIncident">OOS Incident Deviation</option>
              <option value="User">User Authentication & Identity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Local Timestamp</th>
                <th className="py-3.5 px-4">Authorized User & Role</th>
                <th className="py-3.5 px-4">Action Performed</th>
                <th className="py-3.5 px-4">Entity Type & ID</th>
                <th className="py-3.5 px-4">Reason for Change / Rationale</th>
                <th className="py-3.5 px-4 text-right">Payload Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : auditLogsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No audit records found matching criteria.</td>
                </tr>
              ) : (
                auditLogsList.map((log) => {
                  const isExpanded = expandedId === log.id;
                  let parsedDiff = null;
                  if (log.diffPayload) {
                    try {
                      parsedDiff = JSON.parse(log.diffPayload);
                    } catch (e) {
                      parsedDiff = log.diffPayload;
                    }
                  }

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isExpanded ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatDateTime(log.timestamp, 'dd MMM yyyy, HH:mm:ss')}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{log.performedByName}</div>
                          <div className="text-[10px] text-slate-400">
                            {log.role} {log.performedBy?.employeeId ? `• ${log.performedBy.employeeId}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] font-semibold text-primary-900 bg-primary-50 px-2 py-0.5 rounded border border-primary-200/50">
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-semibold text-slate-700">{log.entityName}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-28">
                            {log.entityId}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-sm text-slate-700 leading-relaxed">
                          {log.reasonForChange || 'Standard workflow execution'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {parsedDiff ? (
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors"
                            >
                              <Code2 className="h-3 w-3" />
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px]">No diff</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON Diff Tray */}
                      {isExpanded && parsedDiff && (
                        <tr className="bg-slate-900 text-slate-100">
                          <td colSpan={6} className="p-4 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-400 mb-2">
                              <Terminal className="h-3.5 w-3.5" />
                              <span>Electronic Signature & State Delta:</span>
                            </div>
                            <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-emerald-400 whitespace-pre-wrap leading-relaxed border border-slate-800">
                              {JSON.stringify(parsedDiff, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
