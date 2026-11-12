'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { useAuth } from '@/context/AuthContext';
import {
  FlaskConical,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  QrCode,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Tag,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Sample } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';

export function SampleRegistrationDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [labFilter, setLabFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // Fetch samples registered in the facility
  const {
    data: samplesData,
    refetch: refetchSamples,
    isLoading,
  } = useQuery({
    queryKey: ['registration-analyst-samples'],
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 5000,
  });

  const samples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Filter samples registered by this analyst (or all registered samples if user is intake technician)
  const registeredSamples = useMemo(() => {
    return samples.filter((s: any) => {
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
  }, [samples, searchTerm, labFilter, priorityFilter]);

  // Intake Metrics
  const metrics = useMemo(() => {
    const total = samples.length;
    const awaitingAssignment = samples.filter(
      (s) =>
        s.status === 'RECEIVED' ||
        s.status === 'LOGGED' ||
        s.status === 'PENDING_SUPERVISOR_ASSIGNMENT'
    ).length;
    const assigned = samples.filter(
      (s) => s.status === 'ASSIGNED_FOR_TESTING' || s.status === 'ASSIGNED'
    ).length;
    const inTesting = samples.filter((s) => s.status === 'TESTING_IN_PROGRESS').length;

    return { total, awaitingAssignment, assigned, inTesting };
  }, [samples]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Terminal Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-teal-800/40">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-sm flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Sample Registration &amp; Accessioning Terminal</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-teal-200 border border-white/20">
                @{user?.username || 'reg.analyst'} &bull; {user?.employeeId || 'REG-001'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                Specimen Intake Gate
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pharmaceutical Sample Registration &amp; Accession History
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-3xl leading-relaxed">
              Register incoming raw materials, finished products, and in-process samples. Every accessioned
              sample automatically appears in the Manager and Deputy Manager dashboards for analyst allocation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              size="lg"
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg inline-flex items-center gap-2 cursor-pointer py-3 px-5 rounded-xl"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Register Incoming Sample</span>
            </Button>
            <button
              onClick={() => refetchSamples()}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh Queue"
            >
              <RotateCcw className="w-4 h-4 text-teal-300" />
            </button>
          </div>
        </div>

        {/* Workflow Routing Alert */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-teal-200">
          <ArrowRight className="w-4 h-4 text-teal-400 shrink-0" />
          <span>
            <strong>Automatic Manager Sync Active:</strong> Any new sample accessioned here will immediately reflect in the QC Manager Allocation Queue for tester assignment.
          </span>
        </div>
      </div>

      {/* 2. Key Sample Intake Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Accessioned</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.total}</div>
          <p className="text-[11px] text-slate-400">Total samples registered in LIMS</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Manager Action</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">{metrics.awaitingAssignment}</div>
          <p className="text-[11px] text-slate-400">Ready in Manager allocation board</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Assigned to Analysts</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700">{metrics.assigned}</div>
          <p className="text-[11px] text-slate-400">Allocated to testing workstations</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Under Active Testing</span>
            <FlaskConical className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{metrics.inTesting}</div>
          <p className="text-[11px] text-slate-400">Worksheets executing in labs</p>
        </div>
      </div>

      {/* 3. Registration History & Specimen Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>Sample Registration History &amp; Specimen Logs</span>
            </h2>
            <p className="text-xs text-slate-500">
              Accessioned specimens, QR routing tags, batch details, and automatic Manager dispatch status
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Sample Accession</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by sample code, batch, material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Laboratories (3 Facilities)</option>
              <option value="GEN">General Lab (GL)</option>
              <option value="PEN">Penicillin Lab (PEN)</option>
              <option value="CEPH">Cephalosporin Lab (CEPH)</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="STAT">STAT Immediate (24 Hours)</option>
              <option value="URGENT">Urgent (48 Hours)</option>
              <option value="ROUTINE">Routine Standard</option>
            </select>
          </div>
        </div>

        {/* Samples Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-3 px-3.5">Sample Code / Accession</th>
                <th className="py-3 px-3.5">Material / Product Name</th>
                <th className="py-3 px-3.5">Batch / Lot</th>
                <th className="py-3 px-3.5">Target Lab</th>
                <th className="py-3 px-3.5">Priority</th>
                <th className="py-3 px-3.5">Registration Time</th>
                <th className="py-3 px-3.5">Manager Status</th>
                <th className="py-3 px-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registeredSamples.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No samples matching your search criteria.
                  </td>
                </tr>
              ) : (
                registeredSamples.map((s: any) => {
                  const isManagerPending =
                    s.status === 'RECEIVED' ||
                    s.status === 'LOGGED' ||
                    s.status === 'PENDING_SUPERVISOR_ASSIGNMENT';

                  return (
                    <tr key={s.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-teal-950 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{s.sampleCode}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.accessionNo}</div>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{s.nomenclature || s.materialName}</div>
                        <div className="text-[10px] text-slate-400">
                          {s.stageType || s.sampleType || 'QC Specimen'}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-700">
                        {s.batchNo || s.lotNumber || '—'}
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {s.laboratoryType || s.laboratory || 'GENERAL'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        {s.priority === 'STAT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            STAT (24h)
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

                      <td className="py-3 px-3.5">
                        {isManagerPending ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>In Manager Allocation Queue</span>
                          </span>
                        ) : s.status === 'ASSIGNED_FOR_TESTING' || s.status === 'ASSIGNED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>Assigned to Analyst</span>
                          </span>
                        ) : (
                          <StatusBadge status={s.status} />
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSample(s)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Chit</span>
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

      {/* 4. New Sample Modal */}
      {isRegisterModalOpen && (
        <NewSampleModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSampleCreated={() => {
            setIsRegisterModalOpen(false);
            refetchSamples();
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            queryClient.invalidateQueries({ queryKey: ['manager-dashboard-samples'] });
          }}
        />
      )}

      {/* 5. Sample Detail Modal */}
      {selectedSample && (
        <Modal
          isOpen={!!selectedSample}
          onClose={() => setSelectedSample(null)}
          title={`Specimen Accession Record: ${selectedSample.sampleCode}`}
          subtitle={`Accession No: ${selectedSample.accessionNo} • Status: ${selectedSample.status}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
              <span className="font-bold text-teal-900 text-sm">
                {selectedSample.nomenclature || (selectedSample as any).materialName}
              </span>
              <p className="text-[11px] text-teal-700">
                Batch: {(selectedSample as any).batchNo || '—'} &bull; Lab: {selectedSample.laboratoryType || (selectedSample as any).laboratory}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Registration Timestamp</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatDateTime(selectedSample.createdAt, 'dd/MM/yyyy HH:mm:ss')}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Current Routing</span>
                <span className="font-bold text-blue-700">
                  {selectedSample.status === 'LOGGED' || selectedSample.status === 'RECEIVED'
                    ? 'Transferred to Manager'
                    : selectedSample.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setSelectedSample(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

