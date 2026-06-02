"""Phase 2 LMS regression tests:
- Admin generic resource CRUD for products / orders / fun-hub / notifications
- Server-side search with regex special-char escape
- Backend pagination via limit & offset
- Student-facing /student/site/notifications and /student/site/fun-hub
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@cmsedu.ai", "Demo@123")
STUDENT_ID = ("STU-9999", "Demo@123")


def _login(identifier, password, role=None):
    body = {"email": identifier, "password": password}
    if role:
        body["role"] = role
    r = requests.post(f"{API}/auth/login", json=body)
    assert r.status_code == 200, f"login failed for {identifier}: {r.status_code} {r.text}"
    j = r.json()
    return j["access_token"], j["user"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# -------- Fixtures --------
@pytest.fixture(scope="module")
def admin_h():
    token, _ = _login(*ADMIN)
    return _h(token)


@pytest.fixture(scope="module")
def student_h():
    token, _ = _login(STUDENT_ID[0], STUDENT_ID[1], role="student")
    return _h(token)


# -------- 1. Pagination on /admin/resources/products --------
class TestProductsPagination:
    def test_default_returns_items_total_limit_offset(self, admin_h):
        r = requests.get(f"{API}/admin/resources/products", headers=admin_h)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("items", "total", "limit", "offset"):
            assert k in j, f"missing key '{k}' in response: {j.keys()}"
        assert j["total"] >= 4, f"expected at least 4 seeded products, got {j['total']}"

    def test_first_page_size_2(self, admin_h):
        r = requests.get(f"{API}/admin/resources/products?limit=2&offset=0", headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        assert j["limit"] == 2
        assert j["offset"] == 0
        assert j["total"] >= 4
        assert len(j["items"]) == 2

    def test_second_page_offset_2(self, admin_h):
        r = requests.get(f"{API}/admin/resources/products?limit=2&offset=2", headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        assert j["offset"] == 2
        assert len(j["items"]) >= 1  # at least 1 page-2 item
        # If exactly 4 seeded products, this page returns exactly 2.
        if j["total"] == 4:
            assert len(j["items"]) == 2

    def test_large_limit_returns_all(self, admin_h):
        r = requests.get(f"{API}/admin/resources/products?limit=100", headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        assert len(j["items"]) == j["total"]
        assert j["total"] >= 4


# -------- 2. Other generic kinds --------
class TestOtherKinds:
    def test_fun_hub_seeded(self, admin_h):
        r = requests.get(f"{API}/admin/resources/fun-hub", headers=admin_h)
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        titles = {it.get("title") for it in items}
        for expected in ("Code your first game", "Robot of the week", "Daily challenge: Loops"):
            assert expected in titles, f"missing seeded fun-hub: {expected}; got {titles}"

    def test_notifications_seeded(self, admin_h):
        r = requests.get(f"{API}/admin/resources/notifications", headers=admin_h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["total"] >= 2, f"expected >=2 notifications, got {j['total']}"

    def test_orders_endpoint_works(self, admin_h, student_h):
        # First create an order as student so collection is non-empty
        body = {"product_id": "prd_001", "product_name": "Robotics Starter Kit", "price": 2999}
        r0 = requests.post(f"{API}/student/site/orders", headers=student_h, json=body)
        assert r0.status_code == 200, r0.text

        r = requests.get(f"{API}/admin/resources/orders", headers=admin_h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["total"] >= 1
        it = j["items"][0]
        for f in ("id", "user_name", "product_name", "price", "status", "created_at"):
            assert f in it, f"order item missing field {f}: {it}"


# -------- 3. Notifications CRUD + search --------
class TestNotificationsCRUDSearch:
    def test_create_then_total_increases(self, admin_h):
        before = requests.get(f"{API}/admin/resources/notifications", headers=admin_h).json()["total"]
        payload = {"title": f"QA Phase2 {uuid.uuid4().hex[:6]}", "body": "auto", "audience": "all"}
        rc = requests.post(f"{API}/admin/resources/notifications", json=payload, headers=admin_h)
        assert rc.status_code == 200, rc.text
        nid = rc.json()["item"]["id"]
        after = requests.get(f"{API}/admin/resources/notifications", headers=admin_h).json()["total"]
        assert after == before + 1
        # Cleanup
        requests.delete(f"{API}/admin/resources/notifications/{nid}", headers=admin_h)

    def test_search_welcome_hits_seed(self, admin_h):
        r = requests.get(f"{API}/admin/resources/notifications", headers=admin_h, params={"q": "Welcome"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["total"] >= 1, f"expected Welcome match, got {j}"
        titles = [it.get("title", "") for it in j["items"]]
        assert any("Welcome" in t for t in titles)


# -------- 4. Regex escape edge case --------
class TestRegexEscape:
    def test_plusplus_query_does_not_500(self, admin_h):
        r = requests.get(f"{API}/admin/resources/products", headers=admin_h, params={"q": "C++"})
        assert r.status_code == 200, f"regex escape failed: {r.status_code} {r.text}"
        j = r.json()
        # No product contains "C++" in fields → 0 items
        assert j["total"] == 0
        assert j["items"] == []

    def test_parens_query_does_not_500(self, admin_h):
        r = requests.get(f"{API}/admin/resources/products", headers=admin_h, params={"q": "(test)"})
        assert r.status_code == 200, r.text


# -------- 5. Student-facing endpoints --------
class TestStudentSiteEndpoints:
    def test_student_notifications(self, student_h):
        r = requests.get(f"{API}/student/site/notifications", headers=student_h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "notifications" in j
        assert len(j["notifications"]) >= 2, f"expected >=2 notifications, got {len(j['notifications'])}"

    def test_student_fun_hub(self, student_h):
        r = requests.get(f"{API}/student/site/fun-hub", headers=student_h)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "links" in j
        assert len(j["links"]) >= 3


# -------- 6. PUT/DELETE on products --------
class TestProductsCRUD:
    def test_update_then_delete_product(self, admin_h):
        # Create a temp product
        payload = {"name": f"TEST_phase2_{uuid.uuid4().hex[:6]}", "description": "tmp", "price": 100}
        rc = requests.post(f"{API}/admin/resources/products", json=payload, headers=admin_h)
        assert rc.status_code == 200, rc.text
        pid = rc.json()["item"]["id"]

        # Update
        ru = requests.put(f"{API}/admin/resources/products/{pid}", json={"price": 150}, headers=admin_h)
        assert ru.status_code == 200, ru.text
        # Verify
        rg = requests.get(f"{API}/admin/resources/products", headers=admin_h, params={"q": payload["name"]})
        assert rg.status_code == 200
        items = rg.json()["items"]
        assert any(it["id"] == pid and it.get("price") == 150 for it in items), f"update not persisted: {items}"

        # Delete
        rd = requests.delete(f"{API}/admin/resources/products/{pid}", headers=admin_h)
        assert rd.status_code == 200
        rg2 = requests.get(f"{API}/admin/resources/products", headers=admin_h, params={"q": payload["name"]})
        assert all(it["id"] != pid for it in rg2.json()["items"])
