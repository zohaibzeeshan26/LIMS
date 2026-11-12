'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { useAuth } from '@/context/AuthContext';
import { useAllAnalysts } from '@/lib/analysts';
import {
  Activity,
  Layers,
  Clock,
  CheckCircle2,
  Users,
  Search,
  ExternalLink,
  Play,
  UserCheck,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function InchargeDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { analysts } = useAllAnalysts();

  // Load samples
  const { data: samplesData } = useQuery({
    queryKey: ['incharge-dashboard-samples'],
    queryFn: () => samplingService.getAll({ limit: 50, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  const samples = React.useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Metrics
  const { data: metrics } = useQuery({
    queryKey: ['incharge-metrics'],
    queryFn: () => samplingService.getMetrics(),
    refetchInterval: 5000,
  });

  const filteredSamples = samples.filter((s: any) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.sampleCode || '').toLowerCase().includes(term) ||
      (s.nomenclature || s.materialName || '').toLowerCase().includes(term) ||
      (s.accessionNo || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-navy-950 text-white p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs font-bold">
                Shift Incharge Floor Supervision
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Supervisor: {user?.fullName || 'Shift Incharge'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Shift Operations &amp; Analyst Team Execution
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Supervise shift floor testing, track assigned worksheets, ensure timely testing turnaround, and monitor shift handover.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/tasks"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Shift Task Board</span>
            </Link>
            <Link
              href="/dashboard?tab=lab-operations"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all inline-flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              <span>Lab Operations</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Shift Samples</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{samples.length}</div>
          <p className="text-[11px] text-slate-400">Total samples under shift</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Testing</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{metrics?.inTesting || 0}</div>
          <p className="text-[11px] text-slate-400">Analyst worksheets running</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Shift Analysts</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{analysts.length}</div>
          <p className="text-[11px] text-slate-400">Team personnel on duty</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed Shift Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{metrics?.completed || 0}</div>
          <p className="text-[11px] text-slate-400">Finished analytical tests</p>
        </div>
      </div>

      {/* Main Shift Monitoring Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Shift Work Progress &amp; Analyst Tasks</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Live status of analytical sample tests assigned to your shift team
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search shift samples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-2.5 px-3">Accession / Code</th>
                <th className="py-2.5 px-3">Material Name</th>
                <th className="py-2.5 px-3">Laboratory</th>
                <th className="py-2.5 px-3">Assigned Analyst</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.slice(0, 15).map((s: any) => (
                <tr key={s.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-amber-950">{s.sampleCode}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800 max-w-[180px] truncate">
                    {s.nomenclature || s.materialName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {s.laboratoryType || s.laboratory || 'GENERAL'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {s.assignedTo?.fullName ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-800">
                        <span>👤 {s.assignedTo.fullName}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {s.priority === 'URGENT' || s.priority === 'STAT' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        {s.priority}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">Routine</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={s.status || 'REGISTERED'} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/testing?sampleCode=${encodeURIComponent(s.sampleCode)}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 text-amber-700" />
                      <span>Inspect</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

