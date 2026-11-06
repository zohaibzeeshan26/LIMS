'use client';

import React, { useState, useEffect } from 'react';
import { Sample } from '@/types/lims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/date';
import { CityPharmaLogo } from '@/components/ui/CityPharmaLogo';
import { Printer, X, ShieldCheck, QrCode, FileText, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';

interface PrintSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: Sample | null;
}

export function PrintSampleModal({ isOpen, onClose, sample }: PrintSampleModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (sample) {
      const payload = JSON.stringify({
        app: 'LIMS',
        sampleId: sample.sampleCode,
        barcode: sample.barcode || sample.sampleCode,
        nomenclature: sample.nomenclature || sample.materialName,
        lot: sample.lotNumber || 'N/A',
        accessionNo: sample.accessionNo,
      });
      QRCode.toDataURL(payload, { width: 140, margin: 1 })
        .then(setQrUrl)
        .catch((err) => console.error('QR error in print modal:', err));
    }
  }, [sample]);

  if (!sample) return null;

  const handlePrint = () => {
    window.print();
  };

  const labName = 'General Lab';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print-Friendly Sample Intake Record"
      subtitle={`Accession No. ${sample.accessionNo || 'A-0001'} • Sample ID: ${sample.sampleCode}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Print Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 print:hidden">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Printer className="h-4 w-4 text-navy-900" />
            <span>Ready for high-resolution cGMP analytical record printing.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-300"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 text-teal-400" />
              <span>Print Official Dossier</span>
            </Button>
          </div>
        </div>

        {/* Printable Official Document Container */}
        <div
          id="printable-sample-dossier"
          className="bg-white p-6 sm:p-8 border border-slate-200 rounded-xl shadow-xs text-slate-900 print:p-0 print:border-0 print:shadow-none font-sans"
        >
          {/* Header */}
          <div className="border-b-2 border-navy-950 pb-4 mb-5 flex items-start justify-between">
            <CityPharmaLogo
              variant="print"
              size="lg"
            />

            <div className="text-right font-mono text-[11px] text-slate-600">
              <div>Printed: {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Barcode & Key Identifiers Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">
                Official Accession Number
              </span>
              <span className="text-xl font-bold font-mono text-navy-950">
                {sample.accessionNo || 'A-0001'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt="Sample QR Code"
                  className="w-12 h-12 rounded border border-slate-300 p-0.5 bg-white shrink-0 shadow-2xs"
                />
              )}
              <div className="text-center font-mono">
                <div className="text-xs font-bold tracking-widest text-slate-800 bg-white px-3 py-1 rounded border border-slate-300">
                  * {sample.barcode || sample.sampleCode} *
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  {sample.sampleCode}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">
                Laboratory Suite
              </span>
              <span className="text-xs font-bold text-teal-800 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {typeof sample.laboratory === 'string'
                  ? sample.laboratory
                  : (sample.laboratory as any)?.name || (sample.laboratory as any)?.code || sample.laboratoryType || 'GENERAL'} LAB
              </span>
            </div>
          </div>

          {/* Exact 12 Business Fields in Structured Table */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase text-navy-950 tracking-wider mb-2 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-teal-700" />
              <span>Official Business Intake Fields</span>
            </h4>

            <table className="w-full text-left border-collapse text-xs border border-slate-300">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 w-1/4 border-r border-slate-200">
                    A. No. (Accession / Serial No.)
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-navy-950 w-1/4 border-r border-slate-200">
                    {sample.accessionNo || 'A-0001'}
                  </td>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 w-1/4 border-r border-slate-200">
                    Date & Time
                  </td>
                  <td className="py-2 px-3 text-slate-800 w-1/4 font-mono">
                    {formatDateTime(sample.samplingDate, 'dd/MM/yyyy HH:mm')}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Nomenclature
                  </td>
                  <td colSpan={3} className="py-2 px-3 font-bold text-navy-950">
                    {sample.nomenclature || sample.materialName}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Sample ID
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-teal-900 border-r border-slate-200">
                    {sample.sampleCode}
                  </td>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Stage / Type
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800">
                    {sample.stageType || (sample.sampleType ? sample.sampleType.replace(/_/g, ' ') : '—')}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Qty. of Sample
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800 border-r border-slate-200">
                    {sample.sampleQty} {sample.unit}
                  </td>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Batch No. / Lot No.
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-800">
                    {sample.lotNumber || sample.batch?.batchNumber || 'N/A'}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    MFG Date
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800 border-r border-slate-200">
                    {sample.mfgDate
                      ? formatDateTime(sample.mfgDate, 'dd/MM/yyyy')
                      : sample.batch?.manufacturingDate
                      ? formatDateTime(sample.batch.manufacturingDate, 'dd/MM/yyyy')
                      : '—'}
                  </td>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    EXP Date
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800">
                    {sample.expDate
                      ? formatDateTime(sample.expDate, 'dd/MM/yyyy')
                      : sample.batch?.expiryDate
                      ? formatDateTime(sample.batch.expiryDate, 'dd/MM/yyyy')
                      : '—'}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Submitted By
                  </td>
                  <td className="py-2 px-3 text-slate-800 border-r border-slate-200">
                    {sample.submittedBy || 'Plant Production Section'}
                  </td>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Received By
                  </td>
                  <td className="py-2 px-3 text-slate-800">
                    {sample.accessionedBy?.fullName || sample.assignedTo?.fullName || 'QC Accession Officer'}
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Workflow Status
                  </td>
                  <td className="py-2 px-3 font-bold text-navy-900 border-r border-slate-200">
                    {sample.status}
                  </td>
                  <td className="py-2 px-3 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                    Priority / Storage
                  </td>
                  <td className="py-2 px-3 text-slate-800">
                    {sample.priority} • {sample.storageCondition}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compendial Tests Attached */}
          {sample.tests && sample.tests.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase text-navy-950 tracking-wider mb-2 border-b border-slate-200 pb-1">
                Compendial Test Worksheets & Acceptance Criteria ({sample.tests.length})
              </h4>
              <table className="w-full text-left border-collapse text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="py-1.5 px-2.5">Test Code & Name</th>
                    <th className="py-1.5 px-2.5">Pharmacopeial Standard</th>
                    <th className="py-1.5 px-2.5">Specification Limits</th>
                    <th className="py-1.5 px-2.5">Observed Result</th>
                    <th className="py-1.5 px-2.5">Test Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sample.tests.map((test: any) => (
                    <tr key={test.id}>
                      <td className="py-1.5 px-2.5 font-medium">{test.testSpecification?.name || 'Assay'}</td>
                      <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">
                        {test.testSpecification?.pharmacopeiaMethod || 'USP/BP Standard'}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-[11px]">
                        {test.minLimit !== null ? `${test.minLimit} - ${test.maxLimit} ${test.unit || ''}` : 'Conforms'}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono font-bold">
                        {test.numericResult !== null ? `${test.numericResult} ${test.unit || ''}` : test.textResult || 'In Progress'}
                      </td>
                      <td className="py-1.5 px-2.5 font-bold text-[11px]">
                        {test.resultStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Chain of Custody */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase text-navy-950 tracking-wider mb-1.5 border-b border-slate-200 pb-1">
              Chain of Custody Summary
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
              {sample.chainOfCustody || 'Sample logged by QC Receiving Personnel.'}
            </div>
          </div>

          {/* Signatures Block */}
          <div className="border-t-2 border-slate-300 pt-6 mt-8 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 h-10 mb-2" />
              <div className="font-bold text-slate-900">Sample Custodian / Tech</div>
              <div className="text-[10px] text-slate-500 font-mono">Date & Signature</div>
            </div>

            <div>
              <div className="border-b border-slate-400 h-10 mb-2" />
              <div className="font-bold text-slate-900">QC Analyst / Section In-Charge</div>
              <div className="text-[10px] text-slate-500 font-mono">Date & Signature</div>
            </div>

            <div>
              <div className="border-b border-slate-400 h-10 mb-2" />
              <div className="font-bold text-slate-900">QA Manager / Release Authority</div>
              <div className="text-[10px] text-slate-500 font-mono">Date & Signature</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
