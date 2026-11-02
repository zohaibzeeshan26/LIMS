-- ==============================================================================
-- CITY PHARMA LIMS - COMPLETE DATABASE DUMP (SCHEMA + DATA)
-- ==============================================================================
-- Database Name: city_pharma_lims
-- Compatible with: PostgreSQL 12 / 13 / 14 / 15 / 16 / 17 / 18
-- Tools Supported: pgAdmin 4 (Query Tool), DBeaver, psql, Navicat, Docker, Supabase, Neon
-- Generated: 2026-10-26
--
-- Included Tables (13):
--   1. users                    (2 active users: Admin and Analyst)
--   2. laboratories             (3 laboratories: General Lab, Cephalosporin Lab, Penicillin Lab)
--   3. samples                  (16 live operational samples)
--   4. sample_tests             (Test records)
--   5. sample_submissions       (Submission records)
--   6. test_specifications      (Specifications)
--   7. batches                  (Batches)
--   8. instruments              (Laboratory Instruments)
--   9. oos_incidents            (OOS Investigations)
--  10. certificates_of_analysis (COAs)
--  11. calibration_logs         (Calibration records)
--  12. audit_logs               (Audit logs)
--  13. audit_trails             (66 audit trail event logs)
--
-- Quick Restoration Instructions:
--
-- METHOD 1: Using pgAdmin 4 (Query Tool)
--   1. Open pgAdmin 4 and connect to your PostgreSQL server.
--   2. Right-click "Databases" -> Create -> Database -> Name: city_pharma_lims
--   3. Right-click city_pharma_lims -> "Query Tool"
--   4. Open this file (Ctrl+O) or paste its content, then click "Execute" (F5).
--   ✓ Done! All 13 tables, types, constraints, and data will be restored without error.
--
-- METHOD 2: Using psql CLI (Terminal / Command Prompt)
--   psql -U postgres -d postgres -c "CREATE DATABASE city_pharma_lims;"
--   psql -U postgres -d city_pharma_lims -f city_pharma_lims_complete.sql
--
-- METHOD 3: Using pgAdmin 4 GUI "Restore..." Dialog
--   Use "city_pharma_lims.dump" or "city_pharma_lims.backup" with the Restore button.
-- ==============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public, pg_catalog;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


-- ==============================================================================
-- CLEAN EXISTING OBJECTS (SAFE RESET WITH CASCADE)
-- ==============================================================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.audit_trails CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;
DROP TABLE IF EXISTS public.calibration_logs CASCADE;
DROP TABLE IF EXISTS public.certificates_of_analysis CASCADE;
DROP TABLE IF EXISTS public.instruments CASCADE;
DROP TABLE IF EXISTS public.laboratories CASCADE;
DROP TABLE IF EXISTS public.oos_incidents CASCADE;
DROP TABLE IF EXISTS public.sample_submissions CASCADE;
DROP TABLE IF EXISTS public.sample_tests CASCADE;
DROP TABLE IF EXISTS public.samples CASCADE;
DROP TABLE IF EXISTS public.test_specifications CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public."BatchStatus" CASCADE;
DROP TYPE IF EXISTS public."InstrumentStatus" CASCADE;
DROP TYPE IF EXISTS public."LaboratoryType" CASCADE;
DROP TYPE IF EXISTS public."Priority" CASCADE;
DROP TYPE IF EXISTS public."ResultStatus" CASCADE;
DROP TYPE IF EXISTS public."Role" CASCADE;
DROP TYPE IF EXISTS public."SampleStatus" CASCADE;
DROP TYPE IF EXISTS public."SampleType" CASCADE;
DROP TYPE IF EXISTS public."SubmissionDestination" CASCADE;
DROP TYPE IF EXISTS public."SubmissionStatus" CASCADE;
DROP TYPE IF EXISTS public."TestCategory" CASCADE;
DROP TYPE IF EXISTS public."TestStatus" CASCADE;

--
-- Name: BatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BatchStatus" AS ENUM (
    'QUARANTINE',
    'RELEASED',
    'REJECTED',
    'CONDITIONAL'
);


--
-- Name: InstrumentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InstrumentStatus" AS ENUM (
    'QUALIFIED',
    'CALIBRATION_DUE',
    'OUT_OF_SERVICE',
    'MAINTENANCE'
);


--
-- Name: LaboratoryType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LaboratoryType" AS ENUM (
    'SAF',
    'PENICILLIN',
    'GENERAL',
    'CEPHALOSPORIN'
);


--
-- Name: Priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Priority" AS ENUM (
    'ROUTINE',
    'URGENT',
    'STAT',
    'STABILITY'
);


--
-- Name: ResultStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResultStatus" AS ENUM (
    'NOT_TESTED',
    'WITHIN_SPEC',
    'OUT_OF_SPEC',
    'OUT_OF_TREND'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'QA_MANAGER',
    'QC_ANALYST',
    'LAB_TECHNICIAN',
    'AUDITOR',
    'MANAGER',
    'DEPUTY_MANAGER',
    'SHIFT_INCHARGE',
    'TESTING_ANALYST',
    'ANALYST'
);


--
-- Name: SampleStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SampleStatus" AS ENUM (
    'RECEIVED',
    'LOGGED',
    'ASSIGNED',
    'TESTING_IN_PROGRESS',
    'REVIEW_PENDING',
    'APPROVED',
    'REJECTED',
    'ARCHIVED',
    'CANCELLED',
    'PENDING_SUPERVISOR_ASSIGNMENT',
    'ASSIGNED_FOR_TESTING'
);


--
-- Name: SampleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SampleType" AS ENUM (
    'RAW_MATERIAL',
    'IN_PROCESS',
    'FINISHED_PRODUCT',
    'STABILITY',
    'WATER_PURIFIED',
    'ENVIRONMENTAL_SWAB'
);


--
-- Name: SubmissionDestination; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubmissionDestination" AS ENUM (
    'MICROBIOLOGY',
    'CHEMICAL',
    'PHYSICAL'
);


