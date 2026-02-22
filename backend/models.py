from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Annotated
from datetime import datetime, timezone
from bson import ObjectId
import uuid


def PyObjectId(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError(f"Cannot convert {type(v)} to str ObjectId")


PyObjectIdAnnotated = Annotated[str, PyObjectId]


def gen_id():
    return str(uuid.uuid4())


# ──────────────────────────────────────────────
# USER
# ──────────────────────────────────────────────
class User(BaseModel):
    user_id: str = Field(default_factory=gen_id)
    email: str
    name: str
    role: str = "staff"  # admin | staff | client | vendor
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    picture: Optional[str] = None
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    mfa_methods: List[str] = []
    skills: List[str] = []
    certifications: List[str] = []
    availability: Optional[str] = None
    device_capabilities: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "staff"


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    availability: Optional[str] = None
    device_capabilities: Optional[str] = None
    is_active: Optional[bool] = None


# ──────────────────────────────────────────────
# SESSION
# ──────────────────────────────────────────────
class UserSession(BaseModel):
    session_id: str = Field(default_factory=gen_id)
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ──────────────────────────────────────────────
# EMAIL OTP
# ──────────────────────────────────────────────
class EmailOTP(BaseModel):
    otp_id: str = Field(default_factory=gen_id)
    user_id: str
    otp_code: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ──────────────────────────────────────────────
# VENDOR
# ──────────────────────────────────────────────
class Vendor(BaseModel):
    vendor_id: str = Field(default_factory=gen_id)
    name: str
    category: str  # catering, decor, music, photography, transport
    contact_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    rating: float = 0.0
    notes: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorCreate(BaseModel):
    name: str
    category: str
    contact_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


# ──────────────────────────────────────────────
# INVENTORY
# ──────────────────────────────────────────────
class InventoryItem(BaseModel):
    item_id: str = Field(default_factory=gen_id)
    name: str
    category: str  # furniture, audio, decor, linens, lighting, transport
    qr_code: str = Field(default_factory=lambda: f"QR-{uuid.uuid4().hex[:8].upper()}")
    barcode: Optional[str] = None
    quantity: int = 1
    available: int = 1
    rented: int = 0
    washing: int = 0
    condition: str = "good"  # good, fair, poor, maintenance
    supplier: Optional[str] = None
    purchase_price: float = 0.0
    rental_price: float = 0.0
    photos: List[str] = []
    maintenance_schedule: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InventoryItemCreate(BaseModel):
    name: str
    category: str
    quantity: int = 1
    condition: str = "good"
    supplier: Optional[str] = None
    purchase_price: float = 0.0
    rental_price: float = 0.0
    photos: List[str] = []
    notes: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None
    supplier: Optional[str] = None
    purchase_price: Optional[float] = None
    rental_price: Optional[float] = None
    photos: Optional[List[str]] = None
    notes: Optional[str] = None
    maintenance_schedule: Optional[str] = None


# ──────────────────────────────────────────────
# TRANSACTION
# ──────────────────────────────────────────────
class Transaction(BaseModel):
    transaction_id: str = Field(default_factory=gen_id)
    type: str  # rent, return, wash, buy, lost, damage
    item_id: str
    item_name: str = ""
    event_id: Optional[str] = None
    event_name: Optional[str] = None
    staff_id: str
    staff_name: str = ""
    quantity: int = 1
    notes: Optional[str] = None
    photo: Optional[str] = None
    return_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransactionCreate(BaseModel):
    type: str
    item_id: str
    event_id: Optional[str] = None
    quantity: int = 1
    notes: Optional[str] = None
    photo: Optional[str] = None
    return_date: Optional[str] = None


# ──────────────────────────────────────────────
# EVENT
# ──────────────────────────────────────────────
class Event(BaseModel):
    event_id: str = Field(default_factory=gen_id)
    name: str
    event_date: str  # dd/mm/yyyy
    venue: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    staff_ids: List[str] = []
    vendor_ids: List[str] = []
    status: str = "planning"  # planning, active, completed, cancelled
    budget: float = 0.0
    notes: Optional[str] = None
    guest_count: int = 0
    greatness_score: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EventCreate(BaseModel):
    name: str
    event_date: str
    venue: str
    client_name: Optional[str] = None
    budget: float = 0.0
    guest_count: int = 0
    notes: Optional[str] = None


class EventUpdate(BaseModel):
    name: Optional[str] = None
    event_date: Optional[str] = None
    venue: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = None
    guest_count: Optional[int] = None
    notes: Optional[str] = None
    staff_ids: Optional[List[str]] = None
    vendor_ids: Optional[List[str]] = None


# ──────────────────────────────────────────────
# SHIFT
# ──────────────────────────────────────────────
class Shift(BaseModel):
    shift_id: str = Field(default_factory=gen_id)
    event_id: str
    staff_id: str
    staff_name: str = ""
    role: str
    date: str  # dd/mm/yyyy
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    status: str = "scheduled"  # scheduled, active, completed, cancelled
    tasks: List[dict] = []
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ShiftCreate(BaseModel):
    event_id: str
    staff_id: str
    role: str
    date: str
    start_time: str
    end_time: str
    notes: Optional[str] = None


# ──────────────────────────────────────────────
# AUDIT LOG
# ──────────────────────────────────────────────
class AuditLog(BaseModel):
    log_id: str = Field(default_factory=gen_id)
    user_id: str
    user_email: str = ""
    action: str  # create, update, delete, login, logout, mfa_setup, etc.
    resource: str  # user, inventory, transaction, event, etc.
    resource_id: str = ""
    details: dict = {}
    ip_address: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
