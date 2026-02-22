#!/usr/bin/env python3
"""
UbukweHub Seed Script
Seeds: Admin (benishimwe31@gmail.com), Staff, Inventory, Events, Vendors
"""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import pyotp

ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

from motor.motor_asyncio import AsyncIOMotorClient
from models import User, InventoryItem, Event, Vendor, Shift
from auth import hash_password, generate_totp_secret, get_totp_uri

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


async def seed():
    print("🌱 Seeding UbukweHub database...")

    # Clear existing data
    for col in ["users", "inventory", "events", "vendors", "shifts", "transactions", "audit_logs", "ai_cache", "email_otps"]:
        await db[col].drop()
        print(f"  Dropped collection: {col}")

    # ── ADMIN USER ────────────────────────────────────
    admin_totp_secret = generate_totp_secret()
    admin = User(
        email="benishimwe31@gmail.com",
        name="Benishimwe Admin",
        role="admin",
        password_hash=hash_password("Admin@2025!"),
        mfa_enabled=True,
        mfa_secret=admin_totp_secret,
        mfa_methods=["totp", "email_otp"]
    )
    await db.users.insert_one({**admin.model_dump()})
    admin_uri = get_totp_uri(admin_totp_secret, admin.email)
    print(f"\n✅ Admin created: {admin.email}")
    print(f"   Password: Admin@2025!")
    print(f"   TOTP Secret: {admin_totp_secret}")
    print(f"   TOTP URI: {admin_uri}")
    print(f"   Admin user_id: {admin.user_id}")

    # ── STAFF USERS ───────────────────────────────────
    staff_members = [
        {"name": "Jean-Paul Kagabo", "email": "jeanpaul@ubukwe.rw", "skills": ["DJ", "Sound Engineering"], "role": "staff"},
        {"name": "Marie Claire Uwimana", "email": "marie@ubukwe.rw", "skills": ["Event Coordination", "Floristry"], "role": "staff"},
        {"name": "Eric Mugisha", "email": "eric@ubukwe.rw", "skills": ["Transport", "Logistics"], "role": "staff"},
        {"name": "Diane Ineza", "email": "diane@ubukwe.rw", "skills": ["Photography", "Videography"], "role": "staff"},
        {"name": "Claude Bizimana", "email": "claude@ubukwe.rw", "skills": ["Catering", "Food Safety"], "role": "staff"},
    ]
    staff_ids = []
    for s in staff_members:
        user = User(
            email=s["email"],
            name=s["name"],
            role=s["role"],
            password_hash=hash_password("Staff@2025!"),
            skills=s["skills"]
        )
        await db.users.insert_one({**user.model_dump()})
        staff_ids.append(user.user_id)
        print(f"  Staff: {user.name} ({user.email})")

    # ── DEMO CLIENT ───────────────────────────────────
    client_user = User(
        email="client@example.rw",
        name="Amina Uwase",
        role="client",
        password_hash=hash_password("Client@2025!")
    )
    await db.users.insert_one({**client_user.model_dump()})
    print(f"  Client: {client_user.name} ({client_user.email})")

    # ── INVENTORY ─────────────────────────────────────
    inventory_items = [
        {"name": "Gold Chiavari Chairs", "category": "furniture", "quantity": 200, "available": 180, "rented": 20, "rental_price": 2500, "purchase_price": 15000, "condition": "good"},
        {"name": "Round Tables (1.8m)", "category": "furniture", "quantity": 30, "available": 25, "rented": 5, "rental_price": 5000, "purchase_price": 45000, "condition": "good"},
        {"name": "JBL Sound System Pro", "category": "audio", "quantity": 4, "available": 3, "rented": 1, "rental_price": 50000, "purchase_price": 400000, "condition": "good"},
        {"name": "Ivory Table Linens (Large)", "category": "linens", "quantity": 100, "available": 85, "rented": 10, "washing": 5, "rental_price": 1500, "purchase_price": 8000, "condition": "good"},
        {"name": "Crystal Candelabras", "category": "decor", "quantity": 50, "available": 45, "rented": 5, "rental_price": 3000, "purchase_price": 20000, "condition": "good"},
        {"name": "LED Dance Floor (4x4m)", "category": "lighting", "quantity": 2, "available": 2, "rental_price": 80000, "purchase_price": 500000, "condition": "good"},
        {"name": "Wedding Arch (White)", "category": "decor", "quantity": 5, "available": 4, "rented": 1, "rental_price": 25000, "purchase_price": 120000, "condition": "good"},
        {"name": "Projector Screen (2.4m)", "category": "audio", "quantity": 3, "available": 2, "rented": 1, "rental_price": 15000, "purchase_price": 80000, "condition": "fair"},
        {"name": "Generator 5KVA", "category": "equipment", "quantity": 2, "available": 1, "rented": 1, "rental_price": 60000, "purchase_price": 800000, "condition": "good"},
        {"name": "Flower Vases (Mixed)", "category": "decor", "quantity": 80, "available": 70, "rented": 10, "rental_price": 500, "purchase_price": 3000, "condition": "good"},
        {"name": "Chafing Dishes Set", "category": "catering", "quantity": 20, "available": 15, "rented": 5, "rental_price": 8000, "purchase_price": 35000, "condition": "good"},
        {"name": "Photo Booth Frame", "category": "decor", "quantity": 3, "available": 2, "rented": 1, "rental_price": 30000, "purchase_price": 150000, "condition": "good"},
    ]
    item_ids = []
    for it in inventory_items:
        item = InventoryItem(
            name=it["name"],
            category=it["category"],
            quantity=it["quantity"],
            available=it.get("available", it["quantity"]),
            rented=it.get("rented", 0),
            washing=it.get("washing", 0),
            rental_price=it.get("rental_price", 0),
            purchase_price=it.get("purchase_price", 0),
            condition=it.get("condition", "good")
        )
        await db.inventory.insert_one({**item.model_dump()})
        item_ids.append(item.item_id)

    print(f"\n  {len(inventory_items)} inventory items created")

    # ── VENDORS ───────────────────────────────────────
    vendors_data = [
        {"name": "Kigali Events Catering", "category": "catering", "contact_name": "Solange Mukamana", "email": "info@kigalicatering.rw", "phone": "+250788100100", "location": "Kigali", "rating": 4.8},
        {"name": "Rwanda Floral Arts", "category": "decor", "contact_name": "Patrick Habimana", "email": "flowers@rwandafloral.rw", "phone": "+250788200200", "location": "Kigali", "rating": 4.6},
        {"name": "Kigali Sound & Light", "category": "music", "contact_name": "DJ Kayumba", "email": "dj@kigalisound.rw", "phone": "+250788300300", "location": "Kigali", "rating": 4.9},
        {"name": "Rwanda Moments Photography", "category": "photography", "contact_name": "Alain Nkuranga", "email": "shoot@rwandamoments.rw", "phone": "+250788400400", "location": "Kigali", "rating": 4.7},
        {"name": "Elegant Transport Rwanda", "category": "transport", "contact_name": "Felix Uwayo", "email": "transport@elegantRW.rw", "phone": "+250788500500", "location": "Kigali", "rating": 4.5},
    ]
    vendor_ids = []
    for v in vendors_data:
        vendor = Vendor(**v, is_verified=True)
        await db.vendors.insert_one({**vendor.model_dump()})
        vendor_ids.append(vendor.vendor_id)
    print(f"  {len(vendors_data)} vendors created")

    # ── EVENTS ────────────────────────────────────────
    events_data = [
        {
            "name": "Uwase & Nkurunziza Wedding",
            "event_date": "15/03/2025",
            "venue": "Kigali Serena Hotel",
            "client_name": "Amina Uwase",
            "status": "active",
            "budget": 15000000,
            "guest_count": 300,
            "staff_ids": staff_ids[:3],
            "vendor_ids": vendor_ids[:3],
            "greatness_score": 78.5
        },
        {
            "name": "Kagabo & Uwimana Celebration",
            "event_date": "22/04/2025",
            "venue": "Marriott Hotel Kigali",
            "client_name": "Jean Kagabo",
            "status": "planning",
            "budget": 8000000,
            "guest_count": 150,
            "staff_ids": staff_ids[1:4],
            "vendor_ids": vendor_ids[1:4],
            "greatness_score": 62.0
        },
        {
            "name": "Ineza Gusaba Ceremony",
            "event_date": "10/02/2025",
            "venue": "Inyange Cultural Center",
            "client_name": "Diane Ineza",
            "status": "completed",
            "budget": 5000000,
            "guest_count": 100,
            "staff_ids": staff_ids[2:5],
            "vendor_ids": vendor_ids[2:5],
            "greatness_score": 91.0
        },
    ]
    for ev in events_data:
        event = Event(**ev)
        await db.events.insert_one({**event.model_dump()})
    print(f"  {len(events_data)} events created")

    # ── SHIFTS ────────────────────────────────────────
    if events_data:
        ev_doc = await db.events.find_one({"name": "Uwase & Nkurunziza Wedding"}, {"_id": 0})
        if ev_doc and staff_ids:
            shift_roles = ["Event Coordinator", "DJ", "Transport Lead"]
            for i, (sid, role) in enumerate(zip(staff_ids[:3], shift_roles)):
                staff_doc = await db.users.find_one({"user_id": sid}, {"_id": 0})
                shift = Shift(
                    event_id=ev_doc["event_id"],
                    staff_id=sid,
                    staff_name=staff_doc.get("name", "") if staff_doc else "",
                    role=role,
                    date="15/03/2025",
                    start_time="07:00",
                    end_time="22:00",
                    status="active"
                )
                await db.shifts.insert_one({**shift.model_dump()})
    print("  Shifts created")

    print("\n✅ Seeding complete!")
    print("\n📋 LOGIN CREDENTIALS:")
    print("  Admin:  benishimwe31@gmail.com / Admin@2025! (MFA enabled)")
    print("  Staff:  jeanpaul@ubukwe.rw / Staff@2025!")
    print("  Client: client@example.rw / Client@2025!")
    print(f"\n🔐 ADMIN TOTP SECRET: {admin_totp_secret}")
    print(f"   Scan this URI in Google Authenticator or Authy:")
    print(f"   {admin_uri}")


if __name__ == "__main__":
    asyncio.run(seed())
