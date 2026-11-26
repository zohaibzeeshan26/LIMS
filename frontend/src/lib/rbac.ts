export interface PermissionMeta {
  key: string;
  label: string;
  action: string;
  isPrivileged?: boolean;
}

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: PermissionMeta[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'dashboard',
    label: 'Dashboard & Operations',
    permissions: [
      { key: 'dashboard.view', label: 'View QC Dashboard & Analytics', action: 'view' },
      { key: 'lab_operations.view', label: 'View Lab Operations', action: 'view' },
      { key: 'activity.view', label: 'View Daily Working Activity', action: 'view' },
      { key: 'priority_notice.view', label: 'View Priority Notices', action: 'view' },
    ],
  },
  {
    module: 'samples',
    label: 'Sample Registration',
    permissions: [
      { key: 'samples.view', label: 'View Samples', action: 'view' },
      { key: 'samples.create', label: 'Register / Create Samples', action: 'create' },
      { key: 'samples.edit', label: 'Edit / Submit / Archive Samples', action: 'edit' },
    ],
  },
  {
    module: 'tasks',
    label: 'Sample Assignment',
    permissions: [
      { key: 'tasks.view', label: 'View Sample Assignments', action: 'view' },
      { key: 'tasks.assign', label: 'Assign Samples to Analysts', action: 'assign' },
      { key: 'tasks.edit', label: 'Edit Task Assignments', action: 'edit' },
    ],
  },
  {
    module: 'testing',
    label: 'Testing & Worksheets',
    permissions: [
      { key: 'testing.view', label: 'View Testing Worksheets & Specs', action: 'view' },
      { key: 'testing.execute', label: 'Perform Tests & Submit Results', action: 'execute' },
      { key: 'testing.edit', label: 'Edit Test Results', action: 'edit' },
      { key: 'testing.verify', label: 'Verify / Approve Test Results', action: 'approve' },
    ],
  },
  {
    module: 'documents',
    label: 'Documents & Products',
    permissions: [
      { key: 'documents.view', label: 'View Products & PDF Documents', action: 'view' },
      { key: 'documents.create_product', label: 'Create Product Records', action: 'create' },
      { key: 'documents.upload', label: 'Upload / Replace PDF Documents', action: 'upload' },
      { key: 'documents.delete', label: 'Delete Products / Request Doc Deletion', action: 'delete' },
      {
        key: 'documents.approve_deletion',
        label: 'Approve / Reject Document Deletions (Superadmin & HOD only)',
        action: 'approve',
        isPrivileged: true,
      },
    ],
  },
  {
    module: 'batches',
    label: 'Quality Review, Batches & CoA',
    permissions: [
      { key: 'batches.view', label: 'View Batches & CoAs', action: 'view' },
      { key: 'batches.create', label: 'Create Batches & Generate CoAs', action: 'create' },
      { key: 'batches.approve', label: 'Release / Approve Batches & CoAs', action: 'approve' },
    ],
  },
  {
    module: 'oos',
    label: 'OOS Incidents',
    permissions: [
      { key: 'oos.view', label: 'View OOS Incidents', action: 'view' },
      { key: 'oos.create', label: 'Report OOS Incidents', action: 'create' },
      { key: 'oos.edit', label: 'Investigate / Edit OOS Incidents', action: 'edit' },
      { key: 'oos.approve', label: 'Approve / Close OOS Incidents', action: 'approve' },
    ],
  },
  {
    module: 'instruments',
    label: 'Instruments & Laboratories',
    permissions: [
      { key: 'instruments.view', label: 'View Labs, Instruments & Categories', action: 'view' },
      { key: 'instruments.create', label: 'Create Instruments & Categories', action: 'create' },
      { key: 'instruments.edit', label: 'Edit / Log Instrument Calibrations', action: 'edit' },
    ],
  },
  {
    module: 'askprol',
    label: 'Askprol QC Reports',
    permissions: [
      { key: 'askprol.view', label: 'View Askprol QC Reports', action: 'view' },
      { key: 'askprol.create', label: 'Calculate & Create Askprol Reports', action: 'create' },
      { key: 'askprol.delete', label: 'Delete Askprol Reports', action: 'delete' },
    ],
  },
  {
    module: 'audit',
    label: 'Audit Trail (HOD / Admin)',
    permissions: [
      { key: 'audit.view', label: 'View Audit Trail', action: 'view', isPrivileged: true },
      { key: 'audit.create', label: 'Log Audit Entries', action: 'create', isPrivileged: true },
    ],
  },
  {
    module: 'users',
    label: 'User & Role Management (Superadmin / Admin)',
    permissions: [
      { key: 'users.view', label: 'View Users & Access Audits', action: 'view', isPrivileged: true },
      { key: 'users.create', label: 'Create Users', action: 'create', isPrivileged: true },
      { key: 'users.edit', label: 'Edit Users, Status, Password & Permissions', action: 'edit', isPrivileged: true },
      { key: 'users.delete', label: 'Delete / Deactivate Users', action: 'delete', isPrivileged: true },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
export const PRIVILEGED_PERMISSION_KEYS = new Set(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.filter((p) => p.isPrivileged).map((p) => p.key))
);
const OPERATIONAL_ALL = ALL_PERMISSION_KEYS.filter((k) => !PRIVILEGED_PERMISSION_KEYS.has(k));

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [...ALL_PERMISSION_KEYS],
  ADMIN: ALL_PERMISSION_KEYS.filter((k) => k !== 'documents.approve_deletion'),
  HOD: [
    'dashboard.view', 'lab_operations.view', 'activity.view', 'priority_notice.view',
    'samples.view', 'tasks.view', 'testing.view', 'documents.view', 'documents.approve_deletion',
    'batches.view', 'oos.view', 'instruments.view', 'askprol.view', 'audit.view', 'audit.create', 'users.view',
  ],
  MANAGER: [...OPERATIONAL_ALL],
  DEPUTY_MANAGER: [...OPERATIONAL_ALL],
  SHIFT_INCHARGE: [...OPERATIONAL_ALL],
  ASSISTANT_MANAGER: [...OPERATIONAL_ALL],
  ANALYST: ['samples.view', 'tasks.view', 'testing.view', 'testing.execute', 'testing.edit'],
  TESTING_ANALYST: ['samples.view', 'tasks.view', 'testing.view', 'testing.execute', 'testing.edit'],
  QC_ANALYST: ['samples.view', 'tasks.view', 'testing.view', 'testing.execute', 'testing.edit'],
  DATA_ENTRY_OPERATOR: ['documents.view', 'documents.create_product', 'documents.upload'],
  QA_MANAGER: [
    'dashboard.view', 'activity.view', 'samples.view', 'testing.view', 'testing.verify',
    'documents.view', 'batches.view', 'batches.create', 'batches.approve',
    'oos.view', 'oos.create', 'oos.edit', 'oos.approve', 'instruments.view', 'askprol.view',
  ],
  LAB_TECHNICIAN: ['samples.view', 'samples.create', 'samples.edit', 'instruments.view', 'instruments.create'],
  DOCUMENTATION_MANAGER: ['documents.view', 'documents.create_product', 'documents.upload', 'documents.delete'],
  PRODUCT_DOCUMENTATION_OFFICER: ['documents.view', 'documents.create_product', 'documents.upload'],
  AUDITOR: [
    'dashboard.view', 'activity.view', 'samples.view', 'testing.view', 'documents.view',
    'batches.view', 'oos.view', 'instruments.view', 'askprol.view', 'audit.view',
  ],
  USER: [],
};

