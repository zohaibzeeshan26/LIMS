'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface TaskSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskSecurityModal({
  isOpen,
  onClose,
  onSuccess,
}: TaskSecurityModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset fields whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setError('Please enter the security username.');
      return;
    }

    if (!trimmedPass) {
      setError('Please enter the security password.');
      return;
    }

    setIsSubmitting(true);

    // Verify credentials: username 'lab' and password 'lab123'
    if (trimmedUser.toLowerCase() === 'lab' && trimmedPass === 'lab123') {
      setIsSuccess(true);
      setError(null);

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
      }, 350);
    } else {
      setIsSubmitting(false);
      setError('Invalid credentials. Username is "lab" and password is "lab123".');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Allocation Security Access"
      subtitle="Security authorization required to access task assignment and analyst workload records"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Banner Header */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/60">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                Sample Assignment Gateway
              </span>
              <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                DUTY ALLOCATION
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              Workload & Protocol Delegation to Laboratory Analysts
            </p>
          </div>
        </div>

        {/* Security Requirement Notification */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Security Credential Verification</span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Please enter your security credentials to unlock task management and duty assignment.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-medium text-[12px]">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {isSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-[12px]">Authorization verified! Opening tasks...</span>
          </div>
        )}

        {/* Username Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Security Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (lab)"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium"
              disabled={isSubmitting || isSuccess}
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Security Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (lab123)"
              className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-900 font-medium"
              disabled={isSubmitting || isSuccess}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Helper hint */}
        <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
          <span>Security check: <strong className="text-slate-600">lab</strong> / <strong className="text-slate-600">lab123</strong></span>
          <span className="font-mono text-[10px] text-indigo-600 font-semibold">21 CFR PART 11</span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isSuccess}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSuccess ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Access Granted</span>
              </>
            ) : isSubmitting ? (
              <span>Verifying...</span>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5" />
                <span>Verify & Open Tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
