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

### Phase 2.5 (shipped 2026-02)
- **Passwordless Student Login** — `LoginReq.password` now optional; `LoginReq.student_id` added. `/api/auth/login` auto-detects passwordless mode when role=student + no password. New dedicated `POST /api/auth/student-login {student_id}` endpoint. Wrong/missing IDs → `401 "Invalid Student ID. Please contact your school/admin."`. Frontend hides the password field entirely for the student role and sends `{student_id, role}` payload.
- **School Admin validation** — new `_validate_school_admin()` helper runs at login. Blocks the user if `school_name` is missing, the school doesn't exist in the `schools` collection, or the school is `disabled`. Error message names the offending school.
- **Student site performance** — new batched `GET /api/student/site/init` returns `{courses, chapters, notifications, user}` via `asyncio.gather` (3 queries in parallel → 1 HTTP round-trip). All student-site routes (`StudentHome`, `StudentClassroom`, `SubjectList`, `ChapterViewer`, `StudentShop`, `StudentSubscription`, `StudentOrders`, `StudentFunHub`) now lazy-loaded via `React.lazy` + `Suspense` with a branded fallback. Dramatically smaller initial JS bundle for the student site.
- **Logo replaced** — `/app/frontend/public/cms-logo.png` swapped with the new red+teal arrow-in-circle mark. Brand component unchanged. Old logo backed up at `cms-logo.png.bak`.
- Test suite: `/app/backend/tests/test_phase25_auth.py`. **11/11 backend + 9/9 frontend pass.**

### Phase 2 (shipped 2026-02)
- Admin CRUD pages: `ManageProducts.jsx`, `ManageOrders.jsx`, `ManageFunHub.jsx`, `ManageNotifications.jsx` — all backed by `/api/admin/resources/{kind}` with image uploads, filters, search, downloads.
- Backend: added `RESOURCE_KINDS` entries for `orders`, `fun-hub`, `notifications`; updated `RESOURCE_SEARCH_FIELDS` + `KIND_PERMS`; added `_search_query()` with `re.escape()` so user input like `C++` no longer crashes the regex.
- Backend pagination: `list_resources()` + `list_shared()` now accept `limit` (default 200, max 5000) + `offset`. Response includes `{items, total, limit, offset}`.
- Student endpoints: `GET /api/student/site/notifications` (audience-aware), `GET /api/student/site/fun-hub`.
- Chapter Viewer overhaul: numbered chapter sidebar, sticky on desktop, Prev / Next buttons with names, "Chapter X of N" counter, PDF preview-only iframe (no download button anywhere); image/video previews mark `controlsList="nodownload"` and disable right-click context menu.
- Student Home: notifications panel now reads real data with banner images; lazy-loaded course thumbnails.
- Student Fun Hub: powered by `/student/site/fun-hub` with category badges and lazy image loading.
- Test files: `/app/backend/tests/test_phase2_resources.py`. **14/14 backend tests pass; frontend playwright run: all real features verified.**

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

### Phase 2 — Admin CRUD & UI polish (shipped ✅)
- [x] Admin CRUD pages: Products, Orders, Fun Hub Links, Notifications
- [x] Working search across all resource tables (regex-safe)
- [x] Backend pagination (limit/offset, total returned)
- [x] Chapter Viewer overhaul (Left/Right nav, PDF preview-only, no downloads)
- [x] Admin → Student Notifications (with banner images)
- [x] General Student Site card/spacing/icon polish

### Phase 3 — Integrations (shipped ✅ 2026-02)
- [x] **Razorpay Buy Now flow** — `/api/payments/{config,create-order,verify,webhook}` endpoints + 3-step `BuyNowDialog` (Address → Payment → Done) on student Shop. HMAC-SHA256 signature verification on /verify. Currently returns 503 'not configured' until user adds `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` to `/app/backend/.env`.
- [x] **AI Chatbot 'Spark'** — `gemini-3-flash-preview` via Emergent LLM key + emergentintegrations. Endpoints: `/chat/{send,history,sessions,session/{id} DELETE}`. Floating bubble on every student-site page; multi-turn memory persisted in Mongo `chat_messages`, session_id stored in `localStorage`. Suggestion chips, "new chat" button, system prompt scoped to K-12 study help.

### Phase 4 — Delight (P2)
- [ ] 3D Robot / animated student-site element (deferred by user)
- [x] Logo image replacement (shipped 2026-02 in Phase 2.5)

### Tech-debt
- `/app/backend/server.py` is 1300+ lines — split into routers (auth/resources/admin/instructor/student) on a future pass.

## Test Credentials
See `/app/memory/test_credentials.md`.
