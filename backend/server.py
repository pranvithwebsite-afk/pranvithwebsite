from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Header
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError
from passlib.context import CryptContext
from jose import JWTError, jwt
from email.message import EmailMessage
import os
import json
import asyncio
import hmac
import hashlib
import logging
import re
import secrets
import smtplib
import ssl
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import razorpay
import shutil
import mimetypes

from seed_data import (
    COURSES,
    TESTIMONIALS,
    FAQS,
    PAGES,
    ASSET_PRODUCTS,
    BLOG_CATEGORIES,
    BLOG_POSTS,
    SETTINGS,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
mongo_timeout_ms = int(os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "8000"))
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=mongo_timeout_ms,
    connectTimeoutMS=mongo_timeout_ms,
) if mongo_url and db_name else None
db = client[db_name] if client is not None else None


def mongodb_config_summary() -> dict:
    hostname_match = re.search(r"@([^/?]+)", mongo_url or "")
    return {
        "configured": bool(mongo_url and db_name),
        "scheme": "mongodb+srv" if (mongo_url or "").startswith("mongodb+srv://") else "other",
        "hostname": hostname_match.group(1) if hostname_match else None,
        "database": db_name,
    }


def mongodb_error_category(exc: Exception) -> str:
    if isinstance(exc, OperationFailure) and exc.code == 8000:
        return "authentication_failed"
    if isinstance(exc, ServerSelectionTimeoutError):
        message = str(exc).lower()
        if "ssl" in message or "tls" in message:
            return "tls_or_network_failed"
        return "server_selection_failed"
    return "connection_failed"


def mongodb_public_error(exc: Exception) -> str:
    category = mongodb_error_category(exc)
    if category == "authentication_failed":
        return "Database authentication failed. Check the production MONGO_URL credentials."
    if category == "tls_or_network_failed":
        return "Database connection failed during TLS or network negotiation."
    return "Database is temporarily unavailable. Please try again shortly."


# Razorpay client (lazy / safe-init)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as _e:
        razorpay_client = None


def smtp_configured() -> bool:
    return all([
        os.environ.get("SMTP_HOST"),
        os.environ.get("SMTP_PORT"),
        os.environ.get("SMTP_USER"),
        os.environ.get("SMTP_PASS"),
        os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER"),
    ])

app = FastAPI(title='PranvithDOP API')
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@api_router.get("/health/mongodb")
async def mongodb_health():
    summary = mongodb_config_summary()
    if db is None:
        return {**summary, "ok": False, "error": "not_configured"}
    try:
        await db.command("ping")
        return {**summary, "ok": True, "error": None}
    except Exception as exc:
        category = mongodb_error_category(exc)
        logger.warning("MongoDB health check failed: category=%s", category)
        return {**summary, "ok": False, "error": category}


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


class Page(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    title: str
    sections: Dict[str, Any]
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True
    created_at: str
    updated_at: Optional[str] = None


class PageIn(BaseModel):
    slug: str
    title: str
    sections: Dict[str, Any] = {}
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    name: str
    category: Optional[str] = None
    price: int
    sale_price: Optional[int] = None
    description: Optional[str] = None
    features: List[str] = []
    benefits: List[str] = []
    faqs: List[Dict[str, str]] = []
    before_images: List[str] = []
    after_images: List[str] = []
    images: List[str] = []
    videos: List[str] = []
    download_file: Optional[str] = None
    payment_link: Optional[str] = None
    thank_you_content: Optional[Dict[str, Any]] = None
    landing_content: Optional[Dict[str, Any]] = None
    hero_image: Optional[str] = None
    is_free: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True
    created_at: str
    updated_at: Optional[str] = None
    product_url: Optional[str] = None
    sold_count: int = 0


class ProductIn(BaseModel):
    slug: str
    name: str
    category: Optional[str] = None
    price: int
    sale_price: Optional[int] = None
    description: Optional[str] = None
    features: List[str] = []
    benefits: List[str] = []
    faqs: List[Dict[str, str]] = []
    before_images: List[str] = []
    after_images: List[str] = []
    images: List[str] = []
    videos: List[str] = []
    download_file: Optional[str] = None
    payment_link: Optional[str] = None
    thank_you_content: Optional[Dict[str, Any]] = None
    landing_content: Optional[Dict[str, Any]] = None
    hero_image: Optional[str] = None
    is_free: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True
    product_url: Optional[str] = None


class MediaItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    type: str
    url: str
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    uploaded_at: str
    tags: List[str] = []


class MediaIn(BaseModel):
    title: str
    type: str
    url: str
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = []


class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    code: str
    discount_type: str
    discount_value: int
    usage_limit: Optional[int] = None
    used_count: int = 0
    expires_at: Optional[str] = None
    active: bool = True


class CouponIn(BaseModel):
    code: str
    discount_type: str
    discount_value: int
    usage_limit: Optional[int] = None
    expires_at: Optional[str] = None
    active: bool = True


class TestimonialItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    role: str
    text: str
    rating: int = 5
    published: bool = True
    created_at: str


class TestimonialIn(BaseModel):
    name: str
    role: str
    text: str
    rating: int = 5
    published: bool = True


class BlogCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    slug: str


class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    slug: str
    category: str
    tags: List[str] = []
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True
    created_at: str
    updated_at: Optional[str] = None


class BlogPostIn(BaseModel):
    title: str
    slug: str
    category: str
    tags: List[str] = []
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True


class CustomerItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    purchased_products: List[str] = []
    total_spend: int = 0
    purchase_history: List[Dict[str, Any]] = []
    created_at: str


class CustomerIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    purchased_products: List[str] = []
    total_spend: int = 0
    purchase_history: List[Dict[str, Any]] = []


class DownloadLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    file_url: str
    expires_at: Optional[str] = None
    max_downloads: Optional[int] = None
    downloads: int = 0
    created_at: str


class DownloadLinkIn(BaseModel):
    product_id: str
    file_url: str
    expires_at: Optional[str] = None
    max_downloads: Optional[int] = None


class SettingsPayload(BaseModel):
    site_name: Optional[str] = None
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    site_description: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    ga4_id: Optional[str] = None
    gtm_id: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    email_smtp_host: Optional[str] = None
    email_smtp_port: Optional[int] = None
    email_smtp_user: Optional[str] = None
    email_smtp_password: Optional[str] = None


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


class PaymentCreateOrderIn(BaseModel):
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)


class PaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentFreeOrderIn(BaseModel):
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, min_length=7, max_length=20)


class CheckoutOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    product_id: Optional[str] = None
    product_slug: Optional[str] = None
    product_name: str
    amount: int
    currency: str = "INR"
    payment_status: str = "pending"
    status: str = "pending"
    created_at: str
    paid_at: Optional[str] = None


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
    return {
        "message": "PranvithDOP API",
        "status": "ok",
        "db_configured": db is not None,
        "razorpay_configured": razorpay_client is not None,
        "smtp_configured": smtp_configured(),
    }


@api_router.get("/courses", response_model=List[Course])
async def get_courses():
    if db is None:
        return COURSES
    rows = await db.courses.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return rows


@api_router.get("/testimonials", response_model=List[Testimonial])
async def get_testimonials():
    if db is None:
        return TESTIMONIALS
    rows = await db.testimonials.find({}, {"_id": 0}).to_list(200)
    return rows


@api_router.get("/faqs", response_model=List[FAQ])
async def get_faqs():
    if db is None:
        return FAQS
    rows = await db.faqs.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return rows


@api_router.get("/settings")
async def public_settings():
    if db is None:
        return SETTINGS
    settings_doc = await db.settings.find_one({}, {"_id": 0})
    if not settings_doc:
        return {
            "site_name": "PranvithDOP",
            "theme": "dark",
            "notifications_enabled": True,
            "site_description": "Premium video editing training, assets and tutorials.",
            "contact_email": "info@pranvithdop.com",
            "contact_phone": "+91 9059867883",
            "contact_address": "Hyderabad, India",
        }
    return settings_doc


@api_router.get("/pages")
async def public_pages():
    if db is None:
        return [page for page in PAGES if page.get("published", True)]
    return await db.pages.find({"published": True}, {"_id": 0}).to_list(100)


@api_router.get("/pages/{slug}")
async def public_page_by_slug(slug: str):
    if db is None:
        page = next((page for page in PAGES if page.get("slug") == slug and page.get("published", True)), None)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")
        return page
    page = await db.pages.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


def _public_product(product: dict) -> dict:
    safe = dict(product)
    safe.pop("download_file", None)
    safe.pop("payment_link", None)
    return safe


@api_router.get("/products")
async def public_products():
    if db is None:
        return [_public_product(product) for product in ASSET_PRODUCTS if product.get("published", True)]
    rows = await db.products.find({"published": True}, {"_id": 0, "download_file": 0, "payment_link": 0}).to_list(100)
    return rows


