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
  isActive?: boolean;
  mustChangePassword?: boolean;
  password?: string;
}

export interface DeleteUserResponse {
  success: boolean;
  deleted: boolean;
  deactivated: boolean;
  message: string;
}

export const userService = {
  getAll: () => api.get<User[]>('/users'),

  getById: (id: string) => api.get<User>(`/users/${id}`),

  create: (data: CreateUserData) => api.post<User>('/users', data),

  update: (id: string, data: UpdateUserData) => api.put<User>(`/users/${id}`, data),

  updateRole: (id: string, role: Role) => api.patch<User>(`/users/${id}/role`, { role }),

  delete: (id: string) => api.delete<DeleteUserResponse>(`/users/${id}`),
};
