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
  Loader2,
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
import { StatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function AnalystDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [executingSampleId, setExecutingSampleId] = useState<string | null>(null);

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

  // Handle direct execution of analysis (transitions sample status to TESTING_IN_PROGRESS)
  const handleExecuteAnalysis = async (sample: Sample) => {
    try {
      setExecutingSampleId(sample.id);

      // 1. Update backend DB sample status
      try {
        await samplingService.update(sample.id, {
          status: 'TESTING_IN_PROGRESS' as any,
        });
      } catch (e) {
        console.warn('Backend sample status update non-critical:', e);
      }

      // 2. Sync local tasks stored in localStorage
      try {
        const raw = localStorage.getItem('city_pharma_lims_tasks');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((t: any) => {
              if (
                t.sampleId === sample.sampleCode ||
                t.sampleId === sample.accessionNo ||
                (sample.lotNumber && t.batchLot === sample.lotNumber)
              ) {
                return { ...t, status: 'IN_PROGRESS' };
              }
              return t;
            });
            localStorage.setItem('city_pharma_lims_tasks', JSON.stringify(updated));
            window.dispatchEvent(new Event('lims-tasks-updated'));
          }
        }
      } catch (err) {
        console.warn('Local tasks sync error:', err);
      }

      refetch();
    } catch (err: any) {
      console.error('Failed to execute analysis:', err);
    } finally {
      setExecutingSampleId(null);
    }
  };

  // Filtered samples for search
  const displayedSamples = myAssignedSamples.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.sampleCode || '').toLowerCase().includes(term) ||
      (s.nomenclature || s.materialName || '').toLowerCase().includes(term) ||
      (s.lotNumber || '').toLowerCase().includes(term)
    );
  });

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
                Assigned Personnel: {(user?.fullName || 'Analyst').replace(/\s*\([^)]*\)/g, '').trim()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Analytical Execution &amp; Product Testing Hub
            </h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>My Assigned Samples</span>
            <Microscope className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-900">{myAssignedSamples.length}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {myAssignedSamples.filter((s) => s.status === 'REVIEW_PENDING' || s.status === 'APPROVED').length}
          </div>
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
                        {(() => {
                          const statusStr = String(sample.status || '');
                          const isDone = statusStr === 'COMPLETED' || statusStr === 'APPROVED' || statusStr === 'REVIEW_PENDING';
                          const isInProgress = statusStr === 'TESTING_IN_PROGRESS' || statusStr === 'IN_PROGRESS' || statusStr === 'IN_ANALYSIS';

                          if (isDone) {
                            return (
                              <span className="h-7 px-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            );
                          }

                          if (isInProgress) {
                            return (
                              <span className="h-7 px-2.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span>In Progress</span>
                              </span>
                            );
                          }

                          return (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleExecuteAnalysis(sample)}
                              disabled={executingSampleId === sample.id}
                              className="h-7 text-xs bg-navy-900 hover:bg-navy-800 text-white font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              {executingSampleId === sample.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-teal-300" />
                              ) : (
                                <Play className="h-3 w-3 text-teal-400" />
                              )}
                              <span>Execute Analysis</span>
                            </Button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
