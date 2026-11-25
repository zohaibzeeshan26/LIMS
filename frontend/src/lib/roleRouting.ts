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

  // 1. Documentation Manager & Product Documentation Officer -> Document Control & Compliance Gateway
  if (
    role === 'DOCUMENTATION_MANAGER' ||
    role === 'PRODUCT_DOCUMENTATION_OFFICER' ||
    dept.includes('documentation') ||
    username.includes('doc') ||
    email.includes('doc')
  ) {
    return '/documentation-manager';
  }

  // 2. QA Manager -> Quality Review & QA Approvals
  if (role === 'QA_MANAGER' || dept.includes('quality assurance') || email.includes('qa')) {
    return '/quality-review';
  }

  // 3. Auditor -> ALCOA+ 21 CFR Part 11 Audit Trail
  if (role === 'AUDITOR' || email.includes('auditor')) {
    return '/audit-trail';
  }

  // 4. HOD, Executive Manager, & HOD Office -> Analytical Executive Dashboard
  if (
    role === 'HOD' ||
    role === 'MANAGER' ||
    username === 'hod' ||
    username === '002' ||
    username === 'admin.office' ||
    username.includes('qc.manager') ||
    email.includes('admin.office')
  ) {
    return '/dashboard';
  }

  // 5. Deputy Manager & Shift Incharge -> Duty & Task Management Gateway
  if (
    role === 'DEPUTY_MANAGER' ||
    role === 'SHIFT_INCHARGE' ||
    username.includes('deputy') ||
    username.includes('shift') ||
    email.includes('deputy') ||
    email.includes('shift')
  ) {
    return '/tasks';
  }

  // 6. QC Analyst, Testing Analyst, Analyst & Sample Intake / Lab Technician -> Worksheets & Samples
  if (
    role === 'QC_ANALYST' ||
    role === 'ANALYST' ||
    role === 'TESTING_ANALYST' ||
    role === 'LAB_TECHNICIAN' ||
    dept.includes('analytical') ||
    dept.includes('accession') ||
    dept.includes('registration') ||
    username.includes('qc') ||
    username.includes('analyst') ||
    username.includes('reg') ||
    email.includes('analyst') ||
    email.includes('reg')
  ) {
    return '/samples';
  }

  // 7. Super Admin & System Admin -> Central LIMS Welcome Portal (Direct access to all 8 modules & labs)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return '/';
  }

  return '/';
}

