'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { useAuth } from '@/context/AuthContext';
import { getUserLabAccess } from '@/types/lims';
import { cn } from '@/lib/utils';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import {
  formatLiveDate,
  formatLiveClock,
  formatShortLiveDate,
} from '@/lib/date';
import {
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  X,
  SlidersHorizontal,
  FlaskConical,
  Layers,
} from 'lucide-react';

export default function PriorityNoticePage() {
  const { user } = useAuth();
  const userAccess = getUserLabAccess(user);

  // Live real-time clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLab, setSelectedLab] = useState<'ALL' | 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | 'STAT' | 'URGENT'>('ALL');
  const [selectedSection, setSelectedSection] = useState<'ALL' | 'SEMI_BASIC' | 'FORMULATION'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Dedicated query to fetch ALL active expedited (Immediate / STAT & Urgent) samples
  const {
    data: expeditedSamplesData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['active-expedited-urgent-samples'],
    queryFn: () =>
      samplingService.getAll({
        priority: 'STAT,URGENT',
        limit: 100,
        sortBy: 'samplingDate',
        sortOrder: 'desc',
      }),
    refetchInterval: 5000,
  });

  // Map and deduplicate expedited samples
  const allExpeditedSamples = useMemo(() => {
    const list = Array.isArray(expeditedSamplesData)
      ? expeditedSamplesData
      : (expeditedSamplesData as any)?.data || [];

    const urgentList = list.filter(
      (s: any) =>
        (s.priority === 'STAT' || s.priority === 'URGENT') &&
        s.status !== 'APPROVED' &&
        s.status !== 'REJECTED' &&
        s.status !== 'ARCHIVED'
    );

    // Sort: STAT (Immediate 24h) first, then URGENT (2d), then latest date
    urgentList.sort((a: any, b: any) => {
      if (a.priority === 'STAT' && b.priority !== 'STAT') return -1;
      if (b.priority === 'STAT' && a.priority !== 'STAT') return 1;
      const aTime = new Date(a.samplingDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.samplingDate || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return urgentList.map((s: any) => {
      let labId = 'general';
      let labName = 'General Lab';
      let labBadge = 'GL';
      let labPillClass = 'text-blue-700 bg-blue-50/70 border-blue-200/70';
      const labType = (s.laboratoryType || s.laboratory?.code || '').toUpperCase();
      const labText = (s.laboratory?.name || s.samplingLocation || '').toUpperCase();

      if (labType === 'SAF' || labType === 'SEF' || labType === 'CP' || labText.includes('CEPH')) {
        labId = 'cephalosporin';
        labName = 'Cephalosporin Lab';
        labBadge = 'CEPH';
        labPillClass = 'text-purple-700 bg-purple-50/70 border-purple-200/70';
      } else if (labType === 'PENICILLIN' || labType === 'PEN') {
        labId = 'penicillin';
        labName = 'Penicillin Lab';
        labBadge = 'PEN';
        labPillClass = 'text-emerald-700 bg-emerald-50/70 border-emerald-200/70';
      }

      return {
        uuid: s.id,
        id: s.sampleCode || s.sampleId || s.accessionNo || s.id,
        product: s.nomenclature || s.materialName || 'Pharmaceutical Sample',
        batchNumber: s.lotNumber || s.batchLotNumber || s.batch?.batchNumber || 'N/A',
        section: s.section === 'FORMULATION' ? 'Formulation' : 'Semi Basics',
        rawSection: s.section || 'SEMI_BASIC',
        sampleType: s.sampleType || 'Raw Material',
        priority: (s.priority || 'URGENT') as 'STAT' | 'URGENT',
        status: s.status || 'RECEIVED',
        samplingDate: s.samplingDate || s.createdAt || new Date().toISOString(),
        labId,
        labName,
        labBadge,
        labPillClass,
      };
    });
  }, [expeditedSamplesData]);

  // Compute counts
  const statCount = useMemo(() => allExpeditedSamples.filter((s) => s.priority === 'STAT').length, [allExpeditedSamples]);
  const urgentCount = useMemo(() => allExpeditedSamples.filter((s) => s.priority === 'URGENT').length, [allExpeditedSamples]);
  const generalCount = useMemo(() => allExpeditedSamples.filter((s) => s.labId === 'general').length, [allExpeditedSamples]);
  const cephCount = useMemo(() => allExpeditedSamples.filter((s) => s.labId === 'cephalosporin').length, [allExpeditedSamples]);
  const penCount = useMemo(() => allExpeditedSamples.filter((s) => s.labId === 'penicillin').length, [allExpeditedSamples]);

  // Filtered samples based on user selection and search query
  const filteredSamples = useMemo(() => {
    return allExpeditedSamples.filter((s) => {
      // Lab filter
      if (selectedLab === 'GENERAL' && s.labId !== 'general') return false;
      if (selectedLab === 'CEPHALOSPORIN' && s.labId !== 'cephalosporin') return false;
      if (selectedLab === 'PENICILLIN' && s.labId !== 'penicillin') return false;

      // Priority filter
      if (selectedPriority === 'STAT' && s.priority !== 'STAT') return false;
      if (selectedPriority === 'URGENT' && s.priority !== 'URGENT') return false;

      // Section filter
      if (selectedSection === 'SEMI_BASIC' && s.rawSection === 'FORMULATION') return false;
      if (selectedSection === 'FORMULATION' && s.rawSection !== 'FORMULATION') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesProduct = s.product.toLowerCase().includes(q);
        const matchesBatch = s.batchNumber.toLowerCase().includes(q);
        const matchesLab = s.labName.toLowerCase().includes(q);
        return matchesId || matchesProduct || matchesBatch || matchesLab;
      }

      return true;
    });
  }, [allExpeditedSamples, selectedLab, selectedPriority, selectedSection, searchQuery]);

  return (
    <RoleRouteGuard
      allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'SHIFT_INCHARGE', 'QA_MANAGER']}
      moduleName="Priority Sample Notice Board"
    >
      <div className="space-y-6 font-sans pb-12 max-w-7xl mx-auto">
      
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
            <Link href="/" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-slate-700 font-semibold">Priority Notice</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Priority Notice
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Expedited Queue
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200">
                  21 CFR Part 11
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Expedited testing schedule for active STAT (24h) and Urgent (2d) samples awaiting QC release.
              </p>
            </div>
          </div>
        </div>

        {/* Live Date, Time & Sync Action */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-1.5 shadow-2xs text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">{formatLiveDate(currentTime)}</div>
            <div className="text-[11px] font-mono text-slate-400">{formatLiveClock(currentTime)}</div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh expedited samples queue"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-blue-600', isFetching && 'animate-spin')} />
            <span>{isFetching ? 'Syncing...' : 'Sync Queue'}</span>
          </button>
        </div>
      </div>

      {/* 4 Compact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Card 1: Total Expedited */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Expedited</span>
            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
              Active
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {allExpeditedSamples.length}
            </p>
            <span className="text-[11px] text-slate-400">In queue</span>
          </div>
        </div>

        {/* Card 2: STAT Immediate (24 Hours SLA) */}
        <div
          onClick={() => setSelectedPriority(selectedPriority === 'STAT' ? 'ALL' : 'STAT')}
          className={cn(
            'bg-white rounded-xl p-2.5 sm:p-3 border shadow-2xs cursor-pointer transition-all hover:border-slate-300 flex flex-col justify-between',
            selectedPriority === 'STAT'
              ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/20'
              : 'border-slate-200/80'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">STAT Immediate</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              24h SLA
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {statCount}
            </p>
            <span className="text-[11px] text-slate-400">Immediate</span>
          </div>
        </div>

        {/* Card 3: Urgent Priority (2 Days SLA) */}
        <div
          onClick={() => setSelectedPriority(selectedPriority === 'URGENT' ? 'ALL' : 'URGENT')}
          className={cn(
            'bg-white rounded-xl p-2.5 sm:p-3 border shadow-2xs cursor-pointer transition-all hover:border-slate-300 flex flex-col justify-between',
            selectedPriority === 'URGENT'
              ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/20'
              : 'border-slate-200/80'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Urgent Testing</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              2d SLA
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {urgentCount}
            </p>
            <span className="text-[11px] text-slate-400">2-day SLA</span>
          </div>
        </div>

        {/* Card 4: Facility Distribution */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500">Facilities</span>
            <span className="text-[10px] text-slate-400">3 Labs</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div
              onClick={() => setSelectedLab(selectedLab === 'GENERAL' ? 'ALL' : 'GENERAL')}
              className={cn(
                'p-1 rounded-lg cursor-pointer transition-colors',
                selectedLab === 'GENERAL' ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60' : 'hover:bg-slate-50 text-slate-600'
              )}
            >
              <span className="text-[10px] block text-slate-400 font-medium">GL</span>
              <span className="text-xs font-bold font-mono text-slate-800">{generalCount}</span>
            </div>

            <div
              onClick={() => setSelectedLab(selectedLab === 'CEPHALOSPORIN' ? 'ALL' : 'CEPHALOSPORIN')}
              className={cn(
                'p-1 rounded-lg cursor-pointer transition-colors',
                selectedLab === 'CEPHALOSPORIN' ? 'bg-purple-50 text-purple-700 font-bold border border-purple-200/60' : 'hover:bg-slate-50 text-slate-600'
              )}
            >
              <span className="text-[10px] block text-slate-400 font-medium">CEPH</span>
              <span className="text-xs font-bold font-mono text-slate-800">{cephCount}</span>
            </div>

            <div
              onClick={() => setSelectedLab(selectedLab === 'PENICILLIN' ? 'ALL' : 'PENICILLIN')}
              className={cn(
                'p-1 rounded-lg cursor-pointer transition-colors',
                selectedLab === 'PENICILLIN' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60' : 'hover:bg-slate-50 text-slate-600'
              )}
            >
              <span className="text-[10px] block text-slate-400 font-medium">PEN</span>
              <span className="text-xs font-bold font-mono text-slate-800">{penCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Responsive Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-2xs space-y-2.5">
        {/* Row 1: Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Laboratory Tabs */}
          <div className="flex items-center p-0.5 bg-slate-100/90 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedLab('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedLab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Labs ({allExpeditedSamples.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLab('GENERAL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedLab === 'GENERAL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              GL ({generalCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLab('CEPHALOSPORIN')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedLab === 'CEPHALOSPORIN' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              CEPH ({cephCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedLab('PENICILLIN')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedLab === 'PENICILLIN' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              PEN ({penCount})
            </button>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center p-0.5 bg-slate-100/90 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedPriority('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedPriority === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Priorities
            </button>
            <button
              type="button"
              onClick={() => setSelectedPriority('STAT')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
                selectedPriority === 'STAT' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>STAT (24h)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPriority('URGENT')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
                selectedPriority === 'URGENT' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Urgent (2d)</span>
            </button>
          </div>

          {/* Subsection Filter */}
          <div className="flex items-center p-0.5 bg-slate-100/90 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedSection('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedSection === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Sections
            </button>
            <button
              type="button"
              onClick={() => setSelectedSection('SEMI_BASIC')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedSection === 'SEMI_BASIC' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Semi Basics
            </button>
            <button
              type="button"
              onClick={() => setSelectedSection('FORMULATION')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedSection === 'FORMULATION' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Formulation
            </button>
          </div>
        </div>

        {/* Row 2: Responsive Search Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search sample code, product nomenclature, batch/lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">
              Showing <strong className="text-slate-700">{filteredSamples.length}</strong> of {allExpeditedSamples.length}
            </span>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors cursor-pointer',
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                )}
                title="Grid Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md transition-colors cursor-pointer',
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                )}
                title="Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading expedited priority samples...</p>
        </div>
      ) : filteredSamples.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-6">
          <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No Expedited Samples Match Filter</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
            All high-priority samples for the selected criteria are processed or filtered out.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedLab('ALL');
              setSelectedPriority('ALL');
              setSelectedSection('ALL');
              setSearchQuery('');
            }}
            className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Clean Grid View */
        <div className="space-y-4">
          
          {/* Quick Access Pill Chips - Clean, minimal pharmaceutical badges */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Active Priority Samples
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredSamples.length}
                </span>
              </div>

              <Link
                href="/samples?priority=STAT,URGENT"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <span>Full Registry</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Clean Pill Badges (Gentle, elegant, highly readable) */}
            <div className="flex flex-wrap items-center gap-2">
              {filteredSamples.map((s) => {
                const isStat = s.priority === 'STAT';
                return (
                  <Link
                    key={s.id}
                    href={`/samples?lab=${s.labId}&sampleId=${encodeURIComponent(s.uuid || s.id)}`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer text-slate-800"
                    title={`Open ${s.id} in ${s.labName}`}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', isStat ? 'bg-rose-500' : 'bg-amber-500')} />
                    <span className="font-mono font-semibold text-slate-900">{s.id}</span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.2 rounded',
                        isStat ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      )}
                    >
                      {isStat ? '24h' : '2d'}
                    </span>
                    <span className="text-[11px] text-slate-500 max-w-[150px] truncate hidden sm:inline">
                      {s.product}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Detailed Responsive Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSamples.map((s) => {
              const isStat = s.priority === 'STAT';
              return (
                <Link
                  key={s.id}
                  href={`/samples?lab=${s.labId}&sampleId=${encodeURIComponent(s.uuid || s.id)}`}
                  className="group bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all block"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                          isStat
                            ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                            : 'bg-amber-50 text-amber-700 border-amber-200/70'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', isStat ? 'bg-rose-500' : 'bg-amber-500')} />
                        {isStat ? 'STAT (24h)' : 'Urgent (2d)'}
                      </span>

                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border', s.labPillClass)}>
                        {s.labBadge}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">
                      {formatShortLiveDate(new Date(s.samplingDate))}
                    </span>
                  </div>

                  <h4 className="font-mono font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    {s.id}
                  </h4>
                  <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-1">
                    {s.product}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Batch / Lot</span>
                      <span className="font-mono text-slate-700 font-semibold text-[11px] truncate block">
                        {s.batchNumber}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Section</span>
                      <span className="font-medium text-slate-700 text-[11px] truncate block">
                        {s.section}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-blue-600 pt-1 group-hover:translate-x-0.5 transition-transform">
                    <span className="text-[11px]">{s.labName}</span>
                    <span className="flex items-center gap-1 font-semibold text-xs">
                      <span>Open Record</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
      ) : (
        /* Clean Minimal Table View */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 text-[11px]">
                  <th className="py-3 px-4">Priority SLA</th>
                  <th className="py-3 px-4">Sample Code</th>
                  <th className="py-3 px-4">Nomenclature</th>
                  <th className="py-3 px-4">Batch / Lot</th>
                  <th className="py-3 px-4">Facility</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSamples.map((s) => {
                  const isStat = s.priority === 'STAT';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                            isStat
                              ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                              : 'bg-amber-50 text-amber-700 border-amber-200/70'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', isStat ? 'bg-rose-500' : 'bg-amber-500')} />
                          {isStat ? 'STAT (24h)' : 'Urgent (2d)'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {s.id}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                        {s.product}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {s.batchNumber}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border', s.labPillClass)}>
                          {s.labBadge}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap text-[11px]">
                        {s.section}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                        {formatShortLiveDate(new Date(s.samplingDate))}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/samples?lab=${s.labId}&sampleId=${encodeURIComponent(s.uuid || s.id)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-semibold text-xs transition-colors"
                        >
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>
    </RoleRouteGuard>
  );
}
