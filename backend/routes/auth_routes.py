from fastapi import APIRouter, HTTPException, Request, Depends, Response
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional
import httpx
import uuid

from database import db
from models import User, UserCreate, UserLogin, EmailOTP, UserSession
from auth import (
    hash_password, verify_password, create_access_token,
    generate_totp_secret, get_totp_uri, verify_totp_code,
    generate_email_otp, get_current_user, log_audit
)

router = APIRouter()


class MFAVerifyRequest(BaseModel):
    user_id: str
    code: str
    method: str = "totp"  # totp | email_otp


class TOTPSetupVerify(BaseModel):
    code: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/register")
async def register(data: UserCreate, request: Request):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        name=data.name,
        role=data.role,
        password_hash=hash_password(data.password)
    )
    await db.users.insert_one({**user.model_dump()})
    token = create_access_token(user.user_id, user.role, user.email)
    await log_audit(user, "register", "user", user.user_id, {}, request.client.host if request.client else "")
    return {"token": token, "user": {k: v for k, v in user.model_dump().items() if k != "password_hash"}}


@router.post("/login")
async def login(data: UserLogin, request: Request):
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = User(**user_doc)
    if not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    if user.mfa_enabled and user.mfa_methods:
        return {
            "mfa_required": True,
            "user_id": user.user_id,
            "mfa_methods": user.mfa_methods,
            "message": "MFA required"
        }

    token = create_access_token(user.user_id, user.role, user.email)
    await log_audit(user, "login", "user", user.user_id, {}, request.client.host if request.client else "")
    safe_user = {k: v for k, v in user_doc.items() if k not in ["password_hash", "mfa_secret"]}
    return {"token": token, "user": safe_user}


@router.post("/verify-mfa")
async def verify_mfa(data: MFAVerifyRequest, request: Request):
    user_doc = await db.users.find_one({"user_id": data.user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    user = User(**user_doc)

    if data.method == "totp":
        if not user.mfa_secret:
            raise HTTPException(status_code=400, detail="TOTP not configured")
        if not verify_totp_code(user.mfa_secret, data.code):
            raise HTTPException(status_code=401, detail="Invalid TOTP code")
    elif data.method == "email_otp":
        otp_doc = await db.email_otps.find_one(
            {"user_id": data.user_id, "otp_code": data.code, "used": False},
            {"_id": 0}
        )
        if not otp_doc:
            raise HTTPException(status_code=401, detail="Invalid OTP code")
        expires = otp_doc["expires_at"]
        if isinstance(expires, str):
            expires = datetime.fromisoformat(expires)
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="OTP expired")
        await db.email_otps.update_one({"user_id": data.user_id, "otp_code": data.code}, {"$set": {"used": True}})
    else:
        raise HTTPException(status_code=400, detail="Invalid MFA method")

    token = create_access_token(user.user_id, user.role, user.email)
    await log_audit(user, "mfa_verify", "user", user.user_id, {"method": data.method}, request.client.host if request.client else "")
    safe_user = {k: v for k, v in user_doc.items() if k not in ["password_hash", "mfa_secret"]}
    return {"token": token, "user": safe_user}


@router.post("/send-email-otp")
async def send_email_otp(body: dict):
    user_id = body.get("user_id")
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    code = generate_email_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp = EmailOTP(user_id=user_id, otp_code=code, expires_at=expires)
    await db.email_otps.insert_one({**otp.model_dump()})
    # In production, send via email. For demo, return code
    return {"message": "OTP sent", "otp_code": code, "expires_in": "10 minutes"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    safe = {k: v for k, v in current_user.model_dump().items() if k not in ["password_hash", "mfa_secret"]}
    return safe


@router.post("/logout")
async def logout(request: Request, response: Response, current_user: User = Depends(get_current_user)):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token")
    await log_audit(current_user, "logout", "user", current_user.user_id, {})
    return {"message": "Logged out"}


@router.post("/google")
async def google_auth(data: GoogleSessionRequest, request: Request, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": data.session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    gdata = resp.json()
    email = gdata.get("email")
    name = gdata.get("name", email)
    picture = gdata.get("picture")
    google_id = gdata.get("id")
    session_token = gdata.get("session_token")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user = User(**existing)
        await db.users.update_one({"email": email}, {"$set": {"google_id": google_id, "picture": picture}})
    else:
        user = User(email=email, name=name, google_id=google_id, picture=picture, role="staff")
        await db.users.insert_one({**user.model_dump()})

    expires = datetime.now(timezone.utc) + timedelta(days=7)
    session = UserSession(user_id=user.user_id, session_token=session_token, expires_at=expires)
    await db.user_sessions.insert_one({**session.model_dump()})

    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none", path="/")
    await log_audit(user, "google_login", "user", user.user_id, {}, request.client.host if request.client else "")
    safe_user = {k: v for k, v in user.model_dump().items() if k not in ["password_hash", "mfa_secret"]}
    return {"user": safe_user, "session_token": session_token}


@router.get("/totp-setup")
async def get_totp_setup(current_user: User = Depends(get_current_user)):
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, current_user.email)
    # Store temp secret
    await db.users.update_one({"user_id": current_user.user_id}, {"$set": {"mfa_temp_secret": secret}})
    return {"secret": secret, "uri": uri, "email": current_user.email}


@router.post("/verify-totp-setup")
async def verify_totp_setup(data: TOTPSetupVerify, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    temp_secret = user_doc.get("mfa_temp_secret")
    if not temp_secret:
        raise HTTPException(status_code=400, detail="No pending TOTP setup")
    if not verify_totp_code(temp_secret, data.code):
        raise HTTPException(status_code=401, detail="Invalid TOTP code")
    methods = user_doc.get("mfa_methods", [])
    if "totp" not in methods:
        methods.append("totp")
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"mfa_secret": temp_secret, "mfa_enabled": True, "mfa_methods": methods}, "$unset": {"mfa_temp_secret": ""}}
    )
    await log_audit(current_user, "mfa_setup", "user", current_user.user_id, {"method": "totp"})
    return {"message": "TOTP MFA enabled successfully"}


@router.post("/change-password")
async def change_password(data: PasswordChangeRequest, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=400, detail="No password set for this account")
    if not verify_password(data.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"user_id": current_user.user_id}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}
