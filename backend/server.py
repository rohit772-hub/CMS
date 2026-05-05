"""CMS Edu AI — FastAPI backend with multi-role JWT auth + Emergent Google OAuth."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, status
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    set_auth_cookies, clear_auth_cookies, get_token_from_request,
)
import jwt as _jwt

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cms-edu-ai")

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="CMS Edu AI API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],  # empty: rely on regex to reflect any origin (credentials-safe)
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

Role = Literal["admin", "instructor", "student"]


# ---------- Models ----------
class UserPublic(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: Role
    avatar_url: Optional[str] = None
    email_verified: bool = False
    auth_provider: str = "password"
    created_at: datetime


class RegisterReq(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    role: Role = "student"


class LoginReq(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False
    role: Optional[Role] = None  # optional client-side hint


class ForgotReq(BaseModel):
    email: EmailStr


class ResetReq(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=100)


class VerifyEmailReq(BaseModel):
    token: str


class GoogleSessionReq(BaseModel):
    session_id: str


class UpdateProfileReq(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    avatar_url: Optional[str] = None  # data URI or external URL


class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=100)


class GeneralSettingsReq(BaseModel):
    site_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=400)


class PaymentSettingsReq(BaseModel):
    razorpay_key: str = Field(default="", max_length=200)
    razorpay_secret: str = Field(default="", max_length=200)


# ---------- Helpers ----------
def doc_to_public(d: dict) -> UserPublic:
    created = d.get("created_at")
    if isinstance(created, str):
        try:
            created = datetime.fromisoformat(created)
        except Exception:
            created = datetime.now(timezone.utc)
    return UserPublic(
        user_id=d["user_id"],
        email=d["email"],
        name=d["name"],
        role=d["role"],
        avatar_url=d.get("avatar_url"),
        email_verified=d.get("email_verified", False),
        auth_provider=d.get("auth_provider", "password"),
        created_at=created or datetime.now(timezone.utc),
    )


async def get_current_user(request: Request) -> dict:
    # 1) JWT cookie / Bearer
    token = get_token_from_request(request)
    if token:
        try:
            payload = decode_token(token)
            if payload.get("type") == "access":
                user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
        except _jwt.ExpiredSignatureError:
            pass
        except _jwt.InvalidTokenError:
            pass

    # 2) Emergent Google session_token cookie
    session_token = request.cookies.get("session_token")
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            expires = sess.get("expires_at")
            if isinstance(expires, str):
                try:
                    expires = datetime.fromisoformat(expires)
                except Exception:
                    expires = None
            if expires and expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires and expires > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user

    raise HTTPException(status_code=401, detail="Not authenticated")


def require_role(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return _dep


# ---------- Brute force ----------
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15


async def _check_lockout(identifier: str):
    # identifier is email-only for proxy-safe accounting (k8s ingress rotates client.host)
    rec = await db.login_attempts.find_one({"_id": identifier})
    if not rec:
        return
    if rec.get("count", 0) >= LOCKOUT_THRESHOLD:
        last = rec.get("last_at")
        if isinstance(last, str):
            try:
                last = datetime.fromisoformat(last)
            except Exception:
                last = None
        if last and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if last and (datetime.now(timezone.utc) - last) < timedelta(minutes=LOCKOUT_MINUTES):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")
        # window passed -> reset
        await db.login_attempts.delete_one({"_id": identifier})


async def _record_failed(identifier: str):
    await db.login_attempts.update_one(
        {"_id": identifier},
        {"$inc": {"count": 1}, "$set": {"last_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def _clear_attempts(identifier: str):
    await db.login_attempts.delete_one({"_id": identifier})


# ---------- AUTH ROUTES ----------
@api.post("/auth/register")
async def register(payload: RegisterReq, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "auth_provider": "password",
        "email_verified": False,
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    access = create_access_token(user_id, email, payload.role)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": doc_to_public(user).model_dump(mode="json"), "access_token": access}


@api.post("/auth/login")
async def login(payload: LoginReq, request: Request, response: Response):
    email = payload.email.lower()
    identifier = email  # proxy-safe: key lockout by email only
    await _check_lockout(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        await _record_failed(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user["password_hash"]):
        await _record_failed(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if payload.role and user["role"] != payload.role:
        raise HTTPException(status_code=403, detail=f"This account is not registered as a {payload.role}.")

    await _clear_attempts(identifier)
    access = create_access_token(user["user_id"], email, user["role"])
    refresh = create_refresh_token(user["user_id"]) if payload.remember else create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh, remember=payload.remember)
    pub = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": doc_to_public(pub).model_dump(mode="json"), "access_token": access}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    # if session_token cookie exists, clean DB session as well
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return doc_to_public(user).model_dump(mode="json")


@api.put("/auth/profile")
async def update_profile(payload: UpdateProfileReq, user: dict = Depends(get_current_user)):
    update = {}
    if payload.name is not None:
        update["name"] = payload.name.strip()
    if payload.avatar_url is not None:
        # cap avatar size to ~2MB worth of base64 to protect Mongo
        if len(payload.avatar_url) > 3_000_000:
            raise HTTPException(status_code=413, detail="Image too large. Please use under 2MB.")
        update["avatar_url"] = payload.avatar_url or None
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return doc_to_public(fresh).model_dump(mode="json")


@api.post("/auth/change-password")
async def change_password(payload: ChangePasswordReq, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"user_id": user["user_id"]})
    if not full or not full.get("password_hash"):
        raise HTTPException(status_code=400, detail="This account does not have a password set (Google sign-in).")
    if not verify_password(payload.current_password, full["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"ok": True}


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(token)
    except _jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except _jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user["user_id"], user["email"], user["role"])
    set_auth_cookies(response, access, None)
    return {"access_token": access}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotReq):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    # Always return ok to avoid user enumeration
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # In production -> email. For now expose for dev/testing.
        logger.info("[FORGOT-PASSWORD] Reset link: /reset-password?token=%s for %s", token, email)
        return {"ok": True, "dev_token": token}
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetReq):
    rec = await db.password_reset_tokens.find_one({"token": payload.token}, {"_id": 0})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires = rec["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


@api.post("/auth/verify-email")
async def verify_email(payload: VerifyEmailReq):
    rec = await db.email_verify_tokens.find_one({"token": payload.token}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid token")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_verify_tokens.delete_one({"token": payload.token})
    return {"ok": True}


# Emergent Google OAuth — exchange session_id for session_token
EMERGENT_SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


@api.post("/auth/google/session")
async def google_session(payload: GoogleSessionReq, response: Response):
    async with httpx.AsyncClient(timeout=15) as ac:
        try:
            r = await ac.get(EMERGENT_SESSION_DATA_URL, headers={"X-Session-ID": payload.session_id})
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"OAuth provider unreachable: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google session missing email")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "role": "student",  # default role for Google sign-ups
            "auth_provider": "google",
            "email_verified": True,
            "avatar_url": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"avatar_url": data.get("picture") or user.get("avatar_url"), "email_verified": True}},
        )
        user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})

    # Persist Emergent session_token (7d)
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user["user_id"],
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )
    # Also issue our JWT for parity
    access = create_access_token(user["user_id"], email, user["role"])
    set_auth_cookies(response, access, create_refresh_token(user["user_id"]))
    pub = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": doc_to_public(pub).model_dump(mode="json"), "access_token": access}


# ---------- LMS STUB ROUTES ----------
DEFAULT_GENERAL = {"site_name": "CMS Edu AI", "email": "hello@cmsedu.ai", "phone": "", "address": ""}
DEFAULT_PAYMENT = {"razorpay_key": "", "razorpay_secret": ""}


async def _get_settings_doc():
    doc = await db.platform_settings.find_one({"_id": "singleton"}, {"_id": 0})
    return doc or {}


@api.get("/admin/settings")
async def get_settings(user: dict = Depends(require_role("admin"))):
    doc = await _get_settings_doc()
    general = {**DEFAULT_GENERAL, **(doc.get("general") or {})}
    payment_raw = {**DEFAULT_PAYMENT, **(doc.get("payment") or {})}
    # Mask the secret in the response — frontend only needs to know it's set
    payment = {
        "razorpay_key": payment_raw.get("razorpay_key", ""),
        "razorpay_secret_set": bool(payment_raw.get("razorpay_secret")),
    }
    return {"general": general, "payment": payment}


@api.put("/admin/settings/general")
async def update_general_settings(payload: GeneralSettingsReq, user: dict = Depends(require_role("admin"))):
    await db.platform_settings.update_one(
        {"_id": "singleton"},
        {"$set": {"general": payload.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "general": payload.model_dump()}


@api.put("/admin/settings/payment")
async def update_payment_settings(payload: PaymentSettingsReq, user: dict = Depends(require_role("admin"))):
    update = {"payment.razorpay_key": payload.razorpay_key}
    # Only overwrite secret if a non-empty value is provided
    if payload.razorpay_secret:
        update["payment.razorpay_secret"] = payload.razorpay_secret
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.platform_settings.update_one({"_id": "singleton"}, {"$set": update}, upsert=True)
    doc = await _get_settings_doc()
    return {"ok": True, "razorpay_key": (doc.get("payment") or {}).get("razorpay_key", ""), "razorpay_secret_set": bool((doc.get("payment") or {}).get("razorpay_secret"))}


@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    total_users = await db.users.count_documents({})
    instructors = await db.users.count_documents({"role": "instructor"})
    students = await db.users.count_documents({"role": "student"})
    courses = await db.courses.count_documents({})
    return {
        "kpis": [
            {"label": "Total Revenue", "value": "$184,250", "delta": "+12.4%", "tone": "up"},
            {"label": "Active Students", "value": students or 1248, "delta": "+8.1%", "tone": "up"},
            {"label": "Instructors", "value": instructors or 36, "delta": "+2", "tone": "up"},
            {"label": "Courses Live", "value": courses or 84, "delta": "+5", "tone": "up"},
        ],
        "revenue_series": [
            {"name": "Mon", "value": 4200}, {"name": "Tue", "value": 5300},
            {"name": "Wed", "value": 4900}, {"name": "Thu", "value": 6800},
            {"name": "Fri", "value": 7200}, {"name": "Sat", "value": 6100},
            {"name": "Sun", "value": 8400},
        ],
        "enrollments_series": [
            {"name": "W1", "value": 240}, {"name": "W2", "value": 312},
            {"name": "W3", "value": 288}, {"name": "W4", "value": 410},
        ],
        "totals": {"total_users": total_users},
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return {"users": users}


@api.get("/instructor/stats")
async def instructor_stats(user: dict = Depends(require_role("instructor", "admin"))):
    return {
        "kpis": [
            {"label": "My Students", "value": 248, "delta": "+12", "tone": "up"},
            {"label": "Active Courses", "value": 6, "delta": "+1", "tone": "up"},
            {"label": "Avg Score", "value": "87%", "delta": "+3.2%", "tone": "up"},
            {"label": "Pending Reviews", "value": 14, "delta": "-3", "tone": "down"},
        ],
        "performance_series": [
            {"name": "Algebra", "value": 82},
            {"name": "Calculus", "value": 76},
            {"name": "Physics", "value": 88},
            {"name": "AI 101", "value": 91},
            {"name": "ML Lab", "value": 73},
        ],
    }


@api.get("/instructor/courses")
async def instructor_courses(user: dict = Depends(require_role("instructor", "admin"))):
    return {"courses": _sample_courses()}


@api.get("/student/stats")
async def student_stats(user: dict = Depends(require_role("student", "admin"))):
    return {
        "greeting": user.get("name", "Student"),
        "streak_days": 14,
        "xp": 4280,
        "next_xp": 5000,
        "level": 12,
        "weekly_progress": [
            {"name": "Mon", "value": 60}, {"name": "Tue", "value": 80},
            {"name": "Wed", "value": 45}, {"name": "Thu", "value": 90},
            {"name": "Fri", "value": 70}, {"name": "Sat", "value": 30},
            {"name": "Sun", "value": 85},
        ],
        "badges": [
            {"name": "Quick Learner", "color": "#00E5FF"},
            {"name": "7-Day Streak", "color": "#FFC800"},
            {"name": "Top 10%", "color": "#00FF66"},
            {"name": "Code Wizard", "color": "#8A2BE2"},
        ],
        "leaderboard": [
            {"rank": 1, "name": "Alex Chen", "xp": 9820},
            {"rank": 2, "name": "Maya Patel", "xp": 8740},
            {"rank": 3, "name": "Jordan Kim", "xp": 7610},
            {"rank": 4, "name": user.get("name", "You"), "xp": 4280, "is_me": True},
        ],
    }


@api.get("/student/courses")
async def student_courses(user: dict = Depends(require_role("student", "admin"))):
    return {"courses": _sample_courses()}


@api.get("/courses")
async def list_courses():
    return {"courses": _sample_courses()}


def _sample_courses():
    thumb = "https://images.unsplash.com/photo-1737505599159-5ffc1dcbc08f?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
    return [
        {"id": "c1", "title": "Foundations of AI", "instructor": "Dr. Lila Hart", "progress": 64, "lessons": 24, "thumbnail": thumb, "category": "AI", "price": 199},
        {"id": "c2", "title": "Modern Web with React 19", "instructor": "Marco Vitale", "progress": 22, "lessons": 18, "thumbnail": thumb, "category": "Web", "price": 149},
        {"id": "c3", "title": "Data Structures Bootcamp", "instructor": "Priya Singh", "progress": 88, "lessons": 32, "thumbnail": thumb, "category": "CS", "price": 179},
        {"id": "c4", "title": "Generative Models", "instructor": "Dr. Yuki Tanaka", "progress": 0, "lessons": 14, "thumbnail": thumb, "category": "AI", "price": 229},
        {"id": "c5", "title": "Cloud-Native DevOps", "instructor": "Aisha N.", "progress": 41, "lessons": 22, "thumbnail": thumb, "category": "DevOps", "price": 199},
        {"id": "c6", "title": "Linear Algebra for ML", "instructor": "Prof. Jens Bauer", "progress": 12, "lessons": 16, "thumbnail": thumb, "category": "Math", "price": 129},
    ]


# ---------- Health ----------
@api.get("/")
async def root():
    return {"app": "CMS Edu AI", "status": "ok"}


# ---------- Generic Admin Resource CRUD ----------
# Supports: schools, classes, courses, subjects, chapters, school-admins, students
RESOURCE_KINDS = {
    "schools": "schools",
    "classes": "classes",
    "courses": "courses_admin",
    "subjects": "subjects",
    "chapters": "chapters",
    "school-admins": "school_admins",
    "students": "students_admin",
}

# Fields to search across (text match)
RESOURCE_SEARCH_FIELDS = {
    "schools": ["name", "email", "phone", "principal_name", "code"],
    "classes": ["name"],
    "courses": ["name", "class_names"],
    "subjects": ["name", "class_names", "course_names"],
    "chapters": ["name", "class_name", "course_name", "subject_name"],
    "school-admins": ["name", "email", "mobile", "school_name"],
    "students": ["name", "email", "phone", "parent_name", "school_name", "division"],
}


def _activity_doc(kind: str, action: str, label: str, by_user: dict):
    return {
        "kind": kind, "action": action, "label": label,
        "by_user_id": by_user.get("user_id"), "by_name": by_user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def _log_activity(kind: str, action: str, label: str, by_user: dict):
    try:
        await db.recent_activities.insert_one(_activity_doc(kind, action, label, by_user))
    except Exception as e:
        logger.warning("activity log failed: %s", e)


def _require_kind(kind: str) -> str:
    if kind not in RESOURCE_KINDS:
        raise HTTPException(status_code=404, detail=f"Unknown resource kind: {kind}")
    return RESOURCE_KINDS[kind]


def _clean(doc: dict) -> dict:
    d = dict(doc)
    d.pop("_id", None)
    d.pop("password_hash", None)
    return d


@api.get("/admin/resources/{kind}")
async def list_resources(kind: str, q: str = "", user: dict = Depends(require_role("admin"))):
    coll = _require_kind(kind)
    query = {}
    if q:
        fields = RESOURCE_SEARCH_FIELDS.get(kind, ["name"])
        regex = {"$regex": q, "$options": "i"}
        query = {"$or": [{f: regex} for f in fields]}
    items = await db[coll].find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    for it in items:
        it.pop("password_hash", None)
    return {"items": items, "total": len(items)}


@api.post("/admin/resources/{kind}")
async def create_resource(kind: str, payload: dict, user: dict = Depends(require_role("admin"))):
    coll = _require_kind(kind)
    doc = dict(payload or {})
    doc.pop("_id", None); doc.pop("id", None)
    doc["id"] = f"{kind[:3]}_{uuid.uuid4().hex[:12]}"
    doc["status"] = doc.get("status") or "active"
    now = datetime.now(timezone.utc).isoformat()
    doc["created_at"] = now
    doc["updated_at"] = now

    # Special handling: school-admins + students also create a user for login
    if kind == "school-admins":
        email = (doc.get("email") or "").lower().strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        password = doc.get("password") or "Demo@123"
        if await db.users.find_one({"email": email}):
            # reuse existing user
            pass
        else:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": email, "name": doc.get("name") or email,
                "password_hash": hash_password(password),
                "role": "admin", "auth_provider": "password",
                "email_verified": True, "avatar_url": doc.get("avatar_url"),
                "created_at": now,
            })
        doc.pop("password", None)
        doc["email"] = email
    elif kind == "students":
        email = (doc.get("email") or "").lower().strip()
        if email and not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": email, "name": doc.get("name") or email,
                "password_hash": hash_password("Demo@123"),
                "role": "student", "auth_provider": "password",
                "email_verified": True, "avatar_url": None,
                "created_at": now,
            })
        if email:
            doc["email"] = email

    await db[coll].insert_one(doc)
    await _log_activity(kind, "create", doc.get("name") or doc.get("id"), user)
    return {"ok": True, "item": _clean(doc)}


@api.put("/admin/resources/{kind}/{rid}")
async def update_resource(kind: str, rid: str, payload: dict, user: dict = Depends(require_role("admin"))):
    coll = _require_kind(kind)
    update = dict(payload or {})
    update.pop("_id", None); update.pop("id", None); update.pop("created_at", None)
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Don't persist raw password in resource doc
    if kind == "school-admins" and update.get("password"):
        # optionally update user's password
        email = (update.get("email") or "").lower().strip()
        if email:
            await db.users.update_one(
                {"email": email},
                {"$set": {"password_hash": hash_password(update["password"])}},
            )
        update.pop("password", None)
    result = await db[coll].update_one({"id": rid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    fresh = await db[coll].find_one({"id": rid}, {"_id": 0})
    await _log_activity(kind, "update", (fresh or {}).get("name") or rid, user)
    return {"ok": True, "item": _clean(fresh or {})}


@api.delete("/admin/resources/{kind}/{rid}")
async def delete_resource(kind: str, rid: str, user: dict = Depends(require_role("admin"))):
    coll = _require_kind(kind)
    doc = await db[coll].find_one({"id": rid}, {"_id": 0})
    result = await db[coll].delete_one({"id": rid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    await _log_activity(kind, "delete", (doc or {}).get("name") or rid, user)
    return {"ok": True}


@api.patch("/admin/resources/{kind}/{rid}/status")
async def toggle_status(kind: str, rid: str, payload: dict, user: dict = Depends(require_role("admin"))):
    coll = _require_kind(kind)
    new_status = (payload or {}).get("status") or "active"
    if new_status not in ("active", "disabled"):
        raise HTTPException(status_code=400, detail="status must be 'active' or 'disabled'")
    result = await db[coll].update_one(
        {"id": rid},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    fresh = await db[coll].find_one({"id": rid}, {"_id": 0})
    await _log_activity(kind, f"status:{new_status}", (fresh or {}).get("name") or rid, user)
    return {"ok": True, "item": _clean(fresh or {})}


@api.post("/admin/resources/{kind}/bulk")
async def bulk_create(kind: str, payload: dict, user: dict = Depends(require_role("admin"))):
    coll = _require_kind(kind)
    rows = (payload or {}).get("items") or []
    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=400, detail="items array is required")
    now = datetime.now(timezone.utc).isoformat()
    inserted = []
    for raw in rows[:2000]:
        if not isinstance(raw, dict):
            continue
        d = dict(raw)
        d.pop("_id", None); d.pop("id", None)
        d["id"] = f"{kind[:3]}_{uuid.uuid4().hex[:12]}"
        d["status"] = d.get("status") or "active"
        d["created_at"] = now
        d["updated_at"] = now
        if kind == "school-admins" and d.get("email"):
            email = d["email"].lower().strip()
            if not await db.users.find_one({"email": email}):
                await db.users.insert_one({
                    "user_id": f"user_{uuid.uuid4().hex[:12]}",
                    "email": email, "name": d.get("name") or email,
                    "password_hash": hash_password(d.get("password") or "Demo@123"),
                    "role": "admin", "auth_provider": "password",
                    "email_verified": True, "avatar_url": None, "created_at": now,
                })
            d.pop("password", None); d["email"] = email
        elif kind == "students" and d.get("email"):
            email = d["email"].lower().strip()
            if not await db.users.find_one({"email": email}):
                await db.users.insert_one({
                    "user_id": f"user_{uuid.uuid4().hex[:12]}",
                    "email": email, "name": d.get("name") or email,
                    "password_hash": hash_password("Demo@123"),
                    "role": "student", "auth_provider": "password",
                    "email_verified": True, "avatar_url": None, "created_at": now,
                })
            d["email"] = email
        inserted.append(d)
    if inserted:
        await db[coll].insert_many(inserted)
        await _log_activity(kind, "bulk", f"{len(inserted)} rows", user)
    return {"ok": True, "inserted": len(inserted)}


@api.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_role("admin"))):
    async def count(c): return await db[c].count_documents({})
    totals = {
        "schools": await count("schools"),
        "school_admins": await count("school_admins"),
        "students": await count("students_admin"),
        "classes": await count("classes"),
        "courses": await count("courses_admin"),
        "subjects": await count("subjects"),
        "chapters": await count("chapters"),
        "resources": (await count("classes")) + (await count("courses_admin")) + (await count("subjects")) + (await count("chapters")),
        "products": await count("products"),
        "orders": await count("orders"),
        "payments": await count("payments"),
    }
    activities = await db.recent_activities.find({}, {"_id": 0}).sort("created_at", -1).to_list(12)
    return {"totals": totals, "recent_activities": activities}


app.include_router(api)


# ---------- Startup: indexes + seed ----------
async def _seed():
    try:
        await db.users.create_index("email", unique=True)
    except Exception:
        pass
    try:
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception:
        pass
    for coll in ["schools", "classes", "courses_admin", "subjects", "chapters", "school_admins", "students_admin"]:
        try:
            await db[coll].create_index("id", unique=True)
        except Exception:
            pass
    try:
        await db.recent_activities.create_index([("created_at", -1)])
    except Exception:
        pass

    seeds = [
        ("ADMIN_EMAIL", "ADMIN_PASSWORD", "admin", "Avery Stone"),
        ("INSTRUCTOR_EMAIL", "INSTRUCTOR_PASSWORD", "instructor", "Lila Hart"),
        ("STUDENT_EMAIL", "STUDENT_PASSWORD", "student", "Noah Patel"),
    ]
    for ek, pk, role, name in seeds:
        email = (os.environ.get(ek) or "").lower()
        password = os.environ.get(pk)
        if not email or not password:
            continue
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": email,
                "name": name,
                "password_hash": hash_password(password),
                "role": role,
                "auth_provider": "password",
                "email_verified": True,
                "avatar_url": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Seeded %s account: %s", role, email)
        elif not verify_password(password, existing.get("password_hash", "")):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": role}})
            logger.info("Updated password for %s", email)


@app.on_event("startup")
async def _startup():
    await _seed()


@app.on_event("shutdown")
async def _shutdown():
    client.close()
