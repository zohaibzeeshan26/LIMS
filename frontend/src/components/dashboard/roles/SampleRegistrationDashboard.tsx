'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { useAuth } from '@/context/AuthContext';
import {
  FlaskConical,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  QrCode,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Tag,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { formatDateTime, getSampleIsoDate, matchesDateRangeFilter } from '@/lib/date';
import { MonthYearSearchPicker } from '@/components/dashboard/MonthYearSearchPicker';
import { cn } from '@/lib/utils';
import { Sample } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';

export function SampleRegistrationDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [labFilter, setLabFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AWAITING' | 'ASSIGNED'>('ALL');
  const [effectiveDateFilter, setEffectiveDateFilter] = useState<string>('ALL');
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // Fetch samples registered in the facility
  const {
    data: samplesData,
    refetch: refetchSamples,
    isLoading,
  } = useQuery({
    queryKey: ['registration-analyst-samples'],
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  const samples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Sample counts mapped by YYYY-MM
  const monthCountsRecord = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const s of samples) {
      const sampleDate = s.samplingDate || s.createdAt || (s as any).sampledAt;
      const iso = getSampleIsoDate(sampleDate);
      if (iso) {
        const ym = iso.slice(0, 7);
        rec[ym] = (rec[ym] || 0) + 1;
      }
    }
    return rec;
  }, [samples]);

  // Month-wise options with sample registration counts
  const monthOptions = useMemo(() => {
    const monthCounts = new Map<string, number>();
    for (const s of samples) {
      const sampleDate = s.samplingDate || s.createdAt || (s as any).sampledAt;
      const iso = getSampleIsoDate(sampleDate);
      if (iso) {
        const ym = iso.slice(0, 7);
        monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
      }
    }

    const monthsSet = new Set<string>();
    const now = new Date();
    // Recent 6 calendar months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${yyyy}-${mm}`);
    }
    // Any months with registered samples
    monthCounts.forEach((_, ym) => {
      if (/^\d{4}-\d{2}$/.test(ym)) {
        monthsSet.add(ym);
      }
    });

    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((monthKey) => {
        let label = monthKey;
        try {
          const [year, month] = monthKey.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        } catch {}
        const count = monthCounts.get(monthKey) || 0;
        return { monthKey, label, count };
      });
  }, [samples]);

  // Active filter label
  const activeFilterLabel = useMemo(() => {
    if (!effectiveDateFilter || effectiveDateFilter === 'ALL') return 'All Months';
    if (/^\d{4}-\d{2}$/.test(effectiveDateFilter)) {
      try {
        const [year, month] = effectiveDateFilter.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        });
      } catch {
        return effectiveDateFilter;
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(effectiveDateFilter)) {
      try {
        const [y, m, d] = effectiveDateFilter.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return effectiveDateFilter;
      }
    }
    return effectiveDateFilter;
  }, [effectiveDateFilter]);

  // Samples filtered by month/date
  const dateFilteredSamples = useMemo(() => {
    if (effectiveDateFilter === 'ALL') return samples;
    return samples.filter((s) => {
      const sampleDate = s.samplingDate || s.createdAt || (s as any).sampledAt;
      return matchesDateRangeFilter(sampleDate, effectiveDateFilter);
    });
  }, [samples, effectiveDateFilter]);

  // Filter samples registered by this analyst (or all registered samples if user is intake technician)
  const registeredSamples = useMemo(() => {
    return dateFilteredSamples.filter((s: any) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (s.sampleCode || '').toLowerCase().includes(term) ||
        (s.nomenclature || s.materialName || '').toLowerCase().includes(term) ||
        (s.accessionNo || '').toLowerCase().includes(term) ||
        (s.batchNo || '').toLowerCase().includes(term);

      const matchLab =
        labFilter === 'ALL' ||
        (s.laboratoryType || s.laboratory || '').toUpperCase().includes(labFilter);

      const matchPriority = priorityFilter === 'ALL' || s.priority === priorityFilter;

      const matchStatus = (() => {
        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'AWAITING') {
          return (
            s.status === 'RECEIVED' ||
            s.status === 'LOGGED' ||
            s.status === 'PENDING_SUPERVISOR_ASSIGNMENT'
          );
        }
        if (statusFilter === 'ASSIGNED') {
          return (
            s.status !== 'RECEIVED' &&
            s.status !== 'LOGGED' &&
            s.status !== 'PENDING_SUPERVISOR_ASSIGNMENT'
          );
        }
        return true;
      })();

      return matchSearch && matchLab && matchPriority && matchStatus;
    });
  }, [dateFilteredSamples, searchTerm, labFilter, priorityFilter, statusFilter]);

  // Intake Metrics based on selected month
  const metrics = useMemo(() => {
    const total = dateFilteredSamples.length;
    const awaitingAssignment = dateFilteredSamples.filter(
      (s) =>
        s.status === 'RECEIVED' ||
        s.status === 'LOGGED' ||
        s.status === 'PENDING_SUPERVISOR_ASSIGNMENT'
    ).length;
    const assignedForward = total - awaitingAssignment;

    return { total, awaitingAssignment, assignedForward };
  }, [dateFilteredSamples]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Professional Executive Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 shadow-2xs shrink-0">
              <FlaskConical className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Sample Registration &amp; Intake
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Sample Intake Metrics (3 Primary Operational Counters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Registered Samples (Registration Role Accessioned) */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs space-y-1.5 group relative',
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/30 shadow-md -translate-y-0.5'
              : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-600'}>
              Total Samples Registered
            </span>
            <Layers className={cn('w-4 h-4', statusFilter === 'ALL' ? 'text-teal-400' : 'text-teal-600')} />
          </div>
          <div className={cn('text-2xl sm:text-3xl font-black tracking-tight', statusFilter === 'ALL' ? 'text-white' : 'text-slate-900')}>
            {metrics.total}
          </div>
          <div className={cn('text-[11px] font-medium flex items-center justify-between', statusFilter === 'ALL' ? 'text-teal-300' : 'text-slate-400')}>
            <span>{statusFilter === 'ALL' ? '● Showing all samples' : 'Click to view all'}</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusFilter === 'ALL' ? 'bg-white/10 text-teal-200' : 'bg-slate-100 text-slate-600')}>
              Registration Role
            </span>
          </div>
        </button>

        {/* 2. Assigned Forward to Analysts (Combined Assigned, In Testing, Completed) */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'ASSIGNED' ? 'ALL' : 'ASSIGNED')}
          className={cn(
            'p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs space-y-1.5 group relative',
            statusFilter === 'ASSIGNED'
              ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-600/30 shadow-md -translate-y-0.5'
              : 'bg-white hover:bg-blue-50/50 border-slate-200/90 hover:border-blue-300'
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={statusFilter === 'ASSIGNED' ? 'text-blue-100' : 'text-blue-700'}>
              Assigned Forward to Analysts
            </span>
            <ShieldCheck className={cn('w-4 h-4', statusFilter === 'ASSIGNED' ? 'text-white' : 'text-blue-600')} />
          </div>
          <div className={cn('text-2xl sm:text-3xl font-black tracking-tight', statusFilter === 'ASSIGNED' ? 'text-white' : 'text-blue-700')}>
            {metrics.assignedForward}
          </div>
          <div className={cn('text-[11px] font-medium flex items-center justify-between', statusFilter === 'ASSIGNED' ? 'text-blue-100' : 'text-slate-500')}>
            <span>{statusFilter === 'ASSIGNED' ? '● Filter active' : 'Click to view assigned'}</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusFilter === 'ASSIGNED' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700')}>
              Allocated Forward
            </span>
          </div>
        </button>

        {/* 3. Not Assigned Yet (Unassigned Queue / Awaiting Allocation) */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'AWAITING' ? 'ALL' : 'AWAITING')}
          className={cn(
            'p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs space-y-1.5 group relative',
            statusFilter === 'AWAITING'
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-500/30 shadow-md -translate-y-0.5'
              : 'bg-white hover:bg-amber-50/50 border-slate-200/90 hover:border-amber-300'
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={statusFilter === 'AWAITING' ? 'text-amber-100' : 'text-amber-800'}>
              Not Assigned Yet (Unassigned Queue)
            </span>
            <Clock className={cn('w-4 h-4', statusFilter === 'AWAITING' ? 'text-white' : 'text-amber-600')} />
          </div>
          <div className={cn('text-2xl sm:text-3xl font-black tracking-tight', statusFilter === 'AWAITING' ? 'text-white' : 'text-amber-700')}>
            {metrics.awaitingAssignment}
          </div>
          <div className={cn('text-[11px] font-medium flex items-center justify-between', statusFilter === 'AWAITING' ? 'text-amber-100' : 'text-slate-500')}>
            <span>{statusFilter === 'AWAITING' ? '● Filter active' : 'Click to view unassigned'}</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusFilter === 'AWAITING' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700')}>
              Awaiting Supervisor
            </span>
          </div>
        </button>
      </div>

      {/* 3. Registration History & Specimen Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Month-Wise Filter Bar for Registration Samples */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-3 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* All Months button */}
            <button
              type="button"
              onClick={() => setEffectiveDateFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                effectiveDateFilter === 'ALL'
                  ? 'bg-teal-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              )}
            >
              <span>All Months</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono',
                  effectiveDateFilter === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-slate-700 shadow-2xs'
                )}
              >
                {samples.length}
              </span>
            </button>

            {/* Individual Months buttons */}
            {monthOptions.map(({ monthKey, label, count }) => {
              const isSelected = effectiveDateFilter === monthKey;
              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => setEffectiveDateFilter(monthKey)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                    isSelected
                      ? 'bg-teal-700 text-white shadow-xs font-bold'
                      : count > 0
                      ? 'text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100'
                      : 'text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0
                        ? 'bg-white text-teal-800 shadow-2xs'
                        : 'bg-slate-200/70 text-slate-600'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Month & Year Search Picker */}
            <div className="flex items-center pl-2 border-l border-slate-200 ml-1">
              <MonthYearSearchPicker
                value={effectiveDateFilter}
                onChange={(val) => setEffectiveDateFilter(val)}
                docCounts={monthCountsRecord}
                placeholder="Search Month & Year..."
              />
            </div>
          </div>

          {effectiveDateFilter !== 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200 flex items-center gap-1">
                Active Month: <strong>{activeFilterLabel}</strong>
                <span className="font-mono text-slate-600">({dateFilteredSamples.length} samples)</span>
              </span>
              <button
                type="button"
                onClick={() => setEffectiveDateFilter('ALL')}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
              >
                Reset to All Months
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>Sample Registration History &amp; Specimen Logs ({registeredSamples.length})</span>
            </h2>
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs animate-in fade-in">
                <span>
                  {statusFilter === 'AWAITING' && 'Filtered: Not Assigned Yet'}
                  {statusFilter === 'ASSIGNED' && 'Filtered: Assigned Forward to Analysts'}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="hover:text-red-600 transition ml-0.5 cursor-pointer"
                  title="Clear filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {statusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All ({samples.length})</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by sample code, batch, material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Laboratories (3 Facilities)</option>
              <option value="GEN">General Lab</option>
              <option value="PEN">Penicillin Lab</option>
              <option value="CEPH">Cephalosporin Lab</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent (48 Hours)</option>
              <option value="ROUTINE">Routine Standard</option>
            </select>
          </div>
        </div>

        {/* Samples Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-3 px-3.5">Sample Code / Accession</th>
                <th className="py-3 px-3.5">Material / Product Name</th>
                <th className="py-3 px-3.5">Batch / Lot</th>
                <th className="py-3 px-3.5">Target Lab</th>
                <th className="py-3 px-3.5">Priority</th>
                <th className="py-3 px-3.5">Registration Time</th>
                <th className="py-3 px-3.5">Manager Status</th>
                <th className="py-3 px-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registeredSamples.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-semibold text-slate-600">
                        {effectiveDateFilter !== 'ALL'
                          ? `Is month (${activeFilterLabel}) mein koi sample register nahi hua.`
                          : 'No samples matching your search criteria.'}
                      </p>
                      {effectiveDateFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setEffectiveDateFilter('ALL')}
                          className="mt-1 px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition cursor-pointer"
                        >
                          Show All Months ({samples.length})
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                registeredSamples.map((s: any) => {
                  const isManagerPending =
                    s.status === 'RECEIVED' ||
                    s.status === 'LOGGED' ||
                    s.status === 'PENDING_SUPERVISOR_ASSIGNMENT';

                  return (
                    <tr key={s.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-teal-950 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{s.sampleCode}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                        <div className="text-[10px] text-slate-400">
                          {s.stageType || s.sampleType || 'QC Specimen'}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-700">
                        {s.batchNo || s.lotNumber || '—'}
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {s.laboratoryType || s.laboratory || 'GENERAL'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        {s.priority === 'URGENT' || s.priority === 'STAT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            URGENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            ROUTINE
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                        {formatDateTime(s.createdAt || s.samplingDate, 'dd/MM/yyyy HH:mm')}
                      </td>

                      <td className="py-3 px-3.5">
                        {isManagerPending ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>In Deputy Manager Allocation Queue</span>
                          </span>
                        ) : s.status === 'ASSIGNED_FOR_TESTING' || s.status === 'ASSIGNED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>Assigned to Analyst</span>
                          </span>
                        ) : (
                          <StatusBadge status={s.status} />
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSample(s)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Chit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. New Sample Modal */}
      {isRegisterModalOpen && (
        <NewSampleModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSampleCreated={() => {
            setIsRegisterModalOpen(false);
            refetchSamples();
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            queryClient.invalidateQueries({ queryKey: ['manager-dashboard-samples'] });
          }}
        />
      )}

      {/* 5. Sample Detail Modal */}
      {selectedSample && (
        <Modal
          isOpen={!!selectedSample}
          onClose={() => setSelectedSample(null)}
          title={`Specimen Accession Record: ${selectedSample.sampleCode}`}
          subtitle={`Accession No: ${selectedSample.accessionNo} • Status: ${selectedSample.status}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
              <span className="font-bold text-teal-900 text-sm">
                {selectedSample.nomenclature || (selectedSample as any).materialName}
              </span>
              <p className="text-[11px] text-teal-700">
                Batch: {(selectedSample as any).batchNo || '—'} &bull; Lab: {selectedSample.laboratoryType || (selectedSample as any).laboratory}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Registration Timestamp</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatDateTime(selectedSample.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Current Routing</span>
                <span className="font-bold text-blue-700">
                  {selectedSample.status === 'LOGGED' || selectedSample.status === 'RECEIVED'
                    ? 'Transferred to Manager'
                    : selectedSample.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setSelectedSample(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

