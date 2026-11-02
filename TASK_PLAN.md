# LIMS — Task Plan & Execution Tracker

> **Document Status:** Active  
> **Repository:** [https://github.com/Zohaibzeeshan0/LIMS](https://github.com/Zohaibzeeshan0/LIMS)  
> **Last Updated:** October 2026

---

## 1. Operating Instructions

1. **Before Every Task:**
   - Review `PROJECT_CONTEXT.md` for architecture, file locations, and operational conventions.
   - Review `TASK_PLAN.md` for current state and recent change history.
2. **For Small Changes (Targeted UI/Logic tweaks):**
   - Skip deep codebase analysis.
   - Directly edit target files.
   - Verify with `npx tsc --noEmit`.
   - Update `TASK_PLAN.md` under **Recent Completed Work**.
3. **For Complex Changes (New features, schema migrations, multi-module updates):**
   - Fill in the **Current Task Specification** below.
   - Break down into discrete phases.
   - Execute step-by-step.
   - Validate end-to-end.
   - Record completion and push to GitHub.

---

## 2. Current Task Specification

- **Task Name:** Laboratory-Level Role-Based Access Control (SAF, Penicillin, General Isolation)
- **Status:** `COMPLETED`
- **Objective:**
  1. Restrict SAF / SEF Lab staff to SAF / SEF Lab only (cannot open, view, or enter data for Penicillin or General Lab).
  2. Restrict Penicillin Lab staff to Penicillin Lab only (cannot open, view, or enter data for SAF or General Lab).
  3. Restrict General Lab staff to General Lab only (cannot open, view, or enter data for SAF or Penicillin Lab).
  4. Ensure Administrator (`Role.ADMIN`) maintains unrestricted administrative access to switch between and manage all 3 laboratories.
  5. Enforce on both frontend (UI card locks, URL route interceptors, modal pre-locks) and backend (`findAll`, `create`, `findOne`, `getSampleMetrics`, `submitToWorkflow`).
- **Files Involved:**
  - `backend/src/sampling/sampling.service.ts`
  - `backend/src/sampling/sampling.controller.ts`
  - `frontend/src/types/lims.ts`
  - `frontend/src/context/AuthContext.tsx`
  - `frontend/src/app/samples/page.tsx`
  - `frontend/src/components/samples/NewSampleModal.tsx`
  - `frontend/src/app/login/page.tsx`
- **Checklist:**
  - [x] Implement `getUserAssignedLab` helper and enforce lab filtering in `backend/src/sampling/sampling.service.ts`.
  - [x] Enforce lab authorization validation in `create` endpoint to block cross-lab accessioning with 403 Forbidden.
  - [x] Pass `req.user` in `backend/src/sampling/sampling.controller.ts` for `findAll`, `getMetrics`, and `findOne`.
  - [x] Export `LaboratoryAccess` and `getUserLabAccess` helper in `frontend/src/types/lims.ts`.
  - [x] Update `DEMO_USERS` in `AuthContext.tsx` to provide 1-click personas for SAF, Penicillin, General, and Admin.
  - [x] Enforce strict lab locking in `frontend/src/app/samples/page.tsx`: disable other lab cards with lock badges, auto-lock URL, hide "All Labs" toggle for non-admins.
  - [x] Lock Laboratory select in `frontend/src/components/samples/NewSampleModal.tsx` to the user's assigned lab.
  - [x] Add 1-click persona buttons for each lab on `frontend/src/app/login/page.tsx`.
  - [x] Verify TypeScript compile (`tsc --noEmit`) passes with 0 errors on both frontend and backend.
  - [x] Run integration test `verify_lab_rbac.js` verifying 403 Forbidden cross-facility blocking and isolated query results.
  - [x] Commit and push to GitHub repository.

---

## 3. Recent Completed Work History

| Date / Commit | Feature / Change | Key Files Modified | Summary |
|---|---|---|---|
| **2026-10-27** | User Management & Role Control | `backend/src/services/users.service.ts`, `backend/src/controllers/users.controller.ts`, `backend/src/routes/users.routes.ts`, `backend/src/users/users.service.ts`, `backend/src/users/users.controller.ts`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/app/users/page.tsx`, `frontend/src/services/user.service.ts`, `frontend/src/lib/api.ts`, `frontend/src/types/lims.ts` | Added fully functional User Management to Citi Pharma LIMS: KPI card on Dashboard (`/dashboard`) linking to `/users`, dedicated Personnel Directory table with Search/Filters (Role, Lab, Status), Add User Modal with bcrypt hashing, View User Screen with activity counts & live Role Change for admins, Edit User Modal with password reset, and Delete User with 21 CFR Part 11 safe deactivation. |
| **2026-10-27** | Global Sidebar Removal & Full-Width Workspace | `AppShell.tsx` | Completely removed the dark navy sidebar from all pages per user request. Replaced with an ultra-clean workspace top bar featuring "← Back to Portal Hub", official "Citi Pharma LIMS" logo, and Sign Out action, giving all sample tables 100% full-width room. |
| **2026-10-27** | Full-Screen Sample Creation View | `NewSampleModal.tsx` | Transformed sample addition into a distraction-free full-screen screen. Completely eliminated the sidebar and background clutter, showing only a working "Back" button, official "Citi Pharma" logo, and "LIMS" badge at the top per user requirement. |
| **2026-10-27** | Samples Page Top Lab Switcher Removal | `samples/page.tsx` | Completely removed the redundant "SELECT ANALYTICAL LABORATORY" top switcher box from the samples page, since users now choose their laboratory prior to entering the workspace. |
| **2026-10-27** | Sample Lab 3-Laboratory Selection Modal | `page.tsx` | Intercepted "Sample Lab" portal card click to display an interactive modal with 3 lab options: General Lab, Penicillin Lab, and Cephalosporin Lab. Clicking any lab directly loads that specific laboratory's filtered dataset (`/samples?lab=...`). |
| **2026-10-27** | Welcome Banner Title Update | `page.tsx` | Updated main welcome banner heading from user name to "Welcome to Citi Pharma" per user request. |
| **2026-10-27** | Top Portal User Name & Title Removal | `page.tsx` | Removed "Dr. Tariq Mahmood / Master Administrator" text from the top right bar of the Portal Hub page per user request, retaining only the clean Sign Out action. |
| **2026-10-27** | Multi-Lab Quick Strip Removal | `page.tsx` | Removed "City Pharma Analytical Laboratories" bottom quick-status card strip from the Portal Hub page per user request. |
| **2026-10-27** | Portal Hub Sidebar Removal | `AppShell.tsx`, `page.tsx` | Removed sidebar entirely from Portal Hub (`/`), giving the welcome launchpad full width with a dedicated top branding & Sign Out bar. Kept sidebar active on workspace pages (`/samples`, `/dashboard`, etc.). |
| **2026-10-27** | Top Header Bar Removal | `AppShell.tsx`, `Sidebar.tsx` | Completely removed the top header navbar per user request. Relocated user avatar, full name, role, and Sign Out button cleanly to the bottom of the persistent dark navy sidebar. |
| **2026-10-20** | RBAC Admin-Only Edit & Lab Subsections (Semi Basics / Formulation) | `samples/page.tsx`, `NewSampleModal.tsx`, `EditSampleModal.tsx`, `sampling.service.ts`, `samples.controller.ts`, `lims.ts` | Restricted all sample record edits strictly to Administrator (non-admins can only enter new data). Added interactive Semi Basics & Formulation subsections inside all 3 Labs (Cephalosporin, Penicillin, General) with partitioned stage categories and sample records. |
| **2026-10-20** | Dashboard KPI Cards Overhaul | `page.tsx`, `samples/page.tsx`, `sampling.service.ts` | Actual DB counts, removed percentage/trend sublines, and added click-through navigation for Total, Received, Active Batches, and Approved. |
| **2026-10-20** (`86a5ee2`) | API Network Error Handling | `frontend/src/lib/api.ts` | Wrapped fetch in try/catch to catch connection drops gracefully. |
| **2026-10-20** (`b77c25a`) | Quantity Units & All Emergency Records | `NewSampleModal.tsx`, `EditSampleModal.tsx`, `page.tsx`, `sampling.service.ts` | Quantity unit restricted to Tablets, Capsules, Raw Data, Other (with manual text input). Dashboard admin priority banner displays all expedited samples without limit. |
| **2026-10-20** (`b602fe6`) | Remove Analytical Unit Header | `frontend/src/app/samples/page.tsx` | Removed "SELECT ANALYTICAL UNIT • Click any laboratory to filter records" text from samples page. |
| **2026-10-20** (`382c3a6`) | Planning & Context System Init | `PROJECT_CONTEXT.md`, `TASK_PLAN.md` | Created persistent architectural guide and task plan tracking documents. |
| **2026-10-20** (`5c0e0a4`) | Sample Modal Form Cleanup | `frontend/src/components/samples/NewSampleModal.tsx` | Removed "Storage Condition" input and "Assign Compendial Tests" selection section. Retained Priority selector and dynamic SLA notice banner. |
| **2026-10-20** (`1bfbe0e`) | Priority SLA Targets & Admin Alerts | `frontend/src/components/samples/NewSampleModal.tsx`, `backend/src/sampling/sampling.service.ts`, `frontend/src/app/page.tsx` | Added 5-day SLA for Routine, 2-day for Urgent, and 24-hour for Immediate. Configured automatic Admin notification banner & Navbar alerts on Urgent/Immediate samples. |
| **2026-10-20** (`52f8645`) | Dashboard Pending Sample Routing | `frontend/src/app/page.tsx`, `frontend/src/app/samples/page.tsx` | Clicking a pending sample on Dashboard redirects directly to that specific laboratory tab (SAF, SEF, PENICILLIN, GENERAL) with sample detail modal automatically opened. |
| **2026-10-20** (`634eb7b`) | Lab Activity Log Filter Cleanup | `frontend/src/app/page.tsx` | Removed numeric counters from "All" and "Staff" tabs in the Activity Log filter bar, leaving clean titles. |
| **2026-10-20** (`f2a8904`) | System Info Table Removal | `frontend/src/app/page.tsx` | Removed redundant System Information card/table from the Executive Dashboard per user request. |
| **2026-10-20** (`8f95c51`) | Non-Admin Activity Tracking & Alerts | `backend/src/audit-logs/audit-logs.service.ts`, `frontend/src/components/layout/Navbar.tsx` | Recorded audit log for any non-admin staff action with real-time notification alert displayed to Admin. |
| **2026-10-20** (`c278918`) | Login Page Branding & Redesign | `frontend/src/app/login/page.tsx` | Redesigned login portal with City Pharma branding, responsive split card layout, and demo credentials box. |

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
  3. [Step 3]
- **Verification Plan:**
  - Run `npx tsc --noEmit`
  - Verify in browser / API
  - Commit & push to `origin main`
```
