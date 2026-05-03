# CMS Edu AI — Product Requirements Document

## Original Problem Statement
Build an enterprise-grade AI-powered LMS platform named "CMS Edu AI" (Create Mind Studio) with:
- Multi-role authentication (Admin, Instructor, Student)
- JWT + Google OAuth sign-in
- Premium glassmorphism UI with blue gradient accents
- Split-screen auth, collapsible sidebars, gamified student dashboard, analytics panels
- Full CRUD for users, courses, subscriptions, store, etc.
- Real-time notifications, AI chatbot, payments, uploads (deferred to phase 2)

## Architecture
- **Frontend**: React 19 (CRA) + Tailwind + Shadcn UI + framer-motion + recharts + lucide-react
- **Backend**: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt + httpx
- **DB**: MongoDB (`cms_edu_ai` database)
- **Auth**: JWT access token (12h) + refresh token (7d), Bearer header in preview env (cookie fallback), Emergent-managed Google OAuth via `/auth/v1/env/oauth/session-data`
- **Design system**: dark "Jewel" archetype, `Outfit` + `Plus Jakarta Sans` fonts, `#060814` base, `#00E5FF → #0055FF` gradient accent, custom glass utilities

## User Personas
1. **Admin (Avery)** — manages platform; dashboards for revenue, enrollments, users.
2. **Instructor (Lila)** — creates/edits courses, grades assignments, runs live classes.
3. **Student (Noah)** — consumes courses, maintains streaks, earns XP/badges.

## Completed — 2026-05-03
### Backend
- `POST /api/auth/register`, `/login`, `/logout`, `/refresh`, `/forgot-password`, `/reset-password`, `/verify-email`, `/google/session`
- `GET /api/auth/me`
- Bcrypt password hashing + JWT access/refresh
- Brute-force lockout (email-keyed, proxy-safe), 5 attempts / 15 min
- Seeded 3 demo accounts on startup (all password `Demo@123`)
- Stub LMS endpoints: `/api/admin/stats`, `/api/admin/users`, `/api/instructor/stats`, `/api/instructor/courses`, `/api/student/stats`, `/api/student/courses`, `/api/courses`
- Role-based access via `require_role("admin", …)` dependency
- Unique index on `users.email`, TTL index on password reset tokens

### Frontend
- Routes: `/login`, `/login/:role`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/unauthorized`, `/{role}/dashboard`, nested sub-pages
- `AuthContext` with Bearer token in localStorage + `/auth/me` bootstrap (skipped during OAuth callback)
- `ProtectedRoute` with role allowlist → redirects to `/unauthorized`
- **AuthLayout** split-screen (role-specific illustrations + copy) with animated particle/aurora background
- **LoginSelection** 3-role cards with hover glow + gradient borders
- **Login** role-aware with email/password/show-toggle/remember/forgot + Google button + demo-fill
- Register, Forgot, Reset, Verify-email, Unauthorized pages
- **DashboardLayout** — fixed collapsible sidebar (desktop), mobile drawer, sticky glass topbar
- **Sidebar** — multi-level nested nav (Admin: 7 groups with dropdowns; Instructor/Student: 8–11 items), active highlight, tooltips when collapsed
- **Topbar** — search, notifications, profile dropdown with logout
- **Admin Dashboard** — KPIs, revenue AreaChart, enrollments BarChart, recent users table, AI insights
- **Admin Users** — table with tabs (all / instructors / students / parents) + search
- **Admin Courses** — course grid
- **Instructor Dashboard** — KPIs, performance BarChart, today's pulse, course cards
- **Instructor Courses** — editable course cards
- **Student Dashboard** — streak, XP progress circle, badges, weekly learning chart, leaderboard with "you" row, continue-learning cards with progress, AI recommendations
- **Student Courses** — course grid with play/lock
- 20+ placeholder sub-pages (so every sidebar link resolves) with animated empty-state cards
- Sonner toasts, framer-motion page transitions, custom CSS particle background

## Testing — 2026-05-03 iter 1
- Backend: 24/25 tests pass (96%). Fixed: brute-force lockout now email-keyed (proxy-safe).
- Frontend: key flows verified — 3-role login, register, RBAC redirect, session persistence, sidebar collapse, logout, forgot/reset. Fixed: register role dropdown label now contains "Role"; mobile layout uses responsive Tailwind classes.

## Known / Deferred (P1+)
- **[P1] Emergent Google OAuth** — button wired, backend `/auth/google/session` implemented, but needs real browser test with Google account.
- **[P1] Course CRUD (Admin/Instructor)** — currently read-only with sample data; write endpoints + forms next.
- **[P1] Real analytics aggregation** — replace stubbed KPI numbers with MongoDB aggregations.
- **[P2] Stripe / Razorpay payments** — store, plans, orders, invoices.
- **[P2] Cloudinary / Emergent storage** — video + PDF uploads for lessons.
- **[P2] Socket.io real-time notifications**.
- **[P2] AI chatbot assistant**.
- **[P2] Zoom / Google Meet live classes**.
- **[P2] Email verification send** (currently token endpoint exists, no SMTP wired).
- **[P3] i18n, dark/light toggle, WhatsApp/Telegram**.

## Test Credentials
See `/app/memory/test_credentials.md`.
