# City Pharma LIMS — Project Context & Architecture Guide

> **Document Version:** 2.0.0  
> **Repository:** [https://github.com/zohaibzeeshan26/LIMS](https://github.com/zohaibzeeshan26/LIMS)  
> **Last Verified:** November 2026  
> **Purpose:** Authoritative single source of truth for the codebase to eliminate repeated exploration, accelerate future feature development, and ensure 100% correctness across frontend and backend.

---

## 1. System Overview & Pharmaceutical Domain

City Pharma **LIMS** (Laboratory Information Management System) is an enterprise pharmaceutical cGMP system designed for Citi Pharma (Pakistan) adhering to FDA 21 CFR Part 11 and ALCOA+ data integrity standards.

### Key Capabilities:
1. **Multi-Laboratory Sample Accession & Intake:**
   - **General Lab (`GENERAL`):** Oral Solids, Liquids, Non-sterile production (Sample Prefix: `GL/SB-`, `GL/F-`)
   - **Cephalosporin Lab (`CEPHALOSPORIN`):** Sterile Cephalosporins (Sample Prefix: `CEPH/SB-`, `CEPH/F-`)
   - **Penicillin Lab (`PENICILLIN`):** Dedicated Penicillin Block (Sample Prefix: `PEN/SB-`, `PEN/F-`)
2. **Lab Sub-Sections:**
   - **Semi Basics (`semi-base`):** Raw materials, quarantine samples, in-process testing.
   - **Formulation (`formulation`):** Finished products, coated tablets, injections.
3. **Analytical Testing Worksheets:** Execution of compendial tests (USP/BP/Ph.Eur/In-House), recording raw and calculated assay results, limits validation.
4. **Out-of-Specification (OOS):** Phase I laboratory investigations, root cause analysis, QA disposition.
5. **Batch Release & CoA:** Quarantine-to-release workflow with digital verification and Certificate of Analysis generation.
6. **ALCOA+ Audit Trail:** Immutable audit logs (`audit_logs` & `audit_trails`) tracking user, timestamp, prior value, and new value.

---

## 2. Technology Stack Mandate

* **Frontend:** Next.js 14.2 (App Router) + React 18 + Tailwind CSS 3.4 + TanStack React Query v5
* **Backend:** Node.js 20 LTS + Express / NestJS Architecture + TypeScript 5.4
* **Database:** PostgreSQL 18 (Prisma ORM 5.13+)
* **Authentication:** JWT (Access: 15min, Refresh: 7d) with role-based & laboratory isolation

### Running Ports & Services:
| Service | URL / Port | Protocol / Path | Start Command |
|---|---|---|---|
| **Frontend** | `http://localhost:3000` | HTTP | `npm run dev` (in `frontend/`) |
| **Backend API** | `http://localhost:5000` | HTTP (`/api/v1`) | `node dist/src/server.js` or `npm run dev` (in `backend/`) |
| **PostgreSQL** | `localhost:5432` | TCP (DB: `city_pharma_lims`) | Windows Service (`postgresql-x64-18`) |

---

## 3. Key Directory Structure & File Map

```
Star LIMS/
├── PROJECT_CONTEXT.md                   # THIS FILE - Read before every task
├── TASK_PLAN.md                         # Active implementation tracker & history
├── AGENTS.md                            # Stack rules & git push constraints
├── README.md                            # Operational guide & credentials
├── city_pharma_lims_complete.sql        # Database schema + initial data dump
│
├── backend/                             # API Server (Port 5000, Base: /api/v1)
│   ├── .env                             # PORT=5000, DATABASE_URL, JWT secrets
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema (PostgreSQL)
│   │   ├── seed.ts                      # Database seed logic
│   ├── src/
│   │   ├── server.ts                    # Server entrypoint & DB connection test
│   │   ├── app.ts                       # Express app bootstrap, CORS, route mounting
│   │   ├── config/
│   │   │   ├── env.ts                   # Environment variables loader
│   │   │   └── prisma.ts                # PrismaClient singleton instance
│   │   ├── auth/ & services/auth.service.ts # Authentication, passwords, JWT tokens
│   │   ├── sampling/ & services/sampling.service.ts # Core sample accession & lab routing
│   │   ├── samples/                     # Sample lifecycle & approvals
│   │   ├── batches/                     # Batch records & release management
│   │   ├── oos/                         # Out-of-Specification workflows
│   │   ├── audit-logs/ & audit/         # 21 CFR Part 11 audit trails
│   │   └── laboratories/                # Lab modules & instrument calibrations
│   ├── dist/                            # Compiled JS output for high-performance execution
│   └── package.json
│
└── frontend/                            # Next.js App Router Client (Port 3000)
    ├── .env                             # NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx               # Root layout & React Query provider
    │   │   ├── page.tsx                 # Portal Launchpad / Executive Dashboard
    │   │   ├── login/page.tsx           # Login portal with quick role personas
    │   │   ├── samples/page.tsx         # Samples registry (3 labs × 2 sections)
    │   │   ├── testing/page.tsx         # Electronic analytical testing worksheets
    │   │   ├── batches/page.tsx         # Batch records & CoA tracking
    │   │   ├── oos/page.tsx             # OOS investigations
    │   │   ├── audit/page.tsx           # Audit trail explorer
    │   │   └── users/page.tsx           # User management directory (Admin only)
    │   ├── components/
    │   │   ├── layout/                  # Navbar.tsx, Sidebar.tsx, AppShell.tsx
    │   │   ├── samples/                 # NewSampleModal, EditSampleModal, PrintSampleModal
    │   │   └── ui/                      # Modal.tsx, Button.tsx, Badge.tsx, StatCard.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx          # Session state, JWT storage, role verification
    │   ├── lib/
    │   │   ├── api.ts                   # HTTP client with auto-refresh token handling
    │   │   └── date.ts                  # Timezone-aware date helpers
    │   ├── services/                    # Typed API service wrappers
    │   └── types/
    │       └── lims.ts                  # TypeScript interfaces & getUserLabAccess helper
    └── package.json
```

---

## 4. Authentication & Credentials

* **Super Admin (Full System Access):**
  * Username / Email: `admin` / `admin@citypharma.com`
  * Password: `admin` or `lims123` or `Admin@1234`
  * Role: `ADMIN`
* **QC Analysts & Lab Personas:**
  * General Lab: `analyst` or `general` (Password: `lab123` or `gen123`)
  * Penicillin Lab: `penicillin` (Password: `pen123`)
  * Cephalosporin Lab: `cephalosporin` (Password: `ceph123`)
  * Nasir (0012): `0012` (Password: `123456`)

---

## 5. Standard Development & Verification Commands

| Action | Working Directory | Command |
|---|---|---|
| **Build Backend** | `backend/` | `npx tsc` |
| **Start Backend** | `backend/` | `node dist/src/server.js` |
| **Start Frontend** | `frontend/` | `npm run dev` |
| **Type Check Frontend** | `frontend/` | `npx tsc --noEmit` |
| **Prisma Generate** | `backend/` | `npx prisma generate` |
| **Git Push** *(User instructed only)* | Workspace Root | `git push origin main` |

---

## 6. Rules for Fast & Correct Future Tasks

1. **Read First:** Check `PROJECT_CONTEXT.md` and `TASK_PLAN.md` before touching code.
2. **Small Changes:** Skip broad codebase scans. Identify target file from Section 3, edit directly, verify, and finish.
3. **Complex Tasks:** Outline the plan in `TASK_PLAN.md`, implement incrementally, and update status.
4. **Preserve Services:** Do not kill running background dev servers unless modifying `.env` or Prisma schema.
5. **Respect `AGENTS.md`:** Only perform `git push` when the user explicitly requests it.
