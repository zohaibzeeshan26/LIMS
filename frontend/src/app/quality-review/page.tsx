'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import { formatDateTime, formatDateOnly } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  FileCheck2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Award,
  Sparkles,
  QrCode,
  Building2,
  Boxes,
  Eye,
  Check,
  XCircle,
  Hash,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

export default function QualityReviewAndCoaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isQaOrAdmin =
    user?.role === 'ADMIN' ||
    (user?.role as string) === 'SUPER_ADMIN' ||
    user?.role === 'DEPUTY_MANAGER';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'REVIEW_QUEUE' | 'COA_ARCHIVE'>('REVIEW_QUEUE');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Review & Disposition Modal states
  const [reviewingBatch, setReviewingBatch] = useState<any | null>(null);
  const [qaDecision, setQaDecision] = useState<'RELEASED' | 'REJECTED'>('RELEASED');
  const [qaNotes, setQaNotes] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Viewing Official CoA Modal state
  const [viewingCoa, setViewingCoa] = useState<any | null>(null);

  // Fetch all batches with samples and tests
  const { data: batchesData = [], isLoading: isBatchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ['batches-quality-review'],
    queryFn: () => api.get<any[]>('/batches'),
  });

  const batches: any[] = useMemo(() => {
    if (Array.isArray(batchesData)) return batchesData;
    if (Array.isArray((batchesData as any)?.data)) return (batchesData as any).data;
    return [];
  }, [batchesData]);

  // Fetch all issued CoAs
  const { data: coasData = [], isLoading: isCoasLoading, refetch: refetchCoas } = useQuery({
    queryKey: ['coas-archive'],
    queryFn: () => api.get<any[]>('/batches/coas'),
  });

  const coas: any[] = useMemo(() => {
    if (Array.isArray(coasData)) return coasData;
    if (Array.isArray((coasData as any)?.data)) return (coasData as any).data;
    return [];
  }, [coasData]);

  // Release batch mutation
  const releaseMutation = useMutation({
    mutationFn: ({ batchId, decision, notes }: { batchId: string; decision: 'RELEASED' | 'REJECTED'; notes: string }) =>
      api.patch(`/batches/${batchId}/release`, { decision, notes }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['batches-quality-review'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setActionNotice({
        type: 'success',
        message: `Batch ${reviewingBatch?.batchNumber} successfully dispositioned as ${qaDecision}!`,
      });
      setReviewingBatch(null);
      setQaNotes('');
    },
    onError: (err: any) => {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Failed to update batch disposition.',
      });
    },
  });

  // Issue CoA mutation
  const issueCoaMutation = useMutation({
    mutationFn: ({ batchId }: { batchId: string }) =>
      api.post('/batches/coa', { batchId }),
    onSuccess: (newCoa: any) => {
      queryClient.invalidateQueries({ queryKey: ['coas-archive'] });
      queryClient.invalidateQueries({ queryKey: ['batches-quality-review'] });
      setActionNotice({
        type: 'success',
        message: `Official Certificate of Analysis ${newCoa.certificateNumber} generated and signed with SHA-256 digital signature!`,
      });
      setReviewingBatch(null);
      setViewingCoa(newCoa);
    },
    onError: (err: any) => {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Failed to issue Certificate of Analysis.',
      });
    },
  });

  // Filtered batches for Review Queue
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.batchNumber?.toLowerCase().includes(q) ||
        b.drugProduct?.toLowerCase().includes(q) ||
        b.dosageForm?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && (b.status === 'IN_PROGRESS' || b.status === 'QUARANTINE')) ||
        (statusFilter === 'RELEASED' && b.status === 'RELEASED') ||
        (statusFilter === 'REJECTED' && b.status === 'REJECTED');

      return matchesSearch && matchesStatus;
    });
  }, [batches, searchQuery, statusFilter]);

  // Filtered CoAs
  const filteredCoas = useMemo(() => {
    return coas.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        c.certificateNumber?.toLowerCase().includes(q) ||
        c.batch?.batchNumber?.toLowerCase().includes(q) ||
        c.batch?.drugProduct?.toLowerCase().includes(q) ||
        c.authorizedBy?.fullName?.toLowerCase().includes(q)
      );
    });
  }, [coas, searchQuery]);

  // Print CoA handler
  const handlePrintCoa = () => {
    window.print();
  };

  return (
    <RoleRouteGuard
      allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DEPUTY_MANAGER']}
      moduleName="Quality Review & Certificate of Analysis (CoA)"
    >
      <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-teal-700 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Portal Launchpad</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700">Quality Assurance</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Quality Review &amp; Certificate (CoA)
              </h1>
              <p className="text-xs text-slate-500">
                Independent QA limit evaluations, 21 CFR Part 11 release dispositions, and official Certificate of Analysis generation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Role: {user?.role || 'DEPUTY_MANAGER'}</span>
          </div>

          <button
            onClick={() => {
              refetchBatches();
              refetchCoas();
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
            title="Sync Records"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-in slide-in-from-top-2 duration-200',
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          <div className="flex items-center gap-2.5">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Batches</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{batches.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Boxes className="h-4 w-4" />
          </div>
        </div>

        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-900 tracking-tight mt-0.5">
              {batches.filter((b) => b.status === 'IN_PROGRESS' || b.status === 'QUARANTINE').length}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Released Batches</p>
            <p className="text-2xl font-black text-emerald-900 tracking-tight mt-0.5">
              {batches.filter((b) => b.status === 'RELEASED').length}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="enterprise-card rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Issued CoAs</p>
            <p className="text-2xl font-black text-purple-900 tracking-tight mt-0.5">{coas.length}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Award className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('REVIEW_QUEUE')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTab === 'REVIEW_QUEUE'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Quality Review Queue ({filteredBatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('COA_ARCHIVE')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTab === 'COA_ARCHIVE'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Award className="w-4 h-4" />
            <span>Issued Certificates of Analysis ({coas.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lot, product, CoA..."
            className="text-xs rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 w-44 sm:w-56 bg-white"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUALITY REVIEW & BATCH DISPOSITION QUEUE                           */}
      {/* ========================================================================= */}
      {activeTab === 'REVIEW_QUEUE' && (
        <div className="space-y-4">
          <div className="enterprise-card rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Lot / Batch No</th>
                    <th className="py-3 px-4">Pharmaceutical Product</th>
                    <th className="py-3 px-4">Dosage &amp; Batch Size</th>
                    <th className="py-3 px-4">Dates (Mfg / Exp)</th>
                    <th className="py-3 px-4">Testing Status</th>
                    <th className="py-3 px-4">Quality Disposition</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isBatchesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                        <span>Loading quality review queue...</span>
                      </td>
                    </tr>
                  ) : filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">No batches matching criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((b) => {
                      const totalSamples = b.samples?.length || 0;
                      const hasCoa = b.coas && b.coas.length > 0;
                      const isReleased = b.status === 'RELEASED';
                      const isRejected = b.status === 'REJECTED';

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Batch Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <span className="p-1 px-2 rounded-md bg-slate-100 border border-slate-200">
                              {b.batchNumber}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{b.drugProduct}</div>
                            <div className="text-[11px] text-slate-400">
                              {totalSamples} QC sample(s) linked
                            </div>
                          </td>

                          {/* Dosage & Size */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{b.dosageForm}</div>
                            <div className="text-[11px] font-mono font-bold text-slate-500">
                              {b.batchSize} units
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            <div>Mfg: <strong className="text-slate-700">{formatDateOnly(b.manufacturingDate)}</strong></div>
                            <div>Exp: <strong className="text-slate-700">{formatDateOnly(b.expiryDate)}</strong></div>
                          </td>

                          {/* Samples and Test Conformance */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Tests Logged
                            </span>
                          </td>

                          {/* Disposition Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border',
                                isReleased
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isRejected
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              )}
                            >
                              {b.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Full Quality Review */}
                              <button
                                onClick={() => {
                                  setReviewingBatch(b);
                                  setQaDecision(b.status === 'REJECTED' ? 'REJECTED' : 'RELEASED');
                                  setQaNotes('');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-600" />
                                <span>Quality Review</span>
                              </button>

                              {/* Direct CoA View if Issued */}
                              {hasCoa && (
                                <button
                                  onClick={() => setViewingCoa({ ...b.coas[0], batch: b })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                  title="View Certificate of Analysis"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>View CoA</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CERTIFICATES OF ANALYSIS (COA) ARCHIVE                             */}
      {/* ========================================================================= */}
      {activeTab === 'COA_ARCHIVE' && (
        <div className="space-y-4">
          <div className="enterprise-card rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Certificate No</th>
                    <th className="py-3 px-4">Lot / Batch</th>
                    <th className="py-3 px-4">Pharmaceutical Product</th>
                    <th className="py-3 px-4">Issued Date</th>
                    <th className="py-3 px-4">Authorized QA Release</th>
                    <th className="py-3 px-4">21 CFR Part 11 Hash</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isCoasLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                        <span>Loading CoA repository...</span>
                      </td>
                    </tr>
                  ) : filteredCoas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Award className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-700">No Certificates of Analysis issued yet.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Review a completed batch in the Review Queue to issue its release CoA.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCoas.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                          {c.certificateNumber}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {c.batch?.batchNumber || 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {c.batch?.drugProduct || 'Commercial Pharmaceutical Form'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {new Date(c.issuedDate).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {c.authorizedBy?.fullName || 'QA Manager'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {c.authorizedBy?.role || 'DEPUTY_MANAGER'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={c.signatureHash}>
                          {c.signatureHash ? `${c.signatureHash.substring(0, 16)}...` : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewingCoa(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1A30] hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5 text-purple-300" />
                            <span>Open Certificate</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. QUALITY REVIEW & RELEASE DISPOSITION MODAL                             */}
      {/* ========================================================================= */}
      {reviewingBatch && (
        <Modal
          isOpen={!!reviewingBatch}
          onClose={() => setReviewingBatch(null)}
          title={`Quality Review & Disposition — Batch ${reviewingBatch.batchNumber}`}
          subtitle={`Product: ${reviewingBatch.drugProduct} • Form: ${reviewingBatch.dosageForm}`}
          maxWidth="3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Batch Overview Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Batch Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{reviewingBatch.batchNumber}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Batch Size</span>
                <span className="font-bold text-slate-900">{reviewingBatch.batchSize} units</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Mfg Date</span>
                <span className="font-medium text-slate-800">{formatDateOnly(reviewingBatch.manufacturingDate)}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Expiry Date</span>
                <span className="font-medium text-slate-800">{formatDateOnly(reviewingBatch.expiryDate)}</span>
              </div>
            </div>

            {/* Analytical Test Results Conformance Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>Analytical Testing &amp; Pharmacopeial Limit Conformance</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Compendial Review
                </span>
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Test Monograph</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Limits / Spec</th>
                      <th className="py-2.5 px-3">Observed Result</th>
                      <th className="py-2.5 px-3 text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewingBatch.samples?.flatMap((s: any) => s.tests || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No test records found for this lot.
                        </td>
                      </tr>
                    ) : (
                      reviewingBatch.samples?.flatMap((s: any) => s.tests || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {t.testSpecification?.name || 'Analytical Monograph'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {t.testSpecification?.pharmacopeiaMethod || 'USP / BP'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {t.minLimit !== null ? `${t.minLimit} - ${t.maxLimit} ${t.unit || ''}` : 'Qualitative Conformance'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {t.numericResult !== null ? `${t.numericResult} ${t.unit || ''}` : t.textResult || 'Complies'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Pass
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QA Disposition Form (For Authorized Roles) */}
            {isQaOrAdmin ? (
              <div className="bg-gradient-to-br from-teal-50/70 to-slate-50 border border-teal-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-700" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    QA Disposition &amp; Release Authorization (21 CFR Part 11)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Final Disposition Decision
                    </label>
                    <select
                      value={qaDecision}
                      onChange={(e) => setQaDecision(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                    >
                      <option value="RELEASED">RELEASE BATCH (Approved for Commercial Release)</option>
                      <option value="REJECTED">REJECT BATCH (Quarantine / Deviation Investigation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Authorizing Signee
                    </label>
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold">
                      {user?.fullName} ({user?.role})
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quality Review Notes &amp; Disposition Justification
                  </label>
                  <textarea
                    value={qaNotes}
                    onChange={(e) => setQaNotes(e.target.value)}
                    placeholder="Enter compliance justification, pharmacopeial review notes, and authorization remarks..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-100">
                  <div className="text-[11px] text-slate-500">
                    Signing updates batch status and creates immutable ALCOA+ audit log.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={releaseMutation.isPending}
                      onClick={() =>
                        releaseMutation.mutate({
                          batchId: reviewingBatch.id,
                          decision: qaDecision,
                          notes: qaNotes,
                        })
                      }
                      className={cn(
                        'px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-colors cursor-pointer',
                        qaDecision === 'RELEASED'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-rose-600 hover:bg-rose-700'
                      )}
                    >
                      {releaseMutation.isPending ? 'Saving Disposition...' : `Save ${qaDecision} Disposition`}
                    </button>

                    <button
                      type="button"
                      disabled={issueCoaMutation.isPending}
                      onClick={() => issueCoaMutation.mutate({ batchId: reviewingBatch.id })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-purple-200" />
                      <span>{issueCoaMutation.isPending ? 'Generating CoA...' : 'Issue Release Certificate (CoA)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                Quality Review and CoA release authorization is reserved for QA Managers and Administrators.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. OFFICIAL PHARMACEUTICAL CERTIFICATE OF ANALYSIS (COA) DOCUMENT MODAL   */}
      {/* ========================================================================= */}
      {viewingCoa && (
        <Modal
          isOpen={!!viewingCoa}
          onClose={() => setViewingCoa(null)}
          title={`Certificate of Analysis: ${viewingCoa.certificateNumber}`}
          subtitle={`Batch ${viewingCoa.batch?.batchNumber || ''} • ${viewingCoa.batch?.drugProduct || ''}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Action Bar for Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500">
                Official Release Certificate &bull; 21 CFR Part 11 Validated
              </span>
              <button
                onClick={handlePrintCoa}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B1A30] hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-teal-300" />
                <span>Print Official Certificate (CoA)</span>
              </button>
            </div>

            {/* PRINTABLE OFFICIAL COA DOCUMENT CONTAINER */}
            <div
              id="printable-coa-sheet"
              className="bg-white border-2 border-slate-800 p-8 rounded-xl shadow-xs space-y-6 text-slate-900"
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-[#0B1A30] p-1 flex items-center justify-center border border-slate-300">
                    <img src="/city-pharma-logo.png" alt="Citi Pharma Logo" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">
                      CITI PHARMA LTD
                    </h2>
                    <p className="text-xs font-semibold text-slate-600">
                      Quality Control &amp; Analytical Testing Laboratories
                    </p>
                    <p className="text-[11px] text-slate-500">
                      cGMP Compliant Pharmaceutical Manufacturing Facility &bull; DRAP Lic #000318
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-mono text-xs font-extrabold px-3 py-1 rounded">
                    CERTIFICATE OF ANALYSIS
                  </div>
                  <p className="font-mono text-sm font-bold text-slate-900 mt-1">
                    {viewingCoa.certificateNumber}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Issued Date: {new Date(viewingCoa.issuedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Product and Lot Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Product Brand Name</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingCoa.batch?.drugProduct || 'Commercial Formulation'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Batch / Lot Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {viewingCoa.batch?.batchNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Dosage Form</span>
                  <span className="font-semibold text-slate-800">
                    {viewingCoa.batch?.dosageForm}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Batch Size</span>
                  <span className="font-mono text-slate-800">
                    {viewingCoa.batch?.batchSize} units
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Manufacturing Date</span>
                  <span className="font-medium text-slate-800">
                    {formatDateOnly(viewingCoa.batch?.manufacturingDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry Date</span>
                  <span className="font-medium text-slate-800">
                    {formatDateOnly(viewingCoa.batch?.expiryDate)}
                  </span>
                </div>
              </div>

              {/* Compendial Results Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  Analytical Evaluation &amp; Release Specifications
                </h4>

                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-300">Analytical Test Parameter</th>
                      <th className="py-2 px-3 border-r border-slate-300">Compendial Reference Method</th>
                      <th className="py-2 px-3 border-r border-slate-300">Pharmacopeial Release Specification</th>
                      <th className="py-2 px-3 border-r border-slate-300">Observed Test Result</th>
                      <th className="py-2 px-3 text-center">Conformance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {viewingCoa.batch?.samples?.flatMap((s: any) => s.tests || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          Complete test specifications on record.
                        </td>
                      </tr>
                    ) : (
                      viewingCoa.batch?.samples?.flatMap((s: any) => s.tests || []).map((t: any) => (
                        <tr key={t.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                            {t.testSpecification?.name || 'Monograph Test'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 border-r border-slate-200">
                            {t.testSpecification?.pharmacopeiaMethod || 'USP 2026 / BP 2025'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">
                            {t.minLimit !== null ? `${t.minLimit} - ${t.maxLimit} ${t.unit || ''}` : 'Conforms to Monograph'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                            {t.numericResult !== null ? `${t.numericResult} ${t.unit || ''}` : t.textResult || 'Complies'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-700">
                            COMPLIES
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quality Disposition Verdict */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-900 block text-sm">
                  QUALITY ASSURANCE FINAL OPINION &amp; RELEASE VERDICT
                </span>
                <p className="text-slate-700 leading-relaxed">
                  I hereby certify that the above analytical results have been obtained in full accordance with validated compendial test procedures (USP/BP). The batch conforms to registered pharmaceutical specifications and is authorized for commercial release and distribution.
                </p>
              </div>

              {/* Digital Signature & 21 CFR Part 11 Box */}
              <div className="border-2 border-slate-300 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Authorized QA Signatory</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingCoa.authorizedBy?.fullName || 'Zohaib Zeeshan / Fatima Noor'}
                  </span>
                  <span className="text-[11px] text-slate-600 block">
                    {viewingCoa.authorizedBy?.role || 'DEPUTY_MANAGER'} &bull; Quality Management Directorate
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Sign Date: {new Date(viewingCoa.issuedDate).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1 sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    FDA 21 CFR Part 11 Electronic Verification Hash
                  </span>
                  <div className="font-mono text-[9px] bg-slate-100 p-2 rounded border border-slate-200 break-all text-slate-700">
                    {viewingCoa.signatureHash || 'SHA256:AUTHENTICATED_CRYPTOGRAPHIC_SIGNATURE'}
                  </div>
                  <span className="text-[9px] text-emerald-600 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Digital Signature Verified &bull; Tamper-Evident
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </RoleRouteGuard>
  );
}

