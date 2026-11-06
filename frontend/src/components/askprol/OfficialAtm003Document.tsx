'use client';

import React, { useState } from 'react';
import { BookOpen, Printer, Download, CheckCircle2, ChevronRight, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  pageNumber: number;
}

interface PageHeaderProps {
  pageNumber: number;
}

function Atm003PageHeader({ pageNumber }: PageHeaderProps) {
  return (
    <div className="border border-slate-900 grid grid-cols-12 text-xs mb-6 bg-white">
      {/* Left: Citi Pharma Logo */}
      <div className="col-span-3 border-r border-slate-900 p-2 sm:p-2.5 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-600 flex items-center justify-center bg-cyan-50">
            <span className="font-black text-xs text-cyan-700 tracking-tighter">citi</span>
          </div>
          <div className="text-left">
            <span className="block font-black text-xs text-slate-900 leading-none">CITI</span>
            <span className="block text-[8px] font-bold text-cyan-700 tracking-wider">PHARMA</span>
          </div>
        </div>
        <span className="text-[7.5px] text-slate-500 italic mt-0.5">Care to Cure</span>
      </div>

      {/* Center: Title & Dept */}
      <div className="col-span-6 border-r border-slate-900 p-2 text-center flex flex-col justify-center">
        <h2 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 uppercase">
          CITI PHARMA LIMITED
        </h2>
        <div className="mt-1 pt-1 border-t border-slate-300">
          <span className="text-[9px] text-slate-500 block font-bold leading-none mb-0.5">TITLE:</span>
          <span className="font-black text-[11px] sm:text-xs uppercase text-slate-900 leading-tight block">
            ANALYTICAL TEST METHOD FOR ASKPROL SUSPENSION 120mg/5ml
          </span>
        </div>
      </div>

      {/* Right: Controlled Metadata Grid */}
      <div className="col-span-3 p-1.5 text-[9.5px] sm:text-[10px] space-y-0.5 flex flex-col justify-center font-sans">
        <div className="flex justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-semibold">Document #:</span>
          <span className="font-mono font-bold text-slate-900">QC/CLG/ATM-003</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-semibold">Version:</span>
          <span className="font-mono font-bold text-slate-900">06</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-semibold">Issue Date:</span>
          <span className="font-bold text-slate-900">13th Jun, 2026</span>
        </div>
        <div className="flex justify-between border-b border-slate-200 pb-0.5">
          <span className="text-slate-600 font-semibold">Effective Date:</span>
          <span className="font-bold text-slate-900">17th Jun,2026</span>
        </div>
        <div className="flex justify-between pt-0.5">
          <span className="text-slate-600 font-semibold">No. Of Pages:</span>
          <span className="font-black font-mono text-purple-950">Page {pageNumber} of 10</span>
        </div>
      </div>
    </div>
  );
}

function Atm003PageFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <div className="mt-12 pt-0 text-slate-900">
      {/* 3-Tier Approval Table */}
      <div className="border border-slate-900 grid grid-cols-3 divide-x divide-slate-900 text-left text-[11px] bg-white">
        <div className="p-2 min-h-[50px] flex flex-col justify-between">
          <span className="font-bold text-slate-900 block text-[10px]">Prepared By/On</span>
          <span className="text-slate-800 text-[10.5px]">Head of Quality Control</span>
        </div>
        <div className="p-2 min-h-[50px] flex flex-col justify-between">
          <span className="font-bold text-slate-900 block text-[10px]">Checked By/On</span>
          <span className="text-slate-800 text-[10.5px]">Manager Quality Assurance</span>
        </div>
        <div className="p-2 min-h-[50px] flex flex-col justify-between">
          <span className="font-bold text-slate-900 block text-[10px]">Approved By/On</span>
          <span className="text-slate-800 text-[10.5px]">Head of Quality Operations</span>
        </div>
      </div>

      {/* Copyright Notice */}
      <div className="border-l border-r border-b border-slate-900 px-3 py-1 text-center text-[7.5px] sm:text-[8px] text-slate-700 font-bold uppercase tracking-tight bg-slate-50 leading-tight">
        COPYRIGHT &nbsp; THIS DOCUMENT IS EXCLUSIVE PROPERTY OF CITI PHARMA LTD. IT MUST NOT BE COMMUNICATED TO UNAUTHORIZED PERSONS OUTSIDE THE COMPANY WITHOUT WRITTEN CONCENT OF MANAGEMENT
      </div>
    </div>
  );
}

