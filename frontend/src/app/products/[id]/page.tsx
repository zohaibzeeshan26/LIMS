'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  History,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Eye,
  FileCheck2,
  Tag,
  Clock,
  Info,
} from 'lucide-react';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productId = String(params?.id || '');

  // Form states for replacing/updating document directly on details page
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Doc Info modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch live product details from database
  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.getById(productId),
    enabled: !!productId,
  });

  // Fetch document history
  const { data: documentHistory = [] } = useQuery({
    queryKey: ['product-history', productId],
    queryFn: () => productService.getDocuments(productId),
    enabled: !!productId,
  });

  const canManageDocs =
    user?.role === 'DOCUMENTATION_MANAGER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'QA_MANAGER' ||
    user?.role === 'MANAGER';

  // Handle file selection with strict Word file check (.doc, .docx)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validExtensions = ['.doc', '.docx'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      setFileError('Invalid format: Only Word documents (.doc, .docx) are accepted.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFileError('File size exceeds the 50MB limit.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Please select a Word document.');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append(
        'title',
        docTitle.trim() || `${product?.brandName} Specification & Description`
      );
      if (versionNotes.trim()) {
        formData.append('versionNotes', versionNotes.trim());
      }
      return productService.uploadDocument(productId, formData);
    },
    onSuccess: (data) => {
      setStatusMsg({
        type: 'success',
        text: `Word document "${data.fileName}" uploaded successfully as Version ${data.version}.0!`,
      });
      setSelectedFile(null);
      setVersionNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product-history', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to upload document.',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600" />
        <p className="text-sm font-medium">Loading Product Details from Database...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Product Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested product ID &quot;{productId}&quot; could not be retrieved from the commercial database.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products Catalog</span>
        </Link>
      </div>
    );
  }

  const currentDoc = product.currentDocument;

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-teal-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Products Catalog</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900">{product.brandName}</span>
        </div>

        <div className="flex items-center gap-2">
          {canManageDocs && (
            <Link
              href="/documentation-manager"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documentation Manager Portal</span>
            </Link>
          )}

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Product Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-lg border border-teal-400/30">
                {product.atmCode}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/15">
                {product.labName} ({product.laboratory})
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {product.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {product.brandName}
            </h1>
            <p className="text-sm text-teal-200 font-medium">
              {product.genericName} &bull; {product.dosageForm} &bull; {product.strength}
            </p>
            <p className="text-xs text-slate-300/90 leading-relaxed max-w-3xl pt-1">
              {product.description}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs space-y-2 shrink-0 md:min-w-[220px]">
            <div className="flex items-center justify-between text-slate-300">
              <span>Pack Size:</span>
              <span className="font-semibold text-white">{product.packSize}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Compendia:</span>
              <span className="font-mono text-teal-300 font-semibold">{product.version}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Standard:</span>
              <span className="font-semibold text-white">{product.specs.split('/')[0]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={cn(
            'p-4 rounded-xl border text-xs flex items-center gap-3',
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          )}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <p className="font-semibold">{statusMsg.text}</p>
        </div>
      )}

      {/* ================= PRIMARY SECTION: OFFICIAL WORD DESCRIPTION DOCUMENT ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Official Product Description Document (.doc / .docx)
                </h2>
                {currentDoc && (
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    Latest Active Version {currentDoc.version}.0
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Authorized finished product specification and method document automatically accessible across Testing and Catalog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageDocs && (
              <button
                onClick={() => {
                  setDocTitle(`${product.brandName} Specification & Method Description`);
                  setVersionNotes(
                    currentDoc
                      ? `Revision update: replacement document for Version ${currentDoc.version + 1}.0`
                      : 'Initial approved Word document specification upload'
                  );
                  setIsUploadOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{currentDoc ? 'Upload New Revision' : 'Upload Word Document'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Document Highlight Box */}
        {currentDoc ? (
          <div className="bg-gradient-to-br from-teal-50/70 via-white to-slate-50 border-2 border-teal-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {currentDoc.fileName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white uppercase tracking-wider">
                      Active
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {(currentDoc.fileSize / 1024).toFixed(1)} KB &bull; Word Format
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {currentDoc.title}
                  </p>

                  {currentDoc.versionNotes && (
                    <p className="text-[11px] text-slate-500 italic mt-1 bg-white/70 p-2 rounded-lg border border-slate-200/80">
                      &quot;{currentDoc.versionNotes}&quot;
                    </p>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-2">
                    <span>Uploaded By: <strong className="text-slate-700">{currentDoc.uploadedByName}</strong></span>
                    <span>&bull;</span>
                    <span>Date: <strong className="text-slate-700">{new Date(currentDoc.createdAt).toLocaleString()}</strong></span>
                    <span>&bull;</span>
                    <span>Product ID Link: <strong className="font-mono text-teal-800">{product.id}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: View & Download */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsViewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>View Details</span>
                </button>

                <a
                  href={productService.getDocumentDownloadUrl(currentDoc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Word Document</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-slate-700">
                No Word Description Document Attached Yet
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                The Documentation Manager can upload the official .doc or .docx description file for this product.
              </p>
            </div>

            {canManageDocs && (
              <button
                onClick={() => {
                  setDocTitle(`${product.brandName} Specification & Method Description`);
                  setVersionNotes('Initial approved Word document specification upload');
                  setIsUploadOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Word Document Now</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Two-Column Section: Analytical Parameters & Document Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Analytical Parameters */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Compendial Analytical Parameters ({product.parameters.length})
            </h3>
            <p className="text-xs text-slate-500">
              Monograph testing protocol parameters linked with this product
            </p>
          </div>

          <ul className="divide-y divide-slate-100 text-xs">
            {product.parameters.map((param, index) => (
              <li key={index} className="py-2.5 flex items-center gap-2.5 text-slate-700">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-teal-200">
                  {index + 1}
                </span>
                <span className="font-medium leading-snug">{param}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Full Version History */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Document Revision History ({documentHistory.length})
              </h3>
              <p className="text-xs text-slate-500">
                21 CFR Part 11 immutable version audit trail
              </p>
            </div>
            <History className="w-4 h-4 text-slate-400" />
          </div>

          {documentHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No previous revisions on file.
            </div>
          ) : (
            <div className="space-y-3">
              {documentHistory.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3',
                    item.isCurrent
                      ? 'bg-teal-50/50 border-teal-200'
                      : 'bg-slate-50/60 border-slate-200'
                  )}
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-200/80 text-slate-800">
                        v{item.version}.0
                      </span>
                      {item.isCurrent && (
                        <span className="text-[10px] font-bold uppercase text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded border border-teal-200">
                          Active
                        </span>
                      )}
                      <span className="font-semibold text-slate-900 truncate" title={item.fileName}>
                        {item.fileName}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      By {item.uploadedByName} &bull; {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <a
                    href={productService.getDocumentDownloadUrl(item.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shrink-0 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload/Replace Document Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title={`Upload Word Description — ${product.brandName}`}
        subtitle={`Product Code: ${product.atmCode} | Category: ${product.labName}`}
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            uploadMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Version / Change Notes
            </label>
            <textarea
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Reason for revision or changes made..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Word Document (.doc / .docx) <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-1">
                <FileText className="w-8 h-8 text-blue-600" />
                {selectedFile ? (
                  <div>
                    <p className="font-semibold text-slate-800">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-700">Choose .doc or .docx file</p>
                    <p className="text-[10px] text-slate-400">Word documents only &bull; Up to 50MB</p>
                  </div>
                )}
              </div>
            </div>
            {fileError && <p className="text-rose-600 font-medium mt-1">{fileError}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploadMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50"
            >
              {uploadMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Upload Document</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Document Details Modal */}
      {currentDoc && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Document Metadata — ${currentDoc.fileName}`}
          subtitle={`Product: ${product.brandName} (${product.atmCode})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">File Name:</span>
                <span className="font-semibold text-slate-800">{currentDoc.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Document Title:</span>
                <span className="font-semibold text-slate-800">{currentDoc.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Format:</span>
                <span className="font-mono text-teal-800 font-bold">Word Document (.docx)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Version:</span>
                <span className="font-mono font-bold text-teal-700">v{currentDoc.version}.0 (Latest)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">File Size:</span>
                <span className="font-semibold text-slate-800">{(currentDoc.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded By:</span>
                <span className="font-semibold text-slate-800">{currentDoc.uploadedByName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded At:</span>
                <span className="font-semibold text-slate-800">{new Date(currentDoc.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Linked Product ID:</span>
                <span className="font-mono text-slate-800">{currentDoc.productId}</span>
              </div>
            </div>

            {currentDoc.versionNotes && (
              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                <span className="text-slate-500 block mb-0.5 font-semibold">Change Reason / Notes:</span>
                <p className="text-slate-700 italic">&quot;{currentDoc.versionNotes}&quot;</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <a
                href={productService.getDocumentDownloadUrl(currentDoc.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Word Document</span>
              </a>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

