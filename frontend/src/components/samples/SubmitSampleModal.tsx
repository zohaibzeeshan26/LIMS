'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { Sample, SubmissionDestination, SubmissionStatus, SampleSubmission } from '@/types/lims';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { SampleRoutingChitModal, SampleRoutingChitData } from '@/components/samples/SampleRoutingChitModal';
import {
  Microscope,
  FlaskConical,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Send,
  FileText,
  ShieldCheck,
  ChevronRight,
  Info,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  XCircle,
  Printer,
  QrCode,
} from 'lucide-react';

interface SubmitSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: Sample | null;
  onSuccess?: () => void;
}

interface DestinationOption {
  key: SubmissionDestination;
  title: string;
  department: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  colorScheme: {
    border: string;
    borderActive: string;
    bgActive: string;
    iconBg: string;
    iconText: string;
    badge: string;
  };
  scope: string[];
  description: string;
}

const DESTINATION_OPTIONS: DestinationOption[] = [
  {
    key: 'MICROBIOLOGY',
    title: 'Microbiology Lab',
    department: 'Microbiological Quality Control Suite',
    icon: Microscope,
    tagline: 'Sterility, Bioburden & Endotoxin Testing',
    colorScheme: {
      border: 'border-indigo-200/80 hover:border-indigo-400',
      borderActive: 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40',
      bgActive: 'bg-indigo-50/70',
      iconBg: 'bg-indigo-100 text-indigo-700',
      iconText: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    scope: [
      'Sterility testing (membrane filtration / direct inoculation)',
      'Bacterial Endotoxin Testing (BET / LAL chromogenic/kinetic)',
      'Total Aerobic Microbial Count (TAMC) & Yeast/Mold (TYMC)',
      'Specified microorganisms & environmental monitoring swabs',
    ],
    description:
      'Route sample to the Microbiology QC division for aseptic testing, bioburden evaluation, and pyrogen safety compliance under Grade A/B laminar airflow.',
  },
  {
    key: 'CHEMICAL',
    title: 'Chemical Lab',
    department: 'Chemical & Instrumental Analytical QC',
    icon: FlaskConical,
    tagline: 'Chromatography, Assay & Dissolution',
    colorScheme: {
      border: 'border-teal-200/80 hover:border-teal-400',
      borderActive: 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/40',
      bgActive: 'bg-teal-50/70',
      iconBg: 'bg-teal-100 text-teal-700',
      iconText: 'text-teal-600',
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    scope: [
      'Active pharmaceutical ingredient assay (HPLC / GC / UV-Vis)',
      'Related substances, chromatographic impurities & degradants',
      'In-vitro dissolution rate profiling & release kinetics',
      'Assay titrations, identification tests & chemical monographs',
    ],
    description:
      'Route sample to the Chemical Instrumental Laboratory for quantitative active ingredient assay, chromatographic separation, and stability testing.',
  },
  {
    key: 'PHYSICAL',
    title: 'Physical Lab',
    department: 'Galenical & Physical Characterization Lab',
    icon: Layers,
    tagline: 'Disintegration, Friability & Hardness',
    colorScheme: {
      border: 'border-amber-200/80 hover:border-amber-400',
      borderActive: 'border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/40',
      bgActive: 'bg-amber-50/70',
      iconBg: 'bg-amber-100 text-amber-700',
      iconText: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    scope: [
      'Disintegration time analysis (tablets, capsules, effervescents)',
      'Tablet mechanical hardness, breaking force & thickness',
      'Friability testing & resistance to mechanical abrasion',
      'Loss on drying (LOD), moisture content & weight uniformity',
    ],
    description:
      'Route sample to the Physical Laboratory for solid oral dosage characterization, disintegration testing, mechanical strength, and gravimetric analysis.',
  },
];

// Active statuses that prevent duplicate submission
const ACTIVE_STATUSES: SubmissionStatus[] = [
  'DRAFT',
  'REGISTERED',
  'SUBMITTED',
  'RECEIVED',
  'IN_PROGRESS',
];

export function SubmitSampleModal({
  isOpen,
  onClose,
  sample,
  onSuccess,
}: SubmitSampleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDestination, setSelectedDestination] = useState<SubmissionDestination | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('SUBMITTED');
  const [remarks, setRemarks] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Sample Container Routing Chit / Label modal state
  const [routingChitData, setRoutingChitData] = useState<SampleRoutingChitData | null>(null);
  const [isChitModalOpen, setIsChitModalOpen] = useState(false);

  // Status transition state for existing submissions
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [transitionStatus, setTransitionStatus] = useState<string>('');
  const [transitionReason, setTransitionReason] = useState<string>('');

  // Fetch existing submissions for this sample to detect active routings and prevent duplicates
  const {
    data: existingSubmissions = [],
    isLoading: isLoadingSubmissions,
    refetch: refetchSubmissions,
  } = useQuery<SampleSubmission[]>({
    queryKey: ['sample-submissions', sample?.id],
    queryFn: async () => {
      if (!sample?.id) return [];
      const res = await samplingService.getSampleSubmissions(sample.id);
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
    enabled: isOpen && !!sample?.id,
  });

  // Map active submissions by laboratory
  const activeSubmissionsByLab = useMemo(() => {
    const map = new Map<SubmissionDestination, SampleSubmission>();
    for (const sub of existingSubmissions) {
      if (ACTIVE_STATUSES.includes(sub.status)) {
        map.set(sub.destinationLab, sub);
      }
    }
    return map;
  }, [existingSubmissions]);

  // Reset form when modal opens or sample changes
  useEffect(() => {
    if (isOpen && sample) {
      setSelectedDestination(null);
      setSubmissionStatus('SUBMITTED');
      setRemarks('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setTransitioningId(null);
      setShowHistory(false);
    }
  }, [isOpen, sample]);

  // Submit sample workflow mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sample?.id) throw new Error('No sample selected');
      if (!selectedDestination) throw new Error('Please select a destination laboratory');

      return samplingService.submitToWorkflow(sample.id, {
        destinationLab: selectedDestination,
        status: submissionStatus,
        remarks: remarks.trim() || undefined,
      });
    },
    onSuccess: (res: any) => {
      const destName = DESTINATION_OPTIONS.find((d) => d.key === selectedDestination)?.title || selectedDestination;
      const subId = res?.id || res?.data?.id;
      setSuccessMessage(`Sample successfully routed to ${destName} with tracking reference #${subId ? subId.substring(0, 8) : 'confirmed'}.`);
      setErrorMessage(null);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sample', sample?.id] });
      queryClient.invalidateQueries({ queryKey: ['sample-submissions', sample?.id] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });

      // Automatically construct and display the official physical container routing chit modal
      setRoutingChitData({
        sample: sample!,
        destinationLab: selectedDestination,
        submissionNumber: subId ? `SUB-${subId.substring(0, 6).toUpperCase()}` : undefined,
        submittedByName: user?.fullName || 'Sampling Officer',
        submittedAt: new Date().toISOString(),
        remarks: remarks.trim() || undefined,
      });
      setIsChitModalOpen(true);

      if (onSuccess) onSuccess();

      // Clear selection
      setSelectedDestination(null);
      setRemarks('');
      refetchSubmissions();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit sample to workflow';
      setErrorMessage(msg);
      setSuccessMessage(null);
    },
  });

  // Status transition mutation for existing submissions
  const transitionMutation = useMutation({
    mutationFn: async ({
      submissionId,
      status,
      reasonForChange,
    }: {
      submissionId: string;
      status: string;
      reasonForChange?: string;
    }) => {
      return samplingService.updateSubmissionStatus(submissionId, {
        status,
        reasonForChange,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-submissions', sample?.id] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['sample', sample?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });
      setTransitioningId(null);
      setTransitionStatus('');
      setTransitionReason('');
      refetchSubmissions();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update submission status';
      setErrorMessage(msg);
    },
  });

  if (!isOpen || !sample) return null;

  const isSelectedActive = selectedDestination ? activeSubmissionsByLab.has(selectedDestination) : false;
  const canSubmit = selectedDestination !== null && !isSelectedActive && !submitMutation.isPending;

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Sample Workflow"
      subtitle="Select destination laboratory and register specimen dispatch into testing queue"
      maxWidth="3xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* 1. Sample Identity & Summary Banner */}
        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/70">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {sample.accessionNo || 'A-0001'}
                </span>
                <span className="font-mono text-xs font-bold text-navy-950">
                  {sample.sampleCode}
                </span>
                <Badge variant="info" size="sm">
                  {typeof sample.laboratory === 'string'
                    ? `${sample.laboratory} Lab Intake`
                    : (sample.laboratory as any)?.name
                    ? `${(sample.laboratory as any).name} Intake`
                    : sample.laboratoryType
                    ? `${sample.laboratoryType} Lab Intake`
                    : 'General'}
                </Badge>
              </div>
              <h3 className="text-sm font-bold text-navy-950 mt-1">
                {sample.nomenclature || sample.materialName}
              </h3>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-[11px] text-slate-400 block uppercase font-medium">
                Current Sample Status
              </span>
              <StatusBadge status={sample.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Batch / Lot No.
              </span>
              <span className="font-mono font-medium text-slate-900">
                {sample.lotNumber || sample.batch?.batchNumber || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Quantity Available
              </span>
              <span className="font-semibold text-navy-950">
                {sample.sampleQty} {sample.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Sample Type
              </span>
              <span className="text-slate-800">
                {sample.sampleType.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Intake Date
              </span>
              <span className="text-slate-800">
                {formatDateTime(sample.samplingDate, 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Active Routing Status & Duplicate Detection Banner */}
        {activeSubmissionsByLab.size > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-amber-900">
                Active Laboratory Routing Detected ({activeSubmissionsByLab.size} Destination{activeSubmissionsByLab.size > 1 ? 's' : ''})
              </div>
              <p className="text-amber-700 mt-0.5 leading-relaxed">
                This sample currently has active workflow submissions in progress. To prevent duplicate sample routing, you cannot re-submit to laboratories where testing is currently underway.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.from(activeSubmissionsByLab.entries()).map(([labKey, sub]) => {
                  const labTitle = DESTINATION_OPTIONS.find((d) => d.key === labKey)?.title || labKey;
                  return (
                    <span
                      key={labKey}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-900 font-medium text-[11px] shadow-xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <strong>{labTitle}:</strong>
                      <span className="font-mono text-teal-800">{sub.status}</span>
                      <span className="text-slate-400 text-[10px]">
                        ({formatDateTime(sub.submissionDate, 'dd/MM HH:mm')})
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. Workflow Laboratory Selection (The Three Options) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-teal-700" />
                <span>Select Destination Laboratory *</span>
              </label>
              <p className="text-xs text-slate-500">
                Choose the analytical division responsible for evaluating this sample.
              </p>
            </div>
            {selectedDestination && (
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Selected: {DESTINATION_OPTIONS.find((d) => d.key === selectedDestination)?.title}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DESTINATION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedDestination === opt.key;
              const activeSub = activeSubmissionsByLab.get(opt.key);
              const isAlreadyActive = !!activeSub;

              return (
                <div
                  key={opt.key}
                  onClick={() => {
                    if (isAlreadyActive) return;
                    setSelectedDestination(opt.key);
                    setErrorMessage(null);
                  }}
                  className={cn(
                    'relative rounded-xl border p-3.5 transition-all flex flex-col justify-between text-left select-none',
                    isAlreadyActive
                      ? 'border-slate-200 bg-slate-50/80 opacity-75 cursor-not-allowed'
                      : isSelected
                      ? cn(opt.colorScheme.borderActive, 'cursor-pointer shadow-sm')
                      : cn(opt.colorScheme.border, 'bg-white hover:bg-slate-50/50 cursor-pointer shadow-xs')
                  )}
                >
                  {/* Top: Icon + Selection Indicator */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={cn('p-2 rounded-lg', opt.colorScheme.iconBg)}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Selection Radio / Badge */}
                      {isAlreadyActive ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                          Active: {activeSub.status}
                        </span>
                      ) : isSelected ? (
                        <span className="h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-navy-950">{opt.title}</h4>
                    <p className="text-[11px] font-medium text-teal-800 mb-1.5">{opt.tagline}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">
                      {opt.description}
                    </p>
                  </div>

                  {/* Scope bullets */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Analytical Scope:
                    </span>
                    <ul className="space-y-0.5">
                      {opt.scope.slice(0, 2).map((item, idx) => (
                        <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1">
                          <span className="text-teal-600 shrink-0 font-bold">•</span>
                          <span className="line-clamp-1">{item}</span>
                        </li>
                      ))}
                    </ul>

                    {isAlreadyActive && (
                      <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 font-medium">
                        Duplicate prevention: already active.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Selected Destination Confirmation & Submission Form */}
        {selectedDestination ? (
          <div className="rounded-xl border border-teal-200/80 bg-teal-50/30 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-teal-200/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-teal-800 block">
                    Confirmed Routing Destination
                  </span>
                  <span className="text-sm font-bold text-navy-950">
                    {DESTINATION_OPTIONS.find((d) => d.key === selectedDestination)?.title} (
                    {DESTINATION_OPTIONS.find((d) => d.key === selectedDestination)?.department})
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-teal-700 font-semibold bg-white px-2.5 py-1 rounded-md border border-teal-200">
                ISO/GLP Custody Handover
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Submission Status */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Initial Workflow Status *
                </label>
                <select
                  value={submissionStatus}
                  onChange={(e) => setSubmissionStatus(e.target.value as SubmissionStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="SUBMITTED">Submitted (Active dispatch to lab queue)</option>
                  <option value="REGISTERED">Registered (Accessioned in lab ledger)</option>
                  <option value="DRAFT">Draft (Pending specimen preparation)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Recommended: Submitted
                </span>
              </div>

              {/* Submitted By */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Submitted By
                </label>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs">
                  <User className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span className="truncate font-medium">
                    {user?.fullName || 'QA Specialist'} ({user?.employeeId || 'ID-001'})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Role: {user?.role || 'QA_MANAGER'}
                </span>
              </div>

              {/* Submission Date & Time */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Submission Date & Time
                </label>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono">
                  <Clock className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span>{formatDateTime(new Date().toISOString(), 'dd/MM/yyyy HH:mm:ss')}</span>
                </div>
              </div>
            </div>

            {/* Optional Remarks */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Routing Remarks & Special Testing Instructions (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Enter sample handling instructions, specific testing SOP references, urgency notes, or storage precautions..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
            Please click on one of the three laboratory divisions above to select the submission destination.
          </div>
        )}

        {/* 5. Implementation Scope / SOP Compliance Note */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong className="text-slate-800 font-semibold">Workflow Scope Notice:</strong> Initial workflow routing officially transfers custody and logs the sample in the designated laboratory queue (Microbiology, Chemical, or Physical Lab). Analytical testing execution, instrument telemetry, and final COA verification will be conducted in the corresponding laboratory testing modules as they are activated.
          </div>
        </div>

        {/* 6. Error & Success Notifications */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2 animate-fade-in">
            <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Submission Error:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Workflow Submission Confirmed:</strong>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* 7. Existing Submissions & Workflow History Accordion */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-teal-700" />
              <span>
                Workflow Routing History for this Sample ({existingSubmissions.length} Record{existingSubmissions.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-medium">
              <span>{showHistory ? 'Hide History' : 'View History & Manage Status'}</span>
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform duration-200', showHistory && 'rotate-90')}
              />
            </div>
          </button>

          {showHistory && (
            <div className="p-3 bg-white divide-y divide-slate-100 text-xs">
              {isLoadingSubmissions ? (
                <div className="py-4 text-center text-slate-400">Loading submission records...</div>
              ) : existingSubmissions.length === 0 ? (
                <div className="py-4 text-center text-slate-400 italic">
                  No previous workflow submissions recorded for this sample.
                </div>
              ) : (
                existingSubmissions.map((sub) => {
                  const labInfo = DESTINATION_OPTIONS.find((d) => d.key === sub.destinationLab);
                  const Icon = labInfo?.icon || FlaskConical;
                  const isTransitioning = transitioningId === sub.id;

                  // Allowed status transitions
                  const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
                    DRAFT: ['REGISTERED', 'SUBMITTED', 'CANCELLED'],
                    REGISTERED: ['SUBMITTED', 'CANCELLED'],
                    SUBMITTED: ['RECEIVED', 'REJECTED', 'CANCELLED'],
                    RECEIVED: ['IN_PROGRESS', 'REJECTED'],
                    IN_PROGRESS: ['COMPLETED', 'REJECTED'],
                    COMPLETED: [],
                    REJECTED: ['SUBMITTED'],
                    CANCELLED: [],
                  };
                  const nextStatuses = allowedTransitions[sub.status] || [];

                  return (
                    <div key={sub.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', labInfo?.colorScheme.iconBg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-navy-950">
                                {labInfo?.title || sub.destinationLab}
                              </span>
                              <StatusBadge status={sub.status} />
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>Submitted by: <strong>{sub.submittedByName}</strong></span>
                              <span>•</span>
                              <span>Date: {formatDateTime(sub.submissionDate, 'dd/MM/yyyy HH:mm')}</span>
                            </div>
                            {sub.remarks && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded mt-1.5 border border-slate-200/60">
                                <span className="font-semibold text-slate-500">Remarks:</span> {sub.remarks}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                          {/* Print Container Chit button */}
                          <button
                            type="button"
                            onClick={() => {
                              setRoutingChitData({
                                sample: sample,
                                destinationLab: sub.destinationLab,
                                submissionNumber: `SUB-${sub.id.substring(0, 6).toUpperCase()}`,
                                submittedByName: sub.submittedByName,
                                submittedAt: sub.submissionDate,
                                remarks: sub.remarks,
                              });
                              setIsChitModalOpen(true);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Print Container Routing Slip for this dispatch"
                          >
                            <Printer className="h-3 w-3 text-slate-600" />
                            <span>Print Slip</span>
                          </button>

                          {/* Status Transition Control (Admin / QA / QC) */}
                          {nextStatuses.length > 0 && (
                            <>
                              {!isTransitioning ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTransitioningId(sub.id);
                                    setTransitionStatus(nextStatuses[0]);
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                                >
                                  Update Status
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                  <select
                                    value={transitionStatus}
                                    onChange={(e) => setTransitionStatus(e.target.value)}
                                    className="text-[11px] px-1.5 py-1 rounded border border-slate-300 bg-white"
                                  >
                                    {nextStatuses.map((st) => (
                                      <option key={st} value={st}>
                                        {st.replace(/_/g, ' ')}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={transitionMutation.isPending}
                                    onClick={() =>
                                      transitionMutation.mutate({
                                        submissionId: sub.id,
                                        status: transitionStatus,
                                        reasonForChange: `Updated by ${user?.fullName || 'Authorized User'}`,
                                      })
                                    }
                                    className="px-2 py-1 rounded text-[10px] font-bold text-white bg-navy-900 hover:bg-navy-950 transition-colors cursor-pointer"
                                  >
                                    {transitionMutation.isPending ? 'Saving...' : 'Apply'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTransitioningId(null)}
                                    className="px-1.5 py-1 rounded text-[10px] text-slate-500 hover:text-slate-800"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sample Priority & SLA Turnaround Notice */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Sample Testing Priority:</span>
            <span className="text-slate-600">
              {sample.priority === 'URGENT' || sample.priority === 'STAT'
                ? 'Urgent Fast-Track (1 Hr - 2 Days)'
                : 'Routine Standard (5 - 15 Days)'}
            </span>
          </div>
          <span
            className={cn(
              'font-mono font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs',
              sample.priority === 'URGENT' || sample.priority === 'STAT'
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-blue-600 text-white'
            )}
          >
            {sample.priority === 'URGENT' || sample.priority === 'STAT' ? '1 Hr - 2 Days' : '5 - 15 Days'}
          </span>
        </div>

        {/* 8. Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={!canSubmit}
              onClick={() => submitMutation.mutate()}
              className={cn(
                'text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm',
                canSubmit
                  ? 'bg-navy-900 hover:bg-navy-950 text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed'
              )}
            >
              {submitMutation.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Routing Sample...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-teal-400" />
                  <span>
                    Confirm & Route to{' '}
                    {selectedDestination
                      ? DESTINATION_OPTIONS.find((d) => d.key === selectedDestination)?.title
                      : 'Laboratory'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>

      {/* Official Container Routing Slip / Chit Modal */}
      {isChitModalOpen && routingChitData && (
        <SampleRoutingChitModal
          isOpen={isChitModalOpen}
          onClose={() => {
            setIsChitModalOpen(false);
            setRoutingChitData(null);
          }}
          chitData={routingChitData}
          onViewSampleDetails={() => {
            setIsChitModalOpen(false);
            setRoutingChitData(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
