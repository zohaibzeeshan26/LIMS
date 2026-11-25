'use client';

import React, { useState } from 'react';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Loader2,
  Sparkles,
  FlaskConical,
  UserCheck,
  FileText,
  Microscope,
  Award,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleDashboardPath } from '@/lib/roleRouting';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickDemo, setShowQuickDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Username or Email is required');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Password is required');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(identifier.trim(), password.trim(), rememberMe);
      const targetDashboard = getRoleDashboardPath(loggedUser as any);
      if (typeof window !== 'undefined') {
        window.location.href = targetDashboard;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Invalid username or password. Please try again.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleDirectLogin = async (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(id, pass, true);
      const targetDashboard = getRoleDashboardPath(loggedUser as any);
      if (typeof window !== 'undefined') {
        window.location.href = targetDashboard;
      }
    } catch (err: any) {
      console.error('Direct login error:', err);
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const demoAccounts = [
    { role: 'Super Admin', name: 'Zohaib Zeeshan', id: 'admin', pass: 'admin', color: 'border-blue-300 text-blue-700 bg-blue-50' },
    { role: 'HOD (Executive)', name: 'Dr. Muhammad Jamil', id: 'hod', pass: 'admin123', color: 'border-purple-300 text-purple-700 bg-purple-50' },
    { role: 'HOD Office / Dr Jamil', name: 'Dr Muhammad Jamil', id: '002', pass: 'admin123', color: 'border-purple-300 text-purple-700 bg-purple-50' },
    { role: 'QC Manager', name: 'Raza', id: 'qc.manager', pass: 'admin123', color: 'border-indigo-300 text-indigo-700 bg-indigo-50' },
    { role: 'Deputy Manager QC', name: 'Azaz', id: 'deputy.manager', pass: 'admin123', color: 'border-sky-300 text-sky-700 bg-sky-50' },
    { role: 'Shift Incharge', name: 'Amir', id: 'shift.incharge', pass: 'admin123', color: 'border-cyan-300 text-cyan-700 bg-cyan-50' },
    { role: 'QC Analyst', name: 'Zubair Raza', id: 'qc.analyst', pass: 'admin123', color: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
    { role: 'Testing Chemist', name: 'Analytical Lab (HPLC/GC)', id: 'testing.analyst', pass: 'admin123', color: 'border-teal-300 text-teal-700 bg-teal-50' },
    { role: 'Sample Intake / Tech', name: 'Hamza Farooq', id: 'reg.analyst', pass: 'admin123', color: 'border-amber-300 text-amber-700 bg-amber-50' },
    { role: 'Documentation Manager', name: 'Asim', id: 'doc.manager', pass: 'admin123', color: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
    { role: 'Product Doc Officer', name: 'Dossier Control', id: 'doc.officer', pass: 'admin123', color: 'border-green-300 text-green-700 bg-green-50' },
    { role: 'QA Review Manager', name: 'Tariq Mahmood', id: 'qa.manager', pass: 'admin123', color: 'border-rose-300 text-rose-700 bg-rose-50' },
    { role: 'Compliance Auditor', name: 'Sohail Ahmed', id: 'auditor', pass: 'admin123', color: 'border-slate-300 text-slate-700 bg-slate-50' },
  ];

  return (
    <main className="relative w-full min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 lg:bg-white lg:flex lg:items-center lg:justify-center font-sans overflow-x-hidden">

      {/* ========================================================================= */}
      {/* 1. WIDESCREEN 16:9 VIEWPORT CANVAS (100% Pixel-Perfect Exact Match)       */}
      {/* ========================================================================= */}
      <div
        className="hidden lg:flex relative w-full h-full items-center justify-center overflow-hidden select-none"
        style={{
          aspectRatio: '1678 / 937',
          maxWidth: 'calc(100vh * (1678 / 937))',
          maxHeight: 'calc(100vw * (937 / 1678))',
          width: '100%',
          height: '100%',
        }}
      >
        {/* High-Resolution Master Graphic (1678 x 937) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Citi_Pharma_LIMS_Login_clean_bg.png"
          alt="Citi Pharma LIMS"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          style={{
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />



        {/* ======================================================================= */}
        {/* CRISP NATIVE FORM (Pixel-Perfect Matching User Design)                  */}
        {/* ======================================================================= */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="absolute z-20 pointer-events-auto flex flex-col justify-start select-text"
          style={{
            left: '68.70%',
            width: '27.50%',
            top: '40.2%',
          }}
        >
          {/* Error Message Floating Badge */}
          {errorMessage && (
            <div className="absolute -top-11 left-0 right-0 p-2 rounded-xl bg-rose-50 border border-rose-300 shadow-md flex items-center justify-between gap-1 text-rose-700 text-[11px] animate-in fade-in duration-150 z-50">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* 1. Username or Email Input Field */}
          <div>
            <label htmlFor="desktop-identifier" className="block text-xs font-semibold text-slate-700 mb-1 select-none">
              Username or Email
            </label>
            <div
              onClick={() => document.getElementById('desktop-identifier')?.focus()}
              className="group relative flex items-center w-full h-[46px] rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#0B3B8C] focus-within:ring-4 focus-within:ring-[#0B3B8C]/10 transition-all duration-200 px-3 cursor-text shadow-2xs"
            >
              <UserIcon className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#0B3B8C] transition-colors duration-200 shrink-0" />
              <input
                id="desktop-identifier"
                type="text"
                name="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                autoComplete="username"
                className="flex-1 min-w-0 h-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 px-2.5 text-xs lg:text-[13px] text-slate-800 placeholder:text-slate-400 font-medium select-text cursor-text"
              />
            </div>
          </div>

          {/* 2. Password Input Field */}
          <div className="mt-2.5">
            <label htmlFor="desktop-password" className="block text-xs font-semibold text-slate-700 mb-1 select-none">
              Password
            </label>
            <div
              onClick={() => document.getElementById('desktop-password')?.focus()}
              className="group relative flex items-center w-full h-[46px] rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#0B3B8C] focus-within:ring-4 focus-within:ring-[#0B3B8C]/10 transition-all duration-200 px-3 cursor-text shadow-2xs"
            >
              <Lock className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#0B3B8C] transition-colors duration-200 shrink-0" />
              <input
                id="desktop-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                autoComplete="current-password"
                className="flex-1 min-w-0 h-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 px-2.5 text-xs lg:text-[13px] text-slate-800 placeholder:text-slate-400 font-medium select-text cursor-text [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
              />
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword((prev) => !prev);
                }}
                className="flex items-center justify-center p-1.5 text-slate-400 hover:text-[#0B3B8C] focus:outline-none transition-colors cursor-pointer shrink-0"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px] text-[#0B3B8C]" />
                ) : (
                  <Eye className="h-[18px] w-[18px] text-slate-400 hover:text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* 3. Login Gradient Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[46px] rounded-full bg-gradient-to-r from-[#0062e0] via-[#0070ba] to-[#16a34a] hover:opacity-95 text-white font-bold text-sm lg:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer mt-3.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 lg:h-5 lg:w-5" />
                <span>Login</span>
              </>
            )}
          </button>

          {/* 4. Secure & Encrypted Connection Row */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] lg:text-[11px] text-slate-600 font-medium select-none mt-2.5">
            <Lock className="h-3 w-3 text-[#0B2545]" />
            <span>Secure &amp; Encrypted Connection</span>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. RESPONSIVE MOBILE & TABLET VIEWPORT (< lg Screens, Phones & iPads)      */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full max-w-full min-h-screen bg-slate-50 flex flex-col justify-between p-3 sm:p-6 lg:p-8 overflow-x-hidden">

        {/* Mobile Header Bar */}
        <header className="w-full max-w-sm sm:max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/city-pharma-logo.png"
              alt="Citi Pharma Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-sm font-extrabold text-[#0B2545] leading-tight">Citi Pharma</div>
              <div className="text-[9px] font-black tracking-[0.25em] text-[#0B2545] leading-none">L I M S</div>
            </div>
          </div>
        </header>

        {/* Mobile Form Card */}
        <div className="w-full max-w-sm sm:max-w-lg mx-auto my-3 sm:my-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-black text-[#0B2545] tracking-tight">Welcome to Citi Pharma LIMS</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="h-px w-6 sm:w-10 bg-slate-200" />
                <span className="text-xs text-slate-500">Please sign in to your account</span>
                <span className="h-px w-6 sm:w-10 bg-slate-200" />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label htmlFor="mobile-identifier" className="block text-xs font-semibold text-slate-700 mb-1 select-none">
                Username or Email
              </label>
              <div
                onClick={() => document.getElementById('mobile-identifier')?.focus()}
                className="group relative flex items-center w-full h-[46px] rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#0B3B8C] focus-within:ring-4 focus-within:ring-[#0B3B8C]/10 transition-all duration-200 px-3 cursor-text shadow-2xs"
              >
                <UserIcon className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#0B3B8C] transition-colors duration-200 shrink-0" />
                <input
                  id="mobile-identifier"
                  type="text"
                  name="identifier"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isSubmitting}
                  autoComplete="username"
                  className="flex-1 min-w-0 h-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 px-2.5 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="mobile-password" className="block text-xs font-semibold text-slate-700 mb-1 select-none">
                Password
              </label>
              <div
                onClick={() => document.getElementById('mobile-password')?.focus()}
                className="group relative flex items-center w-full h-[46px] rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#0B3B8C] focus-within:ring-4 focus-within:ring-[#0B3B8C]/10 transition-all duration-200 px-3 cursor-text shadow-2xs"
              >
                <Lock className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-[#0B3B8C] transition-colors duration-200 shrink-0" />
                <input
                  id="mobile-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="flex-1 min-w-0 h-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 px-2.5 text-sm text-slate-800 placeholder:text-slate-400 font-medium [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((prev) => !prev);
                  }}
                  className="flex items-center justify-center p-1.5 text-slate-400 hover:text-[#0B3B8C] focus:outline-none transition-colors cursor-pointer shrink-0"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px] text-[#0B3B8C]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px] text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[46px] rounded-full bg-gradient-to-r from-[#0062e0] via-[#0070ba] to-[#16a34a] text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 active:scale-[0.99] transition-all cursor-pointer mt-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Login</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-medium pt-2">
              <Lock className="h-3.5 w-3.5 text-[#0B2545]" />
              <span>Secure &amp; Encrypted Connection</span>
            </div>
          </form>
        </div>

        {/* 5 Feature Badges Row for Mobile & Tablet */}
        <div className="w-full max-w-sm sm:max-w-lg mx-auto grid grid-cols-5 gap-1 sm:gap-2.5 text-center">
          <div className="px-1 py-1.5 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center">
            <FlaskConical className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-cyan-600 mb-0.5 sm:mb-1 shrink-0" />
            <span className="text-[8px] sm:text-[11px] font-semibold text-slate-700 leading-tight">Sample<br />Reg</span>
          </div>
          <div className="px-1 py-1.5 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center">
            <UserCheck className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-cyan-600 mb-0.5 sm:mb-1 shrink-0" />
            <span className="text-[8px] sm:text-[11px] font-semibold text-slate-700 leading-tight">Sample<br />Assign</span>
          </div>
          <div className="px-1 py-1.5 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center">
            <FileText className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-green-600 mb-0.5 sm:mb-1 shrink-0" />
            <span className="text-[8px] sm:text-[11px] font-semibold text-slate-700 leading-tight">Doc<br />Control</span>
          </div>
          <div className="px-1 py-1.5 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center">
            <Microscope className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-cyan-600 mb-0.5 sm:mb-1 shrink-0" />
            <span className="text-[8px] sm:text-[11px] font-semibold text-slate-700 leading-tight">Test<br />Exec</span>
          </div>
          <div className="px-1 py-1.5 sm:p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center">
            <Award className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-cyan-600 mb-0.5 sm:mb-1 shrink-0" />
            <span className="text-[8px] sm:text-[11px] font-semibold text-slate-700 leading-tight">COA<br />Gen</span>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-400">
          Citi Pharma (Pvt.) Ltd. • © 2026 All rights reserved.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUICK DEMO ACCOUNTS HELPER (Discreet Tool for 1-Click Evaluation)      */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 right-3 z-50">
        {!showQuickDemo ? (
          <button
            type="button"
            onClick={() => setShowQuickDemo(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-lg backdrop-blur-md border border-slate-700 hover:scale-105 transition-all cursor-pointer"
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Demo Logins</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 w-72 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Quick 1-Click Login
              </span>
              <button
                type="button"
                onClick={() => setShowQuickDemo(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 mt-2 max-h-60 overflow-y-auto">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleDirectLogin(acc.id, acc.pass)}
                  className={`w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-all hover:shadow-xs cursor-pointer ${acc.color}`}
                >
                  <div>
                    <div className="font-bold leading-tight">{acc.name}</div>
                    <div className="text-[10px] opacity-80">{acc.role}</div>
                  </div>
                  <span className="text-[10px] font-mono bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                    @{acc.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>



    </main>
  );
}
