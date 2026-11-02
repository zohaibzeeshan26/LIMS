'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NewSampleModal } from '@/components/samples/NewSampleModal';
import { FlaskConical, Loader2, ShieldCheck, ArrowLeft, LogOut, ArrowRight } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isAccessionOpen, setIsAccessionOpen] = useState(false);

  // Auto-redirect if unauthenticated on protected routes
  React.useEffect(() => {
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

  const isPortalPage = pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Workspace Top Header (shown on all pages except Portal Hub which has its own header) */}
      {!isPortalPage && (
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 shrink-0">
          {/* Left: Back to Portal Button */}
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="Return to Main Portal"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
            <span>Back to Portal</span>
          </Link>

          {/* Center: Official Citi Pharma Logo & LIMS Branding */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-[#0B1A30] p-1 flex items-center justify-center border border-slate-200 shadow-xs group-hover:scale-105 transition-transform">
              <img
                src="/city-pharma-logo.png"
                alt="Citi Pharma Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-tight text-base leading-none">Citi Pharma</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0066FF] text-white shadow-2xs">
                LIMS
              </span>
            </div>
          </Link>

          {/* Right: Sign Out Action */}
          <div className="flex items-center gap-2">
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

      <NewSampleModal
        isOpen={isAccessionOpen}
        onClose={() => setIsAccessionOpen(false)}
      />
    </div>
  );
}
