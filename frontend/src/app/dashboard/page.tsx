'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { auditService } from '@/services/audit.service';
import { userService } from '@/services/user.service';
import { parseAuditItem, FormattedAuditItem } from '@/lib/auditFormatter';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  formatLiveDate,
  formatShortLiveDate,
  formatLiveClock,
  getRecentDays,
} from '@/lib/date';
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Calendar,
  ChevronDown,
  GitBranch,
  Target,
  Bell,
  Check,
  Eye,
  QrCode,
  FileEdit,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  Microscope,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  X,
  Boxes,
  Users,
  Beaker,
  UserCheck,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Search,
  LogIn,
  LogOut,
  Radio,
  Activity,
  RefreshCw,
  Gauge,
  LayoutDashboard,
} from 'lucide-react';
import { isAssignedToUser, useAllAnalysts } from '@/lib/analysts';
import { LabOperationsView } from '@/components/dashboard/LabOperationsView';
import { SuperAdminDashboard } from '@/components/dashboard/roles/SuperAdminDashboard';
import { AdminDashboard } from '@/components/dashboard/roles/AdminDashboard';
import { DocumentationManagerDashboard } from '@/components/dashboard/roles/DocumentationManagerDashboard';
import { DeputyManagerDashboard } from '@/components/dashboard/roles/DeputyManagerDashboard';
import { AnalystDashboard } from '@/components/dashboard/roles/AnalystDashboard';
import { SampleRegistrationDashboard } from '@/components/dashboard/roles/SampleRegistrationDashboard';

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'lab-operations'>(
    tabParam === 'lab-operations' ? 'lab-operations' : 'overview'
  );

  useEffect(() => {
    if (tabParam === 'lab-operations') {
      setActiveTab('lab-operations');
    } else if (tabParam === 'overview') {
      setActiveTab('overview');
    }
  }, [tabParam]);

  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const userRole = (user?.role || 'QC_ANALYST').toUpperCase();
  const isSuperAdminOnly = userRole === 'SUPER_ADMIN';

  // Role preview switcher strictly for SUPER_ADMIN
  const [previewRole, setPreviewRole] = useState<string>(userRole);

  useEffect(() => {
    if (user?.role) {
      setPreviewRole(user.role.toUpperCase());
    }
  }, [user?.role]);

  // Only SUPER_ADMIN can preview other roles; regular ADMIN/HOD always sees their own role
  const effectiveRole = isSuperAdminOnly ? previewRole : userRole;

  function renderRoleDashboard(roleKey: string) {
    // SECURITY GUARD: Non-superadmin users can NEVER view SuperAdminDashboard
    if (roleKey === 'SUPER_ADMIN' && !isSuperAdminOnly) {
      return <AdminDashboard />;
    }
    switch (roleKey) {
      case 'SUPER_ADMIN':
        return isSuperAdminOnly ? <SuperAdminDashboard /> : <AdminDashboard />;
      case 'ADMIN':
      case 'HOD':
        return <AdminDashboard />;
      case 'DOCUMENTATION_MANAGER':
        return <DocumentationManagerDashboard />;
      case 'DEPUTY_MANAGER':
        return <DeputyManagerDashboard />;
      case 'LAB_TECHNICIAN':
        return <SampleRegistrationDashboard />;
      case 'ANALYST':
      case 'QC_ANALYST':
      case 'TESTING_ANALYST':
      default:
        return <AnalystDashboard />;
    }
  }

  // Dynamic real-time analysts list (combining DB users & static analysts)
  const { analysts: allAnalysts, refetch: refetchAnalysts } = useAllAnalysts();

  // Dashboard Add User modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    fullName: '',
    email: '',
    username: '',
    employeeId: '',
    department: 'Quality Control',
    role: 'QC_ANALYST',
    assignedLab: 'GENERAL',
    password: '',
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSuccess, setAddUserSuccess] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Dashboard Personnel Directory Filter state
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelLabFilter, setPersonnelLabFilter] = useState<'ALL' | 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN'>('ALL');
  const [personnelPage, setPersonnelPage] = useState(1);
  const PERSONNEL_PER_PAGE = 8;

  const filteredPersonnel = useMemo(() => {
    return allAnalysts.filter((a) => {
      const q = personnelSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.role && a.role.toLowerCase().includes(q));

      const matchesLab =
        personnelLabFilter === 'ALL' ||
        a.lab === 'ALL' ||
        a.lab === personnelLabFilter;

      return matchesSearch && matchesLab;
    });
  }, [allAnalysts, personnelSearch, personnelLabFilter]);

  const paginatedPersonnel = useMemo(() => {
    const start = (personnelPage - 1) * PERSONNEL_PER_PAGE;
    return filteredPersonnel.slice(start, start + PERSONNEL_PER_PAGE);
  }, [filteredPersonnel, personnelPage]);

  const totalPersonnelPages = Math.ceil(filteredPersonnel.length / PERSONNEL_PER_PAGE) || 1;

  const handleCreateDashboardUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    if (!addUserForm.fullName.trim() || !addUserForm.employeeId.trim() || !addUserForm.password) {
      setAddUserError('Please fill in all required fields marked with *.');
      return;
    }
    if (addUserForm.password.length < 6) {
      setAddUserError('Password must be at least 6 characters long.');
      return;
    }
    setIsAddingUser(true);
    try {
      const cleanEmpId = addUserForm.employeeId.trim().toUpperCase();
      const cleanUsername = (addUserForm.username || cleanEmpId).trim().toLowerCase().replace(/\s+/g, '');
      const cleanEmail = addUserForm.email?.trim() || `${(addUserForm.username || cleanEmpId).toLowerCase().replace(/[^a-z0-9]/g, '')}@citypharma.local`;

      const payload = {
        ...addUserForm,
        fullName: addUserForm.fullName.trim(),
        email: cleanEmail,
        employeeId: cleanEmpId,
        username: cleanUsername,
      };

      const created = await userService.create(payload as any);
      await queryClient.invalidateQueries({ queryKey: ['users-list'] });
      await queryClient.invalidateQueries({ queryKey: ['users-list-for-tasks'] });
      refetchAnalysts();

      setIsAddUserModalOpen(false);
      setAddUserForm({
        fullName: '',
        email: '',
        username: '',
        employeeId: '',
        department: 'Quality Control',
        role: 'QC_ANALYST',
        assignedLab: 'GENERAL',
        password: '',
      });
      // Highlight new user in the Personnel Directory
      setPersonnelSearch(created.fullName);
      setPersonnelLabFilter('ALL');
      setPersonnelPage(1);
      setAddUserSuccess(`User "${created.fullName}" (@${created.username || created.employeeId}) created successfully! They are now listed in Laboratory Personnel Directory below and immediately selectable for task assignment.`);
      setTimeout(() => setAddUserSuccess(null), 10000);
    } catch (err: any) {
      setAddUserError(err?.message || 'Failed to create user. Please check your entries.');
    } finally {
      setIsAddingUser(false);
    }
  };

  // User role classification
  const isSuperAdmin = user?.role === 'ADMIN' || user?.role === 'HOD' || (user?.role as string) === 'SUPER_ADMIN';
  const isManagerOrSupervisor = isSuperAdmin || user?.role === 'DEPUTY_MANAGER';
  const isAnalyst = !isManagerOrSupervisor;

  // Analyst filter for Super Admin / Managers ('ALL' or employeeId / username)
  const [selectedAnalystFilter, setSelectedAnalystFilter] = useState<string>('ALL');

  // Stored tasks synchronization from localStorage (assigned from /tasks)
  const [storedTasks, setStoredTasks] = useState<any[]>([]);

  useEffect(() => {
    const syncTasks = () => {
      try {
        const raw = localStorage.getItem('city_pharma_lims_tasks');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setStoredTasks(parsed);
        }
      } catch (e) {}
    };
    syncTasks();
    window.addEventListener('storage', syncTasks);
    window.addEventListener('lims-tasks-updated', syncTasks);
    return () => {
      window.removeEventListener('storage', syncTasks);
      window.removeEventListener('lims-tasks-updated', syncTasks);
    };
  }, []);

  // Live real-time clock state (updates every second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedRangeKey, setSelectedRangeKey] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');
  const [activeDateRange, setActiveDateRange] = useState<string>('');

  useEffect(() => {
    setActiveDateRange(formatLiveDate(new Date()));
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);



  // Real database metrics query
  const { data: metrics } = useQuery({
    queryKey: ['sampling-metrics'],
    queryFn: () => samplingService.getMetrics(),
  });

  // Real recent samples query to display latest created samples
  const { data: recentSamplesData } = useQuery({
    queryKey: ['dashboard-recent-samples'],
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
  });

  // Dedicated query to fetch ALL active expedited (Immediate / STAT & Urgent) samples
  const { data: expeditedSamplesData } = useQuery({
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

  // Real active batches query
  const { data: batchesData } = useQuery({
    queryKey: ['dashboard-batches-list'],
    queryFn: () => api.get<any[]>('/batches'),
  });

  const activeBatchesCount = useMemo(() => {
    if (metrics?.activeBatches !== undefined) {
      return metrics.activeBatches;
    }
    if (batchesData) {
      const list = Array.isArray(batchesData) ? batchesData : (batchesData as any)?.data || [];
      const active = list.filter((b: any) => b.status === 'QUARANTINE' || b.status === 'CONDITIONAL' || b.status !== 'RELEASED');
      return active.length || list.length;
    }
    return 0;
  }, [batchesData, metrics]);

  // Real users count query
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
  });

  const usersCount = useMemo(() => {
    return Array.isArray(usersData) ? usersData.length : 0;
  }, [usersData]);

  // Dynamically compute the last 7 calendar days leading to today
  const recentDays = useMemo(() => getRecentDays(7), [currentTime]);

  // Real sample records list from API
  const realSamplesList = useMemo(() => {
    if (!recentSamplesData) return [];
    return Array.isArray(recentSamplesData)
      ? recentSamplesData
      : (recentSamplesData as any)?.data || [];
  }, [recentSamplesData]);

  // Total samples count across all registries
  const totalSamplesCount = useMemo(() => {
    if (metrics?.total !== undefined) return metrics.total;
    return realSamplesList.length;
  }, [metrics?.total, realSamplesList.length]);

  // 7-day grouped bar chart data dynamically computed from real database samples
  const weeklyOverviewData = useMemo(() => {
    return recentDays.map((d, index) => {
      const isToday = index === recentDays.length - 1;

      // Match samples by calendar date (using d.fullDate)
      const daySamples = realSamplesList.filter((s: any) => {
        const rawDate = s.samplingDate || s.createdAt;
        if (!rawDate) return false;
        try {
          const sampleDate = new Date(rawDate);
          return sampleDate.toDateString() === d.fullDate.toDateString();
        } catch {
          return false;
        }
      });

      const dayReceived = daySamples.filter((s: any) => {
        const st = (s.status || '').toUpperCase();
        return st === 'RECEIVED' || st.includes('ASSIGNMENT') || st.includes('QUEUED');
      }).length;

      const dayProcessing = daySamples.filter((s: any) => {
        const st = (s.status || '').toUpperCase();
        return st === 'TESTING_IN_PROGRESS' || st.includes('PROGRESS') || st.includes('REVIEW');
      }).length;

      const dayCompleted = daySamples.filter((s: any) => {
        const st = (s.status || '').toUpperCase();
        return st === 'APPROVED' || st === 'RELEASED';
      }).length;

      // For today, incorporate live metrics if present
      const received = isToday && metrics?.received !== undefined ? metrics.received : dayReceived;
      const processing = isToday && metrics?.inTesting !== undefined ? metrics.inTesting : dayProcessing;
      const completed = isToday && metrics?.approved !== undefined ? metrics.approved : dayCompleted;

      return {
        day: d.day,
        date: isToday ? `${d.date} (Today)` : d.date,
        received,
        processing,
        completed,
      };
    });
  }, [recentDays, realSamplesList, metrics]);

  // Find max value in weeklyOverviewData to scale bars dynamically
  const maxWeeklyVal = useMemo(() => {
    const allVals = weeklyOverviewData.flatMap((d) => [d.received, d.processing, d.completed]);
    const max = Math.max(0, ...allVals);
    if (max <= 10) return 10;
    if (max <= 25) return 25;
    if (max <= 50) return 50;
    if (max <= 100) return 100;
    return Math.ceil(max / 50) * 50;
  }, [weeklyOverviewData]);

  // Dynamic 6 gridlines for the grouped bar chart
  const gridLabels = useMemo(() => {
    return [
      maxWeeklyVal,
      Math.round(maxWeeklyVal * 0.8),
      Math.round(maxWeeklyVal * 0.6),
      Math.round(maxWeeklyVal * 0.4),
      Math.round(maxWeeklyVal * 0.2),
      0,
    ];
  }, [maxWeeklyVal]);

  // Samples by Type breakdown dynamically computed from real database samples
  const sampleTypes = useMemo(() => {
    const categories = [
      {
        key: 'RAW_MATERIAL',
        label: 'Raw Material',
        color: '#0088FE',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('RAW') || t === 'RM';
        },
      },
      {
        key: 'PACKAGING_MATERIAL',
        label: 'Packaging Material',
        color: '#00C49F',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('PACK') || t === 'PM';
        },
      },
      {
        key: 'IN_PROCESS',
        label: 'In-Process',
        color: '#06B6D4',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('PROCESS') || t === 'IP';
        },
      },
      {
        key: 'FINISHED_PRODUCT',
        label: 'Finished Product',
        color: '#8884D8',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return (
            t.includes('FINISH') ||
            t === 'FP' ||
            (!t.includes('RAW') &&
              !t.includes('PACK') &&
              !t.includes('PROCESS') &&
              !t.includes('STABIL') &&
              !t.includes('MICRO') &&
              realSamplesList.length > 0)
          );
        },
      },
      {
        key: 'STABILITY',
        label: 'Stability',
        color: '#FFBB28',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('STABIL') || t === 'STB';
        },
      },
      {
        key: 'MICROBIOLOGY',
        label: 'Microbiology',
        color: '#EC4899',
        match: (s: any) => {
          const t = (s.stageType || s.sampleType || '').toUpperCase();
          return t.includes('MICRO') || t === 'MB';
        },
      },
    ];

    const total = realSamplesList.length;

    return categories.map((cat) => {
      const count = realSamplesList.filter(cat.match).length;
      const pctNum = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        label: cat.label,
        count,
        pct: `${pctNum}%`,
        color: cat.color,
        ratio: total > 0 ? count / total : 0,
      };
    });
  }, [realSamplesList]);

  // Compute SVG arc slices dynamically for the donut chart
  const donutSlices = useMemo(() => {
    if (totalSamplesCount === 0) return [];

    let accumulated = 0;
    const C = 238.76;

    return sampleTypes
      .filter((t) => t.count > 0)
      .map((t) => {
        const dashLength = t.ratio * C;
        const dasharray = `${dashLength.toFixed(1)} ${(C - dashLength).toFixed(1)}`;
        const dashoffset = (-accumulated).toFixed(1);
        accumulated += dashLength;

        return {
          label: t.label,
          color: t.color,
          dasharray,
          dashoffset,
        };
      });
  }, [sampleTypes, totalSamplesCount]);

  // Interface for dashboard pending sample items
  interface DashboardPendingSample {
    uuid: string;
    id: string;
    type: string;
    product: string;
    batch: string;
    date: string;
    status: string;
    rawStatus: string;
    assignedToId?: string | null;
    assignedTo?: any;
    assignedAnalystName?: string;
    assignedAnalystId?: string;
    assignedAnalystUsername?: string;
    testProtocol?: string;
    version?: number;
    priority?: string;
    rawSample?: any;
    statusColor: string;
    labId: string;
    labName: string;
    labBadgeColor: string;
  }

  // Real database Pending Samples Table data with Laboratory mapping & Analyst Work Isolation
  const pendingSamples = useMemo<DashboardPendingSample[]>(() => {
    const realList = Array.isArray(recentSamplesData)
      ? recentSamplesData
      : (recentSamplesData as any)?.data || [];

    // Map database samples
    const mappedRealSamples: DashboardPendingSample[] = realList.map((s: any): DashboardPendingSample => {
      // Detect analytical laboratory: 'sef' | 'penicillin' | 'general'
      let labId = 'general';
      let labName = 'General Lab';
      let labBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

      const labType = (s.laboratoryType || s.laboratory?.code || '').toUpperCase();
      const labText = (s.laboratory?.name || s.samplingLocation || '').toUpperCase();

      if (labType === 'SAF' || labType === 'SEF' || labType === 'CP' || labText.includes('SAF') || labText.includes('SEF') || labText.includes('CEPHALOSPORIN')) {
        labId = 'cephalosporin';
        labName = 'Cephalosporin Lab';
        labBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      } else if (labType === 'PENICILLIN' || labType === 'PEN' || labText.includes('PENICILLIN')) {
        labId = 'penicillin';
        labName = 'Penicillin Lab';
        labBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
      } else {
        labId = 'general';
        labName = 'General Lab';
        labBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
      }

      const sampleIdKey = (s.sampleCode || s.sampleId || s.accessionNo || s.id || '').toUpperCase();

      // Look up matching assignment from storedTasks (from /tasks workflow)
      const matchingTask = storedTasks.find((t: any) => {
        const tSampleId = (t.sampleId || '').toUpperCase();
        const tAccession = (t.accessionNo || '').toUpperCase();
        return tSampleId === sampleIdKey || (tAccession && tAccession === sampleIdKey);
      });

      // Find assigned analyst details
      let assignedAnalystName = matchingTask?.assignedAnalystName;
      let assignedAnalystId = matchingTask?.assignedAnalystId;
      let assignedAnalystUsername = matchingTask?.assignedAnalystUsername;

      if (!assignedAnalystName && s.assignedTo) {
        assignedAnalystName = s.assignedTo.fullName || s.assignedTo.name;
        assignedAnalystId = s.assignedTo.employeeId || s.assignedTo.id;
        assignedAnalystUsername = s.assignedTo.username;
      }

      if (!assignedAnalystUsername && assignedAnalystId) {
        const found = allAnalysts.find((a) => a.id === assignedAnalystId || a.name === assignedAnalystName);
        if (found) {
          assignedAnalystUsername = found.username;
          if (!assignedAnalystName) assignedAnalystName = found.name;
        }
      }

      const testProtocol = matchingTask?.testProtocol || 'Compendial Potency & Assay';

      return {
        uuid: s.id,
        id: s.sampleCode || s.sampleId || s.accessionNo || s.id || 'SMP-0001',
        type: s.stageType || s.sampleType || 'Finished Product',
        product: s.nomenclature || s.materialName || 'Pharmaceutical Sample',
        batch: s.lotNumber || s.batchLotNumber || s.batch?.batchNumber || s.batchNumber || 'CP-B9021',
        date: s.samplingDate ? formatShortLiveDate(new Date(s.samplingDate)) : formatShortLiveDate(),
        status:
          matchingTask?.status === 'COMPLETED'
            ? 'Completed'
            : s.status === 'TESTING_IN_PROGRESS' || matchingTask?.status === 'IN_PROGRESS'
            ? 'In Process'
            : s.status
            ? s.status.replace(/_/g, ' ')
            : 'Pending',
        rawStatus: matchingTask?.status || s.status || 'PENDING_ASSIGNMENT',
        assignedToId: s.assignedToId || assignedAnalystId,
        assignedTo: s.assignedTo,
        assignedAnalystName,
        assignedAnalystId,
        assignedAnalystUsername,
        testProtocol,
        version: s.version,
        priority: matchingTask?.priority || s.priority || 'ROUTINE',
        rawSample: s,
        statusColor:
          s.status === 'APPROVED' || matchingTask?.status === 'COMPLETED'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : s.status === 'REJECTED'
            ? 'bg-rose-100 text-rose-800 border-rose-200'
            : s.status === 'TESTING_IN_PROGRESS' || matchingTask?.status === 'IN_PROGRESS'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-amber-100 text-amber-800 border-amber-200',
        labId,
        labName,
        labBadgeColor,
      };
    });

    // Also include synthetic / stored tasks that might not be in real database samples
    const realSampleKeys = new Set(mappedRealSamples.map((s) => s.id.toUpperCase()));
    const additionalTasks: DashboardPendingSample[] = [];

    for (const t of storedTasks) {
      const tSampleId = (t.sampleId || '').toUpperCase();
      if (tSampleId && !realSampleKeys.has(tSampleId)) {
        let labId = 'general';
        let labName = 'General Lab';
        let labBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        if (t.laboratory === 'CEPHALOSPORIN') {
          labId = 'cephalosporin';
          labName = 'Cephalosporin Lab';
          labBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        } else if (t.laboratory === 'PENICILLIN') {
          labId = 'penicillin';
          labName = 'Penicillin Lab';
          labBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        }

        const foundAnalyst = allAnalysts.find((a) => a.id === t.assignedAnalystId || a.name === t.assignedAnalystName);

        additionalTasks.push({
          uuid: t.id,
          id: t.sampleId,
          type: t.stageType || (t.section === 'semi-base' ? 'Raw Material' : 'Finished Product'),
          product: t.sampleName || 'Pharmaceutical Sample',
          batch: t.lotNumber || '—',
          date: t.samplingDate ? formatShortLiveDate(new Date(t.samplingDate)) : formatShortLiveDate(),
          status: t.status === 'COMPLETED' ? 'Completed' : t.status === 'IN_PROGRESS' ? 'In Process' : 'Assigned',
          rawStatus: t.status || 'ASSIGNED',
          assignedToId: t.assignedAnalystId,
          assignedAnalystName: t.assignedAnalystName,
          assignedAnalystId: t.assignedAnalystId,
          assignedAnalystUsername: foundAnalyst?.username,
          testProtocol: t.testProtocol,
          priority: t.priority || 'ROUTINE',
          statusColor:
            t.status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : t.status === 'IN_PROGRESS'
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-indigo-100 text-indigo-800 border-indigo-200',
          labId,
          labName,
          labBadgeColor,
        });
      }
    }

    const combined = [...mappedRealSamples, ...additionalTasks];

    // ROLE-BASED WORKLOAD ISOLATION:
    // 1. If logged in as Analyst: Show ONLY samples assigned to this specific analyst!
    if (isAnalyst && user) {
      return combined.filter((s) => {
        if (isAssignedToUser(s, user)) return true;
        if (s.rawSample && isAssignedToUser(s.rawSample, user)) return true;

        const userEmpId = (user.employeeId || '').toUpperCase();
        const userUsername = (user.username || '').toLowerCase();
        const userFullName = (user.fullName || '').toLowerCase();

        if (s.assignedAnalystId && userEmpId && s.assignedAnalystId.toUpperCase() === userEmpId) return true;
        if (s.assignedAnalystUsername && userUsername && s.assignedAnalystUsername.toLowerCase() === userUsername) return true;
        if (s.assignedAnalystName && userFullName && (s.assignedAnalystName.toLowerCase().includes(userFullName) || userFullName.includes(s.assignedAnalystName.toLowerCase()))) return true;

        return false;
      });
    }

    // 2. If Super Admin or Manager: Filter by selected analyst dropdown if chosen
    if (selectedAnalystFilter !== 'ALL') {
      return combined.filter((s) => {
        const found = allAnalysts.find((a) => a.id === selectedAnalystFilter);
        const matchId = s.assignedAnalystId === selectedAnalystFilter;
        const matchUsername = found && s.assignedAnalystUsername?.toLowerCase() === found.username.toLowerCase();
        const matchName = found && s.assignedAnalystName?.toLowerCase().includes(found.name.toLowerCase());
        return matchId || matchUsername || matchName;
      });
    }

    // Default: Sort pending items first
    return combined.sort((a, b) => {
      const aPending = a.rawStatus !== 'APPROVED' && a.rawStatus !== 'COMPLETED' ? 1 : 0;
      const bPending = b.rawStatus !== 'APPROVED' && b.rawStatus !== 'COMPLETED' ? 1 : 0;
      return bPending - aPending;
    });
  }, [recentSamplesData, storedTasks, isAnalyst, user, selectedAnalystFilter]);

  // Analyst-tailored workload metrics
  const analystMetrics = useMemo(() => {
    if (!isAnalyst) return null;
    const total = pendingSamples.length;
    const inAnalysis = pendingSamples.filter(
      (s) => s.rawStatus === 'TESTING_IN_PROGRESS' || s.rawStatus === 'IN_PROGRESS' || s.rawStatus === 'IN_ANALYSIS'
    ).length;
    const queued = pendingSamples.filter(
      (s) => s.rawStatus === 'RECEIVED' || s.rawStatus === 'PENDING' || s.rawStatus === 'PENDING_ASSIGNMENT' || s.rawStatus === 'ASSIGNED'
    ).length;
    const approved = pendingSamples.filter(
      (s) => s.rawStatus === 'APPROVED' || s.rawStatus === 'COMPLETED' || s.rawStatus === 'VERIFIED'
    ).length;
    const urgent = pendingSamples.filter(
      (s) => s.priority === 'STAT' || s.priority === 'URGENT'
    ).length;
    return { total, inAnalysis, queued, approved, urgent };
  }, [isAnalyst, pendingSamples]);

  // Pagination for Pending Samples table (10 items per page)
  const [samplePage, setSamplePage] = useState(1);
  const samplePageSize = 10;

  const totalSamplePages = useMemo(() => {
    return Math.max(1, Math.ceil(pendingSamples.length / samplePageSize));
  }, [pendingSamples.length, samplePageSize]);

  const paginatedSamples = useMemo(() => {
    const start = (samplePage - 1) * samplePageSize;
    return pendingSamples.slice(start, start + samplePageSize);
  }, [pendingSamples, samplePage, samplePageSize]);


  // Real-time live audit logs from database (refreshes every 3 seconds for instant synchronization)
  const {
    data: rawAuditLogs,
    isLoading: isAuditLoading,
    isFetching: isAuditFetching,
    refetch: refetchAuditLogs,
  } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => auditService.getAll({ limit: 100 }),
    refetchInterval: 3000,
  });

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const handleRefreshAuditLogs = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    setJustRefreshed(false);
    try {
      await Promise.allSettled([
        refetchAuditLogs(),
        queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-trail'] }),
        queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-recent-samples'] }),
        queryClient.invalidateQueries({ queryKey: ['active-expedited-urgent-samples'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-batches-list'] }),
        queryClient.invalidateQueries({ queryKey: ['users-list'] }),
      ]);
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 2500);
    } catch (err) {
      console.error('Failed to refresh dashboard audit logs:', err);
    } finally {
      setTimeout(() => {
        setIsManualRefreshing(false);
      }, 600);
    }
  };

  const [auditPage, setAuditPage] = useState(1);
  const auditPageSize = 10;
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'ALL' | 'LOGINS' | 'TASKS' | 'SAMPLES' | 'TESTS' | 'USERS'>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const formattedLogs: FormattedAuditItem[] = useMemo(() => {
    if (!rawAuditLogs) return [];
    const list = Array.isArray(rawAuditLogs) ? rawAuditLogs : (rawAuditLogs as any).data || [];
    return list.map(parseAuditItem);
  }, [rawAuditLogs]);

  // Activity category counts for filter buttons
  const auditCategoryCounts = useMemo(() => {
    const counts = {
      ALL: formattedLogs.length,
      LOGINS: 0,
      TASKS: 0,
      SAMPLES: 0,
      TESTS: 0,
      USERS: 0,
    };
    for (const l of formattedLogs) {
      if (l.actionRaw === 'USER_LOGIN' || l.actionRaw === 'USER_LOGOUT') counts.LOGINS++;
      else if (l.actionRaw === 'TASK_ASSIGNED' || l.actionRaw === 'TASK_STATUS_UPDATED') counts.TASKS++;
      else if (
        l.actionRaw === 'SAMPLE_ACCESSIONED' ||
        l.actionRaw === 'SAMPLE_UPDATED' ||
        l.actionRaw === 'SAMPLE_STATUS_CHANGED' ||
        l.actionRaw === 'SUBMISSION_STATUS_UPDATED' ||
        l.actionRaw === 'SAMPLE_SUBMITTED_TO_WORKFLOW' ||
        l.actionRaw === 'CRITICAL_IMMEDIATE_SAMPLE' ||
        l.actionRaw === 'URGENT_PRIORITY_SAMPLE'
      ) counts.SAMPLES++;
      else if (
        l.actionRaw === 'TEST_RESULT_RECORDED' ||
        l.actionRaw === 'WORKSHEET_COMPLETED' ||
        l.entityName === 'TestWorksheet' ||
        l.entityName === 'Test'
      ) counts.TESTS++;
      else if (
        l.actionRaw === 'USER_CREATED' ||
        l.actionRaw === 'USER_ROLE_UPDATED' ||
        l.actionRaw === 'PASSWORD_RESET' ||
        l.actionRaw === 'USER_STATUS_TOGGLED'
      ) counts.USERS++;
    }
    return counts;
  }, [formattedLogs]);

  // Filtered logs by category and search
  const displayedLogs = useMemo(() => {
    let result = formattedLogs;

    // Filter by Category
    if (auditCategoryFilter === 'LOGINS') {
      result = result.filter((l) => l.actionRaw === 'USER_LOGIN' || l.actionRaw === 'USER_LOGOUT');
    } else if (auditCategoryFilter === 'TASKS') {
      result = result.filter((l) => l.actionRaw === 'TASK_ASSIGNED' || l.actionRaw === 'TASK_STATUS_UPDATED');
    } else if (auditCategoryFilter === 'SAMPLES') {
      result = result.filter(
        (l) =>
          l.actionRaw === 'SAMPLE_ACCESSIONED' ||
          l.actionRaw === 'SAMPLE_UPDATED' ||
          l.actionRaw === 'SAMPLE_STATUS_CHANGED' ||
          l.actionRaw === 'SUBMISSION_STATUS_UPDATED' ||
          l.actionRaw === 'SAMPLE_SUBMITTED_TO_WORKFLOW' ||
          l.actionRaw === 'CRITICAL_IMMEDIATE_SAMPLE' ||
          l.actionRaw === 'URGENT_PRIORITY_SAMPLE'
      );
    } else if (auditCategoryFilter === 'TESTS') {
      result = result.filter(
        (l) =>
          l.actionRaw === 'TEST_RESULT_RECORDED' ||
          l.actionRaw === 'WORKSHEET_COMPLETED' ||
          l.entityName === 'TestWorksheet' ||
          l.entityName === 'Test'
      );
    } else if (auditCategoryFilter === 'USERS') {
      result = result.filter(
        (l) =>
          l.actionRaw === 'USER_CREATED' ||
          l.actionRaw === 'USER_ROLE_UPDATED' ||
          l.actionRaw === 'PASSWORD_RESET' ||
          l.actionRaw === 'USER_STATUS_TOGGLED'
      );
    }

    // Filter by Search Query
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.userRole.toLowerCase().includes(q) ||
          l.roleBadge.label.toLowerCase().includes(q) ||
          l.actionLabel.label.toLowerCase().includes(q) ||
          l.actionRaw.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.reason.toLowerCase().includes(q) ||
          l.entityName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [formattedLogs, auditCategoryFilter, auditSearchQuery]);

  const totalAuditPages = useMemo(() => {
    return Math.max(1, Math.ceil(displayedLogs.length / auditPageSize));
  }, [displayedLogs.length, auditPageSize]);

  const paginatedLogs = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return displayedLogs.slice(start, start + auditPageSize);
  }, [displayedLogs, auditPage, auditPageSize]);

  return (
    <div className="space-y-6 font-sans pb-10">
      
      {/* Top Header: Dashboard title, Portal navigation, and Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            title="Return to Main Operations Portal"
          >
            <span>&larr; Portal</span>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {activeTab === 'lab-operations' ? 'Lab Operations Dashboard' : 'QC Executive Dashboard'}
            </h1>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Calendar Date Range Filter Selector (Executive Overview tab) */}
          {activeTab === 'overview' && (
            <div className="relative">
              <button
                onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-xs text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                title="Current Live System Date"
              >
                <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                <span>{activeDateRange || formatLiveDate(currentTime)}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isDateMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsDateMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Calendar Range Options
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRangeKey('today');
                        setActiveDateRange(formatLiveDate(currentTime));
                        setIsDateMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center justify-between"
                    >
                      <span>Today ({formatShortLiveDate(currentTime)})</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">Active Live</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRangeKey('yesterday');
                        const y = new Date(currentTime);
                        y.setDate(y.getDate() - 1);
                        setActiveDateRange(`Yesterday (${formatShortLiveDate(y)})`);
                        setIsDateMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                    >
                      <span>Yesterday</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRangeKey('week');
                        setActiveDateRange('Last 7 Days');
                        setIsDateMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                    >
                      <span>Last 7 Days</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRangeKey('month');
                        setActiveDateRange('This Month');
                        setIsDateMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                    >
                      <span>This Month</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'lab-operations' ? (
        <LabOperationsView
          onBackToOverview={() => {
            setActiveTab('overview');
            router.replace('/dashboard', { scroll: false });
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Role Preview Bar strictly for Super Admin to switch perspective */}
          {isSuperAdminOnly && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/40 shadow-xs text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-indigo-200">Role View Switcher:</span>
                <span className="text-slate-300">Logged in as</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-mono font-bold text-[11px] border border-indigo-400/30">
                  {userRole}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 text-[11px]">Preview Dashboard As:</span>
                <select
                  value={previewRole}
                  onChange={(e) => setPreviewRole(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-400 cursor-pointer font-semibold"
                >
                  <option value="SUPER_ADMIN">1. Super Admin Dashboard</option>
                  <option value="ADMIN">2. HOD Dashboard</option>
                  <option value="DOCUMENTATION_MANAGER">3. Documentation Manager</option>
                  <option value="DEPUTY_MANAGER">4. Deputy Manager Dashboard</option>
                  <option value="LAB_TECHNICIAN">5. Sample Registration Analyst Terminal</option>
                  <option value="QC_ANALYST">6. Testing Analyst Execution Workstation</option>
                </select>
                {previewRole !== userRole && (
                  <button
                    onClick={() => setPreviewRole(userRole)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                  >
                    Reset to My Role
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Render dedicated role dashboard */}
          {renderRoleDashboard(effectiveRole)}
        </div>
      )}

      {/* Accession Modal for Quick Registration */}
      <NewSampleModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      {/* Add User Modal directly accessible from Dashboard */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          title="Add New Laboratory User"
          subtitle="Provision analytical credentials, assign laboratory department, and configure cGMP role"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateDashboardUser} className="space-y-4">
            {addUserError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{addUserError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addUserForm.fullName}
                  onChange={(e) => setAddUserForm({ ...addUserForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Ayesha Khan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addUserForm.employeeId}
                  onChange={(e) => setAddUserForm({ ...addUserForm, employeeId: e.target.value.toUpperCase() })}
                  placeholder="e.g. EMP-ANL-11"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Username <span className="text-slate-400 font-normal">(Login identifier)</span>
                </label>
                <input
                  type="text"
                  value={addUserForm.username}
                  onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })}
                  placeholder="e.g. ayesha.khan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addUserForm.department}
                  onChange={(e) => setAddUserForm({ ...addUserForm, department: e.target.value })}
                  placeholder="e.g. Quality Control Testing"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Laboratory</label>
                <select
                  value={addUserForm.assignedLab}
                  onChange={(e) => setAddUserForm({ ...addUserForm, assignedLab: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="GENERAL">General Lab</option>
                  <option value="PENICILLIN">Penicillin Lab</option>
                  <option value="CEPHALOSPORIN">Cephalosporin Lab</option>
                  <option value="ALL">All Laboratories</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  cGMP Role &amp; Permissions <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="QC_ANALYST">Testing Analyst — Worksheets &amp; Testing</option>
                  <option value="ANALYST">QC Analyst — General Testing</option>
                  <option value="DEPUTY_MANAGER">Deputy Manager — Supervision &amp; Assignment</option>
                  <option value="ADMIN">HOD (Head of Department) — Executive Authority</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  placeholder="Enter initial password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingUser}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isAddingUser ? 'Creating User...' : 'Create User Account'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
            <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading QC Dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
