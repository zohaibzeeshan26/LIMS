'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { useDebounce } from '@/hooks/useDebounce';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { SAMPLE_STAGES, SEMI_BASE_STAGES, FORMULATION_STAGES, LabSection, getUserLabAccess, Sample } from '@/types/lims';
import { format } from 'date-fns';
import { formatDateTime } from '@/lib/date';
import QRCode from 'qrcode';
import { QrScannerModal, ScannedSampleData } from '@/components/samples/QrScannerModal';
import { SampleQrLabelModal } from '@/components/samples/SampleQrLabelModal';
import { SampleRoutingChitModal, SampleRoutingChitData } from '@/components/samples/SampleRoutingChitModal';
import {
  ArrowLeft,
  FlaskConical,
  Microscope,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  Tag,
  User,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  FileText,
  Building,
  Lock,
  Camera,
  ScanLine,
  Printer,
  Download,
  QrCode,
  PackageCheck,
  MapPin,
} from 'lucide-react';
import { scrollToFirstError } from '@/hooks/useFormErrorFocus';

// Strict Zod Validation Schema enforcing cGMP / 21 CFR Part 11 requirements
export const sampleFormSchema = z
  .object({
    laboratory: z.string().trim().min(1, 'Target Laboratory is required'),
    samplingDateTime: z.string().trim().min(1, 'Sampling Date & Time is required'),
    nomenclature: z
      .string({ required_error: 'Material Name / Code is required' })
      .trim()
      .min(1, 'Material Name / Code is required and cannot be empty')
      .max(255, 'Nomenclature cannot exceed 255 characters'),
    idGenerationPolicy: z.enum(['AUTO', 'MANUAL']).default('AUTO').optional(),
    customSampleId: z.string().optional(),
    sampleType: z.string().trim().min(1, 'Stage / Sample Type is required'),
    customStage: z.string().optional(),
    sampleQty: z.coerce
      .number({ invalid_type_error: 'Received Quantity must be a valid number' })
      .positive('Received Quantity must be greater than 0'),
    unit: z.string().trim().min(1, 'Unit of measurement (UoM) is required'),
    customUnit: z.string().optional(),
    batchId: z.string().optional(),
    lotNumber: z
      .string({ required_error: 'Batch / Lot Number is required' })
      .trim()
      .min(1, 'Batch / Lot Number is required and cannot be empty'),
    mfgDate: z
      .string({ required_error: 'Manufacturing Date is required' })
      .trim()
      .min(1, 'Manufacturing Date is required and cannot be empty'),
    expDate: z
      .string({ required_error: 'Expiry Date is required' })
      .trim()
      .min(1, 'Expiry Date is required and cannot be empty'),
    submittedBy: z.string().trim().min(1, 'Submitted By name is required'),
    receivedBy: z.string().trim().min(1, 'Received By name is required'),
    samplingLocation: z.string().optional(),
    storageCondition: z.string().optional(),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT', 'STABILITY']),
    testSpecificationIds: z.array(z.string()).optional(),
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
          message: 'Please specify custom unit when "Other" is selected',
          path: ['customUnit'],
        });
      }
    }
  });

type SampleFormValues = z.infer<typeof sampleFormSchema>;

interface NewSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLaboratory?: string;
  defaultSection?: LabSection;
  onSampleCreated?: (createdSample: any) => void;
  onProceedToSubmit?: (createdSample: any) => void;
}

