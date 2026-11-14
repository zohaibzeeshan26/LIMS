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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductFolderViewerModal } from '@/components/documentation/ProductFolderViewerModal';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/date';

export function DocumentationManagerDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

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

  const totalDocuments = React.useMemo(() => {
    return products.reduce((acc, p) => acc + (p.documents?.length || 0), 0);
  }, [products]);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="text-2xl font-black text-slate-900">{totalDocuments}</div>
          <p className="text-[11px] text-slate-400">Word, Excel &amp; PDF files</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Laboratories</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">3</div>
          <p className="text-[11px] text-slate-400">General, Penicillin, Cephalosporin</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Analyst Live Sync</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">Active</div>
          <p className="text-[11px] text-slate-400">Instantly delivered to Testing Panel</p>
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
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      v{doc.version}.0
                    </span>
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
                <th className="py-2.5 px-3">ATM Code</th>
                <th className="py-2.5 px-3">Laboratory</th>
                <th className="py-2.5 px-3">Attached Documents</th>
                <th className="py-2.5 px-3">Latest Document</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const docs = p.documents || [];
                const latestDoc = docs[0];

                return (
                  <tr key={p.id} className="hover:bg-teal-50/20 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.brandName}</div>
                      <div className="text-[11px] text-slate-500">{p.genericName}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-teal-800">{p.atmCode}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {p.laboratory} LAB
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                        docs.length > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      )}>
                        {docs.length} {docs.length === 1 ? 'File' : 'Files'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {latestDoc ? (
                        <div className="max-w-[200px] truncate" title={latestDoc.fileName}>
                          <span className="font-medium text-slate-800">{latestDoc.fileName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">v{latestDoc.version}.0 &bull; {(latestDoc.fileSize / 1024).toFixed(1)} KB</span>
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

