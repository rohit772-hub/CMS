"""CMS Edu AI — backend regression tests for auth + role-based LMS stubs."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://role-auth-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@cmsedu.ai", "Demo@123")
INSTRUCTOR = ("instructor@cmsedu.ai", "Demo@123")
STUDENT = ("student@cmsedu.ai", "Demo@123")


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(session, email, password, role=None, remember=False):
    body = {"email": email, "password": password, "remember": remember}
    if role:
        body["role"] = role
    return session.post(f"{API}/auth/login", json=body)


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Login (seeded accounts) ----------
class TestLogin:
    @pytest.mark.parametrize("email,password,role", [
        (ADMIN[0], ADMIN[1], "admin"),
        (INSTRUCTOR[0], INSTRUCTOR[1], "instructor"),
        (STUDENT[0], STUDENT[1], "student"),
    ])
    def test_seed_login(self, session, email, password, role):
        r = _login(session, email, password)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["user"]["email"] == email
        assert data["user"]["role"] == role

    def test_wrong_password(self, session):
        r = _login(session, ADMIN[0], "WrongPass!1")
        assert r.status_code == 401

    def test_role_mismatch_returns_403(self, session):
        # Use unique IP-less identifier by varying email — backend keys lockout per ip:email
        r = _login(session, STUDENT[0], STUDENT[1], role="admin")
        assert r.status_code == 403


# ---------- /auth/me + Bearer ----------
class TestMe:
    def test_me_with_bearer(self, session):
        r = _login(session, ADMIN[0], ADMIN[1])
        assert r.status_code == 200
        token = r.json()["access_token"]
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["email"] == ADMIN[0]

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Register ----------
class TestRegister:
    def test_register_creates_user(self, session):
        email = f"test_{uuid.uuid4().hex[:8]}@cmsedu.ai"
        body = {"name": "Test User", "email": email, "password": "Test@1234", "role": "student"}
        r = session.post(f"{API}/auth/register", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "student"
        assert "access_token" in data
        # verify with /me
        token = data["access_token"]
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["email"] == email

    def test_register_duplicate(self, session):
        body = {"name": "Dup", "email": ADMIN[0], "password": "Demo@123", "role": "admin"}
        r = session.post(f"{API}/auth/register", json=body)
        assert r.status_code == 409


# ---------- Role-based access ----------
class TestRBAC:
    @pytest.fixture(scope="class")
    def tokens(self):
        s = requests.Session()
        out = {}
        for label, (e, p) in [("admin", ADMIN), ("instructor", INSTRUCTOR), ("student", STUDENT)]:
            r = s.post(f"{API}/auth/login", json={"email": e, "password": p})
            assert r.status_code == 200, f"login failed for {label}: {r.text}"
            out[label] = r.json()["access_token"]
        return out

    def _h(self, t):
        return {"Authorization": f"Bearer {t}"}

    def test_admin_stats_admin_ok(self, tokens):
        r = requests.get(f"{API}/admin/stats", headers=self._h(tokens["admin"]))
        assert r.status_code == 200
        assert "kpis" in r.json()

    def test_admin_stats_student_forbidden(self, tokens):
        r = requests.get(f"{API}/admin/stats", headers=self._h(tokens["student"]))
        assert r.status_code == 403

    def test_admin_stats_instructor_forbidden(self, tokens):
        r = requests.get(f"{API}/admin/stats", headers=self._h(tokens["instructor"]))
        assert r.status_code == 403

    def test_admin_users(self, tokens):
        r = requests.get(f"{API}/admin/users", headers=self._h(tokens["admin"]))
        assert r.status_code == 200
        assert "users" in r.json() and len(r.json()["users"]) >= 3

    def test_instructor_stats_instructor_ok(self, tokens):
        r = requests.get(f"{API}/instructor/stats", headers=self._h(tokens["instructor"]))
        assert r.status_code == 200

    def test_instructor_stats_admin_ok(self, tokens):
        r = requests.get(f"{API}/instructor/stats", headers=self._h(tokens["admin"]))
        assert r.status_code == 200

    def test_instructor_stats_student_forbidden(self, tokens):
        r = requests.get(f"{API}/instructor/stats", headers=self._h(tokens["student"]))
        assert r.status_code == 403

    def test_student_stats_student_ok(self, tokens):
        r = requests.get(f"{API}/student/stats", headers=self._h(tokens["student"]))
        assert r.status_code == 200
        assert "xp" in r.json()

    def test_student_stats_admin_ok(self, tokens):
        r = requests.get(f"{API}/student/stats", headers=self._h(tokens["admin"]))
        assert r.status_code == 200

    def test_student_stats_instructor_forbidden(self, tokens):
        r = requests.get(f"{API}/student/stats", headers=self._h(tokens["instructor"]))
        assert r.status_code == 403

    def test_courses_public(self):
        r = requests.get(f"{API}/courses")
        assert r.status_code == 200
        assert len(r.json()["courses"]) > 0

    def test_student_courses(self, tokens):
        r = requests.get(f"{API}/student/courses", headers=self._h(tokens["student"]))
        assert r.status_code == 200


# ---------- Forgot/Reset ----------
class TestForgotReset:
    def test_forgot_and_reset(self, session):
        # Create dedicated user to avoid clobbering seed admin
        email = f"reset_{uuid.uuid4().hex[:8]}@cmsedu.ai"
        old_pw = "OldPass@123"
        new_pw = "NewPass@456"
        r = session.post(f"{API}/auth/register", json={
            "name": "Reset User", "email": email, "password": old_pw, "role": "student"
        })
        assert r.status_code == 200

        f = session.post(f"{API}/auth/forgot-password", json={"email": email})
        assert f.status_code == 200
        token = f.json().get("dev_token")
        assert token, f.text

        rr = session.post(f"{API}/auth/reset-password", json={"token": token, "password": new_pw})
        assert rr.status_code == 200

        # Old password no longer works
        bad = _login(session, email, old_pw)
        assert bad.status_code == 401
        # New password works
        good = _login(session, email, new_pw)
        assert good.status_code == 200

        # Token cannot be reused
        again = session.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another@1"})
        assert again.status_code == 400

    def test_forgot_unknown_email_returns_ok(self, session):
        r = session.post(f"{API}/auth/forgot-password", json={"email": f"nope_{uuid.uuid4().hex[:6]}@cmsedu.ai"})
        assert r.status_code == 200


# ---------- Brute force lockout ----------
class TestLockout:
    def test_lockout_after_threshold(self, session):
        # Create unique user so we don't lock seeded accounts
        email = f"lock_{uuid.uuid4().hex[:8]}@cmsedu.ai"
        session.post(f"{API}/auth/register", json={
            "name": "Lock Test", "email": email, "password": "Right@123", "role": "student"
        })
        codes = []
        for _ in range(7):
            r = _login(session, email, "Wrong@123")
            codes.append(r.status_code)
        # Expect at least one 429 in last attempts (after 5 failures)
        assert 429 in codes, f"Expected 429 lockout, got: {codes}"
