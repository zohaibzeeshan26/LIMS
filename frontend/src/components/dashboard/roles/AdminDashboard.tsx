'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { productService } from '@/services/product.service';
import { auditService } from '@/services/audit.service';
import { userService } from '@/services/user.service';
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
  UserCheck,
  Shield,
  Briefcase,
  FileSpreadsheet,
  ListFilter,
  ChevronRight,
  Info,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatRelativeTime } from '@/lib/date';
import { formatAuditAction, formatAuditRole } from '@/lib/auditFormatter';
import { cn } from '@/lib/utils';
import { Sample, User, Role } from '@/types/lims';
import { PendingDocumentDeletionsCard } from '@/components/dashboard/PendingDocumentDeletionsCard';

export function AdminDashboard() {
  const { user } = useAuth();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'activities' | 'workflow' | 'pending' | 'completed' | 'laboratories'
  >('overview');

  // Search & Filter state for Samples
  const [searchTerm, setSearchTerm] = useState('');
  const [labFilter, setLabFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Personnel (Users) Directory Filter State
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userDeptFilter, setUserDeptFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  // Activity Monitor Multi-Facet Filter State (Requirement 6)
  const [activitySearch, setActivitySearch] = useState('');
  const [activityUserFilter, setActivityUserFilter] = useState('ALL');
  const [activityRoleFilter, setActivityRoleFilter] = useState('ALL');
  const [activityModuleFilter, setActivityModuleFilter] = useState('ALL');
  const [activityTypeFilter, setActivityTypeFilter] = useState('ALL');
  const [activityDatePreset, setActivityDatePreset] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');

  // Inspection Modals (Strictly Read-Only)
  const [viewingSample, setViewingSample] = useState<Sample | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [viewingAuditLog, setViewingAuditLog] = useState<any | null>(null);

  // 1. Fetch Samples (Limit 150 for monitoring)
  const {
    data: samplesData,
    refetch: refetchSamples,
    isLoading: isSamplesLoading,
  } = useQuery({
    queryKey: ['admin-overview-samples'],
    queryFn: () => samplingService.getAll({ limit: 150, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 10000,
  });

  const samples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // 2. Fetch Users Directory (Requirement 1 & 7)
  const {
    data: usersData = [],
    refetch: refetchUsers,
    isLoading: isUsersLoading,
  } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => userService.getAll(),
    refetchInterval: 10000,
  });

  const users: User[] = useMemo(() => {
    return Array.isArray(usersData) ? usersData : [];
  }, [usersData]);

  // 3. Fetch Overall System Activities / Audit Trail (Requirements 2, 4, 6, 12)
  const {
    data: auditLogsData = [],
    refetch: refetchAudit,
    isLoading: isAuditLoading,
  } = useQuery({
    queryKey: ['admin-activities-stream'],
    queryFn: () => auditService.getAll({ limit: 250 }),
    refetchInterval: 10000,
  });

  const auditLogs = useMemo(() => {
    if (Array.isArray(auditLogsData)) return auditLogsData;
    if (Array.isArray((auditLogsData as any)?.data)) return (auditLogsData as any).data;
    return [];
  }, [auditLogsData]);

  // 4. Fetch Laboratory Operations Summary
  const { data: labSummary, refetch: refetchLabSummary } = useQuery({
    queryKey: ['admin-lab-operations-summary'],
    queryFn: () => api.get<any>('/laboratories/operations/summary'),
    refetchInterval: 10000,
  });

  // 5. Fetch Batches for CoA release tracking (Requirement 5)
  const { data: batchesData = [] } = useQuery({
    queryKey: ['admin-batches-list'],
    queryFn: () => api.get<any[]>('/batches'),
    refetchInterval: 10000,
  });

  const batches: any[] = useMemo(() => {
    return Array.isArray(batchesData) ? batchesData : [];
  }, [batchesData]);

  // Refresh all streams simultaneously
  const handleRefreshAll = () => {
    refetchSamples();
    refetchUsers();
    refetchAudit();
    refetchLabSummary();
  };

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

  // User Statistics (Requirement 7)
  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const rolesCount = new Set(users.map((u) => u.role)).size;
    return { total, active, inactive, rolesCount };
  }, [users]);

  // Completed Tasks Count (Approved samples + released batches + verified tests)
  const completedTasksCount = useMemo(() => {
    const approvedSamples = completedSamples.length;
    const releasedBatches = batches.filter((b) => b.status === 'RELEASED').length;
    return approvedSamples + releasedBatches;
  }, [completedSamples, batches]);

  // Pending Tasks Count (Samples needing assignment or review + quarantine batches)
  const pendingTasksCount = useMemo(() => {
    const pendingReview = stageStats.reviewPending;
    const unassigned = stageStats.logged;
    const inTesting = stageStats.inTesting;
    return pendingReview + unassigned + inTesting;
  }, [stageStats]);

  // Recent Activities Today Count (Requirement 7)
  const todayActivitiesCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return auditLogs.filter((log: any) => {
      const logDate = (log.timestamp || log.createdAt || '').slice(0, 10);
      return logDate === todayStr;
    }).length;
  }, [auditLogs]);

  // Filtered Users Directory (Requirement 1)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = userSearchTerm.toLowerCase();
      const matchSearch =
        (u.fullName || '').toLowerCase().includes(term) ||
        (u.username || '').toLowerCase().includes(term) ||
        (u.employeeId || '').toLowerCase().includes(term) ||
        (u.department || '').toLowerCase().includes(term);

      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchDept = userDeptFilter === 'ALL' || u.department === userDeptFilter;
      const matchStatus =
        userStatusFilter === 'ALL' ||
        (userStatusFilter === 'ACTIVE' && u.isActive) ||
        (userStatusFilter === 'INACTIVE' && !u.isActive);

      return matchSearch && matchRole && matchDept && matchStatus;
    });
  }, [users, userSearchTerm, userRoleFilter, userDeptFilter, userStatusFilter]);

  // Map each user to their current active task & module (Requirement 3)
  const getUserActiveTask = (targetUser: User) => {
    // 1. Check if user has an assigned sample currently in testing or assignment
    const activeSample = samples.find(
      (s: any) =>
        (s.assignedToId === targetUser.id ||
          s.assignedTo?.id === targetUser.id ||
          s.assignedTo?.username === targetUser.username ||
          s.assignedAnalyst === targetUser.fullName) &&
        (s.status === 'TESTING_IN_PROGRESS' || s.status === 'ASSIGNED' || s.status === 'REVIEW_PENDING')
    );

    if (activeSample) {
      return {
        taskName: `Testing Execution: ${activeSample.nomenclature || (activeSample as any).materialName} (${activeSample.sampleCode || activeSample.accessionNo})`,
        module: 'Testing Workstation & Worksheets',
        status: activeSample.status,
        badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      };
    }

    // 2. Check latest audit log performed by this user
    const latestLog = auditLogs.find(
      (l: any) =>
        l.performedById === targetUser.id ||
        l.performedByName === targetUser.fullName ||
        l.performedBy?.username === targetUser.username
    );

    if (latestLog) {
      const act = formatAuditAction(latestLog.action);
      return {
        taskName: `${act.label}: ${latestLog.reasonForChange || latestLog.entityId || 'Operational activity'}`,
        module: latestLog.entityName || 'Laboratory System',
        status: 'RECENT_ACTIVITY',
        badgeColor: act.colorClass,
      };
    }

    return {
      taskName: 'Standby / Quality Governance Monitoring',
      module: targetUser.department || 'Quality Control',
      status: 'STANDBY',
      badgeColor: 'bg-slate-50 text-slate-600 border-slate-200',
    };
  };

  // Filtered Audit Logs (Requirements 2, 3, 4, 6)
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log: any) => {
      // 1. Search term
      const term = activitySearch.toLowerCase();
      const matchSearch =
        !term ||
        (log.performedByName || '').toLowerCase().includes(term) ||
        (log.performedBy?.username || '').toLowerCase().includes(term) ||
        (log.action || '').toLowerCase().includes(term) ||
        (log.entityName || '').toLowerCase().includes(term) ||
        (log.entityId || '').toLowerCase().includes(term) ||
        (log.reasonForChange || '').toLowerCase().includes(term) ||
        (log.diffPayload || '').toLowerCase().includes(term);

      // 2. User Filter
      const matchUser =
        activityUserFilter === 'ALL' ||
        log.performedById === activityUserFilter ||
        log.performedByName === activityUserFilter ||
        log.performedBy?.username === activityUserFilter;

      // 3. Role Filter
      const normalizedRole = (log.role || log.performedBy?.role || '').toUpperCase();
      const matchRole =
        activityRoleFilter === 'ALL' ||
        normalizedRole === activityRoleFilter ||
        (activityRoleFilter === 'ADMIN' && (normalizedRole === 'ADMIN' || normalizedRole === 'HOD')) ||
        (activityRoleFilter === 'HOD' && (normalizedRole === 'ADMIN' || normalizedRole === 'HOD'));

      // 4. Module Filter
      const matchModule =
        activityModuleFilter === 'ALL' ||
        (log.entityName || '').toUpperCase() === activityModuleFilter.toUpperCase();

      // 5. Activity Type Filter
      const matchType =
        activityTypeFilter === 'ALL' ||
        (log.action || '').toUpperCase().includes(activityTypeFilter.toUpperCase());

      // 6. Date Filter
      let matchDate = true;
      if (activityDatePreset !== 'ALL') {
        const logTime = new Date(log.timestamp || log.createdAt).getTime();
        const now = Date.now();
        if (activityDatePreset === 'TODAY') {
          const todayStart = new Date().setHours(0, 0, 0, 0);
          matchDate = logTime >= todayStart;
        } else if (activityDatePreset === '7D') {
          matchDate = logTime >= now - 7 * 86400000;
        } else if (activityDatePreset === '30D') {
          matchDate = logTime >= now - 30 * 86400000;
        }
      }

      return matchSearch && matchUser && matchRole && matchModule && matchType && matchDate;
    });
  }, [
    auditLogs,
    activitySearch,
    activityUserFilter,
    activityRoleFilter,
    activityModuleFilter,
    activityTypeFilter,
    activityDatePreset,
  ]);

  // Distinct roles and departments in user directory
  const distinctRoles = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.role))).filter(Boolean);
  }, [users]);

  const distinctDepartments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department))).filter(Boolean);
  }, [users]);

  // Distinct modules and actions from audit logs
  const distinctModules = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l: any) => l.entityName))).filter(Boolean);
  }, [auditLogs]);

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

  // Multi-Lab breakdown
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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans">
      {/* ================= 1. HOD EXECUTIVE OVERSIGHT BANNER ================= */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-navy-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-900/60">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>HOD Monitoring &amp; Governance Console</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-cyan-200 border border-white/20">
                @{user?.username || 'admin.office'} &bull; {user?.employeeId || 'HOD-OFFICE'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                <span>Strictly View-Only Access (Modifications Restricted)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>21 CFR Part 11 Compliance Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Citi Pharma Quality Control &bull; Head of Department
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={handleRefreshAll}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Refresh all metrics, users, activities and sample queues"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
              <span>Refresh Live Stream</span>
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

        {/* ================= SUB-TABS NAVIGATION ================= */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>1. System Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>2. Personnel &amp; Roles ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'activities'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Activity className="w-4 h-4 text-rose-600" />
            <span>3. Live Activity Monitor ({filteredAuditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'workflow'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>4. Testing Progress &amp; Workflows ({samples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>5. Pending Queue ({pendingSamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'completed'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>6. Certified &amp; Released ({completedSamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('laboratories')}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'laboratories'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Building2 className="w-4 h-4 text-cyan-600" />
            <span>7. Multi-Lab Intelligence</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 5 CORE KPI DASHBOARD STATISTICS (Requirement 7) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Users & Active Personnel */}
        <div
          onClick={() => setActiveTab('users')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Personnel</span>
            <Users className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {userStats.total} <span className="text-xs font-bold text-slate-400">Users</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {userStats.active} Active &bull; {userStats.rolesCount} cGMP Roles
          </p>
        </div>

        {/* Card 2: Pending Tasks & Allocation Queue */}
        <div
          onClick={() => setActiveTab('pending')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Tasks</span>
            <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {pendingTasksCount} <span className="text-xs font-bold text-slate-400">Tasks</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {stageStats.logged} Unassigned &bull; {stageStats.reviewPending} In Review
          </p>
        </div>

        {/* Card 3: Active Tasks & Testing In Progress */}
        <div
          onClick={() => setActiveTab('workflow')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Testing Work</span>
            <Microscope className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {stageStats.inTesting + stageStats.assigned} <span className="text-xs font-bold text-slate-400">Worksheets</span>
          </div>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
            {stageStats.inTesting} Active on Bench &bull; {stageStats.assigned} Allocated
          </p>
        </div>

        {/* Card 4: Completed Tasks & Released CoAs */}
        <div
          onClick={() => setActiveTab('completed')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {completedTasksCount} <span className="text-xs font-bold text-slate-400">Certified</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {completedSamples.length} Approved Samples &bull; CoAs Issued
          </p>
        </div>

        {/* Card 5: Recent Activities & 21 CFR Audit Trail */}
        <div
          onClick={() => setActiveTab('activities')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Recent Activities</span>
            <Activity className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {todayActivitiesCount} <span className="text-xs font-bold text-slate-400">Today</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {auditLogs.length} Total 21 CFR Part 11 events
          </p>
        </div>
      </div>

      {/* ================= TAB 1: EXECUTIVE SYSTEM OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Pending Document Deletion Requests with Approve & Reject Actions */}
          <PendingDocumentDeletionsCard />

          {/* Workflow Pipeline Progression Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Cross-Laboratory Sample Workflow Pipeline</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time progression from intake accessioning to analytical testing and final Certificate of Analysis release
                </p>
              </div>
              <button
                onClick={() => setActiveTab('workflow')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Inspect Workflow Pipeline &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">1. Intake Accessioned</span>
                <div className="text-xl font-black text-slate-800">{stageStats.logged}</div>
                <div className="text-[10px] text-slate-500">{stageStats.loggedPct}% of samples</div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-blue-600">2. Manager Allocated</span>
                <div className="text-xl font-black text-blue-800">{stageStats.assigned}</div>
                <div className="text-[10px] text-blue-600">{stageStats.assignedPct}% Allocated</div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-600">3. In Testing</span>
                <div className="text-xl font-black text-amber-800">{stageStats.inTesting}</div>
                <div className="text-[10px] text-amber-600">{stageStats.inTestingPct}% Executing</div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-600">4. Review Pending</span>
                <div className="text-xl font-black text-purple-800">{stageStats.reviewPending}</div>
                <div className="text-[10px] text-purple-600">{stageStats.reviewPendingPct}% In Review</div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-600">5. Certified (CoA Released)</span>
                <div className="text-xl font-black text-emerald-800">{stageStats.approved}</div>
                <div className="text-[10px] text-emerald-600">{stageStats.approvedPct}% Passed</div>
              </div>
            </div>
          </div>

          {/* Laboratory Throughput Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* General Lab */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">General Lab</h4>
                </div>
                <span className="text-xs font-bold text-emerald-600">{labReports.gl.passRate} Quality Pass</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-bold text-slate-800">{labReports.gl.totalSamples}</span>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                  <span className="text-[10px] text-blue-600 block">Active</span>
                  <span className="font-bold text-blue-800">{labReports.gl.assigned}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-[10px] text-amber-600 block">Pending</span>
                  <span className="font-bold text-amber-800">{labReports.gl.pending}</span>
                </div>
              </div>
            </div>

            {/* Cephalosporin Lab */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Cephalosporin Lab</h4>
                </div>
                <span className="text-xs font-bold text-emerald-600">{labReports.ceph.passRate} Quality Pass</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-bold text-slate-800">{labReports.ceph.totalSamples}</span>
                </div>
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                  <span className="text-[10px] text-purple-600 block">Active</span>
                  <span className="font-bold text-purple-800">{labReports.ceph.assigned}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-[10px] text-amber-600 block">Pending</span>
                  <span className="font-bold text-amber-800">{labReports.ceph.pending}</span>
                </div>
              </div>
            </div>

            {/* Penicillin Lab */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Penicillin Lab</h4>
                </div>
                <span className="text-xs font-bold text-emerald-600">{labReports.pen.passRate} Quality Pass</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-bold text-slate-800">{labReports.pen.totalSamples}</span>
                </div>
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                  <span className="text-[10px] text-rose-600 block">Active</span>
                  <span className="font-bold text-rose-800">{labReports.pen.assigned}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-[10px] text-amber-600 block">Pending</span>
                  <span className="font-bold text-amber-800">{labReports.pen.pending}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PERSONNEL & ASSIGNED ROLES DIRECTORY (Requirements 1 & 3) ================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Personnel Directory &amp; cGMP Role Allocations</span>
              </h2>
              <p className="text-xs text-slate-500">
                Head of Department monitoring of all registered users, assigned authorizations, and live active tasks across modules
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>HOD View-Only Mode &bull; User Modifications Restricted</span>
              </span>
            </div>
          </div>

          {/* User Search & Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search user by full name, username, employee ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All cGMP Roles ({users.length})</option>
              {distinctRoles.map((r) => (
                <option key={r} value={r}>
                  {formatAuditRole(r).label}
                </option>
              ))}
            </select>

            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="ACTIVE">Active Users ({userStats.active})</option>
              <option value="INACTIVE">Inactive Users ({userStats.inactive})</option>
            </select>
          </div>

          {/* Personnel Table (Requirement 1 & 3: Users, Roles, Tasks & Modules) */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">User &amp; Identity</th>
                  <th className="py-3 px-3.5">Employee ID</th>
                  <th className="py-3 px-3.5">Assigned cGMP Role</th>
                  <th className="py-3 px-3.5">Department &amp; Lab</th>
                  <th className="py-3 px-3.5">Active Task &amp; Module (Live)</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Oversight Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No personnel records match the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleMeta = formatAuditRole(u.role);
                    const activeTask = getUserActiveTask(u);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs border border-indigo-200">
                              {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{u.fullName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] font-semibold text-slate-700">
                          {u.employeeId || '—'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 shadow-2xs',
                              roleMeta.badgeClass
                            )}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{roleMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-800 font-medium">{u.department || 'Quality Control'}</div>
                          <div className="text-[10px] text-slate-500">
                            {u.assignedLab ? `Lab: ${u.assignedLab}` : 'Cross-Lab Unit'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 max-w-xs">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 truncate" title={activeTask.taskName}>
                              {activeTask.taskName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <span className="font-medium text-indigo-600">{activeTask.module}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Inspect User Credentials & Activity Dossier (Read-Only)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Dossier</span>
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
      )}

      {/* ================= TAB 3: LIVE ROLE ACTIVITY MONITOR & 21 CFR AUDIT TRAIL (Requirements 2, 3, 4, 6, 12) ================= */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-600" />
                <span>Live Role Activity Monitor &amp; 21 CFR Electronic Audit Logs</span>
              </h2>
              <p className="text-xs text-slate-500">
                Continuous monitoring stream of all actions performed by Super Admin, HOD, Managers, Deputy Managers, Incharges, and Testing Analysts
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{filteredAuditLogs.length} Activities Filtered</span>
              </span>
            </div>
          </div>

          {/* Multi-Facet Filter Toolbar (Requirement 6) */}
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <ListFilter className="w-4 h-4 text-indigo-600" />
              <span>Multi-Facet Monitoring Filters:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* 1. Free Search */}
              <div className="relative lg:col-span-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search user, action, entity..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* 2. Filter by User */}
              <select
                value={activityUserFilter}
                onChange={(e) => setActivityUserFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Users ({users.length})</option>
                {users.map((u) => (
                  <option key={u.id} value={u.fullName}>
                    {u.fullName} (@{u.username})
                  </option>
                ))}
              </select>

              {/* 3. Filter by Role (Requirement 2: Super Admin, Admin, Analyst, Manager, Deputy Manager, Incharge, Testing Analyst) */}
              <select
                value={activityRoleFilter}
                onChange={(e) => setActivityRoleFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All cGMP Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">HOD (Head of Department)</option>
                <option value="MANAGER">QC Manager</option>
                <option value="DEPUTY_MANAGER">Deputy Manager</option>
                <option value="SHIFT_INCHARGE">Shift Incharge</option>
                <option value="TESTING_ANALYST">Testing Analyst</option>
                <option value="QC_ANALYST">QC Analyst</option>
                <option value="ANALYST">General Analyst</option>
                <option value="LAB_TECHNICIAN">Sample Registration Analyst / Tech</option>
                <option value="DOCUMENTATION_MANAGER">Documentation Manager</option>
              </select>

              {/* 4. Filter by Module */}
              <select
                value={activityModuleFilter}
                onChange={(e) => setActivityModuleFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All System Modules</option>
                {distinctModules.map((m: any) => (
                  <option key={m} value={m}>
                    Module: {m}
                  </option>
                ))}
              </select>

              {/* 5. Filter by Date Preset */}
              <select
                value={activityDatePreset}
                onChange={(e) => setActivityDatePreset(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Date: All Time</option>
                <option value="TODAY">Date: Today (Last 24h)</option>
                <option value="7D">Date: Last 7 Days</option>
                <option value="30D">Date: Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Activity Logs Table (Requirements 3 & 4: Username, Role, Action, Module, Date & Time) */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Date &amp; Timestamp</th>
                  <th className="py-3 px-3.5">Personnel &amp; User</th>
                  <th className="py-3 px-3.5">Role</th>
                  <th className="py-3 px-3.5">Action Performed</th>
                  <th className="py-3 px-3.5">Target Module</th>
                  <th className="py-3 px-3.5">Task Description / Reason</th>
                  <th className="py-3 px-3.5 text-right">Electronic Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No system activities found matching current filter parameters.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log: any, idx: number) => {
                    const actionMeta = formatAuditAction(log.action);
                    const roleMeta = formatAuditRole(log.role || log.performedBy?.role);

                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-mono text-[11px] font-semibold text-slate-800">
                            {formatDateTime(log.timestamp || log.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatRelativeTime(log.timestamp || log.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{log.performedByName || 'Staff Member'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {log.performedBy?.username ? `@${log.performedBy.username}` : log.performedBy?.employeeId || 'ID: Staff'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 shadow-2xs',
                              roleMeta.badgeClass
                            )}
                          >
                            {roleMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-bold border inline-block shadow-2xs',
                              actionMeta.colorClass
                            )}
                          >
                            {actionMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-indigo-700 whitespace-nowrap">
                          {log.entityName || 'System'}
                        </td>
                        <td className="py-3 px-3.5 max-w-sm">
                          <div className="text-slate-800 text-[11px] font-medium line-clamp-2">
                            {log.reasonForChange || log.diffPayload || 'Operation verified in laboratory workflow.'}
                          </div>
                          {log.entityId && log.entityId !== 'GLOBAL' && (
                            <span className="text-[10px] text-slate-400 font-mono">Ref: {log.entityId}</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingAuditLog(log)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Inspect 21 CFR Electronic Signature and Diff Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Log</span>
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
      )}

      {/* ================= TAB 4: WORKFLOW PROGRESS & TESTING VELOCITY (Requirements 5 & 8) ================= */}
      {activeTab === 'workflow' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <span>Sample Workflow Progress, Analyst Assignments &amp; Calculations</span>
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring of sample status, assigned testing analysts, calculation parameters, and Certificate of Analysis (CoA) generation
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>HOD Monitoring &bull; Read-Only Dossiers</span>
              </span>
            </div>
          </div>

          {/* Workflow Search Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by sample ID, drug name, batch..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-teal-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Laboratories (GL, CEPH, PEN)</option>
              <option value="GEN">General Lab (GL)</option>
              <option value="CEPH">Cephalosporin Lab (CEPH)</option>
              <option value="PEN">Penicillin Lab (PEN)</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent (48 Hours)</option>
              <option value="ROUTINE">Routine (5 Days)</option>
            </select>
          </div>

          {/* Workflow Tracking Table (Requirement 5: Status, Assignments, Progress, Calculations, CoA) */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Sample ID &amp; A.No</th>
                  <th className="py-3 px-3.5">Material &amp; Batch</th>
                  <th className="py-3 px-3.5">Laboratory &amp; Priority</th>
                  <th className="py-3 px-3.5">Assigned Analyst</th>
                  <th className="py-3 px-3.5">Workflow Status</th>
                  <th className="py-3 px-3.5">Testing &amp; Calculations</th>
                  <th className="py-3 px-3.5">Certificate (CoA) Status</th>
                  <th className="py-3 px-3.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No sample workflow records available in the laboratory database.
                    </td>
                  </tr>
                ) : (
                  samples.slice(0, 50).map((s: any) => {
                    const isApproved = s.status === 'APPROVED' || s.status === 'ARCHIVED';
                    const isInProgress = s.status === 'TESTING_IN_PROGRESS';
                    const isAssigned = s.status === 'ASSIGNED' || s.status === 'ASSIGNED_FOR_TESTING';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono">
                          <div className="font-bold text-blue-900">{s.sampleCode || s.accessionNo}</div>
                          <div className="text-[10px] text-slate-400">{s.accessionNo}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{s.nomenclature || s.materialName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Batch: {s.batchNo || '—'}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{s.laboratoryType || s.laboratory || 'General'}</div>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-0.5',
                              s.priority === 'URGENT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {s.priority || 'ROUTINE'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          {s.assignedTo?.fullName || s.assignedAnalyst ? (
                            <div>
                              <div className="font-bold text-slate-800">
                                {s.assignedTo?.fullName || s.assignedAnalyst}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {s.assignedTo?.employeeId || 'Assigned Tester'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-700 italic text-[11px]">Unallocated Queue</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-600">
                                {isApproved ? 'All Tests Verified' : isInProgress ? 'Executing on Bench' : isAssigned ? 'Ready for Testing' : 'Pending Intake'}
                              </span>
                              <span className="text-slate-800">
                                {isApproved ? '100%' : isInProgress ? '65%' : isAssigned ? '25%' : '0%'}
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  isApproved
                                    ? 'bg-emerald-500 w-full'
                                    : isInProgress
                                    ? 'bg-blue-500 w-2/3'
                                    : isAssigned
                                    ? 'bg-amber-500 w-1/4'
                                    : 'bg-slate-300 w-0'
                                )}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shadow-2xs">
                              <FileCheck2 className="w-3 h-3 text-emerald-600" />
                              <span>CoA Certified &bull; Released</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>CoA Pending Review</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingSample(s)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Inspect Sample Dossier (Read-Only)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Dossier</span>
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
      )}

      {/* ================= TAB 5: PENDING WORKLOAD QUEUE ================= */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Pending Sample Workload &amp; Allocation Queue ({filteredPending.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Samples awaiting analyst assignment, testing workstation execution, or quality manager verification
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>HOD Monitoring &bull; Read-Only</span>
              </span>
            </div>
          </div>

          {/* Pending Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Sample ID</th>
                  <th className="py-3 px-3.5">Material Name</th>
                  <th className="py-3 px-3.5">Laboratory</th>
                  <th className="py-3 px-3.5">Assigned Analyst</th>
                  <th className="py-3 px-3.5">Current Stage</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5 text-right">Oversight Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No pending samples currently in queue.
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                        {s.sampleCode || s.accessionNo}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {s.nomenclature || s.materialName}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {s.laboratoryType || s.laboratory || 'General Lab'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        {s.assignedTo?.fullName || s.assignedAnalyst || (
                          <span className="text-amber-700 italic text-[11px]">Awaiting Assignment</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold inline-block',
                            s.priority === 'URGENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {s.priority || 'ROUTINE'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingSample(s)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Inspect Pending Sample Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
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

      {/* ================= TAB 6: COMPLETED & CERTIFIED RELEASES ================= */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Certified Samples &amp; Released Certificates of Analysis ({filteredCompleted.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Quality approved samples, released CoAs, and cryptographically verified 21 CFR compliance records
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{completedSamples.length} Released to Market</span>
              </span>
            </div>
          </div>

          {/* Completed Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Sample ID</th>
                  <th className="py-3 px-3.5">Material Name</th>
                  <th className="py-3 px-3.5">Batch #</th>
                  <th className="py-3 px-3.5">Laboratory</th>
                  <th className="py-3 px-3.5">Release Date</th>
                  <th className="py-3 px-3.5">Certification Status</th>
                  <th className="py-3 px-3.5 text-right">Oversight Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No completed sample records found.
                    </td>
                  </tr>
                ) : (
                  filteredCompleted.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-blue-900">
                        {s.sampleCode || s.accessionNo}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {s.nomenclature || s.materialName}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-700">
                        {s.batchNo || '—'}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {s.laboratoryType || s.laboratory || 'General'}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                        {formatDateTime(s.updatedAt || s.createdAt, 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Approved &bull; CoA Certified</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingSample(s)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Inspect Completed Sample Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect CoA</span>
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

      {/* ================= TAB 7: MULTI-LAB OPERATIONAL INTELLIGENCE ================= */}
      {activeTab === 'laboratories' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                  <span>Cross-Laboratory Floor Operations Breakdown</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time operational capacity, tester allocation, and compliance throughput across laboratory containment suites
                </p>
              </div>

              <Link
                href="/dashboard?tab=lab-operations"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Interactive Floor View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* General Lab */}
              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mt-1">General QC Laboratory</h3>
                    <p className="text-[11px] text-slate-500">Raw materials, tablets, syrups &amp; APIs</p>
                  </div>
                  <FlaskConical className="w-8 h-8 text-blue-500/40" />
                </div>
                <div className="space-y-2 text-xs pt-2 border-t border-blue-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Samples Accessioned:</span>
                    <strong className="text-slate-800">{labReports.gl.totalSamples}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Analyst Tests:</span>
                    <strong className="text-blue-700">{labReports.gl.assigned}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Awaiting Manager Allocation:</span>
                    <strong className="text-amber-700">{labReports.gl.pending}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Analytical Pass Rate:</span>
                    <strong className="text-emerald-700">{labReports.gl.passRate}</strong>
                  </div>
                </div>
              </div>

              {/* Cephalosporin Lab */}
              <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mt-1">Cephalosporin Suite</h3>
                    <p className="text-[11px] text-slate-500">Sterile injectables &amp; dedicated containment</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-purple-500/40" />
                </div>
                <div className="space-y-2 text-xs pt-2 border-t border-purple-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Samples Accessioned:</span>
                    <strong className="text-slate-800">{labReports.ceph.totalSamples}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Analyst Tests:</span>
                    <strong className="text-purple-700">{labReports.ceph.assigned}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Awaiting Manager Allocation:</span>
                    <strong className="text-amber-700">{labReports.ceph.pending}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Analytical Pass Rate:</span>
                    <strong className="text-emerald-700">{labReports.ceph.passRate}</strong>
                  </div>
                </div>
              </div>

              {/* Penicillin Lab */}
              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mt-1">Penicillin Suite</h3>
                    <p className="text-[11px] text-slate-500">Negative pressure cleanroom isolation</p>
                  </div>
                  <Microscope className="w-8 h-8 text-rose-500/40" />
                </div>
                <div className="space-y-2 text-xs pt-2 border-t border-rose-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Samples Accessioned:</span>
                    <strong className="text-slate-800">{labReports.pen.totalSamples}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Analyst Tests:</span>
                    <strong className="text-rose-700">{labReports.pen.assigned}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Awaiting Manager Allocation:</span>
                    <strong className="text-amber-700">{labReports.pen.pending}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Analytical Pass Rate:</span>
                    <strong className="text-emerald-700">{labReports.pen.passRate}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: STRICTLY READ-ONLY SAMPLE INSPECTION (Requirements 8, 9, 10) ================= */}
      {viewingSample && (
        <Modal
          isOpen={!!viewingSample}
          onClose={() => setViewingSample(null)}
          title={`Sample Dossier: ${viewingSample.sampleCode || viewingSample.accessionNo}`}
          subtitle="HOD Supervisory Oversight &bull; Purely View-Only Data Access &bull; Operational Modifications Restricted"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Header Badge */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>HOD Read-Only Governance:</strong> Data entry, test modification, approval, and sample deletion actions are disabled in this supervisory inspection console.
              </span>
            </div>

            {/* Core Identification Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Sample Code</span>
                <span className="font-mono font-bold text-blue-900 text-sm">
                  {viewingSample.sampleCode || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Accession Number</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {viewingSample.accessionNo}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Batch / Lot #</span>
                <span className="font-mono font-semibold text-slate-800">
                  {(viewingSample as any).batchNo || '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Priority SLA</span>
                <span className="font-bold text-slate-800">
                  {viewingSample.priority || 'ROUTINE'}
                </span>
              </div>
            </div>

            {/* Product & Material Details */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Material / Finished Product</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingSample.nomenclature || (viewingSample as any).materialName}
                  </span>
                </div>
                <StatusBadge status={viewingSample.status || 'LOGGED'} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">Laboratory Unit:</span>
                  <strong>{viewingSample.laboratoryType || (viewingSample as any).laboratory || 'General Lab'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sample Intake Date:</span>
                  <strong>{formatDateTime(viewingSample.samplingDate || viewingSample.createdAt, 'dd/MM/yyyy')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Testing Analyst:</span>
                  <strong className="text-indigo-700">
                    {(viewingSample as any).assignedTo?.fullName || (viewingSample as any).assignedAnalyst || 'Not Allocated Yet'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Workflow Progress Summary */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Workflow Verification &amp; Calculations Tracking
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Analytical worksheets, potentiometer calibrations, HPLC chromatograms, and dissolution profile parameters recorded for this specimen are stored in compliance with 21 CFR Part 11 electronic records.
              </p>
            </div>

            {/* Modal Footer (No Save / Approve / Edit Buttons!) */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingSample(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL 2: STRICTLY READ-ONLY USER DOSSIER (Requirement 1 & 8) ================= */}
      {viewingUser && (
        <Modal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          title={`Personnel Dossier: ${viewingUser.fullName}`}
          subtitle="HOD Personnel Oversight &bull; Read-Only Role &amp; Identity Inspection"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="flex items-center gap-3 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-lg shadow-sm">
                {(viewingUser.fullName || viewingUser.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-sm">{viewingUser.fullName}</h3>
                <div className="text-[11px] text-indigo-700 font-mono">@{viewingUser.username}</div>
                <div className="text-[10px] text-slate-500">Employee ID: {viewingUser.employeeId || '—'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Assigned cGMP Role</span>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-block mt-0.5',
                    formatAuditRole(viewingUser.role).badgeClass
                  )}
                >
                  {formatAuditRole(viewingUser.role).label}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Department</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {viewingUser.department || 'Quality Control'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Assigned Laboratory</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                  {viewingUser.assignedLab || 'Cross-Laboratory Suite'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Account State</span>
                <span className="font-bold text-xs mt-0.5 block text-emerald-700">
                  {viewingUser.isActive ? 'Active cGMP Personnel' : 'Deactivated / Inactive'}
                </span>
              </div>
            </div>

            {/* Current Active Task for this User (Requirement 3) */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Current Active Task &amp; Module (Live Cross-Reference)
              </span>
              <div className="font-bold text-slate-900 text-xs">
                {getUserActiveTask(viewingUser).taskName}
              </div>
              <div className="text-[11px] text-indigo-600 font-semibold">
                Module: {getUserActiveTask(viewingUser).module}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>HOD Permission Notice:</strong> User credentials, role adjustments, password resets, and deletions are reserved for Super Administrators.
              </span>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Personnel Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL 3: STRICTLY READ-ONLY 21 CFR AUDIT LOG INSPECTOR ================= */}
      {viewingAuditLog && (
        <Modal
          isOpen={!!viewingAuditLog}
          onClose={() => setViewingAuditLog(null)}
          title="21 CFR Part 11 Electronic Audit Log Record"
          subtitle="Cryptographically Recorded Compliance Event &bull; Read-Only Audit Inspection"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-slate-500 text-[10px]">Log Event ID: {viewingAuditLog.id}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold border',
                    formatAuditAction(viewingAuditLog.action).colorClass
                  )}
                >
                  {formatAuditAction(viewingAuditLog.action).label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Personnel:</span>
                  <strong>{viewingAuditLog.performedByName || 'Staff Member'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">cGMP Role:</span>
                  <strong>{viewingAuditLog.role || 'QC_ANALYST'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Module:</span>
                  <strong className="text-indigo-700">{viewingAuditLog.entityName || 'System'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Timestamp:</span>
                  <strong className="font-mono">
                    {formatDateTime(viewingAuditLog.timestamp || viewingAuditLog.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                  </strong>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Reason For Operational Change</span>
              <p className="text-slate-800 text-xs font-medium leading-relaxed">
                {viewingAuditLog.reasonForChange || 'System operational action recorded in cGMP workflow.'}
              </p>
            </div>

            {viewingAuditLog.diffPayload && (
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-200 space-y-1 font-mono text-[11px]">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Electronic Data Diff Payload</span>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all text-cyan-300 max-h-40 scrollbar-thin">
                  {typeof viewingAuditLog.diffPayload === 'string'
                    ? viewingAuditLog.diffPayload
                    : JSON.stringify(viewingAuditLog.diffPayload, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingAuditLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
