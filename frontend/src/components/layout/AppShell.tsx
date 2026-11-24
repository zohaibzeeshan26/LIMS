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
} from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isAccessionOpen, setIsAccessionOpen] = useState(false);

  const isPortalPage = pathname === '/';
  // Sidebar is shown on all workspace pages (dashboard, daily activity, samples, tasks, users, etc.)
  const showSidebar = !isPortalPage && pathname !== '/login';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      // Dynamic initial check: only open by default on desktop
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);

      // Real-time window resize listener: auto-adapts dynamically on all displays
      const handleResize = () => {
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        } else {
          setSidebarOpen(true);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Auto-close sidebar on mobile/tablet navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  // Auto-redirect if unauthenticated on protected routes
  useEffect(() => {
    if (!mounted) return;
    if (pathname === '/login') return;
    if (!user && !isLoading) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
  }, [user, isLoading, pathname, mounted]);

  // If on login route, render bare layout without header or sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // During SSR or initial client hydration, render matching minimal placeholder
  if (!mounted || isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Left Slider Navigation Drawer — Shown on all workspace pages */}
      {showSidebar && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Container — Automatically offsets padding-left (lg:pl-64) when left slider is active */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
          showSidebar && sidebarOpen ? 'lg:pl-64' : 'pl-0'
        )}
      >
        {/* Workspace Top Header (shown on all pages except Portal Hub which has its own header) */}
        {!isPortalPage && (
          <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
            {/* Left Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                title={sidebarOpen ? 'Collapse Left Slider' : 'Open Left Slider'}
              >
                <PanelLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{sidebarOpen ? 'Collapse Slider' : 'Slider'}</span>
              </button>

              <Link
                href="/"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                title="Return to Main Portal"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Portal Hub</span>
              </Link>
            </div>

            {/* Center: Brand (visible when slider is collapsed) */}
            <div
              className={cn(
                'flex items-center gap-2 transition-opacity',
                showSidebar && sidebarOpen ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'
              )}
            >
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-[#0B1A30] border border-slate-800 shadow-xs group-hover:bg-[#071324] transition-colors">
                  <div className="h-6 sm:h-7 w-6 sm:w-7 rounded-lg bg-white p-0.5 flex items-center justify-center shadow-2xs shrink-0">
                    <img
                      src="/city-pharma-logo.png"
                      alt="Citi Pharma Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="font-black text-white tracking-tight text-xs sm:text-sm">Citi Pharma</span>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0066FF] text-white">
                    LIMS
                  </span>
                </div>
              </Link>
            </div>

            {/* Right: Authenticated User Badge & Sign Out */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[140px] lg:max-w-[180px]">
                  {(user?.fullName || 'Authorized Staff')
                    .replace(/\s*\([^)]*\)/g, '')
                    .trim()}
                </span>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 font-semibold shadow-2xs">
                  {user?.role === 'DOCUMENTATION_MANAGER'
                    ? 'Doc Officer'
                    : user?.role === 'LAB_TECHNICIAN'
                    ? 'Lab Analyst'
                    : user?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : user?.role === 'ADMIN' || user?.role === 'HOD'
                    ? 'HOD'
                    : user?.role === 'DEPUTY_MANAGER'
                    ? 'Deputy Manager'
                    : user?.role
                    ? user.role.replace(/_/g, ' ')
                    : 'QC'}
                </span>
              </div>

              <button
                onClick={() => logout()}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-rose-600 transition-colors cursor-pointer shadow-2xs"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </header>
        )}

        {/* Main Full-Width Content View */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className={`p-3 sm:p-5 lg:p-8 ${isPortalPage ? 'max-w-6xl' : 'max-w-7xl'} w-full mx-auto`}>
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
