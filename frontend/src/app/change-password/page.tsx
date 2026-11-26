'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getRoleDashboardPath } from '@/lib/roleRouting';

export default function ChangePasswordPage() {
  const { user, logout, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      const updatedUser = await refreshUser();
      const target = getRoleDashboardPath((updatedUser || user) as any);
      if (typeof window !== 'undefined') {
        window.location.href = target === '/change-password' ? '/' : target;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#0B3D91] flex items-center justify-center border border-blue-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Change Temporary Password</h1>
            <p className="text-xs text-slate-500">
              Signed in as {user?.fullName || 'User'} ({user?.employeeId})
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3">
          For security, you must replace your temporary password before accessing Citi Pharma LIMS.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current / Temporary Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password"
                className="w-full h-11 rounded-xl border border-slate-300 pl-9 pr-3 text-sm focus:border-[#0B3D91] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full h-11 rounded-xl border border-slate-300 pl-9 pr-3 text-sm focus:border-[#0B3D91] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full h-11 rounded-xl border border-slate-300 pl-9 pr-3 text-sm focus:border-[#0B3D91] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-[#004EB3] hover:bg-[#004098] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{isSubmitting ? 'Updating...' : 'Update Password & Continue'}</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => logout()}
          className="mt-4 w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

