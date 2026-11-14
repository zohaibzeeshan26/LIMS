'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { Product } from '@/types/lims';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  ProductFolderViewerModal,
  DOCUMENT_SLOTS,
} from '@/components/documentation/ProductFolderViewerModal';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import {
  FileText,
  UploadCloud,
  FileCheck2,
  Download,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  Building2,
  Calendar,
  Clock,
  Layers,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileCode,
  Tag,
  ArrowRight,
  Trash2,
  Folder,
  Eye,
} from 'lucide-react';

export default function DocumentationManagerDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productInput, setProductInput] = useState<string>('');
  const [selectedLab, setSelectedLab] = useState<string>('GENERAL');
  const [selectedCategory, setSelectedCategory] = useState<string>('STP_METHOD');
  const [docTitle, setDocTitle] = useState<string>('');
  const [versionNotes, setVersionNotes] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Folder Modal states
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [selectedFolderProduct, setSelectedFolderProduct] = useState<Product | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [labFilter, setLabFilter] = useState('ALL');

  // Format Date & Time helper
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return { date: '—', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: '—', time: '' };
      return {
        date: d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      };
    } catch {
      return { date: '—', time: '' };
    }
  };

  // Queries
  const {
    data: products = [],
    isLoading,
  } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  // Selected product object
  const activeProduct = useMemo(() => {
    return (
      products.find(
        (p) =>
          (p.id === selectedProductId ||
            p.brandName.toLowerCase() === productInput.trim().toLowerCase()) &&
          (p.laboratory || 'GENERAL').toUpperCase() === selectedLab.toUpperCase()
      ) || null
    );
  }, [products, selectedProductId, productInput, selectedLab]);

  // When target laboratory is changed
  const handleLabChange = (newLab: string) => {
    setSelectedLab(newLab);
    if (productInput.trim()) {
      const clean = productInput.trim().toLowerCase();
      const matched = products.find(
        (p) =>
          p.brandName.toLowerCase() === clean &&
          (p.laboratory || 'GENERAL').toUpperCase() === newLab.toUpperCase()
      );
      if (matched) {
        setSelectedProductId(matched.id);
      } else {
        setSelectedProductId(productInput.trim());
      }
    }
  };

  // When selected product changes or is manually typed
  const handleProductInputChange = (val: string) => {
    setProductInput(val);
    setStatusMessage(null);
    setFileError(null);
    const clean = val.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        (p.id === val || p.brandName.toLowerCase() === clean) &&
        (p.laboratory || 'GENERAL').toUpperCase() === selectedLab.toUpperCase()
    );
    if (matched) {
      setSelectedProductId(matched.id);
      if (!docTitle) {
        setDocTitle(`${matched.brandName} (${matched.strength}) — Finished Product Specification & Method Description`);
      }
      if (!versionNotes) {
        setVersionNotes(
          matched.currentDocument
            ? `Revision update: replacement document for Version ${matched.currentDocument.version + 1}.0`
            : 'Initial approved document specification upload'
        );
      }
    } else {
      setSelectedProductId(val);
    }
  };

  const handleProductSelect = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSelectedLab(
        prod.laboratory === 'PENICILLIN'
          ? 'PENICILLIN'
          : prod.laboratory === 'CEPHALOSPORIN'
          ? 'CEPHALOSPORIN'
          : 'GENERAL'
      );
      setProductInput(prod.brandName);
      setSelectedProductId(prod.id);
      if (!docTitle) {
        setDocTitle(`${prod.brandName} (${prod.strength}) — Finished Product Specification & Method Description`);
      }
    } else {
      handleProductInputChange(prodId);
    }
  };

  const handleSelectSlotForUpload = (prod: Product, slotKey: string) => {
    handleProductSelect(prod.id);
    setSelectedCategory(slotKey);
    const slot = DOCUMENT_SLOTS.find((s) => s.key === slotKey);
    setDocTitle(`${prod.brandName} (${prod.strength}) — ${slot?.name || 'Document'}`);
  };

  // File selection handler supporting all document types
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // 100MB check
    if (file.size > 100 * 1024 * 1024) {
      setFileError('File size exceeds the 100MB maximum limit.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    if (!docTitle && file.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocTitle(nameWithoutExt);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      const cleanName = productInput.trim();
      if (!cleanName) {
        throw new Error('Please enter a product name, drug substance, or select from database.');
      }
      if (!selectedFile) {
        throw new Error('Please choose a document file to upload.');
      }

      // Check if product exists specifically in the target lab
      const matchedInLab = products.find(
        (p) =>
          (p.id === selectedProductId || p.brandName.toLowerCase() === cleanName.toLowerCase()) &&
          (p.laboratory || 'GENERAL').toUpperCase() === selectedLab.toUpperCase()
      );

      const targetId = matchedInLab ? matchedInLab.id : cleanName;

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('productId', targetId);
      formData.append('title', docTitle.trim() || `${cleanName} Document`);
      formData.append('laboratory', selectedLab);
      formData.append(
        'labName',
        selectedLab === 'GENERAL'
          ? 'General Lab'
          : selectedLab === 'PENICILLIN'
          ? 'Penicillin Lab'
          : 'Cephalosporin Lab'
      );
      formData.append('category', selectedCategory);
      formData.append('docType', selectedCategory);
      if (versionNotes.trim()) {
        formData.append('versionNotes', versionNotes.trim());
      }

      const res = await productService.uploadDocument(targetId, formData);
      return { res, isUpdate: Boolean(matchedInLab) };
    },
    onSuccess: ({ isUpdate }) => {
      const targetLabLabel =
        selectedLab === 'PENICILLIN'
          ? 'Penicillin Lab'
          : selectedLab === 'CEPHALOSPORIN'
          ? 'Cephalosporin Lab'
          : 'General Lab';

      setStatusMessage({
        type: 'success',
        text: `Document uploaded and saved into ${targetLabLabel} successfully!`,
      });
      // Switch active view to the lab where it was uploaded so it appears right there
      setLabFilter(selectedLab);
      setProductInput('');
      setSelectedProductId('');
      setSelectedCategory('STP_METHOD');
      setDocTitle('');
      setVersionNotes('');
      setSelectedFile(null);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to upload document. Please try again.',
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (prodId: string) => {
      return await productService.deleteProduct(prodId);
    },
    onSuccess: () => {
      setStatusMessage({
        type: 'success',
        text: 'Product and associated files deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to delete product.',
      });
    },
  });

  const handleDeleteProduct = (p: Product) => {
    if (window.confirm(`Are you sure you want to delete "${p.brandName}" and its documents?`)) {
      deleteProductMutation.mutate(p.id);
    }
  };

  // Lab Counts for 3 Labs + All
  const labCounts = useMemo(() => {
    return {
      ALL: products.length,
      GENERAL: products.filter((p) => (p.laboratory || 'GENERAL').toUpperCase() === 'GENERAL').length,
      PENICILLIN: products.filter((p) => (p.laboratory || '').toUpperCase() === 'PENICILLIN').length,
      CEPHALOSPORIN: products.filter((p) => (p.laboratory || '').toUpperCase() === 'CEPHALOSPORIN').length,
    };
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.atmCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.currentDocument?.fileName && p.currentDocument.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLab = labFilter === 'ALL' || (p.laboratory || 'GENERAL').toUpperCase() === labFilter;
      return matchesSearch && matchesLab;
    });
  }, [products, searchQuery, labFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const withDocs = products.filter((p) => !!p.currentDocument).length;
    return { total, withDocs };
  }, [products]);

  const canUpload =
    user?.role === 'DOCUMENTATION_MANAGER' ||
    user?.role === 'ADMIN' ||
    (user?.role as string) === 'SUPER_ADMIN' ||
    user?.role === 'DEPUTY_MANAGER';

  return (
    <RoleRouteGuard
      allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DOCUMENTATION_MANAGER', 'DEPUTY_MANAGER']}
      moduleName="Product Documentation Repository"
    >
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
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Role: {user?.role || 'DOCUMENTATION_MANAGER'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      {/* Two Column Section: Upload Form (Left) & Live Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-teal-600" />
              <h2 className="font-semibold text-slate-900 text-sm">
                Upload Product & Quality Documents
              </h2>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded">
              All Formats
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
            {/* Step 1: Manual Product Entry */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                1. Product / Drug Substance / Category <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={productInput}
                onChange={(e) => handleProductInputChange(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 font-medium"
                required
              />
            </div>

            {/* Step 2: Target Laboratory Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>
                  2. Select Target Laboratory <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] font-medium text-teal-700">
                  Product will be saved in this lab
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    key: 'GENERAL',
                    name: 'General Lab',
                    icon: '🧪',
                    activeStyle: 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 font-bold',
                  },
                  {
                    key: 'PENICILLIN',
                    name: 'Penicillin Lab',
                    icon: '💊',
                    activeStyle: 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 font-bold',
                  },
                  {
                    key: 'CEPHALOSPORIN',
                    name: 'Cephalosporin Lab',
                    icon: '🧬',
                    activeStyle: 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 font-bold',
                  },
                ].map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => handleLabChange(l.key)}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1',
                      selectedLab === l.key
                        ? l.activeStyle + ' shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    )}
                  >
                    <span className="text-base">{l.icon}</span>
                    <span className="text-[11px] leading-tight font-medium">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Document Category / Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                3. Document Category / Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  const cat = DOCUMENT_SLOTS.find((s) => s.key === e.target.value);
                  if (productInput.trim()) {
                    setDocTitle(`${productInput.trim()} — ${cat?.shortLabel || 'Document'}`);
                  }
                }}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900 font-medium cursor-pointer"
              >
                {DOCUMENT_SLOTS.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                4. Document Title / Description Specification
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-slate-900"
              />
            </div>

            {/* Drag & Drop Document File Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                5. Select Document File <span className="text-rose-500">*</span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>

                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-800 break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        Click to browse or drop any document file here
                      </p>
                      <p className="text-[10px] text-teal-600 font-medium mt-0.5">
                        All formats supported (Word, PDF, Excel, Text, Images) • Up to 100MB
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
                (!productInput.trim() && !selectedProductId) ||
                !selectedFile ||
                uploadMutation.isPending
              }
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Document...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {activeProduct?.currentDocument
                      ? `Upload Revision (v${activeProduct.currentDocument.version + 1}.0)`
                      : 'Upload & Link Document'}
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
            </div>
          </div>

          {/* 3 Laboratory Switcher Tabs (General Lab, Penicillin Lab, Cephalosporin Lab, All Labs) */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                key: 'ALL',
                name: 'All Labs',
                count: labCounts.ALL,
                icon: '🌐',
                activeClass: 'bg-slate-900 text-white border-slate-900 shadow-sm',
              },
              {
                key: 'GENERAL',
                name: 'General Lab',
                count: labCounts.GENERAL,
                icon: '🧪',
                activeClass: 'bg-blue-700 text-white border-blue-700 shadow-sm',
              },
              {
                key: 'PENICILLIN',
                name: 'Penicillin Lab',
                count: labCounts.PENICILLIN,
                icon: '💊',
                activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm',
              },
              {
                key: 'CEPHALOSPORIN',
                name: 'Cephalosporin Lab',
                count: labCounts.CEPHALOSPORIN,
                icon: '🧬',
                activeClass: 'bg-purple-700 text-white border-purple-700 shadow-sm',
              },
            ].map((tab) => {
              const isActive = labFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setLabFilter(tab.key);
                    if (tab.key !== 'ALL') {
                      setSelectedLab(tab.key);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                    isActive
                      ? tab.activeClass
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
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
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Laboratory</th>
                    <th className="py-2.5 px-3">Attached Documents</th>
                    <th className="py-2.5 px-3">Upload Date & Time</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const activeDocs = p.documents || [];
                    const count = activeDocs.length;
                    const primaryDoc = activeDocs[0] || p.currentDocument;
                    const uploadDate = primaryDoc?.createdAt || p.createdAt;
                    const formatted = formatDateTime(uploadDate);

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
                          <div className="font-semibold text-slate-900 text-xs">{p.brandName}</div>
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
                                : p.laboratory === 'CEPHALOSPORIN'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-teal-50 text-teal-700 border-teal-200'
                            )}
                          >
                            {p.laboratory}
                          </span>
                        </td>

                        {/* Attached Documents */}
                        <td className="py-3 px-3">
                          {activeDocs.length > 0 ? (
                            <div className="space-y-1.5">
                              {/* Latest document */}
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                  <span className="p-1 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                    <FileText className="w-3 h-3" />
                                  </span>
                                  <span
                                    className="max-w-[170px] sm:max-w-[210px] truncate font-medium text-slate-900"
                                    title={activeDocs[0].fileName}
                                  >
                                    {activeDocs[0].fileName}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {(activeDocs[0].fileSize / 1024).toFixed(1)} KB • By {activeDocs[0].uploadedByName}
                                </div>
                              </div>

                              {/* Multi-document indicator */}
                              {activeDocs.length > 1 && (
                                <div className="pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFolderProduct(p);
                                      setFolderModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                                  >
                                    <Folder className="w-2.5 h-2.5 text-teal-600" />
                                    <span>+{activeDocs.length - 1} more file{activeDocs.length > 2 ? 's' : ''} in folder</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No document uploaded
                            </span>
                          )}
                        </td>

                        {/* Upload Date & Time */}
                        <td className="py-3 px-3">
                          {uploadDate ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-800 whitespace-nowrap">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatted.date}</span>
                              </div>
                              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-teal-700 whitespace-nowrap">
                                <Clock className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                                <span>{formatted.time}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end">
                            {/* Open Product Document Folder */}
                            <button
                              onClick={() => {
                                setSelectedFolderProduct(p);
                                setFolderModalOpen(true);
                              }}
                              title="Open Product Documents Folder"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                              <Folder className="w-3.5 h-3.5 text-teal-600" />
                              <span>Folder</span>
                              {count > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-600 text-white font-mono">
                                  {count}
                                </span>
                              )}
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

      {/* Product Folder Dossier Modal */}
      <ProductFolderViewerModal
        isOpen={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false);
          setSelectedFolderProduct(null);
        }}
        product={
          selectedFolderProduct
            ? products.find((p) => p.id === selectedFolderProduct.id) || selectedFolderProduct
            : null
        }
        onSelectSlotForUpload={handleSelectSlotForUpload}
        onDocumentDeleted={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
        onDocumentUploaded={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
      />
    </div>
    </RoleRouteGuard>
  );
}

