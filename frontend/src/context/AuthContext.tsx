'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  api,
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
  REMEMBER_KEY,
  USER_KEY,
} from '@/lib/api';

import { Role } from '@/types/lims';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  employeeId: string;
  department: string;
  role: Role;
  designation?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<void>;
  loginAs: (role: User['role']) => Promise<void>;
  logout: () => Promise<void>;
  rememberedIdentifier: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USERS = [
  {
    role: 'ADMIN' as const,
    username: 'admin',
    email: 'admin@citypharma.com',
    password: 'lims123',
    employeeId: 'EMP-001',
    name: 'Zohaib Zeeshan',
    title: 'Super Admin / QC Director',
    desc: 'Full administrative access across all modules, samples, and users',
    labBadge: 'Super Admin',
    labId: 'all',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst1',
    email: 'analyst1@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-01',
    name: 'Muhammad Zubair',
    title: 'General QC Testing Analyst',
    desc: 'Chemical assay, sample testing, worksheet calculations',
    labBadge: 'QC Analyst 1',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst2',
    email: 'analyst2@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-02',
    name: 'Bilal Raza',
    title: 'Physical QC Testing Analyst',
    desc: 'Physical tests, LOD, water content by Karl Fischer',
    labBadge: 'QC Analyst 2',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst3',
    email: 'analyst3@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-03',
    name: 'Usman Tariq',
    title: 'Finished Formulation Specialist',
    desc: 'Dissolution testing, dosage uniformity, friability',
    labBadge: 'QC Analyst 3',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst4',
    email: 'analyst4@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-04',
    name: 'Hamza Farooq',
    title: 'Raw Material Acceptance Analyst',
    desc: 'Active raw materials identification & USP acceptance',
    labBadge: 'QC Analyst 4',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst5',
    email: 'analyst5@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-05',
    name: 'Ayesha Khan',
    title: 'Penicillin QC Testing Analyst',
    desc: 'Penicillin suite potency assay & containment monitoring',
    labBadge: 'QC Analyst 5',
    labId: 'penicillin',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst6',
    email: 'analyst6@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-06',
    name: 'Fatima Noor',
    title: 'Cephalosporin Sterile Analyst',
    desc: 'Sterility testing, particulate matter, aseptic suite',
    labBadge: 'QC Analyst 6',
    labId: 'cephalosporin',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst7',
    email: 'analyst7@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-07',
    name: 'Salman Ahmed',
    title: 'HPLC / Chromatography Specialist',
    desc: 'Reversed-phase HPLC, purity, and related substances',
    labBadge: 'QC Analyst 7',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst8',
    email: 'analyst8@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-08',
    name: 'Zeeshan Ali',
    title: 'Dissolution & Physical Testing',
    desc: '6-vessel dissolution baths, disintegration time',
    labBadge: 'QC Analyst 8',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst9',
    email: 'analyst9@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-09',
    name: 'Zainab Bibi',
    title: 'Microbiological Testing Specialist',
    desc: 'Bioburden, BET endotoxin, environmental swabbing',
    labBadge: 'QC Analyst 9',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst10',
    email: 'analyst10@citypharma.com',
    password: 'lab123',
    employeeId: 'EMP-ANL-10',
    name: 'Omer Farooq',
    title: 'Stability & Release Inspection Analyst',
    desc: 'Accelerated stability chambers & batch release check',
    labBadge: 'QC Analyst 10',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'analyst',
    email: 'analyst@citypharma.com',
    password: 'Password@123',
    employeeId: 'EMP-ANL-00',
    name: 'Muhammad Ali',
    title: 'Quality Control Analyst',
    desc: 'Sample registration, accessioning, and testing',
    labBadge: 'QC Analyst',
    labId: 'all',
  },
  {
    role: 'ANALYST' as const,
    username: 'general',
    email: 'general@citypharma.com',
    password: 'gen123',
    employeeId: 'EMP-LAB-GL',
    name: 'General Lab Personnel',
    title: 'General QC Laboratory Staff',
    desc: 'Raw materials & finished oral formulations analysis',
    labBadge: 'General Lab',
    labId: 'general',
  },
  {
    role: 'ANALYST' as const,
    username: 'penicillin',
    email: 'penicillin@citypharma.com',
    password: 'pen123',
    employeeId: 'EMP-LAB-PEN',
    name: 'Penicillin Lab Specialist',
    title: 'Penicillin Suite QC Staff',
    desc: 'Penicillin containment suite analytical testing',
    labBadge: 'Penicillin Lab',
    labId: 'penicillin',
  },
  {
    role: 'ANALYST' as const,
    username: 'cephalosporin',
    email: 'cephalosporin@citypharma.com',
    password: 'ceph123',
    employeeId: 'EMP-LAB-CEPH',
    name: 'Cephalosporin Lab Specialist',
    title: 'Sterile Area Cephalosporin QC Staff',
    desc: 'Cephalosporin sterile facility analytical testing',
    labBadge: 'Cephalosporin Lab',
    labId: 'cephalosporin',
  },
  {
    role: 'DOCUMENTATION_MANAGER' as const,
    username: 'doc.manager',
    email: 'doc.manager@citypharma.com',
    password: 'doc123',
    employeeId: 'EMP-DOC-MGR',
    name: 'Sana Tariq',
    title: 'Documentation Manager',
    desc: 'Manage approved product descriptions, Word documentation (.doc/.docx) & revisions',
    labBadge: 'Doc Manager',
    labId: 'all',
  },
];

