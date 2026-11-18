'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { useAuth } from '@/context/AuthContext';
import { useAllAnalysts, AnalystUserOption } from '@/lib/analysts';
import {
  UserCheck,
  Layers,
  Clock,
  CheckCircle2,
  FileCheck2,
  ExternalLink,
  Search,
  Users,
  Activity,
  ArrowRight,
  FlaskConical,
  Microscope,
  Check,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  X,
  FileText,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDateTime, getSampleIsoDate, matchesDateFilter, matchesDateRangeFilter } from '@/lib/date';
import { cn } from '@/lib/utils';
import { getUserLabAccess, Sample } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { auditService } from '@/services/audit.service';

type LabKey = 'ALL' | 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN';
type WorkflowTab = 'all' | 'in_progress' | 'unassigned';

export interface DeputyManagerDashboardProps {
  dateFilter?: string;
  onSelectDateFilter?: (date: string) => void;
}

export function DeputyManagerDashboard({
  dateFilter,
  onSelectDateFilter,
}: DeputyManagerDashboardProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { analysts: allAnalysts } = useAllAnalysts();

  // Date Filter Sync State (defaults to ALL if not specified)
  const [internalDateFilter, setInternalDateFilter] = useState<string>('ALL');
  const effectiveDateFilter = dateFilter !== undefined ? dateFilter : internalDateFilter;
  const setEffectiveDateFilter = (newDate: string) => {
    setInternalDateFilter(newDate);
    onSelectDateFilter?.(newDate);
  };

  // Filters
  const [selectedLab, setSelectedLab] = useState<LabKey>('ALL');
  const [activeTab, setActiveTab] = useState<WorkflowTab>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Assign / Re-assign Modal state
  const [assigningSample, setAssigningSample] = useState<Sample | null>(null);
  const [assignAnalystId, setAssignAnalystId] = useState<string>('');
  const [assignPriority, setAssignPriority] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');
  const [assignShift, setAssignShift] = useState<string>('Morning (Shift A)');
  const [assignNotes, setAssignNotes] = useState<string>('Section Compendial Verification');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const authorizedLab = getUserLabAccess(user); // 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' | 'ALL'

  // Load samples with real-time polling
  const {
    data: samplesData,
    refetch: refetchSamples,
    isRefetching,
    isLoading,
  } = useQuery({
    queryKey: ['deputy-manager-samples'],
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  const allSamples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Tasks from localStorage for sync with Tasks module
  const [storedTasks, setStoredTasks] = useState<any[]>([]);
  const loadStoredTasks = () => {
    try {
      const raw = localStorage.getItem('city_pharma_lims_tasks');
      if (raw) setStoredTasks(JSON.parse(raw));
    } catch {}
  };

  useEffect(() => {
    loadStoredTasks();
    const handleSync = () => loadStoredTasks();
    window.addEventListener('storage', handleSync);
    window.addEventListener('lims-tasks-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('lims-tasks-updated', handleSync);
    };
  }, []);

  // Helper to normalize laboratory key for any sample
  const getSampleLabKey = (s: any): 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' => {
    const labStr = (s.laboratoryType || s.laboratory?.code || s.laboratory?.name || s.laboratory || '').toUpperCase();
    if (labStr.includes('PEN')) return 'PENICILLIN';
    if (labStr.includes('CEPH')) return 'CEPHALOSPORIN';
    return 'GENERAL';
  };

  // Dynamically extract unique dates that have registered samples
  const availableDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allSamples) {
      const iso = getSampleIsoDate(s.samplingDate || s.createdAt || s.sampledAt);
      if (iso) {
        map.set(iso, (map.get(iso) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([dateIso, count]) => {
        let label = dateIso;
        try {
          const [y, m, d] = dateIso.split('-').map(Number);
          const dt = new Date(y, m - 1, d);
          label = dt.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
        } catch {}
        return { dateIso, count, label };
      })
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [allSamples]);

  // Standard professional timeline presets with live sample counts
  const presetOptions = useMemo(() => {
    const getDate = (item: any) => item.samplingDate || item.createdAt || item.sampledAt;
    const countFor = (key: string) => {
      if (key === 'ALL') return allSamples.length;
      return allSamples.filter((s: any) => matchesDateRangeFilter(getDate(s), key)).length;
    };
    return [
      { key: 'ALL', label: 'All Samples', count: countFor('ALL') },
      { key: 'TODAY', label: 'Today', count: countFor('TODAY') },
      { key: 'YESTERDAY', label: 'Yesterday', count: countFor('YESTERDAY') },
      { key: 'WEEK', label: 'This Week', count: countFor('WEEK') },
      { key: 'MONTH', label: 'This Month', count: countFor('MONTH') },
      { key: 'YEAR', label: 'This Year', count: countFor('YEAR') },
    ];
  }, [allSamples]);

  // Filter all samples by effective date filter
  const dateFilteredAllSamples = useMemo(() => {
    if (!effectiveDateFilter || effectiveDateFilter === 'ALL') return allSamples;
    return allSamples.filter((s: any) =>
      matchesDateRangeFilter(s.samplingDate || s.createdAt || s.sampledAt, effectiveDateFilter)
    );
  }, [allSamples, effectiveDateFilter]);

  // Enforce Section / Lab Boundary for Deputy Manager (defaults to ALL)
  const labSamples = useMemo(() => {
    return dateFilteredAllSamples.filter((s: any) => {
      const sampleLab = getSampleLabKey(s);
      if (authorizedLab === 'GENERAL') return sampleLab === 'GENERAL';
      if (authorizedLab === 'PENICILLIN') return sampleLab === 'PENICILLIN';
      if (authorizedLab === 'CEPHALOSPORIN') return sampleLab === 'CEPHALOSPORIN';
      return true;
    });
  }, [dateFilteredAllSamples, authorizedLab]);

  // Qualified analysts roster
  const qualifiedAnalysts = useMemo(() => {
    return allAnalysts.filter((a) => {
      if (authorizedLab === 'GENERAL') return a.lab === 'GENERAL' || a.lab === 'ALL';
      if (authorizedLab === 'PENICILLIN') return a.lab === 'PENICILLIN' || a.lab === 'ALL';
      if (authorizedLab === 'CEPHALOSPORIN') return a.lab === 'CEPHALOSPORIN' || a.lab === 'ALL';
      return true;
    });
  }, [allAnalysts, authorizedLab]);

  // Determine assigned analyst name for a sample
  const getSampleAssignment = (s: any): string | null => {
    if (s.assignedTo?.fullName) return s.assignedTo.fullName;
    if (s.assignedToId) {
      const matched = qualifiedAnalysts.find((a) => a.id === s.assignedToId || (a as any).dbId === s.assignedToId);
      if (matched) return matched.name;
    }

    const task = storedTasks.find((t: any) => {
      const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
      const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
      return tCode === sCode;
    });

    if (task && task.assignedAnalystName && (task.isAssignedByManager || task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED')) {
      return task.assignedAnalystName;
    }

    if (s.status === 'ASSIGNED_FOR_TESTING' || s.status === 'TESTING_IN_PROGRESS') {
      return 'QC Analyst';
    }

    return null;
  };

  // Counts per laboratory
  const labCounts = useMemo(() => {
    let general = 0;
    let cephalosporin = 0;
    let penicillin = 0;
    for (const s of labSamples) {
      const k = getSampleLabKey(s);
      if (k === 'PENICILLIN') penicillin++;
      else if (k === 'CEPHALOSPORIN') cephalosporin++;
      else general++;
    }
    return {
      all: labSamples.length,
      general,
      cephalosporin,
      penicillin,
    };
  }, [labSamples]);

  // Filter samples by selected laboratory
  const labScopedSamples = useMemo(() => {
    if (selectedLab === 'ALL') return labSamples;
    return labSamples.filter((s) => getSampleLabKey(s) === selectedLab);
  }, [labSamples, selectedLab]);

  // Unassigned in current lab scope
  const unassignedScoped = useMemo(() => {
    return labScopedSamples.filter((s: any) => {
      const assigned = !!getSampleAssignment(s);
      return !assigned && s.status !== 'APPROVED' && s.status !== 'ARCHIVED';
    });
  }, [labScopedSamples, storedTasks, qualifiedAnalysts]);

  // In-progress in current lab scope
  const inProgressScoped = useMemo(() => {
    return labScopedSamples.filter((s: any) => {
      const assigned = !!getSampleAssignment(s);
      return (assigned || s.status === 'TESTING_IN_PROGRESS' || s.status === 'ASSIGNED_FOR_TESTING') && s.status !== 'APPROVED';
    });
  }, [labScopedSamples, storedTasks, qualifiedAnalysts]);

  // Displayed samples based on lab filter, status filter, and live search
  const displayedSamples = useMemo(() => {
    let list: Sample[] = [];
    if (activeTab === 'unassigned') {
      list = unassignedScoped;
    } else if (activeTab === 'in_progress') {
      list = inProgressScoped;
    } else {
      list = labScopedSamples;
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter((s: any) => {
      const code = (s.sampleCode || '').toLowerCase();
      const accession = (s.accessionNo || '').toLowerCase();
      const name = (s.nomenclature || s.materialName || '').toLowerCase();
      const batch = (s.lotNumber || s.batchLotNumber || s.batchNumber || '').toLowerCase();
      const lab = getSampleLabKey(s).toLowerCase();
      const analyst = (getSampleAssignment(s) || '').toLowerCase();
      const status = (s.status || '').toLowerCase();
      return (
        code.includes(q) ||
        accession.includes(q) ||
        name.includes(q) ||
        batch.includes(q) ||
        lab.includes(q) ||
        analyst.includes(q) ||
        status.includes(q)
      );
    });
  }, [activeTab, unassignedScoped, inProgressScoped, labScopedSamples, searchTerm, storedTasks, qualifiedAnalysts]);

  // Handle Deputy Manager Assignment
  const handleAssignTester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSample) return;

    const chosenAnalyst = qualifiedAnalysts.find((a) => a.id === assignAnalystId) || qualifiedAnalysts[0];
    if (!chosenAnalyst) {
      showToast('error', 'Please select an analyst');
      return;
    }

    try {
      setIsSubmittingAssign(true);
      await samplingService.update(assigningSample.id, {
        assignedToId: chosenAnalyst.id,
        status: 'ASSIGNED_FOR_TESTING' as any,
      });

      const newTask = {
        id: `tsk-${Date.now()}`,
        taskCode: `TSK-DEP-${String(Date.now()).slice(-4)}`,
        sampleId: assigningSample.sampleCode || assigningSample.id,
        sampleName: assigningSample.nomenclature || (assigningSample as any).materialName,
        laboratory: getSampleLabKey(assigningSample),
        assignedAnalystName: chosenAnalyst.name,
        assignedAnalystId: chosenAnalyst.id,
        testProtocol: assignNotes || 'Section Compendial Verification',
        priority: assignPriority,
        shift: assignShift,
        assignedDate: new Date().toISOString().split('T')[0],
        status: 'ASSIGNED',
        accessionNo: assigningSample.accessionNo,
        isAssignedByManager: true,
      };

      const updated = [newTask, ...storedTasks.filter((t) => t.sampleId !== assigningSample.sampleCode)];
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      auditService.logActivity({
        action: 'SAMPLE_ASSIGNED',
        entityName: 'Sample',
        entityId: assigningSample.sampleCode,
        performedByName: user?.fullName || 'Azaz',
        role: user?.role || 'DEPUTY_MANAGER',
        reasonForChange: `Deputy Manager Azaz allocated sample ${assigningSample.sampleCode} to analyst ${chosenAnalyst.name} (${assignShift}, ${assignPriority})`,
      });

      setAssigningSample(null);
      refetchSamples();
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['deputy-manager-samples'] });
      showToast('success', `Allocated sample ${assigningSample.sampleCode} to ${chosenAnalyst.name} successfully.`);
    } catch (err: any) {
      showToast('error', err.message || 'Error allocating sample to tester');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Quick initial open for assignment modal
  const openAssignModal = (sample: Sample) => {
    setAssigningSample(sample);
    const existingAnalystId = (sample as any).assignedToId;
    if (existingAnalystId && qualifiedAnalysts.some((a) => a.id === existingAnalystId)) {
      setAssignAnalystId(existingAnalystId);
    } else {
      setAssignAnalystId(qualifiedAnalysts[0]?.id || '');
    }
    setAssignPriority((sample as any).priority === 'URGENT' ? 'URGENT' : 'ROUTINE');
    setAssignShift('Morning (Shift A)');
    setAssignNotes('Section Compendial Verification');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all',
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          )}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL EXECUTIVE HEADER CARD                                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Deputy Manager Operations</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Supervisor: <span className="text-slate-900 font-extrabold">{user?.fullName || 'Azaz'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                @{user?.username || 'deputy.manager'} &bull; {user?.employeeId || 'DMGR-001'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Scope: 3 Laboratories (GL, CEPH, PEN)</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Laboratory Section Workflow &amp; Sample Delegation
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              Real-time oversight of incoming batch samples, analyst allocation, active bench testing worksheets,
              and laboratory turnaround times across General, Cephalosporin, and Penicillin facilities.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => refetchSamples()}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Refresh samples list"
            >
              <RotateCcw className={cn('w-4 h-4 text-blue-600', isRefetching && 'animate-spin text-blue-700')} />
            </button>
            <Link
              href="/dashboard?tab=lab-operations"
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs hover:shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Lab Operations</span>
            </Link>
            <Link
              href="/tasks"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assignment Board</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY KPI METRIC CARDS                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Section Samples */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Section Samples</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{labSamples.length}</div>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-blue-700">GL: {labCounts.general}</span>
            <span>&bull;</span>
            <span className="font-bold text-purple-700">CEPH: {labCounts.cephalosporin}</span>
            <span>&bull;</span>
            <span className="font-bold text-teal-700">PEN: {labCounts.penicillin}</span>
          </div>
        </div>

        {/* Active Under Testing */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Under Active Testing</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Microscope className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700">{inProgressScoped.length}</div>
          <p className="text-[11px] text-slate-400">Executing on analyst workstations</p>
        </div>

        {/* Awaiting Tester Allocation */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Awaiting Tester Allocation</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">{unassignedScoped.length}</div>
          <p className="text-[11px] text-slate-400">Intake queue ready for delegation</p>
        </div>

        {/* Qualified Testing Analysts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Qualified Section Analysts</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{qualifiedAnalysts.length}</div>
          <p className="text-[11px] text-slate-400">Certified testing personnel on roster</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LABORATORY SELECTION & DATE FILTER BAR                                 */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* Row 1: Laboratory Scopes */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-slate-100">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Laboratory:</span>

            {/* All Labs */}
            <button
              type="button"
              onClick={() => setSelectedLab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                selectedLab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>All Laboratories</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedLab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                }`}
              >
                {labCounts.all}
              </span>
            </button>

            {/* General Lab */}
            <button
              type="button"
              onClick={() => setSelectedLab('GENERAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                selectedLab === 'GENERAL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>General Lab</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedLab === 'GENERAL' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {labCounts.general}
              </span>
            </button>

            {/* Cephalosporin Lab */}
            <button
              type="button"
              onClick={() => setSelectedLab('CEPHALOSPORIN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                selectedLab === 'CEPHALOSPORIN'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Cephalosporin Lab</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedLab === 'CEPHALOSPORIN' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
                }`}
              >
                {labCounts.cephalosporin}
              </span>
            </button>

            {/* Penicillin Lab */}
            <button
              type="button"
              onClick={() => setSelectedLab('PENICILLIN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                selectedLab === 'PENICILLIN'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Microscope className="h-3.5 w-3.5" />
              <span>Penicillin Lab</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedLab === 'PENICILLIN' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
                }`}
              >
                {labCounts.penicillin}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Date Filter Selection Pills */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pt-0.5">
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Timeline:</span>
            </span>

            {/* Presets: All, Today, Yesterday, Week, Month, Year */}
            {presetOptions.map((opt) => {
              const isSelected = effectiveDateFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setEffectiveDateFilter(opt.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                  )}
                >
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono',
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-2xs'
                    )}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}

            {/* Exact Registration Dates */}
            {availableDates.map(({ dateIso, count, label }) => {
              const isSelected = effectiveDateFilter === dateIso;
              return (
                <button
                  key={dateIso}
                  type="button"
                  onClick={() => setEffectiveDateFilter(dateIso)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono',
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-blue-800 shadow-2xs'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {effectiveDateFilter !== 'ALL' && (
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                Active: <strong>{effectiveDateFilter}</strong>
              </span>
              <button
                type="button"
                onClick={() => setEffectiveDateFilter('ALL')}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset to all dates"
              >
                <X className="w-3 h-3" />
                <span>Show All</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. WORKFLOW TABS & SAMPLE ALLOCATION TABLE                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        {/* Sub-Tabs & Live Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Status Workflow Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            {/* All Samples */}
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>All Section Samples</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                {labScopedSamples.length}
              </span>
            </button>

            {/* Under Active Testing */}
            <button
              type="button"
              onClick={() => setActiveTab('in_progress')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'in_progress'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Microscope className="h-3.5 w-3.5 text-blue-600" />
              <span>Under Active Testing</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                {inProgressScoped.length}
              </span>
            </button>

            {/* Awaiting Allocation */}
            <button
              type="button"
              onClick={() => setActiveTab('unassigned')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'unassigned'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Awaiting Allocation</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {unassignedScoped.length}
              </span>
            </button>
          </div>

          {/* Live Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code, material, batch, tester..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5 cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Samples Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/90">
                <th className="py-3 px-3.5">SAMPLE &amp; ACCESSION</th>
                <th className="py-3 px-3.5">MATERIAL &amp; BATCH</th>
                <th className="py-3 px-3.5">LABORATORY</th>
                <th className="py-3 px-3.5">PRIORITY</th>
                <th className="py-3 px-3.5">ASSIGNED ANALYST</th>
                <th className="py-3 px-3.5">WORKFLOW STATUS</th>
                <th className="py-3 px-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSamples.map((s: any) => {
                const assignedName = getSampleAssignment(s);
                const labKey = getSampleLabKey(s);
                const isUrgent = s.priority === 'URGENT' || s.priority === 'STAT';

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Sample Code & Accession */}
                    <td className="py-3 px-3.5">
                      <div className="font-mono font-bold text-slate-900">{s.sampleCode || s.sampleId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                    </td>

                    {/* Material & Batch */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{s.nomenclature || s.materialName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                        <span className="font-mono font-medium bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          Lot: {s.lotNumber || s.batchLotNumber || s.batchNumber || 'N/A'}
                        </span>
                        {s.stageType && (
                          <span className="text-slate-400 truncate max-w-[130px]" title={s.stageType}>
                            {s.stageType}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Laboratory Badge */}
                    <td className="py-3 px-3.5">
                      {labKey === 'GENERAL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <FlaskConical className="w-3 h-3 text-blue-600" />
                          <span>General Lab</span>
                        </span>
                      )}
                      {labKey === 'CEPHALOSPORIN' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShieldAlert className="w-3 h-3 text-purple-600" />
                          <span>Cephalosporin</span>
                        </span>
                      )}
                      {labKey === 'PENICILLIN' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <Microscope className="w-3 h-3 text-teal-600" />
                          <span>Penicillin</span>
                        </span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3.5">
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>URGENT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                          <span>ROUTINE</span>
                        </span>
                      )}
                    </td>

                    {/* Assigned Analyst */}
                    <td className="py-3 px-3.5">
                      {assignedName ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-200">
                            {assignedName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{assignedName}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Awaiting Tester</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      <StatusBadge status={s.status} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAssignModal(s)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer',
                            assignedName
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs hover:shadow-xs'
                          )}
                          title={assignedName ? 'Re-allocate to another tester' : 'Assign to testing analyst'}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{assignedName ? 'Re-assign' : 'Assign'}</span>
                        </button>

                        <Link
                          href={`/tasks?lab=${labKey.toLowerCase()}&section=${(s.sampleCode || s.accessionNo || '').includes('/SB') ? 'semi-base' : 'formulation'}`}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="View task execution details"
                        >
                          <span>Details</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayedSamples.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-slate-700">No samples found matching criteria</p>
                      <p className="text-xs text-slate-400">
                        {effectiveDateFilter !== 'ALL'
                          ? `No samples registered for ${effectiveDateFilter}. Click "Show All Dates" to view all section records.`
                          : 'Try adjusting your laboratory filter, status filter, or search keywords.'}
                      </p>
                      {effectiveDateFilter !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setEffectiveDateFilter('ALL')}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Show All Dates</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Showing {displayedSamples.length} of {labScopedSamples.length} section samples</span>
          <span className="font-mono text-[11px] text-slate-400">c-GMP Compliant Electronic Logbook</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SAMPLE ALLOCATION MODAL                                                */}
      {/* ========================================================================= */}
      {assigningSample && (
        <Modal
          isOpen={!!assigningSample}
          onClose={() => setAssigningSample(null)}
          title={`Allocate Sample: ${assigningSample.sampleCode || assigningSample.id}`}
          subtitle="Deputy Manager Section Task Delegation"
          maxWidth="md"
        >
          <form onSubmit={handleAssignTester} className="space-y-4 text-xs">
            {/* Sample Summary Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{assigningSample.nomenclature || (assigningSample as any).materialName}</span>
                <span className="font-mono text-blue-700">{assigningSample.sampleCode}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                <span>Accession: <span className="font-mono font-medium">{assigningSample.accessionNo}</span></span>
                <span>&bull;</span>
                <span>Lab: <span className="font-semibold">{getSampleLabKey(assigningSample)}</span></span>
                <span>&bull;</span>
                <span>Lot: <span className="font-mono">{assigningSample.lotNumber || (assigningSample as any).batchLotNumber || 'N/A'}</span></span>
              </div>
            </div>

            {/* Select Analyst */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Certified Testing Analyst <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={assignAnalystId}
                onChange={(e) => setAssignAnalystId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                {qualifiedAnalysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} [{a.lab}] &bull; {a.department}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Only qualified testing analysts active in the personnel registry are listed.
              </p>
            </div>

            {/* Priority & Shift Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Testing Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="ROUTINE">Routine Standard</option>
                  <option value="URGENT">Urgent Expedited</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Shift</label>
                <select
                  value={assignShift}
                  onChange={(e) => setAssignShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Morning (Shift A)">Morning (Shift A)</option>
                  <option value="Evening (Shift B)">Evening (Shift B)</option>
                  <option value="Night (Shift C)">Night (Shift C)</option>
                </select>
              </div>
            </div>

            {/* Notes / Special Instructions */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Special Testing Instructions / Protocol</label>
              <input
                type="text"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="e.g. Section Compendial Verification, HPLC Potency"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-normal text-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssigningSample(null)}
                disabled={isSubmittingAssign}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-blue-600 hover:bg-blue-500"
                disabled={isSubmittingAssign}
              >
                {isSubmittingAssign ? 'Allocating...' : 'Confirm Allocation'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
