"""CMS Edu AI — FastAPI backend with multi-role JWT auth + Emergent Google OAuth."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
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
    email: str = ""  # email OR student_id (students may use just student_id)
    password: str = ""  # optional — students log in passwordless with just Student ID
    remember: bool = False
    role: Optional[Role] = None  # optional client-side hint
    student_id: Optional[str] = None  # explicit field used by the passwordless student flow


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


async def _validate_school_admin(user: dict) -> None:
    """For instructor (School Admin) role, enforce that the user's assigned school exists and is active."""
    if user.get("role") != "instructor":
        return
    school_name = (user.get("school_name") or "").strip()
    if not school_name:
        raise HTTPException(
            status_code=403,
            detail="Your School Admin account is not linked to any school. Please contact the platform admin.",
        )
    school = await db.schools.find_one({"name": school_name})
    if not school:
        raise HTTPException(
            status_code=403,
            detail=f"Login blocked — your school '{school_name}' is not registered yet. Please contact the platform admin.",
        )
    if (school.get("status") or "active") == "disabled":
        raise HTTPException(
            status_code=403,
            detail=f"Your school '{school_name}' is currently disabled. Please contact the platform admin.",
        )


@api.post("/auth/login")
async def login(payload: LoginReq, request: Request, response: Response):
    raw = (payload.student_id or payload.email or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Please enter your login ID.")
    email = raw.lower()
    identifier = email
    await _check_lockout(identifier)

    # Passwordless student login path — student_id OR role=student + non-email + no password
    role_hint = payload.role
    looks_like_student_id = ("@" not in raw)
    passwordless = (not payload.password) and (payload.student_id or (role_hint == "student" and looks_like_student_id))

    user = None
    if passwordless:
        # Student ID lookup ONLY
        stu = await db.students_admin.find_one({"student_id": raw})
        if not stu or not stu.get("email"):
            await _record_failed(identifier)
            raise HTTPException(status_code=401, detail="Invalid Student ID. Please contact your school/admin.")
        user = await db.users.find_one({"email": stu["email"].lower()})
        if not user:
            await _record_failed(identifier)
            raise HTTPException(status_code=401, detail="Invalid Student ID. Please contact your school/admin.")
        if user.get("role") != "student":
            raise HTTPException(status_code=403, detail="This Student ID is not registered as a student.")
    else:
        # Try email first
        user = await db.users.find_one({"email": email})
        # If not found and the raw value isn't an email, try matching a student by student_id
        if not user and looks_like_student_id:
            stu = await db.students_admin.find_one({"student_id": raw})
            if stu and stu.get("email"):
                user = await db.users.find_one({"email": stu["email"].lower()})
        if not user or not user.get("password_hash"):
            await _record_failed(identifier)
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not verify_password(payload.password, user["password_hash"]):
            await _record_failed(identifier)
            raise HTTPException(status_code=401, detail="Invalid email or password")

    if role_hint and user["role"] != role_hint:
        raise HTTPException(status_code=403, detail=f"This account is not registered as a {role_hint}.")

    # School-Admin school existence/active check
    await _validate_school_admin(user)

    await _clear_attempts(identifier)
    access = create_access_token(user["user_id"], user["email"], user["role"])
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh, remember=payload.remember)
    pub = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": doc_to_public(pub).model_dump(mode="json"), "access_token": access}


@api.post("/auth/student-login")
async def student_login(payload: LoginReq, request: Request, response: Response):
    """Dedicated passwordless student endpoint — Student ID only."""
    raw = (payload.student_id or payload.email or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Please enter your Student ID.")
    stu = await db.students_admin.find_one({"student_id": raw})
    if not stu or not stu.get("email"):
        raise HTTPException(status_code=401, detail="Invalid Student ID. Please contact your school/admin.")
    user = await db.users.find_one({"email": stu["email"].lower()})
    if not user or user.get("role") != "student":
        raise HTTPException(status_code=401, detail="Invalid Student ID. Please contact your school/admin.")
    access = create_access_token(user["user_id"], user["email"], user["role"])
    refresh = create_refresh_token(user["user_id"])
    set_auth_cookies(response, access, refresh, remember=False)
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


# ---------- Student site (read-only public-ish, requires student/admin auth) ----------
@api.get("/student/site/courses")
async def student_site_courses(user: dict = Depends(require_role("student", "admin", "instructor"))):
    items = await db.courses_admin.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"courses": items}


