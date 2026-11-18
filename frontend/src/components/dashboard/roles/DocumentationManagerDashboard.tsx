'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { Product, ProductDocument } from '@/types/lims';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Folder,
  UploadCloud,
  Eye,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Plus,
  BookOpen,
  Layers,
  Trash2,
  ShieldCheck,
  Calendar,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductFolderViewerModal } from '@/components/documentation/ProductFolderViewerModal';
import { cn } from '@/lib/utils';
import { formatDateTime, getSampleIsoDate, matchesDateRangeFilter } from '@/lib/date';
import { MonthYearSearchPicker } from '@/components/dashboard/MonthYearSearchPicker';

export interface DocumentationManagerDashboardProps {
  dateFilter?: string;
  onSelectDateFilter?: (date: string) => void;
}

export function DocumentationManagerDashboard({
  dateFilter,
  onSelectDateFilter,
}: DocumentationManagerDashboardProps = {}) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Date Filter Sync State (defaults to ALL if not specified)
  const [internalDateFilter, setInternalDateFilter] = useState<string>('ALL');
  const effectiveDateFilter = dateFilter !== undefined ? dateFilter : internalDateFilter;
  const setEffectiveDateFilter = (newDate: string) => {
    setInternalDateFilter(newDate);
    onSelectDateFilter?.(newDate);
  };

  // Products query with live polling
  const { data: products = [], refetch, isFetching } = useQuery({
    queryKey: ['doc-manager-dashboard-products'],
    queryFn: () => productService.getAll(),
    refetchInterval: 4000,
  });

  // Query deletion updates from Admin (Approved / Rejected)
  const { data: deletionUpdates = [], refetch: refetchDeletions } = useQuery({
    queryKey: ['doc-manager-deletion-updates'],
    queryFn: () => productService.getDeletionUpdates(),
    refetchInterval: 4000,
  });

  const approvedDocs = deletionUpdates.filter((d) => d.deleteStatus === 'APPROVED');

  // Flatten all documents across all catalog products
  const allDocuments = React.useMemo(() => {
    return products.flatMap((p) =>
      (p.documents || []).map((d) => ({
        ...d,
        productBrandName: p.brandName,
        productId: p.id,
      }))
    );
  }, [products]);

  // Filter documents based on active timeline date range
  const filteredDocuments = React.useMemo(() => {
    if (!effectiveDateFilter || effectiveDateFilter === 'ALL') return allDocuments;
    return allDocuments.filter((d: any) =>
      matchesDateRangeFilter(d.createdAt, effectiveDateFilter)
    );
  }, [allDocuments, effectiveDateFilter]);

  // Document counts mapped by YYYY-MM
  const monthCountsRecord = React.useMemo(() => {
    const rec: Record<string, number> = {};
    for (const d of allDocuments) {
      const iso = getSampleIsoDate(d.createdAt);
      if (iso) {
        const ym = iso.slice(0, 7);
        rec[ym] = (rec[ym] || 0) + 1;
      }
    }
    return rec;
  }, [allDocuments]);

  // Month-wise options with document upload counts
  const monthOptions = React.useMemo(() => {
    const monthCounts = new Map<string, number>();
    for (const d of allDocuments) {
      const iso = getSampleIsoDate(d.createdAt);
      if (iso) {
        const ym = iso.slice(0, 7);
        monthCounts.set(ym, (monthCounts.get(ym) || 0) + 1);
      }
    }

    const monthsSet = new Set<string>();
    const now = new Date();
    // Recent 6 calendar months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${yyyy}-${mm}`);
    }
    // Any months with uploaded documents
    monthCounts.forEach((_, ym) => {
      if (/^\d{4}-\d{2}$/.test(ym)) {
        monthsSet.add(ym);
      }
    });

    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((monthKey) => {
        let label = monthKey;
        try {
          const [year, month] = monthKey.split('-').map(Number);
          const date = new Date(year, month - 1, 1);
          label = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        } catch {}
        const count = monthCounts.get(monthKey) || 0;
        return { monthKey, label, count };
      });
  }, [allDocuments]);

  // Helper to format active filter label
  const activeFilterLabel = React.useMemo(() => {
    if (!effectiveDateFilter || effectiveDateFilter === 'ALL') return 'All Months';
    if (/^\d{4}-\d{2}$/.test(effectiveDateFilter)) {
      try {
        const [year, month] = effectiveDateFilter.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        });
      } catch {
        return effectiveDateFilter;
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(effectiveDateFilter)) {
      try {
        const [y, m, d] = effectiveDateFilter.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return effectiveDateFilter;
      }
    }
    if (effectiveDateFilter === 'TODAY') return 'Today';
    if (effectiveDateFilter === 'YESTERDAY') return 'Yesterday';
    if (effectiveDateFilter === 'WEEK') return 'This Week';
    if (effectiveDateFilter === 'MONTH') return 'This Month';
    if (effectiveDateFilter === 'YEAR') return 'This Year';
    return effectiveDateFilter;
  }, [effectiveDateFilter]);

  const totalDocuments = allDocuments.length;

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.brandName.toLowerCase().includes(term) ||
      p.genericName.toLowerCase().includes(term) ||
      p.atmCode.toLowerCase().includes(term) ||
      (p.laboratory || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-navy-950 text-white p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500 text-white shadow-xs">
                Documentation Manager Center
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Officer: {user?.fullName || 'Documentation Manager'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Standard Testing Procedures (STP) &amp; Product Dossiers
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/documentation-manager"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Open Doc Manager</span>
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh product list"
            >
              <RotateCcw className={cn('w-4 h-4', isFetching && 'animate-spin text-teal-300')} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Commercial Products</span>
            <BookOpen className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{products.length}</div>
          <p className="text-[11px] text-slate-400">Total products in catalog</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Uploaded Documents</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {effectiveDateFilter === 'ALL' ? totalDocuments : filteredDocuments.length}
            {effectiveDateFilter !== 'ALL' && (
              <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                / {totalDocuments} total
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {effectiveDateFilter === 'ALL'
              ? 'Word, Excel & PDF files'
              : `Uploaded in ${activeFilterLabel}`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Laboratories</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">3</div>
          <p className="text-[11px] text-slate-400">General, Penicillin, Cephalosporin</p>
        </div>
      </div>

      {/* Admin Approved Deletions Banner */}
      {approvedDocs.length > 0 && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 text-sm">
                  Document Deletion Approved by Administrator ({approvedDocs.length})
                </h3>
                <p className="text-xs text-emerald-800">
                  Administrator has approved the deletion of the following document(s). You are now authorized to permanently delete them.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {approvedDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-slate-900 text-xs">{doc.fileName}</span>
                    <span className="text-[10px] text-slate-500">Product: {doc.productName}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Approved by: <strong>{doc.deleteApprovedByName || 'Administrator'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const prod = products.find((p) => p.id === doc.productId);
                      if (prod) {
                        setSelectedProduct(prod);
                        setIsFolderModalOpen(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Open Folder &amp; Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Documentation Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        {/* Month-Wise Filter Bar for Documents */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-3 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Month Wise:</span>
            </span>

            {/* All Months button */}
            <button
              type="button"
              onClick={() => setEffectiveDateFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                effectiveDateFilter === 'ALL'
                  ? 'bg-teal-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              )}
            >
              <span>All Months</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono',
                  effectiveDateFilter === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-slate-700 shadow-2xs'
                )}
              >
                {totalDocuments}
              </span>
            </button>

            {/* Individual Months buttons */}
            {monthOptions.map(({ monthKey, label, count }) => {
              const isSelected = effectiveDateFilter === monthKey;
              return (
                <button
                  key={monthKey}
                  type="button"
                  onClick={() => setEffectiveDateFilter(monthKey)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                    isSelected
                      ? 'bg-teal-700 text-white shadow-xs font-bold'
                      : count > 0
                      ? 'text-teal-900 bg-teal-50 border border-teal-200 hover:bg-teal-100'
                      : 'text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : count > 0
                        ? 'bg-white text-teal-800 shadow-2xs'
                        : 'bg-slate-200/70 text-slate-600'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Month & Year Search Picker */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 ml-1">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-teal-600" />
                <span>Search Month:</span>
              </span>
              <MonthYearSearchPicker
                value={effectiveDateFilter}
                onChange={(val) => setEffectiveDateFilter(val)}
                docCounts={monthCountsRecord}
                placeholder="Search Month & Year..."
              />
            </div>
          </div>

          {effectiveDateFilter !== 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200 flex items-center gap-1">
                Active Month: <strong>{activeFilterLabel}</strong>
                <span className="font-mono text-slate-600">({filteredDocuments.length} docs)</span>
              </span>
              <button
                type="button"
                onClick={() => setEffectiveDateFilter('ALL')}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset to All Months"
              >
                <X className="w-3 h-3" />
                <span>Show All</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-teal-600" />
              <span>Product Master Dossiers &amp; Uploaded Files</span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 w-44"
              />
            </div>
            <Link
              href="/documentation-manager"
              className="px-3 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Upload Files</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Laboratory</th>
                <th className="py-2.5 px-3">Attached Documents</th>
                <th className="py-2.5 px-3">Latest Document</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const docs = p.documents || [];
                const matchingDocs =
                  effectiveDateFilter === 'ALL'
                    ? docs
                    : docs.filter((d: any) =>
                        matchesDateRangeFilter(d.createdAt, effectiveDateFilter)
                      );
                const latestDoc = matchingDocs[0] || docs[0];
                const hasMatching = matchingDocs.length > 0;

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'hover:bg-teal-50/20 transition-colors',
                      effectiveDateFilter !== 'ALL' && hasMatching && 'bg-teal-50/15'
                    )}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.brandName}</div>
                      <div className="text-[11px] text-slate-500">{p.genericName}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {p.laboratory} LAB
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {effectiveDateFilter === 'ALL' ? (
                        <span
                          className={cn(
                            'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                            docs.length > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          )}
                        >
                          {docs.length} {docs.length === 1 ? 'File' : 'Files'}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                            hasMatching
                              ? 'bg-teal-100 text-teal-900 border-teal-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          )}
                        >
                          {matchingDocs.length} / {docs.length} Files
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {latestDoc ? (
                        <div className="max-w-[200px] truncate" title={latestDoc.fileName}>
                          <span className="font-medium text-slate-800">{latestDoc.fileName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {(latestDoc.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No document</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsFolderModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 border border-teal-300 text-teal-800 shadow-2xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Folder className="w-3.5 h-3.5 text-teal-600" />
                          <span>View Folder</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-slate-700">No documents found for {activeFilterLabel}</p>
                      <p className="text-xs text-slate-400">
                        Try selecting another month from the bar above.
                      </p>
                      <button
                        type="button"
                        onClick={() => setEffectiveDateFilter('ALL')}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Show All Documents</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Folder Modal */}
      {selectedProduct && (
        <ProductFolderViewerModal
          isOpen={isFolderModalOpen}
          onClose={() => {
            setIsFolderModalOpen(false);
            setSelectedProduct(null);
            refetch();
            refetchDeletions();
          }}
          product={selectedProduct}
        />
      )}
    </div>
  );
}

