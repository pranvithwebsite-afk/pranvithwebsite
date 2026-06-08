from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import hmac
import hashlib
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import razorpay

from seed_data import COURSES, TESTIMONIALS, FAQS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client (lazy / safe-init)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as _e:
        razorpay_client = None

app = FastAPI(title='BBEdits API')
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Models ----------
class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    lectures: int
    discount: str
    price: int
    original: Optional[int] = None
    image: str
    tag: str
    color: str


class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    role: str
    text: str
    rating: int = 5


class FAQ(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    q: str
    a: str
    order: int = 0


class HireRequestIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    requirement: str = Field(min_length=3, max_length=2000)


class HireRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    requirement: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SubscribeIn(BaseModel):
    email: EmailStr


class Subscriber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CreateOrderIn(BaseModel):
    amount: int = Field(ge=100, description="Amount in paise (minimum 100)")
    currency: str = Field(default="INR", min_length=3, max_length=3)
    receipt: Optional[str] = None
    item_id: Optional[str] = None
    item_name: Optional[str] = None


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    item_id: Optional[str] = None
    item_name: Optional[str] = None
    amount: Optional[int] = None
    email: Optional[str] = None


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "BBEdits API", "status": "ok"}


@api_router.get("/courses", response_model=List[Course])
async def get_courses():
    rows = await db.courses.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return rows


@api_router.get("/testimonials", response_model=List[Testimonial])
async def get_testimonials():
    rows = await db.testimonials.find({}, {"_id": 0}).to_list(200)
    return rows


@api_router.get("/faqs", response_model=List[FAQ])
async def get_faqs():
    rows = await db.faqs.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return rows


@api_router.post("/hire")
async def create_hire_request(payload: HireRequestIn):
    obj = HireRequest(name=payload.name, email=str(payload.email), requirement=payload.requirement)
    try:
        await db.hire_requests.insert_one(obj.model_dump())
    except Exception as e:
        logger.exception("hire insert failed")
        raise HTTPException(status_code=500, detail="Failed to save request")
    return {"id": obj.id, "success": True, "message": "Request received! Our team will reach out within 24 hours."}


@api_router.post("/subscribe")
async def subscribe(payload: SubscribeIn):
    email = str(payload.email).lower().strip()
    existing = await db.subscribers.find_one({"email": email}, {"_id": 0})
    if existing:
        return {"id": existing.get("id"), "success": True, "message": "You are already subscribed!"}
    sub = Subscriber(email=email)
    try:
        await db.subscribers.insert_one(sub.model_dump())
    except Exception as e:
        logger.exception("subscribe insert failed")
        raise HTTPException(status_code=500, detail="Failed to subscribe")
    return {"id": sub.id, "success": True, "message": "Subscribed! Thanks for joining BBEdits."}


# ---------- Razorpay ----------
@api_router.post("/create-order")
async def create_order(payload: CreateOrderIn):
    if razorpay_client is None:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    if payload.amount < 100:
        raise HTTPException(status_code=400, detail="Amount must be at least 100 paise")

    receipt = payload.receipt or f"rcpt_{uuid.uuid4().hex[:16]}"
    try:
        order = razorpay_client.order.create({
            "amount": int(payload.amount),
            "currency": payload.currency.upper(),
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "item_id": payload.item_id or "",
                "item_name": payload.item_name or "",
            },
        })
    except razorpay.errors.BadRequestError as e:
        logger.exception("Razorpay bad request")
        raise HTTPException(status_code=400, detail=str(e))
    except razorpay.errors.ServerError as e:
        logger.exception("Razorpay server error")
        raise HTTPException(status_code=502, detail="Payment gateway error")
    except Exception as e:
        logger.exception("Razorpay order failure")
        raise HTTPException(status_code=500, detail="Could not create order")

    # Persist order record
    try:
        await db.orders.insert_one({
            "id": str(uuid.uuid4()),
            "razorpay_order_id": order.get("id"),
            "amount": order.get("amount"),
            "currency": order.get("currency"),
            "receipt": receipt,
            "item_id": payload.item_id,
            "item_name": payload.item_name,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        logger.exception("orders insert failed (non-fatal)")

    return {
        "order_id": order.get("id"),
        "amount": order.get("amount"),
        "currency": order.get("currency"),
        "key_id": RAZORPAY_KEY_ID,
        "receipt": receipt,
    }


@api_router.post("/verify-payment")
async def verify_payment(payload: VerifyPaymentIn):
    if not (payload.razorpay_order_id and payload.razorpay_payment_id and payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Missing payment fields")
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    expected_sig = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, payload.razorpay_signature):
        # Record failed attempt (best-effort) but do not mark order paid
        try:
            await db.orders.update_one(
                {"razorpay_order_id": payload.razorpay_order_id},
                {"$set": {"status": "signature_mismatch",
                          "razorpay_payment_id": payload.razorpay_payment_id,
                          "verified_at": datetime.now(timezone.utc).isoformat()}},
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    # Signature valid -> mark as paid
    try:
        await db.orders.update_one(
            {"razorpay_order_id": payload.razorpay_order_id},
            {"$set": {
                "status": "paid",
                "razorpay_payment_id": payload.razorpay_payment_id,
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "buyer_email": payload.email,
            }},
        )
    except Exception:
        logger.exception("orders update failed (non-fatal)")

    return {
        "success": True,
        "message": "Payment verified successfully",
        "razorpay_order_id": payload.razorpay_order_id,
        "razorpay_payment_id": payload.razorpay_payment_id,
    }


# Legacy status endpoints (kept for compatibility)
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _seed_db():
    """Run seed in background so startup is non-blocking on Atlas."""
    try:
        # Seed courses
        if await db.courses.count_documents({}) == 0:
            for i, c in enumerate(COURSES):
                doc = {**c, "order": i}
                await db.courses.insert_one(doc)
            logger.info("Seeded %d courses", len(COURSES))
        # Seed testimonials
        if await db.testimonials.count_documents({}) == 0:
            await db.testimonials.insert_many([dict(t) for t in TESTIMONIALS])
            logger.info("Seeded %d testimonials", len(TESTIMONIALS))
        # Seed faqs
        if await db.faqs.count_documents({}) == 0:
            for i, f in enumerate(FAQS):
                await db.faqs.insert_one({**f, "order": i})
            logger.info("Seeded %d faqs", len(FAQS))
        # Ensure index on subscribers email (best-effort, ignore errors)
        try:
            await db.subscribers.create_index("email", unique=True)
        except Exception as ie:
            logger.warning("subscribers index skipped: %s", ie)
    except Exception as e:
        logger.exception("Seed failed: %s", e)


@app.on_event("startup")
async def on_startup():
    # Fire-and-forget so startup completes immediately and readiness probes pass.
    asyncio.create_task(_seed_db())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
