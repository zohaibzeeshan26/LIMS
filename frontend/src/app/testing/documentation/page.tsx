'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { Product, ProductDocument } from '@/types/lims';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import { DOCUMENT_CATEGORIES } from '@/components/documentation/ProductFolderViewerModal';
import { cn } from '@/lib/utils';
import {
  FileText,
  FileSpreadsheet,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Folder,
  FolderOpen,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  ArrowLeft,
  FileCode,
  Tag,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface ExtendedDocItem extends ProductDocument {
  productBrandName: string;
  productGenericName: string;
  productLaboratory: string;
  productAtmCode: string;
}

export default function TestingDocumentationRepositoryPage() {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLab, setSelectedLab] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFileType, setSelectedFileType] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'products' | 'flat'>('products');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Active Document Reader Modal state
  const [activeViewingDoc, setActiveViewingDoc] = useState<ExtendedDocItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch all products with dynamic refetch
  const {
    data: products = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['all-products-documentation'],
    queryFn: productService.getAll,
    refetchInterval: 10000, // Refresh automatically every 10s so newly uploaded documents appear
  });

  // Flatten all documents with product info attached
  const allDocuments: ExtendedDocItem[] = useMemo(() => {
    const list: ExtendedDocItem[] = [];
    products.forEach((p) => {
      (p.documents || []).forEach((doc) => {
        list.push({
          ...doc,
          productBrandName: p.brandName,
          productGenericName: p.genericName || '',
          productLaboratory: (p.laboratory || 'GENERAL').toUpperCase(),
          productAtmCode: p.atmCode || 'ATM-000',
        });
      });
    });
    // Sort newest uploaded first
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [products]);

  // Statistics
  const stats = useMemo(() => {
    const totalDocs = allDocuments.length;
    const totalProducts = products.length;
    const productsWithDocs = products.filter((p) => (p.documents?.length || 0) > 0).length;
    const generalLabDocs = allDocuments.filter((d) => d.productLaboratory === 'GENERAL').length;
    const penLabDocs = allDocuments.filter((d) => d.productLaboratory === 'PENICILLIN').length;
    const cephLabDocs = allDocuments.filter((d) => d.productLaboratory === 'CEPHALOSPORIN').length;
    return {
      totalDocs,
      totalProducts,
      productsWithDocs,
      generalLabDocs,
      penLabDocs,
      cephLabDocs,
    };
  }, [products, allDocuments]);

  // Filtered Documents (for Flat View)
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // Lab filter
      if (selectedLab !== 'ALL' && doc.productLaboratory !== selectedLab) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) {
        return false;
      }
      // File type filter
      if (selectedFileType !== 'ALL') {
        const lowerName = (doc.fileName || '').toLowerCase();
        const lowerMime = (doc.mimeType || '').toLowerCase();
        if (selectedFileType === 'PDF' && !lowerName.endsWith('.pdf') && !lowerMime.includes('pdf')) {
          return false;
        }
        if (
          selectedFileType === 'WORD' &&
          !lowerName.endsWith('.docx') &&
          !lowerName.endsWith('.doc') &&
          !lowerMime.includes('word')
        ) {
          return false;
        }
        if (
          selectedFileType === 'EXCEL' &&
          !lowerName.endsWith('.xlsx') &&
          !lowerName.endsWith('.xls') &&
          !lowerName.endsWith('.csv') &&
          !lowerMime.includes('sheet') &&
          !lowerMime.includes('excel')
        ) {
          return false;
        }
      }
      // Search term
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const matchTitle = doc.title?.toLowerCase().includes(term);
        const matchFile = doc.fileName?.toLowerCase().includes(term);
        const matchProduct = doc.productBrandName?.toLowerCase().includes(term);
        const matchGeneric = doc.productGenericName?.toLowerCase().includes(term);
        const matchAtm = doc.productAtmCode?.toLowerCase().includes(term);
        const matchUploadedBy = doc.uploadedByName?.toLowerCase().includes(term);
        if (!matchTitle && !matchFile && !matchProduct && !matchGeneric && !matchAtm && !matchUploadedBy) {
          return false;
        }
      }
      return true;
    });
  }, [allDocuments, selectedLab, selectedCategory, selectedFileType, searchQuery]);

  // Filtered Products (for Products View)
  const filteredProducts = useMemo(() => {
    return products
      .map((p) => {
        const productLab = (p.laboratory || 'GENERAL').toUpperCase();
        // Filter this product's documents
        const docs = (p.documents || []).filter((doc) => {
          if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
          if (selectedFileType !== 'ALL') {
            const lowerName = (doc.fileName || '').toLowerCase();
            const lowerMime = (doc.mimeType || '').toLowerCase();
            if (selectedFileType === 'PDF' && !lowerName.endsWith('.pdf') && !lowerMime.includes('pdf')) {
              return false;
            }
            if (
              selectedFileType === 'WORD' &&
              !lowerName.endsWith('.docx') &&
              !lowerName.endsWith('.doc') &&
              !lowerMime.includes('word')
            ) {
              return false;
            }
            if (
              selectedFileType === 'EXCEL' &&
              !lowerName.endsWith('.xlsx') &&
              !lowerName.endsWith('.xls') &&
              !lowerName.endsWith('.csv') &&
              !lowerMime.includes('sheet')
            ) {
              return false;
            }
          }
          return true;
        });

        return {
          ...p,
          matchingDocs: docs,
          productLab,
        };
      })
      .filter((p) => {
        // Lab match
        if (selectedLab !== 'ALL' && p.productLab !== selectedLab) {
          return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const term = searchQuery.toLowerCase().trim();
          const matchBrand = p.brandName.toLowerCase().includes(term);
          const matchGeneric = (p.genericName || '').toLowerCase().includes(term);
          const matchAtm = (p.atmCode || '').toLowerCase().includes(term);
          const matchDocTitle = p.matchingDocs.some((d) =>
            d.title.toLowerCase().includes(term) || d.fileName.toLowerCase().includes(term)
          );
          if (!matchBrand && !matchGeneric && !matchAtm && !matchDocTitle) {
            return false;
          }
        }

        return true;
      });
  }, [products, selectedLab, selectedCategory, selectedFileType, searchQuery]);

  // Helper: toggle product expansion
  const toggleProductExpand = (id: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper: format date & time
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
          hour12: true,
        }),
      };
    } catch {
      return { date: '—', time: '' };
    }
  };

  // Helper: category config
  const getCategoryConfig = (catKey: string) => {
    const found = DOCUMENT_CATEGORIES.find((c) => c.key === catKey);
    if (found) return found;
    return {
      key: catKey,
      name: catKey.replace(/_/g, ' '),
      shortLabel: catKey.replace(/_/g, ' '),
      badgeColor: 'text-slate-700',
      badgeBg: 'bg-slate-100',
      badgeBorder: 'border-slate-200',
    };
  };

  // Helper: file icon
  const getFileIcon = (fileName: string, mimeType?: string) => {
    const lower = (fileName || '').toLowerCase();
    if (lower.endsWith('.pdf') || (mimeType && mimeType.includes('pdf'))) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 text-red-700 font-bold text-[10px] uppercase border border-red-200 shrink-0">
          PDF
        </span>
      );
    }
    if (lower.endsWith('.docx') || lower.endsWith('.doc') || (mimeType && mimeType.includes('word'))) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px] uppercase border border-blue-200 shrink-0">
          DOC
        </span>
      );
    }
    if (
      lower.endsWith('.xlsx') ||
      lower.endsWith('.xls') ||
      lower.endsWith('.csv') ||
      (mimeType && mimeType.includes('sheet'))
    ) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase border border-emerald-200 shrink-0">
          XLS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border border-slate-200 shrink-0">
        FILE
      </span>
    );
  };

  return (
    <RoleRouteGuard
      allowedRoles={[
        'QC_ANALYST',
        'ANALYST',
        'TESTING_ANALYST',
        'LAB_TECHNICIAN',
        'SUPER_ADMIN',
        'ADMIN',
        'MANAGER',
        'DEPUTY_MANAGER',
        'SHIFT_INCHARGE',
        'DOCUMENTATION_MANAGER',
      ]}
      moduleName="Product Documentation Repository"
    >
      <div className="space-y-6 pb-12">
        {/* Top Navigation & Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/testing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Testing Worksheets</span>
              </Link>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">Citi Pharma Quality Control LIMS</span>
            </div>
            <h1 className="text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2.5">
              <FolderOpen className="h-7 w-7 text-teal-700" />
              <span>Product Documentation Repository</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Centralized library of approved Standard Testing Procedures (STP), Finished Product Specifications,
              Working Sheets, and Pharmacopeial Monographs uploaded by the Documentation Manager.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh repository"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-teal-600', isRefetching && 'animate-spin')} />
              <span>{isRefetching ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              href="/documentation-manager"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold shadow-xs transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>Upload / Manage Dossiers</span>
            </Link>
          </div>
        </div>

        {/* Statistical Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Products</div>
            <div className="text-xl font-bold text-navy-950 mt-1">{stats.totalProducts}</div>
            <div className="text-[10px] text-teal-700 mt-0.5">{stats.productsWithDocs} with active dossiers</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Uploaded Documents</div>
            <div className="text-xl font-bold text-teal-700 mt-1">{stats.totalDocs}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">STPs, FPS, Working Sheets</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">General Lab</div>
            <div className="text-xl font-bold text-blue-700 mt-1">{stats.generalLabDocs}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Available Documents</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Penicillin Lab</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{stats.penLabDocs}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Available Documents</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cephalosporin Lab</div>
            <div className="text-xl font-bold text-purple-700 mt-1">{stats.cephLabDocs}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Available Documents</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Compliance Status</div>
            <div className="text-sm font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>21 CFR Monitored</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Real-time Versioning</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by brand, generic, ATM code, or search documents by title / filename..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto border border-slate-200">
              <button
                onClick={() => setViewMode('products')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  viewMode === 'products'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Folder className="w-3.5 h-3.5 text-teal-600" />
                <span>Product Dossiers ({filteredProducts.length})</span>
              </button>

              <button
                onClick={() => setViewMode('flat')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  viewMode === 'flat'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>All Documents ({filteredDocuments.length})</span>
              </button>
            </div>
          </div>

          {/* Filter Pills row */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters:</span>
            </span>

            {/* Laboratory select */}
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">All Laboratories</option>
              <option value="GENERAL">General Lab</option>
              <option value="PENICILLIN">Penicillin Lab</option>
              <option value="CEPHALOSPORIN">Cephalosporin Lab</option>
            </select>

            {/* Category select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">All Document Types</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.shortLabel}
                </option>
              ))}
            </select>

            {/* File format filter */}
            <select
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">All Formats (PDF, DOCX, XLSX)</option>
              <option value="PDF">PDF Documents only</option>
              <option value="WORD">Word Documents (.docx, .doc)</option>
              <option value="EXCEL">Excel Spreadsheets (.xlsx, .csv)</option>
            </select>

            {(selectedLab !== 'ALL' || selectedCategory !== 'ALL' || selectedFileType !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedLab('ALL');
                  setSelectedCategory('ALL');
                  setSelectedFileType('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 ml-auto cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Product Documentation Repository...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching latest verified dossiers and technical files</p>
          </div>
        )}

        {/* View 1: Product Folders View */}
        {!isLoading && viewMode === 'products' && (
          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                <Folder className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No matching products or documents found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search terms or filter settings to view other products and uploaded files.
                </p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const isExpanded = expandedProductIds[prod.id] !== false; // Default expanded
                const docsCount = prod.matchingDocs.length;
                const totalDocs = prod.documents?.length || 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Product Card Header Bar */}
                    <div
                      onClick={() => toggleProductExpand(prod.id)}
                      className="px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-4 border-b border-slate-200/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'p-2.5 rounded-xl shrink-0',
                            docsCount > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                          )}
                        >
                          {docsCount > 0 ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-navy-950 truncate">
                              {prod.brandName}
                            </span>
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                              {prod.atmCode || 'ATM-N/A'}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                                prod.productLab === 'PENICILLIN'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : prod.productLab === 'CEPHALOSPORIN'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              )}
                            >
                              {prod.productLab} LAB
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {prod.genericName || 'No generic specification'} • {prod.dosageForm || 'Dosage N/A'} •{' '}
                            {prod.strength || 'Standard'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                            docsCount > 0
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          )}
                        >
                          {docsCount} {docsCount === 1 ? 'Document' : 'Documents'}
                        </span>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 text-slate-400 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </div>
                    </div>

                    {/* Expandable Documents List */}
                    {isExpanded && (
                      <div className="p-4 bg-white">
                        {docsCount === 0 ? (
                          <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs font-semibold text-slate-600">
                              No documentation files currently attached for this product
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Uploaded STPs and specifications will automatically be visible here.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {prod.matchingDocs.map((doc) => {
                              const catConfig = getCategoryConfig(doc.category);
                              const { date, time } = formatDateTime(doc.createdAt);
                              const extDoc: ExtendedDocItem = {
                                ...doc,
                                productBrandName: prod.brandName,
                                productGenericName: prod.genericName || '',
                                productLaboratory: prod.productLab,
                                productAtmCode: prod.atmCode || 'ATM-000',
                              };

                              return (
                                <div
                                  key={doc.id}
                                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-teal-200 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                                >
                                  <div className="flex items-start gap-3">
                                    {getFileIcon(doc.fileName, doc.mimeType)}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate"
                                          title={doc.title}
                                        >
                                          {doc.title}
                                        </span>
                                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                          v{doc.version}.0
                                        </span>
                                      </div>

                                      <p
                                        className="text-[11px] text-slate-500 font-mono mt-0.5 truncate"
                                        title={doc.fileName}
                                      >
                                        {doc.fileName}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        <span
                                          className={cn(
                                            'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                                            catConfig.badgeColor,
                                            catConfig.badgeBg,
                                            catConfig.badgeBorder
                                          )}
                                        >
                                          {catConfig.shortLabel}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {(doc.fileSize / 1024).toFixed(1)} KB
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Footer: Date & Action Buttons */}
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                                    <span className="text-slate-400" title={`Uploaded by: ${doc.uploadedByName}`}>
                                      {date} {time ? `• ${time}` : ''}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {/* Preview Button */}
                                      <button
                                        onClick={() => setActiveViewingDoc(extDoc)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors cursor-pointer"
                                        title="Preview in reader modal"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-teal-700" />
                                        <span>Preview</span>
                                      </button>

                                      {/* New Tab View Button */}
                                      <a
                                        href={productService.getDocumentViewUrl(doc.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors cursor-pointer"
                                        title="Open file in dedicated browser tab"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                                        <span>New Tab</span>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* View 2: Flat List View of All Documents */}
        {!isLoading && viewMode === 'flat' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                All Uploaded Documents ({filteredDocuments.length})
              </span>
              <span className="text-xs text-slate-500">Sorted by newest upload first</span>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="py-16 text-center p-6">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No documents found matching the filter</h4>
                <p className="text-xs text-slate-400 mt-1">Try resetting filters to show all technical files.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const catConfig = getCategoryConfig(doc.category);
                  const { date, time } = formatDateTime(doc.createdAt);

                  return (
                    <div
                      key={doc.id}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {getFileIcon(doc.fileName, doc.mimeType)}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-navy-950 truncate">{doc.title}</span>
                            <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-800 px-1.5 py-0.2 rounded border border-teal-200">
                              v{doc.version}.0
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                                catConfig.badgeColor,
                                catConfig.badgeBg,
                                catConfig.badgeBorder
                              )}
                            >
                              {catConfig.shortLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="font-semibold text-slate-800">{doc.productBrandName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[11px] text-slate-600">{doc.fileName}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px]">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-bold text-slate-600">
                              {doc.productLaboratory} LAB
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right sm:text-right">
                          <div className="text-[11px] font-medium text-slate-700">{date}</div>
                          <div className="text-[10px] text-slate-400">By: {doc.uploadedByName || 'Documentation Mgr'}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Preview */}
                          <button
                            onClick={() => setActiveViewingDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-700" />
                            <span>Preview</span>
                          </button>

                          {/* New Tab */}
                          <a
                            href={productService.getDocumentViewUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                            title="Open in new browser tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                            <span>New Tab</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* In-App Document Preview Modal */}
        {activeViewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-in fade-in">
            <div
              className={cn(
                'bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-200',
                isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[88vh]'
              )}
            >
              {/* Modal Top bar */}
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-teal-600 text-white shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold truncate text-white">
                        {activeViewingDoc.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/30">
                        v{activeViewingDoc.version}.0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">
                      {activeViewingDoc.productBrandName} • {activeViewingDoc.fileName} •{' '}
                      {(activeViewingDoc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Open in New Tab */}
                  <a
                    href={productService.getDocumentViewUrl(activeViewingDoc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    title="Open in dedicated browser window"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>

                  {/* Toggle Fullscreen */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Close Modal */}
                  <button
                    onClick={() => {
                      setActiveViewingDoc(null);
                      setIsFullscreen(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                    title="Close Reader"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Iframe Preview Body */}
              <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
                <iframe
                  src={productService.getDocumentViewUrl(activeViewingDoc.id)}
                  className="w-full h-full border-0 bg-white"
                  title={activeViewingDoc.title}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleRouteGuard>
  );
}

