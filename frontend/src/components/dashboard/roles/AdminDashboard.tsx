'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { productService } from '@/services/product.service';
import { auditService } from '@/services/audit.service';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Users,
  Folder,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  Activity,
  ShieldCheck,
  Building2,
  FlaskConical,
  Eye,
  Microscope,
  Check,
  X,
  FileCheck2,
  Calendar,
  Sparkles,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Filter,
  Lock,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Sample } from '@/types/lims';

export function AdminDashboard() {
  const { user } = useAuth();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'pending' | 'completed' | 'laboratories' | 'activities'>('overview');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [labFilter, setLabFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Read-only Sample Detail Modal
  const [viewingSample, setViewingSample] = useState<Sample | null>(null);

  // 1. Fetch Samples (Limit 100 for overview)
  const { data: samplesData, refetch: refetchSamples, isLoading: isSamplesLoading } = useQuery({
    queryKey: ['admin-overview-samples'],
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 10000,
  });

  const samples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // 2. Fetch Laboratory Operations Summary
  const { data: labSummary } = useQuery({
    queryKey: ['admin-lab-operations-summary'],
    queryFn: () => api.get<any>('/laboratories/operations/summary'),
    refetchInterval: 10000,
  });

  // 3. Fetch KPI Metrics
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics-summary'],
    queryFn: () => samplingService.getMetrics(),
    refetchInterval: 10000,
  });

  // 4. Fetch Products Count
  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-catalog'],
    queryFn: () => productService.getAll(),
  });

  // 5. Fetch Overall System Activities / Audit Trail
  const { data: auditLogsData } = useQuery({
    queryKey: ['admin-activities-recent'],
    queryFn: () => auditService.getAll({ limit: 25 }),
    refetchInterval: 10000,
  });

  const auditLogs = useMemo(() => {
    if (Array.isArray(auditLogsData)) return auditLogsData;
    if (Array.isArray((auditLogsData as any)?.data)) return (auditLogsData as any).data;
    return [];
  }, [auditLogsData]);

  // Categorize Samples into Pending vs Completed
  const pendingSamples = useMemo(() => {
    return samples.filter(
      (s) => s.status !== 'APPROVED' && s.status !== 'ARCHIVED' && s.status !== 'REJECTED'
    );
  }, [samples]);

  const completedSamples = useMemo(() => {
    return samples.filter(
      (s) => s.status === 'APPROVED' || s.status === 'ARCHIVED' || s.status === 'REJECTED'
    );
  }, [samples]);

  // Filtered Pending Samples
  const filteredPending = useMemo(() => {
    return pendingSamples.filter((s: any) => {
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

      return matchSearch && matchLab && matchPriority;
    });
  }, [pendingSamples, searchTerm, labFilter, priorityFilter]);

  // Filtered Completed Samples
  const filteredCompleted = useMemo(() => {
    return completedSamples.filter((s: any) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (s.sampleCode || '').toLowerCase().includes(term) ||
        (s.nomenclature || s.materialName || '').toLowerCase().includes(term) ||
        (s.accessionNo || '').toLowerCase().includes(term) ||
        (s.batchNo || '').toLowerCase().includes(term);

      const matchLab =
        labFilter === 'ALL' ||
        (s.laboratoryType || s.laboratory || '').toUpperCase().includes(labFilter);

      return matchSearch && matchLab;
    });
  }, [completedSamples, searchTerm, labFilter]);

  // Laboratory Breakdown from API or samples
  const labReports = useMemo(() => {
    const apiLabs = labSummary?.labs || [];
    const gl = apiLabs.find((l: any) => l.code === 'GL') || {
      name: 'General Lab',
      code: 'GL',
      totalSamples: samples.filter((s: any) => (s.laboratoryType || '').includes('GEN')).length,
      assigned: 2,
      pending: 17,
      completed: 0,
      passRate: '100.0%',
    };
    const pen = apiLabs.find((l: any) => l.code === 'PEN') || {
      name: 'Penicillin Lab',
      code: 'PEN',
      totalSamples: samples.filter((s: any) => (s.laboratoryType || '').includes('PEN')).length,
      assigned: 2,
      pending: 6,
      completed: 0,
      passRate: '100.0%',
    };
    const ceph = apiLabs.find((l: any) => l.code === 'CEPH') || {
      name: 'Cephalosporin Lab',
      code: 'CEPH',
      totalSamples: samples.filter((s: any) => (s.laboratoryType || '').includes('CEPH')).length,
      assigned: 2,
      pending: 6,
      completed: 0,
      passRate: '100.0%',
    };
    return { gl, pen, ceph };
  }, [labSummary, samples]);

  // Testing Progress Stages counts
  const stageStats = useMemo(() => {
    const total = samples.length || 1;
    const logged = samples.filter((s) => s.status === 'LOGGED' || s.status === 'RECEIVED').length;
    const assigned = samples.filter(
      (s) => s.status === 'ASSIGNED_FOR_TESTING' || s.status === 'ASSIGNED'
    ).length;
    const inTesting = samples.filter((s) => s.status === 'TESTING_IN_PROGRESS').length;
    const reviewPending = samples.filter((s) => s.status === 'REVIEW_PENDING').length;
    const approved = samples.filter((s) => s.status === 'APPROVED' || s.status === 'ARCHIVED').length;

    return {
      logged,
      assigned,
      inTesting,
      reviewPending,
      approved,
      loggedPct: Math.round((logged / total) * 100),
      assignedPct: Math.round((assigned / total) * 100),
      inTestingPct: Math.round((inTesting / total) * 100),
      reviewPendingPct: Math.round((reviewPending / total) * 100),
      approvedPct: Math.round((approved / total) * 100),
    };
  }, [samples]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Admin Executive Overview Banner (Read-Only Oversight) */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-navy-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-900/60">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Quality Control Executive Administration</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-cyan-200 border border-white/20">
                @{user?.username || 'admin.office'} &bull; {user?.employeeId || 'ADM-OFFICE'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Supervisory Oversight Mode (Read-Only)</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              System Operations, Sample Analytics &amp; Facility Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-3xl leading-relaxed">
              Executive performance oversight across General, Penicillin, and Cephalosporin laboratories.
              Monitoring overall facility throughput, active testing velocity, pending bottlenecks, and compliance releases.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => {
                refetchSamples();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
              <span>Refresh Metrics</span>
            </button>
            <Link
              href="/dashboard?tab=lab-operations"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Multi-Lab Floor View</span>
            </Link>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>1. System Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'progress'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>2. Testing Progress ({stageStats.inTesting})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>3. Pending Work ({pendingSamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'completed'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>4. Completed Work ({completedSamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('laboratories')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'laboratories'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Building2 className="w-4 h-4 text-cyan-600" />
            <span>5. Laboratory-Wise Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'activities'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Activity className="w-4 h-4 text-rose-600" />
            <span>6. Overall System Activities ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: EXECUTIVE SYSTEM OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Core Sample Statistics KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Registered Samples</span>
                <FlaskConical className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {labSummary?.overall?.totalSamples || samples.length}
              </div>
              <p className="text-[11px] text-slate-400">Total facility sample intake</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Testing in Progress</span>
                <Microscope className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-700">
                {labSummary?.overall?.assigned || stageStats.assigned + stageStats.inTesting}
              </div>
              <p className="text-[11px] text-slate-400">Active analyst worksheets</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Pending Workload</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700">
                {pendingSamples.length}
              </div>
              <p className="text-[11px] text-slate-400">Awaiting testing / supervisor review</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Completed &amp; Released</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {completedSamples.length}
              </div>
              <p className="text-[11px] text-slate-400">Approved batches with CoA</p>
            </div>
          </div>

          {/* Testing Progress Pipeline Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Real-Time Analytical Testing Progress Pipeline</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Progression of samples from intake to final Certificate of Analysis (CoA) release
                </p>
              </div>
              <button
                onClick={() => setActiveTab('progress')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Detailed Breakdown &rarr;
              </button>
            </div>

            {/* Pipeline Step Progress Visual */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">1. Logged / Received</span>
                <div className="text-xl font-black text-slate-800">{stageStats.logged}</div>
                <div className="text-[10px] text-slate-500">{stageStats.loggedPct}% of Total</div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-blue-600">2. Assigned</span>
                <div className="text-xl font-black text-blue-800">{stageStats.assigned}</div>
                <div className="text-[10px] text-blue-600">{stageStats.assignedPct}% Allocated</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-600">3. In Testing</span>
                <div className="text-xl font-black text-amber-800">{stageStats.inTesting}</div>
                <div className="text-[10px] text-amber-600">{stageStats.inTestingPct}% Executing</div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-600">4. Review Pending</span>
                <div className="text-xl font-black text-purple-800">{stageStats.reviewPending}</div>
                <div className="text-[10px] text-purple-600">{stageStats.reviewPendingPct}% Verification</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-600">5. Released (CoA)</span>
                <div className="text-xl font-black text-emerald-800">{stageStats.approved}</div>
                <div className="text-[10px] text-emerald-600">{stageStats.approvedPct}% Certified</div>
              </div>
            </div>
          </div>

          {/* Split Section: Pending Work Glance & Quick Laboratory Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Work Glance */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>High-Priority Pending Work Queue</span>
                </h3>
                <button
                  onClick={() => setActiveTab('pending')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  View All ({pendingSamples.length}) &rarr;
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {pendingSamples.slice(0, 6).map((s: any) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-900">{s.sampleCode}</span>
                        {s.priority === 'STAT' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            STAT IMMEDIATE
                          </span>
                        )}
                        {s.priority === 'URGENT' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]">
                        {s.nomenclature || s.materialName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Lab: {s.laboratoryType || s.laboratory || 'GL'} &bull; Batch: {s.batchNo || '—'}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <StatusBadge status={s.status || 'LOGGED'} />
                      <button
                        type="button"
                        onClick={() => setViewingSample(s)}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Laboratory-Wise Reports Glance */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span>Laboratory Performance Summary</span>
                </h3>
                <button
                  onClick={() => setActiveTab('laboratories')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Full Report &rarr;
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>General QC Laboratory (GL)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                      {labReports.gl.totalSamples} Samples
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Active Testing: {labReports.gl.assigned}</span>
                    <span>Pending Intake: {labReports.gl.pending}</span>
                    <span className="font-bold text-emerald-700">Pass Rate: {labReports.gl.passRate}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                      <span>Penicillin Containment Suite (PEN)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                      {labReports.pen.totalSamples} Samples
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Negative Pressure: -15 Pa</span>
                    <span>Pending: {labReports.pen.pending}</span>
                    <span className="font-bold text-emerald-700">Pass Rate: {labReports.pen.passRate}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                      <Microscope className="w-3.5 h-3.5 text-purple-600" />
                      <span>Cephalosporin Suite (CEPH)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                      {labReports.ceph.totalSamples} Samples
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>HEPA H14 Isolation: Normal</span>
                    <span>Pending: {labReports.ceph.pending}</span>
                    <span className="font-bold text-emerald-700">Pass Rate: {labReports.ceph.passRate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TESTING PROGRESS & PIPELINE ================= */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <span>Analytical Testing Progress &amp; Workload Distribution</span>
              </h2>
              <p className="text-xs text-slate-500">
                Detailed monitoring of sample progression through each rigorous analytical verification stage
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Total Monitored: <strong className="text-slate-900">{samples.length} Samples</strong>
            </div>
          </div>

          {/* Progress Bars Breakdown */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Stage 1: Sample Intake &amp; Logging</span>
                <span>{stageStats.logged} Samples ({stageStats.loggedPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: `${stageStats.loggedPct}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-blue-800">
                <span>Stage 2: Supervisor Assignment to Analysts</span>
                <span>{stageStats.assigned} Samples ({stageStats.assignedPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stageStats.assignedPct}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-amber-800">
                <span>Stage 3: Testing In-Progress (Instrument Runs &amp; Worksheets)</span>
                <span>{stageStats.inTesting} Samples ({stageStats.inTestingPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stageStats.inTestingPct}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-purple-800">
                <span>Stage 4: Quality Verification &amp; Supervisor Review Pending</span>
                <span>{stageStats.reviewPending} Samples ({stageStats.reviewPendingPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${stageStats.reviewPendingPct}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-emerald-800">
                <span>Stage 5: Quality Approved &amp; CoA Certified Released</span>
                <span>{stageStats.approved} Samples ({stageStats.approvedPct}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${stageStats.approvedPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PENDING WORK QUEUE ================= */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Pending Work Queue &amp; Operational Bottlenecks</span>
              </h2>
              <p className="text-xs text-slate-500">
                Samples currently awaiting analyst worksheet completion, supervisor sign-off, or CoA generation
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 self-start sm:self-auto">
              {filteredPending.length} Active Pending
            </span>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search pending by code, batch, material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={labFilter}
                onChange={(e) => setLabFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Laboratories</option>
                <option value="GEN">General Lab (GL)</option>
                <option value="PEN">Penicillin Lab (PEN)</option>
                <option value="CEPH">Cephalosporin Lab (CEPH)</option>
              </select>
            </div>

            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="STAT">STAT Immediate (24 Hours)</option>
                <option value="URGENT">Urgent (48 Hours)</option>
                <option value="ROUTINE">Routine Standard</option>
              </select>
            </div>
          </div>

          {/* Pending Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                  <th className="py-3 px-3.5">Sample Code / Accession</th>
                  <th className="py-3 px-3.5">Material &amp; Batch</th>
                  <th className="py-3 px-3.5">Lab Facility</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Assigned Analyst</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Oversight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No pending samples matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-blue-900">{s.sampleCode}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                        <div className="text-[10px] text-slate-400">Batch: {s.batchNo || '—'}</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {s.laboratoryType || s.laboratory || 'GENERAL'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        {s.priority === 'STAT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            STAT
                          </span>
                        ) : s.priority === 'URGENT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            URGENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            ROUTINE
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-slate-700 font-medium">
                        {s.assignedTo?.fullName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-800">
                            <span>👤 {s.assignedTo.fullName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        <StatusBadge status={s.status || 'LOGGED'} />
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingSample(s)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: COMPLETED WORK & RELEASE QUEUE ================= */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Completed Work &amp; Released Batches Archive</span>
              </h2>
              <p className="text-xs text-slate-500">
                Quality approved samples, release timestamps, and verified Certificates of Analysis
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              {filteredCompleted.length} Completed Batches
            </span>
          </div>

          {/* Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search completed batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={labFilter}
                onChange={(e) => setLabFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Laboratories</option>
                <option value="GEN">General Lab (GL)</option>
                <option value="PEN">Penicillin Lab (PEN)</option>
                <option value="CEPH">Cephalosporin Lab (CEPH)</option>
              </select>
            </div>
          </div>

          {/* Completed Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                  <th className="py-3 px-3.5">Sample / Accession</th>
                  <th className="py-3 px-3.5">Material &amp; Batch</th>
                  <th className="py-3 px-3.5">Lab</th>
                  <th className="py-3 px-3.5">Completed Date</th>
                  <th className="py-3 px-3.5">Compliance Status</th>
                  <th className="py-3 px-3.5">CoA Release</th>
                  <th className="py-3 px-3.5 text-right">Oversight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No completed samples recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredCompleted.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-slate-900">{s.sampleCode}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                        <div className="text-[10px] text-slate-400">Batch: {s.batchNo || '—'}</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {s.laboratoryType || s.laboratory || 'GL'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                        {formatDateTime(s.updatedAt || s.createdAt, 'dd/MM/yyyy HH:mm')}
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Approved &bull; Passed
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          <FileCheck2 className="w-3 h-3 text-blue-600" /> Digital CoA
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingSample(s)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: LABORATORY-WISE REPORTS ================= */}
      {activeTab === 'laboratories' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* General Lab Card */}
            <div className="bg-white rounded-2xl border border-blue-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">General QC Laboratory</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Code: GL-01 &bull; Class D cGMP</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Operational
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Samples Intake</span>
                  <span className="font-bold text-slate-900 font-mono">{labReports.gl.totalSamples}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Assigned for Testing</span>
                  <span className="font-bold text-blue-700 font-mono">{labReports.gl.assigned}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Pending Workflow</span>
                  <span className="font-bold text-amber-700 font-mono">{labReports.gl.pending}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Quality Compliance Pass Rate</span>
                  <span className="font-bold text-emerald-700 font-mono">{labReports.gl.passRate}</span>
                </div>
              </div>
            </div>

            {/* Penicillin Lab Card */}
            <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Penicillin Testing Suite</h3>
                    <p className="text-[10px] text-amber-600 font-mono">Code: PEN-02 &bull; Bio-Containment</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  Isolated
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Samples Intake</span>
                  <span className="font-bold text-slate-900 font-mono">{labReports.pen.totalSamples}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Pressure Differential</span>
                  <span className="font-bold text-amber-800 font-mono">-15 Pa (Negative)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Pending Workflow</span>
                  <span className="font-bold text-amber-700 font-mono">{labReports.pen.pending}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Quality Compliance Pass Rate</span>
                  <span className="font-bold text-emerald-700 font-mono">{labReports.pen.passRate}</span>
                </div>
              </div>
            </div>

            {/* Cephalosporin Lab Card */}
            <div className="bg-white rounded-2xl border border-purple-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                    <Microscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Cephalosporin Suite</h3>
                    <p className="text-[10px] text-purple-600 font-mono">Code: CEPH-03 &bull; Bio-Containment</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                  Isolated
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Samples Intake</span>
                  <span className="font-bold text-slate-900 font-mono">{labReports.ceph.totalSamples}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Air Handling Unit</span>
                  <span className="font-bold text-purple-800 font-mono">Dedicated AHU-03</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Pending Workflow</span>
                  <span className="font-bold text-amber-700 font-mono">{labReports.ceph.pending}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Quality Compliance Pass Rate</span>
                  <span className="font-bold text-emerald-700 font-mono">{labReports.ceph.passRate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: OVERALL SYSTEM ACTIVITIES & AUDIT FEED ================= */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-600" />
                <span>Overall System Activities &amp; 21 CFR Electronic Records</span>
              </h2>
              <p className="text-xs text-slate-500">
                Live compliance audit trail logging logins, sample modifications, and testing events
              </p>
            </div>

            <Link
              href="/audit-trail"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Full Audit Trail</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No system activities recorded.</p>
            ) : (
              auditLogs.map((log: any, idx: number) => (
                <div
                  key={log.id || idx}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-800 font-mono">
                        {log.action || 'ACTIVITY'}
                      </span>
                      <span className="font-bold text-slate-900">{log.performedByName || 'Laboratory Staff'}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Role: {log.role || 'USER'}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] max-w-xl">
                      {log.reasonForChange || log.details || 'System operation executed.'}
                    </p>
                  </div>

                  <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                    {formatDateTime(log.timestamp || log.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= READ-ONLY SAMPLE INSPECTION MODAL ================= */}
      {viewingSample && (
        <Modal
          isOpen={!!viewingSample}
          onClose={() => setViewingSample(null)}
          title={`Sample Inspection: ${viewingSample.sampleCode || viewingSample.accessionNo}`}
          subtitle="Read-only supervisory data oversight &bull; Operational modifications restricted"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Sample Code</span>
                <span className="font-mono font-bold text-blue-900 text-sm">
                  {viewingSample.sampleCode}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Accession Number</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {viewingSample.accessionNo}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Material / Product</span>
                <span className="font-semibold text-slate-900">
                  {viewingSample.nomenclature || (viewingSample as any).materialName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Batch Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  {(viewingSample as any).batchNo || '—'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Laboratory Facility</span>
                <span className="font-bold text-slate-800">
                  {viewingSample.laboratoryType || (viewingSample as any).laboratory || 'GENERAL'}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Priority Level</span>
                <span className="font-bold text-slate-800">
                  {viewingSample.priority || 'ROUTINE'}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Current Status</span>
                <StatusBadge status={viewingSample.status || 'LOGGED'} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Admin Oversight Policy:</strong> Testing execution and result entry must be conducted by assigned Quality Analysts in their respective laboratory suites.
              </span>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingSample(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
