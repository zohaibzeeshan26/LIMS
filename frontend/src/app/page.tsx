'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { getUserLabAccess } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';
import { LabSecurityModal, TargetLabInfo } from '@/components/auth/LabSecurityModal';
import { cn } from '@/lib/utils';
import {
  TestTube2,
  LayoutDashboard,
  FileText,
  Package,
  BarChart3,
  ArrowRight,
  FlaskConical,
  ShieldAlert,
  Microscope,
  CheckCircle2,
  Clock,
  Sparkles,
  LogOut,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Users,
  FileCheck2,
} from 'lucide-react';

export default function WelcomePortalPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [labModalTarget, setLabModalTarget] = useState<'samples' | 'tasks'>('samples');
  const [selectedLabForAuth, setSelectedLabForAuth] = useState<TargetLabInfo | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const userAccess = getUserLabAccess(user);

  // Fetch real database counts for dynamic live preview
  const { data: metrics } = useQuery({
    queryKey: ['portal-metrics'],
    queryFn: () => samplingService.getMetrics(),
    staleTime: 10000,
  });

  const labOptions = [
    {
      id: 'general',
      name: 'General Lab',
      code: 'GENERAL',
      badge: 'GL',
      desc: '',
      href: '/samples?lab=general',
      icon: FlaskConical,
      cardBg: 'bg-blue-50/50 hover:bg-blue-50 border-blue-200/80 hover:border-blue-400',
      badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-600 text-white shadow-blue-500/20',
    },
    {
      id: 'penicillin',
      name: 'Penicillin Lab',
      code: 'PENICILLIN',
      badge: 'PEN',
      desc: '',
      href: '/samples?lab=penicillin',
      icon: Microscope,
      cardBg: 'bg-amber-50/50 hover:bg-amber-50 border-amber-200/80 hover:border-amber-400',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-600 text-white shadow-amber-500/20',
    },
    {
      id: 'cephalosporin',
      name: 'Cephalosporin Lab',
      code: 'CEPHALOSPORIN',
      badge: 'CEPH',
      desc: '',
      href: '/samples?lab=cephalosporin',
      icon: ShieldAlert,
      cardBg: 'bg-purple-50/50 hover:bg-purple-50 border-purple-200/80 hover:border-purple-400',
      badgeBg: 'bg-purple-100 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-600 text-white shadow-purple-500/20',
    },
  ];

  const portalCards = [
    {
      id: 'dashboard',
      title: 'QC Dashboard',
      description: 'Real-time metrics, emergency sample notices, test approvals, and audit activity.',
      href: '/dashboard',
      icon: LayoutDashboard,
      badgeText: metrics?.urgentCount ? `${metrics.urgentCount} Urgent` : 'Executive View',
      // Pastel emerald theme matching mockup Card 2
      cardBg: 'bg-[#f0fbf6] border-[#d2f3e3] hover:border-[#a4e8c9] hover:shadow-md',
      iconBg: 'bg-[#dcfce7] text-[#16a34a]',
      arrowColor: 'text-slate-400 group-hover:text-[#16a34a]',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Role-based access control (RBAC), user authentication, laboratory permissions, and credential security.',
      href: '/users',
      icon: Users,
      badgeText: 'RBAC & Auth',
      cardBg: 'bg-[#faf5ff] border-[#f3e8ff] hover:border-[#d8b4fe] hover:shadow-md',
      iconBg: 'bg-[#f3e8ff] text-[#9333ea]',
      arrowColor: 'text-slate-400 group-hover:text-[#9333ea]',
    },
    {
      id: 'samples',
      title: 'Sample Registration',
      description: 'Manage samples, scan barcodes and track sample status across laboratories.',
      href: '/samples',
      icon: TestTube2,
      badgeText: metrics?.totalSamples ? `${metrics.totalSamples} Active` : 'All Labs',
      // Pastel purple theme matching mockup Card 1
      cardBg: 'bg-[#f8f7ff] border-[#e7e3fc] hover:border-[#c5bcf8] hover:shadow-md',
      iconBg: 'bg-[#ede9fe] text-[#7c3aed]',
      arrowColor: 'text-slate-400 group-hover:text-[#7c3aed]',
    },
    {
      id: 'tasks',
      title: 'Sample Assignment',
      description: 'Allocate samples, test protocols and analytical worksheets to designated laboratory analysts.',
      href: '/tasks',
      icon: UserCheck,
      badgeText: 'Duty Allocation',
      // Pastel indigo theme
      cardBg: 'bg-[#f5f3ff] border-[#e0e7ff] hover:border-[#a5b4fc] hover:shadow-md',
      iconBg: 'bg-[#ede9fe] text-[#4f46e5]',
      arrowColor: 'text-slate-400 group-hover:text-[#4f46e5]',
    },
    {
      id: 'documentation-manager',
      title: 'Documentation',
      description: 'Upload & maintain approved commercial product description PDF documents (.pdf) and version history.',
      href: '/documentation-manager',
      icon: FileText,
      badgeText: 'PDF Docs',
      cardBg: 'bg-[#f0fdfa] border-[#ccfbf1] hover:border-[#99f6e4] hover:shadow-md',
      iconBg: 'bg-[#ccfbf1] text-[#0d9488]',
      arrowColor: 'text-slate-400 group-hover:text-[#0d9488]',
    },
    {
      id: 'testing',
      title: 'Analyst Execution',
      description: 'Execute analytical tests, enter compendial worksheet results, and review pharmacopeial limits.',
      href: '/testing',
      icon: FileText,
      badgeText: metrics?.inTesting ? `${metrics.inTesting} In Analysis` : 'QC Protocols',
      // Pastel blue theme matching mockup Card 3
      cardBg: 'bg-[#f0f7ff] border-[#d5e7fd] hover:border-[#acd2fc] hover:shadow-md',
      iconBg: 'bg-[#dbeafe] text-[#2563eb]',
      arrowColor: 'text-slate-400 group-hover:text-[#2563eb]',
    },
    {
      id: 'quality-review',
      title: 'Quality Review & Certificate (CoA)',
      description: 'Review analytical worksheets, verify pharmacopeial limits, authorize batch disposition, and issue release CoAs.',
      href: '/quality-review',
      icon: FileCheck2,
      badgeText: 'Release & CoA',
      cardBg: 'bg-[#f0fdf4] border-[#dcfce7] hover:border-[#86efac] hover:shadow-md',
      iconBg: 'bg-[#dcfce7] text-[#16a34a]',
      arrowColor: 'text-slate-400 group-hover:text-[#16a34a]',
    },
    {
      id: 'products',
      title: 'Products',
      description: 'Browse pharmaceutical products, view analytical monographs (ATM), and launch QC testing & CoA calculation engines.',
      href: '/products',
      icon: Package,
      badgeText: 'QC Products',
      cardBg: 'bg-[#f5f3ff] border-[#e4e1fc] hover:border-[#c7d2fe] hover:shadow-md',
      iconBg: 'bg-[#ede9fe] text-[#7c3aed]',
      arrowColor: 'text-slate-400 group-hover:text-[#7c3aed]',
    },
    {
      id: 'analytics',
      title: 'Reports & Analytics',
      description: 'View statistics, daily reports, deviation investigations and performance analytics.',
      href: '/oos',
      icon: BarChart3,
      badgeText: 'Compliance',
      // Pastel rose/pink theme matching mockup Card 5
      cardBg: 'bg-[#fff1f2] border-[#fecdcb] hover:border-[#fda5b1] hover:shadow-md',
      iconBg: 'bg-[#ffe4e6] text-[#e11d48]',
      arrowColor: 'text-slate-400 group-hover:text-[#e11d48]',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Top Portal Navigation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/90">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#0B1A30] p-1 flex items-center justify-center border border-slate-200 shadow-xs">
            <img
              src="/city-pharma-logo.png"
              alt="Citi Pharma Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-tight text-lg leading-none">Citi Pharma</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0066FF] text-white shadow-2xs">
                LIMS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Laboratory Information Management System • Care to Cure</p>
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-rose-600 transition-colors cursor-pointer shadow-2xs"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* ================= 1. TOP WELCOME BANNER (Exact Match to Mockup) ================= */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#e8f3fc] via-[#f2f8fe] to-[#f8fbff] border border-blue-100/90 shadow-xs overflow-hidden flex flex-col md:flex-row items-center justify-between min-h-[140px] sm:min-h-[155px]">
        
        {/* Banner Left: Welcome Text */}
        <div className="p-6 sm:p-8 lg:p-10 z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700">
              Authorized LIMS Session
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-[#0A192F] tracking-tight leading-tight">
            Welcome to Citi Pharma
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
            Select an option from the menu to manage your lab operations.
          </p>
        </div>

        {/* Banner Right: High-Res Laboratory Microscope & Glassware Illustration */}
        <div className="relative shrink-0 w-full md:w-auto h-36 md:h-full flex items-center justify-end pointer-events-none self-end md:self-auto">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#f2f8fe]/40 to-[#e8f3fc] hidden md:block z-1" />
          
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/portal-hero-microscope.png"
            alt="Laboratory Operations Microscope"
            className="h-32 sm:h-36 md:h-40 w-auto object-contain object-right-bottom drop-shadow-sm select-none"
          />
        </div>
      </div>

      {/* ================= 2. SIX PROFESSIONAL PORTAL CARDS GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {portalCards.map((card) => {
          const IconComponent = card.icon;
          const isSamplesCard = card.id === 'samples';

          const cardContent = (
            <>
              <div>
                {/* Header Row: Circle Icon Badge + Top Status Tag */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`h-13 w-13 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-2xs ${card.iconBg}`}
                  >
                    <IconComponent className="h-6 w-6 stroke-[2.2]" />
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
                    {card.badgeText}
                  </span>
                </div>

                {/* Card Title & Navigation Arrow */}
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h2>
                  <div className={`transition-all duration-200 ${card.arrowColor}`}>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-[13px] text-slate-500 font-normal leading-relaxed mt-2.5">
                  {card.description}
                </p>
              </div>

              {/* Bottom Subtle Highlight Bar on Hover */}
              <div className="mt-5 pt-3 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>{isSamplesCard ? 'Select Laboratory' : 'Access Portal Module'}</span>
                <span className="font-semibold group-hover:text-blue-600 transition-colors flex items-center gap-1">
                  {isSamplesCard ? 'Choose Lab' : 'Open'} <span>&rarr;</span>
                </span>
              </div>
            </>
          );

          if (isSamplesCard) {
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setLabModalTarget('samples');
                  setIsLabModalOpen(true);
                }}
                className={`group relative rounded-2xl border p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:-translate-y-1 text-left w-full ${card.cardBg}`}
              >
                {cardContent}
              </button>
            );
          }

          if (card.id === 'tasks') {
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setLabModalTarget('tasks');
                  setIsLabModalOpen(true);
                }}
                className={`group relative rounded-2xl border p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:-translate-y-1 text-left w-full ${card.cardBg}`}
              >
                {cardContent}
              </button>
            );
          }

          return (
            <Link
              key={card.id}
              href={card.href}
              className={`group relative rounded-2xl border p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-2xs hover:-translate-y-1 ${card.cardBg}`}
            >
              {cardContent}
            </Link>
          );
        })}
      </div>

      {/* ================= MODAL: 3 LAB OPTIONS (General, Penicillin, Cephalosporin) ================= */}
      <Modal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
        title="Select Analytical Laboratory"
        subtitle={
          labModalTarget === 'tasks'
            ? 'Choose a QC laboratory facility to allocate and manage its analytical tasks:'
            : 'Choose a QC laboratory facility to view and manage its active sample records:'
        }
        maxWidth="2xl"
      >
        <div className="space-y-3.5">
          {labOptions.map((lab) => {
            const isLocked = userAccess !== 'ALL' && userAccess !== lab.code;
            const LabIcon = lab.icon;
            const labCount =
              lab.id === 'general'
                ? metrics?.byLab?.general ?? 8
                : lab.id === 'penicillin'
                ? metrics?.byLab?.penicillin ?? 5
                : metrics?.byLab?.cephalosporin ?? 4;

            const countBadgeText =
              labModalTarget === 'tasks'
                ? lab.id === 'general'
                  ? '3 Tasks'
                  : lab.id === 'penicillin'
                  ? '2 Tasks'
                  : '2 Tasks'
                : `${labCount} Samples`;

            const actionLabel =
              labModalTarget === 'tasks'
                ? 'View Tasks'
                : `View ${labCount} Samples`;

            return (
              <button
                key={lab.id}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) {
                    setSelectedLabForAuth({
                      ...lab,
                      href: labModalTarget === 'tasks' ? `/tasks?lab=${lab.id}` : `/samples?lab=${lab.id}`,
                      desc: labModalTarget === 'tasks' ? `Task Allocation & Workload Delegation for ${lab.name}` : '',
                    });
                    setIsAuthModalOpen(true);
                  }
                }}
                className={cn(
                  'w-full p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-4 group',
                  isLocked
                    ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : `${lab.cardBg} cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5`
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105', lab.iconBg)}>
                    <LabIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {lab.name}
                      </h4>
                      <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border', lab.badgeBg)}>
                        {lab.badge}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200 shadow-2xs">
                        {countBadgeText}
                      </span>
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Lock className="h-3 w-3" />
                          <span>Restricted</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                  <span className="hidden sm:inline">{actionLabel}</span>
                  <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors shadow-2xs">
                    <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Click any laboratory above to authenticate with its designated security credentials.</span>
          <button
            type="button"
            onClick={() => setIsLabModalOpen(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ================= SECURITY CREDENTIALS MODAL (Username: lab / Password: lab123) ================= */}
      <LabSecurityModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        targetLab={selectedLabForAuth}
        onSuccess={(lab) => {
          setIsAuthModalOpen(false);
          setIsLabModalOpen(false);
          router.push(lab.href);
        }}
      />

    </div>
  );
}
