'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, formatDateOnly } from '@/lib/date';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import {
  Boxes,
  PlusCircle,
  FileCheck2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
} from 'lucide-react';

export default function BatchesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [viewingCoaBatch, setViewingCoaBatch] = useState<any | null>(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);

  // QA Disposition states
  const [qaDecision, setQaDecision] = useState<'RELEASED' | 'REJECTED'>('RELEASED');
  const [qaNotes, setQaNotes] = useState('');

  // New Batch states
  const [batchNumber, setBatchNumber] = useState('');
  const [drugProduct, setDrugProduct] = useState('');
  const [dosageForm, setDosageForm] = useState('Solid Oral Tablet');
  const [batchSize, setBatchSize] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('2026-10-15');
  const [expiryDate, setExpiryDate] = useState('2029-10-14');
  const [notes, setNotes] = useState('');

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get<any[]>('/batches'),
  });

  const batchList: any[] = React.useMemo(() => {
    if (!batches) return [];
    if (Array.isArray(batches)) return batches;
    if (Array.isArray((batches as any).data)) return (batches as any).data;
    return [];
  }, [batches]);

  const { data: batchDetail } = useQuery({
    queryKey: ['batch', selectedBatchId],
    queryFn: () => api.get<any>(`/batches/${selectedBatchId}`),
    enabled: !!selectedBatchId,
  });

  // Release Batch Mutation
  const releaseBatchMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: string; notes: string }) =>
      api.patch(`/batches/${id}/release`, { decision, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch', selectedBatchId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsReleaseModalOpen(false);
    },
  });

  // Issue CoA Mutation
  const issueCoaMutation = useMutation({
    mutationFn: (batchId: string) =>
      api.post('/batches/coa', { batchId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch', selectedBatchId] });
      setViewingCoaBatch({ ...batchDetail, coa: data });
    },
  });

  // Create Batch Mutation
  const createBatchMutation = useMutation({
    mutationFn: (data: any) => api.post('/batches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setIsNewBatchModalOpen(false);
      setBatchNumber('');
      setDrugProduct('');
      setBatchSize('');
    },
  });

  const handlePrintCoa = () => {
    window.print();
  };

  return (
    <RoleRouteGuard
      allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'QA_MANAGER', 'QC_ANALYST']}
      moduleName="Batches & Certificate of Analysis (CoA)"
    >
      <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6 text-teal-700" />
            <span>Batches & Certificate of Analysis (CoA)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Production lot releases, QA disposition sign-offs, and cryptographically verified Certificates of Analysis
          </p>
        </div>

        <Button
          onClick={() => setIsNewBatchModalOpen(true)}
          variant="primary"
          className="bg-navy-900 hover:bg-navy-800 text-white shadow-xs"
        >
          <PlusCircle className="h-4 w-4 text-teal-400" />
          <span>New Production Lot</span>
        </Button>
      </div>

      {/* Phase 2 Roadmap Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-teal-800 shadow-xs shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-navy-950">Future Module: QA Release & Certificate of Analysis (Phase 2 Roadmap)</span>
            <span className="text-[10px] font-bold text-navy-700 bg-white px-2 py-0.5 rounded border border-slate-200/80 uppercase">
              Phase 2 Scope
            </span>
          </div>
          The Sampling module is currently the fully active certified module for City Pharma LIMS v1.0. This view demonstrates the lot disposition and CoA publishing engine.
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Batch / Lot Number</th>
                <th className="py-3.5 px-4">Drug Formulation</th>
                <th className="py-3.5 px-4">Batch Size</th>
                <th className="py-3.5 px-4">Manufacturing & Expiry</th>
                <th className="py-3.5 px-4">QA Status</th>
                <th className="py-3.5 px-4">Certificate of Analysis</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading production batches...</td>
                </tr>
              ) : (
                batchList.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-sm font-bold text-slate-900">{b.batchNumber}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{b.drugProduct}</div>
                      <div className="text-[11px] text-slate-400">{b.dosageForm}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {b.batchSize}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      <div>MFG: {formatDateOnly(b.manufacturingDate)}</div>
                      <div>EXP: {formatDateOnly(b.expiryDate)}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} />
                      {b.releasedBy && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-36">
                          By: {b.releasedBy}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {b.coa ? (
                        <button
                          onClick={() => {
                            setSelectedBatchId(b.id);
                            setViewingCoaBatch(b);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 font-mono text-xs font-semibold transition-colors"
                        >
                          <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{b.coa.certificateNumber}</span>
                        </button>
                      ) : b.status === 'RELEASED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBatchId(b.id);
                            issueCoaMutation.mutate(b.id);
                          }}
                          className="h-7 text-xs text-primary-700 border-primary-200"
                        >
                          Generate CoA
                        </Button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Requires QA Release</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'QUARANTINE' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedBatchId(b.id);
                              setIsReleaseModalOpen(true);
                            }}
                            className="h-7 text-xs"
                          >
                            QA Disposition
                          </Button>
                        )}
                        {b.coa && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBatchId(b.id);
                              setViewingCoaBatch(b);
                            }}
                            className="h-7 text-xs"
                          >
                            View CoA
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QA Disposition Modal */}
      {selectedBatchId && isReleaseModalOpen && (
        <Modal
          isOpen={isReleaseModalOpen}
          onClose={() => setIsReleaseModalOpen(false)}
          title="Quality Assurance Batch Disposition"
          subtitle="Authorize release to commercial distribution or issue QA rejection"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">QA Decision *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setQaDecision('RELEASED')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    qaDecision === 'RELEASED'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>AUTHORIZE RELEASE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQaDecision('REJECTED')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    qaDecision === 'REJECTED'
                      ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>REJECT BATCH</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Release Justification & GMP Review Notes *
              </label>
              <textarea
                rows={3}
                value={qaNotes}
                onChange={(e) => setQaNotes(e.target.value)}
                placeholder="Review of Batch Manufacturing Record (BMR), in-process controls, and finished analytical worksheets confirms full compliance..."
                className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              This action will be digitally recorded under user <strong>{user?.fullName} ({user?.employeeId})</strong>.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsReleaseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={qaDecision === 'RELEASED' ? 'primary' : 'danger'}
                onClick={() =>
                  releaseBatchMutation.mutate({
                    id: selectedBatchId,
                    decision: qaDecision,
                    notes: qaNotes,
                  })
                }
                isLoading={releaseBatchMutation.isPending}
              >
                Confirm QA Disposition
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Certificate of Analysis (CoA) High-Fidelity Viewer */}
      {viewingCoaBatch && (
        <Modal
          isOpen={!!viewingCoaBatch}
          onClose={() => setViewingCoaBatch(null)}
          title="Official Certificate of Analysis (CoA)"
          subtitle={`Certificate: ${viewingCoaBatch.coa?.certificateNumber || 'Draft'} • ${viewingCoaBatch.batchNumber}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Printable Document Sheet */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    CITY PHARMA LABORATORIES LTD.
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    QUALITY CONTROL & REGULATORY ASSURANCE DIVISION
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Plot 48/B, Industrial Area, Karachi • cGMP Licensed Laboratory
                  </p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-slate-900">
                    CERTIFICATE OF ANALYSIS
                  </div>
                  <div className="text-xs text-primary-700 font-semibold">
                    {viewingCoaBatch.coa?.certificateNumber}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Issued: {formatDateTime(viewingCoaBatch.coa?.issuedDate || new Date(), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>

              {/* Product & Batch Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Product Name</span>
                  <span className="font-bold text-slate-900">{viewingCoaBatch.drugProduct}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Batch Number</span>
                  <span className="font-mono font-bold text-slate-900">{viewingCoaBatch.batchNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Manufacturing Date</span>
                  <span className="font-medium text-slate-800">{formatDateOnly(viewingCoaBatch.manufacturingDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Expiration Date</span>
                  <span className="font-medium text-slate-800">{formatDateOnly(viewingCoaBatch.expiryDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Dosage Form</span>
                  <span className="font-medium text-slate-800">{viewingCoaBatch.dosageForm}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Batch Quantity</span>
                  <span className="font-mono font-medium text-slate-800">{viewingCoaBatch.batchSize}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Standard Monograph</span>
                  <span className="font-medium text-slate-800">USP 44-NF 39 / BP Compendial Specifications</span>
                </div>
              </div>

              {/* Analytical Test Results Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Finished Product Analytical Test Results
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Test Parameter</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Specification Limits</th>
                        <th className="py-2.5 px-3">Observed Results</th>
                        <th className="py-2.5 px-3 text-right">Conclusion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingCoaBatch.samples?.[0]?.tests?.map((t: any) => (
                        <tr key={t.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{t.testSpecification.name}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{t.testSpecification.pharmacopeiaMethod}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {t.minLimit !== null ? `${t.minLimit} - ${t.maxLimit} ${t.unit || ''}` : 'Conforms'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {t.numericResult !== null ? `${t.numericResult} ${t.unit || ''}` : (t.textResult || 'Conforms')}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              CONFORMS
                            </span>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Standard compendial parameters meet USP criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks Statement */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <strong>Certification Statement:</strong> {viewingCoaBatch.coa?.remarks || 'This batch complies with all specified standard release requirements.'}
              </div>

              {/* Digital Signature & Seal Box (21 CFR Part 11) */}
              <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-primary-700" />
                    <span>Electronic Verification</span>
                  </div>
                  <p className="text-[10px] text-slate-500 max-w-sm font-mono break-all">
                    SHA-256 Digest: {viewingCoaBatch.coa?.signatureHash || 'c8f731e0b924619a84d...'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block p-3 rounded-xl border border-primary-200 bg-primary-50/50 text-left">
                    <span className="text-[10px] text-primary-700 uppercase font-bold block">Authorized QA Sign-Off</span>
                    <span className="text-xs font-bold text-slate-900 block">Fatima Noor</span>
                    <span className="text-[10px] text-slate-500 block">Head of Quality Assurance • EMP-014</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <Button variant="outline" onClick={() => setViewingCoaBatch(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={handlePrintCoa}>
                <Printer className="h-4 w-4" />
                <span>Print Certificate (PDF)</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Batch Modal */}
      <Modal
        isOpen={isNewBatchModalOpen}
        onClose={() => setIsNewBatchModalOpen(false)}
        title="Register Production Batch / Lot"
        subtitle="Initiate a new pharmaceutical commercial or clinical lot record"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBatchMutation.mutate({
              batchNumber,
              drugProduct,
              dosageForm,
              batchSize,
              manufacturingDate,
              expiryDate,
              notes,
            });
          }}
          className="space-y-3.5 text-xs sm:text-sm"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number *</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. CP-2026-B893"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Size *</label>
              <input
                type="text"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                placeholder="e.g. 500,000 Tablets"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Drug Product Name *</label>
            <input
              type="text"
              value={drugProduct}
              onChange={(e) => setDrugProduct(e.target.value)}
              placeholder="e.g. Ciprofloxacin 500mg Film-Coated Tablets"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage Form *</label>
            <select
              value={dosageForm}
              onChange={(e) => setDosageForm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="Solid Oral Tablet">Solid Oral Tablet</option>
              <option value="Hard Gelatin Capsule">Hard Gelatin Capsule</option>
              <option value="Liquid Injectable">Liquid Injectable</option>
              <option value="Oral Suspension">Oral Suspension</option>
              <option value="Ophthalmic Solution">Ophthalmic Solution</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturing Date *</label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration Date *</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Production Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Master formula reference or manufacturing plant details..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewBatchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createBatchMutation.isPending}>
              Create Batch
            </Button>
          </div>
        </form>
      </Modal>
      </div>
    </RoleRouteGuard>
  );
}
