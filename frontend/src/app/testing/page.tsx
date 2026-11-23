'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService, SamplingFilters } from '@/services/sampling.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Sample, SampleStatus, Priority, getSampleSection, Product, ProductDocument } from '@/types/lims';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { isAssignedToUser, useAllAnalysts } from '@/lib/analysts';
import { auditService } from '@/services/audit.service';
import { productService } from '@/services/product.service';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Beaker,
  Play,
  Loader2,
  FileText,
  Download,
  Eye,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  Send,
  Check,
  Folder,
  ExternalLink,
  X,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import {
  ProductFolderViewerModal,
  DOCUMENT_SLOTS,
  DOCUMENT_CATEGORIES,
} from '@/components/documentation/ProductFolderViewerModal';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';

const LAB_TABS = [
  {
    id: 'general',
    legacyIds: ['gen', 'gl'],
    key: 'GENERAL' as const,
    name: 'General Lab',
    shortLabel: 'General Lab',
    heading: 'Analyst Execution / General Lab',
    icon: FlaskConical,
  },
  {
    id: 'penicillin',
    legacyIds: ['pen', 'pl'],
    key: 'PENICILLIN' as const,
    name: 'Penicillin Lab',
    shortLabel: 'Penicillin Lab',
    heading: 'Analyst Execution / Penicillin Lab',
    icon: FlaskConical,
  },
  {
    id: 'cephalosporin',
    legacyIds: ['ceph', 'cp', 'saf', 'sef'],
    key: 'CEPHALOSPORIN' as const,
    name: 'Cephalosporin Lab',
    shortLabel: 'Cephalosporin Lab',
    heading: 'Analyst Execution / Cephalosporin Lab',
    icon: FlaskConical,
  },
];

// Strictly isolates samples so only records belonging to the active lab are displayed
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
      labType.includes('CEPH') ||
      labName.includes('CEPH') ||
      labName.includes('SAF') ||
      code.includes('CEPH') ||
      code.includes('SAF') ||
      code.startsWith('CP/') ||
      code.includes('/CP/')
    );
  }
  return true;
}



function TestingPageContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { analysts: allAnalystsList } = useAllAnalysts();

  const isSuperAdmin = user?.role === 'ADMIN' || (user?.role as string) === 'SUPER_ADMIN' || (user?.role as string) === 'HOD';
  const isManager = isSuperAdmin || user?.role === 'DEPUTY_MANAGER' || user?.role === 'MANAGER' || user?.role === 'SHIFT_INCHARGE' || (user?.role as string) === 'ASSISTANT_MANAGER';
  const isAnalyst = !isManager;

  // Active Laboratory Tab
  const labParam = (searchParams.get('lab') || 'general').toLowerCase();
  const isAllLabs = labParam === 'all' || labParam === 'facility';

  const activeLab = useMemo(() => {
    const found = LAB_TABS.find((t) => t.id === labParam || t.legacyIds.includes(labParam));
    return found || LAB_TABS[0];
  }, [labParam]);

  // Active Section Filter (All, Semi Basics, Formulation)
  const sectionParam = searchParams.get('section')?.toLowerCase() || 'all';
  const [activeSection, setActiveSection] = useState<'all' | 'semi-base' | 'formulation'>(
    sectionParam === 'semi-base' || sectionParam === 'formulation' ? sectionParam : 'all'
  );

  useEffect(() => {
    if (sectionParam === 'semi-base' || sectionParam === 'formulation') {
      setActiveSection(sectionParam);
    } else {
      setActiveSection('all');
    }
  }, [sectionParam]);

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);

  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [selectedAnalystFilter, setSelectedAnalystFilter] = useState<string>(() => {
    return isManager ? 'ALL' : 'MY_WORK';
  });



  // Stored tasks synchronization from localStorage (assigned from /tasks)
  const [storedTasks, setStoredTasks] = useState<any[]>([]);

  useEffect(() => {
    const syncTasks = () => {
      try {
        const raw = localStorage.getItem('city_pharma_lims_tasks');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (t: any) =>
                t.id !== 'tsk-001' &&
                !t.testProtocol?.includes('HPLC Potency Assay & Chromatographic Purity') &&
                !(t.sampleId === 'GL/SB-1' && (t.numericResult === 3 || t.numericResult === '3'))
            );
            if (cleaned.length !== parsed.length) {
              localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(cleaned));
            }
            setStoredTasks(cleaned);
            return;
          }
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

  // Track in-progress execution triggers
  const [executingSampleId, setExecutingSampleId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 25;

  // Build unified query filters matching Sample Registration (/samples)
  const queryFilters: SamplingFilters = useMemo(
    () => ({
      laboratory: isAllLabs ? undefined : activeLab.key,
      section: activeSection === 'all' ? undefined : activeSection,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      stage: stageFilter || undefined,
      page,
      limit,
    }),
    [isAllLabs, activeLab.key, activeSection, debouncedSearch, statusFilter, stageFilter, page, limit]
  );

  // Fetch samples from unified sampling service
  const {
    data: responseData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['samples-for-testing', queryFilters],
    queryFn: () => samplingService.getAll(queryFilters),
    refetchInterval: 5000,
  });

  // All samples strictly matching active laboratory and section
  const allLabSamples: Sample[] = useMemo(() => {
    let raw: Sample[] = [];
    if (responseData) {
      if (Array.isArray(responseData)) raw = responseData;
      else if (Array.isArray((responseData as any).data)) raw = (responseData as any).data;
    }

    return raw.filter((s) => {
      if (!isAllLabs && !isSampleInLab(s, activeLab.key)) return false;
      if (activeSection !== 'all') {
        const sec = getSampleSection(s);
        if (sec !== activeSection) return false;
      }
      return true;
    });
  }, [responseData, isAllLabs, activeLab.key, activeSection]);

  // Count how many samples in the active view are assigned to current logged-in analyst
  const myAssignedCount = useMemo(() => {
    return allLabSamples.filter((s) => {
      return (
        isAssignedToUser(s, user) ||
        storedTasks.some((t) => {
          const matchCode = (t.sampleId || t.accessionNo || '').toUpperCase();
          const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
          return matchCode === sCode && isAssignedToUser(t, user);
        })
      );
    }).length;
  }, [allLabSamples, user, storedTasks]);

  // Extract samples array safely with analyst filtration
  const samplesList: Sample[] = useMemo(() => {
    // STRICT ANALYST ISOLATION: Analysts must ONLY ever see samples assigned directly to them!
    if (isAnalyst || selectedAnalystFilter === 'MY_WORK') {
      return allLabSamples.filter((s) => {
        return (
          isAssignedToUser(s, user) ||
          storedTasks.some((t) => {
            const matchCode = (t.sampleId || t.accessionNo || '').toUpperCase();
            const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
            return matchCode === sCode && isAssignedToUser(t, user);
          })
        );
      });
    }

    if (selectedAnalystFilter !== 'ALL') {
      return allLabSamples.filter((s) => {
        const matchingTask = storedTasks.find((t) => {
          const matchCode = (t.sampleId || t.accessionNo || '').toUpperCase();
          const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
          return matchCode === sCode;
        });
        const assignedId = s.assignedToId || (s.assignedTo as any)?.id || matchingTask?.assignedAnalystId;
        const assignedUsername = (s.assignedTo as any)?.username || matchingTask?.assignedAnalystUsername;
        const assignedName = s.assignedTo?.fullName || matchingTask?.assignedAnalystName;
        return (
          assignedId === selectedAnalystFilter ||
          assignedUsername === selectedAnalystFilter ||
          assignedName === selectedAnalystFilter
        );
      });
    }

    return allLabSamples;
  }, [allLabSamples, selectedAnalystFilter, user, storedTasks, isAnalyst]);

  const meta = useMemo(() => {
    const effectiveTotal = samplesList.length;
    return {
      total: effectiveTotal,
      page,
      limit,
      totalPages: Math.ceil(effectiveTotal / limit) || 1,
    };
  }, [samplesList.length, page, limit]);

  // Load available instruments
  const { data: instrumentsResponse } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.get<any>('/instruments'),
  });

  const instruments: any[] = useMemo(() => {
    if (!instrumentsResponse) return [];
    if (Array.isArray(instrumentsResponse)) return instrumentsResponse;
    if (Array.isArray((instrumentsResponse as any).data)) return (instrumentsResponse as any).data;
    return [];
  }, [instrumentsResponse]);

  // Product folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [selectedFolderProduct, setSelectedFolderProduct] = useState<Product | null>(null);

  // Load commercial products to link official description PDF documents
  const { data: productsList = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  // Helper to match full product record for a test or sample
  const getProductForTest = React.useCallback(
    (testOrSample: any): Product | null => {
      if (!productsList || productsList.length === 0 || !testOrSample) return null;
      const mat = (testOrSample?.materialName || testOrSample?.nomenclature || '').toLowerCase().trim();
      const sample = (testOrSample?.sampleCode || testOrSample?.sampleId || '').toLowerCase().trim();
      const specName = (testOrSample?.testSpecification?.name || testOrSample?.testSpecification?.testCode || '').toLowerCase().trim();
      const pId = (testOrSample?.productId || '').toLowerCase().trim();
      const sampleLab = (testOrSample?.laboratoryType || testOrSample?.laboratory || '').toUpperCase().trim();

      // 1. Direct ID / ATM Code Match
      if (pId) {
        const byId = productsList.find((p) => p.id.toLowerCase() === pId || p.atmCode.toLowerCase() === pId);
        if (byId) return byId;
      }

      // 2. Exact Brand / Generic match within the same laboratory
      if (mat && sampleLab) {
        const sameLabMatch = productsList.find(
          (p) =>
            (p.laboratory || 'GENERAL').toUpperCase() === sampleLab &&
            (p.brandName.toLowerCase() === mat ||
              p.genericName.toLowerCase() === mat ||
              mat.includes(p.brandName.toLowerCase()) ||
              p.brandName.toLowerCase().includes(mat))
        );
        if (sameLabMatch) return sameLabMatch;
      }

      // 3. Exact Brand / Generic match across any lab
      if (mat) {
        const exactBrand = productsList.find(
          (p) =>
            p.brandName.toLowerCase() === mat ||
            p.genericName.toLowerCase() === mat ||
            mat.includes(p.brandName.toLowerCase())
        );
        if (exactBrand) return exactBrand;
      }

      // 4. Token-based match (e.g. "Panadol 500mg" matches "Panadol")
      const matchedProduct = productsList.find((p) => {
        const brand = p.brandName.toLowerCase();
        const generic = p.genericName.toLowerCase();
        const atm = p.atmCode.toLowerCase();
        const brandTokens = brand.split(/[\s-]+/).filter((t: string) => t.length > 2);
        const genericTokens = generic.split(/[\s-]+/).filter((t: string) => t.length > 2);

        if (atm && (mat.includes(atm) || sample.includes(atm))) return true;
        if (brandTokens.some((tok: string) => mat.includes(tok) || specName.includes(tok) || sample.includes(tok))) return true;
        if (genericTokens.some((tok: string) => mat.includes(tok) || specName.includes(tok))) return true;
        return false;
      });

      return matchedProduct || null;
    },
    [productsList]
  );

  const getProductDocForTest = React.useCallback(
    (testOrSample: any) => {
      const prod = getProductForTest(testOrSample);
      return prod?.currentDocument || null;
    },
    [getProductForTest]
  );

  // Helper to extract tests and tasks belonging to a specific sample
  const getTestsForSample = React.useCallback(
    (sample: Sample) => {
      const sCode = (sample.sampleCode || sample.sampleId || sample.accessionNo || sample.id || '').toUpperCase();

      // Database tests attached to sample
      const dbTests = (sample.tests || []).map((t: any) => ({
        ...t,
        sampleCode: sample.sampleCode || sample.sampleId,
        materialName: sample.materialName || sample.nomenclature,
        samplePriority: sample.priority,
        batchNumber: sample.batch?.batchNumber || sample.lotNumber,
        assignedAnalystName: t.analyst?.fullName || sample.assignedTo?.fullName,
        assignedAnalystUsername: t.analyst?.username || (sample.assignedTo as any)?.username,
      }));

      // Merged tasks from task assignment board
      const matchingTasks = storedTasks.filter((t) => {
        const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
        if (tCode !== sCode) return false;
        if (t.id === 'tsk-001' || (t.testProtocol && t.testProtocol.includes('HPLC Potency Assay & Chromatographic Purity'))) return false;
        return true;
      });

      const taskWorksheets = matchingTasks.map((t: any) => ({
        id: t.id,
        isTaskItem: true,
        taskCode: t.taskCode,
        sampleCode: sample.sampleCode || t.sampleId,
        materialName: sample.materialName || t.sampleName,
        samplePriority: t.priority || sample.priority || 'ROUTINE',
        batchNumber: t.lotNumber || sample.lotNumber || '—',
        status: t.status === 'COMPLETED' ? 'COMPLETED' : t.status === 'IN_PROGRESS' ? 'IN_ANALYSIS' : 'PENDING',
        resultStatus: t.resultStatus || (t.status === 'COMPLETED' ? 'PASSED' : 'PENDING'),
        numericResult: t.numericResult !== undefined ? t.numericResult : null,
        textResult: t.textResult || null,
        unit: '%',
        minLimit: 95.0,
        maxLimit: 105.0,
        targetValue: 100.0,
        instrumentId: t.instrumentId,
        instrument: t.instrument || { equipmentCode: 'HPLC-01', name: 'Agilent 1260 Infinity II HPLC' },
        rawDataReference: t.rawDataReference,
        comments: t.instructions,
        testSpecification: {
          name: t.testProtocol || 'Compendial Potency Assay',
          testCode: t.taskCode,
          pharmacopeiaMethod: 'BP 2024 / USP 44',
          category: (t.testProtocol || '').toLowerCase().includes('dissolution')
            ? 'PHYSICAL'
            : (t.testProtocol || '').toLowerCase().includes('micro')
            ? 'MICROBIOLOGICAL'
            : 'CHROMATOGRAPHY',
        },
        assignedAnalystId: t.assignedAnalystId,
        assignedAnalystName: t.assignedAnalystName,
        assignedAnalystUsername: t.assignedAnalystUsername,
      }));

      const existingNames = new Set(dbTests.map((x: any) => (x.testSpecification?.name || '').toUpperCase()));
      const uniqueTasks = taskWorksheets.filter((tw: any) => !existingNames.has((tw.testSpecification?.name || '').toUpperCase()));

      const combined = [...dbTests, ...uniqueTasks];

      // If sample has no tests generated yet, provide clean compendial default tests
      if (combined.length === 0) {
        return [
          {
            id: `default-assay-${sample.id}`,
            isDefault: true,
            sampleId: sample.id,
            sampleCode: sample.sampleCode,
            materialName: sample.materialName || sample.nomenclature,
            status: sample.status === 'APPROVED' || sample.status === 'REVIEW_PENDING' ? 'COMPLETED' : 'PENDING',
            resultStatus: sample.status === 'APPROVED' ? 'PASSED' : 'PENDING',
            minLimit: 95.0,
            maxLimit: 105.0,
            targetValue: 100.0,
            unit: '%',
            testSpecification: {
              name: 'Chemical Potency Assay (HPLC)',
              testCode: 'SPEC-ASSAY-01',
              pharmacopeiaMethod: 'USP 44 / BP 2024',
              category: 'CHROMATOGRAPHY',
            },
            assignedAnalystName: sample.assignedTo?.fullName || 'Assigned QC Analyst',
          },
          {
            id: `default-ph-${sample.id}`,
            isDefault: true,
            sampleId: sample.id,
            sampleCode: sample.sampleCode,
            materialName: sample.materialName || sample.nomenclature,
            status: sample.status === 'APPROVED' || sample.status === 'REVIEW_PENDING' ? 'COMPLETED' : 'PENDING',
            resultStatus: sample.status === 'APPROVED' ? 'PASSED' : 'PENDING',
            minLimit: 4.5,
            maxLimit: 6.5,
            targetValue: 5.5,
            unit: 'pH',
            testSpecification: {
              name: 'pH Determination',
              testCode: 'SPEC-PH-02',
              pharmacopeiaMethod: 'BP Appendix V L',
              category: 'CHEMICAL',
            },
            assignedAnalystName: sample.assignedTo?.fullName || 'Assigned QC Analyst',
          },
        ];
      }

      return combined;
    },
    [storedTasks]
  );

  const handleExecuteAnalysis = async (sample: Sample) => {
    if (!sample || !sample.id) return;
    setExecutingSampleId(sample.id);

    try {
      // 1. Update backend sample status to TESTING_IN_PROGRESS
      await samplingService.update(sample.id, {
        status: 'TESTING_IN_PROGRESS',
        reasonForChange: `Analysis execution started by ${user?.fullName || 'Analyst'}`,
      });

      // 2. Update local stored tasks if any match this sample
      try {
        const raw = localStorage.getItem('city_pharma_lims_tasks');
        if (raw) {
          const list = JSON.parse(raw);
          const sCode = (sample.sampleCode || sample.accessionNo || sample.sampleId || '').toUpperCase();
          const updated = list.map((t: any) => {
            const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
            if (tCode === sCode) {
              return { ...t, status: 'IN_PROGRESS' as const };
            }
            return t;
          });
          localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
          window.dispatchEvent(new Event('lims-tasks-updated'));
        }
      } catch (e) {}

      // 3. Log 21 CFR Part 11 Audit Trail
      auditService.logActivity({
        action: 'ANALYSIS_STARTED',
        entityName: 'Sample',
        entityId: sample.sampleCode || sample.id,
        performedByName: user?.fullName || 'Analyst',
        role: user?.role || 'QC_ANALYST',
        reasonForChange: `Analysis started for sample ${sample.sampleCode || sample.id}`,
        diffPayload: {
          sampleCode: sample.sampleCode,
          previousStatus: sample.status,
          newStatus: 'TESTING_IN_PROGRESS',
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      await refetch();
    } catch (err: any) {
      console.error('Error starting analysis execution:', err);
      await queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      await refetch();
    } finally {
      setExecutingSampleId(null);
    }
  };

  const handleLabChange = (labId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lab', labId);
    setPage(1);
    router.push(`/testing?${params.toString()}`);
  };

  const handleSectionChange = (sec: 'all' | 'semi-base' | 'formulation') => {
    setActiveSection(sec);
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', sec);
    setPage(1);
    router.push(`/testing?${params.toString()}`);
  };

  return (
    <RoleRouteGuard
      allowedRoles={[
        'QC_ANALYST',
        'ANALYST',
        'TESTING_ANALYST',
        'SUPER_ADMIN',
        'ADMIN',
        'HOD',
        'MANAGER',
        'DEPUTY_MANAGER',
        'SHIFT_INCHARGE',
        'ASSISTANT_MANAGER',
      ]}
      moduleName="Analytical Testing Workstation"
    >
      <div className="space-y-6">
      {/* Title & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-teal-700" />
            <span>Analyst Execution &amp; Testing Worksheets</span>
          </h1>
        </div>

        {/* Documentation Repository Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            href="/testing/documentation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all border border-teal-600/50 cursor-pointer"
            title="Open Product Documentation Repository in New Window"
          >
            <Folder className="w-4 h-4 text-teal-200" />
            <span>Product Documentation</span>
            <ExternalLink className="w-3.5 h-3.5 text-teal-300" />
          </Link>
        </div>
      </div>

      {/* Laboratory Tabs (All Labs, General Lab, Penicillin Lab, Cephalosporin Lab) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => handleLabChange('all')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer',
            isAllLabs
              ? 'bg-navy-950 text-white border-navy-950 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          <Layers className={cn('h-3.5 w-3.5', isAllLabs ? 'text-teal-400' : 'text-slate-400')} />
          <span>All Labs</span>
        </button>

        {LAB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = !isAllLabs && activeLab.id === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleLabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                isActive
                  ? 'bg-navy-950 text-white border-navy-950 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-teal-400' : 'text-slate-400')} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

          {/* Section Sub-Tabs (All, Semi Basics, Formulation) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Section:</span>
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'semi-base', label: 'Semi Basics' },
              { id: 'formulation', label: 'Formulation' },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => handleSectionChange(sec.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                  activeSection === sec.id
                    ? 'bg-blue-50 text-blue-800 border-blue-200 font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Work Assignment & View Mode Filter */}
          {isManager ? (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assignment:</span>
                <button
                  type="button"
                  onClick={() => setSelectedAnalystFilter('ALL')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                    selectedAnalystFilter === 'ALL'
                      ? 'bg-navy-950 text-white border-navy-950 font-bold shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Samples</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                    selectedAnalystFilter === 'ALL' ? 'bg-teal-500/30 text-teal-200 font-bold' : 'bg-slate-100 text-slate-600'
                  )}>
                    {allLabSamples.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAnalystFilter('MY_WORK')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5',
                    selectedAnalystFilter === 'MY_WORK'
                      ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-2xs ring-2 ring-teal-200'
                      : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-50'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Assigned to Me</span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                    selectedAnalystFilter === 'MY_WORK' ? 'bg-white text-teal-900' : 'bg-teal-100 text-teal-900'
                  )}>
                    {myAssignedCount}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">Filter by Analyst:</span>
                <select
                  value={selectedAnalystFilter}
                  onChange={(e) => setSelectedAnalystFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white font-medium text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Analysts (Facility)</option>
                  <option value="MY_WORK">★ Assigned to Me ({myAssignedCount})</option>
                  {allAnalystsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.lab})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-teal-50/70 p-3 rounded-xl border border-teal-200/80 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-700 text-white inline-flex items-center gap-1.5 shadow-2xs">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>My Assigned Testing Queue</span>
                </span>
              </div>
              <div className="text-xs font-bold text-teal-900 bg-white px-3 py-1 rounded-lg border border-teal-200 shadow-2xs">
                {samplesList.length} {samplesList.length === 1 ? 'Assigned Sample' : 'Assigned Samples'}
              </div>
            </div>
          )}

          {/* Universal Search & Quick Filters Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-slate-900 bg-white font-medium"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white font-medium text-slate-700 cursor-pointer"
                >
                  <option value="">All Sample Statuses</option>
                  <option value="REGISTERED">Registered / Pending Analysis</option>
                  <option value="IN_TESTING">In Testing / Analysis</option>
                  <option value="TESTING_COMPLETE">Testing Complete</option>
                  <option value="UNDER_REVIEW">Under Quality Review</option>
                  <option value="APPROVED">Approved / Released</option>
                </select>
              </div>

              <div>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white font-medium text-slate-700 cursor-pointer"
                >
                  <option value="">All Stages / Types</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="PACKING_MATERIAL">Packing Material</option>
                  <option value="INTERMEDIATE">Intermediate / Semi Base</option>
                  <option value="IN_PROCESS">In-Process</option>
                  <option value="FINISHED_PRODUCT">Finished Product</option>
                  <option value="STABILITY">Stability Protocol</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setStageFilter('');
                    setActiveSection('all');
                  }}
                  className="w-full text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5 text-slate-400" />
                  <span>Reset Filters</span>
                </Button>
              </div>
            </div>
          </div>

          {/* MAIN SAMPLES & ANALYST EXECUTION TABLE — EXACT MATCH TO SAMPLE REGISTRATION */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-600 uppercase tracking-wider font-bold select-none">
                    {/* 1. A. No. */}
                    <th className="py-3 px-3.5 w-[95px] min-w-[95px]">
                      <span>A. No.</span>
                    </th>

                    {/* 2. Date & Time */}
                    <th className="py-3 px-3.5 w-[140px] min-w-[140px]">
                      <span>Date &amp; Time</span>
                    </th>

                    {/* 3. Nomenclature */}
                    <th className="py-3 px-3.5 min-w-[200px] max-w-xs">
                      <span>Nomenclature</span>
                    </th>

                    {/* 4. Sample ID */}
                    <th className="py-3 px-3.5 w-[130px] min-w-[130px]">
                      <span>Sample ID</span>
                    </th>

                    {/* 5. Stage / Type */}
                    <th className="py-3 px-3.5 w-[130px] min-w-[130px]">
                      <span>Stage / Type</span>
                    </th>

                    {/* 6. Qty. of Sample */}
                    <th className="py-3 px-3.5 w-[110px] min-w-[110px]">
                      <span>Qty. of Sample</span>
                    </th>

                    {/* 7. Batch No. / Lot No. */}
                    <th className="py-3 px-3.5 w-[135px] min-w-[135px]">
                      <span>Batch No. / Lot No.</span>
                    </th>

                    {/* 8. MFG Date */}
                    <th className="py-3 px-3.5 w-[105px] min-w-[105px]">
                      <span>MFG Date</span>
                    </th>

                    {/* 9. EXP Date */}
                    <th className="py-3 px-3.5 w-[105px] min-w-[105px]">
                      <span>EXP Date</span>
                    </th>

                    {/* 10. Submitted By */}
                    <th className="py-3 px-3.5 min-w-[140px]">
                      <span>Submitted By</span>
                    </th>

                    {/* 11. Received By */}
                    <th className="py-3 px-3.5 min-w-[140px]">
                      <span>Received By</span>
                    </th>

                    {/* 12. Analyst Execution & Actions */}
                    <th className="py-3 px-3.5 min-w-[180px] text-right">
                      <span>Analysis Execution</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
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
                        <td className="py-3.5 px-3.5 text-right"><div className="h-7 bg-slate-200 rounded w-28 ml-auto" /></td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={12} className="py-12 px-4 text-center">
                        <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                          <div className="flex items-center justify-center gap-2 font-bold text-sm">
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                            <span>Failed to Load Sampling Records</span>
                          </div>
                          <p className="text-xs text-rose-600">
                            Could not synchronize with laboratory database. Please verify backend connection.
                          </p>
                          <Button size="sm" variant="outline" onClick={() => refetch()} className="border-rose-300 text-rose-700 bg-white">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span>Retry</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : samplesList.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-14 px-4 text-center">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                            <FlaskConical className="h-6 w-6 text-slate-400" />
                          </div>
                          <h4 className="text-sm font-bold text-navy-950">No Assigned Samples in Queue</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {isAnalyst
                              ? `No active samples are currently assigned to you (${(user?.fullName || 'Personnel').replace(/\s*\([^)]*\)/g, '').trim()}) for ${isAllLabs ? 'any laboratory' : activeLab.name}.`
                              : selectedAnalystFilter === 'MY_WORK'
                              ? `No active samples are currently assigned to you (${(user?.fullName || 'Personnel').replace(/\s*\([^)]*\)/g, '').trim()}) for ${isAllLabs ? 'any laboratory' : activeLab.name}.`
                              : `No analytical samples have been registered for ${isAllLabs ? 'any laboratory' : activeLab.name} yet.`}
                          </p>
                          {isManager && (
                            <Link href="/samples">
                              <Button size="sm" variant="primary" className="bg-navy-900 text-white text-xs font-semibold">
                                <PlusCircle className="h-3.5 w-3.5 text-teal-400 mr-1" />
                                <span>Go to Sample Registration</span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
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

                      const sampleTests = getTestsForSample(sample);

                      const isAskprolItem =
                        (sample.sampleCode || '').toUpperCase().includes('ASK') ||
                        (sample.nomenclature || '').toLowerCase().includes('askprol') ||
                        (sample.materialName || '').toLowerCase().includes('askprol');

                      return (
                        <React.Fragment key={sample.id}>
                          <tr className="hover:bg-slate-50/90 transition-colors group">
                            {/* 1. A. No. */}
                            <td className="py-3 px-3.5 font-mono font-bold text-navy-950 group-hover:text-teal-700 text-xs">
                              <span>{sample.accessionNo || 'A-0001'}</span>
                            </td>

                            {/* 2. Date & Time */}
                            <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {formatDateTime(sample.samplingDate, 'dd/MM/yyyy HH:mm')}
                            </td>

                            {/* 3. Nomenclature */}
                            <td className="py-3 px-3.5 min-w-[200px] max-w-xs">
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
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Assigned Analyst Status Badge */}
                              {(() => {
                                const matchingStoredTask = storedTasks.find((t) => {
                                  const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
                                  const sCode = (sample.sampleCode || sample.accessionNo || sample.sampleId || '').toUpperCase();
                                  return tCode === sCode;
                                });
                                const isMine = isAssignedToUser(sample, user) || (matchingStoredTask && isAssignedToUser(matchingStoredTask, user));
                                const assignedName = sample.assignedTo?.fullName || matchingStoredTask?.assignedAnalystName;

                                return (
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {isMine ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-teal-700" />
                                        <span>Assigned to You</span>
                                      </span>
                                    ) : assignedName ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                        <span>👤 {assignedName}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 italic">Unassigned</span>
                                    )}
                                    {matchingStoredTask?.priority === 'URGENT' && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                        Urgent Task
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* 4. Sample ID */}
                            <td className="py-3 px-3.5 font-mono font-bold text-teal-800 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{sample.sampleCode}</span>
                                {(sample.priority === 'URGENT' || sample.priority === 'STAT') && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    Urgent
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
                            <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[140px] truncate" title={submittedText}>
                              {submittedText}
                            </td>

                            {/* 11. Received By & Assigned Analyst */}
                            <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[140px]">
                              <div className="truncate font-medium" title={receivedText}>{receivedText}</div>
                              {sample.assignedTo?.fullName && (
                                <div className="text-[10px] text-teal-700 font-semibold truncate mt-0.5" title={`Assigned QC Analyst: ${sample.assignedTo.fullName}`}>
                                  QC: {sample.assignedTo.fullName}
                                </div>
                              )}
                            </td>

                            {/* 12. Analyst Execution Actions */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {(() => {
                                  const rowProd = getProductForTest(sample);
                                  const rowDocs = rowProd?.documents || [];
                                  if (rowDocs.length === 0) return null;
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedFolderProduct(rowProd);
                                        setFolderModalOpen(true);
                                      }}
                                      className="h-7 px-2 rounded-lg text-xs font-bold border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                      title={`View ${rowDocs.length} documentation files for ${rowProd?.brandName || 'Product'}`}
                                    >
                                      <Folder className="h-3 w-3 text-teal-600" />
                                      <span>Docs ({rowDocs.length})</span>
                                    </button>
                                  );
                                })()}

                                {(() => {
                                  const statusStr = String(sample.status || '');
                                  const isDone = statusStr === 'COMPLETED' || statusStr === 'APPROVED' || statusStr === 'REVIEW_PENDING';
                                  const isInProgress = statusStr === 'TESTING_IN_PROGRESS' || statusStr === 'IN_PROGRESS' || statusStr === 'IN_ANALYSIS';

                                  if (isDone) {
                                    return (
                                      <span className="h-7 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Completed</span>
                                      </span>
                                    );
                                  }

                                  if (isInProgress) {
                                    return (
                                      <span className="h-7 px-2.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <span>In Progress</span>
                                      </span>
                                    );
                                  }

                                  return (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleExecuteAnalysis(sample)}
                                      disabled={executingSampleId === sample.id}
                                      className="h-7 text-xs bg-navy-900 hover:bg-navy-800 text-white font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      {executingSampleId === sample.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-teal-300" />
                                      ) : (
                                        <Play className="h-3 w-3 text-teal-400" />
                                      )}
                                      <span>Execute Analysis</span>
                                    </Button>
                                  );
                                })()}

                                {isAskprolItem && (
                                  <Link
                                    href={`/askprol?batchNumber=${batchLotText}&sampleCode=${sample.sampleCode}&stage=${sample.stageType || sample.sampleType}`}
                                    className="h-7 px-2 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1 transition-colors shadow-2xs"
                                    title="Open official ATM-003 testing worksheet"
                                  >
                                    <Beaker className="h-3 w-3 text-purple-600" />
                                    <span>ATM-003</span>
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
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
                  <span>No records to display</span>
                )}
              </div>

              {meta.totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs border-slate-200"
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-slate-600 font-medium">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    className="h-8 text-xs border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>







      {/* Product Folder Dossier Modal for Analysts */}
      <ProductFolderViewerModal
        isOpen={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false);
          setSelectedFolderProduct(null);
        }}
        product={selectedFolderProduct}
        readOnly={true}
      />
    </div>
    </RoleRouteGuard>
  );
}

export default function TestingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          <FlaskConical className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
          <span>Loading Analyst Execution Workstation...</span>
        </div>
      }
    >
      <TestingPageContent />
    </Suspense>
  );
}
