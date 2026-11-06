'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getUserLabAccess } from '@/types/lims';
import { samplingService } from '@/services/sampling.service';
import { cn } from '@/lib/utils';
import {
  Home,
  LayoutDashboard,
  FlaskConical,
  FileText,
  Package,
  X,
  ShieldAlert,
  Microscope,
  Users,
  UserCheck,
  AlertCircle,
  ArrowRight,
  LogOut,
  FileSpreadsheet,
  FileCheck2,
  Activity,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const LABORATORIES = [
  {
    id: 'general',
    name: 'General Lab',
    shortLabel: 'General Lab',
    code: 'GENERAL',
    href: '/samples?lab=general',
    icon: FlaskConical,
    badge: 'GL',
  },
  {
    id: 'cephalosporin',
    name: 'Cephalosporin Lab',
    shortLabel: 'Cephalosporin Lab',
    code: 'CEPHALOSPORIN',
    href: '/samples?lab=cephalosporin',
    icon: ShieldAlert,
    badge: 'CEPH',
  },
  {
    id: 'penicillin',
    name: 'Penicillin Lab',
    shortLabel: 'Penicillin Lab',
    code: 'PENICILLIN',
    href: '/samples?lab=penicillin',
    icon: Microscope,
    badge: 'PEN',
  },
];

function SidebarInner({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || (user?.role as string) === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const role = user?.role || 'QC_ANALYST';

  const isOnSamples = pathname.startsWith('/samples');

  const userAccess = getUserLabAccess(user);
  const activeLabParam =
    searchParams.get('lab')?.toLowerCase() ||
    (userAccess === 'ALL' ? 'general' : userAccess.toLowerCase());

  // Always keep all 3 laboratories visible in the slider so nothing disappears
  const visibleLaboratories = LABORATORIES;

  const labBadgeLabel = '3 Labs';

  // Dedicated query to fetch ALL active expedited (Immediate / STAT & Urgent) samples
  const { data: expeditedSamplesData } = useQuery({
    queryKey: ['active-expedited-urgent-samples'],
    queryFn: () =>
      samplingService.getAll({
        priority: 'STAT,URGENT',
        limit: 100,
        sortBy: 'samplingDate',
        sortOrder: 'desc',
      }),
    refetchInterval: 5000,
  });

  const urgentAdminNotices = React.useMemo(() => {
    const list = Array.isArray(expeditedSamplesData)
      ? expeditedSamplesData
      : (expeditedSamplesData as any)?.data || [];

    const urgentList = list.filter(
      (s: any) =>
        (s.priority === 'STAT' || s.priority === 'URGENT') &&
        s.status !== 'APPROVED' &&
        s.status !== 'REJECTED' &&
        s.status !== 'ARCHIVED'
    );

    // Sort: STAT (Immediate 24h) first, then URGENT (2d), then latest date
    urgentList.sort((a: any, b: any) => {
      if (a.priority === 'STAT' && b.priority !== 'STAT') return -1;
      if (b.priority === 'STAT' && a.priority !== 'STAT') return 1;
      const aTime = new Date(a.samplingDate || a.createdAt || 0).getTime();
      const bTime = new Date(b.samplingDate || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const mapped = urgentList.map((s: any) => {
      let labId = 'general';
      let labName = 'General Lab';
      const labType = (s.laboratoryType || s.laboratory?.code || '').toUpperCase();
      const labText = (s.laboratory?.name || s.samplingLocation || '').toUpperCase();
      if (labType === 'SAF' || labType === 'SEF' || labType === 'CP' || labText.includes('CEPH')) {
        labId = 'cephalosporin';
        labName = 'Cephalosporin Lab';
      } else if (labType === 'PENICILLIN' || labType === 'PEN') {
        labId = 'penicillin';
        labName = 'Penicillin Lab';
      }

      return {
        uuid: s.id,
        id: s.sampleCode || s.sampleId || s.accessionNo || s.id,
        product: s.nomenclature || s.materialName || 'Pharmaceutical Sample',
        priority: s.priority || 'URGENT',
        labId,
        labName,
      };
    });

    // If restricted staff, only show samples matching their lab
    if (userAccess === 'GENERAL') {
      return mapped.filter((s: any) => s.labId === 'general');
    }
    if (userAccess === 'CEPHALOSPORIN') {
      return mapped.filter((s: any) => s.labId === 'cephalosporin');
    }
    if (userAccess === 'PENICILLIN') {
      return mapped.filter((s: any) => s.labId === 'penicillin');
    }
    return mapped;
  }, [expeditedSamplesData, userAccess]);

  // Sidebar navigation items tailored to RBAC
  const menuItems: Array<{
    name: string;
    href: string;
    icon: any;
    adminOnly?: boolean;
    roles?: string[];
    badge?: string;
    isPriority?: boolean;
  }> = [
      {
        name: 'Portal',
        href: '/',
        icon: Home,
      },
      {
        name: 'QC Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'Lab Operations',
        href: '/dashboard?tab=lab-operations',
        icon: Activity,
        badge: '3 Labs',
      },
      {
        name: 'Priority Notice',
        href: '/priority-notice',
        icon: AlertCircle,
        badge: urgentAdminNotices.length > 0 ? `${urgentAdminNotices.length}` : undefined,
        isPriority: true,
      },
      {
        name: 'User Management',
        href: '/users',
        icon: Users,
        adminOnly: true,
        badge: 'Admin',
      },
      {
        name: 'Sample Registration',
        href: '/samples',
        icon: FileText,
        badge: labBadgeLabel,
      },
      {
        name: 'Sample Assignment',
        href: '/tasks',
        icon: UserCheck,
        badge: 'Tasks',
      },
      {
        name: 'Documentation',
        href: '/documentation-manager',
        icon: FileText,
        roles: ['DOCUMENTATION_MANAGER', 'ADMIN', 'QA_MANAGER', 'MANAGER'],
        badge: 'PDF Docs',
      },
      {
        name: 'Analyst Execution',
        href: '/testing',
        icon: Microscope,
      },
      {
        name: 'Quality Review & Certificate (CoA)',
        href: '/quality-review',
        icon: FileCheck2,
        badge: 'CoA',
      },
    ];

  // Keep all menu items visible in the slider so nothing disappears
  const visibleItems = menuItems;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1A30]/80 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 lg:z-30 w-64 bg-[#0B1A30] text-slate-100 flex flex-col transition-transform duration-300 ease-in-out overflow-hidden shadow-2xl border-r border-[#152744]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header — Dark Navy with Citi Pharma Logo + LIMS */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-[#0B1A30]">
          <Link href={isAdmin ? '/' : '/samples'} className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 shrink-0 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/city-pharma-logo.png"
                alt="Citi Pharma Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  Citi Pharma
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0066FF] text-white shadow-2xs">
                  LIMS
                </span>
              </div>
              <span className="text-[11px] text-sky-200/80 font-medium tracking-wide mt-0.5">
                Care to Cure
              </span>
            </div>
          </Link>

          {/* Slider close / collapse button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Collapse slider"
            title="Collapse slider"
          >
            <X className="h-4 w-4 lg:hidden" />
            <ChevronLeft className="h-4 w-4 hidden lg:block" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto custom-scrollbar">
          {/* Main Top Navigation Items */}
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isDashboard = item.href === '/';
            const isLabOperationsItem = item.href === '/dashboard?tab=lab-operations';
            const isQcDashboardItem = item.href === '/dashboard';
            const currentTab = searchParams?.get('tab');

            let isActive = false;
            if (isDashboard) {
              isActive = pathname === '/';
            } else if (isLabOperationsItem) {
              isActive = (pathname === '/dashboard' && currentTab === 'lab-operations') || pathname === '/lab-operations';
            } else if (isQcDashboardItem) {
              isActive = pathname === '/dashboard' && currentTab !== 'lab-operations';
            } else if (item.href === '/samples' && pathname === '/samples' && !searchParams?.get('lab')) {
              isActive = true;
            } else {
              isActive = pathname === item.href;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onClose && onClose();
                  }
                }}
                className={cn(
                  'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                  isActive
                    ? item.isPriority
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-bold ring-1 ring-white/20'
                      : 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 font-bold'
                    : item.isPriority
                    ? 'text-rose-200 hover:text-white hover:bg-rose-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors shrink-0',
                        isActive
                          ? 'text-white'
                          : item.isPriority
                          ? 'text-rose-400 group-hover:text-rose-300'
                          : 'text-slate-300 group-hover:text-white'
                      )}
                    />
                    {item.isPriority && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase',
                      item.isPriority
                        ? 'bg-rose-600 text-white shadow-2xs font-mono font-bold'
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-slate-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Dedicated Analytical Laboratories Section (Always Visible) */}
          <div className="pt-4 pb-1.5 px-3">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Analytical Laboratories</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                3 Units
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {visibleLaboratories.map((lab) => {
              const LabIcon = lab.icon;
              const isThisLabActive =
                isOnSamples &&
                (activeLabParam === lab.id ||
                  (lab.id === 'cephalosporin' && (activeLabParam === 'ceph' || activeLabParam === 'cp' || activeLabParam === 'saf')) ||
                  (lab.id === 'penicillin' && (activeLabParam === 'pen' || activeLabParam === 'pl')) ||
                  (lab.id === 'general' && (activeLabParam === 'gen' || activeLabParam === 'gl' || (!searchParams.get('lab') && pathname === '/samples'))));

              return (
                <Link
                  key={lab.id}
                  href={lab.href}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      onClose && onClose();
                    }
                  }}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                    isThisLabActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-bold ring-1 ring-white/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LabIcon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isThisLabActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-300'
                      )}
                    />
                    <span className="truncate">{lab.name}</span>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0',
                      isThisLabActive ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-300'
                    )}
                  >
                    {lab.badge}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Account & Sign Out footer */}
        <div className="p-3 border-t border-white/10 bg-[#091527] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {user?.fullName || 'Lab Staff'}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                  {isAdmin ? 'Super Admin' : user?.role === 'ANALYST' || user?.role === 'QC_ANALYST' || user?.role === 'TESTING_ANALYST' ? `Analyst (@${user?.username || 'user'})` : labBadgeLabel}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside className="fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B1A30] border-r border-[#152744]" />
      }
    >
      <SidebarInner {...props} />
    </Suspense>
  );
}

export default Sidebar;
