'use client';

import React from 'react';
import Link from 'next/link';
import {
  Package,
  FlaskConical,
  FileSpreadsheet,
  FileText,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Download,
  Microscope,
  Layers,
  Activity,
  AlertTriangle,
  Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductItem {
  id: string;
  brandName: string;
  genericName: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  laboratory: 'GENERAL' | 'CEPHALOSPORIN' | 'PENICILLIN';
  labName: string;
  atmCode: string;
  version: string;
  status: 'ACTIVE_AUTOMATED' | 'COMPENDIAL_READY' | 'UNDER_VALIDATION';
  specs: string;
  hasEngine: boolean;
  engineHref?: string;
  description: string;
  parameters: string[];
}

const PRODUCTS_DATABASE: ProductItem[] = [
  {
    id: 'askprol',
    brandName: 'Askprol Suspension 120mg/5ml',
    genericName: 'Acetaminophen / Paracetamol Oral Suspension',
    dosageForm: 'Oral Liquid Suspension',
    strength: '120 mg / 5 mL',
    packSize: '60 mL Amber Bottle & Bulk Tankers',
    laboratory: 'GENERAL',
    labName: 'Chemical Lab General (CLG)',
    atmCode: 'QC/CLG/ATM-003',
    version: 'Version: 06 (USP 2026)',
    status: 'ACTIVE_AUTOMATED',
    specs: 'USP 2026 / WHO QAS 23.922 / DRAP #030725',
    hasEngine: true,
    engineHref: '/askprol',
    description:
      'Compendial testing protocol with complete automated real-time calculation engine for Pycnometer Density, pH, HPLC System Suitability, Assay %, Deliverable Volume, Uniformity of Dosage Units (AV), 4-Aminophenol Impurities, and 21 CFR Part 11 release CoA.',
    parameters: [
      'Physical Description & Color Disp.',
      'Density by Pycnometer (1.040 - 1.130 g/ml)',
      'pH Determination (4.0 - 6.9)',
      'HPLC System Suitability (%RSD <= 2.0%)',
      'Assay % (90.0% - 110.0% FG / 95-105% Bulk)',
      'Deliverable Volume (USP <698>, Avg >= 100%)',
      'Uniformity of Dosage Units (USP <905>, AV <= 15.0)',
      '4-Aminophenol Impurities (NMT 0.15%)',
      'Diethylene & Ethylene Glycols (NMT 0.1%)',
      'Microbial Pure: TAMC, TYMC & E.Coli',
      '21 CFR Part 11 Certificate of Analysis (CoA)',
    ],
  },
  {
    id: 'cefixime-susp',
    brandName: 'Cefixime Oral Suspension 100mg/5ml',
    genericName: 'Cefixime Trihydrate Oral Suspension',
    dosageForm: 'Dry Powder for Oral Suspension',
    strength: '100 mg / 5 mL',
    packSize: '30 mL & 60 mL Amber Glass Bottles',
    laboratory: 'CEPHALOSPORIN',
    labName: 'Cephalosporin Lab (SAF)',
    atmCode: 'QC/CEPH/ATM-012',
    version: 'Version: 04 (USP 2026)',
    status: 'COMPENDIAL_READY',
    specs: 'USP 2026 / DRAP Reg #024110',
    hasEngine: false,
    description:
      'Cephalosporin analytical test method for Cefixime reconstituted oral suspension. Tests include Reconstitution Time, pH, Water Content (KF), HPLC Potency Assay, and Degradation Related Substances.',
    parameters: [
      'Reconstitution Time (< 60s)',
      'pH after Reconstitution (2.6 - 4.1)',
      'Water Content by KF (NMT 2.5%)',
      'HPLC Assay (90.0% - 110.0%)',
      'Total Related Substances (NMT 1.5%)',
    ],
  },
  {
    id: 'amoxicillin-caps',
    brandName: 'Amoxicillin Capsules 500mg',
    genericName: 'Amoxicillin Trihydrate Hard Gelatin Capsules',
    dosageForm: 'Hard Gelatin Capsules',
    strength: '500 mg',
    packSize: 'Blister Pack 10 x 10 Capsules',
    laboratory: 'PENICILLIN',
    labName: 'Penicillin Lab (PEN)',
    atmCode: 'QC/PNC/ATM-007',
    version: 'Version: 05 (BP 2025)',
    status: 'COMPENDIAL_READY',
    specs: 'BP 2025 / USP 2026 / DRAP #018940',
    hasEngine: false,
    description:
      'Penicillin dedicated analytical test method for Amoxicillin capsules. Tests include Dissolution (USP App 1, 45 min >= 80%), Weight Variation, Moisture Content, and Iodometric/HPLC Assay.',
    parameters: [
      'Uniformity of Weight',
      'Dissolution Rate (Q >= 80% in 45 min)',
      'Loss on Drying / Moisture (< 14.5%)',
      'HPLC Assay (92.5% - 107.5%)',
      'Chromatographic Purity',
    ],
  },
  {
    id: 'paracetamol-tabs',
    brandName: 'Paracetamol Tablets 500mg',
    genericName: 'Acetaminophen Compounded Tablets',
    dosageForm: 'Uncoated Tablets',
    strength: '500 mg',
    packSize: 'Blister Pack 20 x 10 Tablets',
    laboratory: 'GENERAL',
    labName: 'Chemical Lab General (CLG)',
    atmCode: 'QC/CLG/ATM-001',
    version: 'Version: 07 (USP 2026)',
    status: 'COMPENDIAL_READY',
    specs: 'USP 2026 / BP 2025',
    hasEngine: false,
    description:
      'Compendial testing procedure for Paracetamol solid dosage form. Tests include Hardness, Friability (< 1.0%), Disintegration (< 15 min), Dissolution (Q >= 80% in 30 min), and UV/HPLC Assay.',
    parameters: [
      'Tablet Hardness (4 - 8 kg/cm²)',
      'Friability (NMT 1.0%)',
      'Disintegration Time (< 15 min)',
      'Dissolution (Q >= 80% in 30 min)',
      'Assay % (95.0% - 105.0%)',
    ],
  },
  {
    id: 'ceftriaxone-inj',
    brandName: 'Ceftriaxone Sodium for Injection 1g',
    genericName: 'Ceftriaxone Sodium Sterile Powder',
    dosageForm: 'Sterile Powder for Injection',
    strength: '1 g / Vial',
    packSize: 'Glass Vial + Sterile Water Ampoule',
    laboratory: 'CEPHALOSPORIN',
    labName: 'Cephalosporin Lab (SAF)',
    atmCode: 'QC/CEPH/ATM-024',
    version: 'Version: 03 (USP 2026)',
    status: 'COMPENDIAL_READY',
    specs: 'USP 2026 Sterile Parenteral Compendia',
    hasEngine: false,
    description:
      'Sterile parenteral testing method for Ceftriaxone injection. Tests include Clarity & Color of Solution, Reconstitution Time, Particulate Matter (USP <788>), Bacterial Endotoxins (LAL), Sterility, and HPLC Assay.',
    parameters: [
      'Clarity & Color of Reconstituted Solution',
      'Sub-visible Particulate Matter (USP <788>)',
      'Bacterial Endotoxins (< 0.20 EU/mg)',
      'Sterility Test (Membrane Filtration)',
      'Assay by HPLC (90.0% - 115.0%)',
    ],
  },
  {
    id: 'omeprazole-caps',
    brandName: 'Omeprazole Delayed-Release Capsules 20mg',
    genericName: 'Omeprazole Enteric-Coated Pellets',
    dosageForm: 'Delayed-Release Pellets in Hard Capsule',
    strength: '20 mg',
    packSize: 'Alu-Alu Blister Pack 2 x 7 Capsules',
    laboratory: 'GENERAL',
    labName: 'Chemical Lab General (CLG)',
    atmCode: 'QC/CLG/ATM-015',
    version: 'Version: 04 (USP 2026)',
    status: 'COMPENDIAL_READY',
    specs: 'USP 2026 Delayed Release Monograph',
    hasEngine: false,
    description:
      'Delayed-release testing protocol. Two-stage dissolution test: Acid resistance stage (0.1N HCl, 2 hours, NMT 10% release) and Buffer stage (pH 6.8, 30 min, Q >= 75%), alongside HPLC assay.',
    parameters: [
      'Acid Resistance (NMT 10% in 2h)',
      'Buffer Stage Dissolution (Q >= 75%)',
      'Content Uniformity (AV <= 15.0)',
      'HPLC Assay (90.0% - 110.0%)',
      'Omeprazole Related Compounds',
    ],
  },
];

export default function ProductsCatalogPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pharmaceutical Products Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Approved commercial products and compendial Analytical Test Methods (ATM).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Total Products: {PRODUCTS_DATABASE.length}
          </span>
        </div>
      </div>

      {/* ================= SECTION: ALL REGISTERED PHARMACEUTICAL PRODUCTS ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              All Pharmaceutical Products ({PRODUCTS_DATABASE.length})
            </h2>
            <p className="text-xs text-slate-500">
              Approved commercial products with active laboratory analytical test methods (ATM).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS_DATABASE.map((product) => {
            const isAskprol = product.id === 'askprol';
            return (
              <div
                key={product.id}
                className={cn(
                  'rounded-2xl border p-6 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-1',
                  isAskprol
                    ? 'bg-gradient-to-b from-purple-50/90 via-white to-white border-purple-200 ring-2 ring-purple-500/20'
                    : 'bg-white border-slate-200/90'
                )}
              >
                <div className="space-y-4">
                  {/* Card Header: Laboratory Tag + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                        product.laboratory === 'GENERAL'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : product.laboratory === 'CEPHALOSPORIN'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      )}
                    >
                      {product.labName}
                    </span>

                    <span
                      className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider',
                        isAskprol
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {product.atmCode}
                    </span>
                  </div>

                  {/* Brand & Generic Name & Full Description */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {product.brandName}
                    </h3>
                    <p className="text-xs text-purple-700 font-semibold">
                      {product.genericName}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {product.description}
                    </p>
                  </div>

                  {/* Specification & Details */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-medium text-slate-500">Dosage Form:</span>
                      <span className="font-bold text-slate-800">{product.dosageForm}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-medium text-slate-500">Pack Size:</span>
                      <span className="font-bold text-slate-800">{product.packSize}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-slate-600">
                      <span className="font-medium text-slate-500 shrink-0">Standards:</span>
                      <span className="font-mono text-[10px] text-purple-700 font-bold text-right">
                        {product.specs}
                      </span>
                    </div>
                  </div>

                  {/* Parameter Count */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Key Analytical Parameters ({product.parameters.length})
                    </span>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {product.parameters.slice(0, 3).map((param, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1" />
                          <span className="leading-snug">{param}</span>
                        </li>
                      ))}
                      {product.parameters.length > 3 && (
                        <li className="text-[10px] text-purple-600 font-bold pl-3">
                          + {product.parameters.length - 3} more compendial checks
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100">
                  {isAskprol ? (
                    <Link
                      href="/askprol"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0B1A30] text-white hover:bg-slate-800 transition-all shadow-xs group"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-purple-300" />
                      <span>Launch QC Worksheet &amp; CoA &rarr;</span>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="text-[11px] italic">SOP Monograph on Record</span>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {product.version.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