export const OPERATIONAL_CEILING_ROLES = new Set([
  'MANAGER', 'SHIFT_INCHARGE', 'ASSISTANT_MANAGER', 'DEPUTY_MANAGER',
  'ANALYST', 'TESTING_ANALYST', 'QC_ANALYST', 'DATA_ENTRY_OPERATOR', 'LAB_TECHNICIAN', 'USER',
]);

export interface RbacUserLike {
  role?: string;
  permissions?: string[];
  allowedLabs?: string[];
  assignedLab?: string | null;
}

export function getEffectiveUserPermissions(user: RbacUserLike | null | undefined): string[] {
  if (!user) return [];
  const role = (user.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return ALL_PERMISSION_KEYS;
  if (Array.isArray(user.permissions)) return user.permissions;
  return ROLE_DEFAULT_PERMISSIONS[role] || [];
}

export function hasPermission(user: RbacUserLike | null | undefined, perm: string): boolean {
  if (!user) return false;
  if ((user.role || '').toUpperCase() === 'SUPER_ADMIN') return true;
  return getEffectiveUserPermissions(user).includes(perm);
}

export function hasAnyPermission(user: RbacUserLike | null | undefined, perms: string[]): boolean {
  if (!user) return false;
  if ((user.role || '').toUpperCase() === 'SUPER_ADMIN') return true;
  const userPerms = getEffectiveUserPermissions(user);
  return perms.some((p) => userPerms.includes(p));
}

export function getAllowedLabs(user: RbacUserLike | null | undefined): string[] {
  const allLabs = ['GENERAL', 'PENICILLIN', 'CEPHALOSPORIN'];
  if (!user) return allLabs;
  if (Array.isArray(user.allowedLabs) && user.allowedLabs.length > 0) {
    return user.allowedLabs.map((l) => l.toUpperCase());
  }
  if (user.assignedLab && user.assignedLab.toUpperCase() !== 'ALL') {
    return [user.assignedLab.toUpperCase()];
  }
  return allLabs;
}

export interface WorkAreaDef {
  id: string;
  href: string;
  requiredAny: string[];
}

export const WORK_AREAS: WorkAreaDef[] = [
  { id: 'dashboard', href: '/dashboard', requiredAny: ['dashboard.view'] },
  { id: 'lab-operations', href: '/lab-operations', requiredAny: ['lab_operations.view'] },
  { id: 'daily-working-activity', href: '/daily-working-activity', requiredAny: ['activity.view'] },
  { id: 'priority-notice', href: '/priority-notice', requiredAny: ['priority_notice.view'] },
  { id: 'samples', href: '/samples', requiredAny: ['samples.view', 'samples.create', 'samples.edit'] },
  { id: 'tasks', href: '/tasks', requiredAny: ['tasks.view', 'tasks.assign', 'tasks.edit'] },
  { id: 'testing', href: '/testing', requiredAny: ['testing.view', 'testing.execute', 'testing.edit', 'testing.verify'] },
  { id: 'documentation', href: '/documentation-manager', requiredAny: ['documents.view', 'documents.create_product', 'documents.upload', 'documents.delete', 'documents.approve_deletion'] },
  { id: 'quality-review', href: '/quality-review', requiredAny: ['batches.view', 'batches.create', 'batches.approve'] },
  { id: 'oos', href: '/oos', requiredAny: ['oos.view', 'oos.create', 'oos.edit', 'oos.approve'] },
  { id: 'instruments', href: '/instruments', requiredAny: ['instruments.view', 'instruments.create', 'instruments.edit'] },
  { id: 'askprol', href: '/askprol', requiredAny: ['askprol.view', 'askprol.create', 'askprol.delete'] },
  { id: 'audit-trail', href: '/audit-trail', requiredAny: ['audit.view'] },
  { id: 'users', href: '/users', requiredAny: ['users.view', 'users.create', 'users.edit'] },
];

export function getPermittedWorkAreas(user: RbacUserLike | null | undefined): WorkAreaDef[] {
  if (!user) return [];
  return WORK_AREAS.filter((area) => hasAnyPermission(user, area.requiredAny));
}

export function canAccessPath(user: RbacUserLike | null | undefined, pathname: string): boolean {
  if (!user) return false;
  if ((user.role || '').toUpperCase() === 'SUPER_ADMIN') return true;
  if (pathname === '/' || pathname === '/change-password' || pathname === '/login') return true;
  if (pathname.startsWith('/dashboard')) return hasAnyPermission(user, ['dashboard.view', 'lab_operations.view']);
  if (pathname.startsWith('/lab-operations')) return hasAnyPermission(user, ['lab_operations.view', 'dashboard.view']);
  if (pathname.startsWith('/daily-working-activity')) return hasPermission(user, 'activity.view');
  if (pathname.startsWith('/priority-notice')) return hasPermission(user, 'priority_notice.view');
  if (pathname.startsWith('/samples')) return hasAnyPermission(user, ['samples.view', 'samples.create', 'samples.edit']);
  if (pathname.startsWith('/tasks')) return hasAnyPermission(user, ['tasks.view', 'tasks.assign', 'tasks.edit']);
  if (pathname.startsWith('/testing')) return hasAnyPermission(user, ['testing.view', 'testing.execute', 'testing.edit', 'testing.verify']);
  if (pathname.startsWith('/documentation-manager') || pathname.startsWith('/product-documentation')) {
    return hasAnyPermission(user, ['documents.view', 'documents.create_product', 'documents.upload', 'documents.delete', 'documents.approve_deletion']);
  }
  if (pathname.startsWith('/quality-review') || pathname.startsWith('/batches') || pathname.startsWith('/coa')) {
    return hasAnyPermission(user, ['batches.view', 'batches.create', 'batches.approve']);
  }
  if (pathname.startsWith('/oos')) return hasAnyPermission(user, ['oos.view', 'oos.create', 'oos.edit', 'oos.approve']);
  if (pathname.startsWith('/instruments')) return hasAnyPermission(user, ['instruments.view', 'instruments.create', 'instruments.edit']);
  if (pathname.startsWith('/askprol')) return hasAnyPermission(user, ['askprol.view', 'askprol.create', 'askprol.delete']);
  if (pathname.startsWith('/audit')) return hasPermission(user, 'audit.view');
  if (pathname.startsWith('/users')) return hasAnyPermission(user, ['users.view', 'users.create', 'users.edit']);
  return true;
}

