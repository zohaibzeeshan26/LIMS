'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { ProductDocument } from '@/types/lims';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  User,
  Trash2,
  ShieldAlert,
  RotateCcw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/date';

interface PendingDocumentDeletionsCardProps {
  className?: string;
  onActionComplete?: () => void;
  readOnly?: boolean;
}

export function PendingDocumentDeletionsCard({
  className,
  onActionComplete,
  readOnly = false,
}: PendingDocumentDeletionsCardProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    data: pendingDocs = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['pending-document-deletions'],
    queryFn: () => productService.getPendingDeletions(),
    refetchInterval: 5000,
  });

  const handleApprove = async (doc: ProductDocument) => {
    const confirmed = window.confirm(
      `APPROVAL CONFIRMATION:\n\nAre you sure you want to APPROVE deletion for:\n"${doc.fileName}" (v${doc.version}.0)\nProduct: ${doc.productName}?\n\nApproving will notify the Documentation Manager and grant them permission to permanently delete ONLY this approved document.`
    );
    if (!confirmed) return;

    setProcessingId(doc.id);
    setFeedback(null);
    try {
      const res = await productService.approveDeletion(doc.id);
      setFeedback({
        type: 'success',
        message: res.message || `Deletion request for "${doc.fileName}" APPROVED. Documentation user authorized to delete.`,
      });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['admin-pending-deletions-count'] });
      await queryClient.invalidateQueries({ queryKey: ['doc-deletion-updates'] });
      await queryClient.invalidateQueries({ queryKey: ['products-list'] });
      await queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to approve document deletion.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (doc: ProductDocument) => {
    const reason = window.prompt(
      `Provide rejection note / reason for keeping "${doc.fileName}":`,
      'Document retained by Administrator - required for laboratory reference.'
    );
    if (reason === null) return; // User pressed cancel

    setProcessingId(doc.id);
    setFeedback(null);
    try {
      const res = await productService.rejectDeletion(doc.id, reason);
      setFeedback({
        type: 'success',
        message: res.message || `Deletion request REJECTED. Document "${doc.fileName}" remains active.`,
      });
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['admin-pending-deletions-count'] });
      await queryClient.invalidateQueries({ queryKey: ['doc-deletion-updates'] });
      await queryClient.invalidateQueries({ queryKey: ['products-list'] });
      await queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to reject document deletion.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!isLoading && pendingDocs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-300 bg-amber-50/70 p-5 sm:p-6 shadow-sm space-y-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Pending Document Deletion Requests ({pendingDocs.length})
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                Admin / HOD Sign-off Required
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              The Documentation Manager submitted the following file deletion requests. A document is
              only removed from the system if an Administrator or HOD approves it; otherwise, it remains active.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="self-end sm:self-center p-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5"
          title="Refresh pending requests"
        >
          <RotateCcw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin text-amber-600')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={cn(
            'p-3 rounded-xl border text-xs flex items-center justify-between gap-2',
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* List of pending deletion requests */}
      <div className="space-y-3">
        {pendingDocs.map((doc: any) => {
          const isProcessing = processingId === doc.id;
          return (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-amber-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Document and Product Details */}
                <div className="space-y-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1 rounded bg-slate-100 text-slate-700">
                      <FileText className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {doc.fileName}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      v{doc.version}.0
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({(doc.fileSize / 1024).toFixed(1)} KB)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      {doc.category || 'Quality Document'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>
                      Product: <strong className="text-slate-800">{doc.productName}</strong>
                    </span>
                    {doc.productCode && (
                      <span className="font-mono text-teal-700 font-semibold">
                        ({doc.productCode})
                      </span>
                    )}
                    {doc.product?.laboratory && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {doc.product.laboratory} LAB
                      </span>
                    )}
                  </div>

                  {/* Requester & Timestamp */}
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap pt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      Requested by: <strong className="text-slate-700">{doc.deleteRequestedByName || 'Documentation Manager'}</strong>
                    </span>
                    {doc.deleteRequestedAt && (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(doc.deleteRequestedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Reason Callout */}
                  {doc.deleteReason && (
                    <div className="mt-1 p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold">Reason provided: </span>
                      <span className="italic">{doc.deleteReason}</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <a
                    href={productService.getDocumentViewUrl(doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    title="Preview document in new tab before deciding"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Inspect</span>
                  </a>

                  {readOnly ? (
                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Read-Only Surveillance Mode</span>
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(doc)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Reject request and keep file in the system"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(doc)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Approve deletion request and authorize Documentation user to delete"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Deletion</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

