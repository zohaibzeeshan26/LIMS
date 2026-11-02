'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { STATIC_ANALYSTS, isAssignedToUser, useAllAnalysts } from '@/lib/analysts';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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
    if (!addUserForm.fullName.trim() || !addUserForm.email.trim() || !addUserForm.employeeId.trim() || !addUserForm.password) {
      setAddUserError('Please fill in all required fields marked with *.');
      return;
    }
    if (addUserForm.password.length < 6) {
      setAddUserError('Password must be at least 6 characters long.');
      return;
    }
    setIsAddingUser(true);
    try {
      const cleanEmail = addUserForm.email.trim().toLowerCase();
      const cleanEmpId = addUserForm.employeeId.trim().toUpperCase();
      const cleanUsername = (addUserForm.username || cleanEmpId).trim().toLowerCase().replace(/\s+/g, '');

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
  const isSuperAdmin = user?.role === 'ADMIN' || (user?.role as string) === 'SUPER_ADMIN';
  const isManagerOrSupervisor = isSuperAdmin || user?.role === 'MANAGER' || user?.role === 'DEPUTY_MANAGER' || user?.role === 'SHIFT_INCHARGE';
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
        const found = allAnalysts.find((a) => a.id === assignedAnalystId || a.name === assignedAnalystName) || STATIC_ANALYSTS.find((a) => a.id === assignedAnalystId || a.name === assignedAnalystName);
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

        const foundAnalyst = allAnalysts.find((a) => a.id === t.assignedAnalystId || a.name === t.assignedAnalystName) || STATIC_ANALYSTS.find((a) => a.id === t.assignedAnalystId || a.name === t.assignedAnalystName);

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
        const found = allAnalysts.find((a) => a.id === selectedAnalystFilter) || STATIC_ANALYSTS.find((a) => a.id === selectedAnalystFilter);
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
  const { data: rawAuditLogs, isLoading: isAuditLoading, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => auditService.getAll({ limit: 100 }),
    refetchInterval: 3000,
  });

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
      
      {/* Top Header: Dashboard title, welcome message, and LIVE date dropdown button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              title="Return to Main Operations Portal"
            >
              <span>&larr; Portal</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              QC Executive Dashboard
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              QC Central Unit
            </span>
          </div>
        </div>

        {/* Calendar Date Range Filter Selector */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Live Date Selector Dropdown Button */}
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
        </div>
      </div>


      {/* Role-Based Workstation Banner */}
      {isAnalyst ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white shadow-lg border border-blue-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/25 text-blue-200 border border-blue-400/30">
                  Analyst Workstation
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-200 border border-white/20">
                  @{user?.username || 'analyst'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                  Active Session
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-blue-200 border border-white/10">
                  {user?.employeeId || 'ANL'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome, {user?.fullName || 'Quality Testing Analyst'}
              </h2>
              <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
                Designation: <strong className="text-white">{user?.designation || 'QC Testing Analyst'}</strong> &bull; Department: <strong className="text-white">{user?.department || 'Quality Control Laboratory'}</strong>. Showing strictly your assigned analytical samples and test worksheets.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <Link
                href="/testing"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Beaker className="h-4 w-4" />
                <span>My Test Worksheets</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
              >
                <span>+ Register Sample</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-lg border border-slate-700/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                  Super Admin Governance Portal
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-slate-200 border border-white/20">
                  @{user?.username || 'admin'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-400/30">
                  Full System Authority
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Executive Governance &bull; {user?.fullName || 'System Administrator'}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Full authority over General, Cephalosporin &amp; Penicillin laboratories, User Management CRUD, password resets, and sample assignment across 10 analyst workstations.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Add New User</span>
              </button>
              <Link
                href="/users"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Users className="h-4 w-4" />
                <span>User Management</span>
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all"
              >
                <UserCheck className="h-4 w-4" />
                <span>Assign Workload</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <span>+ Accession Sample</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Alert */}
      {addUserSuccess && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs shadow-xs animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{addUserSuccess}</span>
        </div>
      )}

      {/* Analytical Laboratory Suites Showcase (General Lab, Cephalosporin Lab, Penicillin Lab) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
              <span>Analytical Laboratory Suites</span>
            </h2>
          </div>
          <Link
            href="/samples"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View All Registries</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Lab 1: General Lab */}
          <Link
            href="/samples?lab=general"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
                  <FlaskConical className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">General Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.byLab?.general !== undefined ? metrics.byLab.general : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                GL
              </span>
            </div>
          </Link>

          {/* Lab 2: Cephalosporin Lab */}
          <Link
            href="/samples?lab=cephalosporin"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs shrink-0">
                  <ShieldAlert className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Cephalosporin Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.byLab?.cephalosporin !== undefined ? metrics.byLab.cephalosporin : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                CEPH
              </span>
            </div>
          </Link>

          {/* Lab 3: Penicillin Lab */}
          <Link
            href="/samples?lab=penicillin"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shadow-2xs shrink-0">
                  <Microscope className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Penicillin Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.byLab?.penicillin !== undefined ? metrics.byLab.penicillin : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                PEN
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Row 1: Role-Specific 5 Executive KPI Cards */}
      {isAnalyst && analystMetrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Analyst Card 1: My Assigned Samples */}
          <Link
            href="/samples"
            className="relative overflow-hidden rounded-xl bg-white border border-blue-200 hover:border-blue-400 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view all samples assigned to you"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
                  <FlaskConical className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">My Assigned Samples</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {analystMetrics.total}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                ASSIGNED
              </span>
            </div>
          </Link>

          {/* Analyst Card 2: Queued For Testing */}
          <Link
            href="/testing"
            className="relative overflow-hidden rounded-xl bg-white border border-amber-200 hover:border-amber-400 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view queued samples waiting for analysis"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs shrink-0">
                  <Clock className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Queued In Lab</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {analystMetrics.queued}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                QUEUED
              </span>
            </div>
          </Link>

          {/* Analyst Card 3: In Analysis / Testing */}
          <Link
            href="/testing"
            className="relative overflow-hidden rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view your active test worksheets"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
                  <Beaker className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">In Analysis / Testing</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {analystMetrics.inAnalysis}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                TESTING
              </span>
            </div>
          </Link>

          {/* Analyst Card 4: Approved / Completed Tests */}
          <Link
            href="/testing"
            className="relative overflow-hidden rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view verified and completed tests"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
                  <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Completed &amp; Passed</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {analystMetrics.approved}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                PASSED
              </span>
            </div>
          </Link>

          {/* Analyst Card 5: STAT & Urgent */}
          <Link
            href="/testing"
            className="relative overflow-hidden rounded-xl bg-white border border-rose-200 hover:border-rose-400 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view high-priority expedited tests"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs shrink-0">
                  <AlertTriangle className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Urgent / STAT Workload</p>
                  <p className="text-xl font-black text-rose-700 tracking-tight">
                    {analystMetrics.urgent}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                EXPEDITE
              </span>
            </div>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Card 1: Total Samples */}
          <Link
            href="/samples"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view all samples in registry"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
                  <FlaskConical className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Samples</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.total !== undefined ? metrics.total : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                ALL
              </span>
            </div>
          </Link>

          {/* Card 2: Received Samples */}
          <Link
            href="/samples?status=RECEIVED"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view all received samples"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs shrink-0">
                  <Clock className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Received Samples</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.received !== undefined ? metrics.received : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                QUEUED
              </span>
            </div>
          </Link>

          {/* Card 3: Active Batches */}
          <Link
            href="/batches"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view active batches"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs shrink-0">
                  <Boxes className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Active Batches</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {activeBatchesCount}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                MFG
              </span>
            </div>
          </Link>

          {/* Card 4: Approved Samples */}
          <Link
            href="/samples?status=APPROVED"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 p-3 shadow-2xs hover:shadow-xs transition-colors block"
            title="Click to view approved samples"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
                  <CheckCircle2 className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Approved Samples</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {metrics?.approved !== undefined ? metrics.approved : 0}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                CoA
              </span>
            </div>
          </Link>

          {/* Card 5: User Management */}
          <Link
            href="/users"
            className="relative overflow-hidden rounded-xl bg-white border border-slate-200/90 hover:border-blue-400 p-3 shadow-2xs hover:shadow-xs transition-all group block"
            title="Click to open User Management & Access Control"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">User Management</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {usersCount}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                USERS
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Row 2: Samples Overview Chart (70% width) + Samples by Type Donut (30% width) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
        
        {/* Card 1: Samples Overview (Grouped Bar Chart - 70% width) */}
        <div className="lg:col-span-7 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Samples Overview</h2>
              </div>
              
              {/* Legend matching Image 1 */}
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0066FF]" />
                  <span>Received</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00C49F]" />
                  <span>In Process</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#8884D8]" />
                  <span>Completed</span>
                </div>
              </div>
            </div>

            {/* Custom Responsive SVG Grouped Bar Chart */}
            <div className="w-full h-56 pt-2">
              <div className="h-full flex flex-col justify-between">
                
                {/* Chart Area with Gridlines */}
                <div className="relative flex-1 flex items-end justify-between px-2 pb-2 border-b border-slate-200">
                  {/* Grid lines dynamically scaled */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400">
                    {gridLabels.map((val, idx) => (
                      <div key={idx} className="border-b border-slate-100 flex items-center justify-between pr-1">
                        <span>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* 7 Grouped Bar Columns */}
                  <div className="w-full flex justify-between items-end pl-6 pr-1 z-10 h-full">
                    {weeklyOverviewData.map((item, idx) => {
                      const getBarHeight = (count: number) => {
                        if (count <= 0) return '0px';
                        return `${Math.max(4, Math.min(140, Math.round((count / maxWeeklyVal) * 140)))}px`;
                      };

                      return (
                        <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                          <div className="flex items-end gap-1.5">
                            {/* Received Bar (Blue) */}
                            <div
                              style={{ height: getBarHeight(item.received) }}
                              className="w-2.5 sm:w-3.5 bg-[#0066FF] rounded-t-xs hover:brightness-110 transition-all duration-300"
                              title={`Received: ${item.received}`}
                            />
                            {/* In Process Bar (Teal) */}
                            <div
                              style={{ height: getBarHeight(item.processing) }}
                              className="w-2.5 sm:w-3.5 bg-[#00C49F] rounded-t-xs hover:brightness-110 transition-all duration-300"
                              title={`In Process: ${item.processing}`}
                            />
                            {/* Completed Bar (Purple) */}
                            <div
                              style={{ height: getBarHeight(item.completed) }}
                              className="w-2.5 sm:w-3.5 bg-[#8884D8] rounded-t-xs hover:brightness-110 transition-all duration-300"
                              title={`Completed: ${item.completed}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-Axis Day Labels matching Image 1 */}
                <div className="flex justify-between pl-6 pr-1 pt-2 text-[10px] text-slate-500 font-medium text-center">
                  {weeklyOverviewData.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <span>{item.day}</span>
                      <span className="text-[9px] text-slate-400">{item.date}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Samples by Type (Donut Chart & Legend - 30% width) */}
        <div className="lg:col-span-3 enterprise-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h2 className="font-bold text-sm text-slate-900">Samples by Type</h2>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row items-center gap-4 xl:gap-5 pt-1">
              
              {/* Donut Graphic with center text */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {totalSamplesCount === 0 ? (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#F1F5F9"
                      strokeWidth="14"
                    />
                  ) : (
                    donutSlices.map((slice) => (
                      <circle
                        key={slice.label}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="14"
                        strokeDasharray={slice.dasharray}
                        strokeDashoffset={slice.dashoffset}
                        className="transition-all duration-500"
                      />
                    ))
                  )}
                </svg>

                {/* Center of Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-slate-800 leading-tight">
                    {totalSamplesCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Samples</span>
                </div>
              </div>

              {/* Legend List matching Image 1 */}
              <div className="flex-1 w-full space-y-1.5 text-xs">
                {sampleTypes.map((type, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-[11px] text-slate-700 font-medium">{type.label}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800">
                      {type.count} ({type.pct})
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Active Laboratory Personnel & Testing Analysts Directory Section (Visible to Administrators & Managers) */}
      {!isAnalyst && (
        <div className="w-full enterprise-card rounded-2xl p-5 shadow-xs border border-slate-200/90 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="font-bold text-sm text-slate-900 tracking-tight">
                  Active Laboratory Personnel &amp; Testing Analysts Directory
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {allAnalysts.length} Registered Staff
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live cGMP Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Provisioned analysts, assigned testing suites, cGMP role privileges, and immediate sample workload assignment shortcuts.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={personnelSearch}
                  onChange={(e) => {
                    setPersonnelSearch(e.target.value);
                    setPersonnelPage(1);
                  }}
                  placeholder="Search name, @username, EMP-ID..."
                  className="pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 w-52 sm:w-64"
                />
                {personnelSearch && (
                  <button
                    onClick={() => setPersonnelSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Lab Filter Pills */}
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                {(['ALL', 'GENERAL', 'PENICILLIN', 'CEPHALOSPORIN'] as const).map((lab) => (
                  <button
                    key={lab}
                    onClick={() => {
                      setPersonnelLabFilter(lab);
                      setPersonnelPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
                      personnelLabFilter === lab
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {lab === 'ALL' ? 'All Labs' : lab === 'GENERAL' ? 'General' : lab === 'PENICILLIN' ? 'Penicillin' : 'Cephalosporin'}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Add User</span>
              </button>

              <Link
                href="/users"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
              >
                <span>Full Directory</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Personnel Grid */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {paginatedPersonnel.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No personnel found matching &ldquo;{personnelSearch}&rdquo;</p>
                <button
                  onClick={() => {
                    setPersonnelSearch('');
                    setPersonnelLabFilter('ALL');
                  }}
                  className="mt-2 text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              paginatedPersonnel.map((analyst) => {
                const labBadge =
                  analyst.lab === 'PENICILLIN'
                    ? { label: 'Penicillin Suite', bg: 'bg-teal-50 text-teal-700 border-teal-200' }
                    : analyst.lab === 'CEPHALOSPORIN'
                    ? { label: 'Cephalosporin Suite', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
                    : analyst.lab === 'ALL'
                    ? { label: 'All Laboratories', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
                    : { label: 'General QC Lab', bg: 'bg-blue-50 text-blue-700 border-blue-200' };

                const initials = analyst.name
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CP';

                const isSuperAdminRole = analyst.role === 'ADMIN' || analyst.role === 'SUPER_ADMIN';
                const isManagerRole = analyst.role === 'MANAGER' || analyst.role === 'QA_MANAGER';

                return (
                  <div
                    key={analyst.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200/90 hover:border-indigo-300 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                              {initials}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                              {analyst.name}
                            </h3>
                            <p className="text-[10px] font-mono font-medium text-slate-500 truncate">
                              {analyst.username ? `@${analyst.username}` : analyst.id} &bull; {analyst.employeeId || analyst.id}
                            </p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0',
                            isSuperAdminRole
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isManagerRole
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          )}
                        >
                          {isSuperAdminRole ? 'ADMIN' : isManagerRole ? 'MANAGER' : 'ANALYST'}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                          <span className="text-slate-400 font-medium">Dept:</span>
                          <span className="font-medium text-slate-800 truncate">{analyst.department}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-md border', labBadge.bg)}>
                            {labBadge.label}
                          </span>
                          <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={`/tasks`}
                        className="flex-1 text-center py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors"
                      >
                        Assign Task
                      </Link>
                      <Link
                        href={`/users`}
                        className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-semibold transition-colors"
                        title="View profile and access details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPersonnelPages > 1 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(personnelPage - 1) * PERSONNEL_PER_PAGE + 1} -{' '}
                {Math.min(personnelPage * PERSONNEL_PER_PAGE, filteredPersonnel.length)} of {filteredPersonnel.length} personnel
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={personnelPage === 1}
                  onClick={() => setPersonnelPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="px-2 text-xs font-bold text-slate-700">
                  {personnelPage} / {totalPersonnelPages}
                </span>
                <button
                  type="button"
                  disabled={personnelPage >= totalPersonnelPages}
                  onClick={() => setPersonnelPage((p) => Math.min(totalPersonnelPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Pending Samples Table (Full Screen Width) */}
      <div className="w-full enterprise-card rounded-2xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-900">
                {isAnalyst ? 'My Assigned Samples for Testing' : 'Pending Samples & Workload Allocation'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {pendingSamples.length}
              </span>
              {isAnalyst && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Workstation Isolated: @{user?.username}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Analyst Filter Dropdown for Super Admin / Managers */}
              {!isAnalyst && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor="analyst-filter-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Analyst:
                  </label>
                  <select
                    id="analyst-filter-select"
                    value={selectedAnalystFilter}
                    onChange={(e) => {
                      setSelectedAnalystFilter(e.target.value);
                      setSamplePage(1);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="ALL">All Analysts (All Workloads)</option>
                    {allAnalysts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.username ? `@${a.username}` : a.id}) — {a.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Link href="/samples" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                View All
              </Link>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Sample ID</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Laboratory</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Sample Type</th>
                  <th className="py-2.5 px-3 font-medium">Product</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Batch No</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Assigned Analyst</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSamples.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <FlaskConical className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                        {isAnalyst ? (
                          <>
                            <p className="font-semibold text-slate-700 text-sm">No Samples Assigned To You Yet</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                              You are logged in as <strong>{user?.fullName || 'Quality Analyst'}</strong> (@{user?.username}). When your QC Manager, Deputy Manager, or Shift In-Charge assigns a sample to you, it will appear here immediately.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                              <Link
                                href="/testing"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                              >
                                <Beaker className="h-3.5 w-3.5" />
                                <span>Go to Testing Worksheets</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => setIsRegisterModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                              >
                                <span>+ Register Sample</span>
                              </button>
                            </div>
                          </>
                        ) : selectedAnalystFilter !== 'ALL' ? (
                          <>
                            <p className="font-semibold text-slate-700 text-sm">
                              No Samples Currently Assigned to {allAnalysts.find((a) => a.id === selectedAnalystFilter)?.name || 'Selected Analyst'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                              This analyst account is active and verified. To assign testing duties, click below to open Task Assignment.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                              <Link
                                href={`/tasks`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Assign Sample in Task Registry</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => setSelectedAnalystFilter('ALL')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                              >
                                <span>View All Workloads</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-600 text-sm">No Pending Samples Found</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              No pending samples match your current filter. Accession your first sample or clear filters to view all records.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                              <Link
                                href="/samples?action=new"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                              >
                                <span>+ Accession New Sample</span>
                              </Link>
                              <Link
                                href="/tasks"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                              >
                                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Assign Tasks</span>
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSamples.map((sample) => {
                    const sampleUrl = `/samples?lab=${sample.labId}&sampleId=${encodeURIComponent(sample.uuid || sample.id)}`;
                    const assignUrl = `/tasks?lab=${sample.labId}&sampleId=${encodeURIComponent(sample.id)}`;
                    const testingUrl = `/testing?sampleCode=${encodeURIComponent(sample.id)}`;

                    return (
                      <tr key={sample.id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-3 px-3 font-semibold text-slate-800 font-mono text-[11px] whitespace-nowrap">
                          <Link
                            href={sampleUrl}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                            title={`Open ${sample.id} in ${sample.labName}`}
                          >
                            {sample.id}
                          </Link>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Link
                            href={`/samples?lab=${sample.labId}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${sample.labBadgeColor} hover:opacity-80 transition-opacity`}
                            title={`Filter ${sample.labName}`}
                          >
                            {sample.labName}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{sample.type}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{sample.product}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">{sample.batch}</td>

                        {/* Assigned Analyst Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {sample.assignedAnalystName ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 text-[11px]">
                                {sample.assignedAnalystName}
                              </span>
                              {sample.assignedAnalystUsername && (
                                <span className="text-[10px] text-blue-600 font-mono">
                                  @{sample.assignedAnalystUsername}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                              {!isAnalyst && (
                                <Link
                                  href={assignUrl}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"
                                  title="Assign this sample to an analyst"
                                >
                                  + Assign
                                </Link>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${sample.statusColor}`}
                          >
                            {sample.status}
                          </span>
                        </td>

                        {/* Action Column */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAnalyst ? (
                              <Link
                                href={testingUrl}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs group-hover:shadow-xs"
                                title="Open testing worksheet for this sample"
                              >
                                <Beaker className="h-3 w-3" />
                                <span>Test Worksheet</span>
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={sampleUrl}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                                  title={`View sample dossier in ${sample.labName}`}
                                >
                                  <span>View</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                                <Link
                                  href={assignUrl}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                                  title="Assign or reassign analyst for this sample"
                                >
                                  <UserCheck className="h-3 w-3" />
                                  <span>Assign</span>
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pendingSamples.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <span>
                  Showing <strong className="text-slate-800 font-semibold">{Math.min((samplePage - 1) * samplePageSize + 1, pendingSamples.length)}</strong> to{' '}
                  <strong className="text-slate-800 font-semibold">{Math.min(samplePage * samplePageSize, pendingSamples.length)}</strong> of{' '}
                  <strong className="text-slate-800 font-semibold">{pendingSamples.length}</strong> samples
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={samplePage <= 1}
                  onClick={() => setSamplePage((prev) => Math.max(prev - 1, 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSamplePages }, (_, idx) => idx + 1)
                    .filter((p) => {
                      if (totalSamplePages <= 5) return true;
                      if (p === 1 || p === totalSamplePages) return true;
                      return Math.abs(p - samplePage) <= 1;
                    })
                    .map((pageNum, index, arr) => {
                      const showEllipsisBefore = index > 0 && pageNum - arr[index - 1] > 1;
                      return (
                        <React.Fragment key={pageNum}>
                          {showEllipsisBefore && (
                            <span className="px-1 text-slate-400 text-xs">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setSamplePage(pageNum)}
                            className={cn(
                              'h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              samplePage === pageNum
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={samplePage >= totalSamplePages}
                  onClick={() => setSamplePage((prev) => Math.min(prev + 1, totalSamplePages))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                  aria-label="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lab Activity Log (Live Real-Time Operational Audit Feed - Full Screen Width) */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 transition-all">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Lab Activity Log
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE STREAM • 3s Auto-Sync
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                  {displayedLogs.length} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                21 CFR Part 11 immutable audit trail tracking all user logins, session authentications, task allocations, worksheet results, and laboratory actions in real time.
              </p>
            </div>
          </div>

          {/* Quick Actions & Manual Refresh */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => refetchAuditLogs()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Force Refresh Audit Log Feed"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 text-slate-500', isAuditLoading && 'animate-spin text-blue-600')} />
              <span>Refresh</span>
            </button>
            <Link
              href="/audit-trail"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Open Full 21 CFR Part 11 Audit Trail Portal"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Full Audit Vault</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar: Category Pills + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-3.5 border-b border-slate-100">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { key: 'ALL', label: 'All Activities', count: auditCategoryCounts.ALL, icon: Activity },
              { key: 'LOGINS', label: 'User Logins', count: auditCategoryCounts.LOGINS, icon: LogIn },
              { key: 'TASKS', label: 'Task Assignments', count: auditCategoryCounts.TASKS, icon: UserCheck },
              { key: 'SAMPLES', label: 'Sample Intake', count: auditCategoryCounts.SAMPLES, icon: FlaskConical },
              { key: 'TESTS', label: 'Test Worksheets', count: auditCategoryCounts.TESTS, icon: Beaker },
              { key: 'USERS', label: 'User Admin', count: auditCategoryCounts.USERS, icon: UserPlus },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = auditCategoryFilter === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setAuditCategoryFilter(cat.key as any);
                    setAuditPage(1);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-500')} />
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold',
                      isActive ? 'bg-blue-700 text-blue-100' : 'bg-white/80 text-slate-600'
                    )}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={auditSearchQuery}
              onChange={(e) => {
                setAuditSearchQuery(e.target.value);
                setAuditPage(1);
              }}
              placeholder="Search personnel, action, sample..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
            />
            {auditSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setAuditSearchQuery('');
                  setAuditPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Clear Search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Live Activity Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white z-10 shadow-2xs">
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">Timestamp</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">Personnel & Identity</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">Activity Event</th>
                <th className="py-2.5 px-3.5 font-semibold">Operational Change & Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isAuditLoading && displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Streaming real-time laboratory activity...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Activity className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">No Activity Records Found</p>
                      <p className="text-xs text-slate-400 text-center">
                        {auditSearchQuery
                          ? `No activity matching "${auditSearchQuery}" under current filter.`
                          : 'No operational activity recorded for this category yet.'}
                      </p>
                      {(auditSearchQuery || auditCategoryFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuditSearchQuery('');
                            setAuditCategoryFilter('ALL');
                            setAuditPage(1);
                          }}
                          className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const initials = log.userName
                    ? log.userName
                        .trim()
                        .split(/\s+/)
                        .map((w: string) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'QC';

                  const isLogin = log.actionRaw === 'USER_LOGIN';
                  const isLogout = log.actionRaw === 'USER_LOGOUT';
                  const isTask = log.actionRaw === 'TASK_ASSIGNED' || log.actionRaw === 'TASK_STATUS_UPDATED';
                  const isTest = log.actionRaw === 'TEST_RESULT_RECORDED' || log.actionRaw === 'WORKSHEET_COMPLETED';

                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        'hover:bg-blue-50/30 transition-colors group',
                        isLogin && 'bg-emerald-50/20'
                      )}
                    >
                      {/* 1. Time & Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-[11px]">
                            {log.timeDisplay}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({log.relativeTime})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          {log.dateDisplay}
                        </span>
                      </td>

                      {/* 2. Personnel & Role */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border shadow-2xs',
                              log.roleBadge.label.includes('Admin')
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : log.roleBadge.label.includes('Manager')
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{log.userName}</span>
                              {isLogin && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  Online
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                'inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border mt-0.5',
                                log.roleBadge.badgeClass
                              )}
                            >
                              {log.roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Activity Event */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs',
                              log.actionLabel.colorClass
                            )}
                          >
                            {isLogin && <LogIn className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            {isLogout && <LogOut className="h-3.5 w-3.5 text-slate-600 shrink-0" />}
                            {log.actionRaw === 'TASK_ASSIGNED' && <UserCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                            {log.actionRaw === 'TASK_STATUS_UPDATED' && <Gauge className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                            {isTest && <Beaker className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                            {log.actionRaw.includes('SAMPLE') && <FlaskConical className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                            {log.actionRaw.includes('USER_CREATED') && <UserPlus className="h-3.5 w-3.5 text-violet-600 shrink-0" />}
                            {log.actionRaw.includes('ROLE') && <KeyRound className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                            {!isLogin && !isLogout && !isTask && !isTest && !log.actionRaw.includes('SAMPLE') && !log.actionRaw.includes('USER') && (
                              <Activity className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            )}
                            <span>{log.actionLabel.label}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-1">
                          Entity: {log.entityName}
                        </span>
                      </td>

                      {/* 4. Operational Change & Regulatory Details */}
                      <td className="py-3 px-3.5 min-w-[280px]">
                        <p className="text-slate-800 font-medium text-xs leading-relaxed">
                          {log.details}
                        </p>
                        {log.reason && log.reason !== log.details && (
                          <div className="flex items-start gap-1 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-semibold text-slate-500 shrink-0">Reason:</span>
                            <span className="italic">{log.reason}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Controls */}
        {displayedLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-3 border-t border-slate-100 gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 font-bold">{(auditPage - 1) * auditPageSize + 1}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{Math.min(auditPage * auditPageSize, displayedLogs.length)}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{displayedLogs.length}</strong> activity records
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                10 per page
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((prev) => Math.max(prev - 1, 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalAuditPages }, (_, idx) => idx + 1)
                  .filter((p) => {
                    if (totalAuditPages <= 5) return true;
                    if (p === 1 || p === totalAuditPages) return true;
                    return Math.abs(p - auditPage) <= 1;
                  })
                  .map((pageNum, index, arr) => {
                    const showEllipsisBefore = index > 0 && pageNum - arr[index - 1] > 1;
                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsisBefore && (
                          <span className="px-1 text-slate-400 text-xs">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setAuditPage(pageNum)}
                          className={cn(
                            'h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer',
                            auditPage === pageNum
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={auditPage >= totalAuditPages}
                onClick={() => setAuditPage((prev) => Math.min(prev + 1, totalAuditPages))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer shadow-2xs"
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

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
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  placeholder="e.g. ayesha.khan@citypharma.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
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

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Laboratory</label>
                <select
                  value={addUserForm.assignedLab}
                  onChange={(e) => setAddUserForm({ ...addUserForm, assignedLab: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  <option value="GENERAL">General Lab (GL)</option>
                  <option value="PENICILLIN">Penicillin Lab (PEN)</option>
                  <option value="CEPHALOSPORIN">Cephalosporin Lab (CEPH)</option>
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
                  <option value="MANAGER">QC Manager — Supervision &amp; Assignment</option>
                  <option value="ADMIN">Super Admin — Full Authority</option>
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
