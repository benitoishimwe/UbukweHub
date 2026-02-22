from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from database import db
from models import User, UserCreate, UserUpdate
from auth import require_role, hash_password, log_audit

router = APIRouter()

admin_dep = require_role("admin")


@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(admin_dep)
):
    query = {}
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0, "mfa_secret": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    return {"users": users, "total": total, "page": page}


@router.post("/users")
async def create_user(data: UserCreate, current_user: User = Depends(admin_dep)):
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
    await log_audit(current_user, "admin_create_user", "user", user.user_id, {"email": data.email, "role": data.role})
    return {k: v for k, v in user.model_dump().items() if k not in ["password_hash", "mfa_secret"]}


@router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: User = Depends(admin_dep)):
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    await log_audit(current_user, "admin_update_user", "user", user_id, update_data)
    return {"message": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(admin_dep)):
    if user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_active": False}})
    await log_audit(current_user, "admin_delete_user", "user", user_id, {"email": existing.get("email")})
    return {"message": "User deactivated"}


@router.get("/audit-logs")
async def get_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(admin_dep)
):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    if resource:
        query["resource"] = resource
    skip = (page - 1) * limit
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.audit_logs.count_documents(query)
    return {"logs": logs, "total": total, "page": page}


@router.get("/stats")
async def get_admin_stats(current_user: User = Depends(admin_dep)):
    total_users = await db.users.count_documents({"is_active": True})
    total_events = await db.events.count_documents({})
    total_inventory = await db.inventory.count_documents({"is_active": True})
    total_transactions = await db.transactions.count_documents({})
    total_vendors = await db.vendors.count_documents({"is_active": True})
    by_role = await db.users.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]).to_list(10)
    return {
        "total_users": total_users,
        "total_events": total_events,
        "total_inventory": total_inventory,
        "total_transactions": total_transactions,
        "total_vendors": total_vendors,
        "users_by_role": {r["_id"]: r["count"] for r in by_role}
    }


@router.get("/sessions")
async def list_sessions(current_user: User = Depends(admin_dep)):
    sessions = await db.user_sessions.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return {"sessions": sessions, "total": len(sessions)}
