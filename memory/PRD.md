# CMS Edu AI — Product Requirements (Living Doc)

## Original Problem Statement
Enterprise-grade Multi-Role LMS (Admin, **School Admin**, Student) with modern SaaS UI/UX, built on React + FastAPI + MongoDB.

## Roles (as of Feb 2026)
- **Admin** — platform owner, full control.
- **School Admin** (DB role token: `instructor`) — school-scoped owner. Sees ONLY their school's data.
- **Student** — logs in with their **Student ID** (e.g. STU-9999).

## Implemented (cumulative)
- Generic CRUD `/api/resources/{kind}` for schools, school-admins, classes, courses, subjects, chapters, students, quizzes, products, plans, payments, orders, quiz-results.
- Bearer-token auth (JWT) via localStorage.
- Admin login is hidden from `/login` (must use `/login/admin`).
- File upload field type on resource forms.
- Student site V1: Dashboard, Classroom, Shop, Subscription, Fun Hub.

### Phase 1 (shipped 2026-02)
- Renamed "Instructor" → **"School Admin"** across UI (login pages, sidebar role badge, dashboard eyebrow, KPI labels, Topbar role display).
- **Strict school-scoped filtering** for instructor users via `_school_scope_filter(kind, user)` — schools, school-admins, classes, courses, subjects, chapters, students, quizzes, quiz-results are all filtered by the user's `school_name` and the school's `class_names` / `course_names`.
- **Student-ID login**: `/login/student` form labels say "Student ID"; demo STU-9999 → student@cmsedu.ai works.
- School-Admin creation now mints a user with `role=instructor` and `school_name` (was incorrectly creating role=admin before).
- Admin sidebar trimmed: removed "Users (Platform)", "Analytics", "Communication", "Support" groups.
- Student site: profile dropdown with **My Profile** + **Sign out** (header logout button gone).
- Student My Courses cards: red progress bar removed.
- Backend test suite at `/app/backend/tests/test_phase1_school_scope.py`. **14/14 backend + 25/25 frontend pass.**

## Roadmap

### Phase 2 — Admin CRUD & UI polish (P1, NEXT)
- [ ] Admin CRUD pages: Products, Orders, Fun Hub Links
- [ ] Working search across all resource tables
- [ ] Backend pagination + lazy loading (perf)
- [ ] Chapter Viewer overhaul (Left/Right nav, PDF preview-only, no downloads)
- [ ] Admin → Student Notifications (with images)
- [ ] General Student Site card/spacing/icon polish

### Phase 3 — Integrations (P1)
- [ ] Razorpay: Buy Now → Address → Payment → Admin Order *(needs keys from user)*
- [ ] AI Chatbot for doubt solving *(Gemini 3 Flash via Emergent LLM key)*

### Phase 4 — Delight (P2)
- [ ] 3D Robot / animated student-site element (deferred by user)
- [ ] Logo image replacement (waiting for user upload)

### Tech-debt
- `/app/backend/server.py` is 1300+ lines — split into routers (auth/resources/admin/instructor/student) on a future pass.

## Test Credentials
See `/app/memory/test_credentials.md`.
