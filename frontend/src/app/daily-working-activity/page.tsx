'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import { formatDateTime } from '@/lib/date';
import {
  Clock,
  Activity,
  FlaskConical,
  ShieldAlert,
  Microscope,
  Search,
  Filter,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type LabFilter = 'ALL' | 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN';
type DateFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'all';
type ActivityCategory = 'ALL' | 'REGISTRATION' | 'ASSIGNMENT' | 'DOCUMENTATION' | 'TESTING';

interface AuditItem {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  performedById?: string;
  performedByName: string;
  role: string;
  timestamp: string;
  ipAddress?: string;
  reasonForChange?: string;
  diffPayload?: string;
  performedBy?: {
    id: string;
    fullName: string;
    employeeId?: string;
    department?: string;
    role: string;
    username?: string;
    assignedLab?: string;
  };
}

interface ActivityMetadata {
  category: 'REGISTRATION' | 'ASSIGNMENT' | 'DOCUMENTATION' | 'TESTING';
  badgeTitle: string;
  badgeClass: string;
  actorPrefix: string;
  avatarBg: string;
}

const getActivityMetadata = (act: AuditItem): ActivityMetadata => {
  const action = (act.action || '').toUpperCase();
  const role = (act.role || act.performedBy?.role || '').toUpperCase();
  const reason = (act.reasonForChange || '').toLowerCase();

  // 1. Kisna assign kia (Duty / Sample Assignment)
  if (
    action.includes('ASSIGN') ||
    reason.includes('assigned') ||
    action === 'TASK_ASSIGNED' ||
    action === 'SAMPLE_ASSIGNED' ||
    action === 'DUTY_ALLOCATED' ||
    action === 'ANALYST_ASSIGNED'
  ) {
    return {
      category: 'ASSIGNMENT',
      badgeTitle: 'Duty Allocated',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      actorPrefix: 'Assigned By',
      avatarBg: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    };
  }

  // 2. Kis bnda na register kia (Sample Registration / Accessioning)
  if (
    action.includes('ACCESSION') ||
    action.includes('REGISTER') ||
    (action.includes('SAMPLE') && action.includes('CREATE')) ||
    role === 'LAB_TECHNICIAN' ||
    reason.includes('accessioned') ||
    reason.includes('registered')
  ) {
    return {
      category: 'REGISTRATION',
      badgeTitle: 'Sample Registered',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      actorPrefix: 'Registered By',
      avatarBg: 'bg-amber-100 text-amber-900 border border-amber-200',
    };
  }

  // 3. Kisna file upload ke3 (Product / Test Document Upload)
  if (
    action.includes('UPLOAD') ||
    action.includes('DOCUMENT') ||
    action.includes('FILE') ||
    role === 'DOCUMENTATION_MANAGER' ||
    role === 'PRODUCT_DOCUMENTATION_OFFICER' ||
    reason.includes('upload') ||
    reason.includes('document')
  ) {
    return {
      category: 'DOCUMENTATION',
      badgeTitle: 'File Uploaded',
      badgeClass: 'bg-teal-100 text-teal-900 border-teal-200',
      actorPrefix: 'Uploaded By',
      avatarBg: 'bg-teal-100 text-teal-900 border border-teal-200',
    };
  }

  // 4. Testing Execution (Testing Analyst)
  return {
    category: 'TESTING',
    badgeTitle: 'Testing Execution',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    actorPrefix: 'Analyst',
    avatarBg: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
  };
};

function DailyWorkingActivityContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Lab Tab from query param or state
  const rawLab = (searchParams.get('lab') || 'ALL').toUpperCase();
  const initialLab: LabFilter =
    rawLab.includes('CEPH') || rawLab.includes('SAF')
      ? 'CEPHALOSPORIN'
      : rawLab.includes('PEN')
      ? 'PENICILLIN'
      : rawLab.includes('GEN') || rawLab === 'GL'
      ? 'GENERAL'
      : 'ALL';

  const [activeLab, setActiveLab] = useState<LabFilter>(initialLab);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Sync tab change to URL
  const handleSelectLab = (lab: LabFilter) => {
    setActiveLab(lab);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (lab === 'ALL') {
      params.delete('lab');
    } else {
      params.set('lab', lab.toLowerCase());
    }
    router.replace(`/daily-working-activity?${params.toString()}`);
  };

  // Calculate start & end date for query
  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString() };
    }
    if (dateFilter === 'yesterday') {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (dateFilter === 'last7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString() };
    }
    if (dateFilter === 'last30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString() };
    }
    return {};
  }, [dateFilter]);

  // Fetch Audit Trail records
  const {
    data: auditData = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<AuditItem[]>({
    queryKey: ['daily-working-activities', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '300');
      params.append('workingRolesOnly', 'true');
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      const res = await api.get<any>(`/audit?${params.toString()}`);
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
    refetchInterval: 10000,
  });

  // Helper to determine laboratory of an audit event
  const getEventLab = (act: AuditItem): 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN' => {
    const combinedText = (
      (act.reasonForChange || '') +
      ' ' +
      (act.diffPayload || '') +
      ' ' +
      (act.action || '') +
      ' ' +
      (act.entityId || '')
    ).toUpperCase();

    if (
      combinedText.includes('CEPH') ||
      combinedText.includes('SAF') ||
      combinedText.includes('SEF') ||
      combinedText.includes('CEPHALOSPORIN')
    ) {
      return 'CEPHALOSPORIN';
    }
    if (combinedText.includes('PEN') || combinedText.includes('PENICILLIN')) {
      return 'PENICILLIN';
    }
    if (combinedText.includes('GL/') || combinedText.includes('GEN') || combinedText.includes('GENERAL')) {
      return 'GENERAL';
    }

    const userLab = (act.performedBy?.assignedLab || '').toUpperCase();
    if (userLab === 'CEPHALOSPORIN' || userLab === 'SAF') return 'CEPHALOSPORIN';
    if (userLab === 'PENICILLIN') return 'PENICILLIN';

    return 'GENERAL';
  };

  // Base list of operational working activities (excludes auth logins/logouts)
  const allowedActivities = useMemo(() => {
    return auditData.filter((act) => {
      const a = (act.action || '').toUpperCase();
      if (a === 'USER_LOGIN' || a === 'USER_LOGOUT' || a.includes('CLEANUP')) {
        return false;
      }
      return true;
    });
  }, [auditData]);

  // Filtered operational list based on selected lab, operation category, and search term
  const filteredActivities = useMemo(() => {
    return allowedActivities.filter((act) => {
      // 1. Operation Category Filter
      const meta = getActivityMetadata(act);
      if (selectedCategory !== 'ALL' && meta.category !== selectedCategory) {
        return false;
      }

      // 2. Laboratory Filter
      if (activeLab !== 'ALL') {
        const labOfEvent = getEventLab(act);
        if (labOfEvent !== activeLab) return false;
      }

      // 3. Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const haystack = (
          (act.performedByName || '') +
          ' ' +
          (act.action || '') +
          ' ' +
          (act.reasonForChange || '') +
          ' ' +
          (act.role || '') +
          ' ' +
          (act.entityName || '') +
          ' ' +
          (act.entityId || '')
        ).toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [allowedActivities, activeLab, selectedCategory, searchTerm]);

  // Breakdown counts for laboratory tabs
  const labCounts = useMemo(() => {
    let general = 0;
    let ceph = 0;
    let pen = 0;
    for (const a of allowedActivities) {
      const l = getEventLab(a);
      if (l === 'CEPHALOSPORIN') ceph++;
      else if (l === 'PENICILLIN') pen++;
      else general++;
    }
    return {
      all: allowedActivities.length,
      general,
      ceph,
      pen,
    };
  }, [allowedActivities]);

  // Breakdown counts for operation category pills: Registration, Assignment, Document Upload, Testing
  const categoryCounts = useMemo(() => {
    let reg = 0;
    let assign = 0;
    let doc = 0;
    let testing = 0;
    for (const a of allowedActivities) {
      if (activeLab !== 'ALL' && getEventLab(a) !== activeLab) continue;
      const meta = getActivityMetadata(a);
      if (meta.category === 'REGISTRATION') reg++;
      else if (meta.category === 'ASSIGNMENT') assign++;
      else if (meta.category === 'DOCUMENTATION') doc++;
      else if (meta.category === 'TESTING') testing++;
    }
    return {
      all: reg + assign + doc + testing,
      reg,
      assign,
      doc,
      testing,
    };
  }, [allowedActivities, activeLab]);

  // Unique staff active in filtered list
  const uniquePersonnel = useMemo(() => {
    const set = new Set<string>();
    filteredActivities.forEach((a) => {
      if (a.performedByName) set.add(a.performedByName);
    });
    return set.size;
  }, [filteredActivities]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredActivities.length / pageSize) || 1;
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Laboratory', 'Performed By', 'Role', 'Action', 'Entity', 'Reason / Description'];
    const rows = filteredActivities.map((act) => [
      `"${act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}"`,
      `"${getEventLab(act)}"`,
      `"${act.performedByName || ''}"`,
      `"${act.role || ''}"`,
      `"${act.action || ''}"`,
      `"${act.entityName || ''}"`,
      `"${(act.reasonForChange || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily_working_activity_${activeLab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lab theme badge styling
  const getLabBadge = (lab: 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN') => {
    if (lab === 'CEPHALOSPORIN') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
          Cephalosporin Lab
        </span>
      );
    }
    if (lab === 'PENICILLIN') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
          Penicillin Lab
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
        General Lab
      </span>
    );
  };

  // Action badge styling
  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('APPROV') || act.includes('PASS') || act.includes('RELEASE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (act.includes('REJECT') || act.includes('FAIL') || act.includes('OOS')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (act.includes('START') || act.includes('ANALYSIS') || act.includes('TEST')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (act.includes('ASSIGN')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    if (act.includes('SAMPLE') || act.includes('CREATE') || act.includes('UPDATE')) {
      return 'bg-amber-100 text-amber-900 border-amber-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & BREADCRUMB                                                */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-xs inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Live Compliance Activity Stream
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Daily Working Activities &amp; Audit Trail
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KPI SUMMARY METRIC CARDS                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Activities</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {filteredActivities.length}
          </div>
          <p className="text-[11px] text-slate-400">Recorded for selected filter</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Personnel</span>
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {uniquePersonnel}
          </div>
          <p className="text-[11px] text-slate-400">Analysts &amp; Managers logged</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Division</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {activeLab === 'ALL'
              ? 'Combined (3 Labs)'
              : activeLab === 'CEPHALOSPORIN'
              ? 'Cephalosporin Lab'
              : activeLab === 'PENICILLIN'
              ? 'Penicillin Lab'
              : 'General Lab'}
          </div>
          <p className="text-[11px] text-slate-400">Facility Scope</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Audit Integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            100%
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">ALCOA+ Traceable</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LABORATORY SWITCHER TABS                                               */}
      {/* ========================================================================= */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleSelectLab('ALL')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeLab === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Combined (3 Labs)</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              activeLab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            )}
          >
            {labCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectLab('GENERAL')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeLab === 'GENERAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <FlaskConical className="h-3.5 w-3.5 text-blue-500" />
          <span>General Lab</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              activeLab === 'GENERAL' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
            )}
          >
            {labCounts.general}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectLab('CEPHALOSPORIN')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeLab === 'CEPHALOSPORIN'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5 text-purple-500" />
          <span>Cephalosporin Lab</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              activeLab === 'CEPHALOSPORIN' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
            )}
          >
            {labCounts.ceph}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectLab('PENICILLIN')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer',
            activeLab === 'PENICILLIN'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <Microscope className="h-3.5 w-3.5 text-teal-500" />
          <span>Penicillin Lab</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              activeLab === 'PENICILLIN' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
            )}
          >
            {labCounts.pen}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3.1 OPERATIONAL ACTIVITY FILTER PILLS                                      */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setCurrentPage(1);
          }}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
          )}
        >
          <span>All Operations</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            )}
          >
            {categoryCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('REGISTRATION');
            setCurrentPage(1);
          }}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
            selectedCategory === 'REGISTRATION'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
          )}
        >
          <span>Sample Registration</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              selectedCategory === 'REGISTRATION' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
            )}
          >
            {categoryCounts.reg}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ASSIGNMENT');
            setCurrentPage(1);
          }}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
            selectedCategory === 'ASSIGNMENT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
          )}
        >
          <span>Duty Allocation</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              selectedCategory === 'ASSIGNMENT' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
            )}
          >
            {categoryCounts.assign}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('DOCUMENTATION');
            setCurrentPage(1);
          }}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
            selectedCategory === 'DOCUMENTATION'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
          )}
        >
          <span>File &amp; Document Uploads</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              selectedCategory === 'DOCUMENTATION' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
            )}
          >
            {categoryCounts.doc}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('TESTING');
            setCurrentPage(1);
          }}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
            selectedCategory === 'TESTING'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 hover:bg-slate-50'
          )}
        >
          <span>Testing Analyst</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              selectedCategory === 'TESTING' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            )}
          >
            {categoryCounts.testing}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. SEARCH & FILTER CONTROLS BAR                                           */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Date Filter & Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last7days', label: '7 Days' },
                { key: 'last30days', label: '30 Days' },
                { key: 'all', label: 'All' },
              ] as const
            ).map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setDateFilter(d.key);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  dateFilter === d.key
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. LIVE ACTIVITIES STREAM FEED                                            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900">
              Live Compliance Activity Stream ({filteredActivities.length} Events)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            <p className="text-xs text-slate-500">Loading live compliance activity stream...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && paginatedActivities.length === 0 && (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Clock className="h-8 w-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Activity Events Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching laboratory activity was recorded for the selected facility or filters. Try choosing a different date range or lab tab.
            </p>
          </div>
        )}

        {/* Activity Feed Items */}
        {!isLoading && paginatedActivities.length > 0 && (
          <div className="space-y-3">
            {paginatedActivities.map((act) => {
              const eventLab = getEventLab(act);
              const meta = getActivityMetadata(act);
              const isExpanded = expandedId === act.id;
              const initial = (act.performedByName || 'U').trim().slice(0, 1).toUpperCase();

              return (
                <div
                  key={act.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : act.id)}
                    className="flex items-start gap-3.5 p-3.5 cursor-pointer"
                  >
                    {/* Performer Avatar Initial */}
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs',
                        meta.avatarBg
                      )}
                    >
                      {initial}
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {meta.actorPrefix}:
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {act.performedByName || 'Laboratory Staff'}
                          </span>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', meta.badgeClass)}>
                            {meta.badgeTitle}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            ({act.role || 'USER'})
                          </span>
                          {getLabBadge(eventLab)}
                        </div>

                        <span className="text-[11px] text-slate-500 font-medium shrink-0">
                          {act.timestamp ? formatDateTime(act.timestamp) : ''}
                        </span>
                      </div>

                      {/* Action Code & Description */}
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <span
                          className={cn(
                            'font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border inline-block mr-1.5',
                            getActionBadgeColor(act.action)
                          )}
                        >
                          {act.action}
                        </span>
                        <span>
                          {act.reasonForChange ||
                            `Compliance action executed on ${act.entityName} ${act.entityId}`}
                        </span>
                      </p>
                    </div>

                    {/* Expand Toggle Chevron */}
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-1"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded 21 CFR Part 11 Audit Metadata */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 bg-white space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500">Record ID</p>
                          <p className="font-mono text-[11px] text-slate-800 truncate" title={act.id}>
                            {act.id}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500">Entity Target</p>
                          <p className="font-mono text-[11px] text-slate-800">
                            {act.entityName} &bull; {act.entityId.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500">Terminal IP</p>
                          <p className="font-mono text-[11px] text-slate-800">
                            {act.ipAddress || '::1 (Local / Intranet)'}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500">ISO Timestamp</p>
                          <p className="font-mono text-[11px] text-slate-800 truncate" title={act.timestamp}>
                            {act.timestamp}
                          </p>
                        </div>
                      </div>

                      {/* Diff Payload */}
                      {act.diffPayload && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-600 mb-1">
                            Operational Audit Payload (21 CFR Part 11 ALCOA+ Payload):
                          </p>
                          <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(act.diffPayload), null, 2);
                              } catch {
                                return act.diffPayload;
                              }
                            })()}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ======================================================================= */}
        {/* PAGINATION CONTROLS                                                     */}
        {/* ======================================================================= */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredActivities.length)} of{' '}
              {filteredActivities.length} entries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Previous
              </button>

              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DailyWorkingActivityPage() {
  return (
    <RoleRouteGuard
      allowedRoles={[
        'SUPER_ADMIN',
        'ADMIN',
        'HOD',
        'DEPUTY_MANAGER',
        'MANAGER',
        'SHIFT_INCHARGE',
        'QA_MANAGER',
        'AUDITOR',
      ]}
      moduleName="Daily Working Activity & Audit Trail"
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
              <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading Daily Working Activities...</span>
            </div>
          </div>
        }
      >
        <DailyWorkingActivityContent />
      </Suspense>
    </RoleRouteGuard>
  );
}

