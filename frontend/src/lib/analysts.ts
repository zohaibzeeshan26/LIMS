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

export const STATIC_ANALYSTS: AnalystUserOption[] = [
  { id: 'EMP-ANL-01', name: 'Muhammad Zubair', username: 'analyst1', email: 'analyst1@citypharma.com', role: 'General QC Testing Analyst', department: 'General QC Testing', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-01' },
  { id: 'EMP-ANL-02', name: 'Bilal Raza', username: 'analyst2', email: 'analyst2@citypharma.com', role: 'Physical QC Testing Analyst', department: 'General QC Testing', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-02' },
  { id: 'EMP-ANL-03', name: 'Usman Tariq', username: 'analyst3', email: 'analyst3@citypharma.com', role: 'Finished Formulation Specialist', department: 'Finished Formulation Testing', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-03' },
  { id: 'EMP-ANL-04', name: 'Hamza Farooq', username: 'analyst4', email: 'analyst4@citypharma.com', role: 'Raw Material Acceptance Analyst', department: 'Semi-Basics / Raw Material Testing', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-04' },
  { id: 'EMP-ANL-05', name: 'Ayesha Khan', username: 'analyst5', email: 'analyst5@citypharma.com', role: 'Penicillin QC Testing Analyst', department: 'Penicillin QC Testing Suite', lab: 'PENICILLIN', isActive: true, employeeId: 'EMP-ANL-05' },
  { id: 'EMP-ANL-06', name: 'Fatima Noor', username: 'analyst6', email: 'analyst6@citypharma.com', role: 'Cephalosporin Sterile Analyst', department: 'Cephalosporin Sterile Suite', lab: 'CEPHALOSPORIN', isActive: true, employeeId: 'EMP-ANL-06' },
  { id: 'EMP-ANL-07', name: 'Salman Ahmed', username: 'analyst7', email: 'analyst7@citypharma.com', role: 'HPLC / Chromatography Specialist', department: 'HPLC & Chromatography Lab', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-07' },
  { id: 'EMP-ANL-08', name: 'Zeeshan Ali', username: 'analyst8', email: 'analyst8@citypharma.com', role: 'Dissolution & Physical Testing', department: 'Physical & Dissolution Testing', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-08' },
  { id: 'EMP-ANL-09', name: 'Zainab Bibi', username: 'analyst9', email: 'analyst9@citypharma.com', role: 'Microbiological Testing Specialist', department: 'Microbiological & Endotoxin Testing', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-09' },
  { id: 'EMP-ANL-10', name: 'Omer Farooq', username: 'analyst10', email: 'analyst10@citypharma.com', role: 'Stability & Release Inspection Analyst', department: 'Stability & Release Inspection', lab: 'GENERAL', isActive: true, employeeId: 'EMP-ANL-10' },
  { id: 'EMP-ANL-00', name: 'Muhammad Ali', username: 'analyst', email: 'analyst@citypharma.com', role: 'Quality Control Analyst', department: 'Quality Control Laboratory', lab: 'ALL', isActive: true, employeeId: 'EMP-ANL-00' },
  { id: 'EMP-001', name: 'Dr. Tariq Mahmood', username: 'admin', email: 'admin@citypharma.com', role: 'Administrator / QC Head', department: 'QC & Administration', lab: 'ALL', isActive: true, employeeId: 'EMP-001' },
];

/**
 * Hook to retrieve real-time personnel & analysts from database, merged with static analysts.
 * Every user added in User Management or Dashboard is immediately available!
 */
export function useAllAnalysts(): { analysts: AnalystUserOption[]; isLoading: boolean; refetch: () => void } {
  const { data: dbUsers, isLoading, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<any[]>('/users'),
    staleTime: 1000,
  });

  const analysts = useMemo(() => {
    if (!dbUsers || !Array.isArray(dbUsers)) return STATIC_ANALYSTS;

    const mapped: AnalystUserOption[] = dbUsers.map((u: any) => {
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
        id: u.employeeId || u.id,
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

    const seenIds = new Set(mapped.map((m) => m.id.toUpperCase()));
    const seenUsers = new Set(mapped.map((m) => m.username.toLowerCase()).filter(Boolean));
    const seenEmails = new Set(mapped.map((m) => m.email.toLowerCase()).filter(Boolean));

    const extraStatic = STATIC_ANALYSTS.filter(
      (s) =>
        !seenIds.has(s.id.toUpperCase()) &&
        !seenUsers.has(s.username.toLowerCase()) &&
        !seenEmails.has(s.email.toLowerCase())
    );

    return [...mapped, ...extraStatic];
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
  const userEmail = (user.email || '').toLowerCase();

  // 1. Direct assignedTo object check
  if (item.assignedTo) {
    const toId = (item.assignedTo.id || '').toString();
    const toEmpId = (item.assignedTo.employeeId || '').toUpperCase();
    const toUsername = (item.assignedTo.username || '').toLowerCase();
    const toEmail = (item.assignedTo.email || '').toLowerCase();
    if (toId && toId === userId) return true;
    if (toEmpId && toEmpId === userEmployeeId) return true;
    if (toUsername && toUsername === userUsername) return true;
    if (toEmail && toEmail === userEmail) return true;
  }

  // 2. Direct assignedToId check
  if (item.assignedToId) {
    const toId = item.assignedToId.toString();
    if (toId === userId || toId.toUpperCase() === userEmployeeId) return true;
  }

  // 3. Stored task fields (assignedAnalystId, assignedAnalystUsername, assignedAnalystName)
  const itemAnalystId = (item.assignedAnalystId || '').toUpperCase();
  const itemAnalystUsername = (item.assignedAnalystUsername || '').toLowerCase();
  const itemAnalystName = (item.assignedAnalystName || '').toLowerCase();

  if (itemAnalystId && userEmployeeId && itemAnalystId === userEmployeeId) return true;
  if (itemAnalystUsername && userUsername && itemAnalystUsername === userUsername) return true;
  if (itemAnalystName && userFullName && (itemAnalystName.includes(userFullName) || userFullName.includes(itemAnalystName))) return true;

  // 4. Fallback: Check analyst username in instructions or comments if tagged
  if (itemAnalystUsername && itemAnalystUsername === userUsername) return true;

  return false;
}
