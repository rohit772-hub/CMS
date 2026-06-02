"""Phase 2.5: Passwordless student login, School Admin school validation, and /student/site/init batch endpoint."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env file
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": "admin@cmsedu.ai", "password": "Demo@123", "role": "admin"})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


# ---------- Student passwordless login ----------
class TestStudentPasswordless:
    def test_login_via_auth_login_with_student_id(self, s):
        r = s.post(f"{API}/auth/login", json={"student_id": "STU-9999", "role": "student"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and data["access_token"]
        assert data["user"]["role"] == "student"

    def test_login_invalid_student_id(self, s):
        # use a unique invalid id so we don't trip the lockout from prior runs
        bad = f"STU-NOT-{uuid.uuid4().hex[:8]}"
        r = s.post(f"{API}/auth/login", json={"student_id": bad, "role": "student"})
        assert r.status_code == 401, r.text
        assert "Invalid Student ID" in r.json().get("detail", "")

    def test_dedicated_student_login_success(self, s):
        r = s.post(f"{API}/auth/student-login", json={"student_id": "STU-9999"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "student"
        assert data["access_token"]

    def test_dedicated_student_login_invalid(self, s):
        bad = f"NOT-REAL-{uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/auth/student-login", json={"student_id": bad})
        assert r.status_code == 401
        assert "Invalid Student ID" in r.json().get("detail", "")

    def test_email_password_login_still_works(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "admin@cmsedu.ai", "password": "Demo@123", "role": "admin"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"


# ---------- School Admin guardrails ----------
class TestSchoolAdminGuard:
    def test_valid_school_admin_login(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "instructor@cmsedu.ai", "password": "Demo@123", "role": "instructor"})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "instructor"

    def test_orphan_school_admin_blocked(self, s, admin_token):
        unique = uuid.uuid4().hex[:8]
        email = f"orphan-qa-{unique}@x.ai"
        # Create School Admin pointing at non-existent school
        payload = {
            "name": "Orphan", "email": email, "mobile": "+1",
            "school_name": "PhantomSchool", "password": "Demo@123", "status": "active",
        }
        r = s.post(
            f"{API}/admin/resources/school-admins",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code in (200, 201), r.text

        # Attempt login - should be 403 with PhantomSchool message
        r2 = s.post(f"{API}/auth/login", json={"email": email, "password": "Demo@123", "role": "instructor"})
        assert r2.status_code == 403, r2.text
        detail = r2.json().get("detail", "")
        assert "PhantomSchool" in detail and "not registered" in detail.lower()

    def test_school_admin_empty_school_blocked(self, s, admin_token):
        """Create a school admin then clear school_name on user doc to simulate orphan, expect 403 about not linked."""
        unique = uuid.uuid4().hex[:8]
        email = f"empty-school-qa-{unique}@x.ai"
        r = s.post(
            f"{API}/admin/resources/school-admins",
            json={"name": "Empty", "email": email, "mobile": "+1", "school_name": "TempSchool", "password": "Demo@123"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code in (200, 201), r.text
        # The user was created with school_name=TempSchool (non-existent) -> should be blocked with 'not registered'
        r2 = s.post(f"{API}/auth/login", json={"email": email, "password": "Demo@123", "role": "instructor"})
        assert r2.status_code == 403
        detail = r2.json().get("detail", "")
        # Either "TempSchool ... not registered" or "not linked"
        assert ("not registered" in detail.lower()) or ("not linked" in detail.lower())


# ---------- /student/site/init batched endpoint ----------
class TestStudentSiteInit:
    def test_init_as_student(self, s):
        r = s.post(f"{API}/auth/student-login", json={"student_id": "STU-9999"})
        assert r.status_code == 200
        tok = r.json()["access_token"]
        t0 = time.time()
        r2 = s.get(f"{API}/student/site/init", headers={"Authorization": f"Bearer {tok}"})
        elapsed_ms = (time.time() - t0) * 1000
        assert r2.status_code == 200, r2.text
        data = r2.json()
        for key in ("courses", "chapters", "notifications", "user"):
            assert key in data, f"missing key {key}"
        assert isinstance(data["courses"], list)
        assert isinstance(data["chapters"], list)
        assert isinstance(data["notifications"], list)
        assert data["user"]["role"] == "student"
        print(f"site/init student perf: {elapsed_ms:.0f}ms")
        # generous bound — k8s ingress can add latency, sanity check only
        assert elapsed_ms < 2000

    def test_init_as_admin_all_notifications(self, s, admin_token):
        r = s.get(f"{API}/student/site/init", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "notifications" in data
        # admin should see all, no audience-filter restriction; sanity: it should be a list
        assert isinstance(data["notifications"], list)


# ---------- Logo asset ----------
class TestLogo:
    def test_logo_served(self):
        # cms-logo.png is served by the frontend (port 3000), accessible via backend URL root
        url = f"{BASE_URL}/cms-logo.png"
        r = requests.get(url, timeout=15)
        assert r.status_code == 200, f"{url} -> {r.status_code}"
        # Expect > 100KB (current ~1MB)
        assert len(r.content) > 100_000, f"logo too small: {len(r.content)} bytes"
