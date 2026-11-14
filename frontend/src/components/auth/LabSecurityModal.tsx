'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TargetLabInfo {
  id: string;
  name: string;
  badge?: string;
  code?: string;
  desc?: string;
  href: string;
  badgeBg?: string;
  cardBg?: string;
  iconBg?: string;
}

export interface LabCredentialInfo {
  labId: string;
  name: string;
  badge: string;
  username: string;
  password: string;
  aliases: string[];
  passwordAliases: string[];
  themeColor: string;
  themeBg: string;
  themeBorder: string;
  accentBg: string;
  iconBg: string;
  badgeBg: string;
  description: string;
  authorizedAnalysts: string[];
}

export const LAB_SECURITY_CREDENTIALS: Record<string, LabCredentialInfo> = {
  general: {
    labId: 'general',
    name: 'General Lab',
    badge: '',
    username: 'general',
    password: 'gen123',
    aliases: ['general', 'gl', 'generallab', 'gl_lab', 'gen_lab'],
    passwordAliases: ['gen123', 'general123', 'gl123'],
    themeColor: 'text-blue-700',
    themeBg: 'bg-blue-600',
    themeBorder: 'border-blue-200',
    accentBg: 'bg-blue-50/70',
    iconBg: 'bg-blue-600',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
    description: '',
    authorizedAnalysts: [],
  },
  penicillin: {
    labId: 'penicillin',
    name: 'Penicillin Lab',
    badge: '',
    username: 'penicillin',
    password: 'pen123',
    aliases: ['penicillin', 'pen', 'penlab', 'pen_lab'],
    passwordAliases: ['pen123', 'penicillin123'],
    themeColor: 'text-amber-800',
    themeBg: 'bg-amber-600',
    themeBorder: 'border-amber-200',
    accentBg: 'bg-amber-50/70',
    iconBg: 'bg-amber-600',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    description: '',
    authorizedAnalysts: [],
  },
  cephalosporin: {
    labId: 'cephalosporin',
    name: 'Cephalosporin Lab',
    badge: '',
    username: 'cephalosporin',
    password: 'ceph123',
    aliases: ['cephalosporin', 'ceph', 'cephlab', 'saf', 'sef', 'ceph_lab'],
    passwordAliases: ['ceph123', 'cephalosporin123', 'saf123'],
    themeColor: 'text-purple-800',
    themeBg: 'bg-purple-600',
    themeBorder: 'border-purple-200',
    accentBg: 'bg-purple-50/70',
    iconBg: 'bg-purple-600',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    description: '',
    authorizedAnalysts: [],
  },
};

interface LabSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLab: TargetLabInfo | null;
  onSuccess: (lab: TargetLabInfo) => void;
}

