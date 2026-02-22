from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

from routes.auth_routes import router as auth_router
from routes.inventory_routes import router as inventory_router
from routes.transaction_routes import router as transaction_router
from routes.event_routes import router as event_router
from routes.staff_routes import router as staff_router
from routes.ai_routes import router as ai_router
from routes.admin_routes import router as admin_router
from routes.vendor_routes import router as vendor_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="UbukweHub API", version="1.0.0", description="Rwanda Wedding Planning Platform")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["inventory"])
api_router.include_router(transaction_router, prefix="/transactions", tags=["transactions"])
api_router.include_router(event_router, prefix="/events", tags=["events"])
api_router.include_router(staff_router, prefix="/staff", tags=["staff"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(vendor_router, prefix="/vendors", tags=["vendors"])


@api_router.get("/")
async def root():
    return {"message": "UbukweHub API v1.0", "status": "healthy", "platform": "Rwanda Wedding Planning"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(api_router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
