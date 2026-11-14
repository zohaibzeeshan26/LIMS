import { SetMetadata } from '@nestjs/common';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  HOD = 'HOD',
  MANAGER = 'MANAGER',
  DEPUTY_MANAGER = 'DEPUTY_MANAGER',
  SHIFT_INCHARGE = 'SHIFT_INCHARGE',
  TESTING_ANALYST = 'TESTING_ANALYST',
  ANALYST = 'ANALYST',
  QA_MANAGER = 'QA_MANAGER',
  QC_ANALYST = 'QC_ANALYST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  AUDITOR = 'AUDITOR',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
