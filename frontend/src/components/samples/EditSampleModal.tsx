'use client';

import React, { useState, useEffect } from 'react';
import { Sample, SampleType, Priority, SampleStatus, SAMPLE_STAGES } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { samplingService } from '@/services/sampling.service';
import { ShieldCheck, AlertCircle, Save, X, Calendar, User, Package, FileText, Lock } from 'lucide-react';

interface EditSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: Sample | null;
}

export function EditSampleModal({ isOpen, onClose, sample }: EditSampleModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    nomenclature: '',
    lotNumber: '',
    sampleQty: '' as any,
    unit: 'tablets',
    customUnit: '',
    sampleType: 'Finished Product',
    customStage: '',
    mfgDate: '',
    expDate: '',
    submittedBy: '',
    storageCondition: 'Controlled Room Temp 20-25°C',
    priority: 'ROUTINE' as Priority,
    status: 'RECEIVED' as SampleStatus,
    remarks: '',
    reasonForChange: '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (sample) {
      const currentStage = sample.stageType || sample.sampleType || 'Finished Product';
      const isKnown = (SAMPLE_STAGES as readonly string[]).includes(currentStage) && currentStage !== 'Other';

      setFormData({
        nomenclature: sample.nomenclature || sample.materialName || '',
        lotNumber: sample.lotNumber || sample.batch?.batchNumber || '',
        sampleQty: sample.sampleQty || ('' as any),
        unit: ['tablets', 'capsules', 'raw data'].includes((sample.unit || '').toLowerCase())
          ? (sample.unit || '').toLowerCase()
          : 'Other',
        customUnit: ['tablets', 'capsules', 'raw data'].includes((sample.unit || '').toLowerCase())
          ? ''
          : sample.unit || '',
        sampleType: isKnown ? currentStage : 'Other',
        customStage: isKnown ? '' : currentStage,
        mfgDate: sample.mfgDate ? sample.mfgDate.substring(0, 10) : (sample.batch?.manufacturingDate ? sample.batch.manufacturingDate.substring(0, 10) : ''),
        expDate: sample.expDate ? sample.expDate.substring(0, 10) : (sample.batch?.expiryDate ? sample.batch.expiryDate.substring(0, 10) : ''),
        submittedBy: sample.submittedBy || '',
        storageCondition: sample.storageCondition || 'Controlled Room Temp 20-25°C',
        priority: sample.priority || 'ROUTINE',
        status: sample.status || 'RECEIVED',
        remarks: sample.remarks || '',
        reasonForChange: '',
      });
      setValidationError(null);
    }
  }, [sample]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      if (!sample) throw new Error('No sample selected');
      return samplingService.update(sample.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['sample', sample?.id] });
      queryClient.invalidateQueries({ queryKey: ['sampling-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['navbar-audit-alerts'] });
      onClose();
    },
    onError: (err: any) => {
      setValidationError(err?.response?.data?.message || err?.message || 'Failed to update sample record');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.reasonForChange || formData.reasonForChange.trim().length < 5) {
      setValidationError('A clear reason for modification (min 5 characters) is mandatory.');
      return;
    }

    if (!formData.nomenclature.trim()) {
      setValidationError('Nomenclature / Material name cannot be empty.');
      return;
    }

    const finalStage =
      formData.sampleType === 'Other'
        ? (formData.customStage?.trim() || 'Other')
        : formData.sampleType;

    const finalUnit =
      formData.unit === 'Other'
        ? (formData.customUnit.trim() || 'units')
        : formData.unit;

    if (formData.unit === 'Other' && !formData.customUnit.trim()) {
      setValidationError('Please specify custom quantity unit when "Other" is selected.');
      return;
    }

    const payload: any = {
      nomenclature: formData.nomenclature.trim(),
      materialName: formData.nomenclature.trim(),
      lotNumber: formData.lotNumber.trim() || undefined,
      sampleQty: Number(formData.sampleQty),
      unit: finalUnit.trim(),
      stageType: finalStage,
      sampleType: finalStage,
      mfgDate: formData.mfgDate || undefined,
      expDate: formData.expDate || undefined,
      submittedBy: formData.submittedBy.trim() || undefined,
      storageCondition: formData.storageCondition,
      priority: formData.priority,
      status: formData.status,
      remarks: formData.remarks.trim() || undefined,
      reasonForChange: formData.reasonForChange.trim(),
    };

    updateMutation.mutate(payload);
  };

  if (!sample) return null;

  // Strict RBAC: Only Administrator is authorized to modify existing sample records
  if (user && user.role !== 'ADMIN') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Access Restricted: Administrator Only"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-700 py-1 font-sans">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">Record Modification Restricted</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Existing sample records can only be edited by the <strong>System Administrator</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close Window
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Sampling Record: ${sample.accessionNo || sample.sampleCode}`}
      subtitle={`Sample ID: ${sample.sampleCode} • Internal UUID: ${sample.id}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Read-only Accession and ID banner */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">A. No. (Serial / Record No.)</span>
            <span className="font-mono font-bold text-navy-950 text-sm">{sample.accessionNo || 'A-0001'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Sample Code / ID</span>
            <span className="font-mono font-bold text-teal-800 text-sm">{sample.sampleCode}</span>
          </div>
        </div>

        {/* Nomenclature */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Nomenclature / Material Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.nomenclature}
            onChange={(e) => setFormData({ ...formData, nomenclature: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
          />
        </div>

        {/* Batch / Lot No. & Stage / Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Batch No. / Lot No.
            </label>
            <input
              type="text"
              value={formData.lotNumber}
              onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Stage / Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.sampleType}
              onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium"
            >
              {SAMPLE_STAGES.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>

            {formData.sampleType === 'Other' && (
              <div className="mt-2 animate-in fade-in duration-150">
                <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                  Specify Custom Stage <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customStage}
                  onChange={(e) => setFormData({ ...formData, customStage: e.target.value })}
                  placeholder="Enter manual stage..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-400 bg-blue-50/40 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium text-slate-900"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Qty. of Sample <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={formData.sampleQty}
              onChange={(e) => setFormData({ ...formData, sampleQty: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Unit <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium text-slate-800"
            >
              <option value="tablets">Tablets</option>
              <option value="capsules">Capsules</option>
              <option value="raw data">Raw Data</option>
              <option value="Other">Other</option>
            </select>

            {formData.unit === 'Other' && (
              <div className="mt-2 animate-in fade-in duration-150">
                <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                  Specify Custom Unit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customUnit}
                  onChange={(e) => setFormData({ ...formData, customUnit: e.target.value })}
                  placeholder="Enter manual unit (e.g. strips, vials, mL...)"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-400 bg-blue-50/40 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium text-slate-900"
                />
              </div>
            )}
          </div>
        </div>

        {/* MFG Date & EXP Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>MFG Date</span>
            </label>
            <input
              type="date"
              value={formData.mfgDate}
              onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>EXP Date</span>
            </label>
            <input
              type="date"
              value={formData.expDate}
              onChange={(e) => setFormData({ ...formData, expDate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
            />
          </div>
        </div>

        {/* Submitted By & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Submitted By</span>
            </label>
            <input
              type="text"
              value={formData.submittedBy}
              onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Workflow Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as SampleStatus })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white font-medium"
            >
              <option value="RECEIVED">Received</option>
              <option value="LOGGED">Logged</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="TESTING_IN_PROGRESS">Testing In Progress</option>
              <option value="REVIEW_PENDING">Review Pending</option>
              <option value="APPROVED">Approved / Released</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Mandatory 21 CFR Part 11 Reason for Change */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
          <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <span>Reason for Modification <span className="text-rose-600">*</span></span>
          </label>
          <input
            type="text"
            required
            value={formData.reasonForChange}
            onChange={(e) => setFormData({ ...formData, reasonForChange: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 outline-none bg-white"
            placeholder="e.g. Corrected lot number typographical error per QC deviation ticket #402"
          />
          <p className="text-[10px] text-amber-800 mt-1">
            This reason will be immutably recorded in the City Pharma electronic audit trail with your user ID and timestamp.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={updateMutation.isPending}
            className="bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold"
          >
            {updateMutation.isPending ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 text-teal-400" />
                <span>Save Modifications</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
