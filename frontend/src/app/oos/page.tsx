'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/date';
import { RoleRouteGuard } from '@/components/auth/RoleRouteGuard';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  Beaker,
} from 'lucide-react';

export default function OosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedOos, setSelectedOos] = useState<any | null>(null);
  const [phaseOneStatus, setPhaseOneStatus] = useState('INVESTIGATING');
  const [labErrorConfirmed, setLabErrorConfirmed] = useState(false);
  const [rootCauseCategory, setRootCauseCategory] = useState('UNDER_INVESTIGATION');
  const [phaseTwoRequired, setPhaseTwoRequired] = useState(false);
  const [capaDescription, setCapaDescription] = useState('');
  const [qaApprovalStatus, setQaApprovalStatus] = useState('PENDING');

  const { data: oosList, isLoading } = useQuery({
    queryKey: ['oos-list'],
    queryFn: () => api.get<any[]>('/oos'),
  });

  const oosItems = React.useMemo(() => {
    if (!oosList) return [];
    if (Array.isArray(oosList)) return oosList;
    if (Array.isArray((oosList as any).data)) return (oosList as any).data;
    return [];
  }, [oosList]);

  const updateOosMutation = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/oos/${selectedOos.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oos-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setSelectedOos(null);
    },
  });

  const handleOpenEdit = (oos: any) => {
    setSelectedOos(oos);
    setPhaseOneStatus(oos.phaseOneStatus || 'INVESTIGATING');
    setLabErrorConfirmed(oos.labErrorConfirmed || false);
    setRootCauseCategory(oos.rootCauseCategory || 'UNDER_INVESTIGATION');
    setPhaseTwoRequired(oos.phaseTwoRequired || false);
    setCapaDescription(oos.capaDescription || '');
    setQaApprovalStatus(oos.qaApprovalStatus || 'PENDING');
  };

  const handleSaveInvestigation = (e: React.FormEvent) => {
    e.preventDefault();
    updateOosMutation.mutate({
      phaseOneStatus,
      labErrorConfirmed,
      rootCauseCategory,
      phaseTwoRequired,
      capaDescription,
      qaApprovalStatus,
    });
  };

  return (
    <RoleRouteGuard
      allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPUTY_MANAGER', 'QA_MANAGER', 'QC_ANALYST']}
      moduleName="Out of Specification (OOS) Investigations"
    >
      <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy-950 tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
            <span>Out of Specification (OOS) & CAPA</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            FDA & cGMP compliant 2-phase laboratory deviation workflow, root cause investigation, and CAPA tracking
          </p>
        </div>
      </div>

      {/* Phase 2 Roadmap Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-teal-800 shadow-xs shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-navy-950">Future Module: OOS & CAPA Deviations (Phase 2 Roadmap)</span>
            <span className="text-[10px] font-bold text-navy-700 bg-white px-2 py-0.5 rounded border border-slate-200/80 uppercase">
              Phase 2 Scope
            </span>
          </div>
          The Sampling module is currently the fully active certified module for City Pharma LIMS v1.0. This view demonstrates the FDA 2-phase out-of-specification protocol workflow.
        </div>
      </div>

      {/* OOS Incident Cards */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">Loading OOS records...</div>
        ) : oosItems.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-400">
            No Out-of-Specification incidents currently logged.
          </div>
        ) : (
          oosItems.map((oos) => (
            <div
              key={oos.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    {oos.incidentNumber}
                  </span>
                  <StatusBadge status={oos.phaseOneStatus} />
                  <StatusBadge status={oos.qaApprovalStatus} />
                </div>
                <div className="text-xs text-slate-500">
                  Reported by: <strong className="text-slate-800">{oos.reportedBy?.fullName}</strong> •{' '}
                  {formatDateTime(oos.createdAt, 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>

              {/* Sample & Test Involved */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sample Involved</span>
                  <span className="font-mono font-bold text-slate-900">{oos.sample?.sampleCode}</span>
                  <span className="text-slate-600 block line-clamp-1">{oos.sample?.materialName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Analytical Test</span>
                  <span className="font-bold text-slate-900">{oos.sampleTest?.testSpecification?.name}</span>
                  <span className="text-slate-500 block">Method: {oos.sampleTest?.testSpecification?.pharmacopeiaMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Observed vs Spec</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    {oos.sampleTest?.numericResult} {oos.sampleTest?.unit}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    Limit: {oos.sampleTest?.minLimit} - {oos.sampleTest?.maxLimit} {oos.sampleTest?.unit}
                  </span>
                </div>
              </div>

              {/* Investigation & CAPA Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Root Cause Category:</span>
                  <Badge variant="purple" size="sm">{oos.rootCauseCategory?.replace(/_/g, ' ')}</Badge>
                  {oos.labErrorConfirmed && (
                    <Badge variant="danger" size="sm">Laboratory Error Confirmed</Badge>
                  )}
                </div>
                <p className="text-slate-600 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {oos.capaDescription || 'Initial Phase 1 investigation underway.'}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  {oos.qaManager ? (
                    <span>Reviewed by QA: <strong className="text-slate-800">{oos.qaManager.fullName}</strong></span>
                  ) : (
                    <span className="text-amber-700 font-medium">Pending QA Close-Out</span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenEdit(oos)}
                  className="text-xs h-8"
                >
                  Update Investigation / QA Sign-Off
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Investigation Editor Modal */}
      {selectedOos && (
        <Modal
          isOpen={!!selectedOos}
          onClose={() => setSelectedOos(null)}
          title={`OOS Investigation Protocol: ${selectedOos.incidentNumber}`}
          subtitle={`Sample: ${selectedOos.sample?.sampleCode} • ${selectedOos.sample?.materialName}`}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveInvestigation} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phase 1 Lab Investigation Status *
                </label>
                <select
                  value={phaseOneStatus}
                  onChange={(e) => setPhaseOneStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium"
                >
                  <option value="INVESTIGATING">Investigating (Phase 1 Checklist)</option>
                  <option value="CONCLUDED">Concluded (Lab Error Ruled Out/Confirmed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Root Cause Classification *
                </label>
                <select
                  value={rootCauseCategory}
                  onChange={(e) => setRootCauseCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-medium"
                >
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="INSTRUMENT_CALIBRATION">Instrument Calibration Deviation</option>
                  <option value="SAMPLE_CONTAMINATION">Sample Contamination / Preparation</option>
                  <option value="CALCULATION_ERROR">Analyst Calculation Error</option>
                  <option value="RAW_MATERIAL_IMPURITY">Raw Material / Active Synthesis Impurity</option>
                  <option value="MANUFACTURING_DEFECT">Manufacturing Formulation Process Deviation</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={labErrorConfirmed}
                  onChange={(e) => setLabErrorConfirmed(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span>Laboratory Error Confirmed (Re-test Authorized)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={phaseTwoRequired}
                  onChange={(e) => setPhaseTwoRequired(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span>Phase 2 Manufacturing Investigation Required</span>
              </label>
            </div>

            {/* CAPA Plan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Investigation Findings & Corrective Action (CAPA) Description *
              </label>
              <textarea
                rows={3}
                value={capaDescription}
                onChange={(e) => setCapaDescription(e.target.value)}
                placeholder="Document verification of standard purity, balance calibration check, re-injection chromatograms, and preventive controls..."
                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                required
              />
            </div>

            {/* QA Sign-off */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quality Assurance Manager Sign-Off
              </label>
              <select
                value={qaApprovalStatus}
                onChange={(e) => setQaApprovalStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-primary-500 outline-none bg-white font-semibold text-slate-800"
              >
                <option value="PENDING">PENDING (Open Deviation)</option>
                <option value="APPROVED">APPROVED (Investigation Closed & CAPA Authorized)</option>
                <option value="REJECTED">REJECTED (Additional Lab Work Required)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setSelectedOos(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={updateOosMutation.isPending}>
                Save Investigation Record
              </Button>
            </div>
          </form>
        </Modal>
      )}
      </div>
    </RoleRouteGuard>
  );
}
