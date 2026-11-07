'use client';

import React, { useState } from 'react';
import { Product, ProductDocument } from '@/types/lims';
import { productService } from '@/services/product.service';
import { cn } from '@/lib/utils';
import {
  Folder,
  FileText,
  Download,
  Eye,
  X,
  UploadCloud,
  Calendar,
  Clock,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
} from 'lucide-react';

export interface DocumentCategoryConfig {
  key: string;
  name: string;
  shortLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export const DOCUMENT_CATEGORIES: DocumentCategoryConfig[] = [
  {
    key: 'STP_METHOD',
    name: 'Standard Testing Procedure (STP / Method)',
    shortLabel: 'STP Method',
    badgeColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
  },
  {
    key: 'FINISHED_SPEC',
    name: 'Finished Product Specification (FPS)',
    shortLabel: 'Finished Spec',
    badgeColor: 'text-blue-700',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
  },
  {
    key: 'CORE_SPEC',
    name: 'Core / In-Process Specification',
    shortLabel: 'Core Spec',
    badgeColor: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
  },
  {
    key: 'CALCULATION_GUIDELINE',
    name: 'Calculation Guideline & Working Sheet',
    shortLabel: 'Calc Sheet',
    badgeColor: 'text-purple-700',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
  },
  {
    key: 'RAW_MATERIAL_SPEC',
    name: 'Raw Material & Packaging Spec',
    shortLabel: 'RM / PM Spec',
    badgeColor: 'text-rose-700',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
  },
  {
    key: 'VALIDATION_REPORT',
    name: 'Method Validation Protocol & Report',
    shortLabel: 'Validation',
    badgeColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
  },
  {
    key: 'COA',
    name: 'Certificate of Analysis (CoA)',
    shortLabel: 'CoA',
    badgeColor: 'text-teal-700',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
  },
  {
    key: 'GENERAL_DOC',
    name: 'General Quality Document',
    shortLabel: 'General Doc',
    badgeColor: 'text-slate-700',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
  },
];

// Alias for backwards compatibility
export const DOCUMENT_SLOTS = DOCUMENT_CATEGORIES;

interface ProductFolderViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSelectSlotForUpload?: (product: Product, slotKey: string) => void;
  onDocumentDeleted?: () => void;
}

export function ProductFolderViewerModal({
  isOpen,
  onClose,
  product,
  onSelectSlotForUpload,
  onDocumentDeleted,
}: ProductFolderViewerModalProps) {
  const [activeViewingDoc, setActiveViewingDoc] = useState<ProductDocument | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  // All documents for this product (unlimited!)
  const productDocs: ProductDocument[] = product.documents || [];

  const handleDeleteDoc = async (docId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${fileName}" from this folder?`)) {
      return;
    }
    try {
      setDeletingId(docId);
      await productService.deleteDocument(docId);
      if (activeViewingDoc?.id === docId) {
        setActiveViewingDoc(null);
      }
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl border border-slate-200 w-full flex flex-col transition-all duration-200 overflow-hidden',
          isFullscreen ? 'h-[96vh] max-w-[96vw]' : 'max-h-[90vh] max-w-4xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shrink-0">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">{product.brandName}</h3>
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                    product.laboratory === 'GENERAL'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : product.laboratory === 'PENICILLIN'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  )}
                >
                  {product.laboratory} LAB
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                  {productDocs.length} {productDocs.length === 1 ? 'File' : 'Files'} in Folder
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Product document repository • Unlimited file uploads supported
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectSlotForUpload && (
              <button
                onClick={() => {
                  onSelectSlotForUpload(product, 'GENERAL_DOC');
                  onClose();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewer'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setActiveViewingDoc(null);
                onClose();
              }}
              title="Close Folder"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Active PDF Viewer (if viewing) */}
          {activeViewingDoc ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-teal-50/70 p-3 rounded-xl border border-teal-200">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold text-slate-900 truncate"
                        title={activeViewingDoc.fileName}
                      >
                        {activeViewingDoc.fileName}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                        v{activeViewingDoc.version}.0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activeViewingDoc.title} • {(activeViewingDoc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={productService.getDocumentDownloadUrl(activeViewingDoc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => setActiveViewingDoc(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Reader</span>
                  </button>
                </div>
              </div>

              {/* In-App PDF Iframe */}
              <div className="w-full h-[65vh] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-inner">
                <iframe
                  src={productService.getDocumentViewUrl(activeViewingDoc.id)}
                  className="w-full h-full border-0"
                  title={activeViewingDoc.title}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Uploaded Product Documents ({productDocs.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    All document files for this product available for laboratory analysts
                  </p>
                </div>
                {onSelectSlotForUpload && (
                  <button
                    onClick={() => {
                      onSelectSlotForUpload(product, 'GENERAL_DOC');
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another File</span>
                  </button>
                )}
              </div>

              {/* Unlimited Documents List */}
              {productDocs.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                    <Folder className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-semibold text-slate-800">
                    This Product Folder is Currently Empty
                  </h5>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You can upload as many files as needed (STP methods, specs, calculations, validation reports, etc.). There is no limit.
                  </p>
                  {onSelectSlotForUpload && (
                    <button
                      onClick={() => {
                        onSelectSlotForUpload(product, 'GENERAL_DOC');
                        onClose();
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload First Document</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {productDocs.map((doc, idx) => {
                    const matchedCat = DOCUMENT_CATEGORIES.find(
                      (c) => c.key === doc.category || c.name === doc.category
                    );

                    return (
                      <div
                        key={doc.id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* File Details */}
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-400">
                              #{idx + 1}
                            </span>
                            {matchedCat && (
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider',
                                  matchedCat.badgeBg,
                                  matchedCat.badgeColor,
                                  matchedCat.badgeBorder
                                )}
                              >
                                {matchedCat.shortLabel}
                              </span>
                            )}
                            <h5 className="text-xs font-bold text-slate-900 truncate" title={doc.fileName}>
                              📄 {doc.fileName}
                            </h5>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              v{doc.version}.0
                            </span>
                          </div>

                          {doc.title && doc.title !== doc.fileName && (
                            <p className="text-[11px] text-slate-600 font-medium">
                              {doc.title}
                            </p>
                          )}

                          <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap pt-0.5">
                            <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>
                              Uploaded by: <strong className="text-slate-600">{doc.uploadedByName}</strong>
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono text-teal-700">
                              <Clock className="w-2.5 h-2.5 text-teal-600" />
                              {new Date(doc.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => setActiveViewingDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <a
                            href={productService.getDocumentDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            disabled={deletingId === doc.id}
                            onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete this file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Product: <strong>{product.brandName}</strong> • Total Documents: <strong>{productDocs.length}</strong>
          </span>
          <button
            onClick={() => {
              setActiveViewingDoc(null);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Folder
          </button>
        </div>
      </div>
    </div>
  );
}