--
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubmissionStatus" AS ENUM (
    'DRAFT',
    'REGISTERED',
    'SUBMITTED',
    'RECEIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: TestCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TestCategory" AS ENUM (
    'CHEMICAL',
    'PHYSICAL',
    'MICROBIOLOGICAL',
    'CHROMATOGRAPHY',
    'STABILITY'
);


--
-- Name: TestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TestStatus" AS ENUM (
    'PENDING',
    'IN_ANALYSIS',
    'COMPLETED',
    'VERIFIED',
    'RETEST_REQUIRED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "previousValues" jsonb,
    "newValues" jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_trails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_trails (
    id text NOT NULL,
    "entityName" text NOT NULL,
    "entityId" text NOT NULL,
    action text NOT NULL,
    "performedById" text,
    "performedByName" text NOT NULL,
    role text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "reasonForChange" text,
    "diffPayload" text
);


--
-- Name: batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batches (
    id text NOT NULL,
    "batchNumber" text NOT NULL,
    "drugProduct" text NOT NULL,
    "dosageForm" text NOT NULL,
    "batchSize" text NOT NULL,
    "manufacturingDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    status public."BatchStatus" DEFAULT 'QUARANTINE'::public."BatchStatus" NOT NULL,
    "releaseDate" timestamp(3) without time zone,
    "releasedBy" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: calibration_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibration_logs (
    id text NOT NULL,
    "instrumentId" text NOT NULL,
    "calibrationDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "calibratedById" text,
    "certificateNumber" text NOT NULL,
    "standardUsed" text,
    passed boolean DEFAULT true NOT NULL,
    "nextDue" timestamp(3) without time zone NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: certificates_of_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates_of_analysis (
    id text NOT NULL,
    "certificateNumber" text NOT NULL,
    "batchId" text NOT NULL,
    "sampleId" text,
    "issuedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "authorizedById" text NOT NULL,
    status text DEFAULT 'ISSUED'::text NOT NULL,
    remarks text,
    "signatureHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: instruments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instruments (
    id text NOT NULL,
    "equipmentCode" text NOT NULL,
    name text NOT NULL,
    model text NOT NULL,
    "serialNumber" text NOT NULL,
    manufacturer text NOT NULL,
    "laboratoryRoom" text NOT NULL,
    status public."InstrumentStatus" DEFAULT 'QUALIFIED'::public."InstrumentStatus" NOT NULL,
    "lastCalibrationDate" timestamp(3) without time zone,
    "nextCalibrationDue" timestamp(3) without time zone NOT NULL,
    "calibrationFrequencyDays" integer DEFAULT 90 NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: laboratories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.laboratories (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: oos_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oos_incidents (
    id text NOT NULL,
    "incidentNumber" text NOT NULL,
    "sampleTestId" text NOT NULL,
    "sampleId" text NOT NULL,
    "reportedById" text NOT NULL,
    "phaseOneStatus" text DEFAULT 'INVESTIGATING'::text NOT NULL,
    "labErrorConfirmed" boolean DEFAULT false NOT NULL,
    "rootCauseCategory" text,
    "phaseTwoRequired" boolean DEFAULT false NOT NULL,
    "capaDescription" text,
    "qaApprovalStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "qaManagerId" text,
    "closedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: sample_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_submissions (
    id text NOT NULL,
    "sampleId" text NOT NULL,
    "submittedByName" text,
    "submissionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."SubmissionStatus" DEFAULT 'SUBMITTED'::public."SubmissionStatus" NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "destinationLabEnum" public."SubmissionDestination",
    "destinationLabId" text,
    "destinationLaboratory" text DEFAULT 'General Lab'::text NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "submittedByUserId" text
);


--
-- Name: sample_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_tests (
    id text NOT NULL,
    "sampleId" text NOT NULL,
    "testSpecificationId" text NOT NULL,
    "instrumentId" text,
    "analystId" text,
    status public."TestStatus" DEFAULT 'PENDING'::public."TestStatus" NOT NULL,
    "minLimit" double precision,
    "maxLimit" double precision,
    "targetValue" double precision,
    unit text,
    "numericResult" double precision,
    "textResult" text,
    "resultStatus" public."ResultStatus" DEFAULT 'NOT_TESTED'::public."ResultStatus" NOT NULL,
    "testDate" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "rawDataReference" text,
    comments text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.samples (
    id text NOT NULL,
    "sampleCode" text,
    "batchId" text,
    "materialName" text,
    "sourceSupplier" text,
    "samplingLocation" text,
    "samplingDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sampleQty" double precision,
    unit text DEFAULT 'units'::text NOT NULL,
    "storageCondition" text DEFAULT 'Controlled Room Temp 20-25°C'::text NOT NULL,
    priority public."Priority" DEFAULT 'ROUTINE'::public."Priority" NOT NULL,
    status public."SampleStatus" DEFAULT 'PENDING_SUPERVISOR_ASSIGNMENT'::public."SampleStatus" NOT NULL,
    "chainOfCustody" text,
    barcode text,
    "accessionedById" text,
    "assignedToId" text,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accessionNo" text,
    "expDate" timestamp(3) without time zone,
    "lotNumber" text,
    "mfgDate" timestamp(3) without time zone,
    nomenclature text NOT NULL,
    "submittedBy" text,
    "archivedAt" timestamp(3) without time zone,
    "archivedByUserId" text,
    "batchLotNumber" text,
    "cancellationReason" text,
    "expiryDate" timestamp(3) without time zone,
    "isArchived" boolean DEFAULT false NOT NULL,
    "laboratoryId" text,
    "laboratoryType" public."LaboratoryType" DEFAULT 'GENERAL'::public."LaboratoryType",
    "manufacturingDate" timestamp(3) without time zone,
    quantity double precision DEFAULT 1.0 NOT NULL,
    "quantityUnit" text DEFAULT 'units'::text NOT NULL,
    "receivedByUserId" text,
    "recordNumber" text,
    "sampleId" text,
    "sampledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "stageType" text DEFAULT 'FINISHED_PRODUCT'::text NOT NULL,
    "submittedByUserId" text,
    "sampleType" public."SampleType" DEFAULT 'FINISHED_PRODUCT'::public."SampleType",
    "assignedAt" timestamp(3) without time zone,
    "assignedById" text,
    "assignmentNotes" text,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: test_specifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_specifications (
    id text NOT NULL,
    "testCode" text NOT NULL,
    name text NOT NULL,
    category public."TestCategory" DEFAULT 'CHEMICAL'::public."TestCategory" NOT NULL,
    "pharmacopeiaMethod" text DEFAULT 'USP'::text NOT NULL,
    "defaultMinLimit" double precision,
    "defaultMaxLimit" double precision,
    "defaultTarget" double precision,
    unit text,
    "procedureOverview" text,
    "requiresInstrument" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "fullName" text NOT NULL,
    "employeeId" text NOT NULL,
    department text NOT NULL,
    role public."Role" DEFAULT 'QC_ANALYST'::public."Role" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLogin" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "hashedRefreshToken" text,
    username text,
    assigned_lab text,
    must_change_password boolean DEFAULT true NOT NULL
);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: audit_trails; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('2261c8e3-1e6f-45ed-a4b4-d07c9f810ffd', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 10:43:45.727', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('3e3181b0-3212-4e91-8a0a-0d4a7d22890e', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGOUT', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 10:43:57.33', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('52e16f86-1299-4c5e-be50-06f1757fff38', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 10:45:26.559', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('2c4a1dcd-6408-4a51-aac0-b287259fcb3a', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 10:54:47.16', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('2e95c95d-fd68-4fb7-8f32-e29b958aed26', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 10:55:27.761', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('f1433ef2-5302-478f-bd50-4d924f5fc045', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGOUT', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 10:56:54.099', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9934874a-0764-40be-a39e-69096faa9967', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 11:12:20.753', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('d3fc78cd-adb1-4f54-a01a-4189fbb9baab', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGOUT', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 11:25:23.917', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('a5151a53-acae-470f-b366-f0141f2e477a', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 11:40:09.899', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('b65ba2be-66ed-457f-af99-b470e30be5c3', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 11:52:57.156', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('19421c7a-9176-40b0-98a5-de0a19a0f9d8', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 11:54:17.293', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('f9e94ba5-82b4-4dc6-a164-d099a0b6ccfa', 'Sample', '634bebb5-45e1-45af-80b9-c73557f17fd5', 'SAMPLE_ACCESSIONED', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 12:10:49.482', NULL, 'New sample accessioned: GL/SB-1', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('1980b9d9-0963-43e3-8286-68a0ec89da5d', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGOUT', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-25 12:16:26.578', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('6a4ea21f-a3c3-4c6a-a3df-393615161b8c', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-25 12:16:53.541', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('3af2ad2b-8337-4916-a9a5-250dcb3c04f9', 'Sample', '2f13dd0b-3652-4aee-893e-999db6b595ce', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-25 12:18:11.661', NULL, 'New sample accessioned: GL/SB-2', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('7caac3c3-d240-4f53-9431-dad33bf61f73', 'Sample', 'e842819d-7bfa-466f-b5ea-5191fda639bd', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-25 12:18:41.867', NULL, 'New sample accessioned: GL/F-1', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('a5fd0e59-9feb-4d66-a07c-a67e0479d460', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:53:25.996', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('c83dc37a-d7fe-443f-b245-98ac795daa2d', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:53:27.1', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('db281608-d607-43fb-a446-705ea11478c0', 'Sample', '887c5df8-486b-4b13-be94-1c9dea0c251f', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:55:04.208', NULL, 'New sample accessioned: GL/SB-3', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('48b2de82-42fb-4a82-b690-f3bc808d6f4a', 'Sample', 'df029891-9e8a-4b77-b662-9b2b966b9716', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:56:07.604', NULL, 'New sample accessioned: GL/F-2', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9194fdaa-a40e-4620-ae11-ef2e23e1836c', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:57:03.417', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('95923c4e-5e71-4a5e-ba33-6541af7db2c1', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:57:09.869', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('776186c9-ce2c-4f90-abcb-0e9c2a102b53', 'Sample', '8d39a0e5-a7ca-4050-8d4c-cb8c2aad836e', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 04:57:58.932', NULL, 'New sample accessioned: PEN/SB-1', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('7e9474b8-7f30-4199-882d-40ce99a2c805', 'Sample', '5241315b-fcf7-4446-ab85-e00538fcf08a', 'SAMPLE_ACCESSIONED', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:18:26.955', NULL, 'New sample accessioned: PEN/SB-2', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('0f645593-d9dc-4950-9e6b-a8489b3ccdb9', 'Sample', '0fa5bdd2-093a-461b-ba35-324154bd8551', 'SAMPLE_ACCESSIONED', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:18:26.977', NULL, 'New sample accessioned: PEN/F-1', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('c4239901-dd8f-47bf-aa99-c2b79963a0c3', 'Sample', '499e0b72-71fe-4408-b69a-2688bb08719b', 'SAMPLE_ACCESSIONED', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:18:26.992', NULL, 'New sample accessioned: CEPH/SB-1', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('abaae844-0394-4f80-b69f-330d380163d5', 'Sample', '4c64950f-79dd-44ea-a33d-3fab46ba4818', 'SAMPLE_ACCESSIONED', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:18:27.01', NULL, 'New sample accessioned: CEPH/F-1', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('5a545c72-4537-432b-8795-cc9546c47565', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:18:55.642', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('4c02b924-4a8d-4f13-91fe-8b8d27e7bec0', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:20:07.217', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('a79298fe-5ebd-44ae-8e71-55ba1472fe80', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:20:23.739', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('8bd84ef3-e2a5-4e8a-a3d4-b0e109dca4be', 'Sample', 'ae6b6c96-f60c-49e7-a239-9708075a59fc', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:20:55.107', NULL, 'New sample accessioned: GL/SB-4', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('f7f861f5-244d-47a1-b16a-4e62c41cd9d0', 'Sample', 'c700fac5-8401-435f-bc44-16e5aedd22d2', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:21:34.319', NULL, 'New sample accessioned: GL/F-3', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('90ed5e91-8b61-4896-9918-e3072b3b6d11', 'Sample', '55b933da-305f-4cf2-b626-0b9a06890e4c', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:22:21.287', NULL, 'New sample accessioned: PEN/SB-3', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('7f5e1042-7f93-45af-89c6-64da277c4e95', 'Sample', 'e3337c31-63d9-4d01-8711-74321588c7d3', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:23:15.081', NULL, 'New sample accessioned: PEN/F-2', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9b12c5ad-1d78-44a7-88b0-9016cae191c8', 'Sample', '8120268e-a84e-40d2-952a-c0c709155d28', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:23:50.447', NULL, 'New sample accessioned: CEPH/SB-2', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9aeba7d3-e0a0-4b57-bffb-4ad0960d5667', 'Sample', '02f5d45d-64c0-4299-b640-135cdd934b19', 'SAMPLE_ACCESSIONED', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:24:38.037', NULL, 'New sample accessioned: CEPH/F-2', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('5310877e-00b8-423b-b270-d9d8b87733a4', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:25:31.641', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('57921e7b-8993-4cc3-acfd-c71827477e9c', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:25:36.109', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('a1f5e5fb-98b8-4279-be36-7269851b0005', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGOUT', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 05:35:10.764', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('392c1209-1d90-43b9-8361-4362c39bfa9b', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 05:35:35.317', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('76b963eb-ff58-493c-8d8b-329da6182782', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:04:00.967', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('647514a6-6d71-40e5-bfbb-e1144a694583', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:06:20.438', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('ee46d033-5c6e-4c76-b8c2-2dcb492864c5', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:20:34.47', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9f3c4dfe-9828-4482-94e2-281f8adfe7ed', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:20:47.451', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('1a82cf86-5ab1-4f89-84cf-dee49e7bab40', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:21:07.939', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9f2a79f3-1dde-445b-bf25-4b89347dfea0', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 06:21:12.175', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('cbd95cae-b006-4402-8c42-731de4e09dc0', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 06:21:15.548', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('9957902a-2f18-482a-8f06-7751ac320dd8', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:26:25.627', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('544e3b53-40af-4570-b8d0-60d17836f609', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGOUT', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 06:29:12.409', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('f589c80d-cbbc-4fd1-8675-dcb151355d9c', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:29:33.75', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('d7192ed2-808c-432b-9201-b59b28ea4b6e', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:29:36.404', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('07905094-f0e1-4b63-b0a1-c2b92d826a16', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:29:37.844', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('00825800-58a6-440d-9871-2e7ab82b7dcb', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:29:38.6', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('5dc733e0-bcc5-43ed-951c-d6e43a9385aa', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:29:39.302', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('1ded7e69-a208-4ef8-942c-b29843473e0a', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:31:24.83', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('e0e40102-95eb-4d0e-ba94-257986cc2290', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:31:28.674', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('79382d0b-bc19-4209-b0a4-3c6f0ef20354', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:38:44.269', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('f5b156fc-6bc3-4e92-a207-5b65e7ba3dd7', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:38:47.337', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('381f44b0-da8b-4d22-81ff-ac45f16d0dbe', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:56:38.849', '::1', 'User session terminated gracefully', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('62b08773-916d-4cd8-bea4-bdc596e7dd7f', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:56:50.328', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('5652fe32-80a6-4a69-8dca-55a117032356', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:56:53.153', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('c185db34-da27-4c1b-bf43-49d6f664561f', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:56:54.215', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('0bf0c2c9-4681-4bf4-8cdb-05e42441147c', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 06:58:07.562', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('1001b2c3-b682-43b9-a48f-97103af6d444', 'User', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'USER_LOGIN', '7c0643ab-f765-4359-bf4c-ac31a549a666', 'Dr. Tariq Mahmood (Administrator)', 'ADMIN', '2026-10-26 06:58:20.242', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('187e5e52-0748-427f-95ab-b119f41508fc', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGIN', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 07:22:16.453', '::1', 'Authentication credential verification (Access granted)', NULL);
INSERT INTO public.audit_trails (id, "entityName", "entityId", action, "performedById", "performedByName", role, "timestamp", "ipAddress", "reasonForChange", "diffPayload") VALUES ('15825754-0cba-4af9-964f-da74e42a10ca', 'User', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'USER_LOGOUT', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'Muhammad Ali (QC Analyst)', 'ANALYST', '2026-10-26 07:22:28.92', '::1', 'User session terminated gracefully', NULL);


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: calibration_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: certificates_of_analysis; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: instruments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: laboratories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.laboratories (id, name, code, "isActive", "createdAt", "updatedAt") VALUES ('70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'General Lab', 'GL', true, '2026-10-25 10:34:26.031', '2026-10-25 10:34:26.031');
INSERT INTO public.laboratories (id, name, code, "isActive", "createdAt", "updatedAt") VALUES ('d777d279-8ab4-4519-a25f-44fa793a9d3c', 'Cephalosporin Lab', 'CEPH', true, '2026-10-25 10:34:26.036', '2026-10-25 10:34:26.036');
INSERT INTO public.laboratories (id, name, code, "isActive", "createdAt", "updatedAt") VALUES ('f734f9fe-8dbc-41e2-8cb9-007c883addc0', 'Penicillin Lab', 'PEN', true, '2026-10-25 10:34:26.038', '2026-10-25 10:34:26.038');


--
-- Data for Name: oos_incidents; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sample_submissions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sample_tests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: samples; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('8d39a0e5-a7ca-4050-8d4c-cb8c2aad836e', 'PEN/SB-1', NULL, 'BRUFEN', NULL, 'Laboratory Receiving Bay', '2026-10-26 04:57:58.89', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'URGENT', 'RECEIVED', '[2026-10-26T04:57:58.921Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'PEN/SB-1', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Semi Basics]', '2026-10-26 04:57:58.922', '2026-10-26 04:57:58.922', 'ACC-2026-PEN-0006', '2026-10-30 00:00:00', '654987', '2026-09-30 00:00:00', 'BRUFEN', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '654987', NULL, '2026-10-30 00:00:00', false, 'f734f9fe-8dbc-41e2-8cb9-007c883addc0', 'PENICILLIN', '2026-09-30 00:00:00', 100, 'tablets', NULL, 'ACC-2026-PEN-0006', 'PEN/SB-1', '2026-10-26 04:57:58.89', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('887c5df8-486b-4b13-be94-1c9dea0c251f', 'GL/SB-3', NULL, 'panadol', NULL, 'Laboratory Receiving Bay', '2026-10-26 04:55:04.153', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T04:55:04.195Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'GL/SB-3', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Semi Basics]', '2026-10-26 04:55:04.197', '2026-10-26 05:10:37.108', 'ACC-2026-GEN-0004', '2026-10-22 00:00:00', '70201', '2026-10-06 00:00:00', 'panadol', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '70201', NULL, '2026-10-22 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-06 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0004', 'GL/SB-3', '2026-10-26 04:55:04.153', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('df029891-9e8a-4b77-b662-9b2b966b9716', 'GL/F-2', NULL, 'SYRUP', NULL, 'Laboratory Receiving Bay', '2026-10-26 04:56:07.538', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'URGENT', 'RECEIVED', '[2026-10-26T04:56:07.592Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'GL/F-2', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Formulation]', '2026-10-26 04:56:07.594', '2026-10-26 05:10:37.108', 'ACC-2026-GEN-0005', '2026-10-15 00:00:00', '36120', '2026-10-05 00:00:00', 'SYRUP', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '36120', NULL, '2026-10-15 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-05 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0005', 'GL/F-2', '2026-10-26 04:56:07.538', '[Formulation] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('634bebb5-45e1-45af-80b9-c73557f17fd5', 'GL/SB-1', NULL, 'TESTING', NULL, 'Laboratory Receiving Bay', '2026-10-25 12:10:49.339', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-25T12:10:49.467Z] Accessioned by Dr. Tariq Mahmood (Administrator) (EMP-001)', 'GL/SB-1', '7c0643ab-f765-4359-bf4c-ac31a549a666', NULL, '[Semi Basics]', '2026-10-25 12:10:49.47', '2026-10-26 05:10:37.108', 'ACC-2026-GEN-0001', '2026-10-27 00:00:00', 'TESTING 1', '2026-10-20 00:00:00', 'TESTING', 'Dr. Tariq Mahmood (QC & Administration)', NULL, NULL, 'TESTING 1', NULL, '2026-10-27 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-20 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0001', 'GL/SB-1', '2026-10-25 12:10:49.339', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('499e0b72-71fe-4408-b69a-2688bb08719b', 'CEPH/SB-1', NULL, 'Cefixime Trihydrate USP', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:18:26.984', 250, 'g', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T05:18:26.985Z] Accessioned by Dr. Tariq Mahmood (Administrator) (EMP-001)', 'CEPH/SB-1', '7c0643ab-f765-4359-bf4c-ac31a549a666', NULL, NULL, '2026-10-26 05:18:26.986', '2026-10-26 05:18:26.986', 'ACC-2026-CEP-0009', NULL, 'LOT-CEPH-SB-01', NULL, 'Cefixime Trihydrate USP', 'Dr. Tariq Mahmood (Administrator)', NULL, NULL, 'LOT-CEPH-SB-01', NULL, NULL, false, 'd777d279-8ab4-4519-a25f-44fa793a9d3c', 'CEPHALOSPORIN', NULL, 250, 'g', NULL, 'ACC-2026-CEP-0009', 'CEPH/SB-1', '2026-10-26 05:18:26.984', '[Semi Basics] Raw Material', NULL, 'RAW_MATERIAL', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('2f13dd0b-3652-4aee-893e-999db6b595ce', 'GL/SB-2', NULL, 'Lenori', NULL, 'Laboratory Receiving Bay', '2026-10-25 12:18:11.591', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-25T12:18:11.638Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'GL/SB-2', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Semi Basics]', '2026-10-25 12:18:11.64', '2026-10-26 05:10:37.108', 'ACC-2026-GEN-0002', '2026-10-29 00:00:00', '1212', '2026-10-27 00:00:00', 'Lenori', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '1212', NULL, '2026-10-29 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-27 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0002', 'GL/SB-2', '2026-10-25 12:18:11.591', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('5241315b-fcf7-4446-ab85-e00538fcf08a', 'PEN/SB-2', NULL, 'Amoxicillin Powder', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:18:26.933', 500, 'g', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T05:18:26.935Z] Accessioned by Dr. Tariq Mahmood (Administrator) (EMP-001)', 'PEN/SB-2', '7c0643ab-f765-4359-bf4c-ac31a549a666', NULL, NULL, '2026-10-26 05:18:26.938', '2026-10-26 05:18:26.938', 'ACC-2026-PEN-0007', NULL, 'LOT-PEN-SB-01', NULL, 'Amoxicillin Powder', 'Dr. Tariq Mahmood (Administrator)', NULL, NULL, 'LOT-PEN-SB-01', NULL, NULL, false, 'f734f9fe-8dbc-41e2-8cb9-007c883addc0', 'PENICILLIN', NULL, 500, 'g', NULL, 'ACC-2026-PEN-0007', 'PEN/SB-2', '2026-10-26 05:18:26.933', '[Semi Basics] Raw Material', NULL, 'RAW_MATERIAL', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('0fa5bdd2-093a-461b-ba35-324154bd8551', 'PEN/F-1', NULL, 'Augmentin 625mg Tablets', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:18:26.965', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T05:18:26.966Z] Accessioned by Dr. Tariq Mahmood (Administrator) (EMP-001)', 'PEN/F-1', '7c0643ab-f765-4359-bf4c-ac31a549a666', NULL, NULL, '2026-10-26 05:18:26.969', '2026-10-26 05:18:26.969', 'ACC-2026-PEN-0008', NULL, 'LOT-PEN-FM-01', NULL, 'Augmentin 625mg Tablets', 'Dr. Tariq Mahmood (Administrator)', NULL, NULL, 'LOT-PEN-FM-01', NULL, NULL, false, 'f734f9fe-8dbc-41e2-8cb9-007c883addc0', 'PENICILLIN', NULL, 100, 'tablets', NULL, 'ACC-2026-PEN-0008', 'PEN/F-1', '2026-10-26 05:18:26.965', '[Formulation] Finished Product', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('4c64950f-79dd-44ea-a33d-3fab46ba4818', 'CEPH/F-1', NULL, 'Cefspan 400mg Capsules', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:18:27', 60, 'capsules', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T05:18:27.000Z] Accessioned by Dr. Tariq Mahmood (Administrator) (EMP-001)', 'CEPH/F-1', '7c0643ab-f765-4359-bf4c-ac31a549a666', NULL, NULL, '2026-10-26 05:18:27.002', '2026-10-26 05:18:27.002', 'ACC-2026-CEP-0010', NULL, 'LOT-CEPH-FM-01', NULL, 'Cefspan 400mg Capsules', 'Dr. Tariq Mahmood (Administrator)', NULL, NULL, 'LOT-CEPH-FM-01', NULL, NULL, false, 'd777d279-8ab4-4519-a25f-44fa793a9d3c', 'CEPHALOSPORIN', NULL, 60, 'capsules', NULL, 'ACC-2026-CEP-0010', 'CEPH/F-1', '2026-10-26 05:18:27', '[Formulation] Finished Product', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('e842819d-7bfa-466f-b5ea-5191fda639bd', 'GL/F-1', NULL, 'paracetamol', NULL, 'Laboratory Receiving Bay', '2026-10-25 12:18:41.791', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-25T12:18:41.839Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'GL/F-1', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Formulation]', '2026-10-25 12:18:41.844', '2026-10-26 05:10:37.108', 'ACC-2026-GEN-0003', '2026-10-28 00:00:00', '25', '2026-10-13 00:00:00', 'paracetamol', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '25', NULL, '2026-10-28 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-13 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0003', 'GL/F-1', '2026-10-25 12:18:41.791', '[Formulation] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('ae6b6c96-f60c-49e7-a239-9708075a59fc', 'GL/SB-4', NULL, 'paracetamol', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:20:55.056', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'URGENT', 'RECEIVED', '[2026-10-26T05:20:55.092Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'GL/SB-4', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Semi Basics]', '2026-10-26 05:20:55.094', '2026-10-26 05:20:55.094', 'ACC-2026-GEN-0011', '2026-10-21 00:00:00', '787878', '2026-10-12 00:00:00', 'paracetamol', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '787878', NULL, '2026-10-21 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-12 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0011', 'GL/SB-4', '2026-10-26 05:20:55.056', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('55b933da-305f-4cf2-b626-0b9a06890e4c', 'PEN/SB-3', NULL, 'panadol 2', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:22:21.233', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'URGENT', 'RECEIVED', '[2026-10-26T05:22:21.272Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'PEN/SB-3', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Semi Basics]', '2026-10-26 05:22:21.273', '2026-10-26 05:22:21.273', 'ACC-2026-PEN-0013', '2026-10-30 00:00:00', '888', '2026-10-06 00:00:00', 'panadol 2', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '888', NULL, '2026-10-30 00:00:00', false, 'f734f9fe-8dbc-41e2-8cb9-007c883addc0', 'PENICILLIN', '2026-10-06 00:00:00', 100, 'tablets', NULL, 'ACC-2026-PEN-0013', 'PEN/SB-3', '2026-10-26 05:22:21.233', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('8120268e-a84e-40d2-952a-c0c709155d28', 'CEPH/SB-2', NULL, 'panadol', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:23:50.406', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'URGENT', 'RECEIVED', '[2026-10-26T05:23:50.437Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'CEPH/SB-2', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Semi Basics]', '2026-10-26 05:23:50.439', '2026-10-26 05:23:50.439', 'ACC-2026-CEP-0015', '2026-10-28 00:00:00', '999', '2026-09-29 00:00:00', 'panadol', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '999', NULL, '2026-10-28 00:00:00', false, 'd777d279-8ab4-4519-a25f-44fa793a9d3c', 'CEPHALOSPORIN', '2026-09-29 00:00:00', 100, 'tablets', NULL, 'ACC-2026-CEP-0015', 'CEPH/SB-2', '2026-10-26 05:23:50.406', '[Semi Basics] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('c700fac5-8401-435f-bc44-16e5aedd22d2', 'GL/F-3', NULL, 'ansaid', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:21:34.276', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T05:21:34.306Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'GL/F-3', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Formulation]', '2026-10-26 05:21:34.308', '2026-10-26 05:21:34.308', 'ACC-2026-GEN-0012', '2026-10-29 00:00:00', '777', '2026-10-13 00:00:00', 'ansaid', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '777', NULL, '2026-10-29 00:00:00', false, '70d4b49a-5b1b-4f60-89bd-f54c49ca1807', 'GENERAL', '2026-10-13 00:00:00', 100, 'tablets', NULL, 'ACC-2026-GEN-0012', 'GL/F-3', '2026-10-26 05:21:34.276', '[Formulation] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('02f5d45d-64c0-4299-b640-135cdd934b19', 'CEPH/F-2', NULL, 'BRUFEN', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:24:37.983', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'URGENT', 'RECEIVED', '[2026-10-26T05:24:38.029Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'CEPH/F-2', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Formulation]', '2026-10-26 05:24:38.031', '2026-10-26 05:24:38.031', 'ACC-2026-CEP-0016', '2026-10-29 00:00:00', '1245', '2026-10-14 00:00:00', 'BRUFEN', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '1245', NULL, '2026-10-29 00:00:00', false, 'd777d279-8ab4-4519-a25f-44fa793a9d3c', 'CEPHALOSPORIN', '2026-10-14 00:00:00', 100, 'tablets', NULL, 'ACC-2026-CEP-0016', 'CEPH/F-2', '2026-10-26 05:24:37.983', '[Formulation] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);
INSERT INTO public.samples (id, "sampleCode", "batchId", "materialName", "sourceSupplier", "samplingLocation", "samplingDate", "sampleQty", unit, "storageCondition", priority, status, "chainOfCustody", barcode, "accessionedById", "assignedToId", remarks, "createdAt", "updatedAt", "accessionNo", "expDate", "lotNumber", "mfgDate", nomenclature, "submittedBy", "archivedAt", "archivedByUserId", "batchLotNumber", "cancellationReason", "expiryDate", "isArchived", "laboratoryId", "laboratoryType", "manufacturingDate", quantity, "quantityUnit", "receivedByUserId", "recordNumber", "sampleId", "sampledAt", "stageType", "submittedByUserId", "sampleType", "assignedAt", "assignedById", "assignmentNotes", version) VALUES ('e3337c31-63d9-4d01-8711-74321588c7d3', 'PEN/F-2', NULL, 'panadol', NULL, 'Laboratory Receiving Bay', '2026-10-26 05:23:15.049', 100, 'tablets', 'Controlled Room Temp 20-25°C', 'ROUTINE', 'RECEIVED', '[2026-10-26T05:23:15.067Z] Accessioned by Muhammad Ali (QC Analyst) (EMP-ANL-01)', 'PEN/F-2', '2dbe7450-66d7-4561-9fa2-c12a142c2bfe', NULL, '[Formulation]', '2026-10-26 05:23:15.071', '2026-10-26 05:23:15.071', 'ACC-2026-PEN-0014', '2026-10-29 00:00:00', '999', '2026-10-07 00:00:00', 'panadol', 'Muhammad Ali (Quality Control Laboratory)', NULL, NULL, '999', NULL, '2026-10-29 00:00:00', false, 'f734f9fe-8dbc-41e2-8cb9-007c883addc0', 'PENICILLIN', '2026-10-07 00:00:00', 100, 'tablets', NULL, 'ACC-2026-PEN-0014', 'PEN/F-2', '2026-10-26 05:23:15.049', '[Formulation] Vendor Sample', NULL, 'FINISHED_PRODUCT', NULL, NULL, NULL, 1);


--
-- Data for Name: test_specifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, email, "passwordHash", "fullName", "employeeId", department, role, "isActive", "lastLogin", "createdAt", "updatedAt", "hashedRefreshToken", username, assigned_lab, must_change_password) VALUES ('2dbe7450-66d7-4561-9fa2-c12a142c2bfe', 'analyst@citypharma.com', '$2b$10$KAzHKVIPT5xapqha1UEmauWXoReWUFYWVRIHWsGQs5eTJSAwLsdbm', 'Muhammad Ali (QC Analyst)', 'EMP-ANL-01', 'Quality Control Laboratory', 'ANALYST', true, '2026-10-26 07:22:16.448', '2026-10-25 10:34:26.179', '2026-10-26 07:22:28.911', NULL, 'analyst', NULL, true);
INSERT INTO public.users (id, email, "passwordHash", "fullName", "employeeId", department, role, "isActive", "lastLogin", "createdAt", "updatedAt", "hashedRefreshToken", username, assigned_lab, must_change_password) VALUES ('7c0643ab-f765-4359-bf4c-ac31a549a666', 'admin@citypharma.com', '$2b$10$KAzHKVIPT5xapqha1UEmauWXoReWUFYWVRIHWsGQs5eTJSAwLsdbm', 'Dr. Tariq Mahmood (Administrator)', 'EMP-001', 'QC & Administration', 'ADMIN', true, '2026-10-26 06:58:20.236', '2026-10-25 10:34:26.163', '2026-10-26 06:58:20.237', '$2b$10$s2.vqDen1kXo.kJz2COAmeHtutokjzKX71R0CCVZgJvmLMIeHqfnK', 'admin', NULL, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_trails audit_trails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_trails
    ADD CONSTRAINT audit_trails_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: calibration_logs calibration_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_logs
    ADD CONSTRAINT calibration_logs_pkey PRIMARY KEY (id);


--
-- Name: certificates_of_analysis certificates_of_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates_of_analysis
    ADD CONSTRAINT certificates_of_analysis_pkey PRIMARY KEY (id);


--
-- Name: instruments instruments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruments
    ADD CONSTRAINT instruments_pkey PRIMARY KEY (id);


--
-- Name: laboratories laboratories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.laboratories
    ADD CONSTRAINT laboratories_pkey PRIMARY KEY (id);


--
-- Name: oos_incidents oos_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oos_incidents
    ADD CONSTRAINT oos_incidents_pkey PRIMARY KEY (id);


--
-- Name: sample_submissions sample_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_submissions
    ADD CONSTRAINT sample_submissions_pkey PRIMARY KEY (id);


--
-- Name: sample_tests sample_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_tests
    ADD CONSTRAINT sample_tests_pkey PRIMARY KEY (id);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: test_specifications test_specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_specifications
    ADD CONSTRAINT test_specifications_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: audit_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_timestamp_idx ON public.audit_logs USING btree ("timestamp");


--
-- Name: audit_trails_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_trails_action_idx ON public.audit_trails USING btree (action);


--
-- Name: audit_trails_entityName_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_trails_entityName_entityId_idx" ON public.audit_trails USING btree ("entityName", "entityId");


--
-- Name: audit_trails_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_trails_timestamp_idx ON public.audit_trails USING btree ("timestamp");


--
-- Name: batches_batchNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "batches_batchNumber_idx" ON public.batches USING btree ("batchNumber");


--
-- Name: batches_batchNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "batches_batchNumber_key" ON public.batches USING btree ("batchNumber");


--
-- Name: batches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_status_idx ON public.batches USING btree (status);


--
-- Name: calibration_logs_instrumentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "calibration_logs_instrumentId_idx" ON public.calibration_logs USING btree ("instrumentId");


--
-- Name: certificates_of_analysis_batchId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificates_of_analysis_batchId_key" ON public.certificates_of_analysis USING btree ("batchId");


--
-- Name: certificates_of_analysis_certificateNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_of_analysis_certificateNumber_idx" ON public.certificates_of_analysis USING btree ("certificateNumber");


--
-- Name: certificates_of_analysis_certificateNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificates_of_analysis_certificateNumber_key" ON public.certificates_of_analysis USING btree ("certificateNumber");


--
-- Name: instruments_equipmentCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "instruments_equipmentCode_idx" ON public.instruments USING btree ("equipmentCode");


--
-- Name: instruments_equipmentCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "instruments_equipmentCode_key" ON public.instruments USING btree ("equipmentCode");


--
-- Name: instruments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX instruments_status_idx ON public.instruments USING btree (status);


--
-- Name: laboratories_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX laboratories_code_key ON public.laboratories USING btree (code);


--
-- Name: laboratories_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX laboratories_name_key ON public.laboratories USING btree (name);


--
-- Name: oos_incidents_incidentNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "oos_incidents_incidentNumber_idx" ON public.oos_incidents USING btree ("incidentNumber");


--
-- Name: oos_incidents_incidentNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "oos_incidents_incidentNumber_key" ON public.oos_incidents USING btree ("incidentNumber");


--
-- Name: oos_incidents_qaApprovalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "oos_incidents_qaApprovalStatus_idx" ON public.oos_incidents USING btree ("qaApprovalStatus");


--
-- Name: sample_submissions_destinationLaboratory_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sample_submissions_destinationLaboratory_idx" ON public.sample_submissions USING btree ("destinationLaboratory");


--
-- Name: sample_submissions_sampleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sample_submissions_sampleId_idx" ON public.sample_submissions USING btree ("sampleId");


--
-- Name: sample_submissions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sample_submissions_status_idx ON public.sample_submissions USING btree (status);


--
-- Name: sample_tests_resultStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sample_tests_resultStatus_idx" ON public.sample_tests USING btree ("resultStatus");


--
-- Name: sample_tests_sampleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "sample_tests_sampleId_idx" ON public.sample_tests USING btree ("sampleId");


--
-- Name: sample_tests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sample_tests_status_idx ON public.sample_tests USING btree (status);


--
-- Name: samples_accessionNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_accessionNo_idx" ON public.samples USING btree ("accessionNo");


--
-- Name: samples_assignedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_assignedById_idx" ON public.samples USING btree ("assignedById");


--
-- Name: samples_assignedToId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_assignedToId_idx" ON public.samples USING btree ("assignedToId");


--
-- Name: samples_batchLotNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_batchLotNumber_idx" ON public.samples USING btree ("batchLotNumber");


--
-- Name: samples_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_createdAt_idx" ON public.samples USING btree ("createdAt");


--
-- Name: samples_laboratoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_laboratoryId_idx" ON public.samples USING btree ("laboratoryId");


--
-- Name: samples_recordNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_recordNumber_idx" ON public.samples USING btree ("recordNumber");


--
-- Name: samples_sampleCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "samples_sampleCode_key" ON public.samples USING btree ("sampleCode");


--
-- Name: samples_sampleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_sampleId_idx" ON public.samples USING btree ("sampleId");


--
-- Name: samples_sampleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "samples_sampleId_key" ON public.samples USING btree ("sampleId");


--
-- Name: samples_sampledAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "samples_sampledAt_idx" ON public.samples USING btree ("sampledAt");


--
-- Name: samples_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX samples_status_idx ON public.samples USING btree (status);


--
-- Name: test_specifications_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX test_specifications_category_idx ON public.test_specifications USING btree (category);


--
-- Name: test_specifications_testCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "test_specifications_testCode_idx" ON public.test_specifications USING btree ("testCode");


--
-- Name: test_specifications_testCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "test_specifications_testCode_key" ON public.test_specifications USING btree ("testCode");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_employeeId_key" ON public.users USING btree ("employeeId");


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_trails audit_trails_performedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_trails
    ADD CONSTRAINT "audit_trails_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calibration_logs calibration_logs_calibratedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_logs
    ADD CONSTRAINT "calibration_logs_calibratedById_fkey" FOREIGN KEY ("calibratedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: calibration_logs calibration_logs_instrumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_logs
    ADD CONSTRAINT "calibration_logs_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES public.instruments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificates_of_analysis certificates_of_analysis_authorizedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates_of_analysis
    ADD CONSTRAINT "certificates_of_analysis_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certificates_of_analysis certificates_of_analysis_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates_of_analysis
    ADD CONSTRAINT "certificates_of_analysis_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public.batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certificates_of_analysis certificates_of_analysis_sampleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates_of_analysis
    ADD CONSTRAINT "certificates_of_analysis_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES public.samples(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: oos_incidents oos_incidents_qaManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oos_incidents
    ADD CONSTRAINT "oos_incidents_qaManagerId_fkey" FOREIGN KEY ("qaManagerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: oos_incidents oos_incidents_reportedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oos_incidents
    ADD CONSTRAINT "oos_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: oos_incidents oos_incidents_sampleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oos_incidents
    ADD CONSTRAINT "oos_incidents_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES public.samples(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: oos_incidents oos_incidents_sampleTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oos_incidents
    ADD CONSTRAINT "oos_incidents_sampleTestId_fkey" FOREIGN KEY ("sampleTestId") REFERENCES public.sample_tests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sample_submissions sample_submissions_destinationLabId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_submissions
    ADD CONSTRAINT "sample_submissions_destinationLabId_fkey" FOREIGN KEY ("destinationLabId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sample_submissions sample_submissions_sampleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_submissions
    ADD CONSTRAINT "sample_submissions_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES public.samples(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sample_submissions sample_submissions_submittedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_submissions
    ADD CONSTRAINT "sample_submissions_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sample_tests sample_tests_analystId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_tests
    ADD CONSTRAINT "sample_tests_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sample_tests sample_tests_instrumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_tests
    ADD CONSTRAINT "sample_tests_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES public.instruments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sample_tests sample_tests_sampleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_tests
    ADD CONSTRAINT "sample_tests_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES public.samples(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sample_tests sample_tests_testSpecificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_tests
    ADD CONSTRAINT "sample_tests_testSpecificationId_fkey" FOREIGN KEY ("testSpecificationId") REFERENCES public.test_specifications(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: samples samples_accessionedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_accessionedById_fkey" FOREIGN KEY ("accessionedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: samples samples_assignedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: samples samples_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: samples samples_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public.batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: samples samples_laboratoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES public.laboratories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: samples samples_receivedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: samples samples_submittedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT "samples_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--
