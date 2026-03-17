from fastapi import APIRouter, HTTPException, Depends, Query, Response
from typing import Optional
from datetime import datetime, timezone
import io
from fpdf import FPDF

from database import db
from models import Event, EventCreate, EventUpdate, User
from auth import get_current_user, require_role, log_audit

router = APIRouter()


@router.get("")
async def list_events(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"venue": {"$regex": search, "$options": "i"}},
            {"client_name": {"$regex": search, "$options": "i"}}
        ]
    skip = (page - 1) * limit
    events = await db.events.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.events.count_documents(query)
    return {"events": events, "total": total, "page": page}


@router.get("/stats")
async def get_event_stats(current_user: User = Depends(get_current_user)):
    total = await db.events.count_documents({})
    by_status = await db.events.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(10)
    upcoming = await db.events.count_documents({"status": "planning"})
    active = await db.events.count_documents({"status": "active"})
    return {
        "total": total,
        "upcoming": upcoming,
        "active": active,
        "by_status": {s["_id"]: s["count"] for s in by_status}
    }


@router.get("/{event_id}")
async def get_event(event_id: str, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    # Enrich with staff details
    if event.get("staff_ids"):
        staff_docs = await db.users.find(
            {"user_id": {"$in": event["staff_ids"]}},
            {"_id": 0, "user_id": 1, "name": 1, "role": 1, "picture": 1}
        ).to_list(50)
        event["staff"] = staff_docs
    if event.get("vendor_ids"):
        vendor_docs = await db.vendors.find(
            {"vendor_id": {"$in": event["vendor_ids"]}},
            {"_id": 0, "vendor_id": 1, "name": 1, "category": 1, "rating": 1}
        ).to_list(20)
        event["vendors"] = vendor_docs
    return event


@router.get("/{event_id}/report")
async def get_event_report(event_id: str, current_user: User = Depends(get_current_user)):
    event = await get_event(event_id, current_user)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, f"Event Report: {event.get('name')}", new_x="LMARGIN", new_y="NEXT", align="C")
    
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, f"Date: {event.get('event_date')} | Venue: {event.get('venue')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Client: {event.get('client_name') or 'N/A'}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 10, f"Status: {event.get('status')} | Budget: {event.get('budget')} RWF", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Assigned Staff", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 12)
    staff_list = event.get("staff", [])
    if not staff_list:
        pdf.cell(0, 10, "No staff assigned.", new_x="LMARGIN", new_y="NEXT")
    else:
        for s in staff_list:
            pdf.cell(0, 8, f"- {s.get('name')} ({s.get('role')})", new_x="LMARGIN", new_y="NEXT")
            
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(0, 10, "Assigned Vendors", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 12)
    vendor_list = event.get("vendors", [])
    if not vendor_list:
        pdf.cell(0, 10, "No vendors assigned.", new_x="LMARGIN", new_y="NEXT")
    else:
        for v in vendor_list:
            pdf.cell(0, 8, f"- {v.get('name')} ({v.get('category')})", new_x="LMARGIN", new_y="NEXT")
            
    pdf_bytes = pdf.output()
    
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="event_{event_id}_report.pdf"'}
    )


@router.post("")
async def create_event(data: EventCreate, current_user: User = Depends(require_role("admin", "staff"))):
    event = Event(**data.model_dump(), client_id=current_user.user_id)
    await db.events.insert_one({**event.model_dump()})
    await log_audit(current_user, "create", "event", event.event_id, {"name": event.name})
    return event.model_dump()


@router.put("/{event_id}")
async def update_event(event_id: str, data: EventUpdate, current_user: User = Depends(require_role("admin", "staff"))):
    existing = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.events.update_one({"event_id": event_id}, {"$set": update_data})
    await log_audit(current_user, "update", "event", event_id, update_data)
    return {**existing, **update_data}


@router.delete("/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(require_role("admin"))):
    existing = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.events.delete_one({"event_id": event_id})
    await log_audit(current_user, "delete", "event", event_id, {"name": existing.get("name")})
    return {"message": "Event deleted"}