@api_router.get("/products/{slug}")
async def public_product_by_slug(slug: str):
    if db is None:
        product = next((product for product in ASSET_PRODUCTS if product.get("slug") == slug and product.get("published", True)), None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return _public_product(product)
    product = await db.products.find_one({"slug": slug, "published": True}, {"_id": 0, "download_file": 0, "payment_link": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.get("/blog-posts")
async def public_blog_posts():
    if db is None:
        return [post for post in BLOG_POSTS if post.get("published", True)]
    return await db.blog_posts.find({"published": True}, {"_id": 0}).to_list(100)


@api_router.get("/blog-posts/{slug}")
async def public_blog_post(slug: str):
    if db is None:
        post = next((post for post in BLOG_POSTS if post.get("slug") == slug and post.get("published", True)), None)
        if not post:
            raise HTTPException(status_code=404, detail="Blog post not found")
        return post
    post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post


@api_router.get("/blog-categories")
async def public_blog_categories():
    if db is None:
        return BLOG_CATEGORIES
    return await db.blog_categories.find({}, {"_id": 0}).to_list(100)


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
    return {"id": sub.id, "success": True, "message": "Subscribed! Thanks for joining PranvithDOP."}


# ---------- Admin models and auth ----------
class AdminBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: str
    permissions: List[str] = []


class AdminInDB(AdminBase):
    hashed_password: str


class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminLoginResponse(Token):
    admin: AdminBase


class TokenData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: Optional[str] = None
    sub: Optional[str] = None
    role: Optional[str] = "admin"


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.environ.get("JWT_EXPIRATION_MINUTES", "180"))
DEFAULT_ADMIN_EMAIL = os.environ.get("DEFAULT_ADMIN_EMAIL")
DEFAULT_ADMIN_PASSWORD = os.environ.get("DEFAULT_ADMIN_PASSWORD")
DEFAULT_ADMIN_NAME = os.environ.get("DEFAULT_ADMIN_NAME", "Super Admin")
APP_ENV = os.environ.get("APP_ENV") or os.environ.get("ENVIRONMENT") or os.environ.get("ENV") or "production"
IS_DEVELOPMENT = APP_ENV.lower() in {"dev", "development", "local"} or os.environ.get("DEBUG", "").lower() == "true"
admin_router = APIRouter(prefix="/admin", tags=["admin"])


def development_detail(public_message: str, detail: Optional[Any] = None) -> str:
    if IS_DEVELOPMENT and detail:
        return f"{public_message}: {detail}"
    return public_message


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        logger.exception("Admin password verification failed due to invalid hash")
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


async def get_admin_by_email(email: str):
    if db is None:
        return None
    return await db.admins.find_one({"email": email})


async def get_admin_by_id(admin_id: str):
    if db is None:
        return None
    return await db.admins.find_one({"id": admin_id})


async def authenticate_admin(email: str, password: str):
    normalized_email = email.lower().strip()
    admin = await get_admin_by_email(normalized_email)
    if not admin:
        logger.warning("Admin login failed: admin not found for email %s", normalized_email)
        return None
    if not verify_password(password, admin.get("hashed_password", "")):
        logger.warning("Admin login failed: invalid password for email %s", normalized_email)
        return None
    return admin


def admin_doc_to_public(doc: dict) -> AdminBase:
    return AdminBase(
        id=doc["id"],
        name=doc.get("name", "Admin"),
        email=doc.get("email"),
        role=doc.get("role", "admin"),
        permissions=doc.get("permissions", []),
    )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRATION_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(token: str = Depends(oauth2_scheme)) -> AdminBase:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        token_data = TokenData(**payload)
    except JWTError:
        raise credentials_exception
    admin_id = token_data.id or token_data.sub
    if not admin_id:
        logger.warning("Admin token rejected: missing admin id/sub claim")
        raise credentials_exception
    admin = await get_admin_by_id(admin_id)
    if admin is None:
        logger.warning("Admin token rejected: admin id %s not found", admin_id)
        raise credentials_exception
    return admin_doc_to_public(admin)


async def get_current_active_admin(current_admin: AdminBase = Depends(get_current_admin)) -> AdminBase:
    return current_admin


@admin_router.post("/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginIn):
    if db is None:
        logger.warning("Admin login failed: database is not configured")
        raise HTTPException(
            status_code=503,
            detail="Database is not configured. Check MONGO_URL and DB_NAME.",
        )
    try:
        await db.command("ping")
    except Exception as exc:
        category = mongodb_error_category(exc)
        logger.exception("Admin login failed: database connection category=%s", category)
        raise HTTPException(status_code=503, detail=mongodb_public_error(exc))

    try:
        await ensure_default_admin_seeded()
    except HTTPException as exc:
        logger.exception("Admin login failed while seeding default admin")
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.detail,
        )
    except Exception as exc:
        logger.exception("Admin login failed while seeding default admin")
        raise HTTPException(
            status_code=503,
            detail=mongodb_public_error(exc),
        )

    try:
        admin = await authenticate_admin(payload.email, payload.password)
    except Exception as exc:
        logger.exception("Admin login failed during authentication")
        raise HTTPException(
            status_code=503,
            detail=mongodb_public_error(exc),
        )
    if not admin:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    logger.info("Admin login successful for email %s", payload.email.lower().strip())
    access_token = create_access_token({"id": admin["id"], "sub": admin["id"], "role": admin.get("role", "admin")})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": admin_doc_to_public(admin).model_dump(),
    }


@admin_router.post("/seed-default")
async def admin_seed_default(seed_key: Optional[str] = Header(default=None, alias="X-Admin-Seed-Key")):
    """Explicitly seed the default admin using a secret key.

    This is intended for production recovery if a serverless startup hook has not
    run yet. The key must match JWT_SECRET and is never returned.
    """
    if db is None:
        logger.warning("Admin seed endpoint failed: database is not configured")
        raise HTTPException(status_code=503, detail="Database is not configured")
    if JWT_SECRET == "change-this-secret":
        logger.warning("Admin seed endpoint rejected: JWT_SECRET is not configured")
        raise HTTPException(status_code=503, detail="JWT_SECRET is not configured")
    if not seed_key or not hmac.compare_digest(seed_key, JWT_SECRET):
        logger.warning("Admin seed endpoint rejected: invalid seed key")
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await ensure_default_admin_seeded()
    logger.info("Admin seed endpoint completed: %s", result)
    return {"success": True, **result}


@admin_router.post("/reset-default-password")
async def admin_reset_default_password(seed_key: Optional[str] = Header(default=None, alias="X-Admin-Seed-Key")):
    """Reset the configured default admin from encrypted environment values."""
    if db is None:
        logger.warning("Admin password reset endpoint failed: database is not configured")
        raise HTTPException(status_code=503, detail="Database is not configured")
    if JWT_SECRET == "change-this-secret":
        logger.warning("Admin password reset endpoint rejected: JWT_SECRET is not configured")
        raise HTTPException(status_code=503, detail="JWT_SECRET is not configured")
    if not seed_key or not hmac.compare_digest(seed_key, JWT_SECRET):
        logger.warning("Admin password reset endpoint rejected: invalid seed key")
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await reset_default_admin_password()
    logger.info("Admin password reset endpoint completed for %s", result["email"])
    return {"success": True, **result}


@admin_router.post("/logout")
async def admin_logout(current_admin: AdminBase = Depends(get_current_active_admin)):
    return {"success": True, "message": "Logged out successfully"}


@admin_router.get("/me", response_model=AdminBase)
async def admin_me(current_admin: AdminBase = Depends(get_current_active_admin)):
    return current_admin


@admin_router.get("/dashboard")
async def admin_dashboard(current_admin: AdminBase = Depends(get_current_active_admin)):
    pages_count = await db.pages.count_documents({})
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    customers_count = await db.customers.count_documents({})
    revenue_result = await db.orders.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(length=1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    return {
        "totalRevenue": round((total_revenue or 0) / 100, 2),
        "totalOrders": orders_count,
        "totalProducts": products_count,
        "totalCustomers": customers_count,
        "pages": pages_count,
        "role": current_admin.role,
    }


@admin_router.get("/pages")
async def admin_pages(current_admin: AdminBase = Depends(get_current_active_admin)):
    return await db.pages.find({}, {"_id": 0}).to_list(100)


@admin_router.get("/pages/{page_id}")
async def admin_get_page(page_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@admin_router.get("/products")
async def admin_products(current_admin: AdminBase = Depends(get_current_active_admin)):
    return await db.products.find({}, {"_id": 0}).to_list(100)


@admin_router.get("/products/{product_id}")
async def admin_get_product(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@admin_router.get("/orders")
async def admin_orders(current_admin: AdminBase = Depends(get_current_active_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@admin_router.get("/customers")
async def admin_customers(current_admin: AdminBase = Depends(get_current_active_admin)):
    return await db.customers.find({}, {"_id": 0}).to_list(100)


@admin_router.get("/media")
async def admin_media(current_admin: AdminBase = Depends(get_current_active_admin)):
    return await db.media.find({}, {"_id": 0}).to_list(100)


@admin_router.get("/settings")
async def admin_settings(current_admin: AdminBase = Depends(get_current_active_admin)):
    settings_doc = await db.settings.find_one({}, {"_id": 0})
    if not settings_doc:
        return {
            "site_name": "PranvithDOP",
            "theme": "default",
            "notifications_enabled": True,
            "site_description": "A modern CMS foundation for pages, products, orders, customers, media and settings.",
        }
    return settings_doc


@admin_router.post("/settings")
async def admin_save_settings(payload: SettingsPayload, current_admin: AdminBase = Depends(get_current_active_admin)):
    await db.settings.update_one({}, {"$set": payload.model_dump(exclude_none=True)}, upsert=True)
    return {"success": True, "settings": payload.model_dump(exclude_none=True)}


@admin_router.post("/pages")
async def admin_create_page(payload: PageIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
    })
    await db.pages.insert_one(doc)
    return {"success": True, "page": doc}


@admin_router.put("/pages/{page_id}")
async def admin_update_page(page_id: str, payload: PageIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    update_doc = payload.model_dump(exclude_none=True)
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.pages.update_one({"id": page_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"success": True}


@admin_router.delete("/pages/{page_id}")
async def admin_delete_page(page_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.pages.delete_one({"id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"success": True}


@admin_router.post("/products")
async def admin_create_product(payload: ProductIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "sold_count": 0,
    })
    await db.products.insert_one(doc)
    return {"success": True, "product": doc}


@admin_router.put("/products/{product_id}")
async def admin_update_product(product_id: str, payload: ProductIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    update_doc = payload.model_dump(exclude_none=True)
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@admin_router.delete("/products/{product_id}")
async def admin_delete_product(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@admin_router.post("/testimonials")
async def admin_create_testimonial(payload: TestimonialIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()})
    await db.testimonials.insert_one(doc)
    return {"success": True, "testimonial": doc}


@admin_router.put("/testimonials/{testimonial_id}")
async def admin_update_testimonial(testimonial_id: str, payload: TestimonialIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.testimonials.update_one({"id": testimonial_id}, {"$set": payload.model_dump(exclude_none=True)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True}


@admin_router.delete("/testimonials/{testimonial_id}")
async def admin_delete_testimonial(testimonial_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.testimonials.delete_one({"id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True}


@admin_router.post("/blog-posts")
async def admin_create_blog_post(payload: BlogPostIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": None})
    await db.blog_posts.insert_one(doc)
    return {"success": True, "blog_post": doc}


@admin_router.put("/blog-posts/{post_id}")
async def admin_update_blog_post(post_id: str, payload: BlogPostIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    update_doc = payload.model_dump(exclude_none=True)
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.blog_posts.update_one({"id": post_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"success": True}


@admin_router.delete("/blog-posts/{post_id}")
async def admin_delete_blog_post(post_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"success": True}


@admin_router.post("/coupons")
async def admin_create_coupon(payload: CouponIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "used_count": 0})
    await db.coupons.insert_one(doc)
    return {"success": True, "coupon": doc}


@admin_router.get("/coupons")
async def admin_coupons(current_admin: AdminBase = Depends(get_current_active_admin)):
    return await db.coupons.find({}, {"_id": 0}).to_list(100)


# Vercel serverless functions can only write to /tmp at runtime.
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/tmp/uploads" if os.environ.get("VERCEL") else str(ROOT_DIR / "uploads")))
UPLOAD_DIR.mkdir(exist_ok=True)


@admin_router.post("/upload")
async def admin_upload_file(file: UploadFile = File(...), current_admin: AdminBase = Depends(get_current_active_admin)):
    """Upload a file and create a media record."""
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_ext = os.path.splitext(file.filename)[1]
        saved_filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / saved_filename
        
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Create media record
        media_record = {
            "id": file_id,
            "title": file.filename,
            "type": file.content_type or "application/octet-stream",
            "url": f"/api/uploads/{saved_filename}",
            "thumbnail": None,
            "description": "",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "tags": [],
        }
        
        await db.media.insert_one(media_record)
        
        return {
            "success": True,
            "media": media_record,
            "message": "File uploaded successfully",
        }
    except Exception as e:
        logger.exception("File upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@admin_router.post("/media")
async def admin_create_media(payload: MediaIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "uploaded_at": datetime.now(timezone.utc).isoformat()})
    await db.media.insert_one(doc)
    return {"success": True, "media": doc}


@admin_router.put("/media/{media_id}")
async def admin_update_media(media_id: str, payload: MediaIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.media.update_one({"id": media_id}, {"$set": payload.model_dump(exclude_none=True)})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Media item not found")
    return {"success": True}


@admin_router.delete("/media/{media_id}")
async def admin_delete_media(media_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media item not found")
    return {"success": True}


async def prepare_cms_collections():
    existing_collections = await db.list_collection_names()
    for collection_name in [
        "admins",
        "users",
        "pages",
        "products",
        "orders",
        "customers",
        "media",
        "settings",
        "downloads",
        "coupons",
        "testimonials",
        "blog_posts",
        "blog_categories",
        "webhook_events",
    ]:
        if collection_name not in existing_collections:
            try:
                await db.create_collection(collection_name)
            except Exception:
                pass
    try:
        await db.admins.create_index("email", unique=True)
    except Exception:
        pass
    try:
        await db.users.create_index("email", unique=True)
    except Exception:
        pass
    try:
        await db.coupons.create_index("code", unique=True)
    except Exception:
        pass
    try:
        await db.blog_posts.create_index("slug", unique=True)
    except Exception:
        pass
    try:
        await db.products.create_index("slug", unique=True)
    except Exception:
        pass


async def ensure_default_admin_seeded():
    if db is None:
        logger.warning("Default admin seed skipped: database is not configured")
        return {"action": "skipped", "reason": "database_not_configured"}
    default_email = (DEFAULT_ADMIN_EMAIL or "").lower().strip()
    default_password = DEFAULT_ADMIN_PASSWORD or ""
    default_name = DEFAULT_ADMIN_NAME
    logger.info("Admin email being seeded: %s", default_email or "<not configured>")

    if not default_email or not default_password:
        logger.error("Default admin seed failed: DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD is empty")
        raise HTTPException(status_code=500, detail="Default admin environment variables are invalid")

    try:
        existing = await db.admins.find_one({"email": default_email})
        if existing:
            logger.info("Default admin user already exists: %s", default_email)
            return {"action": "exists", "email": default_email}

        admin_doc = {
            "id": str(uuid.uuid4()),
            "name": default_name,
            "email": default_email,
            "role": "super_admin",
            "permissions": ["super_admin", "admin", "editor"],
            "hashed_password": get_password_hash(default_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        admin_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.admins.insert_one(admin_doc)
        logger.info("Default admin user created: %s", default_email)
        return {"action": "created", "email": default_email}
    except Exception:
        logger.exception("Failed to seed default admin")
        raise


async def reset_default_admin_password():
    if db is None:
        logger.warning("Default admin password reset skipped: database is not configured")
        raise HTTPException(status_code=503, detail="Database is not configured")

    default_email = (DEFAULT_ADMIN_EMAIL or "").lower().strip()
    default_password = DEFAULT_ADMIN_PASSWORD or ""
    if not default_email or not default_password:
        logger.error("Default admin password reset failed: required environment variables are empty")
        raise HTTPException(status_code=500, detail="Default admin environment variables are invalid")

    try:
        existing = await db.admins.find_one({"email": default_email})
        if not existing:
            return await ensure_default_admin_seeded()

        await db.admins.update_one(
            {"email": default_email},
            {
                "$set": {
                    "hashed_password": get_password_hash(default_password),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        logger.info("Default admin password reset completed for email %s", default_email)
        return {"action": "password_reset", "email": default_email}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to reset default admin password")
        raise


async def seed_default_admin():
    return await ensure_default_admin_seeded()


@app.on_event("startup")
async def on_startup():
    logger.info("MongoDB configuration: %s", mongodb_config_summary())
    logger.info("Admin email being seeded: %s", (DEFAULT_ADMIN_EMAIL or "").lower().strip() or "<not configured>")
    logger.info("Razorpay configured: %s", razorpay_client is not None)
    logger.info("SMTP configured: %s", smtp_configured())
    if db is None:
        logger.warning("MongoDB connection status: not_configured")
        logger.warning("MONGO_URL and DB_NAME are not configured; using public seed-data fallbacks.")
        logger.warning("Admin seed status: skipped database_not_configured")
        return
    try:
        await db.command("ping")
        logger.info("MongoDB connection status: connected db=%s", db_name)
    except Exception as exc:
        logger.exception("MongoDB connection status: failed category=%s", mongodb_error_category(exc))
        logger.warning("Admin seed status: skipped mongo_connection_failed")
        if IS_DEVELOPMENT:
            logger.warning("MongoDB development error detail: %s", exc)
        return
    await prepare_cms_collections()
    try:
        seed_result = await seed_default_admin()
        logger.info("Admin seed status: %s", seed_result)
    except Exception as exc:
        logger.exception("Admin seed status: failed")
        if IS_DEVELOPMENT:
            logger.warning("Admin seed development error detail: %s", exc)
    # Seed default content in the background to keep startup responsive.
    asyncio.create_task(_seed_db())


api_router.include_router(admin_router)


# ---------- Razorpay ----------
def _normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s().-]+", "", phone or "")
    if not re.fullmatch(r"\+?\d{7,15}", cleaned):
        raise HTTPException(status_code=422, detail="Enter a valid phone number")
    return cleaned


def _hash_download_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _paid_download_url(order_id: str, token: str) -> str:
    return f"/api/orders/{order_id}/download?token={token}"


def _public_download_url(download_url: str) -> str:
    public_base = (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("PUBLIC_BASE_URL")
        or ""
    ).rstrip("/")
    if public_base and download_url.startswith("/"):
        return f"{public_base}{download_url}"
    return download_url


async def _find_checkout_product(product_id: Optional[str], product_slug: Optional[str]) -> dict:
    product = None
    if db is not None:
        query = {"published": True}
        if product_id:
            product = await db.products.find_one({**query, "id": product_id}, {"_id": 0})
        if not product and product_slug:
            product = await db.products.find_one({**query, "slug": product_slug}, {"_id": 0})
    if not product:
        product = next(
            (
                p for p in ASSET_PRODUCTS
                if p.get("published", True)
                and ((product_id and p.get("id") == product_id) or (product_slug and p.get("slug") == product_slug))
            ),
            None,
        )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _product_price_paise(product: dict) -> int:
    price_rupees = product.get("sale_price")
    if price_rupees is None:
        price_rupees = product.get("price", 0)
    amount = int(round(float(price_rupees or 0) * 100))
    if product.get("is_free") or amount <= 0:
        raise HTTPException(status_code=400, detail="This product does not require payment")
    if amount < 100:
        raise HTTPException(status_code=400, detail="Amount must be at least 100 paise")
    return amount


async def _upsert_checkout_customer(order: dict, product: dict, paid: bool = False) -> None:
    if db is None:
        return
    now = datetime.now(timezone.utc).isoformat()
    email = (order.get("customer_email") or order.get("buyer_email") or "").lower().strip()
    if not email:
        return

    customer_doc = {
        "name": order.get("customer_name") or order.get("buyer_name") or "",
        "email": email,
        "phone": order.get("customer_phone") or order.get("buyer_phone") or "",
        "updated_at": now,
    }
    set_on_insert = {
        "id": str(uuid.uuid4()),
        "created_at": now,
        "purchased_products": [],
        "total_spend": 0,
        "purchase_history": [],
    }
    update: Dict[str, Any] = {
        "$set": customer_doc,
        "$setOnInsert": set_on_insert,
    }
    if paid:
        purchase = {
            "order_id": order.get("id"),
            "razorpay_order_id": order.get("razorpay_order_id"),
            "razorpay_payment_id": order.get("razorpay_payment_id"),
            "product_id": product.get("id"),
            "product_slug": product.get("slug"),
            "product_name": product.get("name"),
            "amount": order.get("amount", 0),
            "currency": order.get("currency", "INR"),
            "paid_at": order.get("paid_at") or now,
        }
        update["$addToSet"] = {"purchased_products": product.get("slug")}
        update["$inc"] = {"total_spend": int(order.get("amount") or 0)}
        update["$push"] = {"purchase_history": purchase}
    await db.customers.update_one({"email": email}, update, upsert=True)


def _send_confirmation_email(to_email: str, buyer_name: str, product_name: str, payment_id: str, download_url: str) -> bool:
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", "587") or "587")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_from = os.environ.get("SMTP_FROM") or smtp_user
    if not all([smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from]):
        logger.warning("SMTP is not fully configured; confirmation email skipped")
        return False

    msg = EmailMessage()
    msg["Subject"] = f"Your {product_name} download is ready"
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.set_content(
        "\n".join([
            f"Hi {buyer_name},",
            "",
            "Thank you for your purchase.",
            f"Product: {product_name}",
            f"Payment ID: {payment_id}",
            f"Download: {download_url}",
            "",
            "This download link is protected and should not be shared.",
        ])
    )

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=20) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.starttls(context=context)
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        return True
    except Exception:
        logger.exception("confirmation email failed")
        return False


@api_router.post("/checkout/create-order")
async def checkout_create_order(payload: PaymentCreateOrderIn):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if razorpay_client is None:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    phone = _normalize_phone(payload.phone)
    product = await _find_checkout_product(payload.product_id, payload.product_slug)
    amount = _product_price_paise(product)
    receipt = f"asset_{uuid.uuid4().hex[:24]}"

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "product_id": product.get("id", ""),
                "product_slug": product.get("slug", ""),
                "product_name": product.get("name", ""),
                "buyer_email": str(payload.email).lower().strip(),
            },
        })
    except razorpay.errors.BadRequestError as e:
        logger.exception("Razorpay bad request")
        raise HTTPException(status_code=400, detail=str(e))
    except razorpay.errors.ServerError:
        logger.exception("Razorpay server error")
        raise HTTPException(status_code=502, detail="Payment gateway error")
    except Exception:
        logger.exception("Razorpay order failure")
        raise HTTPException(status_code=500, detail="Could not create order")

    order_doc = {
        "id": str(uuid.uuid4()),
        "razorpay_order_id": razorpay_order.get("id"),
        "amount": razorpay_order.get("amount"),
        "currency": razorpay_order.get("currency", "INR"),
        "receipt": receipt,
        "product_id": product.get("id"),
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "product_title": product.get("name"),
        "status": "pending",
        "payment_status": "pending",
        "customer_name": payload.name.strip(),
        "customer_email": str(payload.email).lower().strip(),
        "customer_phone": phone,
        "buyer_name": payload.name.strip(),
        "buyer_email": str(payload.email).lower().strip(),
        "buyer_phone": phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "razorpay_checkout",
    }
    await db.orders.insert_one(order_doc)
    await _upsert_checkout_customer(order_doc, product)

    return {
        "order_id": razorpay_order.get("id"),
        "amount": razorpay_order.get("amount"),
        "currency": razorpay_order.get("currency", "INR"),
        "key_id": RAZORPAY_KEY_ID,
        "product_name": product.get("name"),
    }


@api_router.post("/checkout/verify-payment")
async def checkout_verify_payment(payload: PaymentVerifyIn):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    order = await db.orders.find_one({"razorpay_order_id": payload.razorpay_order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    expected_sig = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), message, hashlib.sha256).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    if not hmac.compare_digest(expected_sig, payload.razorpay_signature):
        await db.orders.update_one(
            {"razorpay_order_id": payload.razorpay_order_id},
            {"$set": {
                "status": "signature_mismatch",
                "payment_status": "failed",
                "razorpay_payment_id": payload.razorpay_payment_id,
                "verified_at": now,
            }},
        )
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
    if order.get("status") == "paid" or order.get("payment_status") == "paid":
        return {
            "success": True,
            "order_id": payload.razorpay_order_id,
            "payment_id": order.get("razorpay_payment_id") or payload.razorpay_payment_id,
            "product_slug": product.get("slug"),
            "product_name": product.get("name"),
            "download_url": order.get("download_url"),
            "email_sent": False,
        }

    download_file = product.get("download_file")
    if not download_file:
        raise HTTPException(status_code=404, detail="Download file not configured")

    download_token = secrets.token_urlsafe(32)
    download_url = _paid_download_url(order["razorpay_order_id"], download_token)
    paid_fields = {
        "status": "paid",
        "payment_status": "paid",
        "razorpay_payment_id": payload.razorpay_payment_id,
        "razorpay_signature": payload.razorpay_signature,
        "verified_at": now,
        "paid_at": now,
        "download_token_hash": _hash_download_token(download_token),
        "download_file": download_file,
        "download_url": download_url,
    }
    await db.orders.update_one(
        {"razorpay_order_id": payload.razorpay_order_id},
        {"$set": paid_fields},
    )
    await db.products.update_one({"id": product.get("id")}, {"$inc": {"sold_count": 1}})
    await _upsert_checkout_customer({**order, **paid_fields}, product, paid=True)

    full_download_url = _public_download_url(download_url)
    email_sent = _send_confirmation_email(
        order.get("customer_email") or order.get("buyer_email", ""),
        order.get("customer_name") or order.get("buyer_name", "there"),
        order.get("product_name") or product.get("name", "your asset"),
        payload.razorpay_payment_id,
        full_download_url,
    )

    return {
        "success": True,
        "order_id": payload.razorpay_order_id,
        "payment_id": payload.razorpay_payment_id,
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "download_url": download_url,
        "download_token": download_token,
        "email_sent": email_sent,
    }


def _validate_download_access(order: Optional[dict], token: str) -> dict:
    if not order or order.get("payment_status") != "paid":
        raise HTTPException(status_code=403, detail="Download is available only after successful payment")
    expected_hash = order.get("download_token_hash")
    if not expected_hash or not hmac.compare_digest(expected_hash, _hash_download_token(token)):
        raise HTTPException(status_code=403, detail="Invalid or expired download link")
    return order


@api_router.get("/orders/{order_id}/access")
async def order_access(order_id: str, token: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    order = await db.orders.find_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]}, {"_id": 0}
    )
    order = _validate_download_access(order, token)
    return {
        "verified": True,
        "order_id": order.get("razorpay_order_id") or order.get("id"),
        "payment_id": order.get("razorpay_payment_id"),
        "product_id": order.get("product_id"),
        "product_slug": order.get("product_slug"),
        "product_name": order.get("product_name"),
        "product_title": order.get("product_title") or order.get("product_name"),
        "amount": order.get("amount"),
        "currency": order.get("currency", "INR"),
        "payment_status": order.get("payment_status"),
        "download_url": _paid_download_url(order_id, token),
        "created_at": order.get("created_at"),
    }


@api_router.get("/orders/{order_id}/download")
async def order_download(order_id: str, token: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    order = await db.orders.find_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]}, {"_id": 0}
    )
    order = _validate_download_access(order, token)

    download_file = order.get("download_file")
    if not download_file:
        product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
        download_file = product.get("download_file")
    if not download_file:
        raise HTTPException(status_code=404, detail="Download file not configured")

    await db.orders.update_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]},
        {"$inc": {"download_count": 1}, "$set": {"last_downloaded_at": datetime.now(timezone.utc).isoformat()}},
    )
    return RedirectResponse(download_file, status_code=302)


@api_router.post("/payments/free-order")
async def payment_free_order(payload: PaymentFreeOrderIn):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    product = await _find_checkout_product(payload.product_id, payload.product_slug)
    if not product.get("is_free") and int(round(float(product.get("sale_price") or product.get("price") or 0) * 100)) > 0:
        raise HTTPException(status_code=400, detail="This product is not free")

    download_file = product.get("download_file")
    if not download_file:
        raise HTTPException(status_code=404, detail="Download file not configured")

    download_token = secrets.token_urlsafe(32)
    order_id = str(uuid.uuid4())
    download_url = _paid_download_url(order_id, download_token)
    order_doc = {
        "id": order_id,
        "razorpay_order_id": None,
        "amount": 0,
        "currency": "INR",
        "receipt": f"free_{uuid.uuid4().hex[:24]}",
        "product_id": product.get("id"),
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "product_title": product.get("name"),
        "status": "paid",
        "payment_status": "paid",
        "customer_name": payload.name.strip() if payload.name else None,
        "customer_email": str(payload.email).lower().strip() if payload.email else None,
        "customer_phone": _normalize_phone(payload.phone) if payload.phone else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "source": "free_download",
        "download_token_hash": _hash_download_token(download_token),
        "download_file": download_file,
        "download_url": download_url,
    }
    await db.orders.insert_one(order_doc)

    return {
        "success": True,
        "order_id": order_id,
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "download_url": download_url,
        "download_token": download_token,
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

# Serve uploaded files statically
from fastapi.staticfiles import StaticFiles
if UPLOAD_DIR.exists():
    app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS",
            "https://pranvithdop.com,https://www.pranvithdop.com,http://localhost:3000",
        ).split(",")
        if origin.strip()
    ],
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

        # Seed CMS pages (upsert by slug so rebrand updates apply)
        for page in PAGES:
            await db.pages.update_one(
                {"slug": page["slug"]},
                {"$set": dict(page)},
                upsert=True,
            )
        logger.info("Upserted %d pages", len(PAGES))

        # Seed products/assets (upsert by slug so catalog updates apply)
        valid_slugs = [p["slug"] for p in ASSET_PRODUCTS]
        # Remove stale products no longer in the catalog
        await db.products.delete_many({"slug": {"$nin": valid_slugs}})
        for product in ASSET_PRODUCTS:
            await db.products.update_one(
                {"slug": product["slug"]},
                {"$set": dict(product)},
                upsert=True,
            )
        logger.info("Upserted %d products", len(ASSET_PRODUCTS))

        # Seed blog categories
        if await db.blog_categories.count_documents({}) == 0:
            await db.blog_categories.insert_many([dict(c) for c in BLOG_CATEGORIES])
            logger.info("Seeded %d blog categories", len(BLOG_CATEGORIES))

        # Seed blog posts
        if await db.blog_posts.count_documents({}) == 0:
            await db.blog_posts.insert_many([dict(p) for p in BLOG_POSTS])
            logger.info("Seeded %d blog posts", len(BLOG_POSTS))

        # Seed default settings (upsert so brand changes propagate)
        await db.settings.update_one({}, {"$set": dict(SETTINGS)}, upsert=True)
        logger.info("Upserted default settings")

        # One-shot brand migration: replace legacy 'PranavithDOP' with 'PranvithDOP'
        # in any user/CMS content that was seeded under the old brand name.
        try:
            for coll_name in ("faqs", "pages", "blog_posts", "settings", "products"):
                cursor = db[coll_name].find({}, {"_id": 1})
                async for doc in cursor:
                    full = await db[coll_name].find_one({"_id": doc["_id"]})
                    if not full:
                        continue
                    payload = json.dumps(full, default=str)
                    if "PranavithDOP" in payload:
                        fixed = json.loads(payload.replace("PranavithDOP", "PranvithDOP"))
                        fixed.pop("_id", None)
                        await db[coll_name].update_one({"_id": doc["_id"]}, {"$set": fixed})
                        logger.info("Rebranded legacy doc in %s/%s", coll_name, doc["_id"])
        except Exception:
            logger.exception("brand migration failed")

        # Ensure indexes on subscribers and CMS slugs
        try:
            await db.subscribers.create_index("email", unique=True)
        except Exception as ie:
            logger.warning("subscribers index skipped: %s", ie)
        try:
            await db.pages.create_index("slug", unique=True)
        except Exception:
            pass
        try:
            await db.products.create_index("slug", unique=True)
        except Exception:
            pass
        try:
            await db.blog_posts.create_index("slug", unique=True)
        except Exception:
            pass
    except Exception as e:
        logger.exception("Seed failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()
