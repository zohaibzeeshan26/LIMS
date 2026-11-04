-- 1. Add DOCUMENTATION_MANAGER to Role enum in PostgreSQL
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DOCUMENTATION_MANAGER';

-- 2. Create products table
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  "brandName" text NOT NULL,
  "genericName" text NOT NULL,
  "dosageForm" text NOT NULL,
  "strength" text NOT NULL,
  "packSize" text NOT NULL,
  laboratory text NOT NULL,
  "labName" text NOT NULL,
  "atmCode" text NOT NULL,
  version text NOT NULL,
  status text NOT NULL,
  specs text NOT NULL,
  description text NOT NULL,
  parameters text[] NOT NULL DEFAULT '{}',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create product_documents table for Word documents (.doc/.docx)
CREATE TABLE IF NOT EXISTS product_documents (
  id text PRIMARY KEY,
  "productId" text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "productName" text NOT NULL,
  "productCode" text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  "fileName" text NOT NULL,
  "fileSize" integer NOT NULL,
  "mimeType" text NOT NULL,
  "filePath" text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  "versionNotes" text,
  "uploadedById" text REFERENCES users(id) ON DELETE SET NULL,
  "uploadedByName" text NOT NULL,
  "isCurrent" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "product_documents_productId_idx" ON product_documents("productId");
CREATE INDEX IF NOT EXISTS "product_documents_isCurrent_idx" ON product_documents("isCurrent");

-- 4. Seed approved commercial products from database
INSERT INTO products (id, "brandName", "genericName", "dosageForm", "strength", "packSize", laboratory, "labName", "atmCode", version, status, specs, description, parameters, "createdAt", "updatedAt")
VALUES
(
  'askprol',
  'Askprol Suspension 120mg/5ml',
  'Acetaminophen / Paracetamol Oral Suspension',
  'Oral Liquid Suspension',
  '120 mg / 5 mL',
  '60 mL Amber Bottle & Bulk Tankers',
  'GENERAL',
  'Chemical Lab General (CLG)',
  'QC/CLG/ATM-003',
  'Version: 06 (USP 2026)',
  'ACTIVE_AUTOMATED',
  'USP 2026 / WHO QAS 23.922 / DRAP #030725',
  'Compendial testing protocol with complete automated real-time calculation engine for Pycnometer Density, pH, HPLC System Suitability, Assay %, Deliverable Volume, Uniformity of Dosage Units (AV), 4-Aminophenol Impurities, and 21 CFR Part 11 release CoA.',
  ARRAY['Physical Description & Color Disp.', 'Density by Pycnometer (1.040 - 1.130 g/ml)', 'pH Determination (4.0 - 6.9)', 'HPLC System Suitability (%RSD <= 2.0%)', 'Assay % (90.0% - 110.0% FG / 95-105% Bulk)', 'Deliverable Volume (USP <698>, Avg >= 100%)', 'Uniformity of Dosage Units (USP <905>, AV <= 15.0)', '4-Aminophenol Impurities (NMT 0.15%)', 'Diethylene & Ethylene Glycols (NMT 0.1%)', 'Microbial Pure: TAMC, TYMC & E.Coli', '21 CFR Part 11 Certificate of Analysis (CoA)'],
  NOW(),
  NOW()
),
(
  'cefixime-susp',
  'Cefixime Oral Suspension 100mg/5ml',
  'Cefixime Trihydrate Oral Suspension',
  'Dry Powder for Oral Suspension',
  '100 mg / 5 mL',
  '30 mL & 60 mL Amber Glass Bottles',
  'CEPHALOSPORIN',
  'Cephalosporin Lab (SAF)',
  'QC/CEPH/ATM-012',
  'Version: 04 (USP 2026)',
  'COMPENDIAL_READY',
  'USP 2026 / DRAP Reg #024110',
  'Cephalosporin analytical test method for Cefixime reconstituted oral suspension. Tests include Reconstitution Time, pH, Water Content (KF), HPLC Potency Assay, and Degradation Related Substances.',
  ARRAY['Reconstitution Time (< 60s)', 'pH after Reconstitution (2.6 - 4.1)', 'Water Content by KF (NMT 2.5%)', 'HPLC Assay (90.0% - 110.0%)', 'Total Related Substances (NMT 1.5%)'],
  NOW(),
  NOW()
),
(
  'amoxicillin-caps',
  'Amoxicillin Capsules 500mg',
  'Amoxicillin Trihydrate Hard Gelatin Capsules',
  'Hard Gelatin Capsules',
  '500 mg',
  'Blister Pack 10 x 10 Capsules',
  'PENICILLIN',
  'Penicillin Lab (PEN)',
  'QC/PNC/ATM-007',
  'Version: 05 (BP 2025)',
  'COMPENDIAL_READY',
  'BP 2025 / USP 2026 / DRAP #018940',
  'Penicillin dedicated analytical test method for Amoxicillin capsules. Tests include Dissolution (USP App 1, 45 min >= 80%), Weight Variation, Moisture Content, and Iodometric/HPLC Assay.',
  ARRAY['Uniformity of Weight', 'Dissolution Rate (Q >= 80% in 45 min)', 'Loss on Drying / Moisture (< 14.5%)', 'HPLC Assay (92.5% - 107.5%)', 'Chromatographic Purity'],
  NOW(),
  NOW()
),
(
  'paracetamol-tabs',
  'Paracetamol Tablets 500mg',
  'Acetaminophen Compounded Tablets',
  'Uncoated Tablets',
  '500 mg',
  'Blister Pack 20 x 10 Tablets',
  'GENERAL',
  'Chemical Lab General (CLG)',
  'QC/CLG/ATM-001',
  'Version: 07 (USP 2026)',
  'COMPENDIAL_READY',
  'USP 2026 / BP 2025',
  'Compendial testing procedure for Paracetamol solid dosage form. Tests include Hardness, Friability (< 1.0%), Disintegration (< 15 min), Dissolution (Q >= 80% in 30 min), and UV/HPLC Assay.',
  ARRAY['Tablet Hardness (4 - 8 kg/cm²)', 'Friability (NMT 1.0%)', 'Disintegration Time (< 15 min)', 'Dissolution (Q >= 80% in 30 min)', 'Assay % (95.0% - 105.0%)'],
  NOW(),
  NOW()
),
(
  'ceftriaxone-inj',
  'Ceftriaxone Sodium for Injection 1g',
  'Ceftriaxone Sodium Sterile Powder',
  'Sterile Powder for Injection',
  '1 g / Vial',
  'Glass Vial + Sterile Water Ampoule',
  'CEPHALOSPORIN',
  'Cephalosporin Lab (SAF)',
  'QC/CEPH/ATM-024',
  'Version: 03 (USP 2026)',
  'COMPENDIAL_READY',
  'USP 2026 Sterile Parenteral Compendia',
  'Sterile parenteral testing method for Ceftriaxone injection. Tests include Clarity & Color of Solution, Reconstitution Time, Particulate Matter (USP <788>), Bacterial Endotoxins (LAL), Sterility, and HPLC Assay.',
  ARRAY['Clarity & Color of Reconstituted Solution', 'Sub-visible Particulate Matter (USP <788>)', 'Bacterial Endotoxins (< 0.20 EU/mg)', 'Sterility Test (Membrane Filtration)', 'Assay by HPLC (90.0% - 115.0%)'],
  NOW(),
  NOW()
),
(
  'omeprazole-caps',
  'Omeprazole Delayed-Release Capsules 20mg',
  'Omeprazole Enteric-Coated Pellets',
  'Delayed-Release Pellets in Hard Capsule',
  '20 mg',
  'Alu-Alu Blister Pack 2 x 7 Capsules',
  'GENERAL',
  'Chemical Lab General (CLG)',
  'QC/CLG/ATM-015',
  'Version: 04 (USP 2026)',
  'COMPENDIAL_READY',
  'USP 2026 Delayed Release Monograph',
  'Delayed-release testing protocol. Two-stage dissolution test: Acid resistance stage (0.1N HCl, 2 hours, NMT 10% release) and Buffer stage (pH 6.8, 30 min, Q >= 75%), alongside HPLC assay.',
  ARRAY['Acid Resistance (NMT 10% in 2h)', 'Buffer Stage Dissolution (Q >= 75%)', 'Content Uniformity (AV <= 15.0)', 'HPLC Assay (90.0% - 110.0%)', 'Omeprazole Related Compounds'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "brandName" = EXCLUDED."brandName",
  "genericName" = EXCLUDED."genericName",
  "dosageForm" = EXCLUDED."dosageForm",
  "strength" = EXCLUDED."strength",
  "packSize" = EXCLUDED."packSize",
  laboratory = EXCLUDED.laboratory,
  "labName" = EXCLUDED."labName",
  "atmCode" = EXCLUDED."atmCode",
  version = EXCLUDED.version,
  status = EXCLUDED.status,
  specs = EXCLUDED.specs,
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  "updatedAt" = NOW();

-- 5. Seed Documentation Manager User Account
INSERT INTO users (
  id, email, username, "passwordHash", "fullName", "employeeId", department, role, "isActive", "must_change_password", "createdAt", "updatedAt"
) VALUES (
  'user-doc-manager-001',
  'doc.manager@citypharma.com',
  'doc.manager',
  '$2b$10$wN3eYx7b3B58J8k8r7mNeeM8j4q5x4G9Zg2N6l6W4b8r6j8v6m7',
  'Sana Tariq (Documentation Manager)',
  'EMP-DOC-MGR',
  'Documentation & Technical Writing',
  'DOCUMENTATION_MANAGER',
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'DOCUMENTATION_MANAGER',
  username = 'doc.manager',
  "employeeId" = 'EMP-DOC-MGR',
  department = 'Documentation & Technical Writing';

