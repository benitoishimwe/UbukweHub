from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from database import db
from models import Vendor, VendorCreate, User
from auth import get_current_user, require_role, log_audit

router = APIRouter()


@router.get("")
async def list_vendors(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}}
        ]
    vendors = await db.vendors.find(query, {"_id": 0}).to_list(200)
    return {"vendors": vendors, "total": len(vendors)}


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, current_user: User = Depends(get_current_user)):
    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("")
async def create_vendor(data: VendorCreate, current_user: User = Depends(require_role("admin", "staff"))):
    vendor = Vendor(**data.model_dump())
    await db.vendors.insert_one({**vendor.model_dump()})
    await log_audit(current_user, "create", "vendor", vendor.vendor_id, {"name": vendor.name})
    return vendor.model_dump()


@router.put("/{vendor_id}")
async def update_vendor(vendor_id: str, data: dict, current_user: User = Depends(require_role("admin", "staff"))):
    existing = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.vendors.update_one({"vendor_id": vendor_id}, {"$set": data})
    await log_audit(current_user, "update", "vendor", vendor_id, data)
    return {**existing, **data}


@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: str, current_user: User = Depends(require_role("admin"))):
    existing = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.vendors.update_one({"vendor_id": vendor_id}, {"$set": {"is_active": False}})
    await log_audit(current_user, "delete", "vendor", vendor_id, {"name": existing.get("name")})
    return {"message": "Vendor deleted"}
