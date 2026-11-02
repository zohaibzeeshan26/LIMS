'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, DEMO_USERS } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  TestTube2,
  Microscope,
  ShieldCheck,
  Gauge,
  BarChart3,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Users,
  Shield,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username or Email is required')
    .max(100, 'Identifier is too long'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().default(true),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: true,
    },
  });

  // Check URL query parameters for session errors or URL credentials
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('identifier') || params.get('email') || params.get('username');
      const urlPass = params.get('password') || params.get('pass');
      if (urlId && urlPass) {
        handleDirectLogin(urlId, urlPass);
        return;
      }

      const errorParam = params.get('error');
      if (errorParam === 'session_expired') {
        setErrorMessage('Your session has expired. Please sign in again.');
      }
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(data.identifier, data.password, data.rememberMe);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleDirectLogin = async (identifier: string, pass: string) => {
    setValue('identifier', identifier);
    setValue('password', pass);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(identifier, pass, true);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Quick login error:', err);
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* ================= LEFT HERO PANEL (Exact match to reference mockup) ================= */}
      <div className="w-full lg:w-[50%] xl:w-[52%] relative min-h-[560px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden bg-[#06183a] text-white">
        
        {/* Cinematic High-Res Laboratory Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/citi-login-hero.jpg"
          alt="Citi Pharma Laboratory Equipment and Science"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.08]"
        />

        {/* Ambient Dark Navy/Royal Blue Gradient Overlays matching mockup tones */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#061e4a]/95 via-[#072a6b]/85 to-[#031333]/95 mix-blend-multiply" />
        <div className="absolute inset-0 bg-radial from-blue-600/20 via-transparent to-slate-950/70 pointer-events-none" />

        {/* Soft Decorative Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* 1. TOP LOGO SECTION */}
        <div className="relative z-10 flex items-center gap-3.5 pt-2">
          {/* Official Citi Pharma Logo Card */}
          <div className="h-14 px-3.5 py-1.5 rounded-2xl bg-white shadow-lg border border-white/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/official-citi-pharma-logo.png"
              alt="Citi Pharma Official Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
              Citi Pharma
            </div>
            <div className="text-[11px] font-bold tracking-[0.28em] text-cyan-300 uppercase mt-1">
              LIMS
            </div>
          </div>
        </div>

        {/* 2. MIDDLE HERO HEADLINE & COPY */}
        <div className="relative z-10 my-auto py-8 sm:py-10">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-[1.14]">
            <span className="block">Smarter Labs.</span>
            <span className="block text-white">Better Results.</span>
          </h1>

          <p className="mt-4 text-xs sm:text-sm text-slate-200/95 max-w-sm font-normal leading-relaxed">
            Complete Laboratory Information Management System for Pharmaceutical Excellence.
          </p>

          {/* 3. FIVE GLASSMORPHIC FEATURE CARDS GRID */}
          <div className="mt-8 sm:mt-10 space-y-2.5">
            {/* Top Row: 3 Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[430px]">
              {/* Card 1: Samples Management */}
              <div className="rounded-xl sm:rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-cyan-400/25 hover:border-cyan-400/45 p-2.5 sm:p-3 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-md">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 mb-1.5">
                  <TestTube2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-100 leading-tight">
                  Samples<br />Management
                </span>
              </div>

              {/* Card 2: Test Management */}
              <div className="rounded-xl sm:rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-cyan-400/25 hover:border-cyan-400/45 p-2.5 sm:p-3 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-md">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 mb-1.5">
                  <Microscope className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-100 leading-tight">
                  Test<br />Management
                </span>
              </div>

              {/* Card 3: Quality Assurance */}
              <div className="rounded-xl sm:rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-cyan-400/25 hover:border-cyan-400/45 p-2.5 sm:p-3 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-md">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 mb-1.5">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-100 leading-tight">
                  Quality<br />Assurance
                </span>
              </div>
            </div>

            {/* Bottom Row: 2 Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[430px]">
              {/* Card 4: Instruments & Analytics */}
              <div className="rounded-xl sm:rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-cyan-400/25 hover:border-cyan-400/45 p-2.5 sm:p-3 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-md">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 mb-1.5">
                  <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-100 leading-tight">
                  Instruments &amp;<br />Analytics
                </span>
              </div>

              {/* Card 5: Reports & Analytics */}
              <div className="rounded-xl sm:rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md border border-cyan-400/25 hover:border-cyan-400/45 p-2.5 sm:p-3 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-md">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 mb-1.5">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-100 leading-tight">
                  Reports &amp;<br />Analytics
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM COPYRIGHT FOOTER */}
        <div className="relative z-10 pt-4 text-[11px] sm:text-xs text-slate-300/80 font-normal">
          © 2026 Citi Pharma LIMS. All rights reserved.
        </div>
      </div>

      {/* ================= RIGHT SIGN-IN CANVAS (Pure Clean Mockup Match) ================= */}
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen bg-white flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative overflow-y-auto">
        <div className="w-full max-w-[420px] mx-auto py-6">
          
          {/* Header Title Section */}
          <div className="mb-8">
            <div className="mb-4 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/official-citi-pharma-logo.png"
                alt="Citi Pharma Official Logo"
                className="h-12 w-auto object-contain"
              />
            </div>
            <h2 className="text-3xl sm:text-[32px] font-bold text-slate-900 tracking-tight leading-none">
              Welcome to
            </h2>
            <div className="text-3xl sm:text-[32px] font-black text-[#0066FF] tracking-tight leading-none mt-2">
              Citi Pharma LIMS
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-3">
              Please sign in to your account
            </p>
          </div>

          {/* Error Notification Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            
            {/* 1. Username or Email Input Field */}
            <div>
              <div
                className={cn(
                  'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-white transition-all shadow-2xs',
                  errors.identifier
                    ? 'border-rose-400 ring-2 ring-rose-100'
                    : 'border-slate-200/90 hover:border-slate-300 focus-within:border-[#0066FF] focus-within:ring-3 focus-within:ring-blue-500/10'
                )}
              >
                <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-[#0066FF] transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="identifier"
                    className="block text-[11px] font-semibold text-slate-600 leading-none cursor-text"
                  >
                    Username or Email
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    disabled={isSubmitting}
                    placeholder="Enter your username or email"
                    className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent pt-1 pb-0.5"
                    {...register('identifier')}
                  />
                </div>
              </div>
              {errors.identifier && (
                <p className="text-[11px] text-rose-600 font-medium pl-1 mt-1">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* 2. Password Input Field */}
            <div>
              <div
                className={cn(
                  'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-white transition-all shadow-2xs',
                  errors.password
                    ? 'border-rose-400 ring-2 ring-rose-100'
                    : 'border-slate-200/90 hover:border-slate-300 focus-within:border-[#0066FF] focus-within:ring-3 focus-within:ring-blue-500/10'
                )}
              >
                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#0066FF] transition-colors shrink-0" />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-semibold text-slate-600 leading-none cursor-text"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    placeholder="Enter your password"
                    className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent pt-1 pb-0.5"
                    {...register('password')}
                  />
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-600 font-medium pl-1 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>



            {/* 4. Primary Solid Blue Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-3.5 px-4 rounded-xl font-bold text-white bg-[#0066FF] hover:bg-[#0052cc] active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>

            {/* Quick Role & Account Selector for Demonstration */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0066FF]" />
                  <span>Quick Role Switcher &amp; Demo Logins</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to fill</span>
              </div>

              {/* Super Admin, Nasir & QC Analyst Quick Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                {/* Super Admin */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDirectLogin('admin', 'lims123')}
                  className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#0066FF] text-white flex items-center justify-center text-xs font-black shrink-0">
                      SA
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                        Super Admin
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        admin / lims123
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 group-hover:underline">
                    &rarr;
                  </span>
                </button>

                {/* Analyst 1 (Muhammad Zubair) */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDirectLogin('analyst1', 'lab123')}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-left transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                      A1
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                        QC Analyst 1
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        analyst1 / lab123
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 group-hover:underline">
                    &rarr;
                  </span>
                </button>

                {/* User Nasir (0012) */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleDirectLogin('0012', '123456')}
                  className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-left transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                      NR
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                        Nasir (0012)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        0012 / 123456
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-purple-600 group-hover:underline">
                    &rarr;
                  </span>
                </button>
              </div>

              {/* 3 Dedicated Laboratory Accounts */}
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>3 Dedicated Laboratory Accounts:</span>
                  <span className="font-mono text-[9px] text-slate-400">1-Click Direct Sign In</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDirectLogin('general', 'gen123')}
                    className="p-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="text-[11px] font-bold text-blue-900 truncate flex items-center justify-between">
                      <span>General Lab</span>
                      <span className="text-[9px] text-blue-600 font-bold">&rarr;</span>
                    </div>
                    <div className="text-[9px] text-blue-700 font-mono">general / gen123</div>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDirectLogin('penicillin', 'pen123')}
                    className="p-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="text-[11px] font-bold text-amber-900 truncate flex items-center justify-between">
                      <span>Penicillin Lab</span>
                      <span className="text-[9px] text-amber-600 font-bold">&rarr;</span>
                    </div>
                    <div className="text-[9px] text-amber-700 font-mono">penicillin / pen123</div>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDirectLogin('cephalosporin', 'ceph123')}
                    className="p-2 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="text-[11px] font-bold text-purple-900 truncate flex items-center justify-between">
                      <span>Cephalosporin</span>
                      <span className="text-[9px] text-purple-600 font-bold">&rarr;</span>
                    </div>
                    <div className="text-[9px] text-purple-700 font-mono">cephalosporin / ceph123</div>
                  </button>
                </div>
              </div>

              {/* 10 Testing Analysts Grid */}
              <div>
                <div className="text-[10px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>10 Testing Analysts (Strictly Isolated Work):</span>
                  <span className="font-mono text-slate-400">1-Click Login</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {DEMO_USERS.filter((u) => u.role === 'ANALYST' && u.username?.startsWith('analyst')).map((anl) => (
                    <button
                      key={anl.username}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDirectLogin(anl.username || '', (anl as any).password || 'lab123')}
                      className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-left transition-all cursor-pointer group disabled:opacity-50"
                    >
                      <div className="text-[11px] font-bold text-slate-800 truncate group-hover:text-[#0066FF] flex items-center justify-between">
                        <span>{anl.username}</span>
                        <span className="text-[9px] text-slate-400 group-hover:text-blue-600 font-bold">&rarr;</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate leading-tight">
                        {anl.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {anl.employeeId}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>

          {/* 5. Bottom Secure & Encrypted Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Secure &amp; Encrypted</span>
          </div>

        </div>
      </div>

    </div>
  );
}
