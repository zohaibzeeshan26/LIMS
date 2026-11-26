import { Role } from '@/types/lims';
import { getEffectiveUserPermissions, getPermittedWorkAreas } from './rbac';

export interface UserRoutingInfo {
  role?: Role | string;
  department?: string;
  username?: string;
  email?: string;
  permissions?: string[];
  allowedLabs?: string[];
  mustChangePassword?: boolean;
}

/**
 * Maps an authenticated user to their role-based / permission-based landing page.
 */
export function getRoleDashboardPath(user: UserRoutingInfo | null | undefined): string {
  if (!user || !user.role) return '/login';

  if (user.mustChangePassword) {
    return '/change-password';
  }

  const role = (user.role || '').toUpperCase();

  // Super Admin & Admin -> Main Portal / Dashboard
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return '/';
  }

  // HOD -> Executive Dashboard
  if (role === 'HOD') {
    return '/dashboard';
  }

  // Manager & Assistant Manager -> Operational Dashboard
  if (role === 'MANAGER' || role === 'SHIFT_INCHARGE' || role === 'ASSISTANT_MANAGER' || role === 'DEPUTY_MANAGER') {
    return '/dashboard';
  }

  // Analyst & Sr. Analyst -> Assigned Testing Work
  if (role === 'ANALYST' || role === 'TESTING_ANALYST' || role === 'QC_ANALYST') {
    return '/testing';
  }

  // Data Entry Operator & Documentation roles -> Document Work
  if (
    role === 'DATA_ENTRY_OPERATOR' ||
    role === 'DOCUMENTATION_MANAGER' ||
    role === 'PRODUCT_DOCUMENTATION_OFFICER'
  ) {
    return '/documentation-manager';
  }

  // Permission-based routing for custom/standard USER accounts
  const perms = getEffectiveUserPermissions(user);
  if (perms.length === 0) {
    return '/'; // AppShell shows "No Access - Contact Admin" screen with Logout button
  }

  const areas = getPermittedWorkAreas(user);
  if (areas.length === 1) {
    return areas[0].href;
  }

  return '/';
}
