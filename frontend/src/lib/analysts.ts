'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AnalystUserOption {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  department: string;
  lab: 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' | 'ALL';
  isActive?: boolean;
  employeeId?: string;
}

export const STATIC_ANALYSTS: AnalystUserOption[] = [];

/**
 * Determines whether a given user role corresponds to an analytical testing personnel.
 * Strictly excludes administrative, managerial, and intake personnel.
 */
export function isAnalystRole(role: string): boolean {
  const r = (role || '').toUpperCase();
  if (
    r === 'SUPER_ADMIN' ||
    r === 'ADMIN' ||
    r === 'HOD' ||
    r === 'MANAGER' ||
    r === 'DEPUTY_MANAGER' ||
    r === 'QA_MANAGER' ||
    r === 'LAB_TECHNICIAN' ||
    r === 'AUDITOR' ||
    r === 'DOCUMENTATION_MANAGER' ||
    r === 'PRODUCT_DOCUMENTATION_OFFICER'
  ) {
    return false;
  }
  return r === 'QC_ANALYST' || r === 'ANALYST' || r === 'TESTING_ANALYST' || r.includes('ANALYST');
}

/**
 * Hook to retrieve real-time personnel & analysts strictly from the database.
 * Only genuine analysts added in User Management are displayed!
 */
export function useAllAnalysts(): { analysts: AnalystUserOption[]; isLoading: boolean; refetch: () => void } {
  const { data: dbUsers, isLoading, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<any[]>('/users'),
    staleTime: 1000,
  });

  const analysts = useMemo(() => {
    if (!dbUsers || !Array.isArray(dbUsers)) return [];

    return dbUsers
      .filter((u: any) => u.isActive !== false && isAnalystRole(u.role))
      .map((u: any) => {
      const assignedLabUpper = (u.assignedLab || '').toUpperCase();
      const labKey: 'GENERAL' | 'PENICILLIN' | 'CEPHALOSPORIN' | 'ALL' =
        assignedLabUpper === 'PENICILLIN'
          ? 'PENICILLIN'
          : assignedLabUpper === 'CEPHALOSPORIN' || assignedLabUpper === 'SAF'
          ? 'CEPHALOSPORIN'
          : assignedLabUpper === 'ALL'
          ? 'ALL'
          : 'GENERAL';

      return {
        id: u.id || u.employeeId,
        dbId: u.id,
        name: u.fullName || u.username || 'Personnel',
        username: u.username || u.employeeId?.toLowerCase() || '',
        email: u.email || '',
        role: u.role || 'QC Analyst',
        department: u.department || 'Quality Control',
        lab: labKey,
        isActive: u.isActive !== false,
        employeeId: u.employeeId || u.id,
      };
    });
  }, [dbUsers]);

  return { analysts, isLoading, refetch };
}

/**
 * Checks whether a given task or sample is assigned to the specified user
 */
export function isAssignedToUser(item: any, user: any): boolean {
  if (!user || !item) return false;

  const userEmployeeId = (user.employeeId || '').toUpperCase();
  const userId = (user.id || '').toString();
  const userUsername = (user.username || '').toLowerCase();
  const userFullName = (user.fullName || '').toLowerCase();
  const cleanUserFullName = userFullName.replace(/\s*\([^)]*\)/g, '').trim();
  const userEmail = (user.email || '').toLowerCase();

  // 1. Direct assignedTo object check
  if (item.assignedTo) {
    const toId = (item.assignedTo.id || '').toString();
    const toEmpId = (item.assignedTo.employeeId || '').toUpperCase();
    const toUsername = (item.assignedTo.username || '').toLowerCase();
    const toEmail = (item.assignedTo.email || '').toLowerCase();
    const toFullName = (item.assignedTo.fullName || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    if (toId && toId === userId) return true;
    if (toEmpId && toEmpId === userEmployeeId) return true;
    if (toUsername && toUsername === userUsername) return true;
    if (toEmail && toEmail === userEmail) return true;
    if (toFullName && cleanUserFullName && (toFullName === cleanUserFullName || toFullName.includes(cleanUserFullName) || cleanUserFullName.includes(toFullName))) return true;
  }

  // 1b. Direct analyst object check
  if (item.analyst) {
    const aId = (item.analyst.id || '').toString();
    const aEmpId = (item.analyst.employeeId || '').toUpperCase();
    const aUsername = (item.analyst.username || '').toLowerCase();
    const aEmail = (item.analyst.email || '').toLowerCase();
    const aFullName = (item.analyst.fullName || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    if (aId && aId === userId) return true;
    if (aEmpId && aEmpId === userEmployeeId) return true;
    if (aUsername && aUsername === userUsername) return true;
    if (aEmail && aEmail === userEmail) return true;
    if (aFullName && cleanUserFullName && (aFullName === cleanUserFullName || aFullName.includes(cleanUserFullName) || cleanUserFullName.includes(aFullName))) return true;
  }

  // 2. Direct assignedToId check
  if (item.assignedToId) {
    const toId = item.assignedToId.toString();
    if (toId === userId || toId.toUpperCase() === userEmployeeId) return true;
  }

  // 3. Stored task fields (assignedAnalystId, assignedAnalystUsername, assignedAnalystName)
  const itemAnalystId = (item.assignedAnalystId || '').toUpperCase();
  const itemAnalystUsername = (item.assignedAnalystUsername || '').toLowerCase();
  const itemAnalystName = (item.assignedAnalystName || '').toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();

  if (itemAnalystId && userEmployeeId && itemAnalystId === userEmployeeId) return true;
  if (itemAnalystId && userId && itemAnalystId === userId.toUpperCase()) return true;
  if (itemAnalystUsername && userUsername && itemAnalystUsername === userUsername) return true;
  if (itemAnalystName && cleanUserFullName && (itemAnalystName.includes(cleanUserFullName) || cleanUserFullName.includes(itemAnalystName))) return true;

  // 4. Fallback: Check analyst username in instructions or comments if tagged
  if (itemAnalystUsername && itemAnalystUsername === userUsername) return true;

  return false;
}
