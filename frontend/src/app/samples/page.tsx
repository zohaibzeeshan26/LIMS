'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService, SamplingFilters } from '@/services/sampling.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Sample, SampleType, Priority, SampleStatus, SAMPLE_STAGES, SEMI_BASE_STAGES, FORMULATION_STAGES, LabSection, getSampleSection, getUserLabAccess } from '@/types/lims';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { EditSampleModal } from '@/components/samples/EditSampleModal';
import { PrintSampleModal } from '@/components/samples/PrintSampleModal';
import { SubmitSampleModal } from '@/components/samples/SubmitSampleModal';
import { QrScannerModal, ScannedSampleData } from '@/components/samples/QrScannerModal';
import { SampleRoutingChitModal, SampleRoutingChitData } from '@/components/samples/SampleRoutingChitModal';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  Microscope,
  ShieldAlert,
  PlusCircle,
  Search,
  Filter,
  QrCode,
  ArrowRight,
  UserCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  History,
  X,
  Layers,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Eye,
  Edit3,
  Printer,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
  Tag,
  Hash,
  FileText,
  User,
  Lock,
  Users,
} from 'lucide-react';

const LAB_TABS = [
  {
    id: 'general',
    legacyIds: ['gen', 'gl'],
    key: 'GENERAL' as const,
    name: 'General Lab',
    shortLabel: 'General Lab',
    heading: 'Sampling / General Lab',
    icon: FlaskConical,
  },
  {
    id: 'penicillin',
    legacyIds: ['pen', 'pl'],
    key: 'PENICILLIN' as const,
    name: 'Penicillin Lab',
    shortLabel: 'Penicillin Lab',
    heading: 'Sampling / Penicillin Lab',
    icon: FlaskConical,
  },
  {
    id: 'cephalosporin',
    legacyIds: ['ceph', 'cp', 'saf', 'sef'],
    key: 'CEPHALOSPORIN' as const,
    name: 'Cephalosporin Lab',
    shortLabel: 'Cephalosporin Lab',
    heading: 'Sampling / Cephalosporin Lab',
    icon: FlaskConical,
  },
];

// Helper function: Strictly isolates samples to ensure only records belonging to the active lab are displayed
function isSampleInLab(s: Sample, labKey: 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN'): boolean {
  const labType = (s.laboratoryType || (typeof s.laboratory === 'string' ? s.laboratory : '')).toString().toUpperCase();
  const labName = ((s.laboratory as any)?.name || (s.laboratory as any)?.code || '').toString().toUpperCase();
  const code = (s.sampleCode || s.sampleId || s.accessionNo || '').toString().toUpperCase();

  if (labKey === 'GENERAL') {
    return (
      labType === 'GENERAL' ||
      labName === 'GENERAL' ||
      labName === 'GL' ||
      code.includes('GEN') ||
      code.startsWith('GL/') ||
      code.includes('/GL/')
    );
  }
  if (labKey === 'PENICILLIN') {
    return (
      labType === 'PENICILLIN' ||
      labName.includes('PEN') ||
      code.includes('PEN') ||
      code.startsWith('PEN/') ||
      code.includes('/PEN/')
    );
  }
  if (labKey === 'CEPHALOSPORIN') {
    return (
      labType === 'CEPHALOSPORIN' ||
      labType === 'SAF' ||
      labName.includes('CEPH') ||
      labName.includes('SAF') ||
      code.includes('CEP') ||
      code.startsWith('CEPH/') ||
      code.includes('/CEPH/')
    );
  }
  return false;
}

