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

- **Task Name:** Setup Markdown-Based Project Planning & Context System
- **Status:** `COMPLETED`
- **Objective:**
  1. Inspect the project and establish `PROJECT_CONTEXT.md` documenting tech stack, structure, architecture, and commands.
  2. Maintain `TASK_PLAN.md` for tracking active implementation steps, files involved, and status.
  3. Ensure future agent runs read these files first to minimize repeated codebase exploration and complete tasks faster without compromising correctness.
- **Files Involved:**
  - `PROJECT_CONTEXT.md`
  - `TASK_PLAN.md`
  - `AGENTS.md`
- **Checklist:**
  - [x] Comprehensive inspection of backend, frontend, database, and repository configuration.
  - [x] Updated `PROJECT_CONTEXT.md` with accurate ports (`5000` / `3000`), tech stack, file map, and credentials.
  - [x] Updated `TASK_PLAN.md` with operational rules, recent history, and future task template.
  - [x] Verified compatibility with `AGENTS.md` rules.

---

## 3. Recent Completed Work History

| Date | Feature / Task | Files Involved | Summary |
|---|---|---|---|
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
