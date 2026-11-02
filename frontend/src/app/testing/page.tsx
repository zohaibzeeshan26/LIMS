'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/date';
import { STATIC_ANALYSTS, isAssignedToUser, useAllAnalysts } from '@/lib/analysts';
import { auditService } from '@/services/audit.service';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
  Gauge,
  UserCheck,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Beaker,
  Play,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { OfficialAtm003Document } from '@/components/askprol/OfficialAtm003Document';

export default function TestingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { analysts: allAnalystsList } = useAllAnalysts();

  const isSuperAdmin = user?.role === 'ADMIN' || (user?.role as string) === 'SUPER_ADMIN';
  const isManager = isSuperAdmin || user?.role === 'MANAGER' || user?.role === 'DEPUTY_MANAGER' || user?.role === 'SHIFT_INCHARGE';
  const isAnalyst = !isManager;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedAnalystFilter, setSelectedAnalystFilter] = useState<string>('ALL');
  const [testingTab, setTestingTab] = useState<'QUEUE' | 'OFFICIAL_SOP'>('QUEUE');

  // Stored tasks synchronization from localStorage (assigned from /tasks)
  const [storedTasks, setStoredTasks] = useState<any[]>([]);

  React.useEffect(() => {
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

  // Selected test for recording results
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [numericResult, setNumericResult] = useState<string>('');
  const [textResult, setTextResult] = useState<string>('');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('');
  const [rawDataReference, setRawDataReference] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  // Load all samples with tests
  const { data: samplesResponse, isLoading } = useQuery({
    queryKey: ['samples-for-testing'],
    queryFn: () => api.get<any>('/samples?limit=100'),
  });

  // Extract array safely whether backend returns direct array or paginated object
  const samplesList: any[] = React.useMemo(() => {
    if (!samplesResponse) return [];
    if (Array.isArray(samplesResponse)) return samplesResponse;
    if (Array.isArray(samplesResponse.data)) return samplesResponse.data;
    return [];
  }, [samplesResponse]);

  // Load available instruments
  const { data: instrumentsResponse } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => api.get<any>('/instruments'),
  });

  const instruments: any[] = React.useMemo(() => {
    if (!instrumentsResponse) return [];
    if (Array.isArray(instrumentsResponse)) return instrumentsResponse;
    if (Array.isArray((instrumentsResponse as any).data)) return (instrumentsResponse as any).data;
    return [];
  }, [instrumentsResponse]);

  // Flatten sample tests and merge stored tasks for analytical worksheet table
  const allTests = React.useMemo(() => {
    // 1. Database tests from sample records
    const dbTests = samplesList.flatMap((s) => {
      const sCode = (s.sampleCode || s.sampleId || s.accessionNo || s.id || '').toUpperCase();
      const matchingTask = storedTasks.find((t) => {
        const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
        return tCode === sCode;
      });

      return (s.tests || []).map((t: any) => ({
        ...t,
        sampleCode: s.sampleCode || s.sampleId,
        materialName: s.materialName || s.nomenclature,
        samplePriority: s.priority,
        batchNumber: s.batch?.batchNumber || s.lotNumber || s.batchLotNumber,
        assignedToId: s.assignedToId || t.analystId || matchingTask?.assignedAnalystId,
        assignedTo: s.assignedTo,
        assignedAnalystId: matchingTask?.assignedAnalystId || t.analyst?.employeeId || t.analyst?.id || s.assignedTo?.employeeId || s.assignedToId,
        assignedAnalystName: matchingTask?.assignedAnalystName || t.analyst?.fullName || s.assignedTo?.fullName,
        assignedAnalystUsername: matchingTask?.assignedAnalystUsername || t.analyst?.username || s.assignedTo?.username,
      }));
    });

    // 2. Worksheets created from assigned tasks
    const taskWorksheets = storedTasks.map((t: any) => {
      const foundAnalyst = allAnalystsList.find((a) => a.id === t.assignedAnalystId || a.name === t.assignedAnalystName) || STATIC_ANALYSTS.find((a) => a.id === t.assignedAnalystId || a.name === t.assignedAnalystName);

      return {
        id: t.id,
        isTaskItem: true,
        taskCode: t.taskCode,
        sampleCode: t.sampleId,
        materialName: t.sampleName,
        samplePriority: t.priority || 'ROUTINE',
        batchNumber: t.lotNumber || '—',
        laboratory: t.laboratory,
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
        assignedAnalystUsername: t.assignedAnalystUsername || foundAnalyst?.username,
      };
    });

    const existingSampleTestKeys = new Set(dbTests.map((x) => `${x.sampleCode}-${x.testSpecification?.name}`.toUpperCase()));
    const uniqueTaskWorksheets = taskWorksheets.filter((tw: any) => !existingSampleTestKeys.has(`${tw.sampleCode}-${tw.testSpecification?.name}`.toUpperCase()));

    return [...dbTests, ...uniqueTaskWorksheets];
  }, [samplesList, storedTasks]);

  // Filtered tests with strict role isolation for Analysts
  const filteredTests = React.useMemo(() => {
    return allTests.filter((t) => {
      // 1. Role-Based Workload Isolation:
      // If logged in as Analyst: Show ONLY tests assigned to this specific analyst (while keeping Askprol protocol tests accessible)
      if (isAnalyst && user) {
        const userEmpId = (user.employeeId || '').toUpperCase();
        const userUsername = (user.username || '').toLowerCase();
        const userFullName = (user.fullName || '').toLowerCase();

        const isAskprolItem =
          (t.sampleCode || '').toUpperCase().includes('ASK') ||
          (t.materialName || '').toLowerCase().includes('askprol') ||
          (t.testSpecification?.testCode || '').toUpperCase().includes('SPEC-ASK');

        const matchesAnalyst =
          isAskprolItem ||
          isAssignedToUser(t, user) ||
          (t.assignedAnalystId && userEmpId && t.assignedAnalystId.toUpperCase() === userEmpId) ||
          (t.assignedAnalystUsername && userUsername && t.assignedAnalystUsername.toLowerCase() === userUsername) ||
          (t.assignedAnalystName && userFullName && (t.assignedAnalystName.toLowerCase().includes(userFullName) || userFullName.includes(t.assignedAnalystName.toLowerCase())));

        if (!matchesAnalyst) return false;
      } else if (selectedAnalystFilter !== 'ALL') {
        const isAskprolItem =
          (t.sampleCode || '').toUpperCase().includes('ASK') ||
          (t.materialName || '').toLowerCase().includes('askprol') ||
          (t.testSpecification?.testCode || '').toUpperCase().includes('SPEC-ASK');

        const found = allAnalystsList.find((a) => a.id === selectedAnalystFilter) || STATIC_ANALYSTS.find((a) => a.id === selectedAnalystFilter);
        const matchId = t.assignedAnalystId === selectedAnalystFilter;
        const matchUsername = found && t.assignedAnalystUsername?.toLowerCase() === found.username.toLowerCase();
        const matchName = found && t.assignedAnalystName?.toLowerCase().includes(found.name.toLowerCase());
        if (!isAskprolItem && !matchId && !matchUsername && !matchName) return false;
      }

      if (statusFilter && t.status !== statusFilter) return false;
      if (categoryFilter && t.testSpecification?.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCode = t.sampleCode?.toLowerCase().includes(term);
        const matchName = t.materialName?.toLowerCase().includes(term);
        const matchTest = t.testSpecification?.name?.toLowerCase().includes(term);
        const matchAnalyst = t.assignedAnalystName?.toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchTest && !matchAnalyst) return false;
      }
      return true;
    });
  }, [allTests, isAnalyst, user, selectedAnalystFilter, statusFilter, categoryFilter, searchTerm]);

  // Mutation to record result
  const recordResultMutation = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/tests/${activeTest.id}/record-result`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setActiveTest(null);
      setNumericResult('');
      setTextResult('');
      setRawDataReference('');
      setComments('');
    },
  });

  // Mutation to verify test
  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tests/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples-for-testing'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
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

  // Instant Real-Time Specification Calculation
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

  // Start analysis transition for an assigned test
  const handleStartAnalysis = (test: any) => {
    if (test.isTaskItem) {
      const updated = storedTasks.map((t) => {
        if (t.id === test.id || t.taskCode === test.taskCode) {
          return { ...t, status: 'IN_PROGRESS' };
        }
        return t;
      });
      setStoredTasks(updated);
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      // 21 CFR Part 11 Audit Trail for Analysis Initiation
      auditService.logActivity({
        action: 'TASK_STATUS_UPDATED',
        entityName: 'TestWorksheet',
        entityId: test.id || test.taskCode || test.sampleCode,
        performedByName: user?.fullName || 'Analyst',
        role: user?.role || 'QC_ANALYST',
        reasonForChange: `Analyst initiated analytical testing on sample ${test.sampleCode} (${test.materialName || 'QC Material'})`,
        diffPayload: {
          details: `${user?.fullName || 'Analyst'} initiated testing for sample ${test.sampleCode} — Protocol: ${test.testSpecification?.name || test.taskCode}`,
          sampleCode: test.sampleCode,
          taskCode: test.taskCode,
          status: 'IN_PROGRESS',
        },
      });
    } else {
      openRecordModal(test);
    }
  };

  const handleSubmitResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest) return;

    const num = numericResult !== '' ? parseFloat(numericResult) : null;
    const isPass = evaluatedStatus === 'WITHIN_SPEC';
    const statusOutcome = isPass ? 'PASSED' : evaluatedStatus === 'OUT_OF_SPEC' ? 'OUT_OF_SPEC' : 'RECORDED';

    if (activeTest.isTaskItem) {
      const status = 'COMPLETED';
      const resultStatus = isPass ? 'PASSED' : 'FAILED';

      const updated = storedTasks.map((t) => {
        if (t.id === activeTest.id || t.taskCode === activeTest.taskCode) {
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
      setStoredTasks(updated);
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      // 21 CFR Part 11 Audit Trail for Test Result Recording
      auditService.logActivity({
        action: 'TEST_RESULT_RECORDED',
        entityName: 'TestWorksheet',
        entityId: activeTest.id || activeTest.taskCode || activeTest.sampleCode,
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

    // 21 CFR Part 11 Audit Trail for Database Test
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

  return (
    <div className="space-y-6">
      {/* Title & Navigation */}
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
            <span className="text-xs font-bold text-slate-700">Analytical Workstation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-teal-700" />
            <span>Analytical Testing &amp; Worksheets</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compendial worksheet calculations, chromatogram raw data references, and automated limit evaluations
          </p>
        </div>
      </div>

      {/* Role-Specific Workstation Notice Banner */}
      {isAnalyst ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md border border-blue-700/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 shadow-xs shrink-0 mt-0.5">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-white text-sm">
                  Analyst Testing Workstation &bull; {user?.fullName || 'Quality Analyst'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-white/10 text-blue-200 px-2 py-0.5 rounded border border-white/20">
                  @{user?.username || 'analyst'}
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                  Workload Isolated ({filteredTests.length} Tests)
                </span>
              </div>
              <p className="text-xs text-blue-200/90 leading-relaxed max-w-3xl">
                Showing strictly tests and analytical worksheets assigned to your bench. Select an instrument, enter observed assay results, and attach raw data sequence references to update status.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-teal-800 shadow-xs shrink-0 mt-0.5">
            <ShieldCheck className="h-4 w-4 text-teal-700" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-navy-950">Super Admin Analytical Inspection Portal</span>
              <span className="text-[10px] font-bold text-navy-700 bg-white px-2 py-0.5 rounded border border-slate-200/80 uppercase">
                Full Oversight
              </span>
            </div>
            Master governance across General, Cephalosporin and Penicillin analytical benches. Inspect results, review OOS flags, and verify compendial worksheets across all 10 analyst accounts.
          </div>
        </div>
      )}

      {/* Askprol Suspension QC/CLG/ATM-003 Testing Launcher Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0 mt-0.5">
            <FileSpreadsheet className="h-6 w-6" />
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
                Workbook Synced
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Official analytical testing protocol matching QC/CLG/ATM-003 Version 06. Enter observed lab weights, HPLC peak areas, deliverable volumes, and AV values with automated release CoA generation.
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

      {/* Workstation Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestingTab('QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              testingTab === 'QUEUE'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>Analytical Testing Queue ({filteredTests.length} Tests)</span>
          </button>

          <button
            onClick={() => setTestingTab('OFFICIAL_SOP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              testingTab === 'OFFICIAL_SOP'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span>Official SOP Monograph (QC/CLG/ATM-003 Ver: 06 - 10 Pages)</span>
          </button>
        </div>

        <Link
          href="/askprol"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs"
        >
          <Beaker className="w-4 h-4 text-purple-600" />
          <span>Launch Askprol QC &amp; CoA Engine &rarr;</span>
        </Link>
      </div>

      {testingTab === 'OFFICIAL_SOP' ? (
        <OfficialAtm003Document />
      ) : (
        <>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search test, sample, analyst..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Test Statuses</option>
              <option value="PENDING">Pending Analysis</option>
              <option value="IN_ANALYSIS">In Analysis / Testing</option>
              <option value="COMPLETED">Completed (Awaiting QA)</option>
              <option value="VERIFIED">Verified &amp; Signed Off</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium text-slate-700"
            >
              <option value="">All Test Categories</option>
              <option value="CHROMATOGRAPHY">Chromatography (HPLC / GC)</option>
              <option value="PHYSICAL">Physical (Dissolution / LOD)</option>
              <option value="CHEMICAL">Chemical (pH / Titration)</option>
              <option value="MICROBIOLOGICAL">Microbiological &amp; Endotoxin</option>
              <option value="STABILITY">Stability Protocol</option>
            </select>
          </div>

          {/* Analyst Filter Dropdown for Super Admin / Managers */}
          {!isAnalyst ? (
            <div>
              <select
                value={selectedAnalystFilter}
                onChange={(e) => setSelectedAnalystFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Analysts (All Worksheets)</option>
                {allAnalystsList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.username ? `@${a.username}` : a.id}) — {a.department}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
              <span className="truncate">Analyst Bench: @{user?.username}</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytical Worksheets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Test Monograph &amp; Category</th>
                <th className="py-3.5 px-4">Sample &amp; Lot Link</th>
                <th className="py-3.5 px-4">Compendial Limits</th>
                <th className="py-3.5 px-4">Assigned Analyst</th>
                <th className="py-3.5 px-4">Observed Result</th>
                <th className="py-3.5 px-4">Status &amp; Result</th>
                <th className="py-3.5 px-4">Instrument</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading worksheets...
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Beaker className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                      <p className="font-semibold text-slate-700 text-sm">
                        {isAnalyst
                          ? 'No Tests Currently Assigned To Your Bench'
                          : 'No Tests Matching Current Filters'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {isAnalyst
                          ? `You are logged in as @${user?.username}. Tests assigned to you by your Manager will appear here.`
                          : 'Try clearing the search or analyst filter to inspect other analytical worksheets.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTests.map((test) => {
                  const spec = test.testSpecification;
                  const isVerified = test.status === 'VERIFIED';
                  const isCompleted = test.status === 'COMPLETED';
                  const isPending = test.status === 'PENDING';

                  return (
                    <tr key={test.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{spec?.name || 'Analytical Monograph'}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {spec?.testCode} &bull; {spec?.pharmacopeiaMethod} &bull; {spec?.category}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-mono font-bold text-slate-800">{test.sampleCode}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {test.materialName}
                        </div>
                        {test.batchNumber && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            Lot: {test.batchNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {test.minLimit !== null ? (
                          <div className="text-slate-800 font-medium">
                            {test.minLimit} - {test.maxLimit} {test.unit}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic">Qualitative</div>
                        )}
                        {test.targetValue !== null && (
                          <div className="text-[10px] text-slate-400">Target: {test.targetValue} {test.unit}</div>
                        )}
                      </td>

                      {/* Assigned Analyst Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {test.assignedAnalystName ? (
                          <div>
                            <span className="font-semibold text-slate-800 text-xs block">
                              {test.assignedAnalystName}
                            </span>
                            {test.assignedAnalystUsername && (
                              <span className="text-[10px] text-blue-600 font-mono">
                                @{test.assignedAnalystUsername}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {test.numericResult !== null && test.numericResult !== undefined ? (
                          <div className="font-mono text-sm font-bold text-slate-900">
                            {test.numericResult} {test.unit}
                          </div>
                        ) : test.textResult ? (
                          <div className="text-xs text-slate-700">{test.textResult}</div>
                        ) : (
                          <span className="text-slate-400 italic">Not entered</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <StatusBadge status={test.resultStatus} />
                          <div>
                            <StatusBadge status={test.status} />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {test.instrument ? (
                          <div className="text-xs font-medium text-slate-700">
                            <span className="font-mono">{test.instrument.equipmentCode}</span>
                            <div className="text-[10px] text-slate-400">{test.instrument.name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartAnalysis(test)}
                              className="h-7 text-xs text-blue-700 hover:bg-blue-50 border-blue-200"
                              title="Start analysis on this sample"
                            >
                              <Play className="h-3 w-3" />
                              <span>Start</span>
                            </Button>
                          )}

                          {/* Direct ATM-003 Sheet link for Askprol tests */}
                          {(test.sampleCode?.includes('ASK') || test.materialName?.includes('Askprol') || test.testSpecification?.testCode?.includes('SPEC-ASK')) && (
                            <Link
                              href="/askprol"
                              className="h-7 px-2 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1 transition-colors"
                              title="Open dedicated ATM-003 3-module calculation worksheet"
                            >
                              <FileSpreadsheet className="h-3 w-3 text-purple-600" />
                              <span>ATM-003 Sheet</span>
                            </Link>
                          )}

                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => openRecordModal(test)}
                            className="h-7 text-xs"
                          >
                            {test.status === 'COMPLETED' || test.status === 'VERIFIED'
                              ? 'Edit Result'
                              : 'Input Result'}
                          </Button>

                          {isCompleted && !isVerified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyMutation.mutate(test.id)}
                              className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Verify</span>
                            </Button>
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
      </div>
      </>
      )}

      {/* Record Test Result Modal with Live Auto-Evaluation */}
      {activeTest && (
        <Modal
          isOpen={!!activeTest}
          onClose={() => setActiveTest(null)}
          title={`Analytical Result Input: ${activeTest.testSpecification.name}`}
          subtitle={`Sample: ${activeTest.sampleCode} • ${activeTest.materialName}`}
          maxWidth="xl"
        >
          <form onSubmit={handleSubmitResult} className="space-y-4">
            {/* Compendial Specification Reference Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Pharmacopeial Specification:</span>
                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {activeTest.testSpecification.pharmacopeiaMethod}
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

            {/* If Askprol ATM-003 test, show SOP reference banner */}
            {(activeTest.sampleCode?.includes('ASK') || activeTest.materialName?.includes('Askprol') || activeTest.testSpecification?.testCode?.includes('SPEC-ASK')) && (
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-purple-900 block">Citi Pharma Ltd &bull; QC/CLG/ATM-003 (Version: 06)</span>
                  <span className="text-[11px] text-purple-700">Analytical Protocol: {activeTest.testSpecification.name} &bull; Method: {activeTest.testSpecification.pharmacopeiaMethod}</span>
                </div>
                <Link
                  href="/askprol"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0B1A30] hover:bg-slate-800 text-white shadow-2xs shrink-0"
                >
                  <Beaker className="w-3.5 h-3.5 text-purple-300" />
                  <span>Open Full Calculation Worksheet &rarr;</span>
                </Link>
              </div>
            )}

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
                  placeholder="e.g. Complies / A reddish color suspension with solid particles uniformly dispersed"
                  className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
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
                  className="w-full text-sm font-mono px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
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
                    {activeTest.minLimit} - {activeTest.maxLimit}). Submitting will automatically trigger an Out-of-Specification incident report and Phase 1 lab investigation!
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
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium"
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
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none font-mono"
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
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
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
                <span>Save Result & Sign Electronically</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
