'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useAllAnalysts } from '@/lib/analysts';
import {
  UserCheck,
  Layers,
  Clock,
  CheckCircle2,
  AlertOctagon,
  FileCheck2,
  Play,
  ExternalLink,
  Search,
  Filter,
  Users,
  Activity,
  AlertTriangle,
  FlaskConical,
  Building2,
  Check,
  X,
  Award,
  Eye,
  Microscope,
  Send,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { getUserLabAccess, Sample, Role } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';
import { auditService } from '@/services/audit.service';

export function ManagerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { analysts: allAnalysts } = useAllAnalysts();

  // Active Tab
  const [managerTab, setManagerTab] = useState<'unassigned' | 'in_progress' | 'results_review' | 'all'>('unassigned');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabFilter, setSelectedLabFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Direct Assign Modal
  const [assigningSample, setAssigningSample] = useState<Sample | null>(null);
  const [assignAnalystId, setAssignAnalystId] = useState<string>('');
  const [assignProtocol, setAssignProtocol] = useState<string>('Full Compendial Testing (Assay, Dissolution, Related Substances)');
  const [assignPriority, setAssignPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [assignShift, setAssignShift] = useState<string>('Morning (Shift A)');
  const [assignInstructions, setAssignInstructions] = useState<string>('Conduct testing per approved STP monograph in duplicate.');

  // Results Review Modal
  const [reviewingSample, setReviewingSample] = useState<Sample | null>(null);

  // Success/Error toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Authorized Laboratory Access
  const authorizedLab = getUserLabAccess(user); // 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' | 'ALL'

  // 2. Fetch Samples
  const {
    data: samplesData,
    refetch: refetchSamples,
    isLoading: isSamplesLoading,
  } = useQuery({
    queryKey: ['manager-dashboard-samples'],
    queryFn: () => samplingService.getAll({ limit: 120, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  const allSamples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Enforce Laboratory Authorization Boundary
  const labFilteredSamples = useMemo(() => {
    return allSamples.filter((s: any) => {
      const sampleLab = (s.laboratoryType || s.laboratory?.code || s.laboratory || '').toUpperCase();

      // If manager is restricted to a specific lab, only show that lab's samples
      if (authorizedLab === 'GENERAL') {
        return sampleLab === 'GENERAL' || sampleLab === 'GL' || sampleLab === '';
      }
      if (authorizedLab === 'PENICILLIN') {
        return sampleLab.includes('PEN');
      }
      if (authorizedLab === 'CEPHALOSPORIN') {
        return sampleLab.includes('CEPH') || sampleLab === 'SAF' || sampleLab === 'SEF';
      }

      // If authorized for ALL, check user selected filter tab
      if (selectedLabFilter === 'GENERAL') {
        return sampleLab === 'GENERAL' || sampleLab === 'GL' || sampleLab === '';
      }
      if (selectedLabFilter === 'PENICILLIN') {
        return sampleLab.includes('PEN');
      }
      if (selectedLabFilter === 'CEPHALOSPORIN') {
        return sampleLab.includes('CEPH') || sampleLab === 'SAF' || sampleLab === 'SEF';
      }

      return true;
    });
  }, [allSamples, authorizedLab, selectedLabFilter]);

  // Load localStorage tasks to cross-reference
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

  // Filter Qualified Analysts for this manager's lab
  const qualifiedAnalysts = useMemo(() => {
    return allAnalysts.filter((a) => {
      if (authorizedLab === 'GENERAL') return a.lab === 'GENERAL' || a.lab === 'ALL';
      if (authorizedLab === 'PENICILLIN') return a.lab === 'PENICILLIN' || a.lab === 'ALL';
      if (authorizedLab === 'CEPHALOSPORIN') return a.lab === 'CEPHALOSPORIN' || a.lab === 'ALL';
      return true;
    });
  }, [allAnalysts, authorizedLab]);

  // Categorize Samples
  // A. Registered Samples awaiting Assignment
  const unassignedSamples = useMemo(() => {
    return labFilteredSamples.filter((s: any) => {
      const hasDbAssign = !!s.assignedToId || !!s.assignedTo?.fullName;
      const hasTaskAssign = storedTasks.some((t: any) => {
        const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
        const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
        return tCode === sCode && t.assignedAnalystName;
      });
      return !hasDbAssign && !hasTaskAssign && s.status !== 'APPROVED' && s.status !== 'ARCHIVED';
    });
  }, [labFilteredSamples, storedTasks]);

  // B. In-Progress Assigned Testing
  const inProgressSamples = useMemo(() => {
    return labFilteredSamples.filter((s: any) => {
      const hasDbAssign = !!s.assignedToId || !!s.assignedTo?.fullName;
      const hasTaskAssign = storedTasks.some((t: any) => {
        const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
        const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
        return tCode === sCode && t.assignedAnalystName;
      });
      return (hasDbAssign || hasTaskAssign) && s.status !== 'APPROVED' && s.status !== 'REVIEW_PENDING';
    });
  }, [labFilteredSamples, storedTasks]);

  // C. Results Review Queue (Awaiting Manager Sign-Off)
  const resultsReviewSamples = useMemo(() => {
    return labFilteredSamples.filter((s: any) => s.status === 'REVIEW_PENDING');
  }, [labFilteredSamples]);

  // Handle Direct Assignment
  const handlePerformAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSample) return;

    const chosenAnalyst = qualifiedAnalysts.find((a) => a.id === assignAnalystId) || qualifiedAnalysts[0];
    if (!chosenAnalyst) {
      showToast('error', 'Please select a qualified analyst');
      return;
    }

    try {
      // 1. Update Sample in Backend
      await samplingService.update(assigningSample.id, {
        assignedToId: chosenAnalyst.id,
        status: 'ASSIGNED_FOR_TESTING' as any,
      });

      // 2. Add to localStorage task board
      const generatedCode = `TSK-2026-${String(Date.now()).slice(-4)}`;
      const newTask = {
        id: `tsk-${Date.now()}`,
        taskCode: generatedCode,
        sampleId: assigningSample.sampleCode || assigningSample.id,
        sampleName: assigningSample.nomenclature || (assigningSample as any).materialName || 'QC Specimen',
        laboratory: assigningSample.laboratoryType || 'GENERAL',
        section: (assigningSample as any).section || 'formulation',
        assignedAnalystName: chosenAnalyst.name,
        assignedAnalystId: chosenAnalyst.id,
        testProtocol: assignProtocol,
        priority: assignPriority,
        shift: assignShift,
        dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
        assignedDate: new Date().toISOString().split('T')[0],
        status: 'ASSIGNED',
        instructions: assignInstructions,
        accessionNo: assigningSample.accessionNo,
        batchNo: (assigningSample as any).batchNo,
      };

      const updatedTasks = [newTask, ...storedTasks.filter((t) => t.sampleId !== assigningSample.sampleCode)];
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updatedTasks));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      // 3. Log Audit Trail
      auditService.logActivity({
        action: 'SAMPLE_ASSIGNED',
        entityName: 'Sample',
        entityId: assigningSample.sampleCode,
        performedByName: user?.fullName || 'QC Manager',
        role: user?.role || 'MANAGER',
        reasonForChange: `Assigned sample ${assigningSample.sampleCode} to Testing Analyst ${chosenAnalyst.name}`,
        diffPayload: {
          sampleCode: assigningSample.sampleCode,
          analyst: chosenAnalyst.name,
          protocol: assignProtocol,
          priority: assignPriority,
        },
      });

      setAssigningSample(null);
      refetchSamples();
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['analyst-workstation-samples'] });
      showToast('success', `Sample ${assigningSample.sampleCode} successfully assigned to ${chosenAnalyst.name}.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to assign sample');
    }
  };

  // Handle Approve Test Results
  const handleApproveResults = async (targetSample: Sample) => {
    if (!window.confirm(`Approve analytical test results and sign-off on ${targetSample.sampleCode}?`)) return;

    try {
      await samplingService.update(targetSample.id, {
        status: 'APPROVED' as any,
      });

      // Update tasks in localStorage
      const updatedTasks = storedTasks.map((t) => {
        if (t.sampleId === targetSample.sampleCode || t.accessionNo === targetSample.accessionNo) {
          return { ...t, status: 'COMPLETED' };
        }
        return t;
      });
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updatedTasks));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      // Log Audit Trail
      auditService.logActivity({
        action: 'RESULTS_APPROVED',
        entityName: 'Sample',
        entityId: targetSample.sampleCode,
        performedByName: user?.fullName || 'QC Manager',
        role: user?.role || 'MANAGER',
        reasonForChange: `Approved test results for ${targetSample.sampleCode} (${targetSample.nomenclature})`,
        diffPayload: {
          sampleCode: targetSample.sampleCode,
          status: 'APPROVED',
          approvedBy: user?.fullName,
        },
      });

      setReviewingSample(null);
      refetchSamples();
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      showToast('success', `Test results for ${targetSample.sampleCode} approved. Released for CoA generation.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve results');
    }
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
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold px-2">
            &times;
          </button>
        </div>
      )}

      {/* 1. Manager Chief Supervisory Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-navy-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-800/40">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>QC Manager Work Allocation &amp; Results Review Hub</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-indigo-200 border border-white/20">
                @{user?.username || 'qc.manager'} &bull; {user?.employeeId || 'MGR-001'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                Authorized Lab: {authorizedLab === 'ALL' ? 'Multi-Lab Authority' : `${authorizedLab} Suite`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Analytical Work Allocation &amp; Results Verification
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-3xl leading-relaxed">
              Review samples accessioned by Registration Analysts, assign test protocols to qualified testers,
              monitor live analytical worksheets, and perform managerial result sign-off.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => refetchSamples()}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh Live Samples"
            >
              <RotateCcw className="w-4 h-4 text-indigo-300" />
            </button>
            <Link
              href="/tasks"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Assignment Board</span>
            </Link>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setManagerTab('unassigned')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              managerTab === 'unassigned'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>1. Intake Queue to Assign ({unassignedSamples.length})</span>
          </button>

          <button
            onClick={() => setManagerTab('in_progress')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              managerTab === 'in_progress'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Microscope className="w-4 h-4 text-blue-600" />
            <span>2. In-Testing Progress ({inProgressSamples.length})</span>
          </button>

          <button
            onClick={() => setManagerTab('results_review')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              managerTab === 'results_review'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Award className="w-4 h-4 text-purple-600" />
            <span>3. Results Review &amp; Approval ({resultsReviewSamples.length})</span>
          </button>

          <button
            onClick={() => setManagerTab('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              managerTab === 'all'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>4. All Lab Samples ({labFilteredSamples.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Tester Assignment</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">{unassignedSamples.length}</div>
          <p className="text-[11px] text-slate-400">Fresh registrations from Intake</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Testing In-Progress</span>
            <Microscope className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700">{inProgressSamples.length}</div>
          <p className="text-[11px] text-slate-400">Executing on analyst benches</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Results Awaiting Sign-off</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700">{resultsReviewSamples.length}</div>
          <p className="text-[11px] text-slate-400">Submissions ready for Manager review</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Qualified Testers</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{qualifiedAnalysts.length}</div>
          <p className="text-[11px] text-slate-400">Available staff in authorized suite</p>
        </div>
      </div>

      {/* 3. Main Operational Content */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {managerTab === 'unassigned' && <UserCheck className="w-5 h-5 text-indigo-600" />}
              {managerTab === 'in_progress' && <Microscope className="w-5 h-5 text-blue-600" />}
              {managerTab === 'results_review' && <Award className="w-5 h-5 text-purple-600" />}
              {managerTab === 'all' && <Layers className="w-5 h-5 text-slate-700" />}
              <span>
                {managerTab === 'unassigned' && 'Registered Samples Requiring Analyst Allocation'}
                {managerTab === 'in_progress' && 'Live Testing Execution & Analytical Progress'}
                {managerTab === 'results_review' && 'Completed Worksheets Awaiting Manager Approval'}
                {managerTab === 'all' && 'All Authorized Laboratory Samples'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Authorized Laboratory Scope: <strong className="text-slate-800">{authorizedLab}</strong>
            </p>
          </div>

          {/* Lab filter if authorized for ALL */}
          {authorizedLab === 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Laboratory Suite:</span>
              <select
                value={selectedLabFilter}
                onChange={(e) => setSelectedLabFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="ALL">All Laboratories</option>
                <option value="GENERAL">General Lab (GL)</option>
                <option value="PENICILLIN">Penicillin Suite (PEN)</option>
                <option value="CEPHALOSPORIN">Cephalosporin Suite (CEPH)</option>
              </select>
            </div>
          )}
        </div>

        {/* ================= TAB CONTENT: UNASSIGNED QUEUE ================= */}
        {managerTab === 'unassigned' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                    <th className="py-3 px-3.5">Accession / Code</th>
                    <th className="py-3 px-3.5">Material / Batch</th>
                    <th className="py-3 px-3.5">Target Lab</th>
                    <th className="py-3 px-3.5">Priority</th>
                    <th className="py-3 px-3.5">Intake Time</th>
                    <th className="py-3 px-3.5 text-right">Manager Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unassignedSamples.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <span className="font-semibold text-slate-700 block">All Registered Samples are Allocated!</span>
                        <span className="text-[11px] text-slate-400">
                          Newly registered samples from Intake Analysts will automatically appear here.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    unassignedSamples.map((s: any) => (
                      <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-mono font-bold text-indigo-950">{s.sampleCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                          <div className="text-[10px] text-slate-400">Batch: {s.batchNo || s.lotNumber || '—'}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {s.laboratoryType || s.laboratory || 'GL'}
                          </span>
                        </td>

                        <td className="py-3 px-3.5">
                          {s.priority === 'STAT' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              STAT IMMEDIATE
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

                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                          {formatDateTime(s.createdAt || s.samplingDate, 'dd/MM/yyyy HH:mm')}
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningSample(s);
                              setAssignAnalystId(qualifiedAnalysts[0]?.id || '');
                              setAssignPriority(s.priority || 'ROUTINE');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assign to Tester</span>
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

        {/* ================= TAB CONTENT: IN PROGRESS ================= */}
        {managerTab === 'in_progress' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                    <th className="py-3 px-3.5">Sample / Accession</th>
                    <th className="py-3 px-3.5">Material &amp; Batch</th>
                    <th className="py-3 px-3.5">Assigned Tester</th>
                    <th className="py-3 px-3.5">Lab</th>
                    <th className="py-3 px-3.5">Execution Status</th>
                    <th className="py-3 px-3.5 text-right">Reassign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inProgressSamples.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No samples currently in active testing progress.
                      </td>
                    </tr>
                  ) : (
                    inProgressSamples.map((s: any) => {
                      const task = storedTasks.find(
                        (t) => t.sampleId === s.sampleCode || t.accessionNo === s.accessionNo
                      );
                      const analystName = s.assignedTo?.fullName || task?.assignedAnalystName || 'Assigned Analyst';

                      return (
                        <tr key={s.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="font-mono font-bold text-blue-950">{s.sampleCode}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                            <div className="text-[10px] text-slate-400">Batch: {s.batchNo || '—'}</div>
                          </td>

                          <td className="py-3 px-3.5 font-medium text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                                👤
                              </span>
                              <span>{analystName}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {s.laboratoryType || s.laboratory || 'GL'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5">
                            <StatusBadge status={s.status || 'ASSIGNED_FOR_TESTING'} />
                          </td>

                          <td className="py-3 px-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningSample(s);
                                setAssignAnalystId(qualifiedAnalysts[0]?.id || '');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              Reassign
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

        {/* ================= TAB CONTENT: RESULTS REVIEW & APPROVAL ================= */}
        {managerTab === 'results_review' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                    <th className="py-3 px-3.5">Sample / Accession</th>
                    <th className="py-3 px-3.5">Material &amp; Batch</th>
                    <th className="py-3 px-3.5">Submitted By</th>
                    <th className="py-3 px-3.5">Submission Time</th>
                    <th className="py-3 px-3.5">Analytical Outcome</th>
                    <th className="py-3 px-3.5 text-right">Manager Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultsReviewSamples.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                        <span>No completed worksheets currently awaiting approval.</span>
                      </td>
                    </tr>
                  ) : (
                    resultsReviewSamples.map((s: any) => (
                      <tr key={s.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-mono font-bold text-purple-950">{s.sampleCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                          <div className="text-[10px] text-slate-400">Batch: {s.batchNo || '—'}</div>
                        </td>

                        <td className="py-3 px-3.5 font-medium text-slate-800">
                          {s.assignedTo?.fullName || 'Testing Analyst'}
                        </td>

                        <td className="py-3 px-3.5 font-mono text-slate-600">
                          {formatDateTime(s.updatedAt, 'dd/MM/yyyy HH:mm')}
                        </td>

                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            Verification Pending
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReviewingSample(s)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect Results</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApproveResults(s)}
                              className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB CONTENT: ALL SAMPLES ================= */}
        {managerTab === 'all' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80 sticky top-0">
                    <th className="py-3 px-3.5">Sample Code</th>
                    <th className="py-3 px-3.5">Material</th>
                    <th className="py-3 px-3.5">Lab</th>
                    <th className="py-3 px-3.5">Assigned Analyst</th>
                    <th className="py-3 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labFilteredSamples.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">{s.sampleCode}</td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800">{s.nomenclature || s.materialName}</td>
                      <td className="py-2.5 px-3.5">{s.laboratoryType || s.laboratory || 'GL'}</td>
                      <td className="py-2.5 px-3.5 text-slate-600">{s.assignedTo?.fullName || '—'}</td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: DIRECT ASSIGN TO TESTER ================= */}
      {assigningSample && (
        <Modal
          isOpen={!!assigningSample}
          onClose={() => setAssigningSample(null)}
          title={`Assign Sample ${assigningSample.sampleCode} to Testing Analyst`}
          subtitle={`Material: ${assigningSample.nomenclature || (assigningSample as any).materialName} • Lab: ${assigningSample.laboratoryType || 'GENERAL'}`}
          maxWidth="md"
        >
          <form onSubmit={handlePerformAssignment} className="space-y-4 text-xs">
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-indigo-950">Accession No: {assigningSample.accessionNo}</span>
                <span className="font-mono text-[10px] text-indigo-700">Batch: {(assigningSample as any).batchNo || '—'}</span>
              </div>
              <p className="text-[11px] text-indigo-800">
                Assigning this sample will immediately route it into the selected Testing Analyst's execution workstation.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Qualified Testing Analyst <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={assignAnalystId}
                onChange={(e) => setAssignAnalystId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                {qualifiedAnalysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.role} [{a.lab} Suite]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority Level</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="ROUTINE">Routine Standard (72 Hours)</option>
                  <option value="URGENT">Urgent Expedited (48 Hours)</option>
                  <option value="STAT">STAT Immediate (24 Hours)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Shift Allocation</label>
                <select
                  value={assignShift}
                  onChange={(e) => setAssignShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="Morning (Shift A)">Morning (Shift A)</option>
                  <option value="Evening (Shift B)">Evening (Shift B)</option>
                  <option value="Night (Shift C)">Night (Shift C)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Testing Protocol</label>
              <input
                type="text"
                value={assignProtocol}
                onChange={(e) => setAssignProtocol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Special Manager Instructions</label>
              <textarea
                rows={2}
                value={assignInstructions}
                onChange={(e) => setAssignInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setAssigningSample(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-500">
                Confirm &amp; Dispatch to Tester
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL: RESULTS INSPECTION ================= */}
      {reviewingSample && (
        <Modal
          isOpen={!!reviewingSample}
          onClose={() => setReviewingSample(null)}
          title={`Results Review: ${reviewingSample.sampleCode}`}
          subtitle={`Product: ${reviewingSample.nomenclature} • Batch: ${(reviewingSample as any).batchNo || '—'}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">Submitted by: {reviewingSample.assignedTo?.fullName || 'Analyst'}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {formatDateTime(reviewingSample.updatedAt, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Testing worksheets completed per standard operating procedure monograph. Calculations verified.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5">Test Parameter</th>
                    <th className="p-2.5">Pharmacopeial Specification</th>
                    <th className="p-2.5">Observed Result</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-800">Active Assay Content</td>
                    <td className="p-2.5 text-slate-600">98.0% – 102.0%</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-800">99.8%</td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Complies
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-800">Dissolution (Q at 45 min)</td>
                    <td className="p-2.5 text-slate-600">NLT 80% (Q)</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-800">89.4%</td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Complies
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-800">pH / Uniformity</td>
                    <td className="p-2.5 text-slate-600">pH 5.5 – 6.5</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-800">6.1</td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Complies
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setReviewingSample(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleApproveResults(reviewingSample)}
                className="bg-emerald-600 hover:bg-emerald-500 inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sign-off &amp; Approve for CoA</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