export function NewSampleModal({
  isOpen,
  onClose,
  defaultLaboratory = 'GENERAL',
  defaultSection = 'semi-base',
  onSampleCreated,
  onProceedToSubmit,
}: NewSampleModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userAccess = getUserLabAccess(user);
  const isRestrictedToLab = userAccess !== 'ALL';

  // Helper to reliably detect the active opened laboratory from props, URL (?lab=...), or user restriction
  const detectOpenedLab = React.useCallback(() => {
    if (isRestrictedToLab) return userAccess;
    if (defaultLaboratory && defaultLaboratory !== 'ALL') {
      const defUpper = defaultLaboratory.toUpperCase();
      if (defUpper === 'GENERAL' || defUpper === 'PENICILLIN' || defUpper === 'CEPHALOSPORIN') {
        return defUpper;
      }
    }
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('lab')?.toLowerCase();
      if (p === 'penicillin' || p === 'pen' || p === 'pl') return 'PENICILLIN';
      if (p === 'cephalosporin' || p === 'ceph' || p === 'cp' || p === 'saf' || p === 'sef') return 'CEPHALOSPORIN';
      if (p === 'general' || p === 'gen' || p === 'gl') return 'GENERAL';
    }
    return (defaultLaboratory || 'GENERAL').toUpperCase();
  }, [defaultLaboratory, isRestrictedToLab, userAccess]);

  const effectiveLab = detectOpenedLab();

  // Selected laboratory state (explicitly controls target laboratory)
  const [selectedLab, setSelectedLab] = useState<string>(effectiveLab);

  // Active lab section: Semi Base vs Formulation
  const [selectedSection, setSelectedSection] = useState<LabSection>(defaultSection);

  // Post-Creation Sample Routing Chit Modal state (end of sample addition)
  const [createdSampleForChit, setCreatedSampleForChit] = useState<any | null>(null);
  const [isCreatedChitOpen, setIsCreatedChitOpen] = useState(false);

  // Confirmation modal state for unsaved changes
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Success / Failure notification banner states
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    sampleCode: string;
    accessionNo?: string;
    nomenclature: string;
    laboratory: string;
  } | null>(null);

  // Confirmation Review Modal state (Protected: Opens ONLY when all client validations pass 100%)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingConfirmationData, setPendingConfirmationData] = useState<SampleFormValues | null>(null);

  // Real-time duplicate ID check states
  const [idCheckStatus, setIdCheckStatus] = useState<
    'idle' | 'checking' | 'available' | 'duplicate'
  >('idle');
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

  // Fetch batches for selection
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get<any[]>('/batches'),
    enabled: isOpen,
  });

  // Fetch active users for Received By selection
  const { data: usersList } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<any[]>('/users'),
    enabled: isOpen,
  });

  // Live real-time clock state for sampling intake
  const [liveDate, setLiveDate] = useState<Date>(new Date());
  const [isLiveClock, setIsLiveClock] = useState<boolean>(true);

  // Helper to format local ISO string (YYYY-MM-DDTHH:mm:ss)
  const getLocalISOString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 19);
  };

  const defaultValues: SampleFormValues = {
    laboratory: effectiveLab,
    samplingDateTime: getLocalISOString(),
    nomenclature: '',
    idGenerationPolicy: 'AUTO',
    customSampleId: '',
    sampleType: defaultSection === 'semi-base' ? SEMI_BASE_STAGES[0] : FORMULATION_STAGES[0],
    customStage: '',
    sampleQty: 100,
    unit: 'tablets',
    customUnit: '',
    batchId: '',
    lotNumber: '',
    mfgDate: '',
    expDate: '',
    submittedBy: user?.fullName ? `${user.fullName} (${user.department || 'Production'})` : 'Production Line Lead',
    receivedBy: user?.fullName ? `${user.fullName} (QC Intake Officer)` : 'QC Accession Desk',
    samplingLocation: '',
    storageCondition: '',
    priority: 'ROUTINE',
    testSpecificationIds: [],
    remarks: '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SampleFormValues>({
    resolver: zodResolver(sampleFormSchema),
    defaultValues,
  });

  // Live ticking interval (updates every 1000ms while modal is open & live mode is on)
  useEffect(() => {
    if (!isOpen || !isLiveClock) return;
    const updateTime = () => {
      const now = new Date();
      setLiveDate(now);
      setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: false });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isLiveClock, setValue]);

  // Update defaults when modal opens or laboratory switches
  useEffect(() => {
    if (isOpen) {
      setIsLiveClock(true);
      const now = new Date();
      setLiveDate(now);
      const targetSec = defaultSection === 'formulation' ? 'formulation' : 'semi-base';
      setSelectedSection(targetSec);
      const targetLab = detectOpenedLab();
      setSelectedLab(targetLab);
      setValue('laboratory', targetLab, { shouldValidate: true, shouldDirty: true });
      setValue('sampleType', targetSec === 'semi-base' ? SEMI_BASE_STAGES[0] : FORMULATION_STAGES[0], { shouldValidate: true });
      setValue('samplingDateTime', getLocalISOString(now));
      if (user?.fullName) {
        setValue('submittedBy', `${user.fullName} (${user.department || 'Production'})`);
        setValue('receivedBy', `${user.fullName} (QC Intake Officer)`);
      }
      setSubmitError(null);
      setSuccessInfo(null);
      setShowDiscardConfirm(false);
      setIdCheckStatus('idle');
      setDuplicateMessage(null);
    }
  }, [isOpen, defaultLaboratory, defaultSection, user, setValue, isRestrictedToLab, userAccess]);

  const watchedLab = watch('laboratory');
  const watchedPolicy = watch('idGenerationPolicy');
  const watchedCustomId = watch('customSampleId');
  const watchedSampleType = watch('sampleType');
  const watchedUnit = watch('unit');
  const watchedPriority = watch('priority') || 'ROUTINE';
  const watchedBatchId = watch('batchId');
  const debouncedManualId = useDebounce(watchedCustomId, 400);

  // Fetch next sequential Sample ID preview based on active lab & section
  const { data: nextIdData } = useQuery({
    queryKey: ['next-sample-id', selectedLab, selectedSection, watchedSampleType],
    queryFn: () =>
      samplingService.getNextSampleId({
        laboratory: selectedLab,
        section: selectedSection,
        stageType: watchedSampleType,
      }),
    enabled: isOpen,
    staleTime: 2000,
  });

  const nextAutoSampleCode = useMemo(() => {
    if (nextIdData?.sampleCode) return nextIdData.sampleCode;
    const currentLab = selectedLab || watchedLab || 'GENERAL';
    const prefix = currentLab === 'PENICILLIN' ? 'PEN' : currentLab === 'CEPHALOSPORIN' ? 'CEPH' : 'GL';
    const sec = selectedSection === 'formulation' ? 'F' : 'SB';
    return `${prefix}/${sec}-1`;
  }, [nextIdData, selectedLab, watchedLab, selectedSection]);

  // QR Code & Barcode Integration States
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrLabelModalOpen, setIsQrLabelModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const activeSampleCode = nextAutoSampleCode;
  const watchedNomenclature = watch('nomenclature');
  const watchedLotNumber = watch('lotNumber');
  const watchedMfgDate = watch('mfgDate');
  const watchedExpDate = watch('expDate');

  // Real-time dynamic QR code generation
  useEffect(() => {
    let isMounted = true;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const mfgStr = watchedMfgDate ? formatDateTime(watchedMfgDate, 'dd/MM/yyyy') : 'N/A';
    const expStr = watchedExpDate ? formatDateTime(watchedExpDate, 'dd/MM/yyyy') : 'N/A';
    const currentLab = selectedLab || watchedLab || 'GENERAL';
    const facilityName =
      currentLab === 'PENICILLIN'
        ? 'Penicillin Laboratory'
        : currentLab === 'CEPHALOSPORIN'
        ? 'Cephalosporin Laboratory'
        : 'General Laboratory';
    const payload = `==============================
CITI PHARMA • LIMS
SAMPLE SLIP
==============================
Sample ID: ${activeSampleCode}
Product: ${watchedNomenclature || 'Pharmaceutical Sample'}
Section: ${selectedSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
Batch / Lot: ${watchedLotNumber || 'N/A'}
Mfg Date: ${mfgStr}
Exp Date: ${expStr}
Facility: ${facilityName}
==============================
View Details: ${origin}/samples?sampleId=${encodeURIComponent(activeSampleCode)}`;

    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR Gen error:', err));

    return () => {
      isMounted = false;
    };
  }, [activeSampleCode, watchedNomenclature, watchedLotNumber, watchedMfgDate, watchedExpDate, watchedLab, selectedSection, scannedBarcode, liveDate]);

  // Handle scanned QR code / Barcode data to autofill form
  const handleScanResult = (data: ScannedSampleData) => {
    if (data.nomenclature) {
      setValue('nomenclature', data.nomenclature, { shouldValidate: true, shouldDirty: true });
    }
    if (data.lotNumber) {
      setValue('lotNumber', data.lotNumber, { shouldValidate: true, shouldDirty: true });
    }
    if (data.sampleQty) {
      setValue('sampleQty', data.sampleQty, { shouldValidate: true, shouldDirty: true });
    }
    if (data.unit) {
      setValue('unit', data.unit, { shouldValidate: true, shouldDirty: true });
    }
    if (data.mfgDate) {
      setValue('mfgDate', data.mfgDate.slice(0, 10), { shouldValidate: true, shouldDirty: true });
    }
    if (data.expDate) {
      setValue('expDate', data.expDate.slice(0, 10), { shouldValidate: true, shouldDirty: true });
    }
    if (data.sampleCode && !data.barcode) {
      setScannedBarcode(data.sampleCode);
    }
    if (data.stageType) {
      setValue('sampleType', data.stageType, { shouldValidate: true, shouldDirty: true });
    }
    if (data.barcode) {
      setScannedBarcode(data.barcode);
    }
  };

  // When a batch is selected from the dropdown, autofill Lot No., MFG Date, EXP Date
  useEffect(() => {
    if (watchedBatchId && batches) {
      const selectedBatch = batches.find((b) => b.id === watchedBatchId);
      if (selectedBatch) {
        setValue('lotNumber', selectedBatch.batchNumber || '');
        if (selectedBatch.manufacturingDate) {
          setValue('mfgDate', selectedBatch.manufacturingDate.substring(0, 10));
        }
        if (selectedBatch.expiryDate) {
          setValue('expDate', selectedBatch.expiryDate.substring(0, 10));
        }
        if (selectedBatch.drugProduct) {
          setValue('nomenclature', selectedBatch.drugProduct);
        }
      }
    }
  }, [watchedBatchId, batches, setValue]);

  // Real-time duplicate ID check when user types custom manual sample ID
  useEffect(() => {
    if (watchedPolicy === 'MANUAL' && debouncedManualId && debouncedManualId.trim().length >= 3) {
      setIdCheckStatus('checking');
      setDuplicateMessage(null);

      samplingService
        .checkSampleId(debouncedManualId.trim())
        .then((res) => {
          if (res.isAvailable) {
            setIdCheckStatus('available');
            setDuplicateMessage(null);
          } else {
            setIdCheckStatus('duplicate');
            setDuplicateMessage(
              `Sample ID '${debouncedManualId.trim()}' is already registered (Accession No: ${res.existingSample?.accessionNo || 'Existing'}).`
            );
          }
        })
        .catch(() => {
          setIdCheckStatus('idle');
        });
    } else {
      setIdCheckStatus('idle');
      setDuplicateMessage(null);
    }
  }, [watchedPolicy, debouncedManualId]);

  // Mutation to persist sample to PostgreSQL through NestJS backend API
  const createMutation = useMutation({
    mutationFn: (payload: any) => samplingService.create(payload),
    onSuccess: (newSample: any) => {
      queryClient.invalidateQueries({ queryKey: ['samples-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['samples-for-task-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });
      setIsConfirmModalOpen(false);
      setPendingConfirmationData(null);

      // Automatically sync newly registered sample into Task Assignment Registry for that lab
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('city_pharma_lims_tasks');
          const currentTasks = stored ? JSON.parse(stored) : [];

          const labRaw = (
            newSample.laboratory ||
            newSample.laboratoryType ||
            selectedLab ||
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
        console.error('Error auto-syncing sample to tasks:', err);
      }

      setSuccessInfo({
        sampleCode: newSample.sampleCode,
        accessionNo: newSample.accessionNo,
        nomenclature: newSample.nomenclature || newSample.materialName,
        laboratory:
          typeof newSample.laboratory === 'string'
            ? newSample.laboratory
            : (newSample.laboratory as any)?.name || (newSample.laboratory as any)?.code || newSample.laboratoryType || selectedLab,
      });

      if (onSampleCreated) {
        onSampleCreated(newSample);
      }

      // Automatically launch the generated QR Code and official container chit modal at end of sample addition
      const sampleForChit: Sample = {
        ...newSample,
        mfgDate: newSample.mfgDate || (newSample as any).manufacturingDate || watch('mfgDate') || null,
        expDate: newSample.expDate || (newSample as any).expiryDate || watch('expDate') || null,
      };
      setCreatedSampleForChit(sampleForChit);
      setIsCreatedChitOpen(true);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save sampling record to PostgreSQL database.';
      setSubmitError(Array.isArray(msg) ? msg.join(', ') : msg);
      setIsConfirmModalOpen(false);
    },
  });

  // Step 1: Validation Handler - If valid, opens Confirmation Review Modal.
  const handleFormValid = (data: SampleFormValues) => {
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
    scrollToFirstError(formErrors, '#new-sample-form-modal');
  };

  // Step 3: Final Confirmation Committer - Submits payload after user confirms in dialog
  const handleFinalConfirm = () => {
    if (!pendingConfirmationData) return;

    const data = pendingConfirmationData;
    const finalStage =
      data.sampleType === 'Other'
        ? (data.customStage?.trim() || 'Other')
        : data.sampleType;

    const sectionTag = selectedSection === 'semi-base' ? '[Semi Basics]' : '[Formulation]';
    const finalStageWithTag = `${sectionTag} ${finalStage}`;

    const finalUnit =
      data.unit === 'Other'
        ? (data.customUnit?.trim() || 'units')
        : data.unit;

    const labToSend = selectedLab || data.laboratory || watchedLab || defaultLaboratory || 'GENERAL';
    const payload: any = {
      laboratory: labToSend,
      section: selectedSection,
      barcode: scannedBarcode || undefined,
      samplingDate: isLiveClock
        ? new Date().toISOString()
        : new Date(data.samplingDateTime).toISOString(),
      nomenclature: data.nomenclature.trim(),
      materialName: data.nomenclature.trim(),
      stageType: finalStageWithTag,
      sampleType: finalStageWithTag,
      sampleCode: undefined, // Backend will auto-generate sequential ID
      sampleQty: Number(data.sampleQty),
      unit: finalUnit.trim(),
      batchId: data.batchId || undefined,
      lotNumber: data.lotNumber.trim(),
      mfgDate: data.mfgDate.trim(),
      expDate: data.expDate.trim(),
      submittedBy: data.submittedBy.trim(),
      receivedBy: data.receivedBy.trim(),
      samplingLocation: data.samplingLocation ? data.samplingLocation.trim() : undefined,
      storageCondition: data.storageCondition ? data.storageCondition.trim() : undefined,
      priority: data.priority,
      testSpecificationIds: data.testSpecificationIds || [],
      remarks: [sectionTag, data.remarks?.trim()].filter(Boolean).join(' '),
    };

    createMutation.mutate(payload);
  };

  // Safe Close Request: check for unsaved dirty changes
  const handleRequestClose = () => {
    if (isDirty && !successInfo) {
      setShowDiscardConfirm(true);
    } else {
      reset(defaultValues);
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    reset(defaultValues);
    onClose();
  };


  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
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

      {/* Full-Screen Add Sample View: Eliminates sidebar completely, shows Citi Pharma + LIMS and working Back button */}
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-y-auto font-sans animate-in fade-in duration-200">
        {/* Top Header Bar per user mandate: Back button + Citi Pharma logo & LIMS branding */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 shrink-0">
          {/* Left: Working Back Button */}
          <button
            type="button"
            onClick={handleRequestClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Back to Samples"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
            <span>Back</span>
          </button>

          {/* Center: Citi Pharma Logo + LIMS Branding */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0B1A30] p-1 flex items-center justify-center border border-slate-200 shadow-xs">
              <img
                src="/city-pharma-logo.png"
                alt="Citi Pharma Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-tight text-lg leading-none">Citi Pharma</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0066FF] text-white shadow-2xs">
                LIMS
              </span>
            </div>
          </div>

          {/* Right Spacer for balance */}
          <div className="w-20 hidden sm:block" />
        </header>

        {/* Centered Form Body Container */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
            <div className="pb-4 mb-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create Sampling Record</h2>
                <p className="text-xs text-slate-500 mt-1">21 CFR Part 11 compliant pharmaceutical sample intake and registration form.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {selectedLab === 'PENICILLIN' ? 'Penicillin Lab' : selectedLab === 'CEPHALOSPORIN' ? 'Cephalosporin Lab' : 'General Lab'}
              </span>
            </div>

            <form
              id="new-sample-form-modal"
              onSubmit={handleSubmit(handleFormValid, handleFormInvalid)}
              noValidate
              className="space-y-4 text-xs font-sans"
            >
          {/* Explicit hidden input ensuring laboratory is registered in form */}
          <input type="hidden" {...register('laboratory')} value={selectedLab} />
          {/* Success Banner */}
          {successInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm text-emerald-950">
                  Sample Record Created Successfully!
                </h5>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Accession No. <strong>{successInfo.accessionNo || 'Generated'}</strong> • Sample ID{' '}
                  <strong className="font-mono">{successInfo.sampleCode}</strong> has been saved to
                  PostgreSQL in {typeof successInfo.laboratory === 'string' ? successInfo.laboratory : (successInfo.laboratory as any)?.name || 'General'} Lab.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setIsQrLabelModalOpen(true)}
                    className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Sample QR Label</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Failure / Error Banner */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm text-rose-950">Submission Failed</h5>
                <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          {scannedBarcode && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Scanned Barcode Linked: <strong className="font-mono">{scannedBarcode}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setScannedBarcode(null)}
                className="text-emerald-700 hover:text-emerald-900 text-[11px] underline ml-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Section 1: Target Laboratory (Strictly isolated to opened lab only) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">Target Laboratory:</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5 text-center',
                  selectedLab === 'PENICILLIN'
                    ? 'bg-amber-600 text-white'
                    : selectedLab === 'CEPHALOSPORIN'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#0066FF] text-white'
                )}
              >
                {selectedLab === 'PENICILLIN'
                  ? 'Penicillin Lab'
                  : selectedLab === 'CEPHALOSPORIN'
                  ? 'Cephalosporin Lab'
                  : 'General Lab'}
              </span>
            </div>
          </div>

          {/* Section 2: Core Identifiers & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date & Time (Defaults to live current time with real-time second updates) */}
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
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 -ml-2.5" />
                      LIVE CLOCK
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveClock(true);
                        const now = new Date();
                        setLiveDate(now);
                        setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: true, shouldValidate: true });
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>Sync Live</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="datetime-local"
                  step="1"
                  id="samplingDateTime"
                  {...register('samplingDateTime')}
                  onChange={(e) => {
                    setIsLiveClock(false);
                    setValue('samplingDateTime', e.target.value, { shouldValidate: true, shouldDirty: true });
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-xs font-mono rounded-lg border outline-none bg-white transition-all',
                    errors.samplingDateTime
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 bg-red-50/20 text-slate-900'
                      : isLiveClock
                      ? 'border-emerald-300 ring-2 ring-emerald-500/10 text-emerald-950 font-semibold bg-emerald-50/20'
                      : 'border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 text-slate-800'
                  )}
                />
              </div>

              {!isLiveClock && (
                <div className="flex items-center justify-end mt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveClock(true);
                      const now = new Date();
                      setLiveDate(now);
                      setValue('samplingDateTime', getLocalISOString(now), { shouldDirty: true, shouldValidate: true });
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Switch to Live
                  </button>
                </div>
              )}

              {errors.samplingDateTime && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.samplingDateTime.message}</span>
                </p>
              )}
            </div>

            {/* Sample ID & Accession No. (Auto-Generated) */}
            <div id="sampleId-container">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>Sample ID & A. No. <span className="text-red-500">*</span></span>
                </label>
                {nextIdData?.accessionNo && (
                  <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    A. No: {nextIdData.accessionNo}
                  </span>
                )}
              </div>

              <div className="px-3 py-2 text-xs font-mono rounded-lg border border-blue-200 bg-blue-50/70 text-blue-950 flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-blue-900 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{nextAutoSampleCode}</span>
                  {nextIdData?.accessionNo && (
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      ({nextIdData.accessionNo})
                    </span>
                  )}
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-sans font-semibold border border-blue-200">
                  Auto Sequence
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Nomenclature (Required Text Field) */}
          <div id="nomenclature-container">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Material Name / Drug Substance <span className="text-red-500">*</span>
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

          {/* Section 4: Lab Subsection (Semi Basics vs Formulation), Stage / Category, Batch / Lot No., Quantity & Units */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Laboratory Section</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md border border-blue-200/60">
                {selectedSection === 'semi-base' ? 'Semi Basics Active' : 'Formulation Active'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSection('semi-base');
                  setValue('sampleType', SEMI_BASE_STAGES[0], { shouldValidate: true });
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer',
                  selectedSection === 'semi-base'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>1. Semi Basics (In-Process / Bulk)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSection('formulation');
                  setValue('sampleType', FORMULATION_STAGES[0], { shouldValidate: true });
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer',
                  selectedSection === 'formulation'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>2. Formulation (Finished Product)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Stage / Type */}
            <div id="sampleType-container">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {selectedSection === 'semi-base' ? 'Semi Basics Category' : 'Formulation Category'}{' '}
                <span className="text-red-500">*</span>
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
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  {errors.sampleType.message}
                </p>
              )}

              {/* When "Other" is selected, render manual text input */}
              {watchedSampleType === 'Other' && (
                <div className="mt-2 animate-in fade-in duration-150" id="customStage-container">
                  <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                    Specify Custom Stage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customStage"
                    {...register('customStage')}
                    placeholder="Enter manual stage..."
                    className={cn(
                      'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium text-slate-900',
                      errors.customStage
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-blue-400 bg-blue-50/40 focus:border-blue-600'
                    )}
                  />
                  {errors.customStage && (
                    <p className="text-[10px] text-red-600 mt-0.5">
                      {errors.customStage.message}
                    </p>
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

            {/* Qty. of Sample */}
            <div id="sampleQty-container">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Qty. of Sample <span className="text-red-500">*</span>
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

            {/* Quantity Unit */}
            <div id="unit-container">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Quantity Unit <span className="text-red-500">*</span>
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
              {errors.unit && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  {errors.unit.message}
                </p>
              )}

              {/* When "Other" is selected, render manual text input */}
              {watchedUnit === 'Other' && (
                <div className="mt-2 animate-in fade-in duration-150" id="customUnit-container">
                  <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                    Specify Custom Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customUnit"
                    {...register('customUnit')}
                    placeholder="Enter manual unit (e.g. strips, vials, mL...)"
                    className={cn(
                      'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium text-slate-900',
                      errors.customUnit
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-blue-400 bg-blue-50/40 focus:border-blue-600'
                    )}
                  />
                  {errors.customUnit && (
                    <p className="text-[10px] text-red-600 mt-0.5">
                      {errors.customUnit.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Dates with Validation (Never accept expiry earlier than manufacturing) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
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
                <span>Received By <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                id="receivedBy"
                {...register('receivedBy')}
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

          {/* Section 8: Testing Priority */}
          <div id="priority-container">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800">
                Priority <span className="text-red-500">*</span>
              </label>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold font-mono border',
                  watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                )}
              >
                {watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                  ? '1 Hr - 2 Days'
                  : '5 - 15 Days'}
              </span>
            </div>
            <select
              id="priority"
              {...register('priority')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
            >
              <option value="ROUTINE">Routine (5 - 15 Days)</option>
              <option value="URGENT">Urgent (1 Hr - 2 Days)</option>
            </select>
          </div>

          {/* Priority SLA Turnaround Notice (Directly Above Submit Button) */}
          <div
            className={cn(
              'p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all',
              watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
                : 'bg-blue-50/80 border-blue-200 text-blue-950'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold',
                  watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white'
                )}
              >
                {watchedPriority === 'URGENT' || watchedPriority === 'STAT' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900">
                    {watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                      ? 'Urgent Fast-Track Testing Target (1 Hr - 2 Days)'
                      : 'Standard Routine Testing Target (5 - 15 Days)'}
                  </span>
                  {(watchedPriority === 'URGENT' || watchedPriority === 'STAT') && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-600 text-white">
                      Analyst Alert Active
                    </span>
                  )}
                </div>
                {(watchedPriority === 'URGENT' || watchedPriority === 'STAT') && (
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Live notification and top header alert will be sent directly to the QC Analyst and Administration.
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1.5 rounded-lg font-mono font-bold text-xs shadow-2xs',
                  watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white'
                )}
              >
                {watchedPriority === 'URGENT' || watchedPriority === 'STAT'
                  ? '1 Hr - 2 Days'
                  : '5 - 15 Days'}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3.5 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              disabled={isSubmitting || createMutation.isPending}
              className="text-xs border-slate-300 text-slate-700"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || createMutation.isPending || idCheckStatus === 'duplicate'}
                className="bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-xs cursor-pointer px-4 py-2"
              >
                {isSubmitting || createMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting to PostgreSQL...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-400 mr-1" />
                    <span>Review & Confirm Details</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
          </div>
        </main>
      </div>

      {/* Protected Confirmation Modal: Opens ONLY when all client-side validations pass with 100% valid state */}
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
                  <span className="text-slate-500 font-medium">Sample ID / Preview:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{activeSampleCode}</span>
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
                  <span className="text-slate-500 font-medium">Target Laboratory:</span>
                  <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedLab === 'PENICILLIN'
                      ? 'Penicillin Lab'
                      : selectedLab === 'CEPHALOSPORIN'
                      ? 'Cephalosporin Lab'
                      : 'General Lab'}
                  </span>
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

      {/* Unsaved Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <Modal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          title="Discard Unsaved Changes?"
          subtitle="Form data has not been submitted"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">You have entered unsaved sample data.</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Are you sure you want to discard this record? All entered fields will be cleared and no data will be saved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDiscardConfirm(false)}
                className="text-xs"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDiscard}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Code Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={handleScanResult}
      />

      {/* QR Code Label Print / Preview Modal */}
      <SampleQrLabelModal
        isOpen={isQrLabelModalOpen}
        onClose={() => setIsQrLabelModalOpen(false)}
        qrDataUrl={qrDataUrl}
        sampleCode={activeSampleCode}
        nomenclature={watchedNomenclature || 'Pharmaceutical Sample'}
        lotNumber={watchedLotNumber || 'N/A'}
        mfgDate={watchedMfgDate}
        expDate={watchedExpDate}
        laboratoryName={
          watchedLab === 'PENICILLIN'
            ? 'Penicillin Lab'
            : watchedLab === 'CEPHALOSPORIN'
            ? 'Cephalosporin Lab'
            : 'General Lab'
        }
        sectionName={selectedSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
        samplingDate={format(liveDate, 'dd MMM yyyy, hh:mm a')}
        sampleQty={watch('sampleQty')}
        unit={watch('unit')}
      />

      {/* Official Post-Creation Container Chit Modal (End of Sample Addition) */}
      {isCreatedChitOpen && createdSampleForChit && (
        <SampleRoutingChitModal
          isOpen={isCreatedChitOpen}
          onClose={() => {
            setIsCreatedChitOpen(false);
            setCreatedSampleForChit(null);
            reset(defaultValues);
            onClose();
          }}
          chitData={{
            sample: createdSampleForChit,
            destinationLab: 'PENDING_WORKFLOW',
            submittedByName: createdSampleForChit.submittedBy || user?.fullName || 'Sampling Officer',
            submittedAt: createdSampleForChit.samplingDate || new Date().toISOString(),
          }}
          onProceedToSubmit={(sample) => {
            setIsCreatedChitOpen(false);
            setCreatedSampleForChit(null);
            reset(defaultValues);
            onClose();
            if (onProceedToSubmit) {
              onProceedToSubmit(sample);
            }
          }}
          onViewSampleDetails={(sample) => {
            setIsCreatedChitOpen(false);
            setCreatedSampleForChit(null);
            reset(defaultValues);
            onClose();
            if (onSampleCreated) {
              onSampleCreated(sample);
            }
          }}
        />
      )}
    </>
  );
}
