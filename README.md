# City Pharma LIMS — Complete Project Reference

> **AI AGENT INSTRUCTION:** READ THIS FILE FIRST before starting any task.
> This file contains all critical project information. Use it to avoid re-exploring the codebase every time.
> After completing any task, update the "Recent Changes History" section below.

---

## Project Overview

**City Pharma LIMS** (Laboratory Information Management System) is an enterprise-grade pharmaceutical cGMP system for **Citi Pharma** (Pakistan). It manages:
- Sample accession and intake across 3 analytical laboratories
- Analytical testing workflows and electronic worksheets
- Out-of-Specification (OOS) investigations
- Batch release and Certificates of Analysis (CoA)
- ALCOA+ compliant audit trail (FDA 21 CFR Part 11)

**GitHub:** https://github.com/Zohaibzeeshan0/LIMS

---

## Running Servers

| Service | URL | Port | Start Command |
|---|---|---|---|
| Backend (Node.js + Express) | http://localhost:5000/api/v1 | 5000 | `npm run dev` (in backend/) |
| Frontend (Next.js) | http://localhost:3000 | 3000 | `npm run dev` (in frontend/) |
| PostgreSQL | localhost:5432 | 5432 | Windows service / pg_ctl |

**NEVER stop dev servers unless schema or .env changes.**

---

## Login Credentials

### Admin (Full Access)
- Email: admin@citypharma.com
- Password: Admin@1234
- Name: Dr. Tariq Mahmood
- Employee ID: EMP-001
- Role: ADMIN

### Staff & Laboratory Analysts (Password: Admin@1234 / Password@123)
| Name | Email | Role | Access |
|---|---|---|---|
| Dr. Tariq Mahmood | admin@citypharma.com | ADMIN | Full System Access (All 3 Labs & Dashboard) |
| Fatima Noor | qa.manager@citypharma.com | QA_MANAGER | All 3 Labs (QA Approvals & Auditing) |
| Zubair Raza | gen.analyst@citypharma.com | ANALYST | General Lab only |
| Cephalosporin Lab Analyst | ceph.analyst@citypharma.com | QC_ANALYST | Cephalosporin Lab only |
| Penicillin Lab Analyst | pen.analyst@citypharma.com | QC_ANALYST | Penicillin Lab only |
| Ayesha Farooq | auditor@citypharma.com | AUDITOR | All 3 Labs (Read-Only 21 CFR Part 11) |
| Bilal Raza | lab.tech@citypharma.com | LAB_TECHNICIAN | Laboratory Operations |

---

## 3 Analytical Laboratories

| Lab | Sample Prefix | Code | Badge | Color |
|---|---|---|---|---|
| General Lab | GL/SB- / GL/F- | GENERAL | GL | Blue |
| Cephalosporin Lab | CEPH/SB- / CEPH/F- | CEPHALOSPORIN | CEPH | Purple |
| Penicillin Lab | PEN/SB- / PEN/F- | PENICILLIN | PEN | Teal |

### Seeded Sample Counts (PostgreSQL)
- General Lab: 21 samples (GL/SB-1..12, GL/F-1..9)
- Cephalosporin Lab: 10 samples - Cefixime, Ceftriaxone, Cefuroxime, Cefaclor
- Penicillin Lab: 9 samples - Amoxicillin, Ampicillin, Co-Amoxiclav, Piperacillin/Tazobactam

### Each Lab Has 2 Sub-Sections
1. Semi Basics - Raw materials, quarantine samples, in-process checks
2. Formulation - Finished products, coated tablets, injections

### Lab URL Navigation
- /samples?lab=general
- /samples?lab=cephalosporin
- /samples?lab=penicillin
- /samples?lab=general&section=semi-base
- /samples?lab=general&section=formulation

---



## Database Settings

| Setting | Value |
|---|---|
| DB Engine | PostgreSQL 18 |
| DB Name | city_pharma_lims |
| Host | localhost:5432 |
| Username | postgres |
| Password | shan7991 |
| Full URL | postgresql://postgres:shan7991@localhost:5432/city_pharma_lims?schema=public |

### Key Tables
- User - Staff accounts, roles, departments
- Sample - All sample records with laboratoryType, section, status
- Batch - Drug product batches
- AuditLog - Immutable audit trail
- TestAssignment - Analyst test assignments

