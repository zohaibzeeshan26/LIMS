'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { getSampleSection } from '@/types/lims';
import { formatDateTime } from '@/lib/date';
import { AnalystUserOption } from '@/lib/analysts';
import { auditService } from '@/services/audit.service';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import {
  UserCheck,
  PlusCircle,
  Search,
  Filter,
  FlaskConical,
  ShieldAlert,
  Microscope,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Layers,
  Sparkles,
  FileText,
  User,
  Tag,
  Eye,
  Check,
  ChevronDown,
} from 'lucide-react';

export interface TaskItem {
  id: string;
  taskCode: string;
  sampleId: string;
  sampleName: string;
  laboratory: 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN';
  section?: 'semi-base' | 'formulation';
  assignedAnalystName: string;
  assignedAnalystId: string;
  testProtocol: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  shift: string;
  dueDate: string;
  assignedDate: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  instructions?: string;
  // All Sampling fields matching /samples
  accessionNo?: string;
  samplingDate?: string;
  stageType?: string;
  sampleQty?: number | string;
  unit?: string;
  lotNumber?: string;
  mfgDate?: string;
  expDate?: string;
  submittedBy?: string;
  receivedBy?: string;
}

function getSampleLabKey(s: any): 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN' {
  const labRaw = (
    s.laboratoryType ||
    (typeof s.laboratory === 'string'
      ? s.laboratory
      : (s.laboratory as any)?.name || (s.laboratory as any)?.code) ||
    ''
  ).toString().toUpperCase();
  const code = (s.sampleCode || s.accessionNo || s.sampleId || '').toString().toUpperCase();

  if (labRaw.includes('PEN') || code.includes('PEN') || code.startsWith('PEN/')) {
    return 'PENICILLIN';
  }
  if (
    labRaw.includes('CEPH') ||
    labRaw.includes('SAF') ||
    code.includes('CEPH') ||
    code.includes('CEP') ||
    code.startsWith('CEPH/')
  ) {
    return 'CEPHALOSPORIN';
  }
  return 'GENERAL';
}

function getTaskSection(task: Partial<TaskItem>): 'semi-base' | 'formulation' {
  if (task.section) return task.section;
  const sampleId = (task.sampleId || '').toUpperCase();
  const sampleName = (task.sampleName || '').toLowerCase();
  if (
    sampleId.includes('/SB') ||
    sampleId.includes('SB-') ||
    sampleId.includes('SEMI') ||
    sampleName.includes('raw material') ||
    sampleName.includes('active')
  ) {
    return 'semi-base';
  }
  return 'formulation';
}

