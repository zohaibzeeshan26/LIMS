'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/lims';
import { Lock, Home } from 'lucide-react';

interface RoleRouteGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  moduleName?: string;
}

export function RoleRouteGuard({ allowedRoles, children, moduleName = 'This Module' }: RoleRouteGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2.5 text-slate-500 text-sm font-medium">
          <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  const userRole = (user?.role || 'QC_ANALYST') as Role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdminOrHod = userRole === 'ADMIN' || (userRole as string) === 'HOD';
  const isAllowed =
    isSuperAdmin ||
    allowedRoles.includes(userRole) ||
    (isAdminOrHod && (allowedRoles.includes('ADMIN') || allowedRoles.includes('SUPER_ADMIN')));

  if (!isAllowed) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              403 Restricted Access
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are currently signed in as <strong className="text-slate-800">{user?.fullName || 'User'}</strong> ({userRole}).
              Your role is not authorized to access <strong className="text-slate-800">{moduleName}</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Roles:</span>
            <div className="flex flex-wrap gap-1">
              {allowedRoles.map((r) => (
                <span key={r} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-navy-950 hover:bg-navy-900 text-white transition-colors shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>Return to My Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