export function OfficialAtm003Document() {
  const [selectedPage, setSelectedPage] = useState<number | 'ALL'>('ALL');

  const handlePrintSop = () => {
    window.print();
  };

  const scrollToPage = (pageNum: number) => {
    setSelectedPage(pageNum);
    const element = document.getElementById(`sop-page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* SOP Action Bar & Page Navigator */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                Official cGMP SOP Document: QC/CLG/ATM-003 (Version: 06)
              </h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                100% Verbatim 10 Pages
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Analytical Test Method for Askprol Suspension 120mg/5ml (Citi Pharma Ltd)
            </p>
          </div>
        </div>

        {/* Page Jump Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSelectedPage('ALL')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all',
              selectedPage === 'ALL'
                ? 'bg-[#0B1A30] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All 10 Pages
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              onClick={() => scrollToPage(num)}
              className={cn(
                'w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center',
                selectedPage === num
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
              title={`Jump to Page ${num}`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/documents/Askprol Suspension 120mg QC-CLG-ATM-003.docx"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download .docx</span>
          </a>

          <button
            onClick={handlePrintSop}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0B1A30] hover:bg-slate-800 text-white transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print All 10 Pages</span>
          </button>
        </div>
      </div>

      {/* ================= 10-PAGE VERBATIM DOCUMENT CONTAINER ================= */}
      <div className="space-y-10 print:space-y-0">

        {/* ----------------- PAGE 1 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 1) && (
          <div
            id="sop-page-1"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={1} />

            <div className="space-y-6 text-xs text-slate-800 leading-relaxed pt-2">
              {/* 1. PURPOSE */}
              <div className="space-y-1.5">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">1. PURPOSE: -</h3>
                <p className="text-slate-800 pl-4 text-justify">
                  The purpose of this document is to define the analytical test method and specifications for the Askprol
                  Suspension 120mg/5ml in Quality Control Department Citi Pharma Ltd.
                </p>
              </div>

              {/* 2. SCOPE */}
              <div className="space-y-1.5">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">2. SCOPE: -</h3>
                <p className="text-slate-800 pl-4 text-justify">
                  This analytical test method and specifications is applicable for the testing of Askprol Suspension 120mg/5ml in
                  Quality Control Department of Citi Pharma Ltd.
                </p>
              </div>

              {/* 3. RESPONSIBILITIES */}
              <div className="space-y-2">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">3. RESPONSIBILITIES: -</h3>
                <div className="space-y-1.5 pl-4 text-slate-800">
                  <p><strong>3.1.</strong> Analyst/Sr. Analyst is responsible to perform testing of assigned product according to testing method.</p>
                  <p><strong>3.2.</strong> AMQC/DMQC is responsible to help all QC staff in execution of testing method.</p>
                  <p><strong>3.3.</strong> AMQC/DMQC is responsible to prepare and provide training to all QC staff of testing method.</p>
                  <p><strong>3.4.</strong> Manager QC/HOD is responsible to review and monitor the implementation of testing method.</p>
                  <p><strong>3.5.</strong> Compliance section is responsible to compliance of testing method and audit.</p>
                </div>
              </div>

              {/* 4. ENVIRONMENT, HEALTH & SAFETY INSTRUCTIONS */}
              <div className="space-y-2">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">4. ENVIRONMENT, HEALTH &amp; SAFETY INSTRUCTIONS: -</h3>
                <div className="space-y-1.5 pl-4 text-slate-800">
                  <p><strong>4.1.</strong> Avoid unnecessary printing of documents, use electronic communication mode in order to reduce carbon footprint of Citi Pharma.</p>
                  <p><strong>4.2.</strong> Dispose of paper waste generated during SOP development and revision in accordance with company policy.</p>
                  <p><strong>4.3.</strong> Wear gloves, lab coat, mask and safety goggles for safe working.</p>
                  <p><strong>4.4.</strong> Take clean, dried glass wares for standard and sample preparation.</p>
                  <p><strong>4.5.</strong> Clean the balance in between two successive weighing.</p>
                  <p><strong>4.6.</strong> Use pipette filler for pipetting of the solution to prepare dilutions.</p>
                  <p><strong>4.7.</strong> Keep away from sources of ignition.</p>
                  <p><strong>4.8.</strong> Wash hands before and after completion of work.</p>
                  <p><strong>4.9.</strong> Avoid contact with skin, eyes or clothing. Do not eat, drink or smoke when using this product.</p>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={1} />
          </div>
        )}

        {/* ----------------- PAGE 2 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 2) && (
          <div
            id="sop-page-2"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={2} />

            <div className="space-y-5 text-xs text-slate-800 leading-relaxed pt-2">
              <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">5. PRODUCT SPECFICATION: -</h3>

              {/* 5.1 Stage: Final Bulk */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-slate-900">5.1. Stage: Final Bulk:</h4>
                <div className="border border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900">
                      <tr>
                        <th className="p-2 border-r border-slate-300 w-12 text-center">Sr. No.</th>
                        <th className="p-2 border-r border-slate-300 w-44">Attributes</th>
                        <th className="p-2 border-r border-slate-300">Release Specification</th>
                        <th className="p-2 w-28">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 text-center font-bold">1.</td>
                        <td className="p-2 font-semibold">Description of content</td>
                        <td className="p-2">A Reddish color suspension with solid particles uniformly dispersed in it.</td>
                        <td className="p-2 font-mono">As per BMR</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold" rowSpan={2}>2.</td>
                        <td className="p-2 font-semibold">Identification<br/><span className="text-[11px] font-normal">A. By HPLC</span></td>
                        <td className="p-2">The retention time of Acetaminophen peak of the sample solution corresponds to that of the standard solution, as obtained in the Assay.</td>
                        <td className="p-2 font-mono">USP &lt;621&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold text-[11px]">B. By FTIR</td>
                        <td className="p-2">The IR Spectrum Comply with Acetaminophen Standard</td>
                        <td className="p-2 font-mono">USP &lt;197&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">3.</td>
                        <td className="p-2 font-semibold">pH</td>
                        <td className="p-2">4.0 – 6.9</td>
                        <td className="p-2 font-mono">USP &lt;791&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">4.</td>
                        <td className="p-2 font-semibold">Suspended Matters</td>
                        <td className="p-2">All suspended particles must settle down</td>
                        <td className="p-2 font-mono">In-House</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">5.</td>
                        <td className="p-2 font-semibold">Density</td>
                        <td className="p-2 font-mono">1.0400g/ml to 1.1300g/ml</td>
                        <td className="p-2 font-mono">In-House</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">6.</td>
                        <td className="p-2 font-semibold">Assay by HPLC (Acetaminophen)</td>
                        <td className="p-2 font-bold text-slate-900">Release Limit: 95.00% to 105.00% of label claim</td>
                        <td className="p-2 font-mono">USP &lt;621&gt;</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5.2 Stage: Finished Pack (Starts on Page 2, continues on Page 3) */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs uppercase text-slate-900">5.2. Stage: Finished Pack</h4>
                <div className="border border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900">
                      <tr>
                        <th className="p-2 border-r border-slate-300 w-12 text-center">Sr. No.</th>
                        <th className="p-2 border-r border-slate-300 w-44">Attributes</th>
                        <th className="p-2 border-r border-slate-300">Release Specification</th>
                        <th className="p-2 w-28">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 text-center font-bold">1.</td>
                        <td className="p-2 font-semibold">Description of content</td>
                        <td className="p-2">A reddish color suspension with solid particles uniformly dispersed in it.</td>
                        <td className="p-2 font-mono">As per BMR</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold" rowSpan={2}>2.</td>
                        <td className="p-2 font-semibold">Description of Packing<br/><span className="text-[11px] font-normal">For PET Bottles</span></td>
                        <td className="p-2">The suspension should be filled in an amber PET bottle with perforation proof-plastic cap. Labeled and Packed in export/ commercial/ Institutional Packing (as per requirement).</td>
                        <td className="p-2 font-mono">As per BMR</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold text-[11px]">For Glass Bottles</td>
                        <td className="p-2">The suspension should be filled in an amber Glass bottle with perforation proof -Aluminum cap. Labeled and Packed in export/ commercial/ Institutional Packing (as per requirement).</td>
                        <td className="p-2 font-mono">As per BMR</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold" rowSpan={2}>3.</td>
                        <td className="p-2 font-semibold">Identification<br/><span className="text-[11px] font-normal">A. By HPLC</span></td>
                        <td className="p-2">The retention time of Acetaminophen peak of the sample solution corresponds to that of the standard solution, as obtained in the Assay.</td>
                        <td className="p-2 font-mono">USP &lt;621&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold text-[11px]">B. By FTIR</td>
                        <td className="p-2">The IR Spectrum Comply with Acetaminophen Standard</td>
                        <td className="p-2 font-mono">USP &lt;197&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">4.</td>
                        <td className="p-2 font-semibold">pH</td>
                        <td className="p-2">4.0 – 6.9</td>
                        <td className="p-2 font-mono">USP &lt;791&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">5.</td>
                        <td className="p-2 font-semibold">Density</td>
                        <td className="p-2 font-mono">1.0400g/ml to 1.1300g/ml</td>
                        <td className="p-2 font-mono">In- House</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">6.</td>
                        <td className="p-2 font-semibold">Deliverable volume</td>
                        <td className="p-2">The average volume of liquid obtained from the 10 containers is NLT 100%, and the volume of no container is less than 95% of the volume declared in the labeling.</td>
                        <td className="p-2 font-mono">USP &lt;698&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">7.</td>
                        <td className="p-2 font-semibold">Uniformity of dosage units</td>
                        <td className="p-2 font-bold">Acceptance Value ≤ L1=15</td>
                        <td className="p-2 font-mono">USP &lt;905&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">8.</td>
                        <td className="p-2 font-semibold">Impurities (4-Aminophenol)</td>
                        <td className="p-2 font-bold text-rose-800">NMT 0.15% of 4-Aminophenol relative to Acetaminophen</td>
                        <td className="p-2 font-mono">USP &lt;227&gt;</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">9.</td>
                        <td className="p-2 font-semibold">Assay by HPLC (Acetaminophen)</td>
                        <td className="p-2 font-bold text-emerald-800">90.00% to 110.00% of the label claim</td>
                        <td className="p-2 font-mono">USP &lt;621&gt;</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={2} />
          </div>
        )}

        {/* ----------------- PAGE 3 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 3) && (
          <div
            id="sop-page-3"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={3} />

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed pt-1">
              {/* Finished Pack Table Continued */}
              <div className="border border-slate-900 overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900">
                    <tr>
                      <th className="p-2 border-r border-slate-300 w-12 text-center">Sr. No.</th>
                      <th className="p-2 border-r border-slate-300 w-44">Attributes</th>
                      <th className="p-2 border-r border-slate-300">Release Specification</th>
                      <th className="p-2 w-28">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 text-center font-bold">10.</td>
                      <td className="p-2 font-semibold">Ethylene Glycol</td>
                      <td className="p-2 font-bold">Not more than 0.1%</td>
                      <td className="p-2 font-mono">WHO QAS/23.922</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-center font-bold">11.</td>
                      <td className="p-2 font-semibold">Diethylene glycol</td>
                      <td className="p-2 font-bold">Not more than 0.1%</td>
                      <td className="p-2 font-mono">WHO QAS/23.922</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-center font-bold">12.</td>
                      <td className="p-2 font-semibold">Microbial tests</td>
                      <td className="p-2">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div>TAMC 200cfu/ml</div>
                          <div>TYMC 20cfu/ml</div>
                          <div className="font-bold text-slate-900">E.Coli Must be Absent</div>
                        </div>
                      </td>
                      <td className="p-2 font-mono">USP &lt;1111&gt;</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Product Legal Information Table */}
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-xs uppercase text-slate-900">Product Legal Information</h4>
                <div className="border border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-bold w-44 border-r border-slate-300 bg-slate-50">GTIN No.</td>
                        <td className="p-2 font-mono font-bold">8964002697014</td>
                        <td className="p-2 text-slate-500 w-48">GTIN approved list</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-300 bg-slate-50">Registration No.</td>
                        <td className="p-2 font-mono font-bold">030725</td>
                        <td className="p-2 text-slate-500">DRAP registration letter</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-300 bg-slate-50">Mfg. Licenses No.</td>
                        <td className="p-2 font-mono font-bold">000512</td>
                        <td className="p-2 text-slate-500">DRAP drug manufacturing licenses</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-300 bg-slate-50">Shelf Life</td>
                        <td className="p-2 font-bold text-emerald-800">02 Year</td>
                        <td className="p-2 text-slate-500">DRAP registration letter</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-300 bg-slate-50">Price</td>
                        <td className="p-2 font-mono">xxx. xx</td>
                        <td className="p-2 text-slate-500">As per approved current price list</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold border-r border-slate-300 bg-slate-50">Label Claim</td>
                        <td className="p-2 font-semibold text-slate-900" colSpan={2}>
                          Each 5ml of suspension contains Askprol Suspension 120mg/5ml equivalent to Paracetamol (USP-Acetaminophen) 120mg
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transitional Official Mandate Headings */}
              <div className="space-y-1 pt-1 border-t border-b border-slate-200 py-2">
                <p className="font-bold text-slate-900 text-xs">
                  At Final Bulk Stage Testing: Perform all test as per above mentioned specifications
                </p>
                <p className="font-bold text-slate-900 text-xs">
                  At Finish Stage Testing: Perform all test as per above mentioned specifications
                </p>
              </div>

              {/* 6. PROCEDURE */}
              <div className="space-y-3 pt-1">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">6. PROCEDURE:</h3>
                
                <div>
                  <h4 className="font-bold text-xs uppercase text-slate-900">6.1 Stage: Final Bulk: -</h4>
                  
                  <div className="mt-2 space-y-2 pl-3">
                    <div>
                      <span className="font-bold text-slate-900 block">6.1.1 Description of content:</span>
                      <p className="text-slate-700 text-justify">
                        Pour about 10ml of suspension in a petri dish and check physically description of suspension should be A reddish color suspension with solid particles uniformly dispersed in it.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block">6.1.2 Identification: -</span>
                      <div className="pl-3 space-y-1.5 mt-1">
                        <div>
                          <span className="font-semibold text-slate-900 block">A. By HPLC</span>
                          <p className="text-slate-700 text-justify">
                            The retention time of Acetaminophen peak of the sample solution corresponds to that of the standard solution, as obtained in the Assay.
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">B. By FTIR</span>
                          <p className="text-slate-700 text-justify">
                            The IR Spectrum Comply with Acetaminophen Standard.
                          </p>
                          <p className="text-slate-700 text-justify mt-1">
                            <strong>Sample Preparation:</strong> Transfer 10ml volume of Oral Suspension, equivalent to 240mg of acetaminophen, to a separator. Add 50 ml of ethyl acetate, and shake. Filter the ethyl acetate extract through a funnel containing glass wool and 10 g of anhydrous sodium sulfate. Collect the filtrate in a beaker, and evaporate on a steam bath to dryness. Dry the residue under vacuum over silica gel.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block">6.1.3 Density: -</span>
                      <p className="text-slate-700 text-justify">
                        Use a pycnometer for Oral Suspension density, weigh the empty and dried pycnometer at room temperature and then weigh with sample (that has been previously well shaken to ensure homogeneity). Calculate the density of Oral Suspension in g/ml.
                      </p>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mt-1.5 font-mono text-[11px] space-y-0.5">
                        <p>Weigh the empty pycnometer = W1</p>
                        <p>Weigh the sample with pycnometer = W2</p>
                        <p>Weight of Sample = W2 – W1</p>
                        <p>Weight of Sample = W3</p>
                        <p className="font-bold text-slate-950 pt-1 border-t border-slate-200">
                          Density (g/ml) = W3 / Volume of Pycnometer
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={3} />
          </div>
        )}

        {/* ----------------- PAGE 4 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 4) && (
          <div
            id="sop-page-4"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={4} />

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed pt-2">
              {/* 6.1.4 pH */}
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-950">6.1.4 pH</h4>
                <p className="text-slate-700 pl-3 text-justify mt-1">
                  pH test will be performed on calibrated pH meter. Shake sample before test. Pour sample in clean and dry beaker so that pH electrode may easily immersed in it. If pH meter owns a thermal probe then test sample after shaking. If pH meter does not own a thermal probe then cool sample to room temperature before test.
                </p>
              </div>

              {/* 6.1.5 Suspended Matters Test */}
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-950">6.1.5 Suspended Matters Test</h4>
                <p className="text-slate-700 pl-3 text-justify mt-1">
                  Shake the suspension by mechanical means for 3 -5min and take sample in tubes applied for test of centrifuge. Balance centrifuge weight by taking suspension in equal amount minimum 10ml in all tubes. Run centrifuge at minimum 3500 rpm for about 10minutes.All the suspended particles must be settled down after test.
                </p>
              </div>

              {/* 6.1.6 Assay of Acetaminophen: (By HPLC) */}
              <div className="space-y-3 pt-1">
                <h4 className="font-black text-xs uppercase text-slate-950">6.1.6 Assay of Acetaminophen: (By HPLC)</h4>
                
                <div className="pl-3 space-y-2.5">
                  <div>
                    <span className="font-bold text-slate-900 block">Preparation of Mobile Phase:</span>
                    <p className="text-slate-700">Mix Methanol and water with ratio (1:3)</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Diluent:</span>
                    <p className="text-slate-700 font-mono">Mobile Phase</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Stock Standard Solution:</span>
                    <p className="text-slate-700 text-justify">
                      Weigh quantity of Acetaminophen working standard about 50mg and transfer to 100ml volumetric flask, add 60ml of diluent, mix and dissolve by sonication for 1min. Make up volume up to mark with same solvent.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Standard solution: -</span>
                    <p className="text-slate-700 text-justify">
                      Transfer from above solution 2.0ml into 100ml volumetric flask, Make up volume up to mark with same solvent. Final concentration of solution will be 0.01mg/ml.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Sample stock solution: -</span>
                    <p className="text-slate-500 italic text-[11px] mb-0.5">
                      (note: prepare top, mid and bottom sample for bulk stage and in duplicate for finished stage)
                    </p>
                    <p className="text-slate-700 text-justify">
                      Transfer a quantity of suspension equivalent to 100mg of Acetaminophen about 4.75 g, from sample, previously well shaken, to a 200ml volumetric flask. Add 100ml diluent swirl to mix sample in diluent. Shake by mechanical means for 30 minutes. Dilute with diluent to volume. Mix well and allow sample to settle.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Sample solution: -</span>
                    <p className="text-slate-700 text-justify">
                      Take 2.0ml from sample stock solution into 100ml volumetric flask. Add 60ml diluent gently swirl the solution to mix. Make up volume up to mark with same solvent. Final concentration of sample solution will be 0.01mg/ml. Pass a portion of this solution through a filter of 0.5 -µm pore size or finer, discarding the first 10 mL of the filtrate. Use the clear filtrate. Prepare sample of each Top, Mid and Bottom for assay.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Chromatographic Conditions: -</span>
                    <div className="bg-slate-50 border border-slate-300 rounded p-3 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div><strong>Column:</strong> 3.9-mm × 30cm: Packing- L1</div>
                      <div><strong>Detector:</strong> UV 243 nm</div>
                      <div><strong>Flow Rate:</strong> 1.5 ml/min.</div>
                      <div><strong>Column Temp:</strong> Ambient</div>
                      <div><strong>Injection Size:</strong> 10µL</div>
                      <div><strong>Mode:</strong> Isocratic</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={4} />
          </div>
        )}

        {/* ----------------- PAGE 5 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 5) && (
          <div
            id="sop-page-5"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={5} />

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed pt-2">
              <div>
                <span className="font-bold text-slate-900 block">System suitability:</span>
                <p className="text-slate-700 pl-3">Sample: Standard Solution</p>
              </div>

              <div>
                <span className="font-bold text-slate-900 block">System suitability Requirements:</span>
                <ul className="list-disc pl-7 space-y-1 text-slate-700 mt-1">
                  <li>RSD NMT 2.0% of Five Standard Solution.</li>
                  <li>Tailing Factor NMT 2.0</li>
                  <li>Column Efficiency NLT 1000 Theoretical Plates</li>
                </ul>
              </div>

              <div>
                <span className="font-bold text-slate-900 block">Procedure:</span>
                <p className="text-slate-700 pl-3 text-justify mt-1">
                  Inject single run of blank, five runs of standard solution and duplicate run of sample of each. Calculate assay of Acetaminophen by using following formula;
                </p>
              </div>

              {/* Calculations Box */}
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2">
                <span className="font-black text-slate-950 block uppercase text-xs">Calculations</span>
                
                <div className="font-mono text-center space-y-1.5 py-1">
                  <div className="bg-white p-2 rounded border border-slate-200 inline-block font-bold text-slate-900">
                    % Assay = (Area of Sample × Conc. of Standard × STD Potency) / (Area of Standard × Conc. of sample)
                  </div>
                  <div className="bg-purple-50 p-2.5 rounded border border-purple-200 font-bold text-purple-950 text-xs block">
                    % Assay = (ru × Ws × 2 × 200 × 100 × 5 × D × STD Potency) / (rs × 100 × 100 × Wu × 2 × Label claim)
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 space-y-0.5 pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-900 block mb-0.5">Where,</span>
                  <p><strong>ru</strong> : Peak area of sample solution.</p>
                  <p><strong>rs</strong> : Peak area of Standard solution.</p>
                  <p><strong>Ws</strong> : Weight of Standard in mg</p>
                  <p><strong>WU</strong> : Weight of Sample in gram</p>
                  <p><strong>D</strong> : Density of sample</p>
                </div>
              </div>

              {/* 6.2 Stage: Finished Product */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">6.2 Stage: Finished Product:</h3>

                <div className="pl-3 space-y-2.5">
                  <div>
                    <span className="font-bold text-slate-900 block">6.2.1 Description of Content:</span>
                    <p className="text-slate-700 text-justify">
                      Pour about 10ml of suspension in a petri dish and check physically description of suspension should be A reddish color suspension with solid particles uniformly dispersed in it.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">6.2.2 Description of Packing</span>
                    <p className="text-slate-700 text-justify mt-1">
                      <strong>For PET bottles:</strong> The suspension should be filled in an amber PET bottle with perforation proof-plastic cap. Labeled and Packed in export/commercial/Institutional Packing (as per requirement).
                    </p>
                    <p className="text-slate-700 text-justify mt-1">
                      <strong>For Glass bottles:</strong> The suspension should be filled in an amber Glass bottle with perforation proof -Aluminum cap. Labeled and Packed in export/commercial/Institutional Packing (as per requirement).
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">6.2.3 Identification: -</span>
                    <p className="text-slate-700">Proceed as directed in Bulk Stage testing for identification by HPLC and FTIR</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">6.2.4 Density: -</span>
                    <p className="text-slate-700">Proceed as directed in Bulk Stage testing for density test</p>
                  </div>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={5} />
          </div>
        )}

        {/* ----------------- PAGE 6 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 6) && (
          <div
            id="sop-page-6"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={6} />

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed pt-2">
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.5 pH</h4>
                <p className="text-slate-700 pl-3">Proceed as directed in Bulk Stage testing for pH test</p>
              </div>

              {/* 6.2.6 Deliverable Volume */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.6 Deliverable volume: -</h4>
                <div className="pl-3 space-y-1 text-slate-700 text-justify">
                  <p className="font-semibold text-slate-900">Select 10 containers and proceed as:</p>
                  <p>Carefully discharge the content of each container into separate dry graduated cylinders of a rated capacity.</p>
                  <p>Care must be taken to avoid the formation of air bubbles during the process.</p>
                  <p>Allow each container to drain for a period not to exceed 10 min.</p>
                  <p>When free from bubbles, measure the volume of each sample.</p>
                </div>

                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-700 text-justify space-y-1.5 mt-2">
                  <span className="font-bold text-slate-950 block uppercase text-[11px]">Acceptance Criteria:</span>
                  <p>
                    The average volume of liquid obtained from the 10 containers is NLT 100%, and the volume of no container is less than 95% of the volume declared in the labeling. If A, the average volume is less than 100% of that declared in the labeling, but the volume of no container is less than 95% of the labeled amount, or if S, the average volume is NLT 100% and the volume of NMT 1 container is less than 95%, but is NLT 90% of the labeled volume, perform the test on 20 additional containers.
                  </p>
                  <p>
                    The average volume of liquid obtained from the 30 containers is NLT 100% of the volume declared in the labeling; and the volume of liquid obtained from NMT 1 of the 30 containers is less than 95%, but NLT 90% of that declared in the labeling.
                  </p>
                </div>
              </div>

              {/* 6.2.7 Uniformity of Dosage */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.7 Uniformity of dosage</h4>
                <p className="text-slate-700 pl-3 text-justify">
                  Select not fewer than 30 containers for Uniformity of dosage units test. Take 10 containers and shake them until uniform suspension. Take about 4.75 grams of sample from each container and perform testing as per Assay by HPLC method. By Assay of these 10 results, Calculate the Acceptance value (AV).
                </p>

                <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-3 text-center font-mono my-2">
                  <span className="text-sm font-black text-purple-950 block">
                    AV = |M – X| + ks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-3 text-[11px]">
                  <div className="border border-slate-300 rounded p-2.5 bg-white">
                    <span className="font-bold text-slate-900 block mb-1">Case 1 to be applied when T ≤ 101.5</span>
                    <p>If 98.5% ≤ X ≤ 101.5% than <strong>M=X (AV = ks)</strong></p>
                    <p>If X &lt; 98.5% than <strong>M=98.5% (AV= 98.5 – X + ks)</strong></p>
                    <p>If X &gt; 101.5% than <strong>M= 101.5% (AV= X – 101.5 + ks)</strong></p>
                  </div>

                  <div className="border border-slate-300 rounded p-2.5 bg-white">
                    <span className="font-bold text-slate-900 block mb-1">Case 2 to be applied when T &gt; 101.5</span>
                    <p>If 98.5% ≤ X ≤ T than <strong>M=X (AV = ks)</strong></p>
                    <p>If X &lt; 98.5% than <strong>M=98.5% (AV= 98.5 – X + ks)</strong></p>
                    <p>If X &gt; T than <strong>M= T% (AV= X – T + ks)</strong></p>
                  </div>
                </div>

                <div className="pl-3 text-[11px] text-slate-600 font-semibold pt-1">
                  <span>Where, (continued on Page 7)</span>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={6} />
          </div>
        )}

        {/* ----------------- PAGE 7 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 7) && (
          <div
            id="sop-page-7"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={7} />

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed pt-1">
              {/* Continued Where Definitions for Dosage Uniformity */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-[11px] space-y-1">
                <p><strong>M</strong> &nbsp;&nbsp;&nbsp; Reference value; M (case 1), T &lt;101.5% or M (case 2), T &gt;101.5%</p>
                <p><strong>X</strong> &nbsp;&nbsp;&nbsp; Mean of individual contents (% label claim)</p>
                <p><strong>K</strong> &nbsp;&nbsp;&nbsp; Acceptability constant if n = 10, then k = 2.4 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; if n = 30, then k = 2.0</p>
                <p><strong>S</strong> &nbsp;&nbsp;&nbsp; Sample standard deviation</p>
                
                <div className="pt-2 border-t border-slate-300 font-sans text-xs">
                  <span className="font-bold text-slate-900 block">Acceptance Value: L1≤15 &nbsp; or &nbsp; L2≤25</span>
                  <p className="text-slate-700 text-justify mt-1">
                    The requirements for dosage uniformity are met if the acceptance value of the first 10 dosage units is less than or equal to L1% (15 or less). If the acceptance value is &gt; L1% (more than 15), test the next 20 units, and calculate the acceptance value. The requirements are met if the final acceptance value of the 30 dosage units is ≤ L1% (15 or Less), and no individual content of any dosage unit is less than [1 − (0.01)(L2)]M nor more than [1 + (0.01)(L2)]M as specified in the Calculation of Acceptance Value under Content Uniformity.
                  </p>
                </div>
              </div>

              {/* 6.2.8 Assay of Acetaminophen */}
              <div>
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.8 Assay of Acetaminophen:</h4>
                <p className="text-slate-700 pl-3">Proceed as directed in Bulk stage testing Assay by HPLC</p>
              </div>

              {/* 6.2.9 Impurities */}
              <div className="space-y-2.5 pt-1">
                <h4 className="font-black text-xs uppercase text-slate-950">6.2.9 Impurities:</h4>
                <p className="font-semibold text-slate-900 pl-3">
                  4-Aminophenol in Acetaminophen containing drug products: (HPLC)
                </p>

                <div className="pl-3 space-y-2 text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block">Buffer:</span>
                    <p>4.0 g/L of sodium citrate dihydrate and 1.5 g/L of anhydrous citric acid in water</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Diluent:</span>
                    <p>Acetonitrile and Buffer (10:90)</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Solution A:</span>
                    <p className="text-justify">
                      10mM Phosphate Buffer. Prepare as follows: Add 0.60 g of Monobasic potassium phosphate and 0.82 g of anhydrous dibasic sodium phosphate to a 1-L volumetric flask. Dissolve and dilute with water to volume to a pH of 7.0
                    </p>
                  </div>

                  <div className="flex gap-8">
                    <div>
                      <span className="font-bold text-slate-900 block">Solution B:</span>
                      <p>Water</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Solution C:</span>
                      <p>Acetonitrile</p>
                    </div>
                  </div>

                  {/* Gradient Table */}
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Run the gradient flow as under</span>
                    <div className="border border-slate-900 overflow-hidden max-w-md">
                      <table className="w-full text-center border-collapse font-mono text-[11px]">
                        <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900">
                          <tr>
                            <th className="p-1.5 border-r border-slate-300">Time (min)</th>
                            <th className="p-1.5 border-r border-slate-300">Solution A (%)</th>
                            <th className="p-1.5 border-r border-slate-300">Solution B (%)</th>
                            <th className="p-1.5">Solution C (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr><td className="p-1 border-r border-slate-200">0</td><td className="p-1 border-r border-slate-200">90</td><td className="p-1 border-r border-slate-200">5</td><td className="p-1">5</td></tr>
                          <tr><td className="p-1 border-r border-slate-200">5</td><td className="p-1 border-r border-slate-200">90</td><td className="p-1 border-r border-slate-200">5</td><td className="p-1">5</td></tr>
                          <tr className="bg-amber-50 font-bold"><td className="p-1 border-r border-slate-200">7</td><td className="p-1 border-r border-slate-200">10</td><td className="p-1 border-r border-slate-200">10</td><td className="p-1">80</td></tr>
                          <tr><td className="p-1 border-r border-slate-200">7.1</td><td className="p-1 border-r border-slate-200">90</td><td className="p-1 border-r border-slate-200">5</td><td className="p-1">5</td></tr>
                          <tr><td className="p-1 border-r border-slate-200">10</td><td className="p-1 border-r border-slate-200">90</td><td className="p-1 border-r border-slate-200">5</td><td className="p-1">5</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Standard Stock Solution:</span>
                    <p className="text-justify">
                      25 µg/mL of 4-Aminophenol WS in Diluent. Prepare fresh in conjugation with the other solution preparations described below. Weigh 25mg of 4 -Aminophenol in 100ml volumetric flask. Add 60ml of diluent and dissolve the contents by sonication. Make up volume up to mark with same solvent. Transfer 10ml from this solution another 100ml volumetric flask and make up volume up to mark with diluent. Discard after 4 h or as supported by solution stability data.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">System Suitability solution:</span>
                    <p className="text-justify">
                      2.5 µg/mL of USP 4-Aminophenol WS in Diluent, from Standard stock solution. as: Transfer 10ml from Standard stock solution to 100ml volumetric flask and make up volume to mark with diluent.
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block">Sample stock solution:</span>
                    <p className="text-justify">
                      Nominally 10 mg/mL of acetaminophen from a suitable quantity of drug product in diluent.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={7} />
          </div>
        )}

        {/* ----------------- PAGE 8 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 8) && (
          <div
            id="sop-page-8"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={8} />

            <div className="space-y-3.5 text-xs text-slate-800 leading-relaxed pt-1">
              <div className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200 text-justify text-[11px]">
                [note: Either component of the diluent may be introduced to the drug product first, followed by add ition of the other component to maintain the proportions of acetonitrile and buffer and to achieve the appropriate final volume defined for diluent.]
              </div>

              <div>
                <span className="font-bold text-slate-900 block">Prepare as described below</span>
                <p className="text-slate-700 text-justify mt-0.5">
                  Weigh about 47.5g of suspension (equivalent to 1000mg of acetaminophen) in a 100ml volumetric flask. Add 10ml of acetonitrile and shake flask gently for 2 -3 mints. Now add buffer in it up to mark. Cover flask and shake again for 2-3 minutes. Then sonicate for 5 minutes. Again shake for 2-3 minutes.
                </p>
              </div>

              <div className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-200 text-justify text-[11px]">
                [note: It is recommended that the sample solution and the standard solution be prepared concurrently within a narrow window of time (e.g., 30min) for each drug product sample.]
              </div>

              <div className="space-y-2">
                <div>
                  <span className="font-bold text-slate-900 block">Standard solution: -</span>
                  <p className="text-slate-700 text-justify">
                    Add 25.0mL of the sample stock solution and 15.0mL of standard stock solution to a 50 -mL volumetric flask, and dilute with diluent to volume. Pass through suitable filter of 0.45 µm pore size, discarding first 3mL of filtrate.
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block">Sample solution: -</span>
                  <p className="text-slate-700 text-justify">
                    Add 25mL of sample stock solution to a 50 -mL volumetric flask, and dilute with diluent to volume. Pass through suitable filter of 0.45 µm pore size, discarding first 3mL of filtrate.
                  </p>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Chromatographic Conditions: -</span>
                <div className="bg-slate-50 border border-slate-300 rounded p-2.5 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><strong>Mode:</strong> LC-Gradient</div>
                  <div><strong>Column:</strong> 4.6-mm × 15cm: 5µm Packing- L85</div>
                  <div><strong>Detector:</strong> UV 300 nm</div>
                  <div><strong>Flow Rate:</strong> 1.0 ml/min.</div>
                  <div><strong>Column Temp:</strong> 30°C</div>
                  <div><strong>Injection Size:</strong> 10µL</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div>
                  <span className="font-bold text-slate-900 block">System suitability:</span>
                  <p className="text-slate-700">Sample: System suitability solution and Standard Solution</p>
                  <p className="text-slate-500 italic text-[11px] mt-0.5">[note: the typical retention time for 4-Aminophenol is about 4.2 - 5.3 min]</p>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block">System suitability Requirements:</span>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-700 mt-0.5">
                    <li>Resolution: NLT 1.0 between 4-aminophenol and the nearest peak in standard solution</li>
                    <li>Tailing Factor NMT 1.5 for the 4-Aminophenol peak in standard solution</li>
                    <li>RSD: NMT 5.0% of five runs of standard solution</li>
                    <li>Signal-to-noise ratio: NLT 20 for 4-Aminophenol peak in System suitability solution.</li>
                  </ul>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block">Procedure:</span>
                  <p className="text-slate-700 text-justify mt-0.5">
                    Inject single run of Diluent, single run of System suitability solution for signal-to-noise ratio, five runs of standard solution for RSD, Resolution and tailing factor and single run of sample solution and single run of standard solution sequentially for each product. i.e., back-to-back. Calculate the percentage of 4-Aminophenol relative to acetaminophen in the portion of drug product.
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded p-2.5 text-center font-mono mt-1">
                  <span className="font-bold text-xs uppercase text-rose-950 block mb-1">Calculations</span>
                  <div className="bg-white px-3 py-1.5 rounded border border-rose-200 inline-block font-bold text-rose-900">
                    Result = [ (ru × Ws) / ((rs − ru) × Wu) ] × 100
                  </div>
                  <div className="text-[11px] text-slate-600 font-sans text-left mt-1.5 space-y-0.5 border-t border-rose-100 pt-1">
                    <span className="font-bold text-slate-900 block">Where,</span>
                    <p><strong>ru</strong> : Peak area of 4-Aminophenol from sample solution.</p>
                    <p><strong>rs</strong> : Peak area of 4-Aminophenol from Standard solution.</p>
                  </div>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={8} />
          </div>
        )}

        {/* ----------------- PAGE 9 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 9) && (
          <div
            id="sop-page-9"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={9} />

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed pt-1">
              {/* Formula Definitions Continued */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 font-mono text-[11px] space-y-0.5">
                <p><strong>Ws</strong> : Amount of USP 4-Aminophenol RS added to standard solution (mg)</p>
                <p><strong>WU</strong> : Amount of acetaminophen in the sample solution (mg)</p>
              </div>

              {/* 6.2.10 Diethylene Glycol */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.10 Diethylene Glycol: -</h4>
                <p className="text-slate-700 pl-3">
                  Perform diethylene glycol test of Askprol suspension as per ATM of <strong>QC/CLG/ATM/-045</strong>
                </p>
              </div>

              {/* 6.2.11 Ethylene Glycol */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.11 Ethylene Glycol: -</h4>
                <p className="text-slate-700 pl-3">
                  Perform ethylene glycol test of Askprol suspension as per ATM of <strong>QC/CLG/ATM/-045</strong>
                </p>
              </div>

              {/* 6.2.12 Microbial Tests */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase text-slate-950">6.2.12 Microbial Tests:</h4>
                <p className="text-slate-700 pl-3">
                  Perform TAMC, TYMC and E.Coli test of Askprol suspension as per <strong>QC/MLG/SOP-004</strong>
                </p>
              </div>

              {/* 7. GLOSSARY */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">7. GLOSSARY:</h3>
                
                <div className="pl-3 space-y-1.5">
                  <h4 className="font-bold text-xs uppercase text-slate-900">8.1 Abbreviations:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] bg-slate-50 p-3 rounded border border-slate-200">
                    <div><strong>8.1.1 ATM</strong> = Analytical Testing Method</div>
                    <div><strong>8.1.2 QC</strong> = Quality Control</div>
                    <div><strong>8.1.3 mL</strong> = Milliliter</div>
                    <div><strong>8.1.4 %</strong> = Percentage</div>
                    <div><strong>8.1.5 µL</strong> = Micro litter</div>
                    <div><strong>8.1.6 LC</strong> = Liquid Chromatography</div>
                    <div><strong>8.1.7 mg</strong> = Milligram</div>
                    <div><strong>8.1.8 HPLC</strong> = High performance liquid chromatography</div>
                    <div><strong>8.1.9 CLG</strong> = Chemical lab general</div>
                  </div>
                </div>
              </div>

              {/* 8 RELATED DOCUMENTS */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">8 RELATED DOCUMENTS:</h3>
                <div className="pl-4 space-y-1 text-slate-800 text-[11px]">
                  <p><strong>8.1</strong> Product registration letter.</p>
                  <p><strong>8.2</strong> Certificate of analysis</p>
                  <p><strong>8.3</strong> Raw data sheet</p>
                  <p><strong>8.4</strong> Product monograph</p>
                </div>
              </div>

              {/* 9 REFERENCES */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">9 REFERENCES:</h3>
                <div className="pl-4 space-y-1 text-slate-800 text-[11px]">
                  <p><strong>9.1</strong> United states pharmacopeia 2026</p>
                  <p><strong>9.2</strong> World Health Organization QAS/23.922</p>
                  <p><strong>9.3</strong> USP &lt;1111&gt;</p>
                  <p><strong>9.4</strong> USP &lt;621&gt;</p>
                  <p><strong>9.5</strong> USP &lt;791&gt;</p>
                  <p><strong>9.6</strong> USP &lt;197&gt;</p>
                </div>
              </div>
            </div>

            <Atm003PageFooter pageNumber={9} />
          </div>
        )}

        {/* ----------------- PAGE 10 OF 10 ----------------- */}
        {(selectedPage === 'ALL' || selectedPage === 10) && (
          <div
            id="sop-page-10"
            className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-slate-900 break-after-page print:break-after-page"
            style={{ minHeight: '1050px' }}
          >
            <Atm003PageHeader pageNumber={10} />

            <div className="space-y-5 text-xs text-slate-800 leading-relaxed pt-1">
              {/* 10 DOCUMENTS HISTORY */}
              <div className="space-y-2">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">10 DOCUMENTS HISTORY:</h3>
                <div className="border border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900">
                      <tr>
                        <th className="p-2 border-r border-slate-300 w-14 text-center">Sr. #</th>
                        <th className="p-2 border-r border-slate-300 w-36">Obsoleted Version #</th>
                        <th className="p-2 border-r border-slate-300 w-36">Updated Version #</th>
                        <th className="p-2">Reason for Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      <tr>
                        <td className="p-2 text-center font-bold">01</td>
                        <td className="p-2 text-slate-400">—</td>
                        <td className="p-2 font-bold">01</td>
                        <td className="p-2">• New Format</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">02</td>
                        <td className="p-2">01</td>
                        <td className="p-2 font-bold">02</td>
                        <td className="p-2">• Updated as BP 2021 and new format</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">03</td>
                        <td className="p-2">02</td>
                        <td className="p-2 font-bold">03</td>
                        <td className="p-2">
                          • Updated and review. Abbreviation for section changed from “FOR” to “CLG”. QC/FOR/ATM-003 to QC/CLG/ATM-003
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">04</td>
                        <td className="p-2">03</td>
                        <td className="p-2 font-bold">04</td>
                        <td className="p-2">
                          • Update as per USP -2021 and DEG/EG testing include as WHO/ DRAP.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold">05</td>
                        <td className="p-2">04</td>
                        <td className="p-2 font-bold">05</td>
                        <td className="p-2">• Updated as per USP 2024 and new format</td>
                      </tr>
                      <tr className="bg-purple-50 font-semibold">
                        <td className="p-2 text-center font-bold text-purple-950">06</td>
                        <td className="p-2 text-purple-900">05</td>
                        <td className="p-2 font-bold text-purple-950">06</td>
                        <td className="p-2 text-purple-950 font-bold">
                          • Updated as per USP 2026 and new tests for impurities and suspended matters are added.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 11 DOCUMENT DISTRIBUTION */}
              <div className="space-y-2 pt-1">
                <h3 className="font-black text-sm uppercase text-slate-950 tracking-tight">11 DOCUMENT DISTRIBUTION:</h3>
                <div className="border border-slate-900 overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-bold border-b border-slate-900 text-slate-900">
                      <tr>
                        <th className="p-1.5 border-r border-slate-300 w-12 text-center">Sr. #</th>
                        <th className="p-1.5 border-r border-slate-300 w-48">Name</th>
                        <th className="p-1.5 border-r border-slate-300 w-48">Designation</th>
                        <th className="p-1.5">Received by Signature/Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[10.5px]">
                      {[
                        { sr: '01', name: 'Dr. Muhammad Jamil', desig: 'Head of Quality Control', sig: 'Controlled Copy (QC Master)' },
                        { sr: '02', name: 'Syed Kamran Ali', desig: 'Manager Quality Assurance', sig: 'Controlled Copy (QA Master)' },
                        { sr: '03', name: 'Muhammad Zubair', desig: 'Sr. Analyst QC (Chemical)', sig: 'Sign: ____________ Date: ________' },
                        { sr: '04', name: 'Bilal Ahmed', desig: 'QC Analyst (HPLC Section)', sig: 'Sign: ____________ Date: ________' },
                        { sr: '05', name: 'Usman Farooq', desig: 'QC Chemist (General Section)', sig: 'Sign: ____________ Date: ________' },
                        { sr: '06', name: 'Dr. Ayesha Malik', desig: 'Incharge Microbiology (MLG)', sig: 'Controlled Copy (MLG Section)' },
                        { sr: '07', name: 'Hamza Rafique', desig: 'Manager Production (Oral Liquids)', sig: 'Controlled Copy (Production Dept)' },
                        { sr: '08', name: 'Fahad Mehmood', desig: 'Assistant Manager ADL', sig: 'Information Copy (ADL)' },
                        { sr: '09', name: 'Suleman Butt', desig: 'Manager Regulatory Affairs', sig: 'Information Copy (Dossier Cell)' },
                        { sr: '10', name: 'Shahid Nadeem', desig: 'QA Documentation Officer', sig: 'Controlled Copy (Archive)' },
                        { sr: '11', name: 'Zohaib Zeeshan', desig: 'Lead Systems Architect / LIMS Admin', sig: 'Controlled Electronic Copy (LIMS)' },
                        { sr: '12', name: '', desig: '', sig: 'Sign: ____________ Date: ________' },
                        { sr: '13', name: '', desig: '', sig: 'Sign: ____________ Date: ________' },
                        { sr: '14', name: '', desig: '', sig: 'Sign: ____________ Date: ________' },
                        { sr: '15', name: '', desig: '', sig: 'Sign: ____________ Date: ________' },
                      ].map((row) => (
                        <tr key={row.sr} className="h-6">
                          <td className="p-1 text-center font-bold font-mono">{row.sr}</td>
                          <td className="p-1 font-semibold">{row.name}</td>
                          <td className="p-1 text-slate-600">{row.desig}</td>
                          <td className="p-1 font-mono text-slate-600">{row.sig}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <Atm003PageFooter pageNumber={10} />
          </div>
        )}

      </div>
    </div>
  );
}
