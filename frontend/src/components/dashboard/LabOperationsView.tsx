'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  laboratoriesService,
  LabOperationsSummaryResponse,
  IndividualLabOperationsResponse,
} from '@/services/laboratories.service';
import { formatDateTime } from '@/lib/date';
import {
  FlaskConical,
  ShieldAlert,
  Microscope,
  Calendar,
  Filter,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Beaker,
  Users,
  Search,
  Activity,
  BarChart3,
  TrendingUp,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock4,
} from 'lucide-react';

type DateFilterKey = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';
type LabKey = 'general' | 'cephalosporin' | 'penicillin';

interface LabOperationsViewProps {
  onBackToOverview?: () => void;
}

export function LabOperationsView({ onBackToOverview }: LabOperationsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Active Laboratory Tab: 'all' or 'general' | 'cephalosporin' | 'penicillin'
  const activeLabParam = (searchParams.get('lab')?.toLowerCase() || 'all') as 'all' | LabKey;
  const [activeLab, setActiveLab] = useState<'all' | LabKey>(
    ['general', 'cephalosporin', 'penicillin'].includes(activeLabParam) ? activeLabParam : 'all'
  );

  React.useEffect(() => {
    if (activeLabParam !== activeLab) {
      setActiveLab(activeLabParam);
    }
  }, [activeLabParam]);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterKey>(
    (searchParams.get('filter') as DateFilterKey) || 'today'
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  // Sample History filters (for individual lab dashboard)
  const [sampleSearch, setSampleSearch] = useState('');
  const [sampleStatusFilter, setSampleStatusFilter] = useState('ALL');
  const [samplePage, setSamplePage] = useState(1);

  // Switch lab handler with URL sync
  const handleSelectLab = (lab: 'all' | LabKey) => {
    setActiveLab(lab);
    setSamplePage(1);
    setSampleSearch('');
    setSampleStatusFilter('ALL');
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'lab-operations');
    if (lab === 'all') {
      params.delete('lab');
    } else {
      params.set('lab', lab);
    }
    router.replace(`/dashboard?${params.toString()}`);
  };

  // Date filter change handler
  const handleSelectDateFilter = (filter: DateFilterKey) => {
    setDateFilter(filter);
    if (filter !== 'custom') {
      setIsCustomPickerOpen(false);
    } else {
      setIsCustomPickerOpen(true);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'lab-operations');
    params.set('filter', filter);
    router.replace(`/dashboard?${params.toString()}`);
  };

  // 1. Fetch Main Summary across all 3 labs
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    isRefetching: isSummaryRefetching,
  } = useQuery({
    queryKey: ['lab-operations-summary', dateFilter, customStartDate, customEndDate],
    queryFn: () =>
      laboratoriesService.getOperationsSummary({
        filter: dateFilter,
        startDate: dateFilter === 'custom' ? customStartDate : undefined,
        endDate: dateFilter === 'custom' ? customEndDate : undefined,
      }),
    refetchInterval: 30000,
  });

  // 2. Fetch Individual Lab Data when an individual lab is selected
  const {
    data: individualData,
    isLoading: isIndividualLoading,
    refetch: refetchIndividual,
    isRefetching: isIndividualRefetching,
  } = useQuery({
    queryKey: [
      'lab-operations-individual',
      activeLab,
      dateFilter,
      customStartDate,
      customEndDate,
      samplePage,
      sampleStatusFilter,
      sampleSearch,
    ],
    queryFn: () =>
      laboratoriesService.getIndividualOperations(activeLab, {
        filter: dateFilter,
        startDate: dateFilter === 'custom' ? customStartDate : undefined,
        endDate: dateFilter === 'custom' ? customEndDate : undefined,
        page: samplePage,
        limit: 10,
        status: sampleStatusFilter !== 'ALL' ? sampleStatusFilter : undefined,
        search: sampleSearch.trim() || undefined,
      }),
    enabled: activeLab !== 'all',
    refetchInterval: 30000,
  });

  // Manual refresh all
  const handleRefresh = () => {
    if (activeLab === 'all') {
      refetchSummary();
    } else {
      refetchIndividual();
    }
  };

  // Filter out non-analysts (Admins, Super Admins, HOD, Managers) from Analyst-Wise Workload
  const genuineAnalystsWorkload = useMemo(() => {
    if (!individualData?.analystsWorkload) return [];
    return individualData.analystsWorkload.filter((a) => {
      const role = (a.designation || '').toUpperCase();
      const name = (a.analystName || '').toLowerCase();
      const username = (a.username || '').toLowerCase();

      if (
        role === 'SUPER_ADMIN' ||
        role === 'ADMIN' ||
        role === 'HOD' ||
        role === 'MANAGER' ||
        role === 'DEPUTY_MANAGER' ||
        role === 'QA_MANAGER' ||
        role === 'DOCUMENTATION_MANAGER' ||
        role === 'AUDITOR'
      ) {
        return false;
      }

      if (
        name.includes('hod') ||
        name.includes('super admin') ||
        username.includes('admin') ||
        username.includes('hod') ||
        username === '002'
      ) {
        return false;
      }

      return true;
    });
  }, [individualData?.analystsWorkload]);

  const dateFilterButtons: Array<{ key: DateFilterKey; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7days', label: 'Last 7 Days' },
    { key: 'last30days', label: 'Last 30 Days' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const labThemeConfig: Record<
    LabKey,
    {
      title: string;
      code?: string;
      icon: any;
      headerBg: string;
      cardBorder: string;
      badgeBg: string;
      badgeText: string;
      iconBg: string;
      accentColor: string;
      description: string;
    }
  > = {
    general: {
      title: 'General Lab',
      icon: FlaskConical,
      headerBg: 'from-blue-900 via-blue-800 to-indigo-950',
      cardBorder: 'border-blue-200 hover:border-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeText: 'Oral Solids & Liquids',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      accentColor: '#2563eb',
      description: 'Raw materials, oral formulations, physical chemistry and compendial potency assays.',
    },
    cephalosporin: {
      title: 'Cephalosporin Lab',
      icon: ShieldAlert,
      headerBg: 'from-purple-950 via-purple-900 to-slate-900',
      cardBorder: 'border-purple-200 hover:border-purple-400',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeText: 'Sterile Facility (SAF/SEF)',
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
      accentColor: '#9333ea',
      description: 'Sterile area facility (SAF/SEF), cephalosporin injectable batches, and particulate testing.',
    },
    penicillin: {
      title: 'Penicillin Lab',
      icon: Microscope,
      headerBg: 'from-teal-950 via-teal-900 to-slate-900',
      cardBorder: 'border-teal-200 hover:border-teal-400',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
      badgeText: 'Dedicated Penicillin Block',
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
      accentColor: '#0d9488',
      description: 'Dedicated penicillin containment block, amoxicillin/clavulanic acid assays, and dissolution.',
    },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. OPERATIONS SUB-HEADER & LAB SWITCHER                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Lab Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => handleSelectLab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeLab === 'all'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Combined (3 Labs)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {summaryData?.overall.totalSamples ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectLab('general')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeLab === 'general'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
            <span>General Lab</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {summaryData?.labs.find((l) => l.id === 'general')?.totalSamples ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectLab('cephalosporin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeLab === 'cephalosporin'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
            <span>Cephalosporin Lab</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
              {summaryData?.labs.find((l) => l.id === 'cephalosporin')?.totalSamples ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectLab('penicillin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeLab === 'penicillin'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Microscope className="h-3.5 w-3.5 text-teal-600" />
            <span>Penicillin Lab</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
              {summaryData?.labs.find((l) => l.id === 'penicillin')?.totalSamples ?? 0}
            </span>
          </button>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
            {dateFilterButtons.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => handleSelectDateFilter(btn.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  dateFilter === btn.key
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isSummaryRefetching || isIndividualRefetching}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh database numbers"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isSummaryRefetching || isIndividualRefetching ? 'animate-spin text-blue-600' : ''
              }`}
            />
          </button>

          {/* Custom Date Range Popover */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl animate-in fade-in zoom-in-95">
              <span className="font-semibold text-blue-900">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-800 text-xs font-medium"
              />
              <span className="font-semibold text-blue-900">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-800 text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  refetchSummary();
                  if (activeLab !== 'all') refetchIndividual();
                }}
                className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs shadow-2xs cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMBINED 3-LAB OVERVIEW VIEW                                           */}
      {/* ========================================================================= */}
      {activeLab === 'all' && (
        <div className="space-y-6">
          {/* Top Combined Metric KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Total Samples in Scope */}
            <div className="enterprise-card rounded-2xl p-4 bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Samples
                </span>
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {summaryData?.overall.totalSamples ?? (isSummaryLoading ? '...' : 0)}
                </p>
                <span className="text-xs text-slate-500 font-medium">
                  {summaryData?.overall.receivedToday ?? 0} received {dateFilter === 'today' ? 'today' : 'in period'}
                </span>
              </div>
            </div>

            {/* Card 2: Under Testing / In Analysis */}
            <div className="enterprise-card rounded-2xl p-4 bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Under Testing / Worksheets
                </span>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Beaker className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {summaryData?.overall.underTesting ?? (isSummaryLoading ? '...' : 0)}
                </p>
                <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  Active Testing
                </span>
              </div>
            </div>

            {/* Card 3: Pending Queue */}
            <div className="enterprise-card rounded-2xl p-4 bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Execution
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Clock4 className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {summaryData?.overall.pending ?? (isSummaryLoading ? '...' : 0)}
                </p>
                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                  Awaiting Disposition
                </span>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* THREE SEPARATE LAB CARDS                                              */}
          {/* ===================================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Three Separate Laboratory Command Cards
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Filter: <strong className="text-slate-800">{summaryData?.filter?.label || 'Today'}</strong> &bull; Click any card to open its dedicated dashboard
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {summaryData?.labs.map((lab) => {
                const labKey = lab.id as LabKey;
                const theme = labThemeConfig[labKey] || labThemeConfig.general;
                const IconComponent = theme.icon;

                return (
                  <div
                    key={lab.id}
                    onClick={() => handleSelectLab(labKey)}
                    className={`group enterprise-card rounded-2xl bg-white border ${theme.cardBorder} p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-xs`}>
                            <IconComponent className="h-5 w-5 stroke-[2]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-700 transition-colors">
                                {lab.name}
                              </h3>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                Total: {lab.totalSamples} {lab.totalSamples === 1 ? 'Sample' : 'Samples'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {theme.badgeText}
                            </span>
                          </div>
                        </div>

                        <span className="h-7 w-7 rounded-lg bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>

                      {/* Required 6 Primary Metrics Display */}
                      <div className="grid grid-cols-2 gap-2.5 mb-4">
                        {/* 1. Total Samples */}
                        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            Total Samples
                          </p>
                          <p className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                            {lab.totalSamples}
                          </p>
                          <span className="text-[10px] text-slate-400">Received Today: {lab.receivedToday}</span>
                        </div>

                        {/* 2. Samples Assigned */}
                        <div className="bg-blue-50/50 rounded-xl p-2.5 border border-blue-100/80">
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                            Samples Assigned
                          </p>
                          <p className="text-lg font-black text-blue-900 tracking-tight mt-0.5">
                            {lab.assigned}
                          </p>
                          <span className="text-[10px] text-blue-600/80">Duty Allocated</span>
                        </div>

                        {/* 3. Under Testing */}
                        <div className="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100/80">
                          <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
                            Under Testing
                          </p>
                          <p className="text-lg font-black text-indigo-900 tracking-tight mt-0.5">
                            {lab.underTesting}
                          </p>
                          <span className="text-[10px] text-indigo-600/80">Worksheet Active</span>
                        </div>

                        {/* 4. Pending Samples */}
                        <div className="bg-amber-50/50 rounded-xl p-2.5 border border-amber-100/80">
                          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                            Pending Samples
                          </p>
                          <p className="text-lg font-black text-amber-900 tracking-tight mt-0.5">
                            {lab.pending}
                          </p>
                          <span className="text-[10px] text-amber-600/80">Queue Backlog</span>
                        </div>

                        {/* 5. Completed Samples */}
                        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                            Completed Samples
                          </p>
                          <p className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                            {lab.completed}
                          </p>
                          <span className="text-[10px] text-slate-500">Disposition Verified</span>
                        </div>

                        {/* 6. Passed / Failed Samples */}
                        <div className="bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100/80">
                          <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                            Passed / Failed
                          </p>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-black text-emerald-800 tracking-tight">
                              {lab.passed}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-sm font-bold text-rose-700">
                              {lab.failed}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">Pass Rate: {lab.passRate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-800">
                      <span>Open {lab.name} Dashboard</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INDIVIDUAL LAB DEDICATED VIEW                                          */}
      {/* ========================================================================= */}
      {activeLab !== 'all' && (
        <div className="space-y-6">
          {/* 5 Lab-Specific Key Performance Indicator Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Total Samples */}
            <div className="enterprise-card rounded-xl p-3.5 bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                Total Samples
              </span>
              <p className="text-xl font-black text-slate-900 tracking-tight mt-1">
                {individualData?.metrics.totalSamples ?? (isIndividualLoading ? '...' : 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Received Today: {individualData?.metrics.receivedToday ?? 0}
              </span>
            </div>

            {/* 2. Samples Assigned */}
            <div className="enterprise-card rounded-xl p-3.5 bg-white border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block truncate">
                Samples Assigned
              </span>
              <p className="text-xl font-black text-blue-800 tracking-tight mt-1">
                {individualData?.metrics.assigned ?? (isIndividualLoading ? '...' : 0)}
              </p>
              <span className="text-[10px] text-blue-600 mt-1 block">
                Unassigned: {individualData?.metrics.unassignedCount ?? 0}
              </span>
            </div>

            {/* 3. Under Testing */}
            <div className="enterprise-card rounded-xl p-3.5 bg-white border border-indigo-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block truncate">
                Under Testing
              </span>
              <p className="text-xl font-black text-indigo-800 tracking-tight mt-1">
                {individualData?.metrics.underTesting ?? (isIndividualLoading ? '...' : 0)}
              </p>
              <span className="text-[10px] text-indigo-600 mt-1 block">In Active Analysis</span>
            </div>

            {/* 4. Pending Samples */}
            <div className="enterprise-card rounded-xl p-3.5 bg-white border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block truncate">
                Pending Samples
              </span>
              <p className="text-xl font-black text-amber-800 tracking-tight mt-1">
                {individualData?.metrics.pending ?? (isIndividualLoading ? '...' : 0)}
              </p>
              <span className="text-[10px] text-amber-600 mt-1 block">Queue Backlog</span>
            </div>

            {/* 5. Completed Samples */}
            <div className="enterprise-card rounded-xl p-3.5 bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                Completed
              </span>
              <p className="text-xl font-black text-slate-900 tracking-tight mt-1">
                {individualData?.metrics.completed ?? (isIndividualLoading ? '...' : 0)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Disposition Signed</span>
            </div>
          </div>

          {/* Daily Trend Chart for this Lab */}
          <div className="enterprise-card rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Daily Intake vs Completion Trend ({labThemeConfig[activeLab]?.title})
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-slate-600">Received</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <span className="text-slate-600">Completed</span>
                </div>
              </div>
            </div>

            {/* Responsive SVG Bars */}
            <div className="h-48 flex items-end justify-between gap-2 border-b border-slate-200 px-2 pb-2">
              {individualData?.dailyTrend.map((d, idx) => {
                const maxTrend = Math.max(
                  ...((individualData?.dailyTrend || []).map((x) => Math.max(x.received, x.completed))),
                  5
                );
                const hRec = Math.min(100, Math.max(6, (d.received / maxTrend) * 100));
                const hComp = Math.min(100, Math.max(6, (d.completed / maxTrend) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] rounded px-2 py-1 shadow whitespace-nowrap z-10">
                      {d.label}: Received {d.received}, Completed {d.completed}
                    </div>
                    <div className="flex items-end gap-1 justify-center w-full">
                      <div
                        style={{ height: `${hRec}%` }}
                        className="w-3 bg-blue-600 rounded-t-xs hover:brightness-110 transition-all"
                      />
                      <div
                        style={{ height: `${hComp}%` }}
                        className="w-3 bg-emerald-500 rounded-t-xs hover:brightness-110 transition-all"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium mt-2">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* ANALYST-WISE ASSIGNED WORK SECTION                                    */}
          {/* ===================================================================== */}
          <div className="enterprise-card rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Analyst-Wise Assigned Workload ({labThemeConfig[activeLab]?.title})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {genuineAnalystsWorkload.length} registered personnel &bull; Live database assignment
              </span>
            </div>

            {/* Analyst Workload Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Analyst Name</th>
                    <th className="py-2.5 px-3">Role / Department</th>
                    <th className="py-2.5 px-3 text-center">Assigned</th>
                    <th className="py-2.5 px-3 text-center">In Analysis</th>
                    <th className="py-2.5 px-3 text-center">Completed</th>
                    <th className="py-2.5 px-3 text-center">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {genuineAnalystsWorkload.map((a) => {
                    return (
                      <tr key={a.analystId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-100">
                              {a.analystName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{a.analystName}</p>
                              <span className="text-[10px] text-slate-400 font-mono">@{a.username || 'analyst'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-700">{a.designation}</p>
                          <span className="text-[10px] text-slate-400">{a.department}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {a.assigned}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                            {a.inProgress}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            {a.completed}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                            {a.pending}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Row for Unassigned General Queue */}
                  {individualData?.metrics.unassignedCount ? (
                    <tr className="bg-amber-50/30">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                            UA
                          </div>
                          <div>
                            <p className="font-bold text-amber-900">Unassigned Lab Queue</p>
                            <span className="text-[10px] text-amber-700">Awaiting supervisor task delegation</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">—</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-900">
                        {individualData?.metrics.unassignedCount}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">0</td>
                      <td className="py-3 px-3 text-center text-slate-400">0</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-900">
                        {individualData?.metrics.unassignedCount}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SAMPLE DETAILS AND HISTORY TABLE                                      */}
          {/* ===================================================================== */}
          <div className="enterprise-card rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Sample Details &amp; Operational History ({labThemeConfig[activeLab]?.title})
                </h3>
              </div>

              {/* Search & Status Filter Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sampleSearch}
                    onChange={(e) => {
                      setSampleSearch(e.target.value);
                      setSamplePage(1);
                    }}
                    placeholder="Search Sample ID, Drug Product, Batch..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <select
                  value={sampleStatusFilter}
                  onChange={(e) => {
                    setSampleStatusFilter(e.target.value);
                    setSamplePage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RECEIVED">Received</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="TESTING_IN_PROGRESS">In Testing</option>
                  <option value="REVIEW_PENDING">Review Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Sample ID</th>
                    <th className="py-2.5 px-3">Product / Nomenclature</th>
                    <th className="py-2.5 px-3">Batch / Lot #</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Assigned Analyst</th>
                    <th className="py-2.5 px-3">Workflow Progress</th>
                    <th className="py-2.5 px-3 text-center">Result</th>
                    <th className="py-2.5 px-3">Sampling Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {individualData?.samples.data.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {s.sampleId}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{s.nomenclature}</p>
                        <span className="text-[10px] text-slate-400 capitalize">{s.stageType?.toLowerCase() || 'Finished Product'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {s.batchLotNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.priority === 'URGENT' || s.priority === 'STAT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.priority === 'STAT' ? 'URGENT' : s.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            s.assignedToName === 'Unassigned'
                              ? 'text-amber-700 italic'
                              : 'text-slate-800 font-semibold'
                          }`}
                        >
                          {s.assignedToName}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            s.testProgress === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.testProgress === 'In Analysis'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : s.testProgress === 'Assigned'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {s.testProgress}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.result === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.result === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.result === 'PASSED' && <CheckCircle className="h-3 w-3" />}
                          {s.result === 'FAILED' && <XCircle className="h-3 w-3" />}
                          <span>{s.result}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {s.sampledAt ? formatDateTime(s.sampledAt).slice(0, 12) : '—'}
                      </td>
                    </tr>
                  ))}

                  {individualData?.samples.data.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No samples found matching criteria in {labThemeConfig[activeLab]?.title}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {individualData && individualData.samples.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-600">
                <span>
                  Showing page {individualData.samples.meta.page} of {individualData.samples.meta.totalPages} (Total{' '}
                  {individualData.samples.meta.total} samples)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={samplePage <= 1}
                    onClick={() => setSamplePage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={samplePage >= individualData.samples.meta.totalPages}
                    onClick={() => setSamplePage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ===================================================================== */}
          {/* COMPLETE DAILY WORKING ACTIVITIES / AUDIT LOG STREAM                  */}
          {/* ===================================================================== */}
          <div className="enterprise-card rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Daily Working Activities &amp; 21 CFR Part 11 Audit Trail
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Live compliance activity stream for {labThemeConfig[activeLab]?.title}
              </span>
            </div>

            <div className="space-y-3">
              {individualData?.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {act.performedByName.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">
                        {act.performedByName}{' '}
                        <span className="text-[10px] font-mono font-normal text-slate-500">
                          ({act.role})
                        </span>
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {act.timestamp ? formatDateTime(act.timestamp) : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      <strong className="text-slate-800 font-mono text-[11px]">{act.action}</strong>: {act.reasonForChange || `Action on ${act.entityName} ${act.entityId}`}
                    </p>
                  </div>
                </div>
              ))}

              {individualData?.recentActivities.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400">
                  No recent audit activity recorded today in this laboratory.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

