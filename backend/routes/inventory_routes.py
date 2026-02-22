from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone

from database import db
from models import InventoryItem, InventoryItemCreate, InventoryItemUpdate, User
from auth import get_current_user, require_role, log_audit

router = APIRouter()


@router.get("")
async def list_inventory(
    category: Optional[str] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if condition:
        query["condition"] = condition
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"qr_code": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    items = await db.inventory.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.inventory.count_documents(query)
    return {"items": items, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/stats")
async def get_inventory_stats(current_user: User = Depends(get_current_user)):
    total = await db.inventory.count_documents({"is_active": True})
    available = await db.inventory.count_documents({"is_active": True, "available": {"$gt": 0}})
    rented_docs = await db.inventory.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": None, "total_rented": {"$sum": "$rented"}, "total_qty": {"$sum": "$quantity"}}}
    ]).to_list(1)
    maintenance = await db.inventory.count_documents({"is_active": True, "condition": {"$in": ["poor", "maintenance"]}})
    categories = await db.inventory.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]).to_list(20)
    rented_total = rented_docs[0]["total_rented"] if rented_docs else 0
    return {
        "total": total,
        "available": available,
        "rented": rented_total,
        "maintenance": maintenance,
        "categories": [{"category": c["_id"], "count": c["count"]} for c in categories]
    }


@router.get("/categories")
async def get_categories(current_user: User = Depends(get_current_user)):
    cats = await db.inventory.distinct("category", {"is_active": True})
    return {"categories": cats}


@router.get("/scan/{qr_code}")
async def scan_item(qr_code: str, current_user: User = Depends(get_current_user)):
    item = await db.inventory.find_one(
        {"$or": [{"qr_code": qr_code}, {"barcode": qr_code}], "is_active": True},
        {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("/{item_id}")
async def get_item(item_id: str, current_user: User = Depends(get_current_user)):
    item = await db.inventory.find_one({"item_id": item_id, "is_active": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("")
async def create_item(data: InventoryItemCreate, current_user: User = Depends(require_role("admin", "staff"))):
    item = InventoryItem(**data.model_dump(), available=data.quantity)
    await db.inventory.insert_one({**item.model_dump()})
    await log_audit(current_user, "create", "inventory", item.item_id, {"name": item.name})
    return item.model_dump()


@router.put("/{item_id}")
async def update_item(item_id: str, data: InventoryItemUpdate, current_user: User = Depends(require_role("admin", "staff"))):
    existing = await db.inventory.find_one({"item_id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.inventory.update_one({"item_id": item_id}, {"$set": update_data})
    await log_audit(current_user, "update", "inventory", item_id, update_data)
    return {**existing, **update_data}


@router.delete("/{item_id}")
async def delete_item(item_id: str, current_user: User = Depends(require_role("admin"))):
    existing = await db.inventory.find_one({"item_id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.inventory.update_one({"item_id": item_id}, {"$set": {"is_active": False}})
    await log_audit(current_user, "delete", "inventory", item_id, {"name": existing.get("name")})
    return {"message": "Item deleted"}
