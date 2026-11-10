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
    password: 'Password@123',
    employeeId: 'EMP-001',
    name: 'Zohaib Zeeshan',
    title: 'Super Admin / QC Director',
    desc: 'Full administrative access across all modules, samples, and users',
    labBadge: 'Super Admin',
    labId: 'all',
  },
];

function syncUserWithDemo(u: User | null): User | null {
  if (!u) return null;
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
