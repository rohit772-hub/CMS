"""Phase 1 LMS regression tests: Student ID login, school-scoped /api/resources,
instructor dashboard scope, school-admins user creation produces role=instructor.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@cmsedu.ai", "Demo@123")
INSTRUCTOR = ("instructor@cmsedu.ai", "Demo@123")
STUDENT_EMAIL = ("student@cmsedu.ai", "Demo@123")
STUDENT_ID = ("STU-9999", "Demo@123")
INSTRUCTOR_SCHOOL = "Ridgeview Academy"


def _login(identifier, password, role=None):
    body = {"email": identifier, "password": password}
    if role:
        body["role"] = role
    r = requests.post(f"{API}/auth/login", json=body)
    return r


def _login_ok(identifier, password, role=None):
    r = _login(identifier, password, role)
    assert r.status_code == 200, f"login failed for {identifier}: {r.status_code} {r.text}"
    j = r.json()
    assert "access_token" in j
    assert "user" in j
    return j["access_token"], j["user"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ------------------ Phase 1 #1: Student ID login ------------------
class TestStudentIdLogin:
    def test_login_with_student_id(self):
        r = _login(STUDENT_ID[0], STUDENT_ID[1], role="student")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "student"
        assert data["user"]["email"] == "student@cmsedu.ai"
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 10

    def test_login_with_email_still_works(self):
        _login_ok(*STUDENT_EMAIL, role="student")

    def test_login_with_wrong_role_rejected(self):
        r = _login(STUDENT_ID[0], STUDENT_ID[1], role="admin")
        assert r.status_code in (401, 403)


# ------------------ Phase 1 #2: Admin sees all ------------------
class TestAdminGlobalScope:
    @pytest.fixture(scope="class")
    def admin_h(self):
        token, _ = _login_ok(*ADMIN)
        return _h(token)

    def test_schools_all(self, admin_h):
        r = requests.get(f"{API}/resources/schools", headers=admin_h)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert len(items) >= 1
        # Should include Ridgeview at minimum
        assert any(it.get("name") == INSTRUCTOR_SCHOOL for it in items)

    def test_students_all(self, admin_h):
        r = requests.get(f"{API}/resources/students", headers=admin_h)
        assert r.status_code == 200
        assert r.json()["total"] >= 1


# ------------------ Phase 1 #3: Instructor school-scoped ------------------
class TestInstructorScope:
    @pytest.fixture(scope="class")
    def inst_h(self):
        token, _ = _login_ok(*INSTRUCTOR)
        return _h(token)

    def test_schools_only_own(self, inst_h):
        r = requests.get(f"{API}/resources/schools", headers=inst_h)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert len(items) == 1, f"expected exactly 1 school, got {len(items)}: {[i.get('name') for i in items]}"
        assert items[0]["name"] == INSTRUCTOR_SCHOOL

    def test_students_only_own_school(self, inst_h):
        r = requests.get(f"{API}/resources/students", headers=inst_h)
        assert r.status_code == 200
        items = r.json()["items"]
        # Every student returned must belong to Ridgeview Academy
        for it in items:
            assert it.get("school_name") == INSTRUCTOR_SCHOOL, f"leak: {it}"
        # Specifically should include the STU-9999 / Noah student (seeded with Ridgeview)
        ids = [it.get("student_id") for it in items]
        assert "STU-9999" in ids

    def test_classes_scoped(self, inst_h):
        r = requests.get(f"{API}/resources/classes", headers=inst_h)
        assert r.status_code == 200
        items = r.json()["items"]
        # Allowed class names per seed: Class 8/9/10
        for it in items:
            assert it.get("name") in {"Class 8", "Class 9", "Class 10"}, f"class leak: {it.get('name')}"

    def test_courses_scoped_no_leak(self, inst_h):
        r = requests.get(f"{API}/resources/courses", headers=inst_h)
        assert r.status_code == 200
        items = r.json()["items"]
        allowed = {"Class 8", "Class 9", "Class 10"}
        for it in items:
            cn = it.get("class_names") or [it.get("class_name")]
            assert any(c in allowed for c in cn if c), f"course leak: {it}"

    def test_subjects_scoped_no_leak(self, inst_h):
        r = requests.get(f"{API}/resources/subjects", headers=inst_h)
        assert r.status_code == 200
        items = r.json()["items"]
        # Either no items or all overlap with allowed classes/courses
        allowed = {"Class 8", "Class 9", "Class 10"}
        for it in items:
            cns = set(it.get("class_names") or ([it["class_name"]] if it.get("class_name") else []))
            assert cns & allowed or not cns, f"subject leak: {it}"

    def test_chapters_scoped_no_leak(self, inst_h):
        r = requests.get(f"{API}/resources/chapters", headers=inst_h)
        assert r.status_code == 200
        items = r.json()["items"]
        allowed = {"Class 8", "Class 9", "Class 10"}
        for it in items:
            cn = it.get("class_name")
            if cn:
                assert cn in allowed, f"chapter leak: {it}"

    def test_school_admins_forbidden_for_instructor(self, inst_h):
        r = requests.get(f"{API}/resources/school-admins", headers=inst_h)
        # instructor not in school-admins read perms => 403
        assert r.status_code == 403


# ------------------ Phase 1 #4: instructor dashboard scoped ------------------
class TestInstructorDashboard:
    def test_dashboard_students_count_one(self):
        token, _ = _login_ok(*INSTRUCTOR)
        r = requests.get(f"{API}/instructor/dashboard", headers=_h(token))
        assert r.status_code == 200, r.text
        totals = r.json()["totals"]
        # Noah only
        assert totals["students"] == 1, f"expected students=1, got {totals['students']}"
        # Instructors scoped: just Lila herself
        assert totals["instructors"] == 1, f"expected instructors=1, got {totals['instructors']}"


# ------------------ Phase 1 #5: school-admin creation -> instructor role ------------------
class TestCreateSchoolAdminRole:
    def test_creates_user_with_instructor_role(self):
        admin_token, _ = _login_ok(*ADMIN)
        email = f"test_sa_p1_{uuid.uuid4().hex[:6]}@cmsedu.ai"
        payload = {
            "name": "Phase1 SA",
            "email": email,
            "mobile": "9999999999",
            "password": "Demo@123",
            "school_name": INSTRUCTOR_SCHOOL,
        }
        r = requests.post(f"{API}/admin/resources/school-admins", json=payload, headers=_h(admin_token))
        assert r.status_code == 200, r.text

        # The newly created user should be able to login as instructor
        r2 = _login(email, "Demo@123", role="instructor")
        assert r2.status_code == 200, f"new SA cannot login as instructor: {r2.status_code} {r2.text}"
        user = r2.json()["user"]
        assert user["role"] == "instructor"

        # Login as admin should fail (we want role=instructor, not admin)
        r3 = _login(email, "Demo@123", role="admin")
        assert r3.status_code in (401, 403)

        # Verify school_name is recorded on the user via /auth/me
        r4 = requests.get(f"{API}/auth/me", headers=_h(r2.json()["access_token"]))
        assert r4.status_code == 200
        # school_name may not be in public payload; check via DB-effect: scoped list should show this school only
        r5 = requests.get(f"{API}/resources/schools", headers=_h(r2.json()["access_token"]))
        assert r5.status_code == 200
        items = r5.json()["items"]
        assert len(items) == 1 and items[0]["name"] == INSTRUCTOR_SCHOOL