function SamplesPageInner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions check: Strict RBAC — HOD has strictly Read-Only access across all records
  const isHOD = user?.role === 'ADMIN' || (user?.role as string) === 'HOD';
  const canEdit = !isHOD && user?.role === 'SUPER_ADMIN';

  // 3-Laboratory System: General Lab, Penicillin Lab, Cephalosporin Lab
  const userLabAccess = useMemo(() => getUserLabAccess(user), [user]);
  const isRestrictedToLab = userLabAccess !== 'ALL';
  const authorizedLabId =
    userLabAccess === 'PENICILLIN'
      ? 'penicillin'
      : userLabAccess === 'CEPHALOSPORIN'
      ? 'cephalosporin'
      : 'general';

  const rawLabParam = searchParams.get('lab')?.toLowerCase();
  const labParam = isRestrictedToLab ? authorizedLabId : (rawLabParam || 'general');
  const isAllLabs = false;

  const activeLab = useMemo(() => {
    const found = LAB_TABS.find(
      (l) => l.id === labParam || l.legacyIds.includes(labParam) || l.key.toLowerCase() === labParam
    );
    return found || LAB_TABS[0];
  }, [labParam]);

  // Intercept unauthorized lab navigation via URL query parameters
  React.useEffect(() => {
    if (isRestrictedToLab) {
      const currentInUrl = searchParams.get('lab')?.toLowerCase();
      if (currentInUrl && currentInUrl !== authorizedLabId) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('lab', authorizedLabId);
        router.replace(`/samples?${params.toString()}`);
      }
    }
  }, [isRestrictedToLab, authorizedLabId, searchParams, router]);

  // Active laboratory subsection: 'all' | 'semi-base' | 'formulation' (defaults to 'all' to show all samples for selected lab)
  const sectionParam = searchParams.get('section')?.toLowerCase();
  const activeSection: 'all' | 'semi-base' | 'formulation' =
    sectionParam === 'semi-base'
      ? 'semi-base'
      : sectionParam === 'formulation'
      ? 'formulation'
      : 'all';

  const selectSection = (section: 'all' | 'semi-base' | 'formulation') => {
    const params = new URLSearchParams(searchParams.toString());
    if (section === 'all') {
      params.delete('section');
    } else {
      params.set('section', section);
    }
    setPage(1);
    router.push(`/samples?${params.toString()}`);
  };

  // Dedicated Search & Filter states as per specification:
  // 1. Search by Sample ID
  // 2. Search by nomenclature
  // 3. Search by batch/lot number
  // 4. Filter by date range (startDate, endDate)
  // 5. Filter by stage/type
  // 6. Pagination & Sorting & Granular Search Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [sampleIdSearch, setSampleIdSearch] = useState('');
  const [nomenclatureSearch, setNomenclatureSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [mfgDateFilter, setMfgDateFilter] = useState('');
  const [expDateFilter, setExpDateFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('accessionNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounced search terms for smooth server queries
  const debouncedGlobal = useDebounce(globalSearch, 300);
  const debouncedSampleId = useDebounce(sampleIdSearch, 300);
  const debouncedNomenclature = useDebounce(nomenclatureSearch, 300);
  const debouncedBatch = useDebounce(batchSearch, 300);
  const debouncedCategory = useDebounce(categorySearch, 300);
  const debouncedMfg = useDebounce(mfgDateFilter, 300);
  const debouncedExp = useDebounce(expDateFilter, 300);

  // Modals state
  const [isAccessionModalOpen, setIsAccessionModalOpen] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [editingSample, setEditingSample] = useState<Sample | null>(null);
  const [printingSample, setPrintingSample] = useState<Sample | null>(null);
  const [submittingSample, setSubmittingSample] = useState<Sample | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [chitSample, setChitSample] = useState<Sample | null>(null);

  const handleScanSample = (data: ScannedSampleData) => {
    const code = data.sampleCode || data.barcode;
    if (code) {
      setSelectedSampleId(code);
      setSampleIdSearch(code);
    }
  };

  // Auto-open sample dossier if sampleId is present in URL (e.g. redirected from Dashboard Pending Samples)
  const querySampleParam = searchParams.get('sampleId') || searchParams.get('id') || searchParams.get('sample');
  const queryStatusParam = searchParams.get('status');

  React.useEffect(() => {
    if (querySampleParam) {
      const trimmed = querySampleParam.trim();
      setSelectedSampleId(trimmed);
    }
  }, [querySampleParam]);

  React.useEffect(() => {
    if (queryStatusParam) {
      setStatusFilter(queryStatusParam.toUpperCase());
    }
  }, [queryStatusParam]);

  const handleCloseDetailModal = () => {
    setSelectedSampleId(null);
    if (searchParams.has('sampleId') || searchParams.has('id') || searchParams.has('sample')) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('sampleId');
      nextParams.delete('id');
      nextParams.delete('sample');
      const newQuery = nextParams.toString();
      router.replace(newQuery ? `/samples?${newQuery}` : '/samples');
    }
  };

  // Switch laboratory function
  const selectLaboratory = (labId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lab', labId);
    params.delete('section'); // Show all samples of selected lab
    setPage(1); // Reset to page 1 on lab switch
    router.push(`/samples?${params.toString()}`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setGlobalSearch('');
    setSampleIdSearch('');
    setNomenclatureSearch('');
    setBatchSearch('');
    setCategorySearch('');
    setMfgDateFilter('');
    setExpDateFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setStageFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    sampleIdSearch ||
    nomenclatureSearch ||
    batchSearch ||
    categorySearch ||
    mfgDateFilter ||
    expDateFilter ||
    startDateFilter ||
    endDateFilter ||
    stageFilter ||
    statusFilter
  );

  // Fetch live sample metrics (with count by laboratory)
  const { data: metrics } = useQuery({
    queryKey: ['sampling-metrics'],
    queryFn: () => samplingService.getMetrics(),
  });

  // Dynamic counts for All, Semi Basics and Formulation for the active laboratory
  const { data: allLabCountData } = useQuery({
    queryKey: ['samples-count-all', isAllLabs ? 'all' : activeLab.key],
    queryFn: () =>
      samplingService.getAll({
        laboratory: isAllLabs ? undefined : activeLab.key,
        limit: 1,
      }),
  });

  const { data: semiBaseCountData } = useQuery({
    queryKey: ['samples-count-sb', isAllLabs ? 'all' : activeLab.key],
    queryFn: () =>
      samplingService.getAll({
        laboratory: isAllLabs ? undefined : activeLab.key,
        section: 'semi-base',
        limit: 1,
      }),
  });

  const { data: formulationCountData } = useQuery({
    queryKey: ['samples-count-fm', isAllLabs ? 'all' : activeLab.key],
    queryFn: () =>
      samplingService.getAll({
        laboratory: isAllLabs ? undefined : activeLab.key,
        section: 'formulation',
        limit: 1,
      }),
  });

  const semiBaseCount = semiBaseCountData?.meta?.total ?? 0;
  const formulationCount = formulationCountData?.meta?.total ?? 0;
  const allLabCount = allLabCountData?.meta?.total ?? (semiBaseCount + formulationCount);

  // Query laboratory records with server-side filtering, sorting, and pagination
  const queryFilters: SamplingFilters = useMemo(
    () => ({
      laboratory: isAllLabs ? undefined : activeLab.key,
      section: isAllLabs || activeSection === 'all' ? undefined : (activeSection as any),
      search: debouncedGlobal || undefined,
      sampleId: debouncedSampleId || undefined,
      nomenclature: debouncedNomenclature || undefined,
      batchNumber: debouncedBatch || undefined,
      category: debouncedCategory || undefined,
      mfgDate: debouncedMfg || undefined,
      expDate: debouncedExp || undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      sampleType: stageFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [
      isAllLabs,
      activeLab.key,
      activeSection,
      debouncedGlobal,
      debouncedSampleId,
      debouncedNomenclature,
      debouncedBatch,
      debouncedCategory,
      debouncedMfg,
      debouncedExp,
      startDateFilter,
      endDateFilter,
      stageFilter,
      statusFilter,
      page,
      limit,
      sortBy,
      sortOrder,
    ]
  );

  const {
    data: responseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['samples-paginated', queryFilters],
    queryFn: () => samplingService.getAll(queryFilters),
  });

  // Live query for active Urgent & STAT Priority samples (1 Hr - 2 Days SLA)
  const { data: urgentAlertsResponse } = useQuery({
    queryKey: ['active-expedited-urgent-samples', isAllLabs ? 'all' : activeLab.key],
    queryFn: () => samplingService.getAll({ priority: 'STAT,URGENT', laboratory: isAllLabs ? undefined : activeLab.key, limit: 100 }),
    refetchInterval: 5000,
  });

  const allUrgentSamples: Sample[] = useMemo(() => {
    if (!urgentAlertsResponse) return [];
    const list: Sample[] = Array.isArray(urgentAlertsResponse)
      ? urgentAlertsResponse
      : (urgentAlertsResponse as any).data || [];
    return list.filter(
      (s: Sample) =>
        (s.priority === 'STAT' || s.priority === 'URGENT') &&
        s.status !== 'APPROVED' &&
        s.status !== 'REJECTED' &&
        s.status !== 'ARCHIVED' &&
        isSampleInLab(s, activeLab.key)
    );
  }, [urgentAlertsResponse, activeLab.key]);

  // Section-specific urgent sample distribution
  const semiBaseUrgentSamples: Sample[] = useMemo(() => {
    return allUrgentSamples.filter((s) => getSampleSection(s) === 'semi-base');
  }, [allUrgentSamples]);

  const formulationUrgentSamples: Sample[] = useMemo(() => {
    return allUrgentSamples.filter((s) => getSampleSection(s) === 'formulation');
  }, [allUrgentSamples]);

  // Active section urgent samples (matches whether All, Semi Basics or Formulation is selected)
  const urgentSamples: Sample[] = useMemo(() => {
    if (activeSection === 'semi-base') return semiBaseUrgentSamples;
    if (activeSection === 'formulation') return formulationUrgentSamples;
    return allUrgentSamples;
  }, [activeSection, semiBaseUrgentSamples, formulationUrgentSamples, allUrgentSamples]);

  // Extract samples array and strictly filter by active laboratory, section, and live search fields
  const samplesList: Sample[] = useMemo(() => {
    let raw: Sample[] = [];
    if (responseData) {
      if (Array.isArray(responseData)) raw = responseData;
      else if (Array.isArray((responseData as any).data)) raw = (responseData as any).data;
    }
    return raw.filter((s: Sample) => {
      // 1. Strict Laboratory Isolation: only show samples of the active laboratory
      if (!isSampleInLab(s, activeLab.key)) {
        return false;
      }
      // 2. Section filter: if 'semi-base' or 'formulation', filter accordingly; if 'all', show all samples of this lab
      if (activeSection === 'semi-base' || activeSection === 'formulation') {
        if (getSampleSection(s) !== activeSection) return false;
      }

      // 3. Live Batch Number Search
      if (batchSearch) {
        const q = batchSearch.trim().toLowerCase();
        const lot = (s.lotNumber || s.batchLotNumber || '').toLowerCase();
        if (!lot.includes(q)) return false;
      }

      // 4. Live Sample ID / Accession No Search
      if (sampleIdSearch) {
        const q = sampleIdSearch.trim().toLowerCase();
        const sid = (s.sampleCode || s.sampleId || s.accessionNo || s.recordNumber || '').toLowerCase();
        if (!sid.includes(q)) return false;
      }

      // 5. Live Nomenclature Search
      if (nomenclatureSearch) {
        const q = nomenclatureSearch.trim().toLowerCase();
        const nom = (s.nomenclature || s.materialName || '').toLowerCase();
        if (!nom.includes(q)) return false;
      }

      // 6. Live Category Search
      if (categorySearch) {
        const q = categorySearch.trim().toLowerCase();
        const cat = (s.stageType || s.sampleType || '').toLowerCase();
        if (!cat.includes(q)) return false;
      }

      // 7. Category Dropdown Filter
      if (stageFilter) {
        const q = stageFilter.trim().toLowerCase();
        const cat = (s.stageType || s.sampleType || '').toLowerCase();
        if (!cat.includes(q)) return false;
      }

      // 8. Live MFG Date Search / Filter
      if (mfgDateFilter) {
        const q = mfgDateFilter.trim().toLowerCase();
        const mfg = (s.mfgDate || s.manufacturingDate || '').toString().toLowerCase();
        if (!mfg.includes(q)) return false;
      }

      // 9. Live EXP Date Search / Filter
      if (expDateFilter) {
        const q = expDateFilter.trim().toLowerCase();
        const exp = (s.expDate || s.expiryDate || '').toString().toLowerCase();
        if (!exp.includes(q)) return false;
      }

      // 10. Live Status Filter
      if (statusFilter) {
        if (s.status?.toUpperCase() !== statusFilter.toUpperCase()) return false;
      }

      // 11. Universal Quick Search across all columns
      if (globalSearch) {
        const q = globalSearch.trim().toLowerCase();
        const combo = [
          s.sampleCode,
          s.sampleId,
          s.accessionNo,
          s.recordNumber,
          s.nomenclature,
          s.materialName,
          s.lotNumber,
          s.batchLotNumber,
          s.stageType,
          s.sampleType,
          s.status,
          s.mfgDate,
          s.expDate,
          s.manufacturingDate,
          s.expiryDate,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!combo.includes(q)) return false;
      }

      return true;
    });
  }, [
    responseData,
    activeLab.key,
    activeSection,
    batchSearch,
    sampleIdSearch,
    nomenclatureSearch,
    categorySearch,
    stageFilter,
    mfgDateFilter,
    expDateFilter,
    statusFilter,
    globalSearch,
  ]);

  const meta = useMemo(() => {
    if (responseData && 'meta' in (responseData as any)) {
      return (responseData as any).meta;
    }
    return {
      total: samplesList.length,
      page,
      limit,
      totalPages: Math.ceil(samplesList.length / limit) || 1,
    };
  }, [responseData, samplesList.length, page, limit]);

  // Load single sample detail if selected
  const {
    data: sampleDetail,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['sample', selectedSampleId],
    queryFn: () => (selectedSampleId ? samplingService.getById(selectedSampleId) : null),
    enabled: !!selectedSampleId,
  });

  const fallbackSampleFromList = useMemo(() => {
    if (!selectedSampleId) return null;
    const trimmed = selectedSampleId.trim().toLowerCase();
    const allFetched: Sample[] = [];
    if (responseData) {
      if (Array.isArray(responseData)) allFetched.push(...responseData);
      else if (Array.isArray((responseData as any).data)) allFetched.push(...(responseData as any).data);
    }
    return (
      allFetched.find(
        (s) =>
          s.id?.toLowerCase() === trimmed ||
          s.sampleCode?.toLowerCase() === trimmed ||
          s.sampleId?.toLowerCase() === trimmed ||
          s.accessionNo?.toLowerCase() === trimmed
      ) || null
    );
  }, [selectedSampleId, responseData]);

  const activeDossier = (sampleDetail || fallbackSampleFromList) as any;

  // Status transition mutation with 21 CFR Part 11 electronic reason
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason: string }) =>
      samplingService.update(id, { status, reasonForChange: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sample', selectedSampleId] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  // Compute live lab counts from metrics API
  const labCounts = useMemo(() => {
    const total = metrics?.total ?? 0;
    return {
      general: total,
      total,
    };
  }, [metrics]);

  // Handle column header sorting
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-teal-600 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-teal-600 font-bold" />
    );
  };

  return (
    <RoleRouteGuard
      allowedRoles={[
        'SUPER_ADMIN',
        'ADMIN',
        'DEPUTY_MANAGER',
        'LAB_TECHNICIAN',
      ]}
      moduleName="Sample Registration & Accessioning"
    >
      <div className="space-y-6 font-sans">
      {/* Active Laboratory Banner (Strict Laboratory Isolation — Only active lab is shown) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Analytical Laboratory
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
              {activeLab.name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs">
            {allLabCount} Samples
          </span>
        </div>
      </div>

      {/* Sub-Section Options under Laboratory: All Samples, Semi Basics, and Formulation */}
      <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: All Laboratory Samples */}
          <button
            type="button"
            onClick={() => selectSection('all')}
            className={cn(
              'relative group flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 border cursor-pointer',
              activeSection === 'all'
                ? 'bg-white border-blue-400 shadow-sm ring-1 ring-blue-400/20'
                : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                  activeSection === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                )}
              >
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900">
                    All {activeLab.name}
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {allLabCount} Samples
                  </span>
                  {allUrgentSamples.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{allUrgentSamples.length} Urgent</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {activeSection === 'all' ? (
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              )}
            </div>
          </button>

          {/* Option 2: Semi Basics */}
          <button
            type="button"
            onClick={() => selectSection('semi-base')}
            className={cn(
              'relative group flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 border cursor-pointer',
              activeSection === 'semi-base'
                ? 'bg-white border-blue-400 shadow-sm ring-1 ring-blue-400/20'
                : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                  activeSection === 'semi-base'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                )}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900">
                    Semi Basics
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {semiBaseCount} Samples
                  </span>
                  {semiBaseUrgentSamples.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{semiBaseUrgentSamples.length} Urgent</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {activeSection === 'semi-base' ? (
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              )}
            </div>
          </button>

          {/* Option 3: Formulation */}
          <button
            type="button"
            onClick={() => selectSection('formulation')}
            className={cn(
              'relative group flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 border cursor-pointer',
              activeSection === 'formulation'
                ? 'bg-white border-blue-400 shadow-sm ring-1 ring-blue-400/20'
                : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                  activeSection === 'formulation'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900">
                    Formulation
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {formulationCount} Samples
                  </span>
                  {formulationUrgentSamples.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{formulationUrgentSamples.length} Urgent</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {activeSection === 'formulation' ? (
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 2. Page Title Header: Selected Laboratory in Heading & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-6 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {activeLab.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {activeSection === 'all'
              ? `${activeLab.name} — All Samples`
              : activeSection === 'semi-base'
              ? `${activeLab.name} — Semi Basics`
              : `${activeLab.name} — Formulation`}
          </h1>
        </div>

        {/* Action Buttons (Strictly View-Only for HOD) */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isHOD ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>HOD Read-Only Mode &bull; Accessioning Restricted</span>
            </div>
          ) : (
            <Button
              onClick={() => setIsAccessionModalOpen(true)}
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-white" />
              <span>
                Add New Sample (
                {activeSection === 'semi-base'
                  ? 'Semi Basics'
                  : activeSection === 'formulation'
                  ? 'Formulation'
                  : activeLab.name}
                )
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Comprehensive Business Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Search & Filter Sampling Records
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100/70 border border-rose-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Global Live Universal Search Bar */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Search className="h-3 w-3 text-blue-600" />
            <span>Universal Instant Search (Batch #, MFG Date, Expiry Date, Category, Sample ID, Nomenclature)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-blue-200 bg-blue-50/20 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 outline-none font-medium transition-all"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-500" />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 1: Dedicated Search Inputs (Sample ID, Nomenclature, Batch/Lot, Category) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          {/* Search by Sample ID / A. No. */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Hash className="h-3 w-3 text-slate-400" />
              <span>Search Sample ID / A. No.</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={sampleIdSearch}
                onChange={(e) => {
                  setSampleIdSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 font-mono text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {sampleIdSearch && (
                <button
                  type="button"
                  onClick={() => setSampleIdSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search by Nomenclature */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-400" />
              <span>Search Nomenclature</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={nomenclatureSearch}
                onChange={(e) => {
                  setNomenclatureSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {nomenclatureSearch && (
                <button
                  type="button"
                  onClick={() => setNomenclatureSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search by Batch / Lot No. */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-400" />
              <span>Search Batch / Lot No.</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={batchSearch}
                onChange={(e) => {
                  setBatchSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs font-mono rounded-lg border border-slate-200 text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {batchSearch && (
                <button
                  type="button"
                  onClick={() => setBatchSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Category / Stage */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="h-3 w-3 text-slate-400" />
              <span>Search Category / Stage</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Date Filters & Preset Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          {/* Sampling Start Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
            />
          </div>

          {/* Sampling End Date */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
            />
          </div>

          {/* Filter by Stage / Type Dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {activeSection === 'semi-base'
                ? 'Category Preset'
                : activeSection === 'formulation'
                ? 'Category Preset'
                : 'Category Preset'}
            </label>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-700 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium"
            >
              <option value="">
                All Preset Categories
              </option>
              {(activeSection === 'semi-base'
                ? SEMI_BASE_STAGES
                : activeSection === 'formulation'
                ? FORMULATION_STAGES
                : Array.from(new Set([...SEMI_BASE_STAGES, ...FORMULATION_STAGES]))
              ).map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Professional Sampling Records Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-navy-950 uppercase tracking-wider">
              {isAllLabs
                ? `All Sampling Records — ${activeSection === 'all' ? 'All' : activeSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}`
                : `${activeLab.name} — ${activeSection === 'all' ? 'All Samples' : activeSection === 'semi-base' ? 'Semi Basics' : 'Formulation'} Records`}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({meta.total} {meta.total === 1 ? 'record' : 'records'} total)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-xs rounded border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-navy-900"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>

        {/* Scrollable Data Table Container */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold select-none">
                {/* 1. A. No. */}
                <th
                  onClick={() => handleSort('accessionNo')}
                  className="py-3 px-3.5 w-[95px] min-w-[95px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>A. No.</span>
                    {renderSortIcon('accessionNo')}
                  </div>
                </th>

                {/* 2. Date & Time */}
                <th
                  onClick={() => handleSort('samplingDate')}
                  className="py-3 px-3.5 w-[140px] min-w-[140px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Date & Time</span>
                    {renderSortIcon('samplingDate')}
                  </div>
                </th>

                {/* 3. Nomenclature */}
                <th
                  onClick={() => handleSort('nomenclature')}
                  className="py-3 px-3.5 min-w-[220px] max-w-xs cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Nomenclature</span>
                    {renderSortIcon('nomenclature')}
                  </div>
                </th>

                {/* 4. Sample ID */}
                <th
                  onClick={() => handleSort('sampleCode')}
                  className="py-3 px-3.5 w-[130px] min-w-[130px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Sample ID</span>
                    {renderSortIcon('sampleCode')}
                  </div>
                </th>

                {/* 5. Stage / Type */}
                <th
                  onClick={() => handleSort('sampleType')}
                  className="py-3 px-3.5 w-[135px] min-w-[135px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Stage / Type</span>
                    {renderSortIcon('sampleType')}
                  </div>
                </th>

                {/* 6. Qty. of Sample */}
                <th
                  onClick={() => handleSort('sampleQty')}
                  className="py-3 px-3.5 w-[110px] min-w-[110px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Qty. of Sample</span>
                    {renderSortIcon('sampleQty')}
                  </div>
                </th>

                {/* 7. Batch No. / Lot No. */}
                <th
                  onClick={() => handleSort('lotNumber')}
                  className="py-3 px-3.5 w-[135px] min-w-[135px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Batch No. / Lot No.</span>
                    {renderSortIcon('lotNumber')}
                  </div>
                </th>

                {/* 8. MFG Date */}
                <th
                  onClick={() => handleSort('mfgDate')}
                  className="py-3 px-3.5 w-[105px] min-w-[105px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>MFG Date</span>
                    {renderSortIcon('mfgDate')}
                  </div>
                </th>

                {/* 9. EXP Date */}
                <th
                  onClick={() => handleSort('expDate')}
                  className="py-3 px-3.5 w-[105px] min-w-[105px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>EXP Date</span>
                    {renderSortIcon('expDate')}
                  </div>
                </th>

                {/* 10. Submitted By */}
                <th
                  onClick={() => handleSort('submittedBy')}
                  className="py-3 px-3.5 min-w-[150px] cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1">
                    <span>Submitted By</span>
                    {renderSortIcon('submittedBy')}
                  </div>
                </th>

                {/* 11. Received By */}
                <th className="py-3 px-3.5 min-w-[140px]">
                  <span>Received By</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* State A: Loading State */}
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-14" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-44" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-3.5 px-3.5"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                  </tr>
                ))
              ) : isError ? (
                /* State B: Error State */
                <tr>
                  <td colSpan={11} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                      <div className="flex items-center justify-center gap-2 font-bold text-sm">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        <span>Failed to Load Sampling Records</span>
                      </div>
                      <p className="text-xs text-rose-600">
                        {(error as any)?.message || 'An error occurred while communicating with the City Pharma LIMS API.'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                        className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        <span>Retry Loading</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : samplesList.length === 0 ? (
                /* State C: Empty State */
                <tr>
                  <td colSpan={11} className="py-14 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                        <FlaskConical className="h-6 w-6 text-slate-400" />
                      </div>
                      <h4 className="text-sm font-bold text-navy-950">No Sampling Records Found</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {hasActiveFilters
                          ? 'No samples match the active search criteria or filters. Try adjusting your search term, date range, or stage.'
                          : `No analytical samples have been registered for ${isAllLabs ? 'any laboratory' : activeLab.name} yet.`}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {hasActiveFilters ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleResetFilters}
                            className="text-xs border-slate-200 text-slate-700"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span>Clear All Filters</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setIsAccessionModalOpen(true)}
                            className="bg-navy-900 text-white text-xs font-semibold"
                          >
                            <PlusCircle className="h-3.5 w-3.5 text-teal-400 mr-1" />
                            <span>Add New Sample</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                /* State D: Data Rows */
                samplesList.map((sample) => {
                  const mfgFormatted = sample.mfgDate
                    ? formatDateTime(sample.mfgDate, 'dd/MM/yyyy')
                    : sample.batch?.manufacturingDate
                    ? formatDateTime(sample.batch.manufacturingDate, 'dd/MM/yyyy')
                    : '—';

                  const expFormatted = sample.expDate
                    ? formatDateTime(sample.expDate, 'dd/MM/yyyy')
                    : sample.batch?.expiryDate
                    ? formatDateTime(sample.batch.expiryDate, 'dd/MM/yyyy')
                    : '—';

                  const batchLotText = sample.lotNumber || sample.batch?.batchNumber || '—';
                  const submittedText = sample.submittedBy || 'Plant Production';
                  const receivedText = sample.accessionedBy?.fullName || sample.assignedTo?.fullName || 'QC Intake Officer';

                  return (
                    <tr
                      key={sample.id}
                      onClick={() => setSelectedSampleId(sample.id)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      {/* 1. A. No. (Readable serial number, not primary key) */}
                      <td className="py-3 px-3.5 font-mono font-bold text-navy-950 group-hover:text-teal-700 text-xs">
                        {sample.accessionNo || 'A-0001'}
                      </td>

                      {/* 2. Date & Time */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatDateTime(sample.samplingDate, 'dd/MM/yyyy HH:mm')}
                      </td>

                      {/* 3. Nomenclature */}
                      <td className="py-3 px-3.5 min-w-[220px] max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-navy-950">
                          {sample.nomenclature || sample.materialName}
                        </div>
                        {sample.submissions && sample.submissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {sample.submissions.slice(0, 2).map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-teal-50 text-teal-800 border border-teal-200"
                              >
                                <Send className="h-2 w-2" />
                                <span>
                                  {s.destinationLab === 'MICROBIOLOGY'
                                    ? 'Microbiology'
                                    : s.destinationLab === 'CHEMICAL'
                                    ? 'Chemical'
                                    : 'Physical'}
                                </span>
                                <span className="text-slate-400 font-medium">({s.status})</span>
                              </span>
                            ))}
                            {sample.submissions.length > 2 && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                +{sample.submissions.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Sample ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-teal-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{sample.sampleCode}</span>
                          {(sample.priority === 'URGENT' || sample.priority === 'STAT') && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              Urgent (1h-2d)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Stage / Type */}
                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 inline-block whitespace-nowrap">
                          {(sample.stageType || (sample.sampleType ? sample.sampleType.replace(/_/g, ' ') : '—')).replace(/^\[(Semi Basics?|Semi Base|Formulation)\]\s*/i, '')}
                        </span>
                      </td>

                      {/* 6. Qty. of Sample */}
                      <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {sample.sampleQty} {sample.unit}
                      </td>

                      {/* 7. Batch No. / Lot No. */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/70 inline-block whitespace-nowrap">
                          {batchLotText}
                        </span>
                      </td>

                      {/* 8. MFG Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {mfgFormatted}
                      </td>

                      {/* 9. EXP Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {expFormatted}
                      </td>

                      {/* 10. Submitted By */}
                      <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[160px] truncate" title={submittedText}>
                        {submittedText}
                      </td>

                      {/* 11. Received By */}
                      <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[150px] truncate" title={receivedText}>
                        {receivedText}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar (Server-Side) */}
        <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white text-xs">
          <div className="text-slate-500">
            {meta.total > 0 ? (
              <span>
                Showing <strong className="text-slate-800">{(meta.page - 1) * meta.limit + 1}</strong> to{' '}
                <strong className="text-slate-800">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </strong>{' '}
                of <strong className="text-slate-800">{meta.total}</strong> records
              </span>
            ) : (
              <span>0 records</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              type="button"
              disabled={meta.page <= 1 || isLoading}
              onClick={() => setPage(Math.max(1, page - 1))}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors',
                meta.page <= 1 || isLoading
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            {/* Page number indicators */}
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const pageNumber = i + 1;
              const isCurrent = meta.page === pageNumber;
              return (
                <button
                  key={`page-${pageNumber}`}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer',
                    isCurrent
                      ? 'bg-navy-900 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}

            {meta.totalPages > 5 && (
              <span className="text-slate-400 px-1">...</span>
            )}

            {/* Next Button */}
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || isLoading}
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors',
                meta.page >= meta.totalPages || isLoading
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer'
              )}
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. View Record Details Dossier Modal */}
      {selectedSampleId && (
        <Modal
          isOpen={!!selectedSampleId}
          onClose={handleCloseDetailModal}
          title={`Sample Record Dossier: ${activeDossier?.accessionNo || activeDossier?.sampleCode || (isDetailLoading ? 'Loading...' : 'Sample Record')}`}
          subtitle={`Material: ${activeDossier?.nomenclature || activeDossier?.materialName || ''}`}
          maxWidth="3xl"
        >
          {isDetailLoading && !activeDossier ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm font-bold text-slate-800">
                Loading Sample Record Dossier...
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Retrieving record for identifier: {selectedSampleId}
              </div>
            </div>
          ) : activeDossier ? (
            <div className="space-y-6">
              {/* Top Banner with Barcode, Laboratory Assignment & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-navy-900 text-white">
                      {activeDossier.accessionNo || 'A-0001'}
                    </span>
                    <span className="text-base font-bold font-mono text-navy-950">
                      {activeDossier.sampleCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                      {typeof activeDossier.laboratory === 'string'
                        ? `${activeDossier.laboratory} LAB`
                        : (activeDossier.laboratory as any)?.name
                        ? (activeDossier.laboratory as any).name
                        : activeDossier.laboratoryType
                        ? `${activeDossier.laboratoryType} LAB`
                        : 'GENERAL LAB'}
                    </span>
                    <StatusBadge status={activeDossier.status} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChitSample(activeDossier)}
                    className="text-xs border-blue-300 bg-blue-50/60 text-blue-800 hover:bg-blue-100 font-semibold"
                  >
                    <QrCode className="h-3.5 w-3.5 mr-1 text-blue-700" />
                    <span>Print Container Slip</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPrintingSample(activeDossier);
                    }}
                    className="text-xs border-slate-300 text-slate-700"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    <span>Print Dossier</span>
                  </Button>
                </div>
              </div>

              {/* Exact 12 Business Fields Display */}
              <div>
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-teal-700" />
                  <span>Analytical Intake Record Fields</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">A. No. (Serial No.)</span>
                    <span className="font-mono font-bold text-navy-950">{activeDossier.accessionNo || 'A-0001'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date & Time</span>
                    <span className="font-mono text-slate-800">{formatDateTime(activeDossier.samplingDate, 'dd/MM/yyyy HH:mm')}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nomenclature</span>
                    <span className="font-bold text-navy-950 line-clamp-1">{activeDossier.nomenclature || activeDossier.materialName}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sample ID</span>
                    <span className="font-mono font-bold text-teal-800">{activeDossier.sampleCode}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stage / Type</span>
                    <span className="font-medium text-slate-800">
                      {activeDossier.stageType || (activeDossier.sampleType ? activeDossier.sampleType.replace(/_/g, ' ') : '—')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Qty. of Sample</span>
                    <span className="font-mono text-slate-800">{activeDossier.sampleQty} {activeDossier.unit}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batch No. / Lot No.</span>
                    <span className="font-mono font-bold text-slate-800">{activeDossier.lotNumber || activeDossier.batch?.batchNumber || 'N/A'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">MFG Date</span>
                    <span className="font-mono text-slate-800">
                      {activeDossier.mfgDate ? formatDateTime(activeDossier.mfgDate, 'dd/MM/yyyy') : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">EXP Date</span>
                    <span className="font-mono text-slate-800">
                      {activeDossier.expDate ? formatDateTime(activeDossier.expDate, 'dd/MM/yyyy') : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submitted By</span>
                    <span className="text-slate-800 truncate block">{activeDossier.submittedBy || 'Plant Production'}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Received By</span>
                    <span className="text-slate-800 truncate block">{activeDossier.accessionedBy?.fullName || activeDossier.assignedTo?.fullName || 'QC Intake Officer'}</span>
                  </div>
                </div>
              </div>





            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-slate-900">
                Sample Record Not Found
              </div>
              <div className="text-xs text-slate-500 max-w-sm">
                No sample record was found matching &ldquo;{selectedSampleId}&rdquo;. Please verify the sample code or accession number.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDetail()}
                className="mt-2 text-xs"
              >
                Retry Lookup
              </Button>
            </div>
          )}
        </Modal>
      )}

      {/* 7. Edit Sample Record Modal (Permissions Enforced) */}
      <EditSampleModal
        isOpen={!!editingSample}
        onClose={() => setEditingSample(null)}
        sample={editingSample}
      />

      {/* 8. Print-Friendly Sample Record Modal */}
      <PrintSampleModal
        isOpen={!!printingSample}
        onClose={() => setPrintingSample(null)}
        sample={printingSample}
      />

      {/* 9. Submit Sample Workflow Modal */}
      <SubmitSampleModal
        isOpen={!!submittingSample}
        onClose={() => setSubmittingSample(null)}
        sample={submittingSample}
      />

      {/* 10. Accession Modal pre-targeted with current active laboratory and section */}
      <NewSampleModal
        isOpen={isAccessionModalOpen}
        onClose={() => setIsAccessionModalOpen(false)}
        defaultLaboratory={isAllLabs ? 'GENERAL' : activeLab.key}
        defaultSection={activeSection === 'all' ? 'semi-base' : activeSection}
        onSampleCreated={(newSample) => {
          handleResetFilters();
          setSelectedSampleId(newSample.id);
          queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
          queryClient.invalidateQueries({ queryKey: ['samples-count-all'] });
          queryClient.invalidateQueries({ queryKey: ['samples-count-sb'] });
          queryClient.invalidateQueries({ queryKey: ['samples-count-fm'] });
          queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
        }}
        onProceedToSubmit={(createdSample) => {
          setSubmittingSample(createdSample);
        }}
      />

      {/* 11. Live QR Code & Barcode Scanner Modal */}
      {isQrScannerOpen && (
        <QrScannerModal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          onScan={handleScanSample}
        />
      )}

      {/* 12. Sample Container Routing Chit Modal */}
      {chitSample && (
        <SampleRoutingChitModal
          isOpen={!!chitSample}
          onClose={() => setChitSample(null)}
          chitData={{
            sample: chitSample,
            destinationLab: chitSample.submissions?.[0]?.destinationLab || null,
            submissionNumber: chitSample.submissions?.[0]?.id
              ? `SUB-${chitSample.submissions[0].id.substring(0, 6).toUpperCase()}`
              : undefined,
            submittedByName: chitSample.submissions?.[0]?.submittedByName || chitSample.submittedBy,
            submittedAt: chitSample.submissions?.[0]?.submissionDate || chitSample.samplingDate,
          }}
          onProceedToSubmit={(sample) => {
            setChitSample(null);
            setSubmittingSample(sample);
          }}
          onViewSampleDetails={(sample) => {
            setChitSample(null);
            setSelectedSampleId(sample.id || sample.sampleCode);
          }}
        />
      )}
      </div>
    </RoleRouteGuard>
  );
}

export default function SamplesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400">Loading sampling records...</div>
      }
    >
      <SamplesPageInner />
    </Suspense>
  );
}
