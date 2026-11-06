'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  ArrowRight,
  PanelLeft,
  LayoutDashboard,
} from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isAccessionOpen, setIsAccessionOpen] = useState(false);

  const isPortalPage = pathname === '/';
  // STRICT REQUIREMENT: Slider is ONLY shown when the user opens the Dashboard (/dashboard)
  const isDashboardPage = pathname.startsWith('/dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-redirect if unauthenticated on protected routes
  useEffect(() => {
    if (pathname === '/login') return;
    if (!user && !isLoading) {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, pathname]);

  // If on login route, render bare layout without header or sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If session is still resolving or user is unauthenticated, show clinical loading screen with direct login option
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#0B1A30] to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-900/20 mb-4 animate-pulse">
            <FlaskConical className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">CITY PHARMA LIMS</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Verifying authorized cGMP laboratory credentials...
          </p>
          <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Establishing Secure Session</span>
          </div>

          {/* Action button if automatic transition takes more than a moment */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1A30] hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>Sign In to Laboratory Portal</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[11px] text-slate-400">Click if not redirected automatically</span>
          </div>

          <div className="mt-8 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secure Access Gateway • 21 CFR Part 11 Compliant</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Left Slider Navigation Drawer — STRICTLY shown ONLY on Dashboard */}
      {isDashboardPage && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Container — Automatically offsets padding-left (lg:pl-64) ONLY when on Dashboard and left slider is active */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
          isDashboardPage && sidebarOpen ? 'lg:pl-64' : 'pl-0'
        )}
      >
        {/* Workspace Top Header (shown on all pages except Portal Hub which has its own header) */}
        {!isPortalPage && (
          <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              {isDashboardPage ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    title={sidebarOpen ? 'Collapse Left Slider' : 'Open Left Slider'}
                  >
                    <PanelLeft className="h-4 w-4" />
                    <span>{sidebarOpen ? 'Collapse Slider' : 'Slider'}</span>
                  </button>

                  <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    title="Return to Main Portal"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                    <span>Portal Hub</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    title="Return to Main Portal"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                    <span>Portal Hub</span>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    title="Go to QC Dashboard (with Left Slider)"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>QC Dashboard</span>
                  </Link>
                </>
              )}
            </div>

            {/* Center: Brand (visible on non-dashboard pages, or when slider is collapsed) */}
            <div
              className={cn(
                'flex items-center gap-2 transition-opacity',
                isDashboardPage && sidebarOpen ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'
              )}
            >
              <Link href="/" className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-[#0B1A30] p-1 flex items-center justify-center border border-slate-200 shadow-xs">
                  <img
                    src="/city-pharma-logo.png"
                    alt="Citi Pharma Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 tracking-tight text-sm">Citi Pharma</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0066FF] text-white">
                    LIMS
                  </span>
                </div>
              </Link>
            </div>

            {/* Right: Authenticated User Badge & Sign Out */}
            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[160px]">{user?.fullName || 'Authorized Staff'}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                  {user?.role || 'QC'}
                </span>
              </div>

              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-rose-600 transition-colors cursor-pointer shadow-2xs"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </header>
        )}

        {/* Main Full-Width Content View */}
        <main className="flex-1 overflow-y-auto">
          <div className={`p-4 sm:p-6 lg:p-8 ${isPortalPage ? 'max-w-6xl' : 'max-w-7xl'} w-full mx-auto`}>
            {children}
          </div>
        </main>
      </div>

      <NewSampleModal
        isOpen={isAccessionOpen}
        onClose={() => setIsAccessionOpen(false)}
      />
    </div>
  );
}
