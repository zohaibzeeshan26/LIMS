'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { SEMI_BASE_STAGES, FORMULATION_STAGES, LabSection, Sample } from '@/types/lims';
import { scrollToFirstError } from '@/hooks/useFormErrorFocus';
import {
  FlaskConical,
  Sparkles,
  Layers,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  FileText,
  MapPin,
  Tag,
  Hash,
  Scale,
  PackageCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

// Strict Zod Validation Schema enforcing cGMP / 21 CFR Part 11 requirements
export const addSampleSchema = z
  .object({
    laboratory: z
      .string({ required_error: 'Lab Section is required' })
      .trim()
      .min(1, 'Lab Section is required')
      .refine(
        (val) => ['GENERAL', 'CEPHALOSPORIN', 'PENICILLIN'].includes(val.toUpperCase()),
        'Lab Section must be General, Cephalosporin, or Penicillin'
      ),
    section: z.enum(['semi-base', 'formulation']),
    samplingDateTime: z.string().trim().min(1, 'Sampling Date & Time is required'),
    qcNumber: z.string().trim().min(1, 'QC Number / Sample ID is required'),
    nomenclature: z
      .string()
      .trim()
      .min(1, 'Material Name / Drug Substance is required')
      .max(255, 'Material Name cannot exceed 255 characters'),
    lotNumber: z.string().trim().min(1, 'Batch / Lot Number is required'),
    sampleType: z.string().trim().min(1, 'Stage / Sample Type is required'),
    customStage: z.string().optional(),
    sampleQty: z.coerce
      .number({ invalid_type_error: 'Received Quantity must be a valid number' })
      .positive('Received Quantity must be greater than 0'),
    unit: z.string().trim().min(1, 'Unit of measurement (UoM) is required'),
    customUnit: z.string().optional(),
    mfgDate: z.string().trim().min(1, 'Manufacturing Date is required'),
    expDate: z.string().trim().min(1, 'Expiry Date is required'),
    storageCondition: z.string().optional(),
    submittedBy: z.string().trim().min(1, 'Submitted By personnel name is required'),
    receivedBy: z.string().trim().min(1, 'Received By intake officer name is required'),
    samplingLocation: z.string().optional(),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT', 'STABILITY']),
    batchId: z.string().optional(),
    remarks: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Manufacturing Date & Expiry Date validation (expiry date must be strictly after manufacturing date)
    if (data.mfgDate && data.expDate) {
      const mfg = new Date(data.mfgDate);
      const exp = new Date(data.expDate);
      if (isNaN(mfg.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Manufacturing Date is invalid',
          path: ['mfgDate'],
        });
      }
      if (isNaN(exp.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiry Date is invalid',
          path: ['expDate'],
        });
      }
      if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime()) && exp <= mfg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expiry Date must be later than Manufacturing Date',
          path: ['expDate'],
        });
      }
    }

    // 2. Validate custom stage if "Other" is selected
    if (data.sampleType === 'Other') {
      if (!data.customStage || data.customStage.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify the custom stage name when "Other" is selected',
          path: ['customStage'],
        });
      }
    }

    // 3. Validate custom unit if "Other" is selected
    if (data.unit === 'Other') {
      if (!data.customUnit || data.customUnit.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify the custom unit when "Other" is selected',
          path: ['customUnit'],
        });
      }
    }
  });

export type AddSampleFormValues = z.infer<typeof addSampleSchema>;

export interface AddSampleFormProps {
  defaultLaboratory?: string;
  defaultSection?: LabSection;
  onSuccess?: (createdSample: any) => void;
  onCancel?: () => void;
  initialValues?: Partial<AddSampleFormValues>;
  containerId?: string;
}

