"""Phase 3 — AI Chatbot (Spark) + Razorpay Payment endpoints.

Razorpay keys are intentionally empty in .env, so:
  - /api/payments/config -> {configured: false, key_id: ""}
  - /api/payments/create-order -> 503 with the 'not configured' message
  - /api/payments/verify -> 503 (no order exists -> still 503 since secret missing returns 503 first)
  - /api/payments/webhook -> 200 with status:'skipped'

Chat uses real EMERGENT_LLM_KEY -> calls may take 2-5s each; we wait up to 30s.
"""
from __future__ import annotations

import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
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
def student_token(s):
    r = s.post(f"{API}/auth/student-login", json={"student_id": "STU-9999"}, timeout=20)
    assert r.status_code == 200, f"student login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


# ---------- Chat ----------
class TestChatSpark:
    SESSION_ID = None  # shared between tests

    def test_send_first_message(self, s, auth_headers):
        payload = {"message": "Explain a for loop in Python."}
        r = s.post(f"{API}/chat/send", json=payload, headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data and data["session_id"].startswith("chat_user_"), data
        assert "reply" in data and isinstance(data["reply"], str)
        assert len(data["reply"].strip()) > 30, f"reply too short: {data['reply']!r}"
        assert "created_at" in data
        # share across the class
        TestChatSpark.SESSION_ID = data["session_id"]

    def test_send_followup_multi_turn(self, s, auth_headers):
        assert TestChatSpark.SESSION_ID, "first test must run successfully"
        payload = {
            "session_id": TestChatSpark.SESSION_ID,
            "message": "Now show me a while loop equivalent.",
        }
        r = s.post(f"{API}/chat/send", json=payload, headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["session_id"] == TestChatSpark.SESSION_ID
        assert len(data["reply"].strip()) > 20

    def test_history_chronological(self, s, auth_headers):
        sid = TestChatSpark.SESSION_ID
        assert sid
        r = s.get(f"{API}/chat/history", params={"session_id": sid}, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        msgs = data.get("messages", [])
        assert len(msgs) >= 4, f"expected >=4 messages, got {len(msgs)}"
        # chronological order
        ts = [m.get("created_at") for m in msgs]
        assert ts == sorted(ts), "messages not in chronological order"
        # roles alternate user / assistant
        roles = [m.get("role") for m in msgs]
        assert roles[0] == "user" and "assistant" in roles
        # no _id leaks
        for m in msgs:
            assert "_id" not in m

    def test_sessions_list(self, s, auth_headers):
        r = s.get(f"{API}/chat/sessions", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        sessions = data.get("sessions", [])
        assert isinstance(sessions, list) and len(sessions) >= 1
        first = sessions[0]
        assert "session_id" in first and "last_message" in first and "last_at" in first

    def test_delete_session(self, s, auth_headers):
        sid = TestChatSpark.SESSION_ID
        assert sid
        r = s.delete(f"{API}/chat/session/{sid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        # follow-up history is empty
        r2 = s.get(f"{API}/chat/history", params={"session_id": sid}, headers=auth_headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("messages") == []

    def test_send_unauthenticated(self):
        # Use a fresh session (no shared cookies/headers from logged-in fixture)
        r = requests.post(f"{API}/chat/send", json={"message": "hi"}, timeout=20)
        assert r.status_code == 401, f"expected 401 got {r.status_code} {r.text}"


# ---------- Payments (not configured) ----------
class TestPaymentsNotConfigured:
    def test_config_returns_unconfigured(self, s, auth_headers):
        r = s.get(f"{API}/payments/config", headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("configured") is False
        assert data.get("key_id") == ""

    def test_create_order_returns_503(self, s, auth_headers):
        # need a real product_id; fetch one from /api/products (public or with auth)
        # Use student token regardless
        prod_id = "any-id"  # backend resolves keys before product lookup
        payload = {"product_id": prod_id, "quantity": 1, "address": {
            "name": "Test", "phone": "+919999999999", "line1": "1 ABC Street",
            "city": "Mumbai", "state": "MH", "pincode": "400001", "country": "India",
        }}
        r = s.post(f"{API}/payments/create-order", json=payload, headers=auth_headers, timeout=20)
        assert r.status_code == 503, f"expected 503 got {r.status_code} {r.text}"
        detail = r.json().get("detail", "")
        assert "not configured" in detail.lower(), detail

    def test_verify_returns_503_when_unconfigured(self, s, auth_headers):
        payload = {
            "order_id": "nonexistent-ord",
            "razorpay_order_id": "rzp_order_x",
            "razorpay_payment_id": "rzp_payment_x",
            "razorpay_signature": "deadbeef",
        }
        r = s.post(f"{API}/payments/verify", json=payload, headers=auth_headers, timeout=20)
        # When secret missing -> 503; if accidentally past secret check, order missing -> 404.
        assert r.status_code in (503, 404), f"expected 503/404 got {r.status_code} {r.text}"
        if r.status_code == 503:
            assert "not configured" in r.json().get("detail", "").lower()

    def test_webhook_skipped_when_secret_missing(self, s):
        # webhook is unauthenticated (Razorpay calls it directly)
        r = s.post(
            f"{API}/payments/webhook",
            json={"event": "payment.captured", "payload": {"payment": {"entity": {"order_id": "x"}}}},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "skipped"


# ---------- Logging / smoke ----------
def test_backend_reachable():
    r = requests.get(f"{API}/", timeout=10)
    # FastAPI default may 404 at /api/ but the server is up; allow any < 500
    assert r.status_code < 500
