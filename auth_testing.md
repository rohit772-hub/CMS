# Auth Testing Playbook — CMS Edu AI

## Demo accounts (all password `Demo@123`)
- admin@cmsedu.ai — role: admin
- instructor@cmsedu.ai — role: instructor
- student@cmsedu.ai — role: student

## Backend smoke test (cookies-based JWT)

```
API=$REACT_APP_BACKEND_URL  # or http://localhost:8001
# 1. Login
curl -c /tmp/c.txt -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@cmsedu.ai","password":"Demo@123"}'
# 2. Cookies should contain access_token + refresh_token
cat /tmp/c.txt
# 3. /me must return user
curl -b /tmp/c.txt $API/api/auth/me
# 4. Role-based endpoint
curl -b /tmp/c.txt $API/api/admin/stats
# 5. Wrong role -> 403
curl -X POST $API/api/auth/login -c /tmp/s.txt -H "Content-Type: application/json" \
  -d '{"email":"student@cmsedu.ai","password":"Demo@123"}'
curl -b /tmp/s.txt $API/api/admin/stats   # expect 403
# 6. Logout clears cookies
curl -b /tmp/c.txt -X POST $API/api/auth/logout
```

## MongoDB quick check
```
mongosh
use cms_edu_ai
db.users.find({}, {password_hash: 0}).pretty()
db.users.getIndexes()
```
Expected: 3 seeded users; unique index on `email`.

## Frontend flow
1. Visit `/` → redirects to `/login` (role selection page).
2. Click "Continue as Admin" → /login/admin form.
3. Login with admin@cmsedu.ai / Demo@123 → redirected to /admin/dashboard.
4. Sidebar collapses, every nav item navigates.
5. /admin/dashboard for student account → redirected to /unauthorized.
6. Logout from topbar → cookies cleared, return to /login.

## Emergent Google OAuth
- "Continue with Google" button on each login form sends user to:
  `https://auth.emergentagent.com/?redirect=<window.location.origin>/auth/callback`
- Callback page reads `#session_id=` from hash, POSTs to `/api/auth/google/session`,
  backend exchanges with Emergent, creates/finds user, sets `session_token` cookie.
- Default role for new Google users: `student`.
