"""CMS Edu AI — Admin Resource CRUD + Dashboard regression tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@cmsedu.ai", "Demo@123")
STUDENT = ("student@cmsedu.ai", "Demo@123")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope="session")
def student_token():
    return _login(*STUDENT)


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_shape(self, admin_headers):
        r = requests.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "totals" in d and "recent_activities" in d
        for k in ["schools", "school_admins", "students", "classes", "courses",
                  "subjects", "chapters", "resources", "products", "orders", "payments"]:
            assert k in d["totals"], f"missing totals.{k}"
        assert isinstance(d["recent_activities"], list)

    def test_dashboard_forbidden_for_student(self, student_headers):
        r = requests.get(f"{API}/admin/dashboard", headers=student_headers)
        assert r.status_code == 403


# ---------- Generic CRUD across all kinds ----------
KINDS = ["schools", "classes", "courses", "subjects", "chapters"]


class TestResourceCRUD:
    @pytest.mark.parametrize("kind", KINDS)
    def test_create_list_update_status_delete(self, admin_headers, kind):
        # CREATE
        name = f"TEST_{kind}_{uuid.uuid4().hex[:6]}"
        payload = {"name": name}
        r = requests.post(f"{API}/admin/resources/{kind}", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        item = r.json()["item"]
        assert item["name"] == name
        assert item["status"] == "active"
        rid = item["id"]
        assert rid

        # GET list
        r = requests.get(f"{API}/admin/resources/{kind}", headers=admin_headers)
        assert r.status_code == 200
        ids = [it["id"] for it in r.json()["items"]]
        assert rid in ids

        # UPDATE
        new_name = name + "_upd"
        r = requests.put(f"{API}/admin/resources/{kind}/{rid}", json={"name": new_name}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["item"]["name"] == new_name

        # PATCH status -> disabled
        r = requests.patch(f"{API}/admin/resources/{kind}/{rid}/status",
                           json={"status": "disabled"}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["item"]["status"] == "disabled"

        # DELETE
        r = requests.delete(f"{API}/admin/resources/{kind}/{rid}", headers=admin_headers)
        assert r.status_code == 200
        # confirm gone
        r = requests.delete(f"{API}/admin/resources/{kind}/{rid}", headers=admin_headers)
        assert r.status_code == 404

    def test_unknown_kind(self, admin_headers):
        r = requests.get(f"{API}/admin/resources/unknown", headers=admin_headers)
        assert r.status_code == 404


# ---------- Search ----------
class TestSearch:
    def test_classes_search(self, admin_headers):
        unique = f"TEST_SearchClass_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/admin/resources/classes",
                          json={"name": unique}, headers=admin_headers)
        assert r.status_code == 200
        rid = r.json()["item"]["id"]

        r = requests.get(f"{API}/admin/resources/classes?q={unique}", headers=admin_headers)
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(it["name"] == unique for it in items)

        # cleanup
        requests.delete(f"{API}/admin/resources/classes/{rid}", headers=admin_headers)


# ---------- Bulk ----------
class TestBulk:
    def test_bulk_create_classes(self, admin_headers):
        prefix = f"TEST_Bulk_{uuid.uuid4().hex[:6]}"
        items = [{"name": f"{prefix}_{i}"} for i in range(3)]
        r = requests.post(f"{API}/admin/resources/classes/bulk",
                          json={"items": items}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["inserted"] == 3

        # verify list contains them
        r = requests.get(f"{API}/admin/resources/classes?q={prefix}", headers=admin_headers)
        names = [it["name"] for it in r.json()["items"]]
        for it in items:
            assert it["name"] in names

    def test_bulk_empty_400(self, admin_headers):
        r = requests.post(f"{API}/admin/resources/classes/bulk",
                          json={"items": []}, headers=admin_headers)
        assert r.status_code == 400


# ---------- School admin auto-creates user ----------
class TestSchoolAdminUserCreation:
    def test_school_admin_create_user_login(self, admin_headers):
        email = f"test_schadmin_{uuid.uuid4().hex[:6]}@cmsedu.ai"
        payload = {"name": "SchAdmin Test", "email": email, "mobile": "9999999999",
                   "password": "Demo@123", "school_id": "sch_xxx"}
        r = requests.post(f"{API}/admin/resources/school-admins", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        item = r.json()["item"]
        assert item["email"] == email
        # raw password should not be persisted
        assert "password" not in item

        # Login as this new user — should be admin role
        token = _login(email, "Demo@123")
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["role"] == "admin"
        assert r.json()["email"] == email


# ---------- Student auto-creates user ----------
class TestStudentUserCreation:
    def test_student_create_user_login(self, admin_headers):
        email = f"test_student_{uuid.uuid4().hex[:6]}@cmsedu.ai"
        payload = {"name": "Student Test", "email": email, "phone": "9000000000",
                   "school_id": "sch_xxx", "class_id": "cla_xxx", "division": "A"}
        r = requests.post(f"{API}/admin/resources/students", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text

        # Login as student with default password
        token = _login(email, "Demo@123")
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["role"] == "student"


# ---------- RBAC on resource endpoints ----------
class TestResourceRBAC:
    @pytest.mark.parametrize("kind", ["schools", "classes", "students"])
    def test_student_forbidden(self, student_headers, kind):
        r = requests.get(f"{API}/admin/resources/{kind}", headers=student_headers)
        assert r.status_code == 403

    def test_unauth_denied(self):
        r = requests.get(f"{API}/admin/resources/classes")
        assert r.status_code == 401


# ---------- Activity log ----------
class TestActivityLog:
    def test_activity_logged_on_create(self, admin_headers):
        name = f"TEST_Activity_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/admin/resources/classes",
                          json={"name": name}, headers=admin_headers)
        assert r.status_code == 200
        rid = r.json()["item"]["id"]

        r = requests.get(f"{API}/admin/dashboard", headers=admin_headers)
        acts = r.json()["recent_activities"]
        assert any(a.get("label") == name and a.get("kind") == "classes" for a in acts), \
            "Recent activities should contain newly created class"

        # cleanup
        requests.delete(f"{API}/admin/resources/classes/{rid}", headers=admin_headers)