const DEFAULT_INITIAL_TASKS: TaskItem[] = [
  {
    id: 'tsk-001',
    taskCode: 'TSK-2026-001',
    sampleId: 'GL/SB-1',
    sampleName: 'Paracetamol BP (Active Raw Material)',
    laboratory: 'GENERAL',
    section: 'semi-base',
    assignedAnalystName: 'Zubair Raza',
    assignedAnalystId: 'EMP-003',
    testProtocol: 'HPLC Potency Assay & Chromatographic Purity',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-29',
    assignedDate: '2026-10-28',
    status: 'IN_PROGRESS',
    instructions: 'Follow Monograph BP 2024 Vol II. Run 5 replicate injections.',
    accessionNo: 'A-0001',
    samplingDate: '2026-10-28T09:30:00.000Z',
    stageType: 'Raw Material',
    sampleQty: 500,
    unit: 'g',
    lotNumber: 'BTH-RM-2026-01',
    mfgDate: '2026-09-15T00:00:00.000Z',
    expDate: '2028-09-15T00:00:00.000Z',
    submittedBy: 'Warehouse Intake',
    receivedBy: 'Zubair Raza',
  },
  {
    id: 'tsk-002',
    taskCode: 'TSK-2026-002',
    sampleId: 'CEPH/SB-1',
    sampleName: 'Cefixime Trihydrate (Sterile Area Raw Material)',
    laboratory: 'CEPHALOSPORIN',
    section: 'semi-base',
    assignedAnalystName: 'Cephalosporin Lab Analyst',
    assignedAnalystId: 'EMP-004',
    testProtocol: 'Sterility & Bacterial Endotoxin Test (LAL)',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-29',
    assignedDate: '2026-10-28',
    status: 'ASSIGNED',
    instructions: 'Aseptic cleanroom isolation mandatory. Verify laminar flow cabinet velocity.',
    accessionNo: 'A-0002',
    samplingDate: '2026-10-28T10:15:00.000Z',
    stageType: 'Raw Material',
    sampleQty: 250,
    unit: 'g',
    lotNumber: 'BTH-CEPH-001',
    mfgDate: '2026-08-20T00:00:00.000Z',
    expDate: '2028-08-20T00:00:00.000Z',
    submittedBy: 'Sterile Area Booth',
    receivedBy: 'Cephalosporin Lab Analyst',
  },
  {
    id: 'tsk-003',
    taskCode: 'TSK-2026-003',
    sampleId: 'PEN/SB-1',
    sampleName: 'Amoxicillin Trihydrate Compacted',
    laboratory: 'PENICILLIN',
    section: 'semi-base',
    assignedAnalystName: 'Penicillin Lab Analyst',
    assignedAnalystId: 'EMP-005',
    testProtocol: 'Dissolution Profile & Related Substances Assay',
    priority: 'URGENT',
    shift: 'Evening Shift (16:00 - 00:00)',
    dueDate: '2026-10-30',
    assignedDate: '2026-10-28',
    status: 'ASSIGNED',
    instructions: 'Perform in dedicated penicillin HVAC containment suite.',
    accessionNo: 'A-0003',
    samplingDate: '2026-10-28T11:00:00.000Z',
    stageType: 'Raw Material',
    sampleQty: 500,
    unit: 'g',
    lotNumber: 'BTH-PEN-044',
    mfgDate: '2026-09-01T00:00:00.000Z',
    expDate: '2028-09-01T00:00:00.000Z',
    submittedBy: 'Penicillin Suite',
    receivedBy: 'Penicillin Lab Analyst',
  },
  {
    id: 'tsk-004',
    taskCode: 'TSK-2026-004',
    sampleId: 'GL/F-1',
    sampleName: 'Paracetamol 500mg Coated Tablets',
    laboratory: 'GENERAL',
    section: 'formulation',
    assignedAnalystName: 'Zubair Raza',
    assignedAnalystId: 'EMP-003',
    testProtocol: 'Uniformity of Dosage Units & Hardness Test',
    priority: 'ROUTINE',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-31',
    assignedDate: '2026-10-27',
    status: 'COMPLETED',
    instructions: 'Batch # BTH-2026-091 release testing. Results verified within spec.',
    accessionNo: 'A-0004',
    samplingDate: '2026-10-27T14:00:00.000Z',
    stageType: 'Finished Product',
    sampleQty: 100,
    unit: 'Tablets',
    lotNumber: 'BTH-2026-091',
    mfgDate: '2026-10-01T00:00:00.000Z',
    expDate: '2028-10-01T00:00:00.000Z',
    submittedBy: 'Plant Production',
    receivedBy: 'Zubair Raza',
  },
  {
    id: 'tsk-005',
    taskCode: 'TSK-2026-005',
    sampleId: 'CEPH/F-1',
    sampleName: 'Ceftriaxone 1g Powder for Injection',
    laboratory: 'CEPHALOSPORIN',
    section: 'formulation',
    assignedAnalystName: 'Cephalosporin Lab Analyst',
    assignedAnalystId: 'EMP-004',
    testProtocol: 'Particulate Matter & Reconstitution Time Verification',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-30',
    assignedDate: '2026-10-28',
    status: 'IN_PROGRESS',
    instructions: 'Light obscuration particle counter inspection required.',
    accessionNo: 'A-0005',
    samplingDate: '2026-10-28T15:20:00.000Z',
    stageType: 'Finished Product',
    sampleQty: 50,
    unit: 'Vials',
    lotNumber: 'BTH-CEPH-992',
    mfgDate: '2026-10-10T00:00:00.000Z',
    expDate: '2027-10-10T00:00:00.000Z',
    submittedBy: 'SAF Aseptic Filling Line',
    receivedBy: 'Cephalosporin Lab Analyst',
  },
  {
    id: 'tsk-006',
    taskCode: 'TSK-2026-006',
    sampleId: 'PEN/F-1',
    sampleName: 'Amoxicillin 500mg Capsules BP',
    laboratory: 'PENICILLIN',
    section: 'formulation',
    assignedAnalystName: 'Penicillin Lab Analyst',
    assignedAnalystId: 'EMP-005',
    testProtocol: 'Assay by HPLC & Dissolution Profile',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-29',
    assignedDate: '2026-10-28',
    status: 'IN_PROGRESS',
    instructions: 'Dedicated Penicillin suite operations required.',
    accessionNo: 'A-0006',
    samplingDate: '2026-10-28T12:45:00.000Z',
    stageType: 'Finished Product',
    sampleQty: 120,
    unit: 'Capsules',
    lotNumber: 'BTH-PEN-818',
    mfgDate: '2026-10-05T00:00:00.000Z',
    expDate: '2028-10-05T00:00:00.000Z',
    submittedBy: 'Penicillin Packaging Line',
    receivedBy: 'Penicillin Lab Analyst',
  },
  {
    id: 'tsk-007',
    taskCode: 'TSK-2026-007',
    sampleId: 'GL/SB-2',
    sampleName: 'Ibuprofen BP Active Raw Material',
    laboratory: 'GENERAL',
    section: 'semi-base',
    assignedAnalystName: 'Zubair Raza',
    assignedAnalystId: 'EMP-003',
    testProtocol: 'Loss on Drying (LOD) & Water Content by KF',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-30',
    assignedDate: '2026-10-28',
    status: 'ASSIGNED',
    instructions: 'Verify moisture content below 0.5% w/w.',
    accessionNo: 'A-0007',
    samplingDate: '2026-10-28T08:15:00.000Z',
    stageType: 'Raw Material',
    sampleQty: 300,
    unit: 'g',
    lotNumber: 'BTH-IBU-552',
    mfgDate: '2026-09-10T00:00:00.000Z',
    expDate: '2028-09-10T00:00:00.000Z',
    submittedBy: 'Warehouse Intake',
    receivedBy: 'Zubair Raza',
  },
  {
    id: 'tsk-008',
    taskCode: 'TSK-2026-008',
    sampleId: 'GL/F-2',
    sampleName: 'Cough & Cold Expectorant Syrup 120ml',
    laboratory: 'GENERAL',
    section: 'formulation',
    assignedAnalystName: 'Bilal Raza',
    assignedAnalystId: 'EMP-007',
    testProtocol: 'pH & Optical Rotation Verification',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-29',
    assignedDate: '2026-10-28',
    status: 'IN_PROGRESS',
    instructions: 'Check density, active concentration, and refractive index.',
    accessionNo: 'A-0008',
    samplingDate: '2026-10-28T13:10:00.000Z',
    stageType: 'Finished Product',
    sampleQty: 10,
    unit: 'Bottles',
    lotNumber: 'BTH-SYR-102',
    mfgDate: '2026-10-15T00:00:00.000Z',
    expDate: '2028-10-15T00:00:00.000Z',
    submittedBy: 'Liquid Syrup Section',
    receivedBy: 'Bilal Raza',
  },
  {
    id: 'tsk-009',
    taskCode: 'TSK-2026-009',
    sampleId: 'GL/SB-3',
    sampleName: 'Magnesium Stearate BP (Compaction Excipient)',
    laboratory: 'GENERAL',
    section: 'semi-base',
    assignedAnalystName: 'Zubair Raza',
    assignedAnalystId: 'EMP-003',
    testProtocol: 'Loss on Drying (LOD) & Heavy Metals Screen',
    priority: 'ROUTINE',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-31',
    assignedDate: '2026-10-28',
    status: 'ASSIGNED',
    instructions: 'QC Raw Material acceptance inspection per USP monograph.',
    accessionNo: 'A-0009',
    samplingDate: '2026-10-28T09:00:00.000Z',
    stageType: 'Raw Material',
    sampleQty: 200,
    unit: 'g',
    lotNumber: 'BTH-MGST-33',
    mfgDate: '2026-08-01T00:00:00.000Z',
    expDate: '2029-08-01T00:00:00.000Z',
    submittedBy: 'Warehouse Intake',
    receivedBy: 'Zubair Raza',
  },
  {
    id: 'tsk-010',
    taskCode: 'TSK-2026-010',
    sampleId: 'GL/F-3',
    sampleName: 'Metformin HCl 500mg Film-Coated Tablets',
    laboratory: 'GENERAL',
    section: 'formulation',
    assignedAnalystName: 'Bilal Raza',
    assignedAnalystId: 'EMP-007',
    testProtocol: 'Dissolution Profile & Drug Release Rate',
    priority: 'URGENT',
    shift: 'Morning Shift (08:00 - 16:00)',
    dueDate: '2026-10-30',
    assignedDate: '2026-10-28',
    status: 'ASSIGNED',
    instructions: '6-vessel dissolution testing at 100 rpm in phosphate buffer pH 6.8.',
    accessionNo: 'A-0010',
    samplingDate: '2026-10-28T16:00:00.000Z',
    stageType: 'Finished Product',
    sampleQty: 80,
    unit: 'Tablets',
    lotNumber: 'BTH-MET-409',
    mfgDate: '2026-10-20T00:00:00.000Z',
    expDate: '2028-10-20T00:00:00.000Z',
    submittedBy: 'Tablet Compression Line',
    receivedBy: 'Bilal Raza',
  },
];



const TEST_PROTOCOLS = [
  'HPLC Potency Assay & Chromatographic Purity',
  'Dissolution Profile & Drug Release Rate',
  'Sterility & Bacterial Endotoxin Test (LAL)',
  'Uniformity of Dosage Units & Weight Variation',
  'Loss on Drying (LOD) & Water Content by KF',
  'Related Substances & Organic Impurities',
  'Particulate Matter & Clarity of Solution',
  'pH & Optical Rotation Verification',
];

function TaskAssignmentPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const labParam = searchParams.get('lab')?.toLowerCase();
  const sectionParam = searchParams.get('section')?.toLowerCase();

  // Strict Laboratory Identification from query parameter
  const activeLabKey: 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN' = useMemo(() => {
    if (labParam === 'cephalosporin' || labParam === 'ceph' || labParam === 'saf') return 'CEPHALOSPORIN';
    if (labParam === 'penicillin' || labParam === 'pen') return 'PENICILLIN';
    return 'GENERAL';
  }, [labParam]);

  const activeLabName = useMemo(() => {
    if (activeLabKey === 'CEPHALOSPORIN') return 'Cephalosporin Lab';
    if (activeLabKey === 'PENICILLIN') return 'Penicillin Lab';
    return 'General Lab';
  }, [activeLabKey]);

  // Section Selector: 'all' | 'semi-base' | 'formulation'
  const activeSection: 'all' | 'semi-base' | 'formulation' = useMemo(() => {
    if (sectionParam === 'semi-base' || sectionParam === 'semi_base' || sectionParam === 'sb') return 'semi-base';
    if (sectionParam === 'formulation' || sectionParam === 'form' || sectionParam === 'f') return 'formulation';
    return 'all';
  }, [sectionParam]);

  const selectSection = (section: 'all' | 'semi-base' | 'formulation') => {
    const params = new URLSearchParams(searchParams.toString());
    if (section === 'all') {
      params.delete('section');
    } else {
      params.set('section', section);
    }
    router.push(`/tasks?${params.toString()}`);
  };

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal State
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [activeTaskDetails, setActiveTaskDetails] = useState<TaskItem | null>(null);

  // New Task Form Fields (pre-targeted with active laboratory & section)
  const [newSampleId, setNewSampleId] = useState('');
  const [newSampleName, setNewSampleName] = useState('');
  const [newLab, setNewLab] = useState<'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN'>(activeLabKey);
  const [newSection, setNewSection] = useState<'semi-base' | 'formulation'>('semi-base');
  const [newAnalystId, setNewAnalystId] = useState('');
  const [newProtocol, setNewProtocol] = useState(TEST_PROTOCOLS[0]);
  const [newPriority, setNewPriority] = useState<'URGENT' | 'ROUTINE'>('URGENT');
  const [newShift, setNewShift] = useState('Morning Shift (08:00 - 16:00)');
  const [newDueDate, setNewDueDate] = useState('2026-10-30');
  const [newInstructions, setNewInstructions] = useState('');

  // Keep newLab and newSection aligned
  useEffect(() => {
    setNewLab(activeLabKey);
  }, [activeLabKey]);

  // Check role permission: Manager, Deputy Manager, Incharge, Admin can assign samples
  const canAssign =
    user?.role === 'ADMIN' ||
    (user?.role as string) === 'SUPER_ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'DEPUTY_MANAGER' ||
    user?.role === 'SHIFT_INCHARGE';

  // Real Database Analysts Query (combined with system analysts)
  const { data: dbPersonnelData } = useQuery({
    queryKey: ['users-list-for-tasks'],
    queryFn: () => userService.getAll(),
  });

  const allPersonnelList = useMemo<AnalystUserOption[]>(() => {
    if (!dbPersonnelData || !Array.isArray(dbPersonnelData)) return [];
    return dbPersonnelData
      .filter((u: any) => u.isActive !== false)
      .map((u: any) => ({
        id: u.employeeId || u.id,
        name: u.fullName,
        username: u.username || u.employeeId.toLowerCase(),
        email: u.email,
        role: u.role,
        department: u.department || 'Analytical QC',
        lab: (u.assignedLab || 'ALL') as any,
      }));
  }, [dbPersonnelData]);

  // Row-level Sample Assignment Modal State
  const [isRowAssignModalOpen, setIsRowAssignModalOpen] = useState(false);
  const [targetSampleTask, setTargetSampleTask] = useState<TaskItem | null>(null);
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>(TEST_PROTOCOLS[0]);
  const [selectedPriorityVal, setSelectedPriorityVal] = useState<'URGENT' | 'ROUTINE'>('URGENT');
  const [selectedShiftVal, setSelectedShiftVal] = useState<string>('Morning Shift (08:00 - 16:00)');
  const [selectedDueDateVal, setSelectedDueDateVal] = useState<string>('2026-10-30');
  const [selectedInstructionsVal, setSelectedInstructionsVal] = useState<string>('');

  const openRowAssignModal = (task: TaskItem) => {
    setTargetSampleTask(task);
    const existing = allPersonnelList.find(
      (a) => a.id === task.assignedAnalystId || a.name === task.assignedAnalystName
    );
    setSelectedAnalystId(existing ? existing.id : allPersonnelList[0]?.id || '');
    setSelectedProtocol(task.testProtocol || TEST_PROTOCOLS[0]);
    setSelectedPriorityVal(task.priority === 'ROUTINE' ? 'ROUTINE' : 'URGENT');
    setSelectedShiftVal(task.shift || 'Morning Shift (08:00 - 16:00)');
    setSelectedDueDateVal(task.dueDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setSelectedInstructionsVal(task.instructions || '');
    setIsRowAssignModalOpen(true);
  };

  const handleConfirmRowAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSampleTask) return;

    const chosen = allPersonnelList.find((a) => a.id === selectedAnalystId) || allPersonnelList[0];

    const updated = tasks.map((t) => {
      if (t.id === targetSampleTask.id) {
        return {
          ...t,
          assignedAnalystId: chosen.id,
          assignedAnalystName: chosen.name,
          assignedAnalystUsername: chosen.username,
          testProtocol: selectedProtocol,
          priority: selectedPriorityVal,
          shift: selectedShiftVal,
          dueDate: selectedDueDateVal,
          instructions: selectedInstructionsVal,
          status: 'ASSIGNED' as const,
        };
      }
      return t;
    });

    saveTasks(updated);

    // Sync assignment directly to backend sample database if matched
    const matchingSample = availableSamples.find((s: any) =>
      s.id === targetSampleTask.sampleId ||
      s.sampleCode === targetSampleTask.sampleId ||
      s.accessionNo === targetSampleTask.sampleId ||
      s.accessionNo === targetSampleTask.accessionNo
    );

    if (matchingSample?.id) {
      samplingService.update(matchingSample.id, {
        assignedToId: chosen.id,
        status: 'ASSIGNED_FOR_TESTING' as any,
      }).catch((err) => console.warn('Could not update sample assignedToId in db:', err));
    }

    // Notify other panels like testing & execution
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lims-tasks-updated'));
    }

    // 21 CFR Part 11 Audit Trail for Task Assignment
    auditService.logActivity({
      action: 'TASK_ASSIGNED',
      entityName: 'SampleTask',
      entityId: targetSampleTask.id || targetSampleTask.sampleId,
      performedByName: user?.fullName || 'QC Supervisor',
      role: user?.role || 'MANAGER',
      reasonForChange: `Assigned sample ${targetSampleTask.sampleId} (${targetSampleTask.sampleName}) to analyst ${chosen.name} (@${chosen.username || chosen.id}) for ${selectedProtocol}`,
      diffPayload: {
        details: `Assigned sample ${targetSampleTask.sampleId} to ${chosen.name} (@${chosen.username || chosen.id}) — Protocol: ${selectedProtocol} (${selectedPriorityVal})`,
        sampleId: targetSampleTask.sampleId,
        analystName: chosen.name,
        analystUsername: chosen.username,
        protocol: selectedProtocol,
        priority: selectedPriorityVal,
        assignedBy: user?.fullName,
      },
    });

    setIsRowAssignModalOpen(false);
    setTargetSampleTask(null);
  };

  // Fetch real samples for sample picker and automatic task sync
  const { data: samplesData } = useQuery({
    queryKey: ['samples-for-task-assignment'],
    queryFn: () => samplingService.getAll({ limit: 100 }),
    refetchInterval: 4000,
  });

  const availableSamples = useMemo(() => {
    if (!samplesData) return [];
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Registered samples filtered for the active laboratory
  const labSpecificSamples = useMemo(() => {
    return availableSamples.filter((s: any) => getSampleLabKey(s) === activeLabKey);
  }, [availableSamples, activeLabKey]);

  // Load tasks from localStorage or seed with automatic migration
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('city_pharma_lims_tasks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const enriched = parsed.map((item: any) => ({
              ...item,
              section: item.section || getTaskSection(item),
            }));
            const existingCodes = new Set(enriched.map((x: any) => x.taskCode));
            const missingDefaults = DEFAULT_INITIAL_TASKS.filter((d) => !existingCodes.has(d.taskCode));
            const merged = [...enriched, ...missingDefaults];
            setTasks(merged);
            localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(merged));
            return;
          }
        } catch (e) {
          console.error('Error parsing tasks from storage', e);
        }
      }
      setTasks(DEFAULT_INITIAL_TASKS);
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(DEFAULT_INITIAL_TASKS));
    }
  }, []);

  // Auto-sync any registered samples from database into Task Registry
  useEffect(() => {
    if (!availableSamples || availableSamples.length === 0) return;

    setTasks((prevTasks) => {
      const existingSampleIds = new Set(
        prevTasks.map((t) => (t.sampleId || '').trim().toUpperCase())
      );
      const existingTaskCodes = new Set(
        prevTasks.map((t) => (t.taskCode || '').trim().toUpperCase())
      );

      const newlyGeneratedTasks: TaskItem[] = [];

      for (const s of availableSamples) {
        const sId = (s.sampleCode || s.accessionNo || s.sampleId || '').trim();
        if (!sId) continue;

        if (!existingSampleIds.has(sId.toUpperCase())) {
          const sampleLab = getSampleLabKey(s);
          const sampleSec = getSampleSection(s);
          const sampleName = s.nomenclature || s.materialName || 'Analytical Sample Verification';

          const defaultAnalyst =
            sampleLab === 'CEPHALOSPORIN'
              ? { name: 'Cephalosporin Lab Analyst', id: 'EMP-004' }
              : sampleLab === 'PENICILLIN'
              ? { name: 'Penicillin Lab Analyst', id: 'EMP-005' }
              : { name: 'Zubair Raza', id: 'EMP-003' };

          const defaultProtocol =
            sampleSec === 'semi-base'
              ? 'HPLC Potency Assay & Chromatographic Purity'
              : 'Uniformity of Dosage Units & Hardness Test';

          const cleanCode = sId.replace(/[^a-zA-Z0-9-]/g, '');
          const taskCode = `TSK-${cleanCode}`;

          if (!existingTaskCodes.has(taskCode.toUpperCase())) {
            const autoTask: TaskItem = {
              id: `tsk-smp-${s.id || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              taskCode: taskCode,
              sampleId: sId,
              sampleName: sampleName,
              laboratory: sampleLab,
              section: sampleSec,
              assignedAnalystName: defaultAnalyst.name,
              assignedAnalystId: defaultAnalyst.id,
              testProtocol: defaultProtocol,
              priority: s.priority === 'ROUTINE' ? 'ROUTINE' : 'URGENT',
              shift: 'Morning Shift (08:00 - 16:00)',
              dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              assignedDate: s.samplingDate
                ? new Date(s.samplingDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              status:
                s.status === 'COMPLETED'
                  ? 'COMPLETED'
                  : s.status === 'TESTING' || s.status === 'IN_PROGRESS'
                  ? 'IN_PROGRESS'
                  : 'ASSIGNED',
              instructions: `Auto-allocated QC task generated from Sample Record (${s.lotNumber || s.batchLotNumber || 'Batch Verified'}).`,
              accessionNo: s.accessionNo || s.sampleCode || `A-${String(prevTasks.length + newlyGeneratedTasks.length + 1).padStart(4, '0')}`,
              samplingDate: s.samplingDate || s.createdAt || new Date().toISOString(),
              stageType: s.stageType || s.sampleType || (sampleSec === 'semi-base' ? 'Raw Material' : 'Finished Product'),
              sampleQty: s.sampleQty || s.quantity || 100,
              unit: s.unit || s.quantityUnit || 'units',
              lotNumber: s.lotNumber || s.batchLotNumber || s.batch?.batchNumber || '—',
              mfgDate: s.mfgDate || s.manufacturingDate || s.batch?.manufacturingDate,
              expDate: s.expDate || s.expiryDate || s.batch?.expiryDate,
              submittedBy: s.submittedBy || s.submittedByUser?.fullName || 'Plant Production',
              receivedBy: s.accessionedBy?.fullName || s.receivedByUser?.fullName || 'QC Intake Officer',
            };

            newlyGeneratedTasks.push(autoTask);
            existingSampleIds.add(sId.toUpperCase());
            existingTaskCodes.add(taskCode.toUpperCase());
          }
        }
      }

      if (newlyGeneratedTasks.length > 0) {
        const merged = [...newlyGeneratedTasks, ...prevTasks];
        if (typeof window !== 'undefined') {
          localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(merged));
        }
        return merged;
      }

      return prevTasks;
    });
  }, [availableSamples]);

  // Listen to custom task updates across components and windows
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('city_pharma_lims_tasks');
      if (saved) {
        try {
          setTasks(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('lims-tasks-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('lims-tasks-updated', handleSync);
    };
  }, []);

  const saveTasks = (newTaskList: TaskItem[]) => {
    setTasks(newTaskList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(newTaskList));
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedAnalyst = allPersonnelList.find((a) => a.id === newAnalystId) || allPersonnelList[0] || { id: 'UNASSIGNED', name: 'Unassigned Analyst', username: 'unassigned', email: '', role: 'Analyst', department: 'QC', lab: 'ALL' };
    const generatedCode = `TSK-2026-${String(tasks.length + 1).padStart(3, '0')}`;
    const match = labSpecificSamples.find(
      (s: any) =>
        s.accessionNo === newSampleId ||
        s.sampleCode === newSampleId ||
        s.sampleId === newSampleId ||
        s.id === newSampleId
    );

    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      taskCode: generatedCode,
      sampleId: newSampleId || (newSection === 'semi-base' ? 'GL/SB-NEW' : 'GL/F-NEW'),
      sampleName: newSampleName || 'Analytical Sample Verification',
      laboratory: newLab,
      section: newSection,
      assignedAnalystName: selectedAnalyst.name,
      assignedAnalystId: selectedAnalyst.id,
      testProtocol: newProtocol,
      priority: newPriority,
      shift: newShift,
      dueDate: newDueDate,
      assignedDate: new Date().toISOString().split('T')[0],
      status: 'ASSIGNED',
      instructions: newInstructions,
      accessionNo: match?.accessionNo || `A-${String(tasks.length + 1).padStart(4, '0')}`,
      samplingDate: match?.samplingDate || new Date().toISOString(),
      stageType: match?.stageType || match?.sampleType || (newSection === 'semi-base' ? 'Raw Material' : 'Finished Product'),
      sampleQty: match?.sampleQty || match?.quantity || 100,
      unit: match?.unit || match?.quantityUnit || 'units',
      lotNumber: match?.lotNumber || match?.batchLotNumber || match?.batch?.batchNumber || 'BTH-2026-NEW',
      mfgDate: match?.mfgDate || match?.manufacturingDate || new Date().toISOString(),
      expDate: match?.expDate || match?.expiryDate || new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
      submittedBy: match?.submittedBy || match?.submittedByUser?.fullName || user?.fullName || 'Plant Production',
      receivedBy: match?.accessionedBy?.fullName || 'QC Intake Officer',
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);

    // Sync task assignment to backend sample database if matched
    if (match?.id && selectedAnalyst?.id && selectedAnalyst.id !== 'UNASSIGNED') {
      samplingService.update(match.id, {
        assignedToId: selectedAnalyst.id,
        status: 'ASSIGNED_FOR_TESTING' as any,
      }).catch((err) => console.warn('Could not update sample assignedToId in db:', err));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lims-tasks-updated'));
    }

    setIsNewTaskModalOpen(false);

    // 21 CFR Part 11 Audit Trail for Task Assignment Creation
    auditService.logActivity({
      action: 'TASK_ASSIGNED',
      entityName: 'SampleTask',
      entityId: newTask.id || newTask.taskCode,
      performedByName: user?.fullName || 'QC Supervisor',
      role: user?.role || 'MANAGER',
      reasonForChange: `Created and assigned QC task ${newTask.taskCode} (${newTask.sampleName}) to analyst ${selectedAnalyst.name} (@${selectedAnalyst.username || selectedAnalyst.id})`,
      diffPayload: {
        details: `Task ${newTask.taskCode} assigned to ${selectedAnalyst.name} (@${selectedAnalyst.username || selectedAnalyst.id}) — Protocol: ${newTask.testProtocol} (${newTask.priority})`,
        taskCode: newTask.taskCode,
        sampleId: newTask.sampleId,
        analystName: selectedAnalyst.name,
        analystUsername: selectedAnalyst.username,
        protocol: newTask.testProtocol,
        priority: newTask.priority,
        shift: newTask.shift,
      },
    });

    // Reset form
    setNewSampleId('');
    setNewSampleName('');
    setNewInstructions('');
  };

  const handleStatusChange = (taskId: string, newStatus: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED') => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    saveTasks(updated);

    if (targetTask) {
      // 21 CFR Part 11 Audit Trail for Task Status Change
      auditService.logActivity({
        action: 'TASK_STATUS_UPDATED',
        entityName: 'SampleTask',
        entityId: targetTask.id || targetTask.taskCode,
        performedByName: user?.fullName || 'QC Analyst',
        role: user?.role || 'ANALYST',
        reasonForChange: `Updated task ${targetTask.taskCode} status from ${targetTask.status} to ${newStatus}`,
        diffPayload: {
          details: `Task ${targetTask.taskCode} (${targetTask.sampleId}) status transitioned: ${targetTask.status} → ${newStatus}`,
          taskCode: targetTask.taskCode,
          sampleId: targetTask.sampleId,
          previousStatus: targetTask.status,
          newStatus: newStatus,
        },
      });
    }
  };

  // Tasks belonging specifically to the active laboratory
  const labTasks = useMemo(() => {
    return tasks.filter((t) => t.laboratory === activeLabKey);
  }, [tasks, activeLabKey]);

  // Section breakdown for active laboratory
  const allLabCount = labTasks.length;
  const semiBaseTasks = useMemo(() => labTasks.filter((t) => getTaskSection(t) === 'semi-base'), [labTasks]);
  const formulationTasks = useMemo(() => labTasks.filter((t) => getTaskSection(t) === 'formulation'), [labTasks]);

  const semiBaseCount = semiBaseTasks.length;
  const formulationCount = formulationTasks.length;

  const urgentTasksCount = useMemo(() => labTasks.filter((t) => t.priority === 'URGENT' || (t.priority as any) === 'STAT').length, [labTasks]);
  const semiBaseUrgentCount = useMemo(() => semiBaseTasks.filter((t) => t.priority === 'URGENT' || (t.priority as any) === 'STAT').length, [semiBaseTasks]);
  const formulationUrgentCount = useMemo(() => formulationTasks.filter((t) => t.priority === 'URGENT' || (t.priority as any) === 'STAT').length, [formulationTasks]);

  // Filtered task items strictly isolated by active laboratory AND selected section
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Strict Laboratory Isolation: only show tasks of the active lab
      if (t.laboratory !== activeLabKey) {
        return false;
      }

      // 2. Section Isolation: all, semi-base, formulation
      if (activeSection === 'semi-base' || activeSection === 'formulation') {
        if (getTaskSection(t) !== activeSection) {
          return false;
        }
      }

      const matchesSearch =
        searchTerm === '' ||
        t.taskCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sampleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.assignedAnalystName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.testProtocol.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority;
      const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, activeLabKey, activeSection, searchTerm, selectedPriority, selectedStatus]);

  // Metrics for active section view
  const stats = useMemo(() => {
    const scope = activeSection === 'semi-base' ? semiBaseTasks : activeSection === 'formulation' ? formulationTasks : labTasks;
    const total = scope.length;
    const urgentCount = scope.filter((t) => t.priority === 'URGENT' || (t.priority as any) === 'STAT').length;
    const inProgress = scope.filter((t) => t.status === 'IN_PROGRESS').length;
    const assigned = scope.filter((t) => t.status === 'ASSIGNED').length;
    const completed = scope.filter((t) => t.status === 'COMPLETED').length;
    return { total, urgentCount, inProgress, assigned, completed };
  }, [activeSection, semiBaseTasks, formulationTasks, labTasks]);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleRouteGuard
      allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'SHIFT_INCHARGE', 'QA_MANAGER']}
      moduleName="Sample Assignment & Task Board"
    >
      <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 transition-colors font-semibold">
            Portal
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-800">{activeLabName} — Sample Assignment</span>
          {activeSection !== 'all' && (
            <>
              <span>/</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {activeSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
              </span>
            </>
          )}
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <span>&larr; Back to Portal</span>
        </Link>
      </div>

      {/* Active Laboratory Header Banner (Strict Laboratory Isolation) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Analytical Laboratory
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Active Facility
              </span>
              {activeSection !== 'all' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeSection === 'semi-base' ? 'Semi Basics Section' : 'Formulation Section'}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
              {activeLabName} — Task Allocation
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs">
            {stats.total} Tasks Active
          </span>
        </div>
      </div>

      {/* Sub-Section Options under Laboratory: All Tasks, Semi Basics, and Formulation */}
      <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: All Laboratory Tasks */}
          <button
            type="button"
            onClick={() => selectSection('all')}
            className={cn(
              'relative group flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 border cursor-pointer',
              activeSection === 'all'
                ? 'bg-white border-indigo-400 shadow-sm ring-1 ring-indigo-400/20'
                : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                  activeSection === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                )}
              >
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900">
                    All {activeLabName}
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {allLabCount} Tasks
                  </span>
                  {urgentTasksCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{urgentTasksCount} Urgent</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {activeSection === 'all' ? (
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
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
                ? 'bg-white border-indigo-400 shadow-sm ring-1 ring-indigo-400/20'
                : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                  activeSection === 'semi-base'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                )}
              >
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900">
                    Semi Basics
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {semiBaseCount} Tasks
                  </span>
                  {semiBaseUrgentCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{semiBaseUrgentCount} Urgent</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {activeSection === 'semi-base' ? (
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
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
                ? 'bg-white border-indigo-400 shadow-sm ring-1 ring-indigo-400/20'
                : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs',
                  activeSection === 'formulation'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
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
                    {formulationCount} Tasks
                  </span>
                  {formulationUrgentCount > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>{formulationUrgentCount} Urgent</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              {activeSection === 'formulation' ? (
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              ) : (
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Main Page Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#f5f3ff] via-[#ede9fe] to-[#f8f7ff] border border-indigo-100 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-700">
              QC Laboratory Workload & Allocation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Task Assignment Gateway
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-normal mt-1 max-w-2xl">
            Assign analytical testing protocols, electronic worksheets, and sample verification duties to qualified analysts across General, Cephalosporin, and Penicillin laboratories.
          </p>
        </div>

        <button
          onClick={() => setIsNewTaskModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer shrink-0 self-start md:self-auto hover:shadow-md"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tasks */}
        <div className="p-4 rounded-xl border border-indigo-100 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Total Tasks</span>
            <span className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned analytical workloads</p>
        </div>

        {/* Card 2: Queued & Pending */}
        <div className="p-4 rounded-xl border border-amber-100 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Pending Start</span>
            <span className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.assigned}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting analyst pickup</p>
        </div>

        {/* Card 3: In Progress */}
        <div className="p-4 rounded-xl border border-blue-100 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>In Testing</span>
            <span className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FlaskConical className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-700">{stats.inProgress}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active analysis in cleanrooms</p>
        </div>

        {/* Card 4: Urgent Priority */}
        <div className="p-4 rounded-xl border border-amber-100 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Urgent (48h SLA)</span>
            <span className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.urgentCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Expedited 48-hour testing</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by task code, sample ID, drug name, or analyst..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Lab Badge */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-2xs">
            <FlaskConical className="h-3.5 w-3.5 text-indigo-600" />
            <span>{activeLabName}</span>
          </div>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent (48h)</option>
            <option value="ROUTINE">Routine (5d)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {(searchTerm || selectedPriority !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPriority('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-xs px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Task Allocation Registry — {activeSection === 'all' ? 'All Tasks' : activeSection === 'semi-base' ? 'Semi Basics' : 'Formulation'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Click status to update progress</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                <th className="py-3 px-3.5">Task ID</th>
                <th className="py-3 px-3.5">A. No.</th>
                <th className="py-3 px-3.5">Date & Time</th>
                <th className="py-3 px-3.5 min-w-[200px]">Nomenclature</th>
                <th className="py-3 px-3.5">Sample ID</th>
                <th className="py-3 px-3.5">Stage / Type</th>
                <th className="py-3 px-3.5">Qty. of Sample</th>
                <th className="py-3 px-3.5">Batch No. / Lot No.</th>
                <th className="py-3 px-3.5">MFG Date</th>
                <th className="py-3 px-3.5">EXP Date</th>
                <th className="py-3 px-3.5">Submitted By</th>
                <th className="py-3 px-3.5">Received By</th>
                <th className="py-3 px-3.5">Assigned Analyst</th>
                <th className="py-3 px-3.5">Testing Protocol</th>
                <th className="py-3 px-3.5">Priority</th>
                <th className="py-3 px-3.5">Due / Shift</th>
                <th className="py-3 px-3.5">Task Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-400">
                    <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-slate-600 text-xs">No assigned tasks found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;Assign New Task&rdquo; to allocate testing work.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const isUrgent = t.priority === 'URGENT' || (t.priority as any) === 'STAT';
                  const taskSec = getTaskSection(t);

                  const matchedSample = availableSamples.find((s: any) => {
                    const sCode = (s.sampleCode || s.accessionNo || s.sampleId || s.id || '').toString().toUpperCase();
                    const tCode = (t.sampleId || '').toString().toUpperCase();
                    return (
                      sCode === tCode ||
                      (s.accessionNo && s.accessionNo.toUpperCase() === tCode) ||
                      (s.sampleCode && s.sampleCode.toUpperCase() === tCode)
                    );
                  });

                  const aNo = matchedSample?.accessionNo || t.accessionNo || 'A-0001';
                  const samplingDateVal = matchedSample?.samplingDate || t.samplingDate || t.assignedDate;
                  const samplingDateFormatted = formatDateTime(samplingDateVal, 'dd/MM/yyyy HH:mm');
                  const nomenclature = matchedSample?.nomenclature || matchedSample?.materialName || t.sampleName;
                  const sampleIdCode = matchedSample?.sampleCode || matchedSample?.sampleId || t.sampleId;
                  const stageType = (
                    matchedSample?.stageType ||
                    matchedSample?.sampleType ||
                    t.stageType ||
                    (taskSec === 'semi-base' ? 'Raw Material' : 'Finished Product')
                  ).replace(/^\[(Semi Basics?|Semi Base|Formulation)\]\s*/i, '');
                  const sampleQtyText = `${matchedSample?.sampleQty || matchedSample?.quantity || t.sampleQty || 100} ${matchedSample?.unit || matchedSample?.quantityUnit || t.unit || 'units'}`;
                  const batchLotText = matchedSample?.lotNumber || matchedSample?.batchLotNumber || matchedSample?.batch?.batchNumber || t.lotNumber || 'BTH-2026-091';
                  const mfgFormatted = matchedSample?.mfgDate
                    ? formatDateTime(matchedSample.mfgDate, 'dd/MM/yyyy')
                    : matchedSample?.batch?.manufacturingDate
                    ? formatDateTime(matchedSample.batch.manufacturingDate, 'dd/MM/yyyy')
                    : t.mfgDate
                    ? formatDateTime(t.mfgDate, 'dd/MM/yyyy')
                    : '10/2026';
                  const expFormatted = matchedSample?.expDate
                    ? formatDateTime(matchedSample.expDate, 'dd/MM/yyyy')
                    : matchedSample?.batch?.expiryDate
                    ? formatDateTime(matchedSample.batch.expiryDate, 'dd/MM/yyyy')
                    : t.expDate
                    ? formatDateTime(t.expDate, 'dd/MM/yyyy')
                    : '10/2028';
                  const submittedText = matchedSample?.submittedBy || matchedSample?.submittedByUser?.fullName || t.submittedBy || 'Plant Production';
                  const receivedText = matchedSample?.accessionedBy?.fullName || matchedSample?.receivedByUser?.fullName || t.receivedBy || 'QC Intake Officer';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Task ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-600">{t.taskCode}</span>
                        <div className="text-[10px] text-slate-400">Assigned: {t.assignedDate}</div>
                      </td>

                      {/* 2. A. No. */}
                      <td className="py-3 px-3.5 font-mono font-bold text-navy-950 text-xs whitespace-nowrap">
                        {aNo}
                      </td>

                      {/* 3. Date & Time */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {samplingDateFormatted}
                      </td>

                      {/* 4. Nomenclature */}
                      <td className="py-3 px-3.5 min-w-[200px] max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">{nomenclature}</div>
                      </td>

                      {/* 5. Sample ID */}
                      <td className="py-3 px-3.5 font-mono font-bold text-teal-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{sampleIdCode}</span>
                          {isUrgent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Urgent
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Stage / Type */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                          {stageType}
                        </span>
                      </td>

                      {/* 7. Qty. of Sample */}
                      <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {sampleQtyText}
                      </td>

                      {/* 8. Batch No. / Lot No. */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/70 inline-block">
                          {batchLotText}
                        </span>
                      </td>

                      {/* 9. MFG Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {mfgFormatted}
                      </td>

                      {/* 10. EXP Date */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {expFormatted}
                      </td>

                      {/* 11. Submitted By */}
                      <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[150px] truncate" title={submittedText}>
                        {submittedText}
                      </td>

                      {/* 12. Received By */}
                      <td className="py-3 px-3.5 text-slate-700 text-xs max-w-[150px] truncate" title={receivedText}>
                        {receivedText}
                      </td>

                      {/* 13. Assigned Analyst */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {t.assignedAnalystName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{t.assignedAnalystName}</div>
                            <div className="text-[10px] text-slate-400">{t.assignedAnalystId}</div>
                          </div>
                        </div>
                      </td>

                      {/* 14. Testing Protocol */}
                      <td className="py-3 px-3.5 min-w-[180px]">
                        <span className="text-slate-700 font-medium text-xs line-clamp-1">{t.testProtocol}</span>
                      </td>

                      {/* 15. Priority */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isUrgent ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                            URGENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            ROUTINE
                          </span>
                        )}
                      </td>

                      {/* 16. Due / Shift */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-700 text-xs">{t.dueDate}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{t.shift}</div>
                      </td>

                      {/* 17. Task Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value as any)}
                          className={cn(
                            'text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer',
                            t.status === 'COMPLETED' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            t.status === 'IN_PROGRESS' && 'bg-blue-50 text-blue-700 border-blue-200',
                            t.status === 'ASSIGNED' && 'bg-amber-50 text-amber-800 border-amber-200'
                          )}
                        >
                          <option value="ASSIGNED">Pending Start</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>

                      {/* 18. Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canAssign && (
                            <button
                              type="button"
                              onClick={() => openRowAssignModal(t)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              title="Assign this sample to a testing analyst"
                            >
                              <UserCheck className="h-3 w-3" />
                              <span>Assign</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveTaskDetails(t)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Details
                          </button>
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

      {/* ================= MODAL: ASSIGN NEW TASK ================= */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Assign New Analytical Task"
        subtitle="Allocate a testing protocol or worksheet to an analytical chemist"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {/* Sample Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sample Accession ID *
              </label>
              {labSpecificSamples.length > 0 ? (
                <select
                  value={newSampleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setNewSampleId(id);
                    const match = labSpecificSamples.find(
                      (s: any) =>
                        s.accessionNo === id ||
                        s.sampleCode === id ||
                        s.sampleId === id ||
                        s.id === id
                    );
                    if (match) {
                      const name =
                        match.nomenclature ||
                        match.materialName ||
                        match.drugName ||
                        match.productName ||
                        match.sampleName ||
                        '';
                      setNewSampleName(name);
                      setNewSection(getSampleSection(match));
                      if (match.priority) {
                        setNewPriority(
                          match.priority === 'ROUTINE' ? 'ROUTINE' : 'URGENT'
                        );
                      }
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                >
                  <option value="">Select Sample from {activeLabName}...</option>
                  {labSpecificSamples.map((s: any) => {
                    const code = s.sampleCode || s.accessionNo || s.sampleId || s.id;
                    const name =
                      s.nomenclature || s.materialName || s.sampleName || 'Sample Record';
                    const sec =
                      getSampleSection(s) === 'semi-base' ? 'Semi Basics' : 'Formulation';
                    return (
                      <option key={s.id || code} value={code}>
                        {code} — {name} [{sec}]
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  value={newSampleId}
                  onChange={(e) => setNewSampleId(e.target.value)}
                  placeholder="e.g. GL/SB-12"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Drug / Material Nomenclature *
              </label>
              <input
                type="text"
                value={newSampleName}
                onChange={(e) => setNewSampleName(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg Oral Suspension"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
                required
              />
            </div>
          </div>

          {/* Section Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Laboratory Section / Classification *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewSection('semi-base')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  newSection === 'semi-base'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Semi Basics</span>
              </button>
              <button
                type="button"
                onClick={() => setNewSection('formulation')}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                  newSection === 'formulation'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Formulation</span>
              </button>
            </div>
          </div>

          {/* Laboratory & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Analytical Laboratory *
              </label>
              <select
                value={newLab}
                onChange={(e) => setNewLab(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
              >
                <option value="GENERAL">General Lab (GL)</option>
                <option value="CEPHALOSPORIN">Cephalosporin Lab (CEPH)</option>
                <option value="PENICILLIN">Penicillin Lab (PEN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assignee Analyst *
              </label>
              <select
                value={newAnalystId}
                onChange={(e) => setNewAnalystId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
              >
                {allPersonnelList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username ? `@${a.username}` : a.id} — {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Protocol & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Testing Protocol / Worksheet *
              </label>
              <select
                value={newProtocol}
                onChange={(e) => setNewProtocol(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
              >
                {TEST_PROTOCOLS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level *
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
              >
                <option value="URGENT">URGENT (48h Standard)</option>
                <option value="ROUTINE">ROUTINE (5-Day Turnaround)</option>
              </select>
            </div>
          </div>

          {/* Shift & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Allocated Shift
              </label>
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
              >
                <option value="Morning Shift (08:00 - 16:00)">Morning Shift (08:00 - 16:00)</option>
                <option value="Evening Shift (16:00 - 00:00)">Evening Shift (16:00 - 00:00)</option>
                <option value="Night Shift (00:00 - 08:00)">Night Shift (00:00 - 08:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Completion Due Date *
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
                required
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Analytical Instructions & Reference
            </label>
            <textarea
              rows={2}
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="e.g. Clean room isolation required. Run 5 replicate injections on HPLC Unit 02."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Assign & Notify Analyst</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: DIRECT ROW SAMPLE ASSIGNMENT ================= */}
      {isRowAssignModalOpen && targetSampleTask && (
        <Modal
          isOpen={isRowAssignModalOpen}
          onClose={() => {
            setIsRowAssignModalOpen(false);
            setTargetSampleTask(null);
          }}
          title="Assign Sample to Testing Analyst"
          subtitle={`Designate an analytical chemist for ${targetSampleTask.sampleId}`}
          maxWidth="xl"
        >
          <form onSubmit={handleConfirmRowAssignment} className="space-y-4">
            {/* Target Sample Summary Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-mono">
                    Sample Accession #{targetSampleTask.sampleId}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5">
                    {targetSampleTask.sampleName}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
                    {typeof targetSampleTask.laboratory === 'string'
                      ? targetSampleTask.laboratory
                      : (targetSampleTask.laboratory as any)?.name || 'General'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                    {targetSampleTask.section === 'semi-base' ? 'Semi Basics' : 'Formulation'}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Analyst from 10+ Accounts */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Select Testing Analyst (10 Dedicated Accounts) *</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Assignee receives isolated work</span>
              </div>
              <select
                value={selectedAnalystId}
                onChange={(e) => setSelectedAnalystId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                required
              >
                {allPersonnelList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.username ? `@${a.username}` : a.id} — {a.name} ({a.department} • {a.id})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                The selected analyst will log in using their credentials and see this sample in their testing queue.
              </p>
            </div>

            {/* Protocol & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Testing Protocol / Monograph *
                </label>
                <select
                  value={selectedProtocol}
                  onChange={(e) => setSelectedProtocol(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                >
                  {TEST_PROTOCOLS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workflow Priority *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityVal('ROUTINE')}
                    className={cn(
                      'px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                      selectedPriorityVal === 'ROUTINE'
                        ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    Routine (5-Day Turnaround)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPriorityVal('URGENT')}
                    className={cn(
                      'px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                      selectedPriorityVal === 'URGENT'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    Urgent (48h Priority)
                  </button>
                </div>
              </div>
            </div>

            {/* Shift & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocated Shift
                </label>
                <select
                  value={selectedShiftVal}
                  onChange={(e) => setSelectedShiftVal(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
                >
                  <option value="Morning Shift (08:00 - 16:00)">Morning Shift (08:00 - 16:00)</option>
                  <option value="Evening Shift (16:00 - 00:00)">Evening Shift (16:00 - 00:00)</option>
                  <option value="Night Shift (00:00 - 08:00)">Night Shift (00:00 - 08:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Due Date *
                </label>
                <input
                  type="date"
                  value={selectedDueDateVal}
                  onChange={(e) => setSelectedDueDateVal(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium"
                  required
                />
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Instructions for Analyst
              </label>
              <textarea
                rows={2}
                value={selectedInstructionsVal}
                onChange={(e) => setSelectedInstructionsVal(e.target.value)}
                placeholder="e.g. Clean room isolation required. Run 5 replicate injections on HPLC Unit 02."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsRowAssignModalOpen(false);
                  setTargetSampleTask(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <UserCheck className="h-4 w-4" />
                <span>Confirm &amp; Assign to Analyst</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL: TASK DETAILS ================= */}
      {activeTaskDetails && (
        <Modal
          isOpen={!!activeTaskDetails}
          onClose={() => setActiveTaskDetails(null)}
          title={`Task Record: ${activeTaskDetails.taskCode}`}
          subtitle="Detailed assignment parameters and analytical workflow status"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    {typeof activeTaskDetails.laboratory === 'string'
                      ? activeTaskDetails.laboratory
                      : (activeTaskDetails.laboratory as any)?.name || 'General'} LAB
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded border',
                      getTaskSection(activeTaskDetails) === 'semi-base'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    )}
                  >
                    {getTaskSection(activeTaskDetails) === 'semi-base' ? 'Semi Basics' : 'Formulation'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {activeTaskDetails.sampleId}
                </h4>
                <p className="text-xs text-slate-600">{activeTaskDetails.sampleName}</p>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                {activeTaskDetails.priority}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Analyst</span>
                <span className="font-bold text-slate-800">{activeTaskDetails.assignedAnalystName}</span>
                <span className="text-slate-500 block text-[11px]">{activeTaskDetails.assignedAnalystId}</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Allocated Shift</span>
                <span className="font-bold text-slate-800">{activeTaskDetails.shift}</span>
                <span className="text-slate-500 block text-[11px]">Due: {activeTaskDetails.dueDate}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Testing Protocol</span>
              <p className="text-xs font-semibold text-slate-800">{activeTaskDetails.testProtocol}</p>
              {activeTaskDetails.instructions && (
                <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <strong>Notes:</strong> {activeTaskDetails.instructions}
                </p>
              )}
            </div>

            {/* Sample Monograph Details from Sampling */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Sample Intake Parameters (Sampling Record)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Accession No</span>
                  <span className="font-mono font-bold text-slate-800">{activeTaskDetails.accessionNo || 'A-0001'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Batch / Lot No</span>
                  <span className="font-mono font-bold text-slate-800">{activeTaskDetails.lotNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Stage / Type</span>
                  <span className="font-semibold text-slate-700">{activeTaskDetails.stageType || 'Finished Product'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Qty of Sample</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {activeTaskDetails.sampleQty} {activeTaskDetails.unit || 'units'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">MFG Date</span>
                  <span className="font-mono text-slate-700">
                    {activeTaskDetails.mfgDate ? formatDateTime(activeTaskDetails.mfgDate, 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">EXP Date</span>
                  <span className="font-mono text-slate-700">
                    {activeTaskDetails.expDate ? formatDateTime(activeTaskDetails.expDate, 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Submitted By</span>
                  <span className="text-slate-700">{activeTaskDetails.submittedBy || 'Plant Production'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">Received By</span>
                  <span className="text-slate-700">{activeTaskDetails.receivedBy || 'QC Intake Officer'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-slate-500">Status: {activeTaskDetails.status}</span>
              <button
                type="button"
                onClick={() => setActiveTaskDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </RoleRouteGuard>
  );
}

export default function TaskAssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TaskAssignmentPageInner />
    </Suspense>
  );
}

