'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product, ProductDocument } from '@/types/lims';
import { productService } from '@/services/product.service';
import { useAuth } from '@/context/AuthContext';
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
  ExternalLink,
  CheckCircle2,
  Check,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  XCircle,
  ShieldAlert,
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
  onDocumentUploaded?: () => void;
}

export function ProductFolderViewerModal({
  isOpen,
  onClose,
  product,
  onSelectSlotForUpload,
  onDocumentDeleted,
  onDocumentUploaded,
}: ProductFolderViewerModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeViewingDoc, setActiveViewingDoc] = useState<ProductDocument | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Deletion request dialog state for Documentation Manager
  const [requestDeleteDoc, setRequestDeleteDoc] = useState<ProductDocument | null>(null);
  const [deleteReasonInput, setDeleteReasonInput] = useState<string>('');
  const [isSubmittingDeleteRequest, setIsSubmittingDeleteRequest] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // In-modal direct upload state
  const [isUploadingInModal, setIsUploadingInModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('STP_METHOD');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [isSubmittingUpload, setIsSubmittingUpload] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic real-time query for product and its documents
  const { data: dynamicProduct, refetch } = useQuery({
    queryKey: ['product-folder-modal-docs', product?.id],
    queryFn: () => (product?.id ? productService.getById(product.id) : null),
    enabled: isOpen && !!product?.id,
    refetchInterval: 3000,
  });

  if (!isOpen || !product) return null;

  const effectiveProduct = dynamicProduct || product;

  // All documents for this product sorted by newest first
  const productDocs: ProductDocument[] = [...(effectiveProduct.documents || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const resetUploadForm = () => {
    setIsUploadingInModal(false);
    setUploadFile(null);
    setUploadCategory('STP_METHOD');
    setUploadTitle('');
    setUploadNotes('');
    setUploadError(null);
    setUploadSuccess(null);
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    setActiveViewingDoc(null);
    resetUploadForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File size exceeds the 100MB limit.');
      return;
    }

    setUploadFile(file);
    setUploadError(null);
    if (!uploadTitle.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setUploadTitle(nameWithoutExt);
    }
  };

  const handleModalUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please choose a document file to upload.');
      return;
    }

    setIsSubmittingUpload(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('productId', product.id);
      formData.append('title', uploadTitle.trim() || uploadFile.name);
      formData.append('laboratory', product.laboratory || 'GENERAL');
      formData.append(
        'labName',
        product.laboratory === 'GENERAL'
          ? 'General Lab'
          : product.laboratory === 'PENICILLIN'
          ? 'Penicillin Lab'
          : 'Cephalosporin Lab'
      );
      formData.append('category', uploadCategory);
      formData.append('docType', uploadCategory);
      if (uploadNotes.trim()) {
        formData.append('versionNotes', uploadNotes.trim());
      }

      await productService.uploadDocument(product.id, formData);

      setUploadSuccess(`File "${uploadFile.name}" added to folder successfully!`);
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

      // Close upload drawer after brief moment
      setTimeout(() => {
        resetUploadForm();
      }, 1200);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  const handleDeleteDocClick = (doc: ProductDocument) => {
    if (doc.deleteRequested && !isAdmin) {
      alert(
        `A deletion request for "${doc.fileName}" has already been submitted to the Administrator and is currently pending review. The file remains active until an Admin approves or rejects the request.`
      );
      return;
    }

    if (!isAdmin) {
      // Documentation Manager: Prompt with reason to request deletion from Admin
      setRequestDeleteDoc(doc);
      setDeleteReasonInput('');
      return;
    }

    // Direct Administrator deletion
    handleAdminDirectDelete(doc.id, doc.fileName);
  };

  const handleAdminDirectDelete = async (docId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"? This cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(docId);
      await productService.deleteDocument(docId);
      if (activeViewingDoc?.id === docId) {
        setActiveViewingDoc(null);
      }
      refetch();
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!requestDeleteDoc) return;
    setIsSubmittingDeleteRequest(true);
    setActionNotice(null);
    try {
      const res = await productService.deleteDocument(
        requestDeleteDoc.id,
        deleteReasonInput.trim() || undefined
      );
      setActionNotice({
        type: 'info',
        message:
          res.message ||
          `Deletion request for "${requestDeleteDoc.fileName}" submitted to Administrator. The file remains active until reviewed.`,
      });
      setRequestDeleteDoc(null);
      setDeleteReasonInput('');
      refetch();
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to submit deletion request');
    } finally {
      setIsSubmittingDeleteRequest(false);
    }
  };

  const handleAdminApproveInModal = async (doc: ProductDocument) => {
    if (
      !window.confirm(
        `CRITICAL CONFIRMATION:\n\nApprove deletion of "${doc.fileName}" (v${doc.version}.0)?\nThis will permanently remove the file from the server.`
      )
    ) {
      return;
    }
    try {
      setDeletingId(doc.id);
      await productService.approveDeletion(doc.id);
      setActionNotice({
        type: 'success',
        message: `Deletion of "${doc.fileName}" approved and document permanently removed.`,
      });
      if (activeViewingDoc?.id === doc.id) {
        setActiveViewingDoc(null);
      }
      refetch();
      if (onDocumentDeleted) onDocumentDeleted();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve deletion');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdminRejectInModal = async (doc: ProductDocument) => {
    const reason = window.prompt(
      `Rejection reason for keeping "${doc.fileName}":`,
      'Document retained by Administrator.'
    );
    if (reason === null) return;
    try {
      setDeletingId(doc.id);
      await productService.rejectDeletion(doc.id, reason);
      setActionNotice({
        type: 'info',
        message: `Deletion request rejected. Document "${doc.fileName}" remains active.`,
      });
      refetch();
      if (onDocumentDeleted) onDocumentDeleted();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject deletion');
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
            {/* Direct In-Modal Upload Button */}
            <button
              onClick={() => {
                setActiveViewingDoc(null);
                setIsUploadingInModal((prev) => !prev);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer',
                isUploadingInModal
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              )}
            >
              {isUploadingInModal ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Upload</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Viewer'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleModalClose}
              title="Close Folder"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Action Feedback Notice */}
          {actionNotice && (
            <div
              className={cn(
                'p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2.5',
                actionNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : actionNotice.type === 'info'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              )}
            >
              <div className="flex items-center gap-2">
                {actionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : actionNotice.type === 'info' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{actionNotice.message}</span>
              </div>
              <button
                onClick={() => setActionNotice(null)}
                className="text-xs underline hover:opacity-80 cursor-pointer font-medium"
              >
                Dismiss
              </button>
            </div>
          )}
          {/* In-Modal Direct File Upload Drawer */}
          {isUploadingInModal && (
            <div className="bg-slate-50/90 border-2 border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-600 text-white shrink-0">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Upload New File to {product.brandName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      File will be linked directly to this product folder in {product.laboratory} Lab
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetUploadForm}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <form onSubmit={handleModalUploadSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Category / Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800 font-medium"
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat.key} value={cat.key}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Title / Specification Description
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Finished Product Testing Procedure"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Document File <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => modalFileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
                      uploadFile
                        ? 'border-teal-500 bg-teal-50/50 hover:bg-teal-50/70'
                        : 'border-slate-300 hover:border-teal-400 bg-white hover:bg-slate-50'
                    )}
                  >
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {uploadFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(uploadFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <UploadCloud className="w-6 h-6 text-teal-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-700">
                          Click to browse or drop any document file here
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Word (.docx, .doc), Excel (.xlsx, .xls, .csv), PDF, Images • Up to 100MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetUploadForm}
                    disabled={isSubmittingUpload}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!uploadFile || isSubmittingUpload}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingUpload ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading & Linking...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload to this Folder</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active Document Reader/Viewer (if viewing) */}
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
                    href={productService.getDocumentViewUrl(activeViewingDoc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors"
                    title="Open in Full Window / New Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                    <span>New Tab</span>
                  </a>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Reader</span>
                  </button>
                </div>
              </div>

              {/* In-App Document Viewer Iframe */}
              <div
                className={cn(
                  'w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-inner transition-all',
                  isFullscreen ? 'h-[78vh]' : 'h-[68vh]'
                )}
              >
                <iframe
                  src={productService.getDocumentViewUrl(activeViewingDoc.id)}
                  className="w-full h-full border-0 bg-white"
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
                {/* Add Another File Button directly opens upload drawer */}
                <button
                  onClick={() => {
                    setActiveViewingDoc(null);
                    setIsUploadingInModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another File</span>
                </button>
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
                  <button
                    onClick={() => {
                      setActiveViewingDoc(null);
                      setIsUploadingInModal(true);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload First Document</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {productDocs.map((doc, idx) => {
                    const matchedCat = DOCUMENT_CATEGORIES.find(
                      (c) => c.key === doc.category || c.name === doc.category
                    );
                    const isWord =
                      doc.fileName.toLowerCase().endsWith('.docx') ||
                      doc.fileName.toLowerCase().endsWith('.doc');
                    const isExcel =
                      doc.fileName.toLowerCase().endsWith('.xlsx') ||
                      doc.fileName.toLowerCase().endsWith('.xls') ||
                      doc.fileName.toLowerCase().endsWith('.csv');
                    const isPdf = doc.fileName.toLowerCase().endsWith('.pdf');
                    const fileIcon = isWord ? '📝' : isExcel ? '📊' : isPdf ? '📕' : '📄';
                    const fileTypeLabel = isWord ? 'Word' : isExcel ? 'Excel' : isPdf ? 'PDF' : 'File';

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
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider',
                                isWord
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : isExcel
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isPdf
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              )}
                            >
                              {fileIcon} {fileTypeLabel}
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
                              {doc.fileName}
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

                          {/* Deletion Request Status Badge */}
                          {doc.deleteRequested && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Deletion Pending Admin Approval</span>
                              {doc.deleteRequestedByName && (
                                <span className="text-amber-700 font-normal">
                                  • Requested by {doc.deleteRequestedByName}
                                </span>
                              )}
                            </div>
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

                          {/* Role-based deletion controls */}
                          {doc.deleteRequested ? (
                            isAdmin ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={deletingId === doc.id}
                                  onClick={() => handleAdminApproveInModal(doc)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                  title="Approve Deletion (Permanently Remove)"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve Delete</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === doc.id}
                                  onClick={() => handleAdminRejectInModal(doc)}
                                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                                  title="Reject Request & Retain File"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span
                                className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-default"
                                title="Deletion request submitted to Administrator for approval"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span className="hidden sm:inline">Pending Admin Approval</span>
                              </span>
                            )
                          ) : (
                            <button
                              type="button"
                              disabled={deletingId === doc.id}
                              onClick={() => handleDeleteDocClick(doc)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                              title={
                                isAdmin
                                  ? 'Directly delete this file'
                                  : 'Submit deletion request to Administrator'
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
            onClick={handleModalClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Folder
          </button>
        </div>
      </div>

      {/* Deletion Request Confirmation Dialog Modal for Documentation Manager */}
      {requestDeleteDoc && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Submit Document Deletion Request
                </h4>
                <p className="text-xs text-slate-500">Administrator Approval Required</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-900">
                File: &ldquo;{requestDeleteDoc.fileName}&rdquo; (v{requestDeleteDoc.version}.0)
              </p>
              <p>
                Documentation Manager cannot delete files directly. Once you submit this request, a notification will be dispatched to the <strong>Administrator</strong>.
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                The file will <strong>remain completely active and accessible</strong> until an Administrator formally reviews and approves the deletion.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for deletion request:
              </label>
              <textarea
                rows={3}
                value={deleteReasonInput}
                onChange={(e) => setDeleteReasonInput(e.target.value)}
                placeholder="e.g. Obsolete STP method version, replaced with approved revision, incorrect monograph uploaded..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingDeleteRequest}
                onClick={() => {
                  setRequestDeleteDoc(null);
                  setDeleteReasonInput('');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDeleteRequest}
                onClick={handleSubmitDeleteRequest}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingDeleteRequest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting to Admin...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Submit to Admin for Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
