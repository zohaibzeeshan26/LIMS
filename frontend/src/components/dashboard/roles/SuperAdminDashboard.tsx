'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { samplingService } from '@/services/sampling.service';
import { productService } from '@/services/product.service';
import { auditService } from '@/services/audit.service';
import { userService, CreateUserData, UpdateUserData } from '@/services/user.service';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Users,
  Settings,
  Activity,
  Layers,
  FileText,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  Shield,
  Lock,
  Building2,
  Microscope,
  FlaskConical,
  Check,
  X,
  FileCheck2,
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Beaker,
  Clock,
  Eye,
  Award,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/date';
import { Role, User, LaboratoryAccess } from '@/types/lims';
import { NewSampleModal } from '@/components/samples/NewSampleModal';

interface SystemSettingsState {
  electronicSignatureEnforced: boolean;
  auditTrailReasonRequired: boolean;
  dualAuthCoaRelease: boolean;
  automaticOosQuarantine: boolean;
  sessionTimeoutMinutes: number;
  labContainmentLockout: boolean;
  passwordExpiryDays: number;
}

const DEFAULT_SETTINGS: SystemSettingsState = {
  electronicSignatureEnforced: true,
  auditTrailReasonRequired: true,
  dualAuthCoaRelease: true,
  automaticOosQuarantine: true,
  sessionTimeoutMinutes: 30,
  labContainmentLockout: true,
  passwordExpiryDays: 90,
};

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Active Sub-Tab
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'laboratories' | 'rbac' | 'settings'>('overview');

  // Modals
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [labModalUser, setLabModalUser] = useState<User | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);

  // Modal form states
  const [selectedRole, setSelectedRole] = useState<Role>('QC_ANALYST');
  const [selectedLab, setSelectedLab] = useState<string>('ALL');
  const [newPassword, setNewPassword] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [labFilter, setLabFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // System Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('citi_lims_system_settings');
      if (saved) {
        setSystemSettings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('citi_lims_system_settings', JSON.stringify(systemSettings));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Fetch Users
  const {
    data: usersData,
    refetch: refetchUsers,
    isLoading: isUsersLoading,
  } = useQuery({
    queryKey: ['superadmin-users-list'],
    queryFn: () => userService.getAll(),
    refetchInterval: 10000,
  });

  const users: User[] = useMemo(() => {
    return Array.isArray(usersData) ? usersData : [];
  }, [usersData]);

  // 2. Fetch Metrics
  const { data: metrics } = useQuery({
    queryKey: ['superadmin-metrics'],
    queryFn: () => samplingService.getMetrics(),
    refetchInterval: 10000,
  });

  // 3. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['superadmin-products'],
    queryFn: () => productService.getAll(),
  });

  // 4. Fetch Audit Logs
  const { data: auditLogsData } = useQuery({
    queryKey: ['superadmin-audit-recent'],
    queryFn: () => auditService.getAll({ limit: 8 }),
    refetchInterval: 10000,
  });

  const auditLogs = useMemo(() => {
    if (Array.isArray(auditLogsData)) return auditLogsData;
    if (Array.isArray((auditLogsData as any)?.data)) return (auditLogsData as any).data;
    return [];
  }, [auditLogsData]);

  // 5. Add User form state
  const [newUser, setNewUser] = useState<CreateUserData>({
    username: '',
    email: '',
    fullName: '',
    employeeId: '',
    role: 'QC_ANALYST',
    department: 'Quality Control',
    assignedLab: 'GENERAL',
    password: '',
  });

  // Handle Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.create(newUser);
      setIsAddUserModalOpen(false);
      setNewUser({
        username: '',
        email: '',
        fullName: '',
        employeeId: '',
        role: 'QC_ANALYST',
        department: 'Quality Control',
        assignedLab: 'GENERAL',
        password: '',
      });
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['analysts'] });
      showActionMsg('success', 'User account created successfully.');
    } catch (err: any) {
      showActionMsg('error', err.message || 'Failed to create user account');
    }
  };

  // Handle Change Role
  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    try {
      await userService.updateRole(roleModalUser.id, selectedRole);
      setRoleModalUser(null);
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['analysts'] });
      showActionMsg('success', `Role for ${roleModalUser.fullName} updated to ${selectedRole}.`);
    } catch (err: any) {
      showActionMsg('error', err.message || 'Failed to update user role');
    }
  };

  // Handle Change Lab
  const handleSaveLab = async () => {
    if (!labModalUser) return;
    try {
      await userService.update(labModalUser.id, {
        assignedLab: selectedLab === 'ALL' ? null : selectedLab,
      });
      setLabModalUser(null);
      refetchUsers();
      showActionMsg('success', `Laboratory assignment updated for ${labModalUser.fullName}.`);
    } catch (err: any) {
      showActionMsg('error', err.message || 'Failed to update laboratory assignment');
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleUserStatus = async (targetUser: User) => {
    const nextStatus = !targetUser.isActive;
    const confirmMsg = nextStatus
      ? `Reactivate account for ${targetUser.fullName}?`
      : `Deactivate account for ${targetUser.fullName}? User will not be able to log in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await userService.update(targetUser.id, { isActive: nextStatus });
      refetchUsers();
      showActionMsg('success', `Account for ${targetUser.fullName} is now ${nextStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
    } catch (err: any) {
      showActionMsg('error', err.message || 'Failed to toggle account status');
    }
  };

  // Handle Reset Password
  const handleSavePassword = async () => {
    if (!passwordModalUser || !newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    try {
      await userService.update(passwordModalUser.id, { password: newPassword });
      setPasswordModalUser(null);
      setNewPassword('');
      showActionMsg('success', `Password successfully reset for ${passwordModalUser.fullName}.`);
    } catch (err: any) {
      showActionMsg('error', err.message || 'Failed to reset password');
    }
  };

  const showActionMsg = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        u.fullName?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.employeeId?.toLowerCase().includes(term);

      const matchRole = !roleFilter || u.role === roleFilter;
      const matchLab = !labFilter || (u.assignedLab || 'ALL') === labFilter || (labFilter === 'ALL' && !u.assignedLab);
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'INACTIVE' && !u.isActive);

      return matchSearch && matchRole && matchLab && matchStatus;
    });
  }, [users, searchTerm, roleFilter, labFilter, statusFilter]);

  // Laboratory Stats
  const labStats = useMemo(() => {
    const glUsers = users.filter((u) => u.assignedLab === 'GENERAL' || !u.assignedLab).length;
    const penUsers = users.filter((u) => u.assignedLab === 'PENICILLIN').length;
    const cephUsers = users.filter((u) => u.assignedLab === 'CEPHALOSPORIN').length;
    return { glUsers, penUsers, cephUsers };
  }, [users]);

  // RBAC Matrix Definitions
  const RBAC_MODULES = [
    { id: 'user_mgmt', label: 'User & Role Administration' },
    { id: 'system_settings', label: 'System Settings & Governance' },
    { id: 'sample_logging', label: 'Sample Registration & Accessioning' },
    { id: 'task_assignment', label: 'Sample Task Allocation to Analysts' },
    { id: 'stp_upload', label: 'Product STP / SOP Dossier Upload' },
    { id: 'doc_view', label: 'Document Preview & Download' },
    { id: 'testing_entry', label: 'Testing Execution & Worksheet Entry' },
    { id: 'qc_review', label: 'Quality Review & Supervisor Sign-off' },
    { id: 'coa_release', label: 'Certificate of Analysis (CoA) Release' },
    { id: 'audit_trail', label: '21 CFR Part 11 Audit Trail Oversight' },
  ];

  const RBAC_ROLES = [
    {
      role: 'SUPER_ADMIN',
      label: 'Super Admin',
      color: 'bg-rose-50 text-rose-800 border-rose-300',
      permissions: {
        user_mgmt: 'FULL',
        system_settings: 'FULL',
        sample_logging: 'FULL',
        task_assignment: 'FULL',
        stp_upload: 'FULL',
        doc_view: 'FULL',
        testing_entry: 'FULL',
        qc_review: 'FULL',
        coa_release: 'FULL',
        audit_trail: 'FULL',
      },
    },
    {
      role: 'ADMIN',
      label: 'Admin',
      color: 'bg-blue-50 text-blue-800 border-blue-300',
      permissions: {
        user_mgmt: 'FULL',
        system_settings: 'VIEW',
        sample_logging: 'FULL',
        task_assignment: 'FULL',
        stp_upload: 'FULL',
        doc_view: 'FULL',
        testing_entry: 'FULL',
        qc_review: 'FULL',
        coa_release: 'FULL',
        audit_trail: 'FULL',
      },
    },
    {
      role: 'DOCUMENTATION_MANAGER',
      label: 'Doc Manager',
      color: 'bg-teal-50 text-teal-800 border-teal-300',
      permissions: {
        user_mgmt: 'NONE',
        system_settings: 'NONE',
        sample_logging: 'NONE',
        task_assignment: 'NONE',
        stp_upload: 'FULL',
        doc_view: 'FULL',
        testing_entry: 'NONE',
        qc_review: 'NONE',
        coa_release: 'NONE',
        audit_trail: 'VIEW',
      },
    },
    {
      role: 'MANAGER',
      label: 'QC Manager',
      color: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      permissions: {
        user_mgmt: 'NONE',
        system_settings: 'NONE',
        sample_logging: 'FULL',
        task_assignment: 'FULL',
        stp_upload: 'FULL',
        doc_view: 'FULL',
        testing_entry: 'FULL',
        qc_review: 'FULL',
        coa_release: 'FULL',
        audit_trail: 'FULL',
      },
    },
    {
      role: 'DEPUTY_MANAGER',
      label: 'Deputy Manager',
      color: 'bg-purple-50 text-purple-800 border-purple-300',
      permissions: {
        user_mgmt: 'NONE',
        system_settings: 'NONE',
        sample_logging: 'FULL',
        task_assignment: 'FULL',
        stp_upload: 'VIEW',
        doc_view: 'FULL',
        testing_entry: 'FULL',
        qc_review: 'FULL',
        coa_release: 'VIEW',
        audit_trail: 'VIEW',
      },
    },
    {
      role: 'SHIFT_INCHARGE',
      label: 'Shift Incharge',
      color: 'bg-cyan-50 text-cyan-800 border-cyan-300',
      permissions: {
        user_mgmt: 'NONE',
        system_settings: 'NONE',
        sample_logging: 'FULL',
        task_assignment: 'FULL',
        stp_upload: 'NONE',
        doc_view: 'FULL',
        testing_entry: 'FULL',
        qc_review: 'VIEW',
        coa_release: 'NONE',
        audit_trail: 'VIEW',
      },
    },
    {
      role: 'QC_ANALYST',
      label: 'QC Analyst',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      permissions: {
        user_mgmt: 'NONE',
        system_settings: 'NONE',
        sample_logging: 'NONE',
        task_assignment: 'NONE',
        stp_upload: 'NONE',
        doc_view: 'FULL',
        testing_entry: 'FULL',
        qc_review: 'NONE',
        coa_release: 'NONE',
        audit_trail: 'NONE',
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all',
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Super Admin Chief Command Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#031333] via-[#072a6b] to-[#041a42] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-900/60">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>★ Super Admin Chief Command Center</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-cyan-200 border border-white/20">
                @{user?.username || 'superadmin'} &bull; {user?.employeeId || 'SA-001'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                System Mode: Unrestricted cGMP Authority
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Enterprise Governance, RBAC &amp; Laboratory Oversight
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-3xl leading-relaxed">
              Full administrative control over all 7 roles, multi-laboratory facilities (General, Penicillin,
              Cephalosporin), regulatory compliance, user credentials, and every operational module.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              size="sm"
              onClick={() => setIsSampleModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Sample</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddUserModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add System User</span>
            </Button>
            <Link
              href="/audit-trail"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all inline-flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>21 CFR Audit Trail</span>
            </Link>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setAdminTab('overview')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              adminTab === 'overview'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>1. Command Overview</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              adminTab === 'users'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>2. User &amp; Role Management ({users.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('rbac')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              adminTab === 'rbac'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>3. RBAC &amp; Permissions Matrix</span>
          </button>

          <button
            onClick={() => setAdminTab('laboratories')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              adminTab === 'laboratories'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Building2 className="w-4 h-4 text-cyan-600" />
            <span>4. Laboratories &amp; Containment</span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              adminTab === 'settings'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-200 hover:bg-white/10 hover:text-white'
            )}
          >
            <Sliders className="w-4 h-4 text-purple-600" />
            <span>5. System Settings &amp; Compliance</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: COMMAND OVERVIEW & MODULE LAUNCHPAD ================= */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Key System Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Active Personnel</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{users.length}</div>
              <p className="text-[11px] text-slate-400">Governed across 7 distinct roles</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Facility QC Samples</span>
                <FlaskConical className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{metrics?.total || 0}</div>
              <p className="text-[11px] text-slate-400">Total samples registered in system</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Active STP Dossiers</span>
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{products.length}</div>
              <p className="text-[11px] text-slate-400">Products with verified testing methods</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Part 11 Audit Trail</span>
                <ShieldCheck className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{auditLogs.length}+</div>
              <p className="text-[11px] text-slate-400">Immutable electronic log entries</p>
            </div>
          </div>

          {/* Full Module Access Launchpad for Super Admin */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Unrestricted Module Launchpad</span>
                </h3>
                <p className="text-xs text-slate-500">
                  As Super Admin, you have authorized execution authority across all modules
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                8 Integrated Modules Online
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/samples"
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-blue-800">
                    Sample Management
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Accession, inspect, track and manage QC samples across all stages
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-blue-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/tasks"
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-800">
                    Sample Allocation Board
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Assign samples to specific analysts and monitor workload
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-indigo-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/documentation-manager"
                className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-teal-800">
                    Documentation Manager
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Manage product folders, upload PDF/Word STPs, and SOP revisions
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-teal-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/testing"
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Microscope className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">
                    Testing Worksheets
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Live analytical testing worksheets, result recording &amp; submission
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-emerald-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/quality-review"
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-purple-800">
                    Quality Review &amp; CoA
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Verify test results, approve batches &amp; release Certificates of Analysis
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-purple-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/dashboard?tab=lab-operations"
                className="p-4 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-cyan-800">
                    Lab Operations (3 Labs)
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Multi-laboratory comparison across General, Penicillin &amp; Cephalosporin
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-cyan-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/audit-trail"
                className="p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-rose-800">
                    21 CFR Audit Trail
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Immutable electronic signature records, user actions &amp; event history
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-rose-600">
                  <span>Open Module</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setAdminTab('users')}
                className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all flex flex-col justify-between text-left group cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs text-slate-900 group-hover:text-amber-800">
                    User &amp; Role Management
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Provision personnel, assign laboratory access, and configure roles
                  </p>
                </div>
                <div className="pt-3 flex items-center justify-between text-[11px] font-semibold text-amber-600">
                  <span>Manage Users</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Grid: Recent Audit Feed & Laboratory Containment Quick Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Laboratory Containment Status */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span>Facility Laboratory Status</span>
                </h3>
                <button
                  onClick={() => setAdminTab('laboratories')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  View Details &rarr;
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span>General Laboratory (GL)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                        Class D cGMP
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Non-beta-lactam testing &bull; {labStats.glUsers} Authorized Personnel
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span>Penicillin Laboratory (PEN)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
                        Negative Pressure
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dedicated AHU-02 &bull; Strict cross-contamination barrier &bull; {labStats.penUsers} Personnel
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span>Cephalosporin Laboratory (CEPH)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-900 font-bold">
                        Dedicated Isolation
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dedicated AHU-03 &bull; HEPA H14 filtration &bull; {labStats.cephUsers} Personnel
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Audit Events */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Recent Security &amp; Compliance Audit Logs</span>
                </h3>
                <Link href="/audit-trail" className="text-xs font-semibold text-blue-600 hover:underline">
                  Full Log &rarr;
                </Link>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent audit events recorded.</p>
                ) : (
                  auditLogs.map((log: any, idx: number) => (
                    <div
                      key={log.id || idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.action || 'LOGGED_EVENT'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(log.timestamp || log.createdAt, 'HH:mm dd/MM/yyyy')}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate">{log.reasonForChange || log.details || 'Event logged'}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>By: {log.performedByName || 'System User'}</span>
                        <span>&bull;</span>
                        <span className="font-mono">Role: {log.role || 'USER'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: USER & ROLE MANAGEMENT ================= */}
      {adminTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Personnel Roster &amp; Access Control</span>
              </h2>
              <p className="text-xs text-slate-500">
                Manage accounts, reassign roles, configure laboratory containment, and reset credentials
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsAddUserModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New User</span>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, emp ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="">All Roles (7 Total)</option>
                <option value="SUPER_ADMIN">1. Super Admin</option>
                <option value="ADMIN">2. Admin</option>
                <option value="DOCUMENTATION_MANAGER">3. Documentation Manager</option>
                <option value="MANAGER">4. QC Manager</option>
                <option value="DEPUTY_MANAGER">5. Deputy Manager</option>
                <option value="SHIFT_INCHARGE">6. Shift Incharge</option>
                <option value="QC_ANALYST">7. QC Analyst</option>
              </select>
            </div>

            <div>
              <select
                value={labFilter}
                onChange={(e) => setLabFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="">All Laboratories</option>
                <option value="GENERAL">General Lab (GL)</option>
                <option value="PENICILLIN">Penicillin Lab (PEN)</option>
                <option value="CEPHALOSPORIN">Cephalosporin Lab (CEPH)</option>
                <option value="ALL">Facility-wide (ALL)</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Accounts Only</option>
                <option value="INACTIVE">Deactivated Accounts Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                  <th className="py-3 px-3.5">Personnel</th>
                  <th className="py-3 px-3.5">Username / Email</th>
                  <th className="py-3 px-3.5">Current Role</th>
                  <th className="py-3 px-3.5">Assigned Laboratory</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No personnel matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleBadgeColor =
                      u.role === 'SUPER_ADMIN'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : u.role === 'ADMIN'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : u.role === 'MANAGER' || u.role === 'QA_MANAGER'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : u.role === 'DEPUTY_MANAGER'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : u.role === 'SHIFT_INCHARGE'
                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        : u.role === 'DOCUMENTATION_MANAGER'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.employeeId}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-mono text-slate-700">@{u.username || '—'}</div>
                          <div className="text-[10px] text-slate-400">{u.email || '—'}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', roleBadgeColor)}>
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 font-medium text-slate-600">
                          {u.assignedLab ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                              {u.assignedLab}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Facility ALL</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              <XCircle className="w-3 h-3" /> Deactivated
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setRoleModalUser(u);
                                setSelectedRole(u.role);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              title="Reassign Role"
                            >
                              Role
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setLabModalUser(u);
                                setSelectedLab(u.assignedLab || 'ALL');
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                              title="Assign Laboratory"
                            >
                              Lab
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPasswordModalUser(u);
                                setNewPassword('');
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              Password
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={cn(
                                'px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer',
                                u.isActive
                                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              )}
                              title={u.isActive ? 'Deactivate User' : 'Reactivate User'}
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
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
      )}

      {/* ================= TAB 3: RBAC & PERMISSIONS MATRIX ================= */}
      {adminTab === 'rbac' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                <span>Role-Based Access Control (RBAC) Governance Matrix</span>
              </h2>
              <p className="text-xs text-slate-500">
                Live authorization map showing allowed, supervised, and restricted operations for each role
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Full Access
              </span>
              <span className="flex items-center gap-1.5 font-bold text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Supervised / View Only
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-400">
                <X className="w-3.5 h-3.5 text-slate-300" /> Restricted
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/90">
                  <th className="py-3 px-4 min-w-[200px]">System Operation / Module</th>
                  {RBAC_ROLES.map((r) => (
                    <th key={r.role} className="py-3 px-3 text-center min-w-[120px]">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', r.color)}>
                        {r.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RBAC_MODULES.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{mod.label}</td>
                    {RBAC_ROLES.map((r) => {
                      const perm = (r.permissions as any)[mod.id];
                      return (
                        <td key={r.role} className="py-3 px-3 text-center">
                          {perm === 'FULL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Check className="w-3 h-3 text-emerald-600" /> Granted
                            </span>
                          )}
                          {perm === 'VIEW' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <Eye className="w-3 h-3 text-amber-600" /> Supervised
                            </span>
                          )}
                          {perm === 'NONE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-medium">
                              <X className="w-3 h-3 text-slate-300" /> Restricted
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: LABORATORIES & CONTAINMENT ================= */}
      {adminTab === 'laboratories' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* General Lab */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">General QC Laboratory</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Code: GL-01 &bull; Class D cGMP</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Facility Type</span>
                  <span className="font-bold text-slate-800">Non-Beta-Lactam Testing</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Sections</span>
                  <span className="font-semibold text-slate-800">Semi-Base &amp; Formulation</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">HVAC Control</span>
                  <span className="font-semibold text-slate-800">Standard Positive Pressure (+15 Pa)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Assigned Analysts</span>
                  <span className="font-bold text-blue-700">{labStats.glUsers} Analysts</span>
                </div>
              </div>

              <Link
                href="/dashboard?tab=lab-operations"
                className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Inspect GL Operations</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Penicillin Lab */}
            <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Penicillin Testing Suite</h3>
                    <p className="text-[10px] text-amber-600 font-mono">Code: PEN-02 &bull; Bio-Containment</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  Isolated
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Facility Type</span>
                  <span className="font-bold text-slate-800">Beta-Lactam Penicillin Suite</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Containment Mode</span>
                  <span className="font-bold text-amber-800">Negative Pressure (-15 Pa)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Air Handling Unit</span>
                  <span className="font-semibold text-slate-800">Dedicated AHU-02 &bull; Exhaust 100%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Assigned Analysts</span>
                  <span className="font-bold text-amber-700">{labStats.penUsers} Dedicated Staff</span>
                </div>
              </div>

              <Link
                href="/dashboard?tab=lab-operations"
                className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Inspect PEN Operations</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Cephalosporin Lab */}
            <div className="bg-white rounded-2xl border border-purple-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                    <Microscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Cephalosporin Suite</h3>
                    <p className="text-[10px] text-purple-600 font-mono">Code: CEPH-03 &bull; Bio-Containment</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                  Isolated
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Facility Type</span>
                  <span className="font-bold text-slate-800">Beta-Lactam Cephalosporin Suite</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Filtration</span>
                  <span className="font-bold text-purple-800">HEPA H14 (99.995% efficiency)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Air Handling Unit</span>
                  <span className="font-semibold text-slate-800">Dedicated AHU-03 &bull; Separate Ducting</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Assigned Analysts</span>
                  <span className="font-bold text-purple-700">{labStats.cephUsers} Dedicated Staff</span>
                </div>
              </div>

              <Link
                href="/dashboard?tab=lab-operations"
                className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Inspect CEPH Operations</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: SYSTEM SETTINGS & COMPLIANCE ================= */}
      {adminTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-600" />
                <span>21 CFR Part 11 Regulatory &amp; Security Settings</span>
              </h2>
              <p className="text-xs text-slate-500">
                Configure facility compliance policies, electronic signature requirements, and session controls
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleSaveSettings}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{settingsSaved ? 'Saved!' : 'Save System Policies'}</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Policy Block 1: Regulatory Electronic Records */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Electronic Signatures &amp; Audit Trail</span>
              </h4>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">Enforce Electronic Signatures</span>
                    <span className="text-[11px] text-slate-500">
                      Require password verification upon worksheet submission and CoA release
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.electronicSignatureEnforced}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, electronicSignatureEnforced: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">Mandatory Reason for Change</span>
                    <span className="text-[11px] text-slate-500">
                      Prompt operator for audit reason before modifying any test result or sample
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.auditTrailReasonRequired}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, auditTrailReasonRequired: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Policy Block 2: Quality Release & Dual-Approval */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Quality Release &amp; OOS Quarantine</span>
              </h4>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">Dual-Authorization for CoA Release</span>
                    <span className="text-[11px] text-slate-500">
                      Require both QC Manager and QA Officer sign-off before Certificate release
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.dualAuthCoaRelease}
                    onChange={(e) => setSystemSettings({ ...systemSettings, dualAuthCoaRelease: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">Automatic OOS Quarantine Flag</span>
                    <span className="text-[11px] text-slate-500">
                      Instantly quarantine sample and alert QC Manager if test falls out of limits
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.automaticOosQuarantine}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, automaticOosQuarantine: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Policy Block 3: Security & Session Inactivity */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Session Lockout &amp; Password Policy</span>
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Inactivity Auto-Logout</span>
                    <span className="text-[11px] text-slate-500">Session terminates after idle period</span>
                  </div>
                  <select
                    value={systemSettings.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, sessionTimeoutMinutes: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Password Rotation Policy</span>
                    <span className="text-[11px] text-slate-500">Force operator password change</span>
                  </div>
                  <select
                    value={systemSettings.passwordExpiryDays}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, passwordExpiryDays: Number(e.target.value) })
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                  >
                    <option value={90}>Every 90 Days</option>
                    <option value={180}>Every 180 Days</option>
                    <option value={0}>Never Expire</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Policy Block 4: Containment Lockdown */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Containment Lockout &amp; Cross-Contamination</span>
              </h4>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">Strict Laboratory Containment Enforcement</span>
                    <span className="text-[11px] text-slate-500">
                      Block Penicillin staff from entering General / Cephalosporin worksheets without decontamination
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.labContainmentLockout}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, labContainmentLockout: e.target.checked })
                    }
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Register Sample Modal */}
      {isSampleModalOpen && (
        <NewSampleModal
          isOpen={isSampleModalOpen}
          onClose={() => setIsSampleModalOpen(false)}
          onSampleCreated={() => {
            setIsSampleModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            queryClient.invalidateQueries({ queryKey: ['superadmin-metrics'] });
            showActionMsg('success', 'Sample registered successfully.');
          }}
        />
      )}

      {/* 2. Add User Modal */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          title="Add New System Personnel"
          subtitle="Provision analytical credentials, department, and initial authorization role"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="e.g. Dr. Asif Mehmood"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUser.employeeId}
                  onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  placeholder="EMP-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  placeholder="asif.qc"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="asif@citypharma.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Assigned cGMP Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="SUPER_ADMIN">1. Super Admin</option>
                  <option value="ADMIN">2. Admin</option>
                  <option value="DOCUMENTATION_MANAGER">3. Documentation Manager</option>
                  <option value="MANAGER">4. QC Manager</option>
                  <option value="DEPUTY_MANAGER">5. Deputy Manager</option>
                  <option value="SHIFT_INCHARGE">6. Shift Incharge</option>
                  <option value="QC_ANALYST">7. QC Analyst</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Laboratory</label>
                <select
                  value={newUser.assignedLab || 'GENERAL'}
                  onChange={(e) => setNewUser({ ...newUser, assignedLab: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="GENERAL">General Lab (GL)</option>
                  <option value="PENICILLIN">Penicillin Lab (PEN)</option>
                  <option value="CEPHALOSPORIN">Cephalosporin Lab (CEPH)</option>
                  <option value="">Facility-Wide / All</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="Quality Control"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create User
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Change Role Modal */}
      {roleModalUser && (
        <Modal
          isOpen={!!roleModalUser}
          onClose={() => setRoleModalUser(null)}
          title={`Update Role for ${roleModalUser.fullName}`}
          subtitle={`Current Role: ${roleModalUser.role} • Employee ID: ${roleModalUser.employeeId}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Changing this role will immediately update the operator's authorized modules, sidebar navigation, and testing actions.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Select New Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="SUPER_ADMIN">1. Super Admin (Full Governance)</option>
                <option value="ADMIN">2. Admin (Operations &amp; Samples)</option>
                <option value="DOCUMENTATION_MANAGER">3. Documentation Manager (STP Dossier)</option>
                <option value="MANAGER">4. QC Manager (Supervision &amp; Allocation)</option>
                <option value="DEPUTY_MANAGER">5. Deputy Manager (Section Oversight)</option>
                <option value="SHIFT_INCHARGE">6. Shift Incharge (Floor Management)</option>
                <option value="QC_ANALYST">7. QC Analyst (Worksheet Execution)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setRoleModalUser(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveRole}>
                Save Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Assign Laboratory Modal */}
      {labModalUser && (
        <Modal
          isOpen={!!labModalUser}
          onClose={() => setLabModalUser(null)}
          title={`Assign Laboratory for ${labModalUser.fullName}`}
          subtitle="Enforce cGMP cross-contamination and containment boundaries"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Laboratory</label>
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="GENERAL">General Laboratory (GL) — Non-Beta-Lactam</option>
                <option value="PENICILLIN">Penicillin Laboratory (PEN) — Bio-Containment Suite</option>
                <option value="CEPHALOSPORIN">Cephalosporin Laboratory (CEPH) — Bio-Containment Suite</option>
                <option value="ALL">All Laboratories / Facility-wide Access</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setLabModalUser(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveLab}>
                Save Laboratory
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Reset Password Modal */}
      {passwordModalUser && (
        <Modal
          isOpen={!!passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          title={`Reset Password for ${passwordModalUser.fullName}`}
          subtitle={`Username: @${passwordModalUser.username || passwordModalUser.employeeId}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setPasswordModalUser(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleSavePassword}>
                Update Password
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
