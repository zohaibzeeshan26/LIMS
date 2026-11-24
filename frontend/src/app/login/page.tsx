'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, AlertCircle, Loader2, User, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleDashboardPath } from '@/lib/roleRouting';

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
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: true,
    },
  });

  const identifierValue = watch('identifier');
  const passwordValue = watch('password');

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
      const msg = err.message || 'Invalid username or password. Please try again.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-white flex items-center justify-center font-sans select-none">
      
      {/* =========================================================================
          DESKTOP & TABLET VIEWPORT (md and above: >= 768px):
          Dynamically scales to fit 100% of ANY screen size (1080p, 2K, 4K, 1366x768, laptops)
          Edge-to-edge perfect lockscreen fit with zero letterbox margin
          ========================================================================= */}
      <div 
        className="hidden md:flex relative w-full h-full items-center justify-center overflow-hidden"
        style={{
          aspectRatio: '1678 / 937',
          maxWidth: 'calc(100vh * (1678 / 937))',
          maxHeight: 'calc(100vw * (937 / 1678))',
          width: '100%',
          height: '100%',
        }}
      >
        {/* User-Provided High-Resolution Login Interface Picture (No Coat Logo) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/Citi_Pharma_LIMS_Login_no_coat_logo.png?v=no_coat_logo"
          alt="Citi Pharma LIMS"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
          style={{
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />

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
        </div>
      </div>

    </div>
  );
}