@api.get("/student/site/courses/{course_id}/subjects")
async def student_site_course_subjects(course_id: str, user: dict = Depends(require_role("student", "admin", "instructor"))):
    course = await db.courses_admin.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course_name = course.get("name")
    subjects = await db.subjects.find(
        {"$or": [{"course_names": course_name}, {"course_name": course_name}]},
        {"_id": 0},
    ).to_list(200)
    return {"course": course, "subjects": subjects}


@api.get("/student/site/subjects/{subject_id}/chapters")
async def student_site_subject_chapters(subject_id: str, user: dict = Depends(require_role("student", "admin", "instructor"))):
    subject = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    chapters = await db.chapters.find({"subject_name": subject.get("name")}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"subject": subject, "chapters": chapters}


@api.get("/student/site/chapters")
async def student_site_recent_chapters(limit: int = 8, user: dict = Depends(require_role("student", "admin", "instructor"))):
    chapters = await db.chapters.find({}, {"_id": 0}).sort("created_at", -1).to_list(max(1, min(limit, 50)))
    return {"chapters": chapters}


@api.get("/student/site/products")
async def student_site_products(user: dict = Depends(require_role("student", "admin", "instructor"))):
    items = await db.products.find({"status": {"$ne": "disabled"}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"products": items}


@api.get("/student/site/plans")
async def student_site_plans(user: dict = Depends(require_role("student", "admin", "instructor"))):
    items = await db.plans.find({}, {"_id": 0}).to_list(20)
    if not items:
        items = [
            {"id": "plan_monthly", "name": "Pro Monthly", "price": 200, "interval": "monthly"},
            {"id": "plan_yearly",  "name": "Pro Yearly",  "price": 2400, "interval": "yearly"},
        ]
    return {"plans": items}


@api.get("/student/site/subscription")
async def student_site_get_subscription(user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not sub:
        return {"active": False}
    return sub


@api.post("/student/site/subscription/subscribe")
async def student_site_subscribe(payload: dict, user: dict = Depends(get_current_user)):
    plan = (payload or {}).get("plan", "monthly")
    days = 365 if plan == "yearly" else 30
    expires = datetime.now(timezone.utc) + timedelta(days=days)
    doc = {
        "user_id": user["user_id"], "plan": plan, "active": True,
        "price": 2400 if plan == "yearly" else 200,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires.isoformat(),
    }
    await db.subscriptions.update_one({"user_id": user["user_id"]}, {"$set": doc}, upsert=True)
    return doc


@api.get("/student/site/orders")
async def student_site_orders(user: dict = Depends(get_current_user)):
    items = await db.student_orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"orders": items}


@api.post("/student/site/orders")
async def student_site_create_order(payload: dict, user: dict = Depends(get_current_user)):
    body = dict(payload or {})
    doc = {
        "id": f"ord_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_name": user.get("name"),
        "product_id": body.get("product_id"),
        "product_name": body.get("product_name") or "Product",
        "price": body.get("price") or 0,
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.student_orders.insert_one(doc)
    return {"ok": True, "order": _clean(doc)}


@api.patch("/student/site/orders/{order_id}/status")
async def student_site_update_order(order_id: str, payload: dict, user: dict = Depends(get_current_user)):
    status = (payload or {}).get("status")
    if status not in ("Pending", "Confirmed", "Shipped", "Delivered", "Cancelled", "Returned"):
        raise HTTPException(status_code=400, detail="Invalid status")
    q = {"id": order_id}
    if user.get("role") not in ("admin", "instructor"):
        q["user_id"] = user["user_id"]
    res = await db.student_orders.update_one(q, {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}


@api.get("/student/site/notifications")
async def student_site_notifications(user: dict = Depends(get_current_user)):
    """Return notifications visible to the current student.

    A notification is visible if its audience is 'all' OR if it targets a specific
    school/class/student matching the user. Admin/instructor previews see all rows.
    """
    if user.get("role") in ("admin", "instructor"):
        items = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"notifications": items}
    # Build the student's context
    stu = await db.students_admin.find_one({"email": (user.get("email") or "").lower()}, {"_id": 0}) or {}
    user_school = stu.get("school_name") or ""
    user_class = stu.get("class_name") or ""
    ors = [{"audience": "all"}, {"audience": {"$exists": False}}, {"audience": None}]
    if user_school:
        ors.append({"audience": "school", "school_name": user_school})
    if user_class:
        ors.append({"audience": "class", "class_name": user_class})
    items = await db.notifications.find({"$or": ors, "status": {"$ne": "disabled"}}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"notifications": items}


@api.get("/student/site/fun-hub")
async def student_site_fun_hub(user: dict = Depends(require_role("student", "admin", "instructor"))):
    items = await db.fun_hub.find({"status": {"$ne": "disabled"}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"links": items}


@api.get("/student/site/init")
async def student_site_init(user: dict = Depends(get_current_user)):
    """One round-trip init for the student dashboard.

    Returns courses, latest chapters, notifications and user profile to remove the
    waterfall of separate requests on the student home screen.
    """
    role = user.get("role")
    if role not in ("student", "admin", "instructor"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Run all queries in parallel
    courses_task = db.courses_admin.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    chapters_task = db.chapters.find({}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)

    # Build notification filter for the current viewer
    if role in ("admin", "instructor"):
        notif_filter = {}
    else:
        stu = await db.students_admin.find_one({"email": (user.get("email") or "").lower()}, {"_id": 0}) or {}
        user_school = stu.get("school_name") or ""
        user_class = stu.get("class_name") or ""
        ors = [{"audience": "all"}, {"audience": {"$exists": False}}, {"audience": None}]
        if user_school:
            ors.append({"audience": "school", "school_name": user_school})
        if user_class:
            ors.append({"audience": "class", "class_name": user_class})
        notif_filter = {"$or": ors, "status": {"$ne": "disabled"}}
    notif_task = db.notifications.find(notif_filter, {"_id": 0}).sort("created_at", -1).to_list(20)

    courses, chapters, notifications = await asyncio.gather(courses_task, chapters_task, notif_task)
    return {
        "courses": courses,
        "chapters": chapters,
        "notifications": notifications,
        "user": {"name": user.get("name"), "email": user.get("email"), "role": role},
    }


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
    "quizzes": "quizzes",
    "quiz-results": "quiz_results",
    "results": "results",
    "products": "products",
    "plans": "plans",
    "orders": "student_orders",
    "fun-hub": "fun_hub",
    "notifications": "notifications",
}

# Fields to search across (text match)
RESOURCE_SEARCH_FIELDS = {
    "schools": ["name", "email", "phone", "principal_name", "code"],
    "classes": ["name", "division", "assigned_instructor"],
    "courses": ["name", "class_names", "class_name", "subject_name"],
    "subjects": ["name", "class_names", "course_names", "class_name", "course_name"],
    "chapters": ["name", "class_name", "course_name", "subject_name"],
    "school-admins": ["name", "email", "mobile", "school_name"],
    "students": ["name", "email", "phone", "parent_name", "school_name", "division", "student_id", "class_name"],
    "quizzes": ["title", "name", "quiz_id", "class_name", "subject_name"],
    "quiz-results": ["student_name", "student_id", "quiz_name", "subject_name", "class_name", "division"],
    "results": ["student_name", "student_id", "subject_name", "class_name", "division", "grade"],
    "products": ["name", "description", "category", "sku"],
    "plans": ["name", "title", "description"],
    "orders": ["order_id", "user_email", "user_name", "product_name", "status"],
    "fun-hub": ["title", "category", "description", "url"],
    "notifications": ["title", "body", "audience", "class_name", "school_name"],
}


KIND_PERMS = {
    "schools":       {"read": {"admin", "instructor"}, "write": {"admin"}},
    "school-admins": {"read": {"admin"}, "write": {"admin"}},
    "classes":       {"read": {"admin", "instructor"}, "write": {"admin"}},
    "courses":       {"read": {"admin", "instructor"}, "write": {"admin"}},
    "subjects":      {"read": {"admin", "instructor"}, "write": {"admin"}},
    "chapters":      {"read": {"admin", "instructor"}, "write": {"admin"}},
    "students":      {"read": {"admin", "instructor"}, "write": {"admin", "instructor"}},
    "quizzes":       {"read": {"admin", "instructor"}, "write": {"admin"}},
    "quiz-results":  {"read": {"admin", "instructor"}, "write": {"admin", "instructor"}},
    "results":       {"read": {"admin", "instructor"}, "write": {"admin", "instructor"}},
    "products":      {"read": {"admin", "instructor"}, "write": {"admin"}},
    "plans":         {"read": {"admin", "instructor"}, "write": {"admin"}},
    "orders":        {"read": {"admin", "instructor"}, "write": {"admin"}},
    "fun-hub":       {"read": {"admin", "instructor"}, "write": {"admin"}},
    "notifications": {"read": {"admin", "instructor"}, "write": {"admin"}},
}


def _can(kind: str, action: str, user: dict) -> bool:
    perms = KIND_PERMS.get(kind, {"read": {"admin"}, "write": {"admin"}})
    roles = perms.get(action, set())
    return user.get("role") in roles


async def _school_scope_filter(kind: str, user: dict) -> Optional[dict]:
    """For instructor (School Admin) role, restrict resource listings to their own school.

    Returns a Mongo filter dict to AND with the user's query, or None if no filter is needed
    (e.g. user is admin), or an impossible filter ({"id": "__none__"}) if instructor has no school assigned.
    """
    if user.get("role") != "instructor":
        return None
    school_name = (user.get("school_name") or "").strip()
    if not school_name:
        return {"id": "__none__"}  # never matches → empty list

    if kind == "schools":
        return {"name": school_name}
    if kind in ("school-admins", "students"):
        return {"school_name": school_name}

    # Class-aware resources: classes, courses, subjects, chapters, quizzes, quiz-results, results
    school = await db.schools.find_one({"name": school_name}, {"_id": 0, "class_names": 1, "course_names": 1})
    class_names = list((school or {}).get("class_names") or [])
    course_names = list((school or {}).get("course_names") or [])
    if not class_names and not course_names:
        return {"id": "__none__"}

    if kind == "classes":
        return {"name": {"$in": class_names}} if class_names else {"id": "__none__"}
    if kind == "courses":
        ors = []
        if class_names:
            ors += [{"class_names": {"$in": class_names}}, {"class_name": {"$in": class_names}}]
        if course_names:
            ors.append({"name": {"$in": course_names}})
        return {"$or": ors} if ors else {"id": "__none__"}
    if kind == "subjects":
        ors = []
        if class_names:
            ors += [{"class_names": {"$in": class_names}}, {"class_name": {"$in": class_names}}]
        if course_names:
            ors += [{"course_names": {"$in": course_names}}, {"course_name": {"$in": course_names}}]
        return {"$or": ors} if ors else {"id": "__none__"}
    if kind == "chapters":
        ors = []
        if class_names:
            ors.append({"class_name": {"$in": class_names}})
        if course_names:
            ors.append({"course_name": {"$in": course_names}})
        return {"$or": ors} if ors else {"id": "__none__"}
    if kind in ("quizzes", "quiz-results", "results"):
        return {"class_name": {"$in": class_names}} if class_names else {"id": "__none__"}
    if kind in ("products", "plans"):
        return None  # platform-wide store, instructor can see catalog
    return None


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


def _search_query(kind: str, q: str) -> dict:
    if not q:
        return {}
    fields = RESOURCE_SEARCH_FIELDS.get(kind, ["name"])
    # Escape regex special characters so user input like "C++" doesn't break the query
    safe = re.escape(q.strip())
    regex = {"$regex": safe, "$options": "i"}
    return {"$or": [{f: regex} for f in fields]}


@api.get("/admin/resources/{kind}")
async def list_resources(
    kind: str,
    q: str = "",
    limit: int = 200,
    offset: int = 0,
    user: dict = Depends(require_role("admin")),
):
    coll = _require_kind(kind)
    limit = max(1, min(int(limit or 200), 5000))
    offset = max(0, int(offset or 0))
    query = _search_query(kind, q)
    total = await db[coll].count_documents(query)
    items = await db[coll].find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    for it in items:
        it.pop("password_hash", None)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


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
        school_name = (doc.get("school_name") or "").strip()
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            # Promote / link to school (do not downgrade admins)
            update = {"school_name": school_name} if school_name else {}
            if existing_user.get("role") not in ("admin",):
                update["role"] = "instructor"
            if update:
                await db.users.update_one({"email": email}, {"$set": update})
        else:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": email, "name": doc.get("name") or email,
                "password_hash": hash_password(password),
                "role": "instructor", "auth_provider": "password",
                "email_verified": True, "avatar_url": doc.get("avatar_url"),
                "school_name": school_name,
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
            school_name = (d.get("school_name") or "").strip()
            existing_user = await db.users.find_one({"email": email})
            if existing_user:
                update = {"school_name": school_name} if school_name else {}
                if existing_user.get("role") not in ("admin",):
                    update["role"] = "instructor"
                if update:
                    await db.users.update_one({"email": email}, {"$set": update})
            else:
                await db.users.insert_one({
                    "user_id": f"user_{uuid.uuid4().hex[:12]}",
                    "email": email, "name": d.get("name") or email,
                    "password_hash": hash_password(d.get("password") or "Demo@123"),
                    "role": "instructor", "auth_provider": "password",
                    "email_verified": True, "avatar_url": None,
                    "school_name": school_name, "created_at": now,
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


# ---------- Shared resource router (admin + instructor with per-kind perms) ----------
@api.get("/resources/{kind}")
async def list_shared(
    kind: str,
    q: str = "",
    limit: int = 200,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    coll = _require_kind(kind)
    if not _can(kind, "read", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    limit = max(1, min(int(limit or 200), 5000))
    offset = max(0, int(offset or 0))
    query = _search_query(kind, q)
    # School Admin (instructor) scoping
    scope = await _school_scope_filter(kind, user)
    if scope is not None:
        query = {"$and": [query, scope]} if query else scope
    total = await db[coll].count_documents(query)
    items = await db[coll].find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    for it in items:
        it.pop("password_hash", None)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@api.post("/resources/{kind}")
async def create_shared(kind: str, payload: dict, user: dict = Depends(get_current_user)):
    if not _can(kind, "write", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    body = dict(payload or {})
    body["added_by_role"] = user.get("role")
    body["added_by_id"] = user.get("user_id")
    return await create_resource(kind, body, user)  # type: ignore[arg-type]


@api.put("/resources/{kind}/{rid}")
async def update_shared(kind: str, rid: str, payload: dict, user: dict = Depends(get_current_user)):
    if not _can(kind, "write", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await update_resource(kind, rid, payload, user)  # type: ignore[arg-type]


@api.delete("/resources/{kind}/{rid}")
async def delete_shared(kind: str, rid: str, user: dict = Depends(get_current_user)):
    if not _can(kind, "write", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await delete_resource(kind, rid, user)  # type: ignore[arg-type]


@api.patch("/resources/{kind}/{rid}/status")
async def toggle_shared(kind: str, rid: str, payload: dict, user: dict = Depends(get_current_user)):
    if not _can(kind, "write", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await toggle_status(kind, rid, payload, user)  # type: ignore[arg-type]


@api.post("/resources/{kind}/bulk")
async def bulk_shared(kind: str, payload: dict, user: dict = Depends(get_current_user)):
    if not _can(kind, "write", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return await bulk_create(kind, payload, user)  # type: ignore[arg-type]


@api.post("/resources/{kind}/bulk-delete")
async def bulk_delete_shared(kind: str, payload: dict, user: dict = Depends(get_current_user)):
    if not _can(kind, "write", user):
        raise HTTPException(status_code=403, detail="Forbidden")
    coll = _require_kind(kind)
    ids = (payload or {}).get("ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="ids array is required")
    res = await db[coll].delete_many({"id": {"$in": ids}})
    await _log_activity(kind, "bulk-delete", f"{res.deleted_count} rows", user)
    return {"ok": True, "deleted": res.deleted_count}


@api.get("/instructor/dashboard")
async def instructor_dashboard(user: dict = Depends(require_role("instructor", "admin"))):
    # Build scope-aware counts for the School Admin
    async def scoped_count(coll: str, kind: str):
        scope = await _school_scope_filter(kind, user)
        q = scope or {}
        return await db[coll].count_documents(q)

    totals = {
        "classes":       await scoped_count("classes", "classes"),
        "students":      await scoped_count("students_admin", "students"),
        "instructors":   await db.users.count_documents({"role": "instructor"} if user.get("role") == "admin" else {"role": "instructor", "school_name": user.get("school_name") or "__none__"}),
        "subjects":      await scoped_count("subjects", "subjects"),
        "courses":       await scoped_count("courses_admin", "courses"),
        "quizzes":       await scoped_count("quizzes", "quizzes"),
        "quiz_attempts": await scoped_count("quiz_results", "quiz-results"),
    }
    activities = await db.recent_activities.find(
        {"kind": {"$in": ["students", "quiz-results", "quizzes", "results"]}}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    # Scope latest quiz results
    qr_scope = await _school_scope_filter("quiz-results", user) or {}
    latest_results = await db.quiz_results.find(qr_scope, {"_id": 0}).sort("created_at", -1).to_list(8)
    return {"totals": totals, "recent_activities": activities, "latest_results": latest_results}


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
    for coll in ["schools", "classes", "courses_admin", "subjects", "chapters", "school_admins", "students_admin", "quizzes", "quiz_results", "results", "products", "plans"]:
        try:
            await db[coll].create_index("id", unique=True)
        except Exception:
            pass
    # Seed sample quizzes / results once (idempotent)
    try:
        if await db.quizzes.count_documents({}) == 0:
            now = datetime.now(timezone.utc).isoformat()
            samples = [
                {"id": "qz_001", "quiz_id": "QZ-001", "title": "Algebra Basics", "class_name": "Class 9",  "subject_name": "Math",   "total_questions": 10, "total_marks": 20, "status": "active", "created_at": now, "updated_at": now},
                {"id": "qz_002", "quiz_id": "QZ-002", "title": "Python Loops",   "class_name": "Class 10", "subject_name": "Python", "total_questions": 12, "total_marks": 24, "status": "active", "created_at": now, "updated_at": now},
                {"id": "qz_003", "quiz_id": "QZ-003", "title": "HTML Tags",      "class_name": "Class 8",  "subject_name": "HTML",   "total_questions": 8,  "total_marks": 16, "status": "active", "created_at": now, "updated_at": now},
            ]
            await db.quizzes.insert_many(samples)
        if await db.quiz_results.count_documents({}) == 0:
            now = datetime.now(timezone.utc).isoformat()
            rows = [
                {"id": "qr_001", "student_id": "STU-1001", "student_name": "Aarav Patel",  "class_name": "Class 9",  "division": "A", "subject_name": "Math",   "quiz_name": "Algebra Basics", "marks_obtained": 18, "total_marks": 20, "percentage": 90, "result_status": "Pass", "created_at": now},
                {"id": "qr_002", "student_id": "STU-1002", "student_name": "Meera Shah",   "class_name": "Class 10", "division": "B", "subject_name": "Python", "quiz_name": "Python Loops",   "marks_obtained": 21, "total_marks": 24, "percentage": 88, "result_status": "Pass", "created_at": now},
                {"id": "qr_003", "student_id": "STU-1003", "student_name": "Karan Verma",  "class_name": "Class 8",  "division": "A", "subject_name": "HTML",   "quiz_name": "HTML Tags",      "marks_obtained": 9,  "total_marks": 16, "percentage": 56, "result_status": "Fail", "created_at": now},
            ]
            await db.quiz_results.insert_many(rows)
        if await db.results.count_documents({}) == 0:
            now = datetime.now(timezone.utc).isoformat()
            rows = [
                {"id": "rs_001", "student_id": "STU-1001", "student_name": "Aarav Patel", "class_name": "Class 9",  "division": "A", "subject_name": "Math",   "marks": 85, "grade": "A",  "percentage": 85, "created_at": now},
                {"id": "rs_002", "student_id": "STU-1002", "student_name": "Meera Shah",  "class_name": "Class 10", "division": "B", "subject_name": "Python", "marks": 78, "grade": "B+", "percentage": 78, "created_at": now},
                {"id": "rs_003", "student_id": "STU-1003", "student_name": "Karan Verma", "class_name": "Class 8",  "division": "A", "subject_name": "HTML",   "marks": 56, "grade": "C",  "percentage": 56, "created_at": now},
            ]
            await db.results.insert_many(rows)
    except Exception as e:
        logger.warning("sample seed failed: %s", e)
    # Seed sample products for the Shop
    try:
        if await db.products.count_documents({}) == 0:
            now = datetime.now(timezone.utc).isoformat()
            kits = [
                {"id": "prd_001", "name": "Robotics Starter Kit", "description": "Arduino-based starter kit with sensors, motors and step-by-step projects.", "price": 2999, "stock": "in", "status": "active", "image": "https://images.unsplash.com/photo-1601932242523-1f013b8a4f5b?w=800", "created_at": now, "updated_at": now},
                {"id": "prd_002", "name": "3D Printing Pen", "description": "Draw your imagination in 3D. Safe for ages 10+.", "price": 1499, "stock": "in", "status": "active", "image": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800", "created_at": now, "updated_at": now},
                {"id": "prd_003", "name": "Mini Drone", "description": "Beginner-friendly drone with built-in flight tutor.", "price": 3499, "stock": "in", "status": "active", "image": "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800", "created_at": now, "updated_at": now},
                {"id": "prd_004", "name": "Electronics Sensor Pack", "description": "20-piece sensor pack for Arduino + Raspberry Pi.", "price": 999, "stock": "in", "status": "active", "image": "https://images.unsplash.com/photo-1593642634443-44adaa06623a?w=800", "created_at": now, "updated_at": now},
            ]
            await db.products.insert_many(kits)
    except Exception as e:
        logger.warning("product seed failed: %s", e)
    # Seed sample Fun Hub links + Notifications (idempotent)
    try:
        if await db.fun_hub.count_documents({}) == 0:
            now = datetime.now(timezone.utc).isoformat()
            rows = [
                {"id": "fh_001", "title": "Code your first game",       "category": "Game",       "description": "Build a snake game in 30 minutes.", "url": "https://scratch.mit.edu", "image": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=900", "status": "active", "created_at": now, "updated_at": now},
                {"id": "fh_002", "title": "Robot of the week",          "category": "Robot",      "description": "Meet Spot, the dancing quadruped.",  "url": "https://www.bostondynamics.com", "image": "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=900", "status": "active", "created_at": now, "updated_at": now},
                {"id": "fh_003", "title": "Daily challenge: Loops",     "category": "Challenge",  "description": "Solve 3 loop puzzles to earn 100 pts.","url": "https://hourofcode.com", "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900", "status": "active", "created_at": now, "updated_at": now},
            ]
            await db.fun_hub.insert_many(rows)
        if await db.notifications.count_documents({}) == 0:
            now = datetime.now(timezone.utc).isoformat()
            rows = [
                {"id": "ntf_001", "title": "Welcome to Create Mind Studio!", "body": "Tap Classroom to begin your first lesson.", "audience": "all", "image": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900", "status": "active", "created_at": now, "updated_at": now},
                {"id": "ntf_002", "title": "New quiz: Python Loops",        "body": "Complete it before Friday for bonus points.",  "audience": "all", "image": None, "status": "active", "created_at": now, "updated_at": now},
            ]
            await db.notifications.insert_many(rows)
    except Exception as e:
        logger.warning("fun_hub/notifications seed failed: %s", e)
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

    # Seed a students_admin entry so the student demo can login with STU-9999
    try:
        student_email = (os.environ.get("STUDENT_EMAIL") or "").lower()
        if student_email and not await db.students_admin.find_one({"student_id": "STU-9999"}):
            now = datetime.now(timezone.utc).isoformat()
            await db.students_admin.insert_one({
                "id": f"stu_demo_{uuid.uuid4().hex[:8]}",
                "student_id": "STU-9999",
                "name": "Noah Patel",
                "email": student_email,
                "class_name": "Class 9",
                "division": "A",
                "school_name": "Ridgeview Academy",
                "status": "active",
                "created_at": now, "updated_at": now,
            })
    except Exception as e:
        logger.warning("student demo seed failed: %s", e)

    # Seed a default school + assign the demo School Admin (instructor) to it.
    try:
        instructor_email = (os.environ.get("INSTRUCTOR_EMAIL") or "").lower()
        if instructor_email:
            now = datetime.now(timezone.utc).isoformat()
            existing_school = await db.schools.find_one({"name": "Ridgeview Academy"})
            if not existing_school:
                await db.schools.insert_one({
                    "id": f"sch_demo_{uuid.uuid4().hex[:8]}",
                    "name": "Ridgeview Academy",
                    "code": "RVA-001",
                    "email": "admin@ridgeview.edu",
                    "phone": "+1 555 0100",
                    "principal_name": "Dr. Jane Doe",
                    "address": "1 Ridge Way",
                    "class_names": ["Class 8", "Class 9", "Class 10"],
                    "course_names": [],
                    "status": "active",
                    "created_at": now, "updated_at": now,
                })
            # Ensure the demo instructor user has school_name set
            await db.users.update_one(
                {"email": instructor_email},
                {"$set": {"school_name": "Ridgeview Academy"}},
            )
            # Mirror into school_admins collection (idempotent)
            if not await db.school_admins.find_one({"email": instructor_email}):
                await db.school_admins.insert_one({
                    "id": f"sad_demo_{uuid.uuid4().hex[:8]}",
                    "name": "Lila Hart",
                    "email": instructor_email,
                    "mobile": "+1 555 0101",
                    "school_name": "Ridgeview Academy",
                    "status": "active",
                    "created_at": now, "updated_at": now,
                })
    except Exception as e:
        logger.warning("school demo seed failed: %s", e)


@app.on_event("startup")
async def _startup():
    await _seed()


@app.on_event("shutdown")
async def _shutdown():
    client.close()
