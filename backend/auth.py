from fastapi import Request, HTTPException, status
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import pyotp
import random
import os
import resend
from database import db
from models import User

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "ubukwe-hub-secret-key-2025-rwanda-weddings")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days
resend.api_key = "re_Yn4R8zPj_FVPH6mj2hhCpcWKMfKtFkQAW"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "role": role, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="UbukweHub")


def verify_totp_code(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_email_otp() -> str:
    return str(random.randint(100000, 999999))


def send_otp_email_resend(email: str, plain_otp: str):
    params = {
        "from": "UbukweHub Security <onboarding@resend.dev>",
        "to": [email],
        "subject": "Your UbukweHub Login OTP",
        "html": f"<strong>Your verification code is: {plain_otp}</strong>. It expires in 10 minutes."
    }
    try:
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")


async def get_current_user(request: Request) -> User:
    token = None
    # Try Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
    # Fallback to cookie
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try JWT first
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        user_doc.pop("password_hash", None)
        return User(**user_doc)
    except HTTPException:
        # Try session token (Google OAuth)
        session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not session_doc:
            raise HTTPException(status_code=401, detail="Invalid session")
        expires_at = session_doc.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        user_doc.pop("password_hash", None)
        return User(**user_doc)


def require_role(*roles):
    async def checker(request: Request) -> User:
        user = await get_current_user(request)
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


async def log_audit(user: User, action: str, resource: str, resource_id: str = "", details: dict = {}, ip: str = ""):
    from models import AuditLog
    log = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action=action,
        resource=resource,
        resource_id=resource_id,
        details=details,
        ip_address=ip
    )
    await db.audit_logs.insert_one({**log.model_dump(), "_id_omit": True})
