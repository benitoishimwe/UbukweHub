from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import json, os, uuid
from datetime import datetime, timezone

from database import db
from models import User
from auth import get_current_user
from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter()

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


async def get_chat(system: str) -> LlmChat:
    return LlmChat(
        api_key=LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system
    ).with_model("openai", "gpt-4o")


class GreatnesRequest(BaseModel):
    event_id: str
    weights: Optional[dict] = None  # custom weights for metrics


class PlanningRequest(BaseModel):
    event_id: Optional[str] = None
    event_name: str
    event_date: str
    venue: str
    guest_count: int
    budget: float
    preferences: Optional[str] = None


class BudgetRequest(BaseModel):
    event_name: str
    guest_count: int
    venue: str
    event_type: str = "wedding"


class VendorDiscoveryRequest(BaseModel):
    category: str
    location: str = "Kigali, Rwanda"
    budget_range: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


# ─── WEDDING GREATNESS SCORE ───────────────────────

@router.post("/greatness")
async def calculate_greatness(data: GreatnesRequest, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"event_id": data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Gather metrics
    total_inventory = await db.inventory.count_documents({"is_active": True})
    available_inventory = await db.inventory.count_documents({"is_active": True, "available": {"$gt": 0}})
    staff_count = len(event.get("staff_ids", []))
    vendor_count = len(event.get("vendor_ids", []))
    budget = event.get("budget", 0)

    default_weights = {
        "plan_completeness": 0.20,
        "inventory_availability": 0.20,
        "budget_health": 0.15,
        "staff_coverage": 0.20,
        "timing_risk": 0.10,
        "vendor_reliability": 0.15
    }
    weights = {**default_weights, **(data.weights or {})}

    system = """You are UbukweHub's Wedding Greatness Agent for Rwanda wedding planning.
    Analyze event data and return a JSON score with this exact structure:
    {
      "score": <0-100 float>,
      "metrics": {
        "plan_completeness": {"score": <0-100>, "weight": <float>, "note": "<brief note>"},
        "inventory_availability": {"score": <0-100>, "weight": <float>, "note": "<brief note>"},
        "budget_health": {"score": <0-100>, "weight": <float>, "note": "<brief note>"},
        "staff_coverage": {"score": <0-100>, "weight": <float>, "note": "<brief note>"},
        "timing_risk": {"score": <0-100>, "weight": <float>, "note": "<brief note>"},
        "vendor_reliability": {"score": <0-100>, "weight": <float>, "note": "<brief note>"}
      },
      "priority_actions": ["action1", "action2", "action3"],
      "what_if": {
        "add_2_vendors": <projected score>,
        "increase_budget_10pct": <projected score>,
        "add_5_staff": <projected score>
      },
      "confidence": <0-1 float>,
      "summary": "<one sentence summary>"
    }
    Return only valid JSON, no markdown."""

    prompt = f"""Event: {event.get('name')}
Date: {event.get('event_date')}
Venue: {event.get('venue')}
Guest Count: {event.get('guest_count', 0)}
Budget: {budget:,.0f} RWF
Staff assigned: {staff_count}
Vendors assigned: {vendor_count}
Status: {event.get('status')}
Total available inventory items: {available_inventory}/{total_inventory}
Weights: {json.dumps(weights)}
Notes: {event.get('notes', 'N/A')}

Calculate the Wedding Greatness Score."""

    chat = await get_chat(system)
    response = await chat.send_message(UserMessage(text=prompt))

    try:
        result = json.loads(response.strip())
    except Exception:
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        result = json.loads(match.group()) if match else {"score": 50, "error": "Parse error"}

    # Cache result
    await db.events.update_one({"event_id": data.event_id}, {"$set": {"greatness_score": result.get("score")}})
    await db.ai_cache.insert_one({
        "type": "greatness", "event_id": data.event_id,
        "result": result, "created_at": datetime.now(timezone.utc)
    })
    return result


# ─── CHECKLIST GENERATION ──────────────────────────

@router.post("/checklist")
async def generate_checklist(data: PlanningRequest, current_user: User = Depends(get_current_user)):
    system = """You are a professional Rwandan wedding planner creating detailed checklists.
    Return JSON with this structure:
    {
      "checklist": [
        {"category": "category name", "tasks": [{"task": "task description", "timeline": "X weeks before", "priority": "high|medium|low", "assignee": "coordinator|staff|vendor"}]}
      ],
      "total_tasks": <int>,
      "timeline_summary": "<overview>"
    }
    Return only valid JSON."""

    prompt = f"""Create a comprehensive wedding planning checklist for:
Event: {data.event_name}
Date: {data.event_date}
Venue: {data.venue}
Guests: {data.guest_count}
Budget: {data.budget:,.0f} RWF
Preferences: {data.preferences or 'Traditional Rwandan wedding with modern touches'}

Include all phases: planning, vendor coordination, inventory prep, day-of logistics."""

    chat = await get_chat(system)
    response = await chat.send_message(UserMessage(text=prompt))
    try:
        return json.loads(response.strip())
    except Exception:
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        return json.loads(match.group()) if match else {"error": "Parse error", "raw": response[:500]}


# ─── BUDGET FORECAST ───────────────────────────────

@router.post("/budget")
async def forecast_budget(data: BudgetRequest, current_user: User = Depends(get_current_user)):
    system = """You are a Rwanda wedding budget expert. Return JSON:
    {
      "total_estimated": <RWF amount>,
      "breakdown": [{"category": "name", "amount": <int>, "percentage": <float>, "notes": "string"}],
      "per_guest_cost": <int>,
      "cost_saving_tips": ["tip1", "tip2", "tip3"],
      "currency": "RWF"
    }
    Return only valid JSON."""

    prompt = f"""Estimate detailed budget for a {data.event_type} in {data.venue}, Rwanda.
Guests: {data.guest_count}. Include venue, catering, decor, music, photography, transport, flowers, staff."""

    chat = await get_chat(system)
    response = await chat.send_message(UserMessage(text=prompt))
    try:
        return json.loads(response.strip())
    except Exception:
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        return json.loads(match.group()) if match else {"error": "Parse error"}


# ─── VENDOR DISCOVERY ──────────────────────────────

@router.post("/vendors")
async def discover_vendors(data: VendorDiscoveryRequest, current_user: User = Depends(get_current_user)):
    # First check internal vendors
    internal = await db.vendors.find(
        {"category": {"$regex": data.category, "$options": "i"}, "is_active": True},
        {"_id": 0}
    ).to_list(5)

    system = """You are a Rwandan wedding vendor expert. Return JSON:
    {
      "vendors": [{"name": "str", "category": "str", "speciality": "str", "location": "str", "estimated_cost": "str", "rating": <1-5 float>, "contact_tip": "str"}],
      "tips": ["tip1", "tip2"]
    }
    Return only valid JSON."""

    prompt = f"""Find top {data.category} vendors for weddings in {data.location}.
Budget range: {data.budget_range or 'flexible'}. Focus on quality and reliability."""

    chat = await get_chat(system)
    response = await chat.send_message(UserMessage(text=prompt))
    try:
        ai_result = json.loads(response.strip())
    except Exception:
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        ai_result = json.loads(match.group()) if match else {"vendors": [], "tips": []}

    return {"internal_vendors": internal, "ai_suggestions": ai_result}


# ─── AI CHAT ───────────────────────────────────────

@router.post("/chat")
async def ai_chat(data: ChatRequest, current_user: User = Depends(get_current_user)):
    system = """You are UbukweHub's AI wedding planning assistant for Rwanda.
    You help with wedding planning, inventory management, staff coordination, and event logistics.
    You know about Rwandan wedding traditions (Gusaba, Ubukwe) and modern wedding planning.
    Be concise, practical, and supportive. Respond in the same language as the user's message."""

    context = data.context or ""
    full_message = f"{context}\n\nUser: {data.message}" if context else data.message

    chat = await get_chat(system)
    response = await chat.send_message(UserMessage(text=full_message))
    return {"response": response, "model": "gpt-4o"}