function syncUserWithDemo(u: User | null): User | null {
  if (!u) return null;
  const demoMatch = DEMO_USERS.find(
    (d) =>
      (u.email && d.email.toLowerCase() === u.email.toLowerCase()) ||
      (u.username && d.username?.toLowerCase() === u.username.toLowerCase()) ||
      (u.employeeId && d.employeeId?.toUpperCase() === u.employeeId.toUpperCase())
  );
  if (demoMatch) {
    return { ...u, fullName: demoMatch.name };
  }
  return u;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberedIdentifier, setRememberedIdentifier] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Load saved session on initial mount
  useEffect(() => {
    let isMounted = true;

    function restoreSession() {
      if (typeof window !== 'undefined') {
        const savedRemembered = localStorage.getItem(REMEMBER_KEY);
        if (savedRemembered) {
          setRememberedIdentifier(savedRemembered);
        }

        const storedToken = getStoredToken();
        const storedUser = getStoredUser<User>();

        if (storedToken && storedUser) {
          const synced = syncUserWithDemo(storedUser);
          setUser(synced);
          setToken(storedToken);

          // Asynchronous background profile refresh (does not block local session)
          api.get<User>('/auth/me')
            .then((freshProfile) => {
              if (isMounted && freshProfile) {
                const freshSynced = syncUserWithDemo(freshProfile);
                setUser(freshSynced);
                try {
                  localStorage.setItem(USER_KEY, JSON.stringify(freshSynced));
                } catch {}
              }
            })
            .catch((err: any) => {
              // Only clear session if explicitly rejected with 401 Unauthorized
              if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
                clearStoredSession();
                if (isMounted) {
                  setUser(null);
                  setToken(null);
                }
              } else {
                console.warn('[AUTH] Background profile check warning:', err?.message || err);
              }
            });
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Route protection guard
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.replace('/login');
      // Hard fallback if client-side router transition is blocked
      const fallbackTimer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }, 400);
      return () => clearTimeout(fallbackTimer);
    }

    if (user && isLoginPage) {
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      } else {
        router.replace('/');
      }
      return;
    }
  }, [user, isLoading, pathname, router]);

  const login = async (identifier: string, pass: string, rememberMe: boolean = true) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        email: identifier.trim(),
        password: pass.trim(),
      });

      const syncedUser = syncUserWithDemo(res.user) || res.user;

      setStoredSession(res.accessToken, res.refreshToken, syncedUser, rememberMe);
      setToken(res.accessToken);
      setUser(syncedUser);

      if (rememberMe) {
        setRememberedIdentifier(identifier.trim());
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.replace('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginAs = async (role: User['role']) => {
    const demo = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    await login(demo.email, (demo as any).password || 'Password@123', true);
  };

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout').catch(() => {});
    } finally {
      clearStoredSession();
      setToken(null);
      setUser(null);
      setIsLoading(false);
      router.replace('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginAs,
        logout,
        rememberedIdentifier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
