import { api } from '@/lib/api';
import { User, Role } from '@/types/lims';

export interface CreateUserData {
  fullName: string;
  email?: string;
  username?: string;
  employeeId: string;
  department: string;
  role: Role;
  assignedLab?: string | null;
  allowedLabs?: string[];
  permissions?: string[];
  password: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  username?: string;
  employeeId?: string;
  department?: string;
  role?: Role;
  assignedLab?: string | null;
  allowedLabs?: string[];
  permissions?: string[];
  isActive?: boolean;
  mustChangePassword?: boolean;
  password?: string;
}

export interface DeleteUserResponse {
  success?: boolean;
  deleted?: boolean;
  deactivated?: boolean;
  message: string;
}

export interface AccessAuditRecord {
  id: string;
  action: string;
  oldRole?: string | null;
  newRole?: string | null;
  changes?: any;
  createdAt: string;
  actor?: { id: string; fullName: string; employeeId: string; role: string } | null;
  targetUser?: { id: string; fullName: string; employeeId: string; role: string } | null;
}

export const userService = {
  getAll: () => api.get<User[]>('/users'),

  getById: (id: string) => api.get<User>(`/users/${id}`),

  getPermissionsCatalog: () => api.get<any>('/users/permissions-catalog'),

  getAccessAudits: (userId?: string) =>
    api.get<AccessAuditRecord[]>(userId ? `/users/access-audits?userId=${encodeURIComponent(userId)}` : '/users/access-audits'),

  create: (data: CreateUserData) => api.post<User>('/users', data),

  update: (id: string, data: UpdateUserData) => api.put<User>(`/users/${id}`, data),

  updateRole: (id: string, role: Role, permissions?: string[]) =>
    api.patch<User>(`/users/${id}/role`, { role, permissions }),

  delete: (id: string) => api.delete<DeleteUserResponse>(`/users/${id}`),
};
