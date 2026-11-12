'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, CreateUserData, UpdateUserData } from '@/services/user.service';
import { User, Role } from '@/types/lims';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  KeyRound,
  FlaskConical,
  Building2,
  Mail,
  User as UserIcon,
  Calendar,
  Lock,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  ArrowLeft,
  Check,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';

const ALL_ROLES: { value: Role; label: string; desc: string; badgeColor: string }[] = [
  { value: 'ADMIN', label: 'Administrator', desc: 'Full system control, personnel & audit access', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'QA_MANAGER', label: 'QA Manager', desc: 'Quality assurance sign-off & release', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'MANAGER', label: 'QC Manager', desc: 'Laboratory operations & workflow oversight', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'DEPUTY_MANAGER', label: 'Deputy Manager', desc: 'Assists QC management & test scheduling', badgeColor: 'bg-indigo-50/70 text-indigo-600 border-indigo-200' },
  { value: 'SHIFT_INCHARGE', label: 'Shift In-Charge', desc: 'Floor supervision & shift management', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'TESTING_ANALYST', label: 'Testing Analyst', desc: 'Analytical test execution & instrument runs', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'QC_ANALYST', label: 'QC Analyst', desc: 'Quality control sample analysis & logging', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'ANALYST', label: 'Analyst', desc: 'Standard sample testing & results reporting', badgeColor: 'bg-blue-50/70 text-blue-600 border-blue-200' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician', desc: 'Sample accessioning & preparation', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'AUDITOR', label: 'Auditor', desc: 'Read-only regulatory compliance review', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const LAB_OPTIONS = [
  { value: 'GENERAL', label: 'General Lab (GL)' },
  { value: 'PENICILLIN', label: 'Penicillin Lab (PEN)' },
  { value: 'CEPHALOSPORIN', label: 'Cephalosporin Lab (CEPH)' },
  { value: '', label: 'All Laboratories / Facility-wide' },
];

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Search & filter state
  const [activeTab, setActiveTab] = useState<'USERS' | 'RBAC_MATRIX' | 'AUTH_POLICIES'>('USERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [labFilter, setLabFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // View screen role change state
  const [selectedNewRole, setSelectedNewRole] = useState<Role | ''>('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Add User
  const [addForm, setAddForm] = useState<CreateUserData>({
    fullName: '',
    email: '',
    username: '',
    employeeId: '',
    department: 'Quality Control',
    role: 'QC_ANALYST',
    assignedLab: 'GENERAL',
    password: '',
    isActive: true,
    mustChangePassword: false,
  });
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // Form states for Edit User
  const [editForm, setEditForm] = useState<UpdateUserData & { passwordConfirmation?: string }>({
    fullName: '',
    email: '',
    username: '',
    employeeId: '',
    department: '',
    role: 'QC_ANALYST',
    assignedLab: '',
    isActive: true,
    mustChangePassword: false,
    password: '',
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Load all users
  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => userService.getAll(),
  });

  // Check if current user is admin
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Add User Mutation
  const addMutation = useMutation({
    mutationFn: (data: CreateUserData) => userService.create(data),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setIsAddModalOpen(false);
      setAddForm({
        fullName: '',
        email: '',
        username: '',
        employeeId: '',
        department: 'Quality Control',
        role: 'QC_ANALYST',
        assignedLab: 'GENERAL',
        password: '',
        isActive: true,
        mustChangePassword: false,
      });
      setAddFormError(null);
      showNotice('success', `User "${newUser.fullName}" created successfully.`);
    },
    onError: (err: any) => {
      setAddFormError(err?.message || 'Failed to create user. Please check entries.');
    },
  });

  // Edit User Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => userService.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      queryClient.invalidateQueries({ queryKey: ['user-detail', updated.id] });
      setEditingUser(null);
      setEditFormError(null);
      showNotice('success', `User "${updated.fullName}" updated successfully.`);
    },
    onError: (err: any) => {
      setEditFormError(err?.message || 'Failed to update user profile.');
    },
  });

  // Role Change Mutation (from View Screen)
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => userService.updateRole(id, role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setViewingUser((prev) => (prev ? { ...prev, role: updated.role } : null));
      showNotice('success', `User role updated to ${updated.role} successfully.`);
    },
    onError: (err: any) => {
      showNotice('error', err?.message || 'Failed to update user role.');
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setDeletingUser(null);
      showNotice('success', res.message);
    },
    onError: (err: any) => {
      showNotice('error', err?.message || 'Failed to delete user.');
    },
  });

  // Status Toggle Mutation (Activate / Deactivate)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      userService.update(id, { isActive }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      showNotice(
        'success',
        `Account for "${updated.fullName}" (@${updated.username || updated.employeeId}) has been ${updated.isActive !== false ? 'Activated' : 'Deactivated'}.`
      );
    },
    onError: (err: any) => {
      showNotice('error', err?.message || 'Failed to update account status.');
    },
  });

  // Dedicated Reset Password Mutation State
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('lab123');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      userService.update(id, { password, mustChangePassword: false }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      setResetPasswordUser(null);
      setNewPasswordVal('lab123');
      setResetPasswordError(null);
      showNotice(
        'success',
        `Password for user "${updated.fullName}" (@${updated.username || updated.employeeId}) has been reset successfully.`
      );
    },
    onError: (err: any) => {
      setResetPasswordError(err?.message || 'Failed to reset user password.');
    },
  });

  const showNotice = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => {
      setActionNotice(null);
    }, 6000);
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        u.employeeId.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        (u.assignedLab && u.assignedLab.toLowerCase().includes(q)) ||
        u.role.toLowerCase().includes(q);

      // Role filter
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      // Lab filter
      const matchesLab =
        labFilter === 'ALL' ||
        (labFilter === 'UNASSIGNED' && !u.assignedLab) ||
        (u.assignedLab && u.assignedLab.toUpperCase().includes(labFilter));

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive !== false) ||
        (statusFilter === 'INACTIVE' && u.isActive === false);

      return matchesSearch && matchesRole && matchesLab && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, labFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const admins = users.filter((u) => u.role === 'ADMIN' || u.role === 'MANAGER' || u.role === 'QA_MANAGER').length;
    const analysts = users.filter((u) => u.role.includes('ANALYST') || u.role.includes('TECHNICIAN')).length;
    return { total, active, admins, analysts };
  }, [users]);

  // Open Edit Modal
  const handleOpenEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditForm({
      fullName: userToEdit.fullName,
      email: userToEdit.email,
      username: userToEdit.username || '',
      employeeId: userToEdit.employeeId,
      department: userToEdit.department,
      role: userToEdit.role,
      assignedLab: userToEdit.assignedLab || '',
      isActive: userToEdit.isActive !== false,
      mustChangePassword: userToEdit.mustChangePassword || false,
      password: '',
    });
    setEditFormError(null);
  };

  // Open View Modal
  const handleOpenView = (userToView: User) => {
    setViewingUser(userToView);
    setSelectedNewRole(userToView.role);
  };

  // Helper for role details
  const getRoleMeta = (role: Role) => {
    return ALL_ROLES.find((r) => r.value === role) || {
      value: role,
      label: role.replace(/_/g, ' '),
      desc: 'Laboratory role',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  // Role Protection Guard: Non-admins cannot access User Management
  if (currentUser && !isSuperAdmin) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted — Super Admin Only</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            The User Management &amp; Security Administration module is strictly reserved for Super Administrators. As an Analyst (@{currentUser.username || currentUser.employeeId}), your access is focused on sample registration, analytical testing, and recording test results.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <span>Return to QC Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Portal Launchpad</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700">RBAC &amp; User Security</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                User Management &amp; Authentication Module (RBAC)
              </h1>
              <p className="text-xs text-slate-500">
                Manage Citi Pharma cGMP analyst credentials, access levels, laboratory assignments, and 21 CFR Part 11 roles.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setAddFormError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('USERS')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'USERS'
              ? 'bg-[#0B1A30] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RBAC_MATRIX')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'RBAC_MATRIX'
              ? 'bg-[#0B1A30] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>RBAC Permissions Matrix (11 Roles)</span>
        </button>

        <button
          onClick={() => setActiveTab('AUTH_POLICIES')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'AUTH_POLICIES'
              ? 'bg-[#0B1A30] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Authentication &amp; Security Policies</span>
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-in slide-in-from-top-2 duration-200',
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'USERS' && (
        <>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Personnel</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{stats.total}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Accounts</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">{stats.active}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">QC & Lab Analysts</p>
            <p className="text-2xl font-black text-sky-600 tracking-tight mt-0.5">{stats.analysts}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <FlaskConical className="h-4 w-4" />
          </div>
        </div>

        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Admins & Managers</p>
            <p className="text-2xl font-black text-purple-600 tracking-tight mt-0.5">{stats.admins}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Shield className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="enterprise-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, email, ID, or lab..."
              className="w-full pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 bg-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="lg:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All cGMP Roles</option>
              {ALL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lab Filter */}
          <div className="lg:col-span-2">
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Labs</option>
              <option value="GENERAL">General Lab</option>
              <option value="PENICILLIN">Penicillin Lab</option>
              <option value="CEPHALOSPORIN">Cephalosporin Lab</option>
              <option value="UNASSIGNED">Unassigned</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-900 font-bold">{filteredUsers.length}</strong> of{' '}
            <strong className="text-slate-900 font-bold">{users.length}</strong> registered laboratory personnel
          </div>
          {(searchQuery || roleFilter !== 'ALL' || labFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setLabFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Users Table */}
      <div className="enterprise-card rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Username &amp; Login</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Designation &amp; Lab</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading laboratory personnel directory...</span>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-rose-500">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                    <span>Failed to load users from database. Please verify backend connection.</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No users match the selected criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting search parameters or add a new user.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleMeta = getRoleMeta(u.role);
                  const isUserActive = u.isActive !== false;
                  const initials = u.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        !isUserActive && 'bg-slate-50/40 opacity-75'
                      )}
                    >
                      {/* User Details */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs',
                              u.role === 'ADMIN'
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : u.role === 'MANAGER' || u.role === 'QA_MANAGER'
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            )}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {u.id === currentUser?.id && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="font-semibold text-slate-600">ID:</span>
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded font-bold text-slate-700">
                                {u.employeeId}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username & Login Info */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-800 text-[11px] flex items-center gap-1.5">
                          <KeyRound className="h-3 w-3 text-slate-400" />
                          <span>{u.username ? `@${u.username}` : 'No username set'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {u.mustChangePassword ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              Pwd reset required
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              Bcrypt Secured
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        <a
                          href={`mailto:${u.email}`}
                          className="hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{u.email}</span>
                        </a>
                      </td>

                      {/* Department & Lab */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{u.department}</span>
                        </div>
                        <div className="mt-1">
                          {u.assignedLab ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border',
                                u.assignedLab.includes('CEPH') || u.assignedLab.includes('SAF')
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : u.assignedLab.includes('PEN')
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              )}
                            >
                              <FlaskConical className="h-2.5 w-2.5" />
                              <span>{u.assignedLab}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Facility-wide</span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border shadow-2xs',
                            roleMeta.badgeColor
                          )}
                        >
                          <Shield className="h-3 w-3 shrink-0" />
                          <span>{roleMeta.label}</span>
                        </span>
                      </td>

                      {/* Status (Click to Toggle) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={u.id === currentUser?.id || toggleStatusMutation.isPending}
                          onClick={() => toggleStatusMutation.mutate({ id: u.id, isActive: !isUserActive })}
                          title={
                            u.id === currentUser?.id
                              ? 'Cannot deactivate your own logged-in account'
                              : `Click to ${isUserActive ? 'Deactivate' : 'Activate'} user account`
                          }
                          className="group inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isUserActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 group-hover:border-emerald-300 transition-colors shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200 transition-colors shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setResetPasswordUser(u);
                              setNewPasswordVal('lab123');
                              setResetPasswordError(null);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 transition-colors shadow-2xs cursor-pointer"
                            title="Reset Password for this user"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          {/* View Button */}
                          <button
                            onClick={() => handleOpenView(u)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
                            title="View Full User Details & Change Role"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                            title="Edit User Information"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={u.id === currentUser?.id}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
                            title={u.id === currentUser?.id ? 'Cannot delete yourself' : 'Delete or Deactivate User'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RBAC PERMISSIONS MATRIX (11 ROLES)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'RBAC_MATRIX' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-500/30">
                  FDA 21 CFR Part 11 Compliance
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Role-Based Access Control (RBAC) Permissions Matrix
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Formal matrix mapping each of the 11 cGMP laboratory roles to permitted operational scopes across Citi Pharma LIMS.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Full Access
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Bench Scoped
                </span>
              </div>
            </div>
          </div>

          <div className="enterprise-card rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Role / Job Title</th>
                    <th className="py-3 px-3 text-center">Sample Registration</th>
                    <th className="py-3 px-3 text-center">Sample Assignment</th>
                    <th className="py-3 px-3 text-center">Testing Worksheets</th>
                    <th className="py-3 px-3 text-center">Review &amp; Verify</th>
                    <th className="py-3 px-3 text-center">QA Release &amp; CoA</th>
                    <th className="py-3 px-3 text-center">Word Docs (.docx)</th>
                    <th className="py-3 px-3 text-center">User Admin &amp; RBAC</th>
                    <th className="py-3 px-3 text-center">Audit Trail Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {/* ADMIN */}
                  <tr className="hover:bg-slate-50/80 font-medium">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                        ADMIN
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Administrator</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Full</td>
                  </tr>

                  {/* QA_MANAGER */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                        QA_MANAGER
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">QA Manager</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Inspect</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Inspect</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Inspect</td>
                    <td className="py-2.5 px-3 text-center text-purple-700 font-bold bg-purple-50/30">Authorize</td>
                    <td className="py-2.5 px-3 text-center text-purple-700 font-bold bg-purple-50/30">Release CoA</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">Upload &amp; View</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-purple-700 font-bold">Full Audit</td>
                  </tr>

                  {/* MANAGER */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        MANAGER
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">QC Manager</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold bg-emerald-50/30">Approve</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-bold bg-indigo-50/30">Assign</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-bold">Supervise</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-bold bg-indigo-50/30">Verify</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Review</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">Upload &amp; View</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-bold">Inspect</td>
                  </tr>

                  {/* DEPUTY_MANAGER */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-indigo-50/70 text-indigo-600 border border-indigo-200">
                        DEPUTY_MANAGER
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Deputy Manager</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">Access</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-bold bg-indigo-50/30">Assign</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">Supervise</td>
                    <td className="py-2.5 px-3 text-center text-indigo-700 font-bold bg-indigo-50/30">Verify</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">View/Download</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Inspect</td>
                  </tr>

                  {/* SHIFT_INCHARGE */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200">
                        SHIFT_INCHARGE
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Shift In-Charge</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">Access</td>
                    <td className="py-2.5 px-3 text-center text-cyan-700 font-bold bg-cyan-50/30">Delegate</td>
                    <td className="py-2.5 px-3 text-center text-cyan-700 font-semibold">Monitor</td>
                    <td className="py-2.5 px-3 text-center text-cyan-700 font-semibold">Preliminary</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">View/Download</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">Read</td>
                  </tr>

                  {/* TESTING_ANALYST */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                        TESTING_ANALYST
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Testing Analyst</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Assigned Only</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-blue-700 font-bold bg-blue-50/30">Bench Assay</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">View/Download</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                  </tr>

                  {/* QC_ANALYST */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                        QC_ANALYST
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">QC Analyst</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Assigned Only</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-sky-700 font-bold bg-sky-50/30">Bench Assay</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">View/Download</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                  </tr>

                  {/* ANALYST */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-50/70 text-blue-600 border border-blue-200">
                        ANALYST
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Analyst</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Assigned Only</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-blue-700 font-bold bg-blue-50/30">Bench Assay</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">View/Download</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                  </tr>

                  {/* LAB_TECHNICIAN */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 border border-teal-200">
                        LAB_TECHNICIAN
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Lab Technician</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-teal-700 font-bold bg-teal-50/30">Accession &amp; Log</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">View</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                  </tr>

                  {/* DOCUMENTATION_MANAGER */}
                  <tr className="hover:bg-slate-50/80 bg-teal-50/20">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-teal-50/40 font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 border border-teal-200">
                        DOCUMENTATION_MANAGER
                      </span>
                      <span className="block text-[11px] font-semibold text-teal-900 mt-0.5">Documentation Manager</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Read</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">Read</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-teal-800 font-bold bg-teal-100/60">Upload, Replace, Version</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-teal-700 font-semibold">Product Audit</td>
                  </tr>

                  {/* AUDITOR */}
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3.5 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        AUDITOR
                      </span>
                      <span className="block text-[11px] font-semibold text-slate-800 mt-0.5">Auditor</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">Read Only</td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">Read Only</td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">Read Only</td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">Read Only</td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">Read Only</td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-semibold">Read Only</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">—</td>
                    <td className="py-2.5 px-3 text-center text-amber-700 font-bold bg-amber-50/40">Full Regulatory Read</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTHENTICATION & SECURITY POLICIES                                 */}
      {/* ========================================================================= */}
      {activeTab === 'AUTH_POLICIES' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: JWT Architecture */}
            <div className="enterprise-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-blue-600">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">
                  JWT Stateless Session Security
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                State-of-the-art dual token architecture with automated background rotation and protected authorization headers.
              </p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs border border-slate-100 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Token Lifetime:</span>
                  <span className="font-mono font-bold text-slate-800">15 minutes (High Security)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Refresh Token Lifetime:</span>
                  <span className="font-mono font-bold text-slate-800">7 days (Encrypted Storage)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Silent Auto-Renewal:</span>
                  <span className="font-bold text-emerald-600">Enabled on 401 Expiry</span>
                </div>
              </div>
            </div>

            {/* Card 2: 21 CFR Part 11 Signatures */}
            <div className="enterprise-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-purple-600">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">
                  21 CFR Part 11 Electronic Signatures
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cryptographic signature hashing on all batch approvals, Certificate of Analysis issuances, and OOS closures.
              </p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs border border-slate-100 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Signature Algorithm:</span>
                  <span className="font-mono font-bold text-purple-700">SHA-256 HMAC Signature</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Re-Authentication:</span>
                  <span className="font-bold text-slate-800">Required on CoA Final Sign-off</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ALCOA+ Traceability:</span>
                  <span className="font-bold text-emerald-600">Immutable Audit Logs</span>
                </div>
              </div>
            </div>

            {/* Card 3: Multi-Lab Isolation */}
            <div className="enterprise-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-teal-600">
                <FlaskConical className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Multi-Laboratory Strict RBAC Isolation
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prevents cross-contamination of testing records between General, Cephalosporin, and Penicillin facilities.
              </p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs border border-slate-100 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">General Lab (GL):</span>
                  <span className="font-bold text-blue-700">Oral Solids &amp; Liquids</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cephalosporin (CEPH):</span>
                  <span className="font-bold text-purple-700">Sterile Area Facility (SAF)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penicillin (PEN):</span>
                  <span className="font-bold text-amber-700">Dedicated Penicillin Block</span>
                </div>
              </div>
            </div>

            {/* Card 4: Credential Security */}
            <div className="enterprise-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-600">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Credential Security &amp; Password Policies
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Secure password management, one-way cryptographic salting, and Part 11 compliant personnel deactivation.
              </p>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs border border-slate-100 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Password Encryption:</span>
                  <span className="font-mono font-bold text-slate-800">Bcrypt (Salt Rounds: 10)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Part 11 Deletion Policy:</span>
                  <span className="font-bold text-slate-800">Safe Deactivation (Preserves History)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">First-Time Login Flag:</span>
                  <span className="font-bold text-emerald-600">mustChangePassword Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VIEW USER MODAL (Displays complete user info & allows changing roles)  */}
      {/* ========================================================================= */}
      {viewingUser && (
        <Modal
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          title="User Profile & Access Control"
          subtitle={`Complete cGMP record for ${viewingUser.fullName} (${viewingUser.employeeId})`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Header Persona Banner */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-sm">
                {viewingUser.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 truncate">{viewingUser.fullName}</h3>
                  <span
                    className={cn(
                      'text-[9px] font-bold px-2 py-0.5 rounded border',
                      viewingUser.isActive !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    )}
                  >
                    {viewingUser.isActive !== false ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingUser.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold">
                    Employee ID: {viewingUser.employeeId}
                  </span>
                  {viewingUser.username && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold">
                      @{viewingUser.username}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Complete User Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Department</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5">{viewingUser.department}</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Laboratory</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  {viewingUser.assignedLab || 'All Laboratories (Facility-wide)'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current cGMP Role</p>
                <p className="font-bold text-blue-600 text-xs mt-0.5">{getRoleMeta(viewingUser.role).label}</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Security / Password Status</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  {viewingUser.mustChangePassword
                    ? 'Requires password change on next login'
                    : 'Standard password active (Bcrypt Hashed)'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Last Login</p>
                <p className="font-mono text-slate-700 text-xs mt-0.5">
                  {viewingUser.lastLogin ? new Date(viewingUser.lastLogin).toLocaleString() : 'Never logged in'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account Created</p>
                <p className="font-mono text-slate-700 text-xs mt-0.5">
                  {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Historical Lab Activity Summary */}
            {viewingUser._count && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Laboratory Activity & Traceability
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <p className="text-lg font-black text-blue-700">{viewingUser._count.accessionedSamples || 0}</p>
                    <p className="text-[10px] font-semibold text-slate-600">Accessioned Samples</p>
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100">
                    <p className="text-lg font-black text-indigo-700">{viewingUser._count.performedTests || 0}</p>
                    <p className="text-[10px] font-semibold text-slate-600">Performed Tests</p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100">
                    <p className="text-lg font-black text-purple-700">{viewingUser._count.calibrations || 0}</p>
                    <p className="text-[10px] font-semibold text-slate-600">Calibrations Logged</p>
                  </div>
                </div>
              </div>
            )}

            {/* Role Modification Section (Authorized Admins) */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h4 className="font-bold text-xs text-slate-900">
                  Authorized Administrator Action: Change User Role
                </h4>
              </div>
              <p className="text-[11px] text-slate-600">
                Administrators can directly promote, reassign, or adjust system permissions for this personnel record in accordance with 21 CFR Part 11 electronic identity rules.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <div className="flex-1">
                  <select
                    value={selectedNewRole}
                    onChange={(e) => setSelectedNewRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} — {r.desc}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!selectedNewRole || selectedNewRole === viewingUser.role || roleMutation.isPending}
                  onClick={() => {
                    if (selectedNewRole && selectedNewRole !== viewingUser.role) {
                      roleMutation.mutate({ id: viewingUser.id, role: selectedNewRole as Role });
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {roleMutation.isPending ? 'Updating Role...' : 'Save Role Change'}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const u = viewingUser;
                  setViewingUser(null);
                  handleOpenEdit(u);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Full Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD NEW USER MODAL                                                     */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Laboratory User"
          subtitle="Provision analytical credentials, assign laboratory department, and configure cGMP role"
          maxWidth="2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAddFormError(null);
              if (!addForm.fullName.trim() || !addForm.employeeId.trim() || !addForm.password) {
                setAddFormError('Please fill in all required fields marked with *.');
                return;
              }
              if (addForm.password.length < 6) {
                setAddFormError('Password must be at least 6 characters long.');
                return;
              }
              const cleanEmpId = addForm.employeeId.trim().toUpperCase();
              const autoEmail = addForm.email?.trim() || `${(addForm.username || cleanEmpId).toLowerCase().replace(/[^a-z0-9]/g, '')}@citypharma.local`;
              addMutation.mutate({
                ...addForm,
                employeeId: cleanEmpId,
                email: autoEmail,
              });
            }}
            className="space-y-4"
          >
            {addFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{addFormError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Ayesha Khan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.employeeId}
                  onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value.toUpperCase() })}
                  placeholder="e.g. EMP-104"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Username <span className="text-slate-400 font-normal">(optional login alias)</span>
                </label>
                <input
                  type="text"
                  value={addForm.username || ''}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="e.g. ayesha.khan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.department}
                  onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                  placeholder="e.g. Quality Control, Analytical R&D"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Assigned Lab */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Laboratory</label>
                <select
                  value={addForm.assignedLab || ''}
                  onChange={(e) => setAddForm({ ...addForm, assignedLab: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {LAB_OPTIONS.map((lab) => (
                    <option key={lab.value} value={lab.value}>
                      {lab.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  cGMP Role & System Permissions <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Initial Password */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Initial Password <span className="text-rose-500">*</span>{' '}
                  <span className="text-[10px] text-slate-400 font-normal">(min 6 characters, securely hashed with bcrypt)</span>
                </label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Enter initial password (e.g. Password@123)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.mustChangePassword}
                  onChange={(e) => setAddForm({ ...addForm, mustChangePassword: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Require password change on first login</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.isActive}
                  onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Account active immediately</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {addMutation.isPending ? 'Creating User...' : 'Create User Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT USER MODAL                                                        */}
      {/* ========================================================================= */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="Edit Laboratory User"
          subtitle={`Update profile, laboratory assignment, role, or credentials for ${editingUser.fullName}`}
          maxWidth="2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditFormError(null);
              if (!editForm.fullName?.trim() || !editForm.employeeId?.trim()) {
                setEditFormError('Full Name and Employee ID are required.');
                return;
              }
              if (editForm.password && editForm.password.trim().length > 0 && editForm.password.trim().length < 6) {
                setEditFormError('New password must be at least 6 characters long.');
                return;
              }

              const payload: UpdateUserData = {
                fullName: editForm.fullName,
                email: editForm.email || undefined,
                username: editForm.username || undefined,
                employeeId: editForm.employeeId,
                department: editForm.department,
                role: editForm.role,
                assignedLab: editForm.assignedLab || null,
                isActive: editForm.isActive,
                mustChangePassword: editForm.mustChangePassword,
                password: editForm.password && editForm.password.trim().length > 0 ? editForm.password.trim() : undefined,
              };

              editMutation.mutate({ id: editingUser.id, data: payload });
            }}
            className="space-y-4"
          >
            {editFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{editFormError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName || ''}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  value={editForm.employeeId || ''}
                  onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={editForm.department || ''}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Assigned Lab */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Laboratory</label>
                <select
                  value={editForm.assignedLab || ''}
                  onChange={(e) => setEditForm({ ...editForm, assignedLab: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {LAB_OPTIONS.map((lab) => (
                    <option key={lab.value} value={lab.value}>
                      {lab.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">cGMP Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Password */}
              <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reset Password <span className="text-[10px] text-slate-400 font-normal">(Leave empty to keep existing password unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password || ''}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password (optional)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">Account Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.mustChangePassword}
                  onChange={(e) => setEditForm({ ...editForm, mustChangePassword: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Require password change on next login</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {editMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. DELETE / DEACTIVATE CONFIRMATION MODAL                                */}
      {/* ========================================================================= */}
      {deletingUser && (
        <Modal
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          title="Confirm User Deletion"
          subtitle={`Are you sure you want to remove user "${deletingUser.fullName}"?`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">21 CFR Part 11 Integrity Safeguard</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  If this user has accessioned samples, logged tests, or recorded audit events, permanent deletion is prevented to protect regulatory data integrity. In such cases, the account will be safely deactivated instead.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1">
              <p>
                <span className="font-semibold text-slate-500">Name:</span>{' '}
                <strong className="text-slate-900">{deletingUser.fullName}</strong>
              </p>
              <p>
                <span className="font-semibold text-slate-500">Employee ID:</span>{' '}
                <span className="font-mono text-slate-800">{deletingUser.employeeId}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-500">Email:</span>{' '}
                <span className="font-mono text-slate-800">{deletingUser.email}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-500">Role:</span>{' '}
                <span className="font-bold text-slate-800">{getRoleMeta(deletingUser.role).label}</span>
              </p>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {deleteMutation.isPending ? 'Processing...' : 'Confirm Deletion / Deactivation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. DEDICATED RESET PASSWORD MODAL (Super Admin Account Management)        */}
      {/* ========================================================================= */}
      {resetPasswordUser && (
        <Modal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          title="Reset User Password"
          subtitle={`Set new login credentials for ${resetPasswordUser.fullName}`}
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPasswordVal || newPasswordVal.length < 6) {
                setResetPasswordError('Password must be at least 6 characters long.');
                return;
              }
              resetPasswordMutation.mutate({
                id: resetPasswordUser.id,
                password: newPasswordVal,
              });
            }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-blue-600" />
                <span>Super Admin Credential Reset</span>
              </div>
              <p className="mt-1 text-[11px] text-blue-700 leading-relaxed">
                When a laboratory user forgets their password, Super Admin can issue a new password immediately. The password will be encrypted using bcrypt.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
              <div>
                <span className="text-slate-500 font-semibold">User:</span>{' '}
                <strong className="text-slate-900">{resetPasswordUser.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Username:</span>{' '}
                <span className="font-mono font-bold text-slate-800">@{resetPasswordUser.username || resetPasswordUser.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Employee ID:</span>{' '}
                <span className="font-mono text-slate-700">{resetPasswordUser.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Role:</span>{' '}
                <span className="font-bold text-indigo-700">{resetPasswordUser.role}</span>
              </div>
            </div>

            {resetPasswordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {resetPasswordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={(e) => {
                    setNewPasswordVal(e.target.value);
                    setResetPasswordError(null);
                  }}
                  placeholder="Enter new password (min. 6 characters)"
                  className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setNewPasswordVal(`CP-${Math.floor(100000 + Math.random() * 900000)}`)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  Generate
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Default standard laboratory password is <code className="bg-slate-100 px-1 py-0.2 rounded font-bold">lab123</code></p>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {resetPasswordMutation.isPending ? 'Updating...' : 'Set & Save Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
