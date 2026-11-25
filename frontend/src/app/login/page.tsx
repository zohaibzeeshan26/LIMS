'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, AlertCircle, Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleDashboardPath } from '@/lib/roleRouting';
<<<<<<< HEAD
=======
import { cn } from '@/lib/utils';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  FlaskConical,
  UserCheck,
  FileText,
  Microscope,
  Award,
} from 'lucide-react';
>>>>>>> 8872a5f (chnage)

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
<<<<<<< HEAD
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
=======
  const { login, rememberedIdentifier } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showQuickDemo, setShowQuickDemo] = useState(false);
>>>>>>> 8872a5f (chnage)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: rememberedIdentifier || '',
      password: '',
      rememberMe: true,
    },
  });

<<<<<<< HEAD
  const identifierValue = watch('identifier');
  const passwordValue = watch('password');
=======
  // Check URL query parameters for session errors or direct credentials
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('identifier') || params.get('email') || params.get('username');
      const urlPass = params.get('password') || params.get('pass');
      if (urlId && urlPass) {
        handleDirectLogin(urlId, urlPass);
        return;
      }
>>>>>>> 8872a5f (chnage)

  const { onBlur: onBlurIdentifier, ...identifierRest } = register('identifier');
  const { onBlur: onBlurPassword, ...passwordRest } = register('password');

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(data.identifier, data.password, data.rememberMe);
      const targetDashboard = getRoleDashboardPath(loggedUser as any);
      if (typeof window !== 'undefined') {
        window.location.href = targetDashboard;
      }
    } catch (err: any) {
      console.error('Login error:', err);
<<<<<<< HEAD
      const msg = err.message || 'Invalid username or password. Please try again.';
=======
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleDirectLogin = async (identifier: string, pass: string) => {
    setValue('identifier', identifier, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue('password', pass, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(identifier, pass, true);
      const targetDashboard = getRoleDashboardPath(loggedUser as any);
      if (typeof window !== 'undefined') {
        window.location.href = targetDashboard;
      }
    } catch (err: any) {
      console.error('Direct login error:', err);
      const msg = err.message || 'Authentication failed. Please check your credentials.';
>>>>>>> 8872a5f (chnage)
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const demoAccounts = [
    { role: 'HOD', name: 'Muhammad Jamil', id: 'admin.office', pass: 'Admin@123', color: 'border-blue-300 text-blue-700 bg-blue-50' },
    { role: 'QC Manager', name: 'Raza', id: 'qc.manager', pass: 'Manager@123', color: 'border-purple-300 text-purple-700 bg-purple-50' },
    { role: 'Deputy Manager', name: 'Azaz', id: 'deputy.manager', pass: 'Deputy@123', color: 'border-indigo-300 text-indigo-700 bg-indigo-50' },
    { role: 'Assistant Manager', name: 'Amir', id: 'shift.incharge', pass: 'Shift@123', color: 'border-cyan-300 text-cyan-700 bg-cyan-50' },
    { role: 'QC Analyst', name: 'Muhammad Ali', id: 'qc.analyst', pass: 'Password@123', color: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  ];

  return (
<<<<<<< HEAD
    <div className="relative w-screen h-screen overflow-hidden bg-white flex items-center justify-center font-sans select-none">
      
      {/* =========================================================================
          DESKTOP & TABLET VIEWPORT (md and above: >= 768px):
          Dynamically scales to fit 100% of ANY screen size (1080p, 2K, 4K, 1366x768, laptops)
          Edge-to-edge perfect lockscreen fit with zero letterbox margin
          ========================================================================= */}
      <div 
=======
    <main className="relative w-screen h-screen overflow-hidden bg-white flex items-center justify-center font-sans select-none">

      {/* ========================================================================= */}
      {/* 1. WIDESCREEN 16:9 VIEWPORT CANVAS (100% Pixel-Perfect Exact Match)       */}
      {/* ========================================================================= */}
      <div
>>>>>>> 8872a5f (chnage)
        className="hidden md:flex relative w-full h-full items-center justify-center overflow-hidden"
        style={{
          aspectRatio: '1678 / 937',
          maxWidth: 'calc(100vh * (1678 / 937))',
          maxHeight: 'calc(100vw * (937 / 1678))',
          width: '100%',
          height: '100%',
        }}
      >
<<<<<<< HEAD
        {/* User-Provided High-Resolution Login Interface Picture (No Coat Logo) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Citi_Pharma_LIMS_Login_no_coat_logo.png?v=no_coat_logo"
=======
        {/* Clean Ultra-High-Resolution Reference Graphic (1678 x 937) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Citi_Pharma_LIMS_Login_clean_bg.png"
>>>>>>> 8872a5f (chnage)
          alt="Citi Pharma LIMS"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          style={{
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />

<<<<<<< HEAD
        {/* =========================================================================
            PURE TRANSPARENT FORM OVERLAY:
            ZERO new visual boxes, ZERO new icons, ZERO new buttons.
            Only transparent interactive click/type areas right on the picture's fields!
            ========================================================================= */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="absolute z-30"
          style={{
            left: '68.95%',
            width: '27.65%',
            top: '39.91%',
            height: '31.7%',
          }}
        >
          {/* Error Message Toast / Alert (shown above username only if error occurs) */}
          {(errorMessage || errors.identifier || errors.password) && (
            <div className="absolute -top-10 left-0 right-0 p-2 rounded-xl bg-rose-50/95 border border-rose-300 flex items-center gap-2 text-xs text-rose-800 shadow-lg animate-in fade-in leading-tight z-50">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="truncate">
                {errorMessage || errors.identifier?.message || errors.password?.message}
              </span>
            </div>
          )}

          {/* 1. USERNAME INPUT: Functional overlay directly over picture's username box */}
          <div
            className="absolute w-full"
            style={{
              top: '0%',
              height: '22.3%',
            }}
          >
            {/* White masking strip that cleanly covers the baked placeholder text when user types or focuses */}
            {(usernameFocused || Boolean(identifierValue)) && (
              <div className="absolute inset-y-0.5 left-11 right-2 bg-white rounded-r-full pointer-events-none transition-opacity" />
            )}
            <input
              id="identifier-desktop"
              type="text"
              autoComplete="username"
              disabled={isSubmitting}
              className="relative z-10 w-full h-full bg-transparent text-slate-800 text-xs lg:text-sm font-medium focus:outline-none pl-11 pr-3 cursor-text"
              onFocus={() => setUsernameFocused(true)}
              onBlur={(e) => {
                setUsernameFocused(false);
                onBlurIdentifier(e);
              }}
              {...identifierRest}
            />
          </div>

          {/* 2. PASSWORD INPUT: Functional overlay directly over picture's password box */}
          <div
            className="absolute w-full flex items-center"
            style={{
              top: '23.4%',
              height: '22.3%',
            }}
          >
            {/* White masking strip that cleanly covers the baked placeholder text when user types or focuses */}
            {(passwordFocused || Boolean(passwordValue)) && (
              <div className="absolute inset-y-0.5 left-11 right-9 bg-white rounded-r-full pointer-events-none transition-opacity" />
            )}
            <input
              id="password-desktop"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              className="relative z-10 w-full h-full bg-transparent text-slate-800 text-xs lg:text-sm font-medium focus:outline-none pl-11 pr-9 cursor-text"
              onFocus={() => setPasswordFocused(true)}
              onBlur={(e) => {
                setPasswordFocused(false);
                onBlurPassword(e);
              }}
              {...passwordRest}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 z-20 text-slate-400 hover:text-blue-600 focus:outline-none cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 opacity-0 hover:opacity-100" />}
            </button>
          </div>

          {/* 3. REMEMBER ME & FORGOT PASSWORD: Functional overlay over picture's row */}
          <div
            className="absolute w-full flex items-center justify-between"
            style={{
              top: '49.8%',
              height: '12.0%',
            }}
          >
            <label className="flex items-center gap-1.5 cursor-pointer select-none pl-0.5" title="Remember Me">
              <input
                type="checkbox"
                disabled={isSubmitting}
                className="h-4 w-4 opacity-0 cursor-pointer"
                {...register('rememberMe')}
              />
            </label>

            <a
              href="#forgot-password"
              onClick={(e) => {
                e.preventDefault();
                setErrorMessage('Default lab login password is: admin123');
              }}
              className="h-full w-28 opacity-0 cursor-pointer"
              title="Forgot Password"
            >
              Forgot Password
            </a>
          </div>

          {/* 4. LOGIN BUTTON: Functional overlay directly over picture's Login button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              top: '68.5%',
              height: '31.5%',
            }}
            className="absolute w-full rounded-full bg-transparent hover:bg-black/5 active:bg-black/15 transition-all duration-150 cursor-pointer border-0 outline-none flex items-center justify-center select-none"
            title="Click to Login"
          >
            {isSubmitting && (
              <div className="flex items-center gap-2 text-white text-xs lg:text-sm font-semibold bg-emerald-700/90 px-4 py-1.5 rounded-full shadow-md animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Signing in...</span>
              </div>
            )}
          </button>
        </form>

      </div>

      {/* =========================================================================
          MOBILE VIEWPORT (Under 768px, Smartphones & Small Screens)
          Clean, vertical stack with official branding, touch-friendly inputs & button
          ========================================================================= */}
      <div className="flex md:hidden flex-col w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5 my-auto">
        <div className="text-center mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/city-pharma-logo.png"
            alt="Citi Pharma"
            className="h-12 w-auto mx-auto mb-2 object-contain"
          />
          <div className="text-xs text-slate-500 font-medium">Welcome to</div>
          <h1 className="text-xl font-bold text-[#0c2444]">
            Citi Pharma <span className="text-emerald-600">LIMS</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">Please sign in to your account</p>
        </div>

        {errorMessage && (
          <div className="mb-3 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Username or Email</label>
            <div className="relative flex items-center rounded-xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 px-3 py-2">
              <User className="h-4 w-4 text-slate-400 mr-2" />
              <input
                type="text"
                autoComplete="username"
                disabled={isSubmitting}
                placeholder="Username or Email"
                className="w-full text-sm text-slate-800 focus:outline-none bg-transparent"
                {...register('identifier')}
              />
            </div>
            {errors.identifier && (
              <p className="text-[10px] text-rose-600 mt-1">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <div className="relative flex items-center rounded-xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 px-3 py-2">
              <Lock className="h-4 w-4 text-slate-400 mr-2" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isSubmitting}
                placeholder="Password"
                className="w-full text-sm text-slate-800 focus:outline-none bg-transparent"
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[10px] text-rose-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                disabled={isSubmitting}
                className="rounded border-slate-300 text-blue-600"
                {...register('rememberMe')}
              />
              <span className="text-slate-600">Remember Me</span>
            </label>
            <a
              href="#forgot-password"
              onClick={(e) => {
                e.preventDefault();
                setErrorMessage('Default lab login password is: admin123');
              }}
              className="text-blue-600 hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-full font-bold text-white bg-gradient-to-r from-[#0062e0] via-[#0070ba] to-[#16a34a] hover:opacity-95 shadow-md flex items-center justify-center gap-2 text-sm mt-4 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
          Citi Pharma (Pvt.) Ltd. • © 2026 All rights reserved.
=======
        {/* Interactive Overlay Hotspots for 5 Feature Cards on Left */}
        <div className="absolute left-[3.4%] bottom-[15.8%] w-[44.5%] h-[17.5%] grid grid-cols-5 gap-1.5 z-10 pointer-events-auto">
          <div
            title="Sample Registration & Accessioning"
            className="rounded-xl transition-all duration-200 hover:bg-white/30 hover:backdrop-blur-xs hover:border hover:border-cyan-400 hover:shadow-md cursor-pointer"
          />
          <div
            title="Supervisor Sample & Lab Assignment"
            className="rounded-xl transition-all duration-200 hover:bg-white/30 hover:backdrop-blur-xs hover:border hover:border-cyan-400 hover:shadow-md cursor-pointer"
          />
          <div
            title="cGMP Document Control & Dossier Vault"
            className="rounded-xl transition-all duration-200 hover:bg-white/30 hover:backdrop-blur-xs hover:border hover:border-emerald-400 hover:shadow-md cursor-pointer"
          />
          <div
            title="Analytical Test Execution & Bench Logging"
            className="rounded-xl transition-all duration-200 hover:bg-white/30 hover:backdrop-blur-xs hover:border hover:border-cyan-400 hover:shadow-md cursor-pointer"
          />
          <div
            title="Certificate of Analysis (COA) Generation & Release"
            className="rounded-xl transition-all duration-200 hover:bg-white/30 hover:backdrop-blur-xs hover:border hover:border-cyan-400 hover:shadow-md cursor-pointer"
          />
        </div>

        {/* ======================================================================= */}
        {/* REAL INTERACTIVE FORM (Crisp, Pixel-Perfect Matching Canvas Inputs)     */}
        {/* ======================================================================= */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="absolute z-20 pointer-events-auto flex flex-col justify-start"
          style={{
            left: '68.70%',
            width: '27.50%',
            top: '40.6%',
            height: '36.5%',
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
          <div className="relative flex items-center w-full h-[18.5%] rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all px-1.5">
            <div className="h-7 w-7 rounded-lg bg-[#0B2545] flex items-center justify-center text-white shrink-0 ml-0.5 shadow-2xs">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <input
              {...register('identifier')}
              type="text"
              disabled={isSubmitting}
              placeholder="Username or Email"
              autoComplete="username"
              className="w-full h-full bg-transparent border-none outline-hidden px-2.5 text-xs lg:text-[13px] text-slate-800 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* 2. Password Input Field */}
          <div className="relative flex items-center w-full h-[18.5%] rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all px-1.5 mt-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#0B2545] flex items-center justify-center text-white shrink-0 ml-0.5 shadow-2xs">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              disabled={isSubmitting}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full h-full bg-transparent border-none outline-hidden px-2.5 text-xs lg:text-[13px] text-slate-800 placeholder:text-slate-400 font-medium"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-slate-400 hover:text-slate-700 focus:outline-hidden transition-colors cursor-pointer mr-1"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* 3. Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between text-[11px] lg:text-[12px] text-slate-700 select-none mt-2 px-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Remember Me</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[#0066cc] hover:underline font-semibold cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* 4. Login Gradient Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[21.5%] rounded-full bg-gradient-to-r from-[#0062e0] via-[#0070ba] to-[#16a34a] hover:opacity-95 text-white font-bold text-sm lg:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 active:scale-[0.99] transition-all disabled:opacity-75 cursor-pointer mt-3"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 lg:h-5 lg:w-5 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4 lg:h-5 lg:w-5" />
            )}
            <span>{isSubmitting ? 'Signing in...' : 'Login'}</span>
          </button>

          {/* 5. Secure & Encrypted Connection Row */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] lg:text-[11px] text-slate-600 font-medium select-none mt-3">
            <Lock className="h-3 w-3 text-[#0B2545]" />
            <span>Secure &amp; Encrypted Connection</span>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. RESPONSIVE MOBILE VIEWPORT (< md Screens)                              */}
      {/* ========================================================================= */}
      <div className="md:hidden w-full min-h-screen bg-slate-50 flex flex-col justify-between p-4">
        
        {/* Mobile Header Bar */}
        <header className="w-full bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/city-pharma-logo.png"
              alt="Citi Pharma Logo"
              className="h-9 w-auto object-contain"
            />
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-sm font-extrabold text-[#0B2545] leading-tight">Citi Pharma</div>
              <div className="text-[9px] font-black tracking-[0.25em] text-[#0B2545] leading-none">L I M S</div>
            </div>
          </div>
        </header>

        {/* Mobile Form Card */}
        <div className="w-full max-w-md mx-auto my-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="text-center">
              <h2 className="text-xl font-black text-[#0B2545]">Welcome to Citi Pharma LIMS</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="h-px w-10 bg-slate-200" />
                <span className="text-xs text-slate-500">Please sign in to your account</span>
                <span className="h-px w-10 bg-slate-200" />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username or Email</label>
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <div className="h-8 w-8 rounded-lg bg-[#0B2545] flex items-center justify-center text-white shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  {...register('identifier')}
                  type="text"
                  disabled={isSubmitting}
                  placeholder="Username or Email"
                  className="w-full bg-transparent border-none outline-hidden px-3 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                />
              </div>
              {errors.identifier && (
                <p className="text-[10px] text-rose-500 mt-0.5 font-medium">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <div className="h-8 w-8 rounded-lg bg-[#0B2545] flex items-center justify-center text-white shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  disabled={isSubmitting}
                  placeholder="Password"
                  className="w-full bg-transparent border-none outline-hidden px-3 text-sm text-slate-800 placeholder:text-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 focus:outline-hidden"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-rose-500 mt-0.5 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-[#0066cc] font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#0062e0] via-[#0070ba] to-[#16a34a] text-white font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              <span>{isSubmitting ? 'Signing in...' : 'Login'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-medium pt-2">
              <Lock className="h-3.5 w-3.5 text-[#0B2545]" />
              <span>Secure &amp; Encrypted Connection</span>
            </div>
          </form>
>>>>>>> 8872a5f (chnage)
        </div>

        {/* 5 Feature Badges Row for Mobile */}
        <div className="w-full max-w-md mx-auto grid grid-cols-5 gap-1.5 text-center">
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center">
            <FlaskConical className="h-4 w-4 text-cyan-600 mb-1" />
            <span className="text-[9px] font-semibold text-slate-700 leading-tight">Sample<br />Reg</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center">
            <UserCheck className="h-4 w-4 text-cyan-600 mb-1" />
            <span className="text-[9px] font-semibold text-slate-700 leading-tight">Sample<br />Assign</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center">
            <FileText className="h-4 w-4 text-green-600 mb-1" />
            <span className="text-[9px] font-semibold text-slate-700 leading-tight">Doc<br />Control</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center">
            <Microscope className="h-4 w-4 text-cyan-600 mb-1" />
            <span className="text-[9px] font-semibold text-slate-700 leading-tight">Test<br />Exec</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center">
            <Award className="h-4 w-4 text-cyan-600 mb-1" />
            <span className="text-[9px] font-semibold text-slate-700 leading-tight">COA<br />Gen</span>
          </div>
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
                  className={cn(
                    'w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-all hover:shadow-xs cursor-pointer',
                    acc.color
                  )}
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

      {/* ========================================================================= */}
      {/* 4. FORGOT PASSWORD MODAL                                                  */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Password Assistance</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                In compliance with FDA 21 CFR Part 11 and cGMP laboratory regulations, passwords cannot be self-reset without administrative audit logging.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1 font-medium">
                <div>Please contact your designated supervisor:</div>
                <div className="font-bold text-[#0B2545]">• Muhammad Jamil (Head of Department)</div>
                <div className="font-bold text-[#0B2545]">• Raza (QC Manager)</div>
                <div className="text-slate-500 text-[11px]">Or contact City Pharma QA IT Administrator.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0B2545] text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
