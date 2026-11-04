'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { Product, ProductDocument } from '@/types/lims';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  FileText,
  UploadCloud,
  FileCheck2,
  History,
  Download,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileCode,
  Tag,
  ArrowRight,
  Trash2,
  Info,
  Eye,
} from 'lucide-react';

export default function DocumentationManagerDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('');
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [labFilter, setLabFilter] = useState('ALL');

  // History Modal states
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Queries
  const {
    data: products = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  const {
    data: documentHistory = [],
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['product-history', historyProduct?.id],
    queryFn: () => (historyProduct ? productService.getDocuments(historyProduct.id) : Promise.resolve([])),
    enabled: !!historyProduct,
  });

  // Selected product object
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // When selected product changes, pre-fill title
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    setStatusMessage(null);
    setFileError(null);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setDocTitle(`${prod.brandName} (${prod.strength}) — Finished Product Specification & Method Description (PDF)`);
      setVersionNotes(
        prod.currentDocument
          ? `Revision update: replacement document for Version ${prod.currentDocument.version + 1}.0`
          : 'Initial approved PDF document specification upload'
      );
    } else {
      setDocTitle('');
      setVersionNotes('');
    }
  };

  // File selection handler with strict PDF check (.pdf only)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileNameLower = file.name.toLowerCase();
    const isPdfExt = fileNameLower.endsWith('.pdf');
    const isPdfMime = !file.type || file.type === 'application/pdf' || file.type === 'application/x-pdf';

    if (!isPdfExt || !isPdfMime) {
      setFileError('Invalid file format! Only PDF documents (.pdf) are allowed. No other file types can be uploaded.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 50MB check
    if (file.size > 50 * 1024 * 1024) {
      setFileError('File size exceeds the 50MB maximum limit.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProductId || !selectedFile) {
        throw new Error('Please select a product and choose a PDF file (.pdf).');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', docTitle.trim() || `${activeProduct?.brandName} Description`);
      if (versionNotes.trim()) {
        formData.append('versionNotes', versionNotes.trim());
      }

      return productService.uploadDocument(selectedProductId, formData);
    },
    onSuccess: (data) => {
      setStatusMessage({
        type: 'success',
        text: `PDF document "${data.fileName}" uploaded successfully as Version ${data.version}.0! Instantly available for Analyst Execution.`,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-history', selectedProductId] });
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to upload PDF document. Please try again.',
      });
    },
  });

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.atmCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.currentDocument?.fileName && p.currentDocument.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLab = labFilter === 'ALL' || p.laboratory === labFilter;
      return matchesSearch && matchesLab;
    });
  }, [products, searchQuery, labFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const withDocs = products.filter((p) => !!p.currentDocument).length;
    const pending = total - withDocs;
    return { total, withDocs, pending };
  }, [products]);

  const canUpload =
    user?.role === 'DOCUMENTATION_MANAGER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'QA_MANAGER' ||
    user?.role === 'MANAGER';

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Documentation Manager Dashboard
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Official Commercial Product Descriptions & Word Document Lifecycle Management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Role: {user?.role || 'DOCUMENTATION_MANAGER'}</span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
            Sync
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Commercial catalog</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Active Word Documents</p>
            <p className="text-2xl font-bold text-teal-900 mt-1">{stats.withDocs}</p>
            <p className="text-xs text-teal-600 mt-0.5">Available across testing & catalog</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Word Docs</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</p>
            <p className="text-xs text-amber-600 mt-0.5">Requires description upload</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Section: Upload Form (Left) & Live Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-rose-600" />
              <h2 className="font-semibold text-slate-900 text-sm">
                Upload Product Description (.pdf only)
              </h2>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded">
              PDF Only
            </span>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={cn(
                'p-3.5 rounded-xl border text-xs flex items-start gap-2.5',
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              )}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{statusMessage.text}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              uploadMutation.mutate();
            }}
            className="space-y-4"
          >
            {/* Step 1: Select Product */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                1. Select Existing Product from Database <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                required
              >
                <option value="">-- Choose a Commercial Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brandName} ({p.strength}) — [{p.atmCode}] ({p.labName})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled Product Card */}
            {activeProduct && (
              <div className="bg-gradient-to-br from-teal-50/70 to-slate-50 border border-teal-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      {activeProduct.brandName}
                    </span>
                    <span className="text-slate-500 ml-1.5 text-xs">
                      ({activeProduct.genericName})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-teal-100 text-teal-800 border border-teal-200">
                    {activeProduct.atmCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Laboratory / Category</span>
                    <span className="font-medium text-slate-800">{activeProduct.labName} ({activeProduct.laboratory})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dosage & Strength</span>
                    <span className="font-medium text-slate-800">{activeProduct.dosageForm} • {activeProduct.strength}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-teal-100/70 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Current Attached PDF Document:</span>
                  {activeProduct.currentDocument ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <FileText className="w-3 h-3 text-rose-600" />
                      v{activeProduct.currentDocument.version}.0 ({activeProduct.currentDocument.fileName})
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      No PDF document attached yet
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                2. Document Title / Description Specification
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g. Askprol Suspension - Finished Product Method & Spec (PDF)"
                disabled={!activeProduct}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
                required
              />
            </div>

            {/* Version Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                3. Version Release Notes / Change Reason
              </label>
              <textarea
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Detail reason for this document version, regulatory reference, or changes from prior revision..."
                rows={2}
                disabled={!activeProduct}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-400 resize-none"
              />
            </div>

            {/* Drag & Drop PDF Document File Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                4. Select PDF Document (.pdf only) <span className="text-rose-500">*</span>
              </label>

              <div
                onClick={() => activeProduct && fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                  activeProduct
                    ? 'border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/20'
                    : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={!activeProduct}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>

                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-800 break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different PDF
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {activeProduct
                          ? 'Click to browse PDF Document (.pdf)'
                          : 'Select a product first'}
                      </p>
                      <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                        Strictly PDF format only (.pdf) • Maximum 50MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {fileError && (
                <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fileError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                !canUpload ||
                !activeProduct ||
                !selectedFile ||
                uploadMutation.isPending
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading PDF Document...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {activeProduct?.currentDocument
                      ? `Upload PDF Revision (v${activeProduct.currentDocument.version + 1}.0)`
                      : 'Upload & Link PDF Document (v1.0)'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Active Products & Word Document Directory */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">
                Commercial Products & Attached PDF Documents
              </h2>
              <p className="text-[11px] text-slate-500">
                PDF files instantly propagate to Analyst Testing Workstation & Product Catalog
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="text-xs rounded-lg border border-slate-200 pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 w-36 sm:w-44"
                />
              </div>

              {/* Lab Filter */}
              <select
                value={labFilter}
                onChange={(e) => setLabFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="ALL">All Labs</option>
                <option value="GENERAL">General</option>
                <option value="PENICILLIN">Penicillin</option>
                <option value="CEPHALOSPORIN">Cephalosporin</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              Loading commercial products catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No matching products found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Product / ATM Code</th>
                    <th className="py-2.5 px-3">Laboratory</th>
                    <th className="py-2.5 px-3">Current PDF Document</th>
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const doc = p.currentDocument;
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          'hover:bg-slate-50/80 transition-colors',
                          selectedProductId === p.id && 'bg-teal-50/40'
                        )}
                      >
                        {/* Product Name */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{p.brandName}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.genericName} • {p.strength}
                          </div>
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                            {p.atmCode}
                          </span>
                        </td>

                        {/* Laboratory */}
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                              p.laboratory === 'GENERAL'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : p.laboratory === 'PENICILLIN'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            )}
                          >
                            {p.laboratory}
                          </span>
                        </td>

                        {/* Document */}
                        <td className="py-3 px-3">
                          {doc ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                <span className="p-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  <FileText className="w-3 h-3" />
                                </span>
                                <span className="max-w-[150px] sm:max-w-[180px] truncate" title={doc.fileName}>
                                  {doc.fileName}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {(doc.fileSize / 1024).toFixed(1)} KB • By {doc.uploadedByName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No PDF uploaded
                            </span>
                          )}
                        </td>

                        {/* Version */}
                        <td className="py-3 px-3">
                          {doc ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              v{doc.version}.0
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View PDF inline */}
                            {doc && (
                              <a
                                href={productService.getDocumentViewUrl(doc.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open & View PDF in Browser"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Download PDF */}
                            {doc && (
                              <a
                                href={productService.getDocumentDownloadUrl(doc.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download PDF Document"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* View Version History */}
                            <button
                              onClick={() => {
                                setHistoryProduct(p);
                                setHistoryModalOpen(true);
                              }}
                              title="View Document Version History"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Select for Update */}
                            <button
                              onClick={() => handleProductSelect(p.id)}
                              title="Update / Replace Document"
                              className={cn(
                                'px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors',
                                selectedProductId === p.id
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                              )}
                            >
                              {doc ? 'Replace' : 'Upload'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Version History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryProduct(null);
        }}
        title={`Version History — ${historyProduct?.brandName || 'Product'}`}
        subtitle={`Product ATM Code: ${historyProduct?.atmCode || ''} | Category: ${historyProduct?.labName || ''}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {isHistoryLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
              Loading revision audit trail...
            </div>
          ) : documentHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No PDF documents have been uploaded for this product yet.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                All uploaded PDF document versions are preserved permanently for 21 CFR Part 11 ALCOA+ audit compliance.
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {documentHistory.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      item.isCurrent ? 'bg-rose-50/30' : 'bg-white'
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          v{item.version}.0
                        </span>
                        {item.isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                            Current Active
                          </span>
                        )}
                        <span className="font-semibold text-slate-800">
                          {item.fileName}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {item.title}
                      </p>

                      {item.versionNotes && (
                        <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                          &quot;{item.versionNotes}&quot;
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>Uploaded by: <strong className="text-slate-600">{item.uploadedByName}</strong></span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>{(item.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={productService.getDocumentViewUrl(item.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium shadow-sm transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </a>
                      <a
                        href={productService.getDocumentDownloadUrl(item.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-sm transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-rose-600" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setHistoryModalOpen(false);
                setHistoryProduct(null);
              }}
              className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

