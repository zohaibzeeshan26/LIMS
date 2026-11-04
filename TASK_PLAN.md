# LIMS — Task Plan & Execution Tracker

> **Document Status:** Active  
> **Repository:** [https://github.com/zohaibzeeshan26/LIMS](https://github.com/zohaibzeeshan26/LIMS)  
> **Last Updated:** November 2026

---

## 1. Operating Instructions

1. **Before Every Task:**
   - Review `PROJECT_CONTEXT.md` for architecture, file map, ports, and operational conventions.
   - Review `TASK_PLAN.md` for current task status and recent completed work.
2. **For Small Changes (Targeted UI, Bug fixes, or Endpoint tweaks):**
   - Skip deep codebase re-exploration.
   - Directly locate and edit the necessary file(s).
   - Verify with targeted check (e.g., `npx tsc --noEmit` or API test).
   - Update `TASK_PLAN.md` under **Recent Completed Work**.
3. **For Complex Changes (New features, schema migrations, multi-module updates):**
   - Fill in the **Current Task Specification** below with discrete phases and files involved.
   - Execute step-by-step.
   - Test end-to-end.
   - Update `TASK_PLAN.md` upon completion.
4. **Git Push Rule:**
   - Only execute `git push` when the user explicitly instructs to push to GitHub (mandated by `AGENTS.md`).

---

## 2. Current Task Specification

- **Task Name:** Quality Review & Certificate (CoA)
- **Status:** `COMPLETED`
- **Objective:**
  1. Add dedicated "Quality Review & Certificate (CoA)" module card on the Portal Dashboard (`/`).
  2. Implement comprehensive Quality Review & CoA workspace (`/quality-review` and alias `/coa`):
     - **Tab 1: Review Queue & Disposition**: View all QC test results against pharmacopeial specifications (min/max limits), evaluate compliance, and execute QA Release/Reject disposition with QA comments and audit trail.
     - **Tab 2: Certificate of Analysis (CoA) Archive**: Search and browse all generated certificates (`COA-YYYY-XXXX`), view digital signatures (SHA-256 hash, authorized signatory, release timestamp), and render official printable/exportable cGMP certificates.
  3. Official Printable Certificate of Analysis (CoA) matching pharmaceutical industry standards with company header, logo, analytical monograph reference, test results table, and 21 CFR Part 11 verification.
  4. Integrate navigation link in sidebar (`frontend/src/components/layout/Sidebar.tsx`).
  5. Backend APIs: `GET /batches/coas` for CoA history, `POST /batches/coa` for certificate generation with SHA-256 hash, and `PATCH /batches/:id/release` for QA disposition.
- **Files Involved:**
  - `frontend/src/app/quality-review/page.tsx`
  - `frontend/src/app/coa/page.tsx`
  - `frontend/src/app/page.tsx`
  - `frontend/src/components/layout/Sidebar.tsx`
  - `backend/src/routes/batches.routes.ts`
  - `backend/src/controllers/batches.controller.ts`
  - `backend/src/services/batches.service.ts`
  - `run_all.ps1`
  - `START_LIMS.bat`

---

## 3. Recent Completed Work History

| Date | Feature / Task | Files Involved | Summary |
|---|---|---|---|
| **2026-11-04** | Quality Review & Certificate (CoA) Module | `frontend/src/app/quality-review/page.tsx`, `frontend/src/app/coa/page.tsx`, `frontend/src/app/page.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `backend/src/services/batches.service.ts`, `backend/src/routes/batches.routes.ts` | Created dedicated Quality Review & CoA module with batch review queue, pharmacopeial limit conformance checking, QA disposition (Release/Reject), 21 CFR Part 11 SHA-256 digital signature CoA generation, official printable certificate sheet, CoA archive, and portal + sidebar navigation. |
| **2026-11-04** | Next.js ChunkLoadError Resolution | Frontend `.next` cache, `run_all.ps1` | Removed stale/interrupted `.next` build cache, rebuilt production bundle successfully (`npm run build`), fixed runtime chunk loading timeout, and verified HTTP 200 response. |
| **2026-11-04** | Documentation Manager Module & Word Documents (.docx/.doc) | `backend/`, `frontend/` (17 files) | Built complete Documentation Manager role, `/documentation-manager` dashboard with product selector & autofill, Word document upload/download with versioning (v1, v2...), read-only access for Analysts on `/testing`, display on `/products`, and user management integration. |
| **2026-11-03** | Planning & Context System Setup | `PROJECT_CONTEXT.md`, `TASK_PLAN.md` | Created comprehensive project context reference and task execution tracker to eliminate repeated codebase exploration in future tasks. |
| **2026-11-03** | GitHub Repository Push | Workspace Root | Configured Git credentials and successfully pushed the full working project and commit history to `https://github.com/zohaibzeeshan26/LIMS` (branch `main`). |
| **2026-11-03** | Backend Runtime & DB Connection Fix | `backend/src/config/env.ts`, `backend/src/config/prisma.ts`, `backend/.env` | Fixed `.env` resolution paths, connected backend to PostgreSQL 18 with local password, created `city_pharma_lims` database, and restored full schema/data dump (`city_pharma_lims_complete.sql`). |
| **2026-11-03** | Performance Optimization | `backend/` | Pre-compiled backend TypeScript (`npx tsc`) into `dist/`, eliminating `ts-node` runtime compilation overhead for instant startup and responses. |
| **2026-11-03** | Environment Initialization | `backend/`, `frontend/` | Downloaded project files, installed Node.js 20 LTS, installed npm dependencies for both frontend and backend, generated Prisma client, and launched dev servers. |
| **2026-10-27** | User Management & Role Control | `backend/src/services/users.service.ts`, `frontend/src/app/users/page.tsx` | Added full User Management directory table with search, add, edit, and 21 CFR Part 11 safe deactivation. |
| **2026-10-27** | Workspace Full-Width Redesign | `AppShell.tsx`, `NewSampleModal.tsx` | Replaced persistent global sidebar with full-width workspace and top branding bar. Made sample creation a distraction-free full screen view. |
| **2026-10-20** | Multi-Lab RBAC & Isolation | `sampling.service.ts`, `samples/page.tsx`, `lims.ts` | Enforced strict laboratory isolation across General, Cephalosporin, and Penicillin laboratories. |

---

## 4. Upcoming Task Template (For Future Tasks)

```markdown
### Task: [Task Title]
- **Status:** `[PENDING | IN_PROGRESS | COMPLETED]`
- **Target Files:**
  - `path/to/file1`
  - `path/to/file2`
- **Implementation Steps:**
  1. [Step 1]
  2. [Step 2]
  3. [Verification Step]
```
