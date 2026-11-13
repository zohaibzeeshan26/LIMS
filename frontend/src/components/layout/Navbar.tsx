'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CityPharmaLogo } from '@/components/ui/CityPharmaLogo';
import {
  Bell,
  User,
  LogOut,
  CheckCircle2,
  ChevronDown,
  Check,
  AlertTriangle,
  Menu,
  Sliders,
  FlaskConical,
} from 'lucide-react';
import { SystemClock } from './SystemClock';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenAccessionModal?: () => void;
}

import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/audit.service';
import { samplingService } from '@/services/sampling.service';
import { productService } from '@/services/product.service';
import { Sample } from '@/types/lims';
import { parseAuditItem, FormattedAuditItem } from '@/lib/auditFormatter';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'urgent' | 'warning' | 'info';
  read: boolean;
  link?: string;
  staffName?: string;
  staffRole?: string;
  actionBadge?: string;
  details?: string;
}

const DEFAULT_STAFF_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'default-notif-1',
    title: 'Batch Priority Notice',
    description: 'Sample SMP-0034 | Batch CP-AMX-204 scheduled for release review.',
    timestamp: '2h ago',
    type: 'urgent',
    read: false,
    link: '/samples',
  },
  {
    id: 'default-notif-2',
    title: 'Intake Verification Pending',
    description: 'Sample SMP-0033 | Raw Material Paracetamol awaiting QC intake signoff.',
    timestamp: '5h ago',
    type: 'warning',
    read: false,
    link: '/samples',
  },
];