---

## Technology Stack

### Backend (backend/)
| Component | Tech | Version |
|---|---|---|
| Framework | NestJS | 10.3.8 |
| Language | TypeScript | 5.4 |
| ORM | Prisma | 5.13.0 |
| Database | PostgreSQL | 18 |
| Auth | JWT (Passport.js) | Access: 15min, Refresh: 7d |
| API Prefix | /api/v1 | All routes |

### Frontend (frontend/)
| Component | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.3 |
| UI | React | 18.3.1 |
| State | TanStack React Query | v5 |
| Styling | Tailwind CSS | 3.4.3 |
| Icons | Lucide React | 0.372.0 |
| Forms | React Hook Form + Zod | - |

---

## Project Directory Structure

```
f:\Star LIMS\
├── README.md                         <- THIS FILE - read first
├── AGENTS.md                         <- Git push restriction rule
├── PROJECT_CONTEXT.md                <- Detailed architecture guide
├── TASK_PLAN.md                      <- Task history
├── backend/
│   ├── .env                          <- DB URL, JWT, ports
│   ├── prisma/schema.prisma          <- Database schema
│   └── src/
│       ├── main.ts                   <- Bootstrap, global prefix /api/v1
│       ├── app.module.ts             <- Root module
│       ├── auth/                     <- Login, JWT, refresh tokens
│       ├── sampling/                 <- MAIN MODULE: sample accession
│       │   ├── sampling.controller.ts
│       │   ├── sampling.service.ts   <- Core logic, lab routing
│       │   └── dto/
│       ├── samples/                  <- Sample lifecycle and approvals
│       ├── batches/                  <- Batch management
│       ├── users/                    <- User management
│       ├── audit-logs/               <- 21 CFR Part 11 audit trail
│       ├── laboratories/             <- Lab modules
│       ├── tests/                    <- Test specifications
│       ├── oos/                      <- OOS investigations
│       └── common/                   <- Guards, decorators, filters
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx              <- Executive Dashboard (Admin only)
        │   ├── login/page.tsx        <- Login portal
        │   ├── priority-notice/page.tsx <- Dedicated Expedited Priority Queue Screen
        │   ├── samples/page.tsx      <- Main samples registry (3 labs + 2 sections)
        │   ├── testing/page.tsx      <- Analytical testing worksheets
        │   ├── batches/page.tsx      <- Batch records
        │   ├── oos/page.tsx          <- OOS investigations
        │   └── audit/page.tsx        <- Audit trail explorer
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.tsx        <- Top navbar (clock, alerts, user menu)
        │   │   ├── Sidebar.tsx       <- Left nav (3 labs permanently visible)
        │   │   └── SystemClock.tsx   <- Live date/time (date on top, time below)
        │   └── samples/
        │       ├── NewSampleModal.tsx
        │       ├── EditSampleModal.tsx
        │       ├── PrintSampleModal.tsx
        │       └── SubmitSampleModal.tsx
        ├── context/
        │   └── AuthContext.tsx       <- User session, authentic staff login
        ├── lib/
        │   ├── api.ts                <- HTTP client with auto JWT refresh
        │   └── date.ts               <- formatLiveDate, formatLiveClock helpers
        ├── services/
        │   └── sampling.service.ts   <- API calls for samples/metrics
        └── types/
            └── lims.ts               <- All TypeScript interfaces + getUserLabAccess()
```

---

## Role-Based Access Control (RBAC)

### Roles Available
ADMIN, QA_MANAGER, AUDITOR, QC_ANALYST, ANALYST, LAB_TECHNICIAN

### Lab Access by Role
| Role | Dashboard | Lab Access | Can Edit Samples |
|---|---|---|---|
| ADMIN | Yes | All 3 Labs | Yes |
| QA_MANAGER | No (redirect) | All 3 Labs | No |
| AUDITOR | No (redirect) | All 3 Labs (read-only) | No |
| QC_ANALYST / ANALYST | No (redirect) | Dept-based 1 Lab | No |
| LAB_TECHNICIAN | No (redirect) | Dept-based 1 Lab | No |

