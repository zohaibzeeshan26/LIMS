'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService, SamplingFilters } from '@/services/sampling.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Sample, SampleStatus, Priority, getSampleSection } from '@/types/lims';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { STATIC_ANALYSTS, isAssignedToUser, useAllAnalysts } from '@/lib/analysts';
import { auditService } from '@/services/audit.service';
import { productService } from '@/services/product.service';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  FlaskConical,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Beaker,
  Play,
  ArrowLeft,
  BookOpen,
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  Send,
  Check,
} from 'lucide-react';
import { OfficialAtm003Document } from '@/components/askprol/OfficialAtm003Document';

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

  const isSuperAdmin = user?.role === 'ADMIN' || (user?.role as string) === 'SUPER_ADMIN';
  const isManager = isSuperAdmin || user?.role === 'MANAGER' || user?.role === 'DEPUTY_MANAGER' || user?.role === 'SHIFT_INCHARGE';
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
  const [selectedAnalystFilter, setSelectedAnalystFilter] = useState<string>('ALL');
  const [testingTab, setTestingTab] = useState<'QUEUE' | 'OFFICIAL_SOP'>('QUEUE');

  // Expanded rows to inspect nested test worksheets directly
  const [expandedSampleIds, setExpandedSampleIds] = useState<Set<string>>(new Set());

  const toggleExpandSample = (id: string) => {
    setExpandedSampleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // Selected test for recording results in modal
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [numericResult, setNumericResult] = useState<string>('');
  const [textResult, setTextResult] = useState<string>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [rawDataReference, setRawDataReference] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  // Selected sample for full execution drawer/modal
  const [selectedSampleForExecution, setSelectedSampleForExecution] = useState<Sample | null>(null);

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

  // Extract samples array safely
  const samplesList: Sample[] = useMemo(() => {
    let raw: Sample[] = [];
    if (responseData) {
      if (Array.isArray(responseData)) raw = responseData;
      else if (Array.isArray((responseData as any).data)) raw = (responseData as any).data;
    }

    // Apply strict laboratory & section filtration to match Sample Registration
    return raw.filter((s) => {
      if (!isAllLabs && !isSampleInLab(s, activeLab.key)) return false;
      if (activeSection !== 'all') {
        const sec = getSampleSection(s);
        if (sec !== activeSection) return false;
      }
      return true;
    });
  }, [responseData, isAllLabs, activeLab.key, activeSection]);

  const meta = useMemo(() => {
    if (responseData && (responseData as any).meta) {
      return (responseData as any).meta;
    }
    return {
      total: samplesList.length,
      page,
      limit,
      totalPages: Math.ceil(samplesList.length / limit) || 1,
    };
  }, [responseData, samplesList.length, page, limit]);

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

  // Load commercial products to link official description PDF documents
  const { data: productsList = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  const getProductDocForTest = React.useCallback(
    (testOrSample: any) => {
      if (!productsList || productsList.length === 0) return null;
      const mat = (testOrSample?.materialName || testOrSample?.nomenclature || '').toLowerCase();
      const sample = (testOrSample?.sampleCode || testOrSample?.sampleId || '').toLowerCase();
      const specName = (testOrSample?.testSpecification?.name || testOrSample?.testSpecification?.testCode || '').toLowerCase();
      const pId = (testOrSample?.productId || '').toLowerCase();

      const matchedProduct = productsList.find((p) => {
        const id = p.id.toLowerCase();
        const brand = p.brandName.toLowerCase();
        const generic = p.genericName.toLowerCase();
        const atm = p.atmCode.toLowerCase();
        const brandTokens = brand.split(/[\s-]+/).filter((t: string) => t.length > 2);
        const genericTokens = generic.split(/[\s-]+/).filter((t: string) => t.length > 2);

        if (pId && (id === pId || atm === pId)) return true;
        if (mat && (mat.includes(brand) || mat.includes(generic) || mat.includes(atm))) return true;
        if (brandTokens.some((tok: string) => mat.includes(tok) || specName.includes(tok) || sample.includes(tok))) return true;
        if (genericTokens.some((tok: string) => mat.includes(tok) || specName.includes(tok))) return true;
        return false;
      });

      return matchedProduct?.currentDocument || null;
    },
    [productsList]
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
        return tCode === sCode;
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

  // Mutation to record result on backend
  const recordResultMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/tests/${activeTest.id}/record-result`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      setActiveTest(null);
      setNumericResult('');
      setTextResult('');
      setRawDataReference('');
      setComments('');
    },
  });

  const openRecordModal = (test: any) => {
    setActiveTest(test);
    setNumericResult(test.numericResult !== null && test.numericResult !== undefined ? String(test.numericResult) : '');
    setTextResult(test.textResult || '');
    setSelectedInstrumentId(test.instrumentId || '');
    setRawDataReference(test.rawDataReference || '');
    setComments(test.comments || '');
  };

  // Instant Real-Time Specification Limit Auto-Evaluation
  const evaluatedStatus = React.useMemo(() => {
    if (!activeTest || numericResult === '') return null;
    const num = parseFloat(numericResult);
    if (isNaN(num)) return null;

    const min = activeTest.minLimit ?? activeTest.testSpecification?.defaultMinLimit ?? 95.0;
    const max = activeTest.maxLimit ?? activeTest.testSpecification?.defaultMaxLimit ?? 105.0;

    if (min !== null && min !== undefined && num < min) return 'OUT_OF_SPEC';
    if (max !== null && max !== undefined && num > max) return 'OUT_OF_SPEC';
    return 'WITHIN_SPEC';
  }, [activeTest, numericResult]);

  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest) return;

    const isPass = evaluatedStatus === 'WITHIN_SPEC';
    const statusOutcome = isPass ? 'PASSED' : evaluatedStatus === 'OUT_OF_SPEC' ? 'OUT_OF_SPEC' : 'RECORDED';

    if (activeTest.isTaskItem || activeTest.isDefault) {
      const status = 'COMPLETED';
      const resultStatus = isPass ? 'PASSED' : 'FAILED';

      const updated = storedTasks.map((t) => {
        if (t.id === activeTest.id || t.taskCode === activeTest.taskCode || t.sampleId === activeTest.sampleCode) {
          return {
            ...t,
            status,
            resultStatus,
            numericResult: numericResult !== '' ? parseFloat(numericResult) : undefined,
            textResult: textResult || undefined,
            instrumentId: selectedInstrumentId || undefined,
            rawDataReference,
            instructions: comments || t.instructions,
          };
        }
        return t;
      });

      // If test was a clean default, add it to stored tasks
      if (activeTest.isDefault && !storedTasks.some((t) => t.id === activeTest.id)) {
        updated.push({
          id: activeTest.id,
          taskCode: activeTest.testSpecification?.testCode || 'TASK-QC-01',
          sampleId: activeTest.sampleCode,
          sampleName: activeTest.materialName,
          status,
          resultStatus,
          numericResult: numericResult !== '' ? parseFloat(numericResult) : undefined,
          textResult: textResult || undefined,
          instrumentId: selectedInstrumentId || undefined,
          rawDataReference,
          instructions: comments,
          testProtocol: activeTest.testSpecification?.name,
        });
      }

      setStoredTasks(updated);
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      // 21 CFR Part 11 Audit Trail
      auditService.logActivity({
        action: 'TEST_RESULT_RECORDED',
        entityName: 'TestWorksheet',
        entityId: activeTest.id || activeTest.sampleCode,
        performedByName: user?.fullName || 'Analyst',
        role: user?.role || 'QC_ANALYST',
        reasonForChange: `Recorded analytical result for ${activeTest.sampleCode} (${activeTest.testSpecification?.name || 'Assay'}): ${numericResult || textResult} (${statusOutcome})`,
        diffPayload: {
          details: `${user?.fullName || 'Analyst'} logged analytical result for ${activeTest.sampleCode}: ${numericResult !== '' ? numericResult + ' %' : textResult} [${statusOutcome}]`,
          sampleCode: activeTest.sampleCode,
          testName: activeTest.testSpecification?.name,
          result: numericResult || textResult,
          status: statusOutcome,
          rawDataReference,
        },
      });

      setActiveTest(null);
      setNumericResult('');
      setTextResult('');
      setRawDataReference('');
      setComments('');
      return;
    }

    // Backend database test update
    auditService.logActivity({
      action: 'TEST_RESULT_RECORDED',
      entityName: 'TestWorksheet',
      entityId: activeTest.id || activeTest.sampleCode,
      performedByName: user?.fullName || 'Analyst',
      role: user?.role || 'QC_ANALYST',
      reasonForChange: `Recorded analytical test results for sample ${activeTest.sampleCode} (${activeTest.testSpecification?.name || 'Assay'}): ${numericResult || textResult}`,
      diffPayload: {
        details: `${user?.fullName || 'Analyst'} logged analytical result for ${activeTest.sampleCode}: ${numericResult !== '' ? numericResult + ' %' : textResult} [${statusOutcome}]`,
        sampleCode: activeTest.sampleCode,
        testName: activeTest.testSpecification?.name,
        result: numericResult || textResult,
        status: statusOutcome,
        rawDataReference,
      },
    });

    recordResultMutation.mutate({
      numericResult: numericResult !== '' ? parseFloat(numericResult) : undefined,
      textResult: textResult || undefined,
      instrumentId: selectedInstrumentId || undefined,
      rawDataReference,
      comments,
    });
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
    <div className="space-y-6">
      {/* Title & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-xs font-semibold text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-700">Analyst Execution Workstation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-teal-700" />
            <span>Analyst Execution &amp; Testing Worksheets</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registered analytical samples, live compendial calculations, raw data file linkages, and pharmacopeial limits
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/samples"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
          >
            <FlaskConical className="h-4 w-4 text-teal-600" />
            <span>Sample Registration</span>
          </Link>
          <Link
            href="/askprol"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0B1A30] text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <Beaker className="w-4 h-4 text-purple-300" />
            <span>Launch Askprol ATM-003 &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Askprol ATM-003 Highlight Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0 mt-0.5">
            <Beaker className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-slate-900 text-sm">
                Askprol Suspension 120mg/5ml Analytical Protocol (QC/CLG/ATM-003)
              </span>
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                Bulk &amp; Finished Pack
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Calculation Engine
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Official analytical testing protocol matching QC/CLG/ATM-003 Version 06. Automatically synchronized with sample registration records, HPLC chromatogram references, and release CoAs.
            </p>
          </div>
        </div>

        <Link
          href="/askprol"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0B1A30] text-white hover:bg-slate-800 transition-all shadow-xs shrink-0"
        >
          <Beaker className="w-4 h-4 text-purple-300" />
          <span>Launch Askprol Testing Worksheet &rarr;</span>
        </Link>
      </div>

      {/* Main Workstation Top Tabs: Queue vs SOP Monograph */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestingTab('QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              testingTab === 'QUEUE'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>Analyst Execution Queue ({samplesList.length} Registered Samples)</span>
          </button>

          <button
            onClick={() => setTestingTab('OFFICIAL_SOP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              testingTab === 'OFFICIAL_SOP'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span>Official SOP Monograph (QC/CLG/ATM-003 Ver: 06 - 10 Pages)</span>
          </button>
        </div>
      </div>

      {testingTab === 'OFFICIAL_SOP' ? (
        <OfficialAtm003Document />
      ) : (
        <>
          {/* Laboratory Tabs (General Lab, Penicillin Lab, Cephalosporin Lab, All Labs) */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
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

            {isSuperAdmin && (
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
                <span>All Laboratories (Facility-wide)</span>
              </button>
            )}
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

          {/* Universal Search & Quick Filters Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search A. No, Sample ID, Nomenclature, Lot..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-slate-900 bg-white placeholder:text-slate-400 font-medium"
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
                          <h4 className="text-sm font-bold text-navy-950">No Sampling Records Found</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            No analytical samples have been registered for {isAllLabs ? 'any laboratory' : activeLab.name} yet. Samples accessioned in Sample Registration will appear here automatically.
                          </p>
                          <Link href="/samples">
                            <Button size="sm" variant="primary" className="bg-navy-900 text-white text-xs font-semibold">
                              <PlusCircle className="h-3.5 w-3.5 text-teal-400 mr-1" />
                              <span>Go to Sample Registration</span>
                            </Button>
                          </Link>
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
                      const isExpanded = expandedSampleIds.has(sample.id);

                      const isAskprolItem =
                        (sample.sampleCode || '').toUpperCase().includes('ASK') ||
                        (sample.nomenclature || '').toLowerCase().includes('askprol') ||
                        (sample.materialName || '').toLowerCase().includes('askprol');

                      return (
                        <React.Fragment key={sample.id}>
                          <tr className="hover:bg-slate-50/90 transition-colors group">
                            {/* 1. A. No. */}
                            <td className="py-3 px-3.5 font-mono font-bold text-navy-950 group-hover:text-teal-700 text-xs">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandSample(sample.id)}
                                  className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Collapse test protocols' : 'Expand test protocols'}
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                                <span>{sample.accessionNo || 'A-0001'}</span>
                              </div>
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

                            {/* 11. Received By */}
                            <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[140px] truncate" title={receivedText}>
                              {receivedText}
                            </td>

                            {/* 12. Analyst Execution Actions */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isAskprolItem ? (
                                  <Link
                                    href={`/askprol?batchNumber=${batchLotText}&sampleCode=${sample.sampleCode}&stage=${sample.stageType || sample.sampleType}`}
                                    className="h-7 px-2.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                    title="Open official ATM-003 testing worksheet"
                                  >
                                    <Beaker className="h-3.5 w-3.5 text-purple-600" />
                                    <span>ATM-003 Sheet</span>
                                  </Link>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => setSelectedSampleForExecution(sample)}
                                    className="h-7 text-xs bg-navy-900 hover:bg-navy-800 text-white font-semibold inline-flex items-center gap-1"
                                  >
                                    <Play className="h-3 w-3 text-teal-400" />
                                    <span>Execute Analysis</span>
                                  </Button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => toggleExpandSample(sample.id)}
                                  className="h-7 px-2 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center gap-1 transition-colors"
                                  title="View individual tests"
                                >
                                  <span>{sampleTests.length} Tests</span>
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDABLE SUB-ROW: Analytical Test Protocols & Worksheets for this Sample */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={12} className="py-3 px-4 sm:px-8">
                                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                      <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
                                      <span>Assigned Analytical Worksheets for Sample: {sample.sampleCode}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {sampleTests.length} Protocols Configured
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                          <th className="py-2 px-3">Test Monograph</th>
                                          <th className="py-2 px-3">Compendial Limits</th>
                                          <th className="py-2 px-3">Assigned Analyst</th>
                                          <th className="py-2 px-3">Observed Result</th>
                                          <th className="py-2 px-3">Status</th>
                                          <th className="py-2 px-3">Instrument</th>
                                          <th className="py-2 px-3 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xs">
                                        {sampleTests.map((t: any) => {
                                          const spec = t.testSpecification;
                                          return (
                                            <tr key={t.id} className="hover:bg-slate-50/60">
                                              <td className="py-2.5 px-3">
                                                <div className="font-semibold text-slate-900">{spec?.name || 'Assay Protocol'}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  {spec?.testCode} &bull; {spec?.pharmacopeiaMethod}
                                                </div>
                                              </td>
                                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                                {t.minLimit !== null && t.minLimit !== undefined ? (
                                                  <span>{t.minLimit} - {t.maxLimit} {t.unit}</span>
                                                ) : (
                                                  <span className="text-slate-400 italic">Qualitative</span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3">
                                                <span className="font-medium text-slate-700">{t.assignedAnalystName || 'QC Analyst'}</span>
                                              </td>
                                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                                {t.numericResult !== null && t.numericResult !== undefined ? (
                                                  <span>{t.numericResult} {t.unit}</span>
                                                ) : t.textResult ? (
                                                  <span>{t.textResult}</span>
                                                ) : (
                                                  <span className="text-slate-400 font-normal italic">Not entered</span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-3">
                                                <StatusBadge status={t.resultStatus || t.status || 'PENDING'} />
                                              </td>
                                              <td className="py-2.5 px-3 text-[11px] text-slate-600 font-mono">
                                                {t.instrument?.equipmentCode || t.instrumentId || 'HPLC-01'}
                                              </td>
                                              <td className="py-2.5 px-3 text-right">
                                                <Button
                                                  size="sm"
                                                  variant="primary"
                                                  onClick={() => openRecordModal(t)}
                                                  className="h-6 px-2.5 text-[11px]"
                                                >
                                                  {t.numericResult !== null || t.textResult ? 'Edit Result' : 'Input Result'}
                                                </Button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
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
        </>
      )}

      {/* SAMPLE ANALYSIS EXECUTION MODAL */}
      {selectedSampleForExecution && (
        <Modal
          isOpen={!!selectedSampleForExecution}
          onClose={() => setSelectedSampleForExecution(null)}
          title={`Analyst Execution: ${selectedSampleForExecution.sampleCode}`}
          subtitle={`Accession No: ${selectedSampleForExecution.accessionNo} • ${selectedSampleForExecution.nomenclature || selectedSampleForExecution.materialName}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Sample Information Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sample ID</span>
                <span className="font-mono font-bold text-teal-800">{selectedSampleForExecution.sampleCode}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Stage / Type</span>
                <span className="font-semibold text-slate-800">{selectedSampleForExecution.stageType || selectedSampleForExecution.sampleType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Batch / Lot</span>
                <span className="font-mono font-semibold text-slate-800">{selectedSampleForExecution.lotNumber || selectedSampleForExecution.batch?.batchNumber || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sample Quantity</span>
                <span className="font-mono text-slate-800">{selectedSampleForExecution.sampleQty} {selectedSampleForExecution.unit}</span>
              </div>
            </div>

            {/* If Askprol, provide direct launch banner */}
            {((selectedSampleForExecution.sampleCode || '').toUpperCase().includes('ASK') ||
              (selectedSampleForExecution.nomenclature || '').toLowerCase().includes('askprol')) && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-purple-900 block">Dedicated Monograph QC/CLG/ATM-003</span>
                  <span className="text-purple-700">Launch 3-module analytical calculation sheet with real-time HPLC assay calculation.</span>
                </div>
                <Link
                  href={`/askprol?batchNumber=${selectedSampleForExecution.lotNumber}&sampleCode=${selectedSampleForExecution.sampleCode}&stage=${selectedSampleForExecution.stageType || selectedSampleForExecution.sampleType}`}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0B1A30] text-white hover:bg-slate-800 shrink-0"
                >
                  Launch Worksheet &rarr;
                </Link>
              </div>
            )}

            {/* Test Protocols List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Analytical Test Protocols:</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {getTestsForSample(selectedSampleForExecution).map((t: any) => (
                  <div key={t.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{t.testSpecification?.name || 'Assay Protocol'}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Limits: {t.minLimit !== null ? `${t.minLimit} - ${t.maxLimit} ${t.unit}` : 'Qualitative'} &bull; Method: {t.testSpecification?.pharmacopeiaMethod || 'USP/BP'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.numericResult !== null || t.textResult ? (
                        <div className="text-right mr-2">
                          <span className="font-mono font-bold text-xs text-slate-900">{t.numericResult !== null ? `${t.numericResult} ${t.unit}` : t.textResult}</span>
                          <div><StatusBadge status={t.resultStatus || 'PASSED'} /></div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic mr-2">Pending</span>
                      )}

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openRecordModal(t)}
                        className="h-7 text-xs"
                      >
                        {t.numericResult !== null || t.textResult ? 'Edit Result' : 'Input Result'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setSelectedSampleForExecution(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* RECORD TEST RESULT MODAL WITH REAL-TIME EVALUATION */}
      {activeTest && (
        <Modal
          isOpen={!!activeTest}
          onClose={() => setActiveTest(null)}
          title={`Analytical Result Input: ${activeTest.testSpecification?.name || 'Test Worksheet'}`}
          subtitle={`Sample: ${activeTest.sampleCode} • ${activeTest.materialName}`}
          maxWidth="xl"
        >
          <form onSubmit={handleSubmitResult} className="space-y-4">
            {/* Compendial Specification Reference Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Pharmacopeial Specification:</span>
                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {activeTest.testSpecification?.pharmacopeiaMethod || 'USP 44 / BP 2024'}
                </span>
              </div>
              <div className="flex items-baseline gap-4 mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Min Limit</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeTest.minLimit ?? 'N/A'} {activeTest.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Target</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeTest.targetValue ?? 'N/A'} {activeTest.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Max Limit</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {activeTest.maxLimit ?? 'N/A'} {activeTest.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Product Description PDF Document Link */}
            {(() => {
              const activeDoc = getProductDocForTest(activeTest);
              if (!activeDoc) return null;
              return (
                <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-lg bg-rose-100 text-rose-800 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-950 text-xs truncate max-w-[240px]" title={activeDoc.fileName}>
                          {activeDoc.fileName}
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded shrink-0">
                          v{activeDoc.version}.0 (PDF)
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Official product description PDF document uploaded by {activeDoc.uploadedByName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={productService.getDocumentViewUrl(activeDoc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-2xs shrink-0"
                      title="Open and read PDF document directly in browser"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* Qualitative vs Quantitative Input */}
            {(activeTest.unit === 'Qualitative' || activeTest.unit === 'Text' || (activeTest.minLimit === null && activeTest.maxLimit === null)) ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Qualitative Observed Result / Physical Appearance *
                </label>
                <input
                  type="text"
                  value={textResult}
                  onChange={(e) => setTextResult(e.target.value)}
                  placeholder="e.g. Complies / Clear yellowish liquid free from particulate matter"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantitative Numeric Result ({activeTest.unit || 'units'}) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={numericResult}
                  onChange={(e) => setNumericResult(e.target.value)}
                  placeholder="Enter observed numerical assay value..."
                  className="w-full text-sm font-mono px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  required
                />
              </div>
            )}

            {/* LIVE DYNAMIC EVALUATION BANNER */}
            {evaluatedStatus === 'WITHIN_SPEC' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium animate-in fade-in duration-150">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">WITHIN SPECIFICATION (PASS)</p>
                  <p className="text-[11px] text-emerald-700">
                    Result {numericResult} {activeTest.unit} satisfies compendial limits ({activeTest.minLimit} - {activeTest.maxLimit}).
                  </p>
                </div>
              </div>
            )}

            {evaluatedStatus === 'OUT_OF_SPEC' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-150">
                <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-700">OUT OF SPECIFICATION (OOS DETECTED)</p>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    Result <strong>{numericResult} {activeTest.unit}</strong> falls outside acceptable limits (
                    {activeTest.minLimit} - {activeTest.maxLimit}).
                  </p>
                </div>
              </div>
            )}

            {/* Instrument Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Analytical Instrument Used *
              </label>
              <select
                value={selectedInstrumentId}
                onChange={(e) => setSelectedInstrumentId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white font-medium"
              >
                <option value="">Select calibrated lab instrument...</option>
                {instruments?.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.equipmentCode} — {inst.name} ({inst.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Raw Data Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raw Data File / Chromatogram Sequence Ref *
              </label>
              <input
                type="text"
                value={rawDataReference}
                onChange={(e) => setRawDataReference(e.target.value)}
                placeholder="e.g. Agilent OpenLab Sequence #2026-SEQ-044; Vial 12"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                required
              />
            </div>

            {/* Qualitative Notes / Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Analyst Notes / System Suitability Verification
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="System suitability passed (RSD < 1.0%, theoretical plates > 2000)..."
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTest(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={evaluatedStatus === 'OUT_OF_SPEC' ? 'danger' : 'primary'}
                isLoading={recordResultMutation.isPending}
              >
                <span>Save Result &amp; Sign Electronically</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
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