function NavbarInner({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsNotifOpen(false);
        setIsUserMenuOpen(false);
      }
    }

    if (isNotifOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotifOpen, isUserMenuOpen]);

  // Stored read alerts in sessionStorage
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem('cp_admin_read_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Query live real-time audit logs from database (refreshes every 5 seconds)
  const { data: rawAuditLogs } = useQuery({
    queryKey: ['navbar-audit-alerts'],
    queryFn: () => auditService.getAll({ limit: 25 }),
    refetchInterval: 5000,
  });

  // Query live active Urgent & STAT samples (synchronized with Dashboard notice)
  const { data: urgentSamplesRes } = useQuery({
    queryKey: ['active-expedited-urgent-samples'],
    queryFn: () => samplingService.getAll({ priority: 'STAT,URGENT', limit: 100 }),
    refetchInterval: 5000,
  });

  // Query pending document deletion requests for Administrator
  const { data: pendingDeletions = [] } = useQuery({
    queryKey: ['admin-pending-deletions-count'],
    queryFn: () => productService.getPendingDeletions(),
    enabled: isAdmin,
    refetchInterval: 5000,
  });

  const activeUrgentSamples: Sample[] = React.useMemo(() => {
    if (!urgentSamplesRes) return [];
    const list: Sample[] = Array.isArray(urgentSamplesRes)
      ? urgentSamplesRes
      : (urgentSamplesRes as any).data || [];
    return list.filter(
      (s: Sample) =>
        (s.priority === 'STAT' || s.priority === 'URGENT') &&
        s.status !== 'APPROVED' &&
        s.status !== 'REJECTED' &&
        s.status !== 'ARCHIVED'
    );
  }, [urgentSamplesRes]);

  // Parse and filter non-admin actions (staff below admin) PLUS Critical & Urgent sample notices
  const nonAdminAlerts: FormattedAuditItem[] = React.useMemo(() => {
    if (!rawAuditLogs) return [];
    const list = Array.isArray(rawAuditLogs) ? rawAuditLogs : (rawAuditLogs as any).data || [];
    return list
      .map(parseAuditItem)
      .filter((item: FormattedAuditItem) =>
        item.isNonAdmin ||
        item.actionRaw.includes('CRITICAL') ||
        item.actionRaw.includes('URGENT') ||
        item.actionRaw.includes('STAT')
      );
  }, [rawAuditLogs]);

  // Notifications for BOTH Analyst and Admin: real-time urgent sample alerts and workflow activity
  const notifications: NotificationItem[] = React.useMemo(() => {
    const list: NotificationItem[] = [];

    // 0. Pending Document Deletion Requests (Action Required by Admin)
    if (isAdmin && Array.isArray(pendingDeletions) && pendingDeletions.length > 0) {
      pendingDeletions.forEach((doc) => {
        list.push({
          id: `deletion-req-${doc.id}`,
          title: `🗑️ Deletion Approval: ${doc.fileName}`,
          description: `Requested by ${doc.deleteRequestedByName || 'Documentation Manager'} for ${doc.productName}. Admin sign-off required.`,
          timestamp: 'Action Needed',
          type: 'warning',
          read: false,
          link: '/dashboard',
          actionBadge: 'Review & Approve',
        });
      });
    }

    // 1. Real-time active Urgent samples (dispatched to Analyst and Admin)
    activeUrgentSamples.forEach((sample) => {
      const sampleIdKey = `urgent-${sample.id}`;
      const code = sample.sampleCode || sample.sampleId || 'SMP';
      const name = sample.nomenclature || sample.materialName || 'Product';
      const lot = sample.lotNumber || sample.batchLotNumber || 'N/A';
      list.push({
        id: sampleIdKey,
        title: `⚡ URGENT TESTING (1 Hr - 2 Days)`,
        description: `Sample ${code}: ${name} (Batch: ${lot}) requires expedited analytical testing.`,
        timestamp: 'Active SLA',
        type: 'urgent',
        read: readAlertIds.includes(sampleIdKey),
        link: `/samples?sampleId=${sample.id}`,
        actionBadge: '1 Hr - 2 Days',
      });
    });

    // 2. Audit Trail Events (urgent priority alerts for all, non-admin actions for Admin)
    if (nonAdminAlerts.length > 0) {
      nonAdminAlerts.forEach((item) => {
        const isUrgentAction =
          item.actionRaw.includes('URGENT') ||
          item.actionRaw.includes('CRITICAL') ||
          item.actionRaw.includes('STAT');

        // Non-admin staff receives urgent alerts; Admin receives both urgent alerts and staff activity
        if (!isAdmin && !isUrgentAction) {
          return;
        }

        list.push({
          id: item.id,
          title: item.actionRaw.includes('CRITICAL')
            ? `🚨 CRITICAL (24h SLA): ${item.userName}`
            : item.actionRaw.includes('URGENT')
            ? `⚡ URGENT (1 Hr - 2 Days): ${item.userName}`
            : `${item.userName} (${item.roleBadge.label})`,
          description: `${item.actionLabel.label}: ${item.details}`,
          timestamp: `${item.relativeTime} • ${item.timeDisplay}`,
          type: (isUrgentAction || item.actionRaw.includes('STATUS') || item.actionRaw.includes('UPDATE') ? 'urgent' : 'warning') as 'urgent' | 'warning',
          read: readAlertIds.includes(item.id),
          link: '/samples',
          staffName: item.userName,
          staffRole: item.roleBadge.label,
          actionBadge: item.actionLabel.label,
          details: item.details,
        });
      });
    }

    if (list.length === 0) {
      return [
        {
          id: 'empty-notif',
          title: 'All Systems Normal',
          description: 'No active urgent samples or pending workflow alerts.',
          timestamp: 'Live',
          type: 'info',
          read: true,
          link: '/samples',
        },
      ];
    }

    return list;
  }, [isAdmin, activeUrgentSamples, nonAdminAlerts, readAlertIds]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.read && n.id !== 'empty-notif').length;
  }, [notifications]);

  const markAllRead = () => {
    if (isAdmin) {
      const allIds = nonAdminAlerts.map((a) => a.id);
      setReadAlertIds(allIds);
      try {
        sessionStorage.setItem('cp_admin_read_alerts', JSON.stringify(allIds));
      } catch {}
    }
  };

  const displayName = user?.fullName || 'Lab Staff';
  const displayRole =
    user?.role === 'SUPER_ADMIN'
      ? 'Chief Super Admin'
      : user?.role === 'ADMIN'
      ? 'Master Administrator'
      : user?.role
      ? user.role.replace(/_/g, ' ')
      : 'Lab Staff';

  return (
    <header className="sticky top-0 z-40 w-full lg:pl-64 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="px-3 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-3 sm:gap-6">
        
        {/* Left: Mobile Sidebar Trigger & Top Left Stacked Date/Time */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle Sidebar Navigation"
              title="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {/* Top Left: Date on top, Time underneath */}
          <SystemClock layout="stacked" />
        </div>

        {/* Center: Page Title */}
        <div className="flex-1 flex items-center justify-center min-w-0 px-2 sm:px-6">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap text-center">
            <span className="hidden sm:inline">Laboratory Information Management System</span>
            <span className="sm:hidden font-extrabold text-blue-700">City Pharma LIMS</span>
          </h1>
        </div>

        {/* Right: Urgent Alerts + Notification Bell + User Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">

          {/* Active Urgent Alert Pill (Visible on lg+ screens to conserve space) */}
          {activeUrgentSamples.length > 0 && (
            <Link
              href="/samples"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs transition-all cursor-pointer animate-pulse"
              title="Urgent Samples Requiring 1 Hr - 2 Days SLA Testing"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                <span className="hidden xl:inline">Urgent </span>({activeUrgentSamples.length})
              </span>
            </Link>
          )}



          {/* Notification Bell with red badge */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsUserMenuOpen(false);
              }}
              className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute 0 top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      {isAdmin ? 'Staff Activity Alerts' : 'Recent Alerts'}
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link || '#'}
                      onClick={() => {
                        if (isAdmin && !readAlertIds.includes(item.id)) {
                          const updated = [...readAlertIds, item.id];
                          setReadAlertIds(updated);
                          try {
                            sessionStorage.setItem('cp_admin_read_alerts', JSON.stringify(updated));
                          } catch {}
                        }
                        setIsNotifOpen(false);
                      }}
                      className={`block p-2.5 rounded-xl border transition-colors ${
                        item.read
                          ? 'bg-white border-slate-100 hover:bg-slate-50'
                          : 'bg-amber-50/70 border-amber-200/90 hover:bg-amber-100/70 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs ${
                              item.read ? 'font-semibold text-slate-800' : 'font-bold text-amber-950'
                            }`}
                          >
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                              NEW
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </Link>
                  ))}
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Laboratory Facility: Central QC Unit</span>
                  <span className="text-blue-600 font-medium">Real-Time Sync</span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 leading-tight capitalize">
                  {displayRole}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile & Persona Switcher Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email || 'admin@citypharma.com'}</p>
                </div>

                {/* Sign Out Button */}
                <div className="pt-1.5">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out from Workstation</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>


    </header>
  );
}

export function Navbar(props: NavbarProps) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 w-full lg:pl-64 bg-white border-b border-slate-200/80 shadow-xs h-16 flex items-center px-4" />
      }
    >
      <NavbarInner {...props} />
    </Suspense>
  );
}
