import { Role } from '@/types/lims';

export interface UserRoutingInfo {
  role?: Role | string;
  department?: string;
  username?: string;
  email?: string;
}

/**
 * Maps an authenticated user to their role-based operational dashboard in Citi Pharma LIMS.
 */
export function getRoleDashboardPath(user: UserRoutingInfo | null | undefined): string {
  if (!user || !user.role) return '/';
  const role = (user.role || '').toUpperCase();
  const dept = (user.department || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const email = (user.email || '').toLowerCase();

  // Documentation Manager -> Document Control & Compliance Gateway
  if (
    role === 'DOCUMENTATION_MANAGER' ||
    dept.includes('documentation') ||
    username.includes('doc') ||
    email.includes('doc')
  ) {
    return '/documentation-manager';
  }

  // QC Analyst / Testing Analyst -> Samples Testing & Analytical Worksheets
  if (
    role === 'QC_ANALYST' ||
    role === 'ANALYST' ||
    role === 'TESTING_ANALYST' ||
    dept.includes('analytical') ||
    username.includes('qc') ||
    username.includes('analyst') ||
    email.includes('analyst')
  ) {
    return '/samples';
  }

  // Deputy Manager / Shift Incharge -> Duty & Task Management Gateway
  if (
    role === 'DEPUTY_MANAGER' ||
    role === 'SHIFT_INCHARGE' ||
    username.includes('deputy') ||
    email.includes('deputy')
  ) {
    return '/tasks';
  }

  // Sample Registration / Lab Technician -> Sample Accessioning & Intake
  if (
    role === 'LAB_TECHNICIAN' ||
    dept.includes('accession') ||
    dept.includes('registration') ||
    username.includes('reg') ||
    email.includes('reg')
  ) {
    return '/samples';
  }

  // QA Manager -> Quality Review & QA Approvals
  if (role === 'QA_MANAGER' || dept.includes('quality assurance') || email.includes('qa')) {
    return '/quality-review';
  }

  // Auditor -> ALCOA+ 21 CFR Part 11 Audit Trail
  if (role === 'AUDITOR' || email.includes('auditor')) {
    return '/audit-trail';
  }

  // HOD / Head of Department Office -> Executive Analytical Dashboard
  if (role === 'HOD' || username === 'admin.office' || email.includes('admin.office')) {
    return '/dashboard';
  }

  // Super Admin & Admin -> Central LIMS Welcome Portal (Direct access to all 8 modules & labs)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return '/';
  }

  return '/';
}

