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
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleDashboardPath } from '@/lib/roleRouting';

const DEMO_ACCOUNTS = [
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

interface LoginCardFormProps {
  idPrefix: string;
  identifier: string;
  password: string;
  showPassword: boolean;
  errorMessage: string | null;
  isSubmitting: boolean;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onClearError: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function LoginCardForm({
  idPrefix,
  identifier,
  password,
  showPassword,
  errorMessage,
  isSubmitting,
  onIdentifierChange,
  onPasswordChange,
  onToggleShowPassword,
  onClearError,
  onSubmit,
}: LoginCardFormProps) {
  const inputClassName =
    'lims-auth-input w-full h-[52px] rounded-[10px] border border-[#D0D7E2] bg-white pl-[48px] pr-[16px] text-[15px] text-[#111827] placeholder:text-[15px] placeholder:text-[#6B7280] focus:border-[#0B3D91] focus:shadow-[0_0_0_3px_rgba(11,61,145,0.15)] focus:outline-none transition-[border-color,box-shadow] duration-150 disabled:opacity-60';

  return (
    <div className="w-full max-w-[440px] flex flex-col">
      {/* Subtitle with 24px above (from heading) and 24px below (to Employee ID label) */}
      <div className="mt-[24px] mb-[24px] flex items-center gap-3 w-full">
        <span className="h-px flex-1 bg-[#93B4E2]" />
        <span className="text-[14px] font-medium text-[#15325B] whitespace-nowrap">
          Please sign in to your account
        </span>
        <span className="h-px flex-1 bg-[#93B4E2]" />
      </div>

      <form onSubmit={onSubmit} noValidate className="w-full flex flex-col">
        {/* Employee ID Field */}
        <div className="w-full flex flex-col">
          <label
            htmlFor={`${idPrefix}-identifier`}
            className="block text-[14px] font-semibold text-[#1F2937] leading-tight mb-[10px] select-none"
          >
            Employee ID
          </label>
          <div className="relative w-full">
            <UserIcon
              className="absolute left-[16px] top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-[#0B3D91] pointer-events-none"
              strokeWidth={1.8}
            />
            <input
              id={`${idPrefix}-identifier`}
              type="text"
              name="identifier"
              value={identifier}
              onChange={(e) => onIdentifierChange(e.target.value)}
              placeholder="Enter your employee ID"
              disabled={isSubmitting}
              autoComplete="username"
              className={inputClassName}
            />
          </div>
        </div>

        {/* Password Field (18px below Employee ID field) */}
        <div className="mt-[18px] w-full flex flex-col">
          <label
            htmlFor={`${idPrefix}-password`}
            className="block text-[14px] font-semibold text-[#1F2937] leading-tight mb-[10px] select-none"
          >
            Password
          </label>
          <div className="relative w-full">
            <Lock
              className="absolute left-[16px] top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-[#0B3D91] pointer-events-none"
              strokeWidth={1.8}
            />
            <input
              id={`${idPrefix}-password`}
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete="current-password"
              className={`${inputClassName} !pr-[52px] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
            />
            <button
              type="button"
              onClick={onToggleShowPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-[8px] top-1/2 -translate-y-1/2 h-[36px] w-[36px] flex items-center justify-center rounded-md text-[#6B7280] hover:text-[#374151] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B3D91] focus-visible:ring-offset-1 cursor-pointer transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-[20px] w-[20px]" strokeWidth={1.8} />
              ) : (
                <Eye className="h-[20px] w-[20px]" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </div>

        {/* Error message displayed neatly below the fields in normal document flow */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-[14px] w-full px-3 py-2 rounded-lg bg-rose-50 border border-rose-300 flex items-center justify-between gap-2 text-rose-700 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={onClearError}
              className="text-rose-400 hover:text-rose-600 p-0.5 shrink-0 cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Login Button (24px below password field, 44px height, 15px font-semibold, 10px radius) */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-[24px] w-full h-[44px] rounded-[10px] bg-[#004EB3] hover:bg-[#004098] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </>
          )}
        </button>
      </form>

      {/* Secure & Encrypted Connection Footer */}
      <div className="mt-[18px] flex items-center gap-3 w-full">
        <span className="h-px flex-1 bg-[#CBD5E1]" />
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#15325B] whitespace-nowrap">
          <Lock className="h-3.5 w-3.5 text-[#004098]" />
          <span>Secure &amp; Encrypted Connection</span>
        </div>
        <span className="h-px flex-1 bg-[#CBD5E1]" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickDemo, setShowQuickDemo] = useState(false);

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() && !password.trim()) {
      setErrorMessage('Employee ID and Password are required');
      return;
    }
    if (!identifier.trim()) {
      setErrorMessage('Employee ID is required');
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
      const rawMsg = err.message || '';
      const msg =
        !rawMsg || rawMsg.toLowerCase().includes('invalid email, employee id, or password')
          ? 'Invalid Employee ID or password'
          : rawMsg;
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

  return (
    <main className="relative w-full min-h-screen lg:overflow-y-auto bg-white lg:flex lg:items-center lg:justify-center font-sans overflow-x-hidden">
      {/* =================================================================== */}
      {/* 1. DESKTOP & LAPTOP VIEWPORT (16:9 Banner + Clean Flex Login Card)  */}
      {/* =================================================================== */}
      <div
        className="hidden lg:flex relative w-full items-center justify-center overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          maxWidth: 'calc(100vh * (16 / 9))',
          maxHeight: 'calc(100vw * (9 / 16))',
          minHeight: '580px',
          width: '100%',
          height: '100vh',
        }}
      >
        {/* Background Graphic */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Citi%20Pharma%20LIMS%20Login%20Banner%20(1).png"
          alt="Citi Pharma LIMS"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
        />

        {/* Clean Vertical Flexbox Login Group positioned cleanly below "Welcome to Citi Pharma LIMS" */}
        <div
          className="absolute z-20 bg-white flex flex-col items-center justify-start px-6 xl:px-8 pb-4 overflow-y-auto"
          style={{
            left: '66.5%',
            right: '2.0%',
            top: '38.8%',
            bottom: '5.5%',
          }}
        >
          <LoginCardForm
            idPrefix="desktop"
            identifier={identifier}
            password={password}
            showPassword={showPassword}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onIdentifierChange={handleIdentifierChange}
            onPasswordChange={handlePasswordChange}
            onToggleShowPassword={() => setShowPassword((prev) => !prev)}
            onClearError={() => setErrorMessage(null)}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. TABLET & MOBILE VIEWPORT (< lg Screens)                          */}
      {/* =================================================================== */}
      <div className="lg:hidden w-full min-h-screen bg-slate-50 flex flex-col justify-between overflow-x-hidden">
        {/* Top Hero Banner */}
        <div className="relative w-full h-56 sm:h-72 overflow-hidden bg-white border-b border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Citi%20Pharma%20LIMS%20Login%20Banner%20(1).png"
            alt="Citi Pharma LIMS"
            className="w-[155%] max-w-none h-full object-cover object-left pointer-events-none select-none"
          />
        </div>

        {/* Mobile/Tablet Real HTML Login Card */}
        <div className="w-full max-w-[504px] mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-200/80 px-6 py-8 sm:px-8 sm:py-9 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/official-citi-pharma-logo-transparent.png"
              alt="Citi Pharma"
              className="h-14 w-auto object-contain"
            />
            <span className="mt-1 text-xs font-bold text-[#169C46]">Care to Cure</span>

            <div className="mt-3 text-center">
              <p className="text-base font-bold text-[#004098]">Welcome to</p>
              <h2 className="text-2xl font-extrabold tracking-tight">
                <span className="text-[#004098]">Citi Pharma </span>
                <span className="text-[#169C46]">LIMS</span>
              </h2>
            </div>

            <LoginCardForm
              idPrefix="mobile"
              identifier={identifier}
              password={password}
              showPassword={showPassword}
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
              onIdentifierChange={handleIdentifierChange}
              onPasswordChange={handlePasswordChange}
              onToggleShowPassword={() => setShowPassword((prev) => !prev)}
              onClearError={() => setErrorMessage(null)}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. QUICK DEMO ACCOUNTS HELPER (All Roles 1-Click Login)             */}
      {/* =================================================================== */}
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 w-72">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Quick 1-Click Login
              </span>
              <button
                type="button"
                onClick={() => setShowQuickDemo(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label="Close demo logins"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 mt-2 max-h-60 overflow-y-auto">
              {DEMO_ACCOUNTS.map((acc) => (
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
