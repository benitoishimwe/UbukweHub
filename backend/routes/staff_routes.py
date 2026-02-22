from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from database import db
from models import User, UserUpdate, Shift, ShiftCreate
from auth import get_current_user, require_role, log_audit

router = APIRouter()


@router.get("")
async def list_staff(
    search: Optional[str] = None,
    current_user: User = Depends(require_role("admin", "staff"))
):
    query = {"role": {"$in": ["staff", "admin"]}, "is_active": True}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    staff = await db.users.find(query, {"_id": 0, "password_hash": 0, "mfa_secret": 0}).to_list(200)
    return {"staff": staff, "total": len(staff)}


@router.get("/me/shifts")
async def get_my_shifts(current_user: User = Depends(get_current_user)):
    shifts = await db.shifts.find({"staff_id": current_user.user_id}, {"_id": 0}).sort("date", 1).to_list(100)
    return {"shifts": shifts}


@router.get("/stats")
async def get_staff_stats(current_user: User = Depends(require_role("admin", "staff"))):
    total = await db.users.count_documents({"role": {"$in": ["staff", "admin"]}, "is_active": True})
    on_shift = await db.shifts.count_documents({"status": "active"})
    return {"total": total, "on_shift": on_shift, "utilization": round((on_shift / total * 100) if total > 0 else 0, 1)}


@router.get("/{user_id}")
async def get_staff_member(user_id: str, current_user: User = Depends(get_current_user)):
    staff = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0, "mfa_secret": 0}
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff


@router.put("/{user_id}")
async def update_staff(user_id: str, data: UserUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot update other users")
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    await log_audit(current_user, "update", "user", user_id, update_data)
    return {**{k: v for k, v in existing.items() if k not in ["password_hash", "mfa_secret"]}, **update_data}


# ──────────── SHIFTS ────────────

@router.get("/shifts/all")
async def list_shifts(
    event_id: Optional[str] = None,
    date: Optional[str] = None,
    current_user: User = Depends(require_role("admin", "staff"))
):
    query = {}
    if event_id:
        query["event_id"] = event_id
    if date:
        query["date"] = date
    shifts = await db.shifts.find(query, {"_id": 0}).sort("date", 1).to_list(500)
    return {"shifts": shifts}


@router.post("/shifts")
async def create_shift(data: ShiftCreate, current_user: User = Depends(require_role("admin", "staff"))):
    staff_doc = await db.users.find_one({"user_id": data.staff_id}, {"_id": 0})
    shift = Shift(**data.model_dump(), staff_name=staff_doc.get("name", "") if staff_doc else "")
    await db.shifts.insert_one({**shift.model_dump()})
    await log_audit(current_user, "create", "shift", shift.shift_id, {"staff": data.staff_id, "date": data.date})
    return shift.model_dump()


@router.put("/shifts/{shift_id}")
async def update_shift(shift_id: str, data: dict, current_user: User = Depends(require_role("admin", "staff"))):
    existing = await db.shifts.find_one({"shift_id": shift_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")
    await db.shifts.update_one({"shift_id": shift_id}, {"$set": data})
    return {**existing, **data}


@router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, current_user: User = Depends(require_role("admin"))):
    existing = await db.shifts.find_one({"shift_id": shift_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")
    await db.shifts.delete_one({"shift_id": shift_id})
    return {"message": "Shift deleted"}