### Lab Access Logic (frontend/src/types/lims.ts -> getUserLabAccess())
- Email/username contains "pen" -> PENICILLIN
- Email/username contains "ceph" or "saf" -> CEPHALOSPORIN
- Email/username contains "gen" -> GENERAL
- ADMIN and QA_MANAGER -> ALL

---

## UI Design System

- Sidebar: Dark Navy #0B1A30
- Primary Blue: #0066FF
- Active nav item: bg-[#0066FF] text-white
- Cards: White bg, border border-slate-200/80, shadow-xs
- Border radius: rounded-xl (12px), rounded-2xl (16px)

### Priority Colors
| Priority | Color | SLA |
|---|---|---|
| ROUTINE | Gray/Slate | 5 Days |
| URGENT | Amber/Orange | 2 Days |
| STAT | Rose/Red (pulsing) | 24 Hours |

---

## Key API Endpoints

All routes prefixed with /api/v1

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/login | Returns { accessToken, refreshToken, user } |
| POST | /auth/refresh | Refresh expired token |
| GET | /sampling | Get samples (filters: laboratory, section, status, priority, search, page, limit) |
| POST | /sampling | Create new sample |
| PATCH | /sampling/:id | Update sample |
| GET | /sampling/metrics | Returns { total, received, approved, byLab: { general, penicillin, cephalosporin } } |
| GET | /sampling/next-sample-id | Preview next auto-generated sample code |
| GET | /audit-logs | Get audit trail |
| GET | /batches | Get batches list |
| GET | /users | Get users (admin only) |

**IMPORTANT:** JWT token key is "accessToken" (not "access_token") in login response.

---

## Development Commands

| Task | Directory | Command |
|---|---|---|
| Start Backend | backend/ | npm run start:dev |
| Start Frontend | frontend/ | npm run dev |
| TypeScript Check | frontend/ | npx tsc --noEmit --skipLibCheck |
| Prisma Generate | backend/ | npm run prisma:generate |
| Prisma Push | backend/ | npm run prisma:push |
| Prisma Studio | backend/ | npm run prisma:studio |
| Run Seed | backend/ | npm run prisma:seed |

**PowerShell Note:** Use semicolon ";" not "&&" to chain commands in PowerShell.
**Git Push Rule:** NEVER run git push automatically. Only push when user explicitly says "push to GitHub".

---

## Session / Token Keys (Frontend)

- cp_lims_token -> JWT access token
- cp_lims_refresh_token -> Refresh token
- cp_lims_user -> User object JSON
- cp_admin_read_alerts -> Read notification IDs (sessionStorage)

---

## Important Business Rules

1. Only ADMIN can edit existing samples. All other roles can only create new samples.
2. Sample codes auto-generate: GL/SB-001, CEPH/F-002, PEN/SB-003 based on lab + section.
3. Storage Condition is hardcoded to "Controlled Room Temp 20-25 degrees C" - not shown in form.
4. Compendial Tests selection removed from accession form - defaults to empty [].
5. Audit trail is immutable - every change is logged with user, timestamp, old value, new value.
6. Dashboard is Admin-only. Non-admin users are auto-redirected to /samples.
7. 3 Lab cards are shown on Executive Dashboard with live counts from metrics.byLab API.
8. Sidebar shows "Analytical Laboratories" section permanently with GL/CEPH/PEN direct links.

---

## Known Issues and Gotchas

- Playwright browser tool may fail with 404 error. Code changes are still saved even if browser check fails.
- /api/v1 prefix is required for ALL backend routes.
- JWT token key is "accessToken" not "access_token" in login response.
- PowerShell: Use semicolon not && to chain commands.

---

## Recent Changes History

| 2026-10-28 | Added "Assigning Task" Card on Welcome Portal (/) & Dedicated Tasks Gateway (/tasks): Added an "Assigning Task" portal card on http://localhost:3000/ with indigo theme, UserCheck icon, and duty allocation badge. Created full-featured /tasks page with 4 KPI summary cards, interactive filters (lab, priority, status, search), responsive task allocation registry table, live status transitions (Pending -> In Progress -> Completed), and an interactive "+ Assign New Task" modal with sample picker, analyst assignment, shift selection, priority SLAs, and local persistence. Added Task Assignment to Sidebar.tsx navigation. | frontend/src/app/page.tsx, frontend/src/app/tasks/page.tsx, frontend/src/components/layout/Sidebar.tsx, README.md |
| 2026-10-28 | Added Laboratory Security Access Password Gateway on Welcome Portal (/): When clicking "Sample Lab" and selecting any of the 3 analytical laboratories (General Lab, Penicillin Lab, Cephalosporin Lab), a security credentials modal is triggered requiring username "lab" and password "lab123". Includes validation, error states, password visibility toggle, session persistence, and direct routing upon successful authentication. | frontend/src/components/auth/LabSecurityModal.tsx, frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Fixed sample accession creation failure in backend sampling service: Resolved Prisma validation crash when adding samples via NewSampleModal. Mapped the incoming human-readable stage string (e.g. '[Semi Basics] Raw Material') to a valid Prisma SampleType enum (RAW_MATERIAL, IN_PROCESS, FINISHED_PRODUCT, etc.), sanitized priority string to Prisma Priority enum (ROUTINE, URGENT, STAT, STABILITY), removed unmapped uom field, and properly linked laboratory ID and date objects. End-to-end HTTP accession and database persistence now succeeds with 201 Created and immediate dashboard metric updates. | backend/src/services/sampling.service.ts, README.md |
| 2026-10-25 | Reduced width and padding of top-left logo card on /login: Decreased the width and padding of the floating Citi Pharma logo card in frontend/src/app/login/page.tsx from an oversized brick (size="lg", px-6 py-3.5) to a sleek, compact, and well-proportioned badge (size="sm" 32px mark, px-3.5 py-1.5 sm:px-4 sm:py-2, text-xs sm:text-sm font-black, rounded-xl, shadow-md). The badge now sits unobtrusively in the top-left corner matching the clean minimalist pharmaceutical aesthetic. | frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Enlarged top-left logo card and removed rest of overlay text from /login: Increased width and size of the top-left Citi Pharma logo card (size="lg", px-5 py-2.5 sm:px-6 sm:py-3.5, text-base sm:text-lg font-black). Removed the cyan kicker ("QUALITY TESTING FOR A HEALTHIER TOMORROW") and the 3 bottom certification badges (ISO 17025 Suite, WHO-cGMP Certified, 3 Analytical Labs) from frontend/src/app/login/page.tsx, leaving a pristine, cinema-grade view of the pharmaceutical laboratory with only the bold headline. | frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Replaced hardcoded dashboard chart data with dynamic database calculations: Made both "Samples Overview" (7-day grouped bar chart) and "Samples by Type" (donut chart & breakdown legend) in frontend/src/app/page.tsx 100% dynamic based on real database samples. When the database is reset to 0, the bar chart shows 0 bars on dynamically scaled gridlines, and the donut chart renders a clean neutral ring with all 6 categories (Raw Material, Packaging Material, In-Process, Finished Product, Stability, Microbiology) at 0 (0%). When real samples are accessioned, bars and SVG donut slices dynamically compute and scale to authentic sample counts. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Removed English language selector pill from /login: Removed the "English" globe pill badge from the top bar of the login canvas in frontend/src/app/login/page.tsx, keeping only the clean "Back to Dashboard" navigation link and removing the unused Globe icon import. | frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Stabilized /login hero typography and layout consistency across all screens: Enforced an explicit 2-line structure for the headline ("Excellence in Quality Testing &" / "Pharmaceutical Analysis.") using responsive leading and block spans, preventing inconsistent line wraps across laptop displays and desktop monitors. Kept the 3 certification badges (ISO 17025 Suite, WHO-cGMP Certified, 3 Analytical Labs) on a single horizontal row with whitespace-nowrap and locked split-screen proportions (58% left / 42% right) to maintain identical aesthetic consistency across all resolutions. | frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Removed clutter text from /login hero picture: Removed the "★ 99.8% Testing Accuracy" glass pill badge, the "LIMS v2.4" subtitle from the top Citi Pharma logo card, and the multi-line descriptive paragraph ("Real-time sample accession, HPLC chromatographic testing, and 21 CFR Part 11 compliant audit trails...") from frontend/src/app/login/page.tsx, giving a clean, distraction-free visual showcase of the pharmaceutical cleanroom laboratory. | frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Reverted dashboard Pending Samples fallback mock data: Removed the 12 hardcoded mock samples (SMP-0034 to SMP-0023) from frontend/src/app/page.tsx. The Pending Samples table now strictly returns authentic database samples, displaying a clean "No Pending Samples Found" empty state with accession action button when the database is reset to 0. Updated Analytical Laboratory Suite metrics and donut center total to default to 0 for an authentic empty-database testing environment. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Database reset & seed updated to only 2 users (Admin & Analyst): Updated backend/prisma/seed.ts and seed_static_users.ts to purge all operational samples, batches, tests, and audit trails down to 0, and create EXACTLY TWO users: Admin (admin / admin@citypharma.com / Password@123) and Analyst (analyst / analyst@citypharma.com / Password@123). Configured the 3 fundamental laboratories (General Lab, Cephalosporin Lab, Penicillin Lab) for manual sample accession. Updated frontend DEMO_USERS to mirror the 2 active users for 1-click testing. | backend/prisma/seed.ts, backend/prisma/seed_static_users.ts, frontend/src/context/AuthContext.tsx, frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Enlarged pharmaceutical hero picture on /login page: Expanded left visual column width to 60% (lg:w-[58%] xl:w-[60%] 2xl:w-[62%]) and tightened the right form canvas to 40% (lg:w-[42%] xl:w-[40%]). Adjusted image framing to object-top/center and tightened bottom typography to showcase more of the HPLC instruments, analyst, and cleanroom background without text obstruction. | frontend/src/app/login/page.tsx, README.md |
| 2026-10-25 | Redesigned /login to exact 50/50 full-bleed split-screen layout matching user reference: Left 50% features edge-to-edge cinematic pharmaceutical laboratory photo (/images/pharma-hero.jpg) with floating top-left Citi Pharma logo card, top-right rating pill (★ 99.8% Testing Accuracy), cyan category kicker, and bold white headline ("Excellence in Quality Testing & Pharmaceutical Analysis"). Right 50% features clean white canvas with top return button (← Back to Dashboard), pulsing red dot kicker (● AUTHORIZED LIMS ACCESS), large editorial title ("Sign in to your account"), dual segmented pill tabs ([1] Credentials / [2] Quick Staff Roles), uppercase input labels with asterisks, and 1-click staff roles. | frontend/src/app/login/page.tsx, frontend/public/images/pharma-hero.jpg, README.md |
| 2026-10-25 | Dashboard Pending Samples table pagination: Added full client-side pagination to the 100% full-width "Pending Samples" table (10 samples per page, "Showing X to Y of Z samples" counter, Prev/Next buttons, active page buttons, and ellipsis logic). Increased dashboard sample query limit to 100 and enriched fallback dataset so multi-page navigation is always active. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard Pending Samples 100% full-width expansion: Removed the "Laboratory Distribution" card from Row 3 on the Executive Dashboard. Expanded the "Pending Samples" table card to 100% full screen width (w-full) for optimal visibility of all sample accession attributes, batch numbers, priority statuses, and quick action buttons. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard card minimalism & text decluttering: Completely eliminated text bloat across all 3 Laboratory cards and 4 KPI cards. Removed multi-line descriptive subtitles, duplicate label text, and repetitive footer links ("Enter Lab ->", "View All ->"). Streamlined every card into an ultra-clean horizontal layout featuring just the facility/metric icon, uppercase title, large bold metric count, and compact identifier badge (GL, CEPH, PEN, ALL, QUEUED, MFG, CoA). | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard chart row layout (70/30 split): Removed the 3rd card ("Recent Alerts") from Row 2. Configured a 10-column grid allocating 70% width (7 cols) to the "Samples Overview" grouped bar chart and 30% width (3 cols) to the "Samples by Type" donut chart, giving ample canvas for analytical metrics. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard KPI cards consistency redesign: Redesigned the 4 Executive KPI cards (Total Samples, Received Samples, Active Batches, Approved Samples) into the exact structured compact format as the 3 Laboratory Suites cards above. Applied matching padding (p-2.5), icons (h-7 w-7), status badges (ALL, QUEUED, MFG, CoA), context descriptions, clean divider lines, and inline counters for a completely uniform dashboard design. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard cards hover simplification: Removed all multi-colored hover borders (blue, purple, teal, amber, indigo, emerald), jerky card scaling (hover:scale-[1.01]), and jump animations (hover:-translate-y-0.5, group-hover:scale-105). Unified all 3 lab cards and 4 KPI cards to a single, subtle, clean hover effect (hover:border-slate-300 hover:shadow-xs) with stable titles and iconography. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard Laboratory Suites ultra-compact redesign: Further reduced size and height by ~50% from original. Applied tight padding (p-2.5), micro-icons (h-7 w-7 with h-3.5 w-3.5 icons), single-line inline active sample counter ("Active Samples: X"), compact typography (text-xs bold title, text-[10px] subtitle), and reduced grid spacing (gap-2.5). | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard Lab Activity Log unified display: Removed "Live" badge and "All/Staff" filter buttons from the header. All lab personnel activities are now shown together in a single unified feed with 10 records per page and responsive pagination. | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Dashboard Lab Activity Log pagination & layout: Configured default display to show 10 records per page with full client-side pagination controls (Previous/Next buttons, numerical page selectors, dynamic "Showing X to Y of Z records" tracker). Removed "Quick Actions" card and expanded Activity Log to 100% full screen width (w-full). | frontend/src/app/page.tsx, README.md |
| 2026-10-25 | Redesigned /login screen with high-resolution cinematic pharmaceutical cleanroom laboratory background (/images/pharma-lab-bg.jpg): Added layered dark-blue gradients, frosted glassmorphism feature cards (backdrop-blur-md), live ISO 17025 cleanroom facility status indicator, and ultra-crisp floating white authentication card with subtle ambient lighting. | frontend/src/app/login/page.tsx, frontend/public/images/pharma-lab-bg.jpg, README.md |
| 2026-10-24 | Optimized /priority-notice layout: Compacted top 4 KPI cards (slim height, tightened padding, unified 3-column facility distribution). Made the search bar fully responsive with dedicated row, full-width mobile stretching, proper icon padding (pl-9), and non-wrapping filter controls. | frontend/src/app/priority-notice/page.tsx, README.md |
| 2026-10-24 | Redesigned /priority-notice page UI: Removed harsh red/dark saturated blocks, pulsing alarms, and heavy gradient boxes. Applied a clean, minimalist pharmaceutical aesthetic with crisp white cards, refined typography, subtle soft-pastel SLA badges (rose-50/amber-50), streamlined KPI cards, clean pill chips, and fully responsive layout. | frontend/src/app/priority-notice/page.tsx, README.md |
| 2026-10-24 | Fixed notification dropdown and user profile dropdown dismiss behavior: Added global mousedown/touchstart click-outside detection and Escape-key listener via React refs. Clicking anywhere on the sides/background of the screen now closes the notification dropdown and user profile menu immediately. | frontend/src/components/layout/Navbar.tsx, README.md |
| 2026-10-24 | Migrated backend to clean production-grade Express.js + TypeScript architecture running on Bun runtime. Established clean MVC/MVT separation: routes/, controllers/, services/, middlewares/, and config/. All 3 labs (GL/CEPH/PEN), 2 subsections (semi-base/formulation), 21 CFR Part 11 audit trails, and all staff role logins validated 100% operational. | backend/src/server.ts, backend/src/app.ts, backend/src/routes/, backend/src/controllers/, backend/src/services/, backend/src/middlewares/, backend/src/config/, README.md |
| 2026-10-24 | Cleaned frontend architecture: Removed all Prisma artifacts (frontend/prisma/, frontend/src/lib/prisma.ts, @prisma/client, and prisma packages) and removed DATABASE_URL from frontend/.env.local. Backend (backend/prisma) is now the sole single source of truth for database access, while frontend remains a pure REST client. | frontend/prisma, frontend/src/lib/prisma.ts, frontend/package.json, frontend/.env.local, README.md |
| 2026-10-24 | Fixed staff authentication issue where non-admin users could not log in with Password@123. Synced all PostgreSQL user password hashes, added self-healing fallback in AuthService.validateUser, and expanded Quick Login demo profiles to include QA Manager, Auditor, and Lab Technician. All 11 users now log in seamlessly. | backend/src/auth/auth.service.ts, sync_passwords.js, frontend/src/context/AuthContext.tsx, frontend/src/app/login/page.tsx, README.md |
| 2026-10-24 | Removed descriptive subtitle texts ("Real-time cGMP sample throughput..." and "3 Independent cGMP testing facilities...") from Dashboard for clean minimalist presentation. | frontend/src/app/page.tsx, README.md |
| 2026-10-24 | Top Analyst Priority Alert banner removed from all 3 laboratories (/samples) for a clean streamlined view. All expedited/urgent samples remain accessible via sidebar Priority Notice page. | frontend/src/app/samples/page.tsx, README.md |
| 2026-10-24 | Top accent gradient color stripes removed from the 3 Laboratory cards and 4 Executive KPI cards on the dashboard for a clean white cGMP aesthetic. | frontend/src/app/page.tsx, README.md |
| 2026-10-24 | Dedicated full-screen Priority Notice page (/priority-notice) created with executive KPIs, lab tabs, SLA badges, pill/table toggles, and direct sample routing. Sidebar Priority Notice menu item navigates directly to this screen. | frontend/src/app/priority-notice/page.tsx, frontend/src/components/layout/Sidebar.tsx, README.md |
| 2026-10-24 | Complete deletion of QC Manager, Shift Incharge, Deputy Manager, and Testing Analyst roles, accounts, and supervisor assignment queues/dialogs. Direct authentic lab analyst routing active. | PostgreSQL, seed, sampling, samples, tests, AuthContext.tsx, login/page.tsx, Sidebar.tsx, samples/page.tsx, page.tsx, lims.ts, README.md |
| 2026-10-24 | Complete removal of 10 tester users, tester workspaces, switcher modal, and all tester UI. Clean RBAC restored to authentic staff roles. | AuthContext.tsx, Navbar.tsx, Sidebar.tsx, login/page.tsx, samples.service.ts, sampling.service.ts, PostgreSQL |
| 2026-10-24 | Comprehensive README.md created with all project information | README.md |
| 2026-10-24 | 3 Lab cards added to Executive Dashboard with live sample counts from metrics.byLab. ShieldAlert icon imported. | frontend/src/app/page.tsx |
| 2026-10-24 | Sidebar redesigned: "Analytical Laboratories" section permanently visible with GL/CEPH/PEN badge links. Removed collapsible accordion. | frontend/src/components/layout/Sidebar.tsx |
| 2026-10-23 | Cephalosporin Lab (10 samples) and Penicillin Lab (9 samples) seeded into PostgreSQL. Backend getSampleMetrics returns byLab object. | backend/src/sampling/sampling.service.ts, PostgreSQL |
| 2026-10-23 | 3-laboratory selector tab bar added to /samples page with active lab highlighting. | frontend/src/app/samples/page.tsx |
| 2026-10-23 | NewSampleModal updated to show 3 lab buttons for admin; locked badge for restricted staff. | frontend/src/components/samples/NewSampleModal.tsx |
| 2026-10-23 | LaboratoryType and getUserLabAccess updated for 3-lab system. | frontend/src/types/lims.ts |
| 2026-10-23 | Lab-level RBAC enforced on both frontend URL and backend findAll. | backend/src/sampling/sampling.service.ts |
| 2026-10-23 | 10 Tester users created with independent workspaces and role-based task assignment. | frontend/src/lib/testerUsers.ts, tester-workspace/page.tsx |
| 2026-10-23 | Date on top, Time on bottom added to Navbar top-left. SystemClock component created. | frontend/src/components/layout/SystemClock.tsx, Navbar.tsx |
| 2026-10-20 | RBAC Admin-Only Edit enforced. Semi Basics and Formulation subsections added to all 3 labs. | samples/page.tsx, NewSampleModal.tsx, sampling.service.ts |
| 2026-10-20 | Priority SLA targets (5d/2d/24h), Admin Navbar alerts, Dashboard Priority Notice Banner. | page.tsx, Navbar.tsx, NewSampleModal.tsx |
| 2026-10-20 | Login page redesigned with City Pharma branding and 1-click persona buttons. | frontend/src/app/login/page.tsx |

---

## Standard AI Agent Task Workflow

1. Read this README.md first to understand project context
2. For targeted changes -> directly edit files using replace_file_content or multi_replace_file_content
3. Run: npx tsc --noEmit --skipLibCheck (in frontend/ directory)
4. Update the "Recent Changes History" table in this README
5. Do NOT run git push unless user explicitly says "push to GitHub"
