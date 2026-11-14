'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { useAuth } from '@/context/AuthContext';
import { useAllAnalysts } from '@/lib/analysts';
import {
  UserCheck,
  Layers,
  Clock,
  CheckCircle2,
  FileCheck2,
  ExternalLink,
  Search,
  Users,
  Activity,
  ArrowRight,
  FlaskConical,
  Microscope,
  Check,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { getUserLabAccess, Sample } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { auditService } from '@/services/audit.service';

export function DeputyManagerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { analysts: allAnalysts } = useAllAnalysts();

  const [activeTab, setActiveTab] = useState<'unassigned' | 'in_progress' | 'all'>('unassigned');
  const [searchTerm, setSearchTerm] = useState('');

  // Assign Modal
  const [assigningSample, setAssigningSample] = useState<Sample | null>(null);
  const [assignAnalystId, setAssignAnalystId] = useState<string>('');
  const [assignPriority, setAssignPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [assignShift, setAssignShift] = useState<string>('Morning (Shift A)');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const authorizedLab = getUserLabAccess(user); // 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' | 'ALL'

  // Load samples
  const {
    data: samplesData,
    refetch: refetchSamples,
    isLoading,
  } = useQuery({
    queryKey: ['deputy-manager-samples'],
    queryFn: () => samplingService.getAll({ limit: 80, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  const allSamples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Enforce Section / Lab Boundary
  const labSamples = useMemo(() => {
    return allSamples.filter((s: any) => {
      const sampleLab = (s.laboratoryType || s.laboratory?.code || s.laboratory || '').toUpperCase();
      if (authorizedLab === 'GENERAL') return sampleLab === 'GENERAL' || sampleLab === 'GL' || sampleLab === '';
      if (authorizedLab === 'PENICILLIN') return sampleLab.includes('PEN');
      if (authorizedLab === 'CEPHALOSPORIN') return sampleLab.includes('CEPH');
      return true;
    });
  }, [allSamples, authorizedLab]);

  // Tasks from localStorage
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

  const qualifiedAnalysts = useMemo(() => {
    return allAnalysts.filter((a) => {
      if (authorizedLab === 'GENERAL') return a.lab === 'GENERAL' || a.lab === 'ALL';
      if (authorizedLab === 'PENICILLIN') return a.lab === 'PENICILLIN' || a.lab === 'ALL';
      if (authorizedLab === 'CEPHALOSPORIN') return a.lab === 'CEPHALOSPORIN' || a.lab === 'ALL';
      return true;
    });
  }, [allAnalysts, authorizedLab]);

  // Unassigned samples
  const unassignedSamples = useMemo(() => {
    return labSamples.filter((s: any) => {
      const hasDbAssign = !!s.assignedToId || !!s.assignedTo?.fullName;
      const hasTaskAssign = storedTasks.some((t: any) => {
        const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
        const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
        return tCode === sCode && t.assignedAnalystName;
      });
      return !hasDbAssign && !hasTaskAssign && s.status !== 'APPROVED' && s.status !== 'ARCHIVED';
    });
  }, [labSamples, storedTasks]);

  // In-progress samples
  const inProgressSamples = useMemo(() => {
    return labSamples.filter((s: any) => {
      const hasDbAssign = !!s.assignedToId || !!s.assignedTo?.fullName;
      const hasTaskAssign = storedTasks.some((t: any) => {
        const tCode = (t.sampleId || t.accessionNo || '').toUpperCase();
        const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
        return tCode === sCode && t.assignedAnalystName;
      });
      return (hasDbAssign || hasTaskAssign) && s.status !== 'APPROVED';
    });
  }, [labSamples, storedTasks]);

  // Handle Deputy Manager Assignment
  const handleAssignTester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSample) return;

    const chosenAnalyst = qualifiedAnalysts.find((a) => a.id === assignAnalystId) || qualifiedAnalysts[0];
    if (!chosenAnalyst) {
      showToast('error', 'Please select an analyst');
      return;
    }

    try {
      await samplingService.update(assigningSample.id, {
        assignedToId: chosenAnalyst.id,
        status: 'ASSIGNED_FOR_TESTING' as any,
      });

      const newTask = {
        id: `tsk-${Date.now()}`,
        taskCode: `TSK-DEP-${String(Date.now()).slice(-4)}`,
        sampleId: assigningSample.sampleCode || assigningSample.id,
        sampleName: assigningSample.nomenclature || (assigningSample as any).materialName,
        laboratory: assigningSample.laboratoryType || 'GENERAL',
        assignedAnalystName: chosenAnalyst.name,
        assignedAnalystId: chosenAnalyst.id,
        testProtocol: 'Section Compendial Verification',
        priority: assignPriority,
        shift: assignShift,
        assignedDate: new Date().toISOString().split('T')[0],
        status: 'ASSIGNED',
        accessionNo: assigningSample.accessionNo,
      };

      const updated = [newTask, ...storedTasks.filter((t) => t.sampleId !== assigningSample.sampleCode)];
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
      window.dispatchEvent(new Event('lims-tasks-updated'));

      auditService.logActivity({
        action: 'SAMPLE_ASSIGNED',
        entityName: 'Sample',
        entityId: assigningSample.sampleCode,
        performedByName: user?.fullName || 'Deputy Manager',
        role: user?.role || 'DEPUTY_MANAGER',
        reasonForChange: `Deputy Manager assigned ${assigningSample.sampleCode} to ${chosenAnalyst.name}`,
      });

      setAssigningSample(null);
      refetchSamples();
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      showToast('success', `Assigned ${assigningSample.sampleCode} to ${chosenAnalyst.name}.`);
    } catch (err: any) {
      showToast('error', err.message || 'Error assigning tester');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md',
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          )}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="font-bold px-2">
            &times;
          </button>
        </div>
      )}

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-purple-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-sm flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Deputy Manager Section Operations</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-purple-200 border border-white/20">
                @{user?.username || 'deputy.manager'} &bull; {user?.employeeId || 'DMGR-001'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                Scope: {authorizedLab}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Section Workflow, Sample Allocation &amp; Tester Supervision
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
              Supervise registered incoming batches, assign testing analysts according to authorized section permissions,
              and monitor turnaround velocity.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => refetchSamples()}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-purple-300" />
            </button>
            <Link
              href="/tasks"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assignment Board</span>
            </Link>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('unassigned')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'unassigned'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>1. Registered Queue to Assign ({unassignedSamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'in_progress'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Microscope className="w-4 h-4 text-blue-600" />
            <span>2. In-Testing Progress ({inProgressSamples.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>3. All Section Samples ({labSamples.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Tester Assignment</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">{unassignedSamples.length}</div>
          <p className="text-[11px] text-slate-400">Intake samples ready to allocate</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Testing Worksheets</span>
            <Microscope className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700">{inProgressSamples.length}</div>
          <p className="text-[11px] text-slate-400">Executing on analyst benches</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Section Samples</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{labSamples.length}</div>
          <p className="text-[11px] text-slate-400">Within authorized laboratory</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Section Analysts</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{qualifiedAnalysts.length}</div>
          <p className="text-[11px] text-slate-400">Qualified testers on roster</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-3 px-3.5">Accession / Code</th>
                <th className="py-3 px-3.5">Material Name</th>
                <th className="py-3 px-3.5">Lab</th>
                <th className="py-3 px-3.5">Assigned Analyst</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activeTab === 'unassigned' ? unassignedSamples : inProgressSamples).map((s: any) => (
                <tr key={s.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="font-mono font-bold text-purple-950">{s.sampleCode}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-slate-800">{s.nomenclature || s.materialName}</td>
                  <td className="py-3 px-3.5">{s.laboratoryType || s.laboratory || 'GL'}</td>
                  <td className="py-3 px-3.5 text-slate-700 font-medium">
                    {s.assignedTo?.fullName || (
                      <span className="text-amber-700 italic font-bold">Awaiting Tester</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setAssigningSample(s);
                        setAssignAnalystId(qualifiedAnalysts[0]?.id || '');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {assigningSample && (
        <Modal
          isOpen={!!assigningSample}
          onClose={() => setAssigningSample(null)}
          title={`Assign Tester: ${assigningSample.sampleCode}`}
          subtitle="Deputy Manager Section Allocation"
          maxWidth="sm"
        >
          <form onSubmit={handleAssignTester} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Testing Analyst</label>
              <select
                required
                value={assignAnalystId}
                onChange={(e) => setAssignAnalystId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                {qualifiedAnalysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} [{a.lab}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Priority</label>
              <select
                value={assignPriority}
                onChange={(e) => setAssignPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="ROUTINE">Routine Standard</option>
                <option value="URGENT">Urgent Expedited</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setAssigningSample(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-500">
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