export function LabSecurityModal({
  isOpen,
  onClose,
  targetLab,
  onSuccess,
}: LabSecurityModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const isAdminOrSuperAdmin =
    userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HOD';
  const isSampleRegistration =
    userRole === 'LAB_TECHNICIAN' ||
    userRole === 'SAMPLE_REGISTRATION' ||
    userRole === 'SAMPLE_REGISTRATION_ANALYST';
  const hasDirectLabAccess = isAdminOrSuperAdmin || isSampleRegistration;

  // Normalize target lab id to key ('general', 'penicillin', or 'cephalosporin')
  const targetLabKey = (targetLab?.id || 'general').toLowerCase();
  const labConfig: LabCredentialInfo =
    LAB_SECURITY_CREDENTIALS[targetLabKey] || LAB_SECURITY_CREDENTIALS.general;

  // Direct bypass for Admin, Super Admin, and Sample Registration using their existing authenticated session
  useEffect(() => {
    if (isOpen && hasDirectLabAccess && targetLab) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lab_security_auth', 'true');
        sessionStorage.setItem('lab_security_auth_time', Date.now().toString());
        sessionStorage.setItem(`lab_auth_${targetLabKey}`, 'true');
        sessionStorage.setItem('lab_security_active_lab', targetLabKey);
      }
      onSuccess(targetLab);
    }
  }, [isOpen, hasDirectLabAccess, targetLab, targetLabKey, onSuccess]);

  // Reset fields whenever modal opens or targetLab changes
  useEffect(() => {
    if (isOpen && !hasDirectLabAccess) {
      setUsername('');
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsSubmitting(false);
      setIsSuccess(false);
      setSuccessMsg('');
    }
  }, [isOpen, targetLab, hasDirectLabAccess]);

  if (!isOpen || !targetLab || hasDirectLabAccess) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawUser = username.trim();
    const rawPass = password.trim();

    // Default to the shown lab credential if submitted blank
    const trimmedUser = rawUser || labConfig.username;
    const trimmedPass = rawPass || labConfig.password;

    setIsSubmitting(true);

    const normUser = trimmedUser.toLowerCase();
    const normPass = trimmedPass;

    // 1. Super Admin Master Pass Check
    if (
      (normUser === 'admin' || normUser === 'lims.offics' || normUser === 'lims.office') &&
      (normPass === 'lims123' || normPass === 'admin' || normPass === 'Password@123')
    ) {
      grantAccess(`Super Admin Master Override: Access granted to ${labConfig.name}`);
      return;
    }

    // 2. Cross-Lab Check: Did the user type credentials of another laboratory?
    for (const [otherKey, otherConfig] of Object.entries(LAB_SECURITY_CREDENTIALS)) {
      if (otherKey === targetLabKey) continue;

      const isOtherUser =
        otherConfig.aliases.includes(normUser) ||
        otherConfig.authorizedAnalysts.includes(normUser);

      const isOtherPass =
        otherConfig.passwordAliases.includes(normPass) ||
        normPass === otherConfig.password ||
        normPass === 'lab123';

      if (isOtherUser && isOtherPass) {
        setIsSubmitting(false);
        setError(
          `Access Denied: The entered credentials belong to another laboratory facility. Please enter the designated credentials for ${labConfig.name}.`
        );
        return;
      }
    }

    // 3. Strict Target Lab Credential Verification
    const isTargetUser =
      labConfig.aliases.includes(normUser) ||
      labConfig.authorizedAnalysts.includes(normUser);

    const isTargetPass =
      labConfig.passwordAliases.includes(normPass) ||
      normPass === labConfig.password ||
      (labConfig.authorizedAnalysts.includes(normUser) && normPass === 'lab123');

    if (isTargetUser && isTargetPass) {
      grantAccess(`Authentication successful! Entering ${labConfig.name}...`);
      return;
    }

    // 4. Detailed error messaging
    setIsSubmitting(false);
    if (isTargetUser && !isTargetPass) {
      setError(
        `Incorrect password for ${labConfig.name}. Please verify and try again.`
      );
    } else {
      setError(
        `Invalid credentials for ${labConfig.name}. Access denied.`
      );
    }
  };

  const grantAccess = (message: string) => {
    setIsSuccess(true);
    setSuccessMsg(message);
    setError(null);

    // Persist authorization in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lab_security_auth', 'true');
      sessionStorage.setItem('lab_security_auth_time', Date.now().toString());
      sessionStorage.setItem(`lab_auth_${targetLabKey}`, 'true');
      sessionStorage.setItem('lab_security_active_lab', targetLabKey);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      if (targetLab) {
        onSuccess(targetLab);
      }
    }, 450);
  };

  if (!isOpen || !targetLab) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Laboratory Security Gateway"
      subtitle={`Separate security authorization required to access ${labConfig.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selected Target Lab Badge Banner */}
        <div
          className={cn(
            'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
            labConfig.themeBorder,
            labConfig.accentBg
          )}
        >
          <div
            className={cn(
              'h-11 w-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm',
              labConfig.iconBg
            )}
          >
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                {targetLab.name}
              </span>
              {labConfig.badge ? (
                <span
                  className={cn(
                    'text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded border',
                    labConfig.badgeBg
                  )}
                >
                  {labConfig.badge}
                </span>
              ) : null}
              <span className="text-[10px] font-semibold text-slate-500 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200">
                Restricted Access
              </span>
            </div>
            {(targetLab.desc || labConfig.description) ? (
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {targetLab.desc || labConfig.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* Security Requirement Notification */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Security Credential Check</span>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
              Authorized personnel only. Please enter the assigned laboratory username and password to unlock {labConfig.name}.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium text-[12px] leading-relaxed">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {isSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-[12px]">
              {successMsg || `Authorization verified! Entering ${labConfig.name}...`}
            </span>
          </div>
        )}

        {/* Username Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {labConfig.name} Username
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
              placeholder={`Enter lab username (${labConfig.username})`}
              className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 font-medium placeholder:text-slate-400"
              disabled={isSubmitting || isSuccess}
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {labConfig.name} Security Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`Enter security password (${labConfig.password})`}
              className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-slate-900 font-medium placeholder:text-slate-400"
              disabled={isSubmitting || isSuccess}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50',
              labConfig.themeBg,
              'hover:opacity-95'
            )}
          >
            {isSuccess ? (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span>Access Granted</span>
              </>
            ) : isSubmitting ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5" />
                <span>Unlock &amp; Enter {labConfig.name}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
