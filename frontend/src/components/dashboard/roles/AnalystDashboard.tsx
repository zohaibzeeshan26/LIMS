'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { samplingService } from '@/services/sampling.service';
import { productService } from '@/services/product.service';
import { useAuth } from '@/context/AuthContext';
import { isAssignedToUser } from '@/lib/analysts';
import { Sample, Product, ProductDocument } from '@/types/lims';
import {
  Microscope,
  Play,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  Folder,
  ExternalLink,
  Search,
  Check,
  AlertCircle,
  Eye,
  Download,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { DOCUMENT_CATEGORIES } from '@/components/documentation/ProductFolderViewerModal';
import { api } from '@/lib/api';

export function AnalystDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSampleForExecution, setSelectedSampleForExecution] = useState<Sample | null>(null);
  const [executionViewingDoc, setExecutionViewingDoc] = useState<ProductDocument | null>(null);

  // Active Test for Result Input
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [numericResult, setNumericResult] = useState('');
  const [textResult, setTextResult] = useState('');
  const [comments, setComments] = useState('');

  // Stored tasks from /tasks assignment board
  const [storedTasks, setStoredTasks] = useState<any[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('city_pharma_lims_tasks');
      if (raw) setStoredTasks(JSON.parse(raw));
    } catch {}
  }, []);

  // Fetch all samples
  const { data: samplesData, refetch } = useQuery({
    queryKey: ['analyst-dashboard-samples'],
    queryFn: () => samplingService.getAll({ limit: 100, sortBy: 'samplingDate', sortOrder: 'desc' }),
    refetchInterval: 4000,
  });

  const allSamples: Sample[] = useMemo(() => {
    if (Array.isArray(samplesData)) return samplesData;
    if (Array.isArray((samplesData as any)?.data)) return (samplesData as any).data;
    return [];
  }, [samplesData]);

  // Load commercial products for document association
  const { data: productsList = [] } = useQuery({
    queryKey: ['analyst-products-list'],
    queryFn: productService.getAll,
  });

  // STRICT FILTER: Display ONLY samples assigned to this logged-in analyst!
  const myAssignedSamples: Sample[] = useMemo(() => {
    if (!user) return [];
    return allSamples.filter((s) => {
      return (
        isAssignedToUser(s, user) ||
        storedTasks.some((t) => {
          const matchCode = (t.sampleId || t.accessionNo || '').toUpperCase();
          const sCode = (s.sampleCode || s.accessionNo || s.sampleId || '').toUpperCase();
          return matchCode === sCode && isAssignedToUser(t, user);
        })
      );
    });
  }, [allSamples, user, storedTasks]);

  // Helper to match full product record for a test or sample
  const getProductForTest = React.useCallback(
    (testOrSample: any): Product | null => {
      if (!productsList || productsList.length === 0 || !testOrSample) return null;
      const mat = (testOrSample?.materialName || testOrSample?.nomenclature || '').toLowerCase().trim();
      const pId = (testOrSample?.productId || '').toLowerCase().trim();

      if (pId) {
        const byId = productsList.find((p) => p.id.toLowerCase() === pId || p.atmCode.toLowerCase() === pId);
        if (byId) return byId;
      }

      if (mat) {
        const exactBrand = productsList.find(
          (p) =>
            p.brandName.toLowerCase() === mat ||
            p.genericName.toLowerCase() === mat ||
            mat.includes(p.brandName.toLowerCase()) ||
            p.brandName.toLowerCase().includes(mat)
        );
        if (exactBrand) return exactBrand;
      }
      return null;
    },
    [productsList]
  );

  // Dynamic Product query for the currently executing sample
  const targetProductId = useMemo(() => {
    if (!selectedSampleForExecution) return '';
    const matched = getProductForTest(selectedSampleForExecution);
    return (selectedSampleForExecution as any)?.productId || matched?.id || selectedSampleForExecution.sampleCode || '';
  }, [selectedSampleForExecution, getProductForTest]);

  const {
    data: liveProduct,
    isFetching: isLiveProductFetching,
    refetch: refetchExecutionDocs,
  } = useQuery({
    queryKey: ['analyst-execution-live-product', targetProductId],
    queryFn: async () => {
      if (!targetProductId) return null;
      try {
        return await productService.getById(targetProductId);
      } catch (e) {
        return null;
      }
    },
    enabled: !!selectedSampleForExecution && !!targetProductId,
    refetchInterval: 3000,
  });

  const effectiveExecutionProduct = liveProduct || (selectedSampleForExecution ? getProductForTest(selectedSampleForExecution) : null);
  const executionProductDocs: ProductDocument[] = useMemo(() => {
    const docs = effectiveExecutionProduct?.documents || [];
    return [...docs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [effectiveExecutionProduct]);

  // Filtered samples for search
  const displayedSamples = myAssignedSamples.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.sampleCode || '').toLowerCase().includes(term) ||
      (s.nomenclature || s.materialName || '').toLowerCase().includes(term) ||
      (s.lotNumber || '').toLowerCase().includes(term)
    );
  });

  // Result submission
  const handleRecordResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest) return;

    try {
      await api.patch(`/tests/${activeTest.id}/record-result`, {
        numericResult: numericResult ? parseFloat(numericResult) : undefined,
        textResult: textResult || undefined,
        comments: comments || undefined,
      }).catch(() => {});

      setActiveTest(null);
      setNumericResult('');
      setTextResult('');
      setComments('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Error recording test result');
    }
  };

  return (
    <div className="space-y-6">
      {/* Analyst Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0B1A30] via-teal-950 to-slate-900 text-white p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500 text-white shadow-xs">
                ★ QC Analyst Personal Workstation
              </span>
              <span className="text-xs text-teal-300 font-mono">
                Assigned Personnel: {user?.fullName} ({user?.role})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Analytical Execution &amp; Product Testing Hub
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Access all product documentation (Word, Excel, PDF), review approved STP testing monographs, execute compendial tests, and record measured values.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/testing"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Full Testing Board</span>
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Refresh assigned samples"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>My Assigned Samples</span>
            <Microscope className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-900">{myAssignedSamples.length}</div>
          <p className="text-[11px] text-slate-400">Assigned specifically to you</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>In Testing Status</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {myAssignedSamples.filter((s) => s.status === 'TESTING_IN_PROGRESS' || s.status === 'ASSIGNED_FOR_TESTING').length}
          </div>
          <p className="text-[11px] text-slate-400">Worksheets to execute</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Documentation Synced</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">Live</div>
          <p className="text-[11px] text-slate-400">Word, Excel &amp; PDF STP active</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {myAssignedSamples.filter((s) => s.status === 'REVIEW_PENDING' || s.status === 'APPROVED').length}
          </div>
          <p className="text-[11px] text-slate-400">Signed off analyses</p>
        </div>
      </div>

      {/* Main Table: Strictly My Assigned Samples */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Microscope className="w-4 h-4 text-teal-600" />
              <span>My Assigned QC Testing Queue ({myAssignedSamples.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Only samples allocated to you by your Quality Control Supervisor are displayed here
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search my samples..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 w-44"
              />
            </div>
            <Link
              href="/testing"
              className="px-3 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors inline-flex items-center gap-1"
            >
              <span>View Testing Table</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                <th className="py-2.5 px-3">Sample ID</th>
                <th className="py-2.5 px-3">Material / Product</th>
                <th className="py-2.5 px-3">Batch / Lot</th>
                <th className="py-2.5 px-3">Product Documentation</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Execution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSamples.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-teal-500 mx-auto mb-1" />
                    <span>No pending samples currently assigned to your roster.</span>
                  </td>
                </tr>
              ) : (
                displayedSamples.map((sample) => {
                  const prod = getProductForTest(sample);
                  const docsCount = prod?.documents?.length || 0;

                  return (
                    <tr key={sample.id} className="hover:bg-teal-50/20 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-teal-900">{sample.sampleCode}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{sample.accessionNo}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 max-w-[200px]">
                        <div>{sample.nomenclature || sample.materialName}</div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-300 mt-1">
                          ★ Assigned to You
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {sample.lotNumber || sample.batch?.batchNumber || '—'}
                      </td>
                      <td className="py-3 px-3">
                        {docsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>{docsCount} {docsCount === 1 ? 'Doc' : 'Docs'} Available (Word/PDF)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No document attached</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={sample.status || 'REGISTERED'} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setSelectedSampleForExecution(sample)}
                          className="h-7 text-xs bg-navy-900 hover:bg-navy-800 text-white font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Play className="h-3 w-3 text-teal-400" />
                          <span>Execute Analysis</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SAMPLE ANALYSIS EXECUTION MODAL (Full In-Modal Workstation with Live Document Viewer & Test Entry) */}
      {selectedSampleForExecution && (
        <Modal
          isOpen={!!selectedSampleForExecution}
          onClose={() => {
            setSelectedSampleForExecution(null);
            setExecutionViewingDoc(null);
          }}
          title={`Analyst Execution: ${selectedSampleForExecution.sampleCode}`}
          subtitle={`Accession No: ${selectedSampleForExecution.accessionNo} • ${selectedSampleForExecution.nomenclature || selectedSampleForExecution.materialName}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* 1. Sample Details Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sample ID</span>
                  <span className="font-mono font-bold text-teal-800">{selectedSampleForExecution.sampleCode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Product / Material</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {selectedSampleForExecution.nomenclature || selectedSampleForExecution.materialName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stage</span>
                  <span className="font-semibold text-slate-700">{selectedSampleForExecution.stageType || selectedSampleForExecution.sampleType}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Batch / Lot</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedSampleForExecution.lotNumber || '—'}</span>
                </div>
              </div>

              {/* Dynamic Live Status */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Linked Product:</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {effectiveExecutionProduct?.brandName || 'Product Monograph'} ({effectiveExecutionProduct?.id || 'ID'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Synced with Doc Manager</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => refetchExecutionDocs()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-teal-700 px-2 py-0.5 rounded hover:bg-slate-200/70 cursor-pointer"
                  >
                    <RotateCcw className={cn("w-3 h-3", isLiveProductFetching && "animate-spin text-teal-600")} />
                    <span>Refresh Docs</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. In-Modal Document Viewer */}
            {executionViewingDoc && (
              <div className="space-y-2 rounded-2xl border-2 border-teal-500/40 bg-teal-50/40 p-3 sm:p-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-teal-200 shadow-2xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate" title={executionViewingDoc.fileName}>
                          {executionViewingDoc.fileName}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                          v{executionViewingDoc.version}.0
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {executionViewingDoc.title} • {(executionViewingDoc.fileSize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={productService.getDocumentViewUrl(executionViewingDoc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
                      <span>New Tab</span>
                    </a>
                    <a
                      href={productService.getDocumentDownloadUrl(executionViewingDoc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600" />
                      <span>Download</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setExecutionViewingDoc(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Close Viewer</span>
                    </button>
                  </div>
                </div>

                <div className="w-full h-96 sm:h-[480px] rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-inner">
                  <iframe
                    src={productService.getDocumentViewUrl(executionViewingDoc.id)}
                    className="w-full h-full border-0 bg-white"
                    title={executionViewingDoc.fileName}
                  />
                </div>
              </div>
            )}

            {/* 3. Product Documentation Monograph Dossier */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/30 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-600 text-white shrink-0 shadow-2xs">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Product Testing Monograph &amp; STP Methods
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Approved documentation for analytical testing
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white text-teal-900 border border-teal-200 font-mono shadow-2xs">
                  {executionProductDocs.length} {executionProductDocs.length === 1 ? 'Document' : 'Documents'} Available
                </span>
              </div>

              {executionProductDocs.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center">
                  <p className="text-xs text-slate-500">
                    No product documents uploaded for this product yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {executionProductDocs.map((docItem, idx) => {
                    const isWord = docItem.fileName.toLowerCase().endsWith('.docx') || docItem.fileName.toLowerCase().endsWith('.doc');
                    const isExcel = docItem.fileName.toLowerCase().endsWith('.xlsx') || docItem.fileName.toLowerCase().endsWith('.xls');
                    const isPdf = docItem.fileName.toLowerCase().endsWith('.pdf');
                    const fileIcon = isWord ? '📝' : isExcel ? '📊' : isPdf ? '📕' : '📄';
                    const fileTypeLabel = isWord ? 'Word' : isExcel ? 'Excel' : isPdf ? 'PDF' : 'File';
                    const isCurrentlyViewing = executionViewingDoc?.id === docItem.id;

                    return (
                      <div
                        key={docItem.id || idx}
                        className={cn(
                          'p-3 rounded-xl border bg-white shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between gap-2',
                          isCurrentlyViewing ? 'border-teal-500 ring-2 ring-teal-100 bg-teal-50/20' : 'border-slate-200'
                        )}
                      >
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase bg-slate-50 text-slate-700">
                              {fileIcon} {fileTypeLabel}
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                              v{docItem.version}.0
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate" title={docItem.fileName}>
                            {docItem.fileName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(docItem.fileSize / 1024).toFixed(1)} KB &bull; Uploaded by {docItem.uploadedByName || 'Doc Manager'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExecutionViewingDoc(isCurrentlyViewing ? null : docItem)}
                            className={cn(
                              'flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                              isCurrentlyViewing
                                ? 'bg-teal-700 text-white shadow-xs'
                                : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                            )}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isCurrentlyViewing ? 'Viewing' : 'Read SOP / File'}</span>
                          </button>
                          <a
                            href={productService.getDocumentDownloadUrl(docItem.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-teal-700"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5 text-teal-600" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Test Protocols List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Analytical Test Protocols ({selectedSampleForExecution.tests?.length || 0})
              </span>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {(selectedSampleForExecution.tests || []).map((t: any) => (
                  <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {t.testSpecification?.name || 'Analytical Assay Protocol'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Limits: {t.minLimit !== null ? `${t.minLimit} - ${t.maxLimit} ${t.unit}` : 'Qualitative'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.numericResult !== null || t.textResult ? (
                        <div className="text-right mr-2">
                          <span className="font-mono font-bold text-xs">{t.numericResult || t.textResult}</span>
                          <div><StatusBadge status={t.resultStatus || 'PASSED'} /></div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic mr-2">Pending</span>
                      )}
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setActiveTest(t);
                          setNumericResult(t.numericResult !== null ? String(t.numericResult) : '');
                          setTextResult(t.textResult || '');
                        }}
                        className="h-8 text-xs font-bold bg-[#0B1A30] hover:bg-slate-800 text-white cursor-pointer"
                      >
                        {t.numericResult !== null || t.textResult ? 'Edit Result' : 'Input Result'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setSelectedSampleForExecution(null)}>
                Close Workstation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* RESULT INPUT MODAL */}
      {activeTest && (
        <Modal
          isOpen={!!activeTest}
          onClose={() => setActiveTest(null)}
          title={`Input Test Result: ${activeTest.testSpecification?.name || 'Protocol'}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordResult} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pharmacopeial Limit:</span>
              <span className="font-mono font-bold text-slate-800">
                {activeTest.minLimit !== null ? `${activeTest.minLimit} - ${activeTest.maxLimit} ${activeTest.unit}` : 'Conforms to BP/USP'}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Measured Numeric Value ({activeTest.unit || 'units'})</label>
              <input
                type="number"
                step="any"
                value={numericResult}
                onChange={(e) => setNumericResult(e.target.value)}
                placeholder="e.g. 99.8"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Qualitative / Descriptive Finding</label>
              <input
                type="text"
                value={textResult}
                onChange={(e) => setTextResult(e.target.value)}
                placeholder="e.g. Conforms / Complies with BP Specification"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Analyst Notes</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter observation or chromatography remarks..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTest(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save &amp; Submit Result
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