export function AddSampleForm({
  defaultLaboratory = 'GENERAL',
  defaultSection = 'semi-base',
  onSuccess,
  onCancel,
  initialValues,
  containerId = 'add-sample-form-container',
}: AddSampleFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedSection, setSelectedSection] = useState<LabSection>(
    (initialValues?.section as LabSection) || defaultSection
  );
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);
  const [liveDate, setLiveDate] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmation Modal State (Opens ONLY when 100% valid)
  const [pendingConfirmationData, setPendingConfirmationData] = useState<AddSampleFormValues | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // Helper to format local ISO string (YYYY-MM-DDTHH:mm:ss)
  const getLocalISOString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 19);
  };

  // Fetch batches for selection
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get<any[]>('/batches'),
  });

  const defaultValues: AddSampleFormValues = {
    laboratory: defaultLaboratory,
    section: selectedSection,
    samplingDateTime: getLocalISOString(),
    qcNumber: '',
    nomenclature: '',
    lotNumber: '',
    sampleType: selectedSection === 'semi-base' ? SEMI_BASE_STAGES[0] : FORMULATION_STAGES[0],
    customStage: '',
    sampleQty: 100,
    unit: 'tablets',
    customUnit: '',
    mfgDate: '',
    expDate: '',
    storageCondition: '',
    submittedBy: user?.fullName ? `${user.fullName} (${user.department || 'Production Lead'})` : 'Production Line Lead',
    receivedBy: user?.fullName ? `${user.fullName} (QC Accession Officer)` : 'QC Accession Desk',
    samplingLocation: '',
    priority: 'ROUTINE',
    batchId: '',
    remarks: '',
    ...initialValues,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddSampleFormValues>({
    resolver: zodResolver(addSampleSchema),
    defaultValues,
    mode: 'onTouched',
  });

  // Fetch next sequential Sample ID preview
  const watchedSampleType = watch('sampleType');
  const watchedLab = watch('laboratory') || defaultLaboratory;
  const { data: nextIdData } = useQuery({
    queryKey: ['next-sample-id', watchedLab, selectedSection, watchedSampleType],
    queryFn: () =>
      samplingService.getNextSampleId({
        laboratory: watchedLab,
        section: selectedSection,
        stageType: watchedSampleType,
      }),
    staleTime: 2000,
  });

  const autoGeneratedQcNumber = useMemo(() => {
    if (nextIdData?.sampleCode) return nextIdData.sampleCode;
    const lab = (watchedLab || 'GENERAL').toUpperCase();
    let labPrefix = 'GL';
    if (lab.includes('CEPH') || lab === 'CP') labPrefix = 'CP';
    else if (lab.includes('PEN') || lab === 'PL') labPrefix = 'PL';

    const sec = selectedSection === 'formulation' ? 'F' : 'SB';
    return `${labPrefix}/${sec}-1`;
  }, [nextIdData, watchedLab, selectedSection]);

  // Synchronize QC number automatically when auto-generated ID resolves
  useEffect(() => {
    if (autoGeneratedQcNumber) {
      setValue('qcNumber', autoGeneratedQcNumber, { shouldValidate: true });
    }
  }, [autoGeneratedQcNumber, setValue]);

  // Live ticking interval
  useEffect(() => {
    if (!isLiveClock) return;
    const timer = setInterval(() => {
      const now = new Date();
      setLiveDate(now);
      setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: false });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLiveClock, setValue]);

  // Handle batch selection autofill
  const watchedBatchId = watch('batchId');
  useEffect(() => {
    if (watchedBatchId && batches) {
      const selectedBatch = batches.find((b) => b.id === watchedBatchId);
      if (selectedBatch) {
        if (selectedBatch.batchNumber) {
          setValue('lotNumber', selectedBatch.batchNumber, { shouldValidate: true, shouldDirty: true });
        }
        if (selectedBatch.manufacturingDate) {
          setValue('mfgDate', selectedBatch.manufacturingDate.substring(0, 10), { shouldValidate: true, shouldDirty: true });
        }
        if (selectedBatch.expiryDate) {
          setValue('expDate', selectedBatch.expiryDate.substring(0, 10), { shouldValidate: true, shouldDirty: true });
        }
        if (selectedBatch.drugProduct) {
          setValue('nomenclature', selectedBatch.drugProduct, { shouldValidate: true, shouldDirty: true });
        }
      }
    }
  }, [watchedBatchId, batches, setValue]);

  // Mutation to persist sample
  const createMutation = useMutation({
    mutationFn: (payload: any) => samplingService.create(payload),
    onSuccess: (newSample: any) => {
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['samples-for-task-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['active-expedited-urgent-samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-samples'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      setIsConfirmModalOpen(false);
      setPendingConfirmationData(null);

      // Automatically sync newly registered sample into Task Assignment Registry
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('city_pharma_lims_tasks');
          const currentTasks = stored ? JSON.parse(stored) : [];

          const labRaw = (
            newSample.laboratory ||
            newSample.laboratoryType ||
            defaultLaboratory ||
            'GENERAL'
          )
            .toString()
            .toUpperCase();
          const labKey = labRaw.includes('PEN')
            ? 'PENICILLIN'
            : labRaw.includes('CEPH') || labRaw.includes('SAF')
            ? 'CEPHALOSPORIN'
            : 'GENERAL';

          const sampleCode = newSample.sampleCode || newSample.accessionNo || `SMP-${Date.now()}`;
          const sampleName =
            newSample.nomenclature ||
            newSample.materialName ||
            pendingConfirmationData?.nomenclature ||
            'Analytical Registered Sample';

          const sec = selectedSection === 'formulation' ? 'formulation' : 'semi-base';

          const defaultAnalyst =
            labKey === 'CEPHALOSPORIN'
              ? { name: 'Cephalosporin Lab Analyst', id: 'EMP-004' }
              : labKey === 'PENICILLIN'
              ? { name: 'Penicillin Lab Analyst', id: 'EMP-005' }
              : { name: 'Zubair Raza', id: 'EMP-003' };

          const defaultProtocol =
            sec === 'semi-base'
              ? 'HPLC Potency Assay & Chromatographic Purity'
              : 'Uniformity of Dosage Units & Hardness Test';

          const cleanCode = sampleCode.replace(/[^a-zA-Z0-9-]/g, '');
          const taskCode = `TSK-${cleanCode}`;

          const alreadyExists = currentTasks.some(
            (t: any) =>
              (t.sampleId && t.sampleId.toUpperCase() === sampleCode.toUpperCase()) ||
              (t.taskCode && t.taskCode.toUpperCase() === taskCode.toUpperCase())
          );

          if (!alreadyExists) {
            const autoTask = {
              id: `tsk-smp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              taskCode: taskCode,
              sampleId: sampleCode,
              sampleName: sampleName,
              laboratory: labKey,
              section: sec,
              assignedAnalystName: defaultAnalyst.name,
              assignedAnalystId: defaultAnalyst.id,
              testProtocol: defaultProtocol,
              priority: newSample.priority || pendingConfirmationData?.priority || 'URGENT',
              shift: 'Morning Shift (08:00 - 16:00)',
              dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              assignedDate: new Date().toISOString().split('T')[0],
              status: 'ASSIGNED',
              instructions: `Auto-allocated task generated upon sample registration (${newSample.lotNumber || newSample.batchId || 'Lot verified'}).`,
            };
            const updated = [autoTask, ...currentTasks];
            localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
            window.dispatchEvent(new Event('lims-tasks-updated'));
          }
        }
      } catch (err) {
        console.error('Error auto-syncing sample to tasks in form:', err);
      }

      if (onSuccess) onSuccess(newSample);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save sample record to database.';
      setSubmitError(Array.isArray(msg) ? msg.join(', ') : msg);
      setIsConfirmModalOpen(false);
    },
  });

  // Step 1: Validation Handler - If valid, opens Confirmation Modal.
  const handleFormValid = (data: AddSampleFormValues) => {
    setSubmitError(null);
    setToastMessage(null);
    setPendingConfirmationData(data);
    setIsConfirmModalOpen(true); // Guaranteed: Confirmation modal NEVER opens if validation fails
  };

  // Step 2: Validation Failure Handler - Prevents submission, auto-scrolls and focuses the first invalid field, displays toast.
  const handleFormInvalid = (formErrors: any) => {
    setIsConfirmModalOpen(false);
    setPendingConfirmationData(null);

    // Show Global Incomplete Form Toast
    setToastMessage('Incomplete Form: Please fill in all required fields before confirming.');
    setTimeout(() => {
      setToastMessage((prev) =>
        prev === 'Incomplete Form: Please fill in all required fields before confirming.' ? null : prev
      );
    }, 5000);

    // Programmatically scroll and focus directly on the first invalid field
    scrollToFirstError(formErrors, `#${containerId}`);
  };

  // Step 3: Final Confirmation Committer - Submits payload after user confirms in dialog
  const handleFinalConfirm = () => {
    if (!pendingConfirmationData) return;

    const data = pendingConfirmationData;
    const finalStage = data.sampleType === 'Other' ? data.customStage?.trim() || 'Other' : data.sampleType;
    const sectionTag = selectedSection === 'semi-base' ? '[Semi Basics]' : '[Formulation]';
    const finalStageWithTag = `${sectionTag} ${finalStage}`;
    const finalUnit = data.unit === 'Other' ? data.customUnit?.trim() || 'units' : data.unit;

    const payload = {
      laboratory: data.laboratory,
      section: selectedSection,
      barcode: data.qcNumber,
      samplingDate: isLiveClock ? new Date().toISOString() : new Date(data.samplingDateTime).toISOString(),
      nomenclature: data.nomenclature.trim(),
      materialName: data.nomenclature.trim(),
      stageType: finalStageWithTag,
      sampleType: finalStageWithTag,
      sampleCode: undefined, // Auto-sequence generated by backend
      sampleQty: Number(data.sampleQty),
      unit: finalUnit.trim(),
      batchId: data.batchId || undefined,
      lotNumber: data.lotNumber.trim(),
      mfgDate: data.mfgDate,
      expDate: data.expDate,
      submittedBy: data.submittedBy.trim(),
      receivedBy: data.receivedBy.trim(),
      samplingLocation: data.samplingLocation ? data.samplingLocation.trim() : undefined,
      storageCondition: data.storageCondition ? data.storageCondition.trim() : undefined,
      priority: data.priority,
      remarks: [sectionTag, data.remarks?.trim()].filter(Boolean).join(' '),
    };

    createMutation.mutate(payload);
  };

  const watchedPriority = watch('priority') || 'ROUTINE';
  const watchedUnit = watch('unit');

  return (
    <div id={containerId} className="relative space-y-4 text-xs font-sans">
      {/* Global Incomplete Form Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-2xl shadow-2xl border border-red-500 animate-in slide-in-from-top-4 duration-200">
          <AlertCircle className="h-5 w-5 text-white shrink-0 animate-bounce" />
          <p className="text-xs font-bold">{toastMessage}</p>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-red-200 hover:text-white p-1 rounded-md transition-colors ml-2 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Backend Submission Error Banner */}
      {submitError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-sm text-red-950">Submission Error</h5>
            <p className="text-xs text-red-700 mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormValid, handleFormInvalid)} noValidate className="space-y-4">
        {/* Section 1: Target Laboratory & Lab Section */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Lab Section (General / Cephalosporin / Penicillin) */}
            <div id="laboratory-container">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="laboratory" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
                  <span>Lab Section <span className="text-red-500">*</span></span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">cGMP / 21 CFR Part 11</span>
              </div>
              <select
                id="laboratory"
                {...register('laboratory')}
                className={cn(
                  'w-full px-3 py-2 text-xs rounded-lg border outline-none bg-white font-semibold transition-all',
                  errors.laboratory
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                    : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 text-slate-800'
                )}
              >
                <option value="GENERAL">General QC Lab (Central Unit)</option>
                <option value="CEPHALOSPORIN">Cephalosporin Lab Section</option>
                <option value="PENICILLIN">Penicillin Lab Section</option>
              </select>
              {errors.laboratory && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.laboratory.message}</span>
                </p>
              )}
            </div>

            {/* Subsection Stage: Semi Basics vs Formulation */}
            <div id="section-container">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  <span>Subsection Stage <span className="text-red-500">*</span></span>
                </label>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                  {selectedSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="section-semi-base"
                  onClick={() => {
                    setSelectedSection('semi-base');
                    setValue('section', 'semi-base');
                    setValue('sampleType', SEMI_BASE_STAGES[0], { shouldValidate: true });
                  }}
                  className={cn(
                    'px-2.5 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer',
                    selectedSection === 'semi-base'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>1. Semi Basics</span>
                </button>
                <button
                  type="button"
                  id="section-formulation"
                  onClick={() => {
                    setSelectedSection('formulation');
                    setValue('section', 'formulation');
                    setValue('sampleType', FORMULATION_STAGES[0], { shouldValidate: true });
                  }}
                  className={cn(
                    'px-2.5 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer',
                    selectedSection === 'formulation'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>2. Formulation</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: QC Number / Sample Code & Sampling Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* QC Number / Sample ID */}
          <div id="qcNumber-container">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-navy-900" />
                <span>QC Number / Sample Code <span className="text-red-500">*</span></span>
              </label>
              {nextIdData?.accessionNo && (
                <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                  Accession: {nextIdData.accessionNo}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                id="qcNumber"
                {...register('qcNumber')}
                placeholder="e.g. GL/SB-10"
                className={cn(
                  'w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border outline-none transition-all',
                  errors.qcNumber
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                    : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 bg-white text-slate-900'
                )}
              />
            </div>
            {errors.qcNumber && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.qcNumber.message}</span>
              </p>
            )}
          </div>

          {/* Sampling Date & Time */}
          <div id="samplingDateTime-container">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-navy-900" />
                <span>Sampling Date & Time <span className="text-red-500">*</span></span>
              </label>
              <div className="flex items-center gap-1.5">
                {isLiveClock ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    LIVE CLOCK
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveClock(true);
                      const now = new Date();
                      setLiveDate(now);
                      setValue('samplingDateTime', getLocalISOString(now), { shouldValidate: true });
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Sync Live</span>
                  </button>
                )}
              </div>
            </div>
            <input
              type="datetime-local"
              step="1"
              id="samplingDateTime"
              {...register('samplingDateTime')}
              onChange={(e) => {
                setIsLiveClock(false);
                setValue('samplingDateTime', e.target.value, { shouldValidate: true });
              }}
              className={cn(
                'w-full px-3 py-2 text-xs font-mono rounded-lg border outline-none bg-white transition-all',
                errors.samplingDateTime
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 text-slate-800'
              )}
            />
            {errors.samplingDateTime && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.samplingDateTime.message}</span>
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Material Name / Code */}
        <div id="nomenclature-container">
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-navy-900" />
            <span>Material Name / Drug Substance <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            id="nomenclature"
            {...register('nomenclature')}
            placeholder="e.g. Paracetamol API / Cefixime Trihydrate USP"
            className={cn(
              'w-full px-3 py-2 text-xs rounded-lg border outline-none font-medium transition-all',
              errors.nomenclature
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 bg-white text-slate-900'
            )}
          />
          {errors.nomenclature && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{errors.nomenclature.message}</span>
            </p>
          )}
        </div>

        {/* Section 4: Stage / Type, Batch / Lot No., Quantity & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Stage / Type */}
          <div id="sampleType-container">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Stage / Sample Type <span className="text-red-500">*</span>
            </label>
            <select
              id="sampleType"
              {...register('sampleType')}
              className={cn(
                'w-full px-2.5 py-2 text-xs rounded-lg border outline-none bg-white font-medium text-slate-800 transition-all',
                errors.sampleType
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900'
              )}
            >
              {(selectedSection === 'semi-base' ? SEMI_BASE_STAGES : FORMULATION_STAGES).map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
            {errors.sampleType && (
              <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.sampleType.message}</p>
            )}

            {watchedSampleType === 'Other' && (
              <div className="mt-2" id="customStage-container">
                <input
                  type="text"
                  id="customStage"
                  {...register('customStage')}
                  placeholder="Specify custom stage..."
                  className={cn(
                    'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium text-slate-900',
                    errors.customStage
                      ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                      : 'border-blue-400 bg-blue-50/40 focus:border-blue-600'
                  )}
                />
                {errors.customStage && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.customStage.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Batch / Lot No. */}
          <div id="lotNumber-container">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Batch No. / Lot No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lotNumber"
              {...register('lotNumber')}
              placeholder="e.g. CP-PCM-204"
              className={cn(
                'w-full px-2.5 py-2 text-xs font-mono rounded-lg border outline-none transition-all',
                errors.lotNumber
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 bg-white text-slate-800'
              )}
            />
            {errors.lotNumber && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.lotNumber.message}</span>
              </p>
            )}
          </div>

          {/* Received Quantity */}
          <div id="sampleQty-container">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Scale className="h-3 w-3 text-slate-600" />
              <span>Received Quantity <span className="text-red-500">*</span></span>
            </label>
            <input
              type="number"
              id="sampleQty"
              step="any"
              min="0.01"
              {...register('sampleQty')}
              className={cn(
                'w-full px-2.5 py-2 text-xs font-mono rounded-lg border outline-none transition-all',
                errors.sampleQty
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 bg-white text-slate-800'
              )}
            />
            {errors.sampleQty && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.sampleQty.message}</span>
              </p>
            )}
          </div>

          {/* Unit of Measurement (UoM) */}
          <div id="unit-container">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Unit of Measurement (UoM) <span className="text-red-500">*</span>
            </label>
            <select
              id="unit"
              {...register('unit')}
              className={cn(
                'w-full px-2.5 py-2 text-xs rounded-lg border outline-none bg-white font-medium text-slate-800 transition-all',
                errors.unit
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900'
              )}
            >
              <option value="tablets">Tablets</option>
              <option value="capsules">Capsules</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="g">Grams (g)</option>
              <option value="L">Liters (L)</option>
              <option value="mL">Milliliters (mL)</option>
              <option value="vials">Vials</option>
              <option value="ampoules">Ampoules</option>
              <option value="strips">Strips</option>
              <option value="Other">Other</option>
            </select>
            {errors.unit && <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.unit.message}</p>}

            {watchedUnit === 'Other' && (
              <div className="mt-2" id="customUnit-container">
                <input
                  type="text"
                  id="customUnit"
                  {...register('customUnit')}
                  placeholder="Specify custom unit..."
                  className={cn(
                    'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium text-slate-900',
                    errors.customUnit
                      ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                      : 'border-blue-400 bg-blue-50/40 focus:border-blue-600'
                  )}
                />
                {errors.customUnit && (
                  <p className="text-[10px] text-red-600 mt-0.5">{errors.customUnit.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Manufacturing Date & Expiry Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          {/* Manufacturing Date */}
          <div id="mfgDate-container">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-navy-900" />
              <span>Manufacturing Date (MFG Date) <span className="text-red-500">*</span></span>
            </label>
            <input
              type="date"
              id="mfgDate"
              {...register('mfgDate')}
              className={cn(
                'w-full px-3 py-2 text-xs rounded-lg border outline-none bg-white transition-all',
                errors.mfgDate
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 text-slate-800'
              )}
            />
            {errors.mfgDate && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.mfgDate.message}</span>
              </p>
            )}
          </div>

          {/* Expiry Date */}
          <div id="expDate-container">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-navy-900" />
              <span>Expiry Date (EXP Date) <span className="text-red-500">*</span></span>
            </label>
            <input
              type="date"
              id="expDate"
              {...register('expDate')}
              className={cn(
                'w-full px-3 py-2 text-xs rounded-lg border outline-none bg-white transition-all',
                errors.expDate
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 text-slate-800'
              )}
            />
            {errors.expDate && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.expDate.message}</span>
              </p>
            )}
          </div>
        </div>



        {/* Section 7: Personnel (Submitted By & Received By) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div id="submittedBy-container">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-navy-900" />
              <span>Submitted By <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              id="submittedBy"
              {...register('submittedBy')}
              placeholder="e.g. Muhammad Aslam (Production Lead)"
              className={cn(
                'w-full px-3 py-2 text-xs rounded-lg border outline-none transition-all',
                errors.submittedBy
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 bg-white text-slate-800'
              )}
            />
            {errors.submittedBy && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.submittedBy.message}</span>
              </p>
            )}
          </div>

          <div id="receivedBy-container">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
              <span>Received By (QC Intake Officer) <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              id="receivedBy"
              {...register('receivedBy')}
              placeholder="e.g. Tariq Mehmood (QC Intake Officer)"
              className={cn(
                'w-full px-3 py-2 text-xs rounded-lg border outline-none transition-all',
                errors.receivedBy
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                  : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 bg-white text-slate-800'
              )}
            />
            {errors.receivedBy && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{errors.receivedBy.message}</span>
              </p>
            )}
          </div>
        </div>

        {/* Section 8: Priority Selection */}
        <div id="priority-container">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-slate-600" />
              <span>Testing Priority <span className="text-red-500">*</span></span>
            </label>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold font-mono border',
                watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              )}
            >
              {watchedPriority === 'URGENT' || watchedPriority === 'STAT' ? '1 Hr - 2 Days' : '5 - 15 Days'}
            </span>
          </div>
          <select
            id="priority"
            {...register('priority')}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
          >
            <option value="ROUTINE">Routine (Standard 5 - 15 Days)</option>
            <option value="URGENT">Urgent (Expedited 1 Hr - 2 Days)</option>
            <option value="STABILITY">Stability Protocol (Scheduled Interval)</option>
          </select>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || createMutation.isPending}
              className="text-xs border-slate-300 text-slate-700"
            >
              Cancel
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || createMutation.isPending}
              className="bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-xs px-4 py-2 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-400 mr-1.5" />
              <span>Review & Confirm Details</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal Protection: Opens ONLY when all client-side validations pass with 100% valid state */}
      {isConfirmModalOpen && pendingConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setIsConfirmModalOpen(false)} />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-navy-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Confirm Sample Registration Details</h3>
                  <p className="text-[11px] text-slate-300">21 CFR Part 11 Electronic cGMP Record Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Verified Details Summary */}
            <div className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">QC Number / Sample ID:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{pendingConfirmationData.qcNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Material Name:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[220px] truncate">{pendingConfirmationData.nomenclature}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Batch / Lot Number:</span>
                  <span className="font-mono font-bold text-slate-900">{pendingConfirmationData.lotNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Stage / Lab Section:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedSection === 'semi-base' ? 'Semi Basics' : 'Formulation'} • {pendingConfirmationData.sampleType}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Received Quantity & UoM:</span>
                  <span className="font-bold text-slate-900">{pendingConfirmationData.sampleQty} {pendingConfirmationData.unit}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Manufacturing & Expiry:</span>
                  <span className="font-mono text-slate-900">MFG: {pendingConfirmationData.mfgDate} | EXP: {pendingConfirmationData.expDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Priority SLA:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {pendingConfirmationData.priority} (1 Hr - 2 Days)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation Action Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={createMutation.isPending}
                className="text-xs"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleFinalConfirm}
                disabled={createMutation.isPending}
                className="bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {createMutation.isPending ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Committing to Database...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Confirm & Accession Sample</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddSampleForm;
