from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from database import db
from models import Transaction, TransactionCreate, User
from auth import get_current_user, log_audit

router = APIRouter()


async def update_inventory_counts(item_id: str, tx_type: str, qty: int, reverse: bool = False):
    item = await db.inventory.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        return
    available = item.get("available", 0)
    rented = item.get("rented", 0)
    washing = item.get("washing", 0)

    if not reverse:
        if tx_type == "rent":
            available = max(0, available - qty)
            rented += qty
        elif tx_type == "return":
            rented = max(0, rented - qty)
            available += qty
        elif tx_type == "wash":
            available = max(0, available - qty)
            washing += qty
        elif tx_type in ["lost", "damage"]:
            available = max(0, available - qty)
        elif tx_type == "buy":
            available += qty
    else:
        if tx_type == "rent":
            available += qty
            rented = max(0, rented - qty)
        elif tx_type == "return":
            rented += qty
            available = max(0, available - qty)
        elif tx_type == "wash":
            washing = max(0, washing - qty)
            available += qty

    await db.inventory.update_one(
        {"item_id": item_id},
        {"$set": {"available": available, "rented": rented, "washing": washing, "updated_at": datetime.now(timezone.utc)}}
    )


@router.get("")
async def list_transactions(
    type: Optional[str] = None,
    item_id: Optional[str] = None,
    event_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if item_id:
        query["item_id"] = item_id
    if event_id:
        query["event_id"] = event_id
    if staff_id:
        query["staff_id"] = staff_id
    skip = (page - 1) * limit
    txs = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.transactions.count_documents(query)
    return {"transactions": txs, "total": total, "page": page}


@router.get("/stats")
async def get_transaction_stats(current_user: User = Depends(get_current_user)):
    pipeline = [{"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    by_type = await db.transactions.aggregate(pipeline).to_list(20)
    total = await db.transactions.count_documents({})
    recent = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {
        "total": total,
        "by_type": {t["_id"]: t["count"] for t in by_type},
        "recent": recent
    }


@router.get("/{tx_id}")
async def get_transaction(tx_id: str, current_user: User = Depends(get_current_user)):
    tx = await db.transactions.find_one({"transaction_id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.post("")
async def create_transaction(data: TransactionCreate, current_user: User = Depends(get_current_user)):
    # Get item info
    item = await db.inventory.find_one({"item_id": data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    # Get event info
    event_name = None
    if data.event_id:
        event = await db.events.find_one({"event_id": data.event_id}, {"_id": 0})
        if event:
            event_name = event.get("name")
    tx = Transaction(
        **data.model_dump(),
        item_name=item.get("name", ""),
        staff_id=current_user.user_id,
        staff_name=current_user.name,
        event_name=event_name
    )
    await db.transactions.insert_one({**tx.model_dump()})
    await update_inventory_counts(data.item_id, data.type, data.quantity)
    await log_audit(current_user, f"transaction_{data.type}", "transaction", tx.transaction_id, {"item": item.get("name")})
    return tx.model_dump()


@router.put("/{tx_id}")
async def update_transaction(tx_id: str, data: dict, current_user: User = Depends(get_current_user)):
    tx = await db.transactions.find_one({"transaction_id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.transactions.update_one({"transaction_id": tx_id}, {"$set": data})
    return {**tx, **data}
