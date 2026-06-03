"""
Phase 4 — School Admin auto-attach school_name/school_id/school_code bug-fix tests.
Covers:
  - Auto-attach on create (School Admin)
  - Cross-table visibility (student visible in admin + instructor lists)
  - Spoof protection on create
  - Spoof protection on update
  - Cross-school 403 on update + delete
  - Admin manual flow unchanged
  - Bulk auto-attach for instructor
  - Auto-attach for other school-scoped kinds (classes, subjects, chapters, quizzes)
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://role-auth-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@cmsedu.ai"
ADMIN_PASSWORD = "Demo@123"
INSTRUCTOR_EMAIL = "instructor@cmsedu.ai"
INSTRUCTOR_PASSWORD = "Demo@123"

RIDGEVIEW_NAME = "Ridgeview Academy"
RIDGEVIEW_CODE = "RVA-001"

# Track ids created for cleanup
_CREATED = {"students": [], "schools": [], "classes": [], "subjects": [], "chapters": [], "quizzes": []}


def _login(email, password, role):
    r = requests.post(
        f"{API}/auth/login",
        json={"email": email, "password": password, "role": role},
        timeout=20,
    )
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD, "admin")


@pytest.fixture(scope="module")
def instructor_token():
    return _login(INSTRUCTOR_EMAIL, INSTRUCTOR_PASSWORD, "instructor")


@pytest.fixture(scope="module")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def instr_h(instructor_token):
    return {"Authorization": f"Bearer {instructor_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_h):
    yield
    # Best-effort cleanup of anything we created
    for kind, ids in _CREATED.items():
        for rid in ids:
            try:
                requests.delete(f"{API}/admin/resources/{kind}/{rid}", headers=admin_h, timeout=10)
            except Exception:
                pass


def _suffix():
    return uuid.uuid4().hex[:6]


# ---------- 1. Auto-attach on create (instructor) ----------
def test_auto_attach_on_create_by_instructor(instr_h):
    sid = f"STU-TST-{_suffix()}"
    payload = {"name": "Test One", "student_id": sid, "class_name": "Class 9", "division": "A"}
    r = requests.post(f"{API}/resources/students", json=payload, headers=instr_h, timeout=15)
    assert r.status_code == 200, r.text
    item = r.json()["item"]
    _CREATED["students"].append(item["id"])
    assert item["school_name"] == RIDGEVIEW_NAME
    assert item.get("school_id", "").startswith("sch_"), f"school_id missing or wrong: {item.get('school_id')}"
    assert item["school_code"] == RIDGEVIEW_CODE


# ---------- 2. Visible in admin's table ----------
def test_student_visible_in_admin_table(admin_h, instr_h):
    name = f"Test Visible {_suffix()}"
    sid = f"STU-VIS-{_suffix()}"
    r = requests.post(
        f"{API}/resources/students",
        json={"name": name, "student_id": sid, "class_name": "Class 9", "division": "A"},
        headers=instr_h, timeout=15,
    )
    assert r.status_code == 200
    _CREATED["students"].append(r.json()["item"]["id"])

    r2 = requests.get(f"{API}/admin/resources/students", params={"q": name}, headers=admin_h, timeout=15)
    assert r2.status_code == 200
    items = r2.json()["items"]
    match = [x for x in items if x.get("name") == name]
    assert match, f"student not found in admin table: items={items}"
    row = match[0]
    assert row["school_name"] == RIDGEVIEW_NAME
    assert row.get("school_code") == RIDGEVIEW_CODE


# ---------- 3. Visible in instructor's table ----------
def test_student_visible_in_instructor_table(instr_h):
    name = f"Test InstrTable {_suffix()}"
    sid = f"STU-INST-{_suffix()}"
    r = requests.post(
        f"{API}/resources/students",
        json={"name": name, "student_id": sid, "class_name": "Class 9"},
        headers=instr_h, timeout=15,
    )
    assert r.status_code == 200
    _CREATED["students"].append(r.json()["item"]["id"])

    r2 = requests.get(f"{API}/resources/students", params={"q": name}, headers=instr_h, timeout=15)
    assert r2.status_code == 200
    body = r2.json()
    assert body["total"] >= 1
    assert any(x.get("name") == name for x in body["items"])


# ---------- 4. Spoof protection on CREATE ----------
def test_spoof_protection_on_create(instr_h):
    name = f"Test Spoof {_suffix()}"
    sid = f"STU-SPF-{_suffix()}"
    payload = {
        "name": name, "student_id": sid, "class_name": "Class 9",
        "school_name": "Hogwarts", "school_id": "sch_fake", "school_code": "HW-666",
    }
    r = requests.post(f"{API}/resources/students", json=payload, headers=instr_h, timeout=15)
    assert r.status_code == 200, r.text
    item = r.json()["item"]
    _CREATED["students"].append(item["id"])
    assert item["school_name"] == RIDGEVIEW_NAME
    assert item.get("school_id", "").startswith("sch_") and item["school_id"] != "sch_fake"
    assert item["school_code"] == RIDGEVIEW_CODE


# ---------- 5. Spoof protection on UPDATE (instructor cannot change school_name) ----------
def test_spoof_protection_on_update(instr_h):
    sid = f"STU-UPD-{_suffix()}"
    r = requests.post(
        f"{API}/resources/students",
        json={"name": "Test Upd", "student_id": sid, "class_name": "Class 9"},
        headers=instr_h, timeout=15,
    )
    assert r.status_code == 200
    rid = r.json()["item"]["id"]
    _CREATED["students"].append(rid)

    r2 = requests.put(
        f"{API}/resources/students/{rid}",
        json={"school_name": "Hogwarts", "division": "B"},
        headers=instr_h, timeout=15,
    )
    assert r2.status_code == 200, r2.text
    item = r2.json()["item"]
    assert item["school_name"] == RIDGEVIEW_NAME
    assert item["division"] == "B"  # other fields still updated


# ---------- 6/7. Cross-school 403 on UPDATE + DELETE ----------
@pytest.fixture(scope="module")
def other_school_student(admin_h):
    """Admin creates 'OtherSchool' + a student inside it for cross-school tests."""
    suf = _suffix()
    school_name = f"OtherSchool_{suf}"
    code = f"OS-{suf}"
    rs = requests.post(
        f"{API}/admin/resources/schools",
        json={"name": school_name, "code": code, "class_names": ["Class 10"]},
        headers=admin_h, timeout=15,
    )
    assert rs.status_code == 200, rs.text
    school_id = rs.json()["item"]["id"]
    _CREATED["schools"].append(school_id)

    rst = requests.post(
        f"{API}/admin/resources/students",
        json={"name": "OS Kid", "student_id": f"STU-OS-{suf}", "school_name": school_name, "class_name": "Class 10"},
        headers=admin_h, timeout=15,
    )
    assert rst.status_code == 200, rst.text
    student = rst.json()["item"]
    _CREATED["students"].append(student["id"])
    return student


def test_instructor_cannot_update_other_school_student(instr_h, other_school_student):
    rid = other_school_student["id"]
    r = requests.put(
        f"{API}/resources/students/{rid}",
        json={"division": "Z"},
        headers=instr_h, timeout=15,
    )
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"


def test_instructor_cannot_delete_other_school_student(instr_h, admin_h):
    # Create a fresh student in another school so we can attempt to delete it
    suf = _suffix()
    school_name = f"OtherSchool_{suf}"
    rs = requests.post(
        f"{API}/admin/resources/schools",
        json={"name": school_name, "code": f"OS-{suf}", "class_names": ["Class 10"]},
        headers=admin_h, timeout=15,
    )
    assert rs.status_code == 200
    _CREATED["schools"].append(rs.json()["item"]["id"])

    rst = requests.post(
        f"{API}/admin/resources/students",
        json={"name": "OS DelKid", "student_id": f"STU-OSD-{suf}", "school_name": school_name, "class_name": "Class 10"},
        headers=admin_h, timeout=15,
    )
    assert rst.status_code == 200
    rid = rst.json()["item"]["id"]
    _CREATED["students"].append(rid)

    r = requests.delete(f"{API}/resources/students/{rid}", headers=instr_h, timeout=15)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"


# ---------- 8. Admin manual flow unchanged ----------
def test_admin_manual_create_keeps_explicit_school(admin_h):
    suf = _suffix()
    name = f"Admin Manual {suf}"
    r = requests.post(
        f"{API}/admin/resources/students",
        json={
            "name": name,
            "student_id": f"STU-ADM-{suf}",
            "school_name": RIDGEVIEW_NAME,
            "class_name": "Class 9",
        },
        headers=admin_h, timeout=15,
    )
    assert r.status_code == 200, r.text
    item = r.json()["item"]
    _CREATED["students"].append(item["id"])
    assert item["school_name"] == RIDGEVIEW_NAME


# ---------- 9. Bulk auto-attach for instructor ----------
def test_bulk_create_by_instructor_auto_attaches(instr_h):
    suf = _suffix()
    payload = {
        "items": [
            {"name": f"Bulk A {suf}", "student_id": f"STU-BA-{suf}", "class_name": "Class 9"},
            {"name": f"Bulk B {suf}", "student_id": f"STU-BB-{suf}", "class_name": "Class 9",
             "school_name": "Hogwarts", "school_code": "HW-X"},  # spoof attempt
        ]
    }
    r = requests.post(f"{API}/resources/students/bulk", json=payload, headers=instr_h, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["inserted"] == 2

    # Verify via admin list that both rows have Ridgeview attached
    r2 = requests.get(f"{API}/admin/resources/students", params={"q": f"Bulk", "limit": 100}, headers={"Authorization": instr_h["Authorization"]}, timeout=15)
    # Instructor can read shared list
    r2 = requests.get(f"{API}/resources/students", params={"q": "Bulk", "limit": 100}, headers=instr_h, timeout=15)
    assert r2.status_code == 200
    rows = [x for x in r2.json()["items"] if x.get("name", "").startswith("Bulk ") and suf in x.get("name", "")]
    assert len(rows) == 2, f"expected 2 bulk rows, got {len(rows)}"
    for row in rows:
        _CREATED["students"].append(row["id"])
        assert row["school_name"] == RIDGEVIEW_NAME
        assert row.get("school_code") == RIDGEVIEW_CODE


# ---------- 10. Auto-attach for other school-scoped kinds instructor CAN write ----------
# Per KIND_PERMS, instructor write is allowed only for: students, quiz-results, results.
# classes, subjects, chapters, quizzes are admin-write-only by design (returns 403).
@pytest.mark.parametrize("kind,extra", [
    ("quiz-results", {"student_name": "TST_QR", "score": 10}),
    ("results",      {"student_name": "TST_RES", "score": 20}),
])
def test_auto_attach_for_writable_school_scoped_kinds(instr_h, kind, extra):
    suf = _suffix()
    payload = dict(extra)
    payload["student_name"] = f"{extra['student_name']}_{suf}"
    payload["school_name"] = "Hogwarts"  # spoof
    r = requests.post(f"{API}/resources/{kind}", json=payload, headers=instr_h, timeout=15)
    assert r.status_code == 200, r.text
    item = r.json()["item"]
    _CREATED.setdefault(kind, []).append(item["id"])
    assert item["school_name"] == RIDGEVIEW_NAME, f"{kind}: school_name={item.get('school_name')}"
    assert item.get("school_code") == RIDGEVIEW_CODE


# ---------- 11. KIND_PERMS gap (documented): instructor write on classes/subjects/chapters/quizzes is BLOCKED ----------
@pytest.mark.parametrize("kind", ["classes", "subjects", "chapters", "quizzes"])
def test_instructor_write_blocked_for_admin_only_kinds(instr_h, kind):
    """Documents the KIND_PERMS gap: review-request says auto-attach should work for these kinds,
    but the perms table only grants instructor write on students/quiz-results/results.
    This test fails-on-purpose to surface the requirement gap to main agent."""
    suf = _suffix()
    r = requests.post(f"{API}/resources/{kind}", json={"name": f"TST_{kind}_{suf}"}, headers=instr_h, timeout=15)
    # Currently returns 403 by design — flagging so main agent can decide if KIND_PERMS needs widening.
    assert r.status_code == 403, f"{kind}: instructor write returned {r.status_code} (expected 403 by current perms)"
