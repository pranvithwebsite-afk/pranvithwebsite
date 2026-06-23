from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse, RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, OperationFailure, ServerSelectionTimeoutError
from passlib.context import CryptContext
from jose import JWTError, jwt
from email.message import EmailMessage
import os
import json
import asyncio
import hmac
import hashlib
import html
import logging
import re
import secrets
import smtplib
import ssl
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import uuid
from datetime import datetime, timedelta, timezone
import razorpay
import shutil
import mimetypes
try:
    import boto3
except ImportError:  # pragma: no cover - optional unless R2 uploads are used
    boto3 = None

from seed_data import (
    COURSES,
    TESTIMONIALS,
    FAQS,
    PAGES,
    CMS_PAGES,
    CMS_SECTIONS,
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
RAZORPAY_AUTH_ERROR_MESSAGE = "Payment gateway authentication failed. Check Razorpay live keys in Vercel."
SUCCESSFUL_REVENUE_STATUSES = ("paid", "captured", "completed", "success")
razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception as _e:
        razorpay_client = None


def razorpay_key_mode(key_id: Optional[str] = None) -> str:
    key = key_id if key_id is not None else RAZORPAY_KEY_ID
    if key.startswith("rzp_live_"):
        return "live"
    if key.startswith("rzp_test_"):
        return "test"
    return "unknown"


def razorpay_config_summary() -> dict:
    return {
        "razorpay_key_id_present": bool(RAZORPAY_KEY_ID),
        "razorpay_key_secret_present": bool(RAZORPAY_KEY_SECRET),
        "razorpay_key_mode": razorpay_key_mode(),
    }


def successful_revenue_order_filter() -> dict:
    return {
        "$or": [
            {"payment_status": {"$in": list(SUCCESSFUL_REVENUE_STATUSES)}},
            {"status": {"$in": list(SUCCESSFUL_REVENUE_STATUSES)}},
        ]
    }


def _is_razorpay_auth_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(term in message for term in [
        "authentication",
        "authenticate",
        "unauthorized",
        "invalid api key",
        "key id",
        "key_secret",
        "key secret",
    ])


def _razorpay_error_summary(exc: Exception) -> dict:
    return {
        "error_type": type(exc).__name__,
        "status_code": getattr(exc, "status_code", None) or getattr(exc, "status", None),
    }


def _require_razorpay_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        logger.warning("Razorpay credentials unavailable or incomplete summary=%s", razorpay_config_summary())
        raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
    return razorpay_client


def smtp_configured() -> bool:
    return all([
        os.environ.get("SMTP_HOST"),
        os.environ.get("SMTP_PORT"),
        os.environ.get("SMTP_USER"),
        os.environ.get("SMTP_PASS"),
        os.environ.get("FROM_EMAIL") or os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER"),
    ])

app = FastAPI(title='PranvithDOP API')
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    if request.url.path.startswith("/api/admin"):
        response.headers["Cache-Control"] = "no-store"
    return response


@api_router.get("/health/mongodb")
async def mongodb_health():
    if db is None:
        return {"ok": False, "error": "not_configured"}
    try:
        await db.command("ping")
        return {"ok": True, "error": None}
    except Exception as exc:
        category = mongodb_error_category(exc)
        logger.warning("MongoDB health check failed: category=%s", category)
        return {"ok": False, "error": category}


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


CMS_PAGE_KEYS = {"home", "courses", "about", "assets", "works", "hire"}
CMS_PAGE_PATHS = {
    "home": "/",
    "courses": "/courses",
    "about": "/about",
    "assets": "/assets",
    "works": "/works",
    "hire": "/hire",
}
CMS_STATUSES = {"published", "draft", "hidden"}
CMS_SECTION_TYPES = {
    "hero",
    "text",
    "image_text",
    "video",
    "showreel",
    "services_cards",
    "portfolio_grid",
    "product_showcase",
    "course_showcase",
    "testimonial_videos",
    "video_reviews",
    "reviews",
    "testimonials",
    "faq",
    "cta",
    "contact_form",
    "gallery",
    "before_after",
}
CMS_MEDIA_TYPES = {"auto", "image", "video_file", "youtube", "vimeo"}


class CmsPageIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: Optional[str] = Field(default=None, max_length=200)
    subtitle: Optional[str] = Field(default=None, max_length=700)
    slug: Optional[str] = Field(default=None, max_length=80)
    path: Optional[str] = Field(default=None, max_length=120)
    status: Optional[str] = "draft"
    seo_title: Optional[str] = Field(default=None, max_length=220)
    seo_description: Optional[str] = Field(default=None, max_length=500)
    settings: Dict[str, Any] = {}

    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        cleaned = str(value or "draft").strip().lower()
        if cleaned not in CMS_STATUSES:
            raise ValueError("status must be published, draft, or hidden")
        return cleaned

    @field_validator("path")
    @classmethod
    def validate_path(cls, value):
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned.startswith("/") or cleaned.startswith("//") or ".." in Path(cleaned).parts:
            raise ValueError("path must be a safe relative path")
        return cleaned


class CmsSectionIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    section_id: Optional[str] = Field(default=None, max_length=80)
    type: str = "text"
    title: Optional[str] = Field(default="", max_length=220)
    subtitle: Optional[str] = Field(default="", max_length=700)
    description: Optional[str] = Field(default="", max_length=4000)
    button_text: Optional[str] = Field(default="", max_length=120)
    button_link: Optional[str] = None
    media_type: str = "auto"
    media_url: Optional[str] = None
    poster_url: Optional[str] = None
    data: Dict[str, Any] = {}
    enabled: bool = True
    sort_order: Optional[int] = None

    @field_validator("section_id")
    @classmethod
    def validate_section_id(cls, value):
        if value in {None, ""}:
            return value
        cleaned = normalize_slug(value)
        if not cleaned:
            raise ValueError("section id is invalid")
        return cleaned

    @field_validator("type")
    @classmethod
    def validate_type(cls, value):
        cleaned = normalize_slug(value).replace("-", "_")
        if cleaned not in CMS_SECTION_TYPES:
            raise ValueError("Unsupported CMS section type")
        return cleaned

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, value):
        cleaned = str(value or "auto").strip().lower()
        if cleaned not in CMS_MEDIA_TYPES:
            raise ValueError("Unsupported media type")
        return cleaned

    @field_validator("button_link", "media_url", "poster_url")
    @classmethod
    def validate_urls(cls, value):
        return _reject_unsafe_url(value)


class CmsReorderIn(BaseModel):
    section_ids: List[str]
    section_orders: Optional[List[Dict[str, Any]]] = None


class CmsVisibilityIn(BaseModel):
    enabled: bool


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
    product_images: List[str] = []
    videos: List[str] = []
    video_type: Optional[str] = None
    youtube_url: Optional[str] = None
    video_url: Optional[str] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    download_file: Optional[str] = None
    download_file_url: Optional[str] = None
    download_file_key: Optional[str] = None
    download_file_name: Optional[str] = None
    download_file_bucket: Optional[str] = None
    payment_link: Optional[str] = None
    razorpay_payment_link_id: Optional[str] = None
    razorpay_payment_link_url: Optional[str] = None
    razorpay_payment_link_status: Optional[str] = None
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
    product_images: List[str] = []
    videos: List[str] = []
    video_type: Optional[str] = None
    youtube_url: Optional[str] = None
    video_url: Optional[str] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    download_file: Optional[str] = None
    download_file_url: Optional[str] = None
    download_file_key: Optional[str] = None
    download_file_name: Optional[str] = None
    download_file_bucket: Optional[str] = None
    payment_link: Optional[str] = None
    create_razorpay_payment_link: Optional[bool] = False
    razorpay_payment_link_id: Optional[str] = None
    razorpay_payment_link_url: Optional[str] = None
    razorpay_payment_link_status: Optional[str] = None
    thank_you_content: Optional[Dict[str, Any]] = None
    landing_content: Optional[Dict[str, Any]] = None
    hero_image: Optional[str] = None
    is_free: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    published: bool = True
    product_url: Optional[str] = None

    @field_validator(
        "download_file",
        "download_file_url",
        "payment_link",
        "razorpay_payment_link_url",
        "hero_image",
        "product_url",
        "youtube_url",
        "video_url",
        "before_image_url",
        "after_image_url",
    )
    @classmethod
    def validate_media_url(cls, value):
        return _reject_unsafe_url(value)

    @field_validator("images", "product_images", "videos", "before_images", "after_images")
    @classmethod
    def validate_media_url_list(cls, value):
        return [_reject_unsafe_url(item) for item in (value or []) if item]

    @field_validator("video_type")
    @classmethod
    def validate_video_type(cls, value):
        if value in {None, "", "youtube", "direct"}:
            return value
        raise ValueError("video_type must be youtube, direct, or empty")


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
    model_config = ConfigDict(extra="forbid")
    site_name: Optional[str] = None
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    site_description: Optional[str] = None
    logo_url: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    ga4_id: Optional[str] = None
    gtm_id: Optional[str] = None
    instagram_profile: Optional[Dict[str, Any]] = None
    home_hero: Optional[Dict[str, Any]] = None
    home_visibility: Optional[Dict[str, Any]] = None
    course_page: Optional[Dict[str, Any]] = None
    course_visibility: Optional[Dict[str, Any]] = None
    page_settings: Optional[Dict[str, Any]] = None
    works_page: Optional[Dict[str, Any]] = None

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value):
        return _reject_unsafe_url(value)

    @field_validator("instagram_profile")
    @classmethod
    def validate_instagram_profile(cls, value):
        return _safe_instagram_profile(value)

    @field_validator("home_hero")
    @classmethod
    def validate_home_hero(cls, value):
        return _safe_home_hero(value)

    @field_validator("home_visibility")
    @classmethod
    def validate_home_visibility(cls, value):
        return _safe_home_visibility(value)

    @field_validator("course_page")
    @classmethod
    def validate_course_page(cls, value):
        return _safe_course_page(value)

    @field_validator("course_visibility")
    @classmethod
    def validate_course_visibility(cls, value):
        return _safe_course_visibility(value)

    @field_validator("page_settings")
    @classmethod
    def validate_page_settings(cls, value):
        return _safe_page_settings(value)

    @field_validator("works_page")
    @classmethod
    def validate_works_page(cls, value):
        return _safe_works_page(value)


class HireRequestIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)
    project_type: Optional[str] = Field(default=None, max_length=120)
    budget: Optional[str] = Field(default=None, max_length=120)
    project_date: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = Field(default=None, max_length=180)
    message: Optional[str] = Field(default=None, max_length=3000)
    requirement: Optional[str] = Field(default=None, max_length=3000)


class HireRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    project_type: Optional[str] = None
    budget: Optional[str] = None
    project_date: Optional[str] = None
    location: Optional[str] = None
    message: str
    requirement: str
    status: str = "new"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None


class EnquiryStatusIn(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        status = (value or "").strip().lower()
        if status not in {"new", "contacted", "completed"}:
            raise ValueError("Status must be new, contacted, or completed")
        return status


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
    buyer_email: Optional[EmailStr] = None
    asset_slug: Optional[str] = None


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
        return _safe_settings(SETTINGS)
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
            "instagram_profile": DEFAULT_INSTAGRAM_PROFILE,
            "home_hero": DEFAULT_HOME_HERO,
            "home_visibility": DEFAULT_HOME_VISIBILITY,
            "course_page": DEFAULT_COURSE_PAGE,
            "course_visibility": DEFAULT_COURSE_VISIBILITY,
            "page_settings": DEFAULT_PAGE_SETTINGS,
            "works_page": DEFAULT_WORKS_PAGE,
        }
    return _safe_settings(settings_doc)


PUBLIC_SETTINGS_FIELDS = {
    "site_name",
    "theme",
    "notifications_enabled",
    "site_description",
    "logo_url",
    "contact_email",
    "contact_phone",
    "contact_address",
    "meta_pixel_id",
    "ga4_id",
    "gtm_id",
    "instagram_profile",
    "home_hero",
    "home_visibility",
    "course_page",
    "course_visibility",
    "page_settings",
    "works_page",
}


def _safe_settings(settings: Optional[dict]) -> dict:
    safe = {
        key: value
        for key, value in (settings or {}).items()
        if key in PUBLIC_SETTINGS_FIELDS
    }
    if "instagram_profile" in safe:
        safe["instagram_profile"] = _safe_instagram_profile(safe.get("instagram_profile"))
    if "home_hero" in safe:
        safe["home_hero"] = _safe_home_hero(safe.get("home_hero"))
    if "home_visibility" in safe:
        safe["home_visibility"] = _safe_home_visibility(safe.get("home_visibility"))
    if "course_page" in safe:
        safe["course_page"] = _safe_course_page(safe.get("course_page"))
    if "course_visibility" in safe:
        safe["course_visibility"] = _safe_course_visibility(safe.get("course_visibility"))
    if "page_settings" in safe:
        safe["page_settings"] = _safe_page_settings(safe.get("page_settings"))
    if "works_page" in safe:
        safe["works_page"] = _safe_works_page(safe.get("works_page"))
    return safe


DEFAULT_HOME_HERO = {
    "badge_text": "Learn premium editing, LUTs, transitions, and storytelling workflows that get results.",
    "hero_title": "Video Editing Mastery for Creators",
    "hero_subtitle": "Master the art of video editing with our comprehensive courses. From beginner basics to advanced techniques, learn professional editing skills that transform your creative vision into stunning reality.",
    "primary_button_text": "Explore Assets",
    "primary_button_link": "/assets",
    "secondary_button_text": "Join Community",
    "secondary_button_link": "/courses",
    "hero_media_type": "auto",
    "hero_media_url": "",
    "hero_media_poster_url": "",
    "hero_media_autoplay": True,
    "hero_media_muted": True,
    "hero_media_loop": True,
}


HOME_SECTION_KEYS = [
    "hero",
    "featuredAssets",
    "instagramProfile",
    "services",
    "showreel",
    "coursesPreview",
    "studentTestimonials",
    "cta",
    "footerCta",
]

HOME_SECTION_ALIASES = {
    "showHero": "hero",
    "showFeaturedAssets": "featuredAssets",
    "showInstagramProfile": "instagramProfile",
    "showServices": "services",
    "showShowreel": "showreel",
    "showCoursesPreview": "coursesPreview",
    "showStudentTestimonials": "studentTestimonials",
    "showCta": "cta",
    "showFooterCta": "footerCta",
    "transformVision": "instagramProfile",
    "profile": "instagramProfile",
    "worksPreview": "showreel",
    "testimonials": "studentTestimonials",
}


DEFAULT_HOME_VISIBILITY = {
    "hero": True,
    "featuredAssets": True,
    "instagramProfile": True,
    "services": True,
    "showreel": True,
    "coursesPreview": False,
    "studentTestimonials": False,
    "cta": True,
    "footerCta": True,
    "section_order": HOME_SECTION_KEYS,
}


def _safe_home_visibility(visibility: Optional[dict]) -> dict:
    raw = visibility or {}
    source = {**DEFAULT_HOME_VISIBILITY}
    for key in HOME_SECTION_KEYS:
        if key in raw:
            source[key] = raw.get(key)
    for old_key, new_key in HOME_SECTION_ALIASES.items():
        if old_key in raw and new_key not in raw:
            source[new_key] = raw.get(old_key)
    incoming_order = source.get("section_order") or HOME_SECTION_KEYS
    safe_order = []
    for key in incoming_order:
        canonical_key = HOME_SECTION_ALIASES.get(key, key)
        if canonical_key in HOME_SECTION_KEYS and canonical_key not in safe_order:
            safe_order.append(canonical_key)
    for key in HOME_SECTION_KEYS:
        if key not in safe_order:
            safe_order.append(key)
    safe = {
        key: bool(source.get(key, default_value))
        for key, default_value in DEFAULT_HOME_VISIBILITY.items()
        if key in HOME_SECTION_KEYS
    }
    safe["section_order"] = safe_order
    return safe


DEFAULT_INSTAGRAM_PROFILE = {
    "username": "pranvith_dop",
    "display_name": "Pranvith Dop",
    "profile_image_url": "/assets/brand-profile.png",
    "followers_count": "5,131",
    "following_count": "10",
    "posts_count": "",
    "bio_line_1": "🎥 DOP | Filmmaker | Video Editor",
    "bio_line_2": "🚁 Drone Pilot | DI",
    "bio_line_3": "📸 Product & Commercial Photography",
    "bio_line_4": "🎨 Graphic Design",
    "link_text": "youtube.com/@pranvithdop",
    "link_url": "https://www.youtube.com/@pranvithdop",
    "follow_button_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    "cards": [
        {"title": "Cinematic editing reel", "type": "Reel", "thumbnail_image_url": "", "link_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "enabled": True, "sort_order": 0},
        {"title": "Behind the scenes", "type": "Post", "thumbnail_image_url": "", "link_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "enabled": True, "sort_order": 1},
        {"title": "Drone shot preview", "type": "Video", "thumbnail_image_url": "", "link_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "enabled": True, "sort_order": 2},
        {"title": "Commercial frame", "type": "Reel", "thumbnail_image_url": "", "link_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "enabled": True, "sort_order": 3},
        {"title": "DI color grade", "type": "Post", "thumbnail_image_url": "", "link_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "enabled": True, "sort_order": 4},
        {"title": "Graphic design post", "type": "Video", "thumbnail_image_url": "", "link_url": "https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", "enabled": True, "sort_order": 5},
    ],
}


DEFAULT_COURSE_PAGE = {
    "show_right_for_you": True,
    "hero": {
        "heading": "Master Cinematic Video Editing",
        "subtitle": "Learn practical editing workflows, storytelling, color, sound, and delivery systems for real creator and client projects.",
        "button_text": "Explore Courses",
        "button_link": "/courses",
        "media_url": "",
    },
    "learn_items": [
        {"title": "Premiere Pro Workflow", "description": "Build clean timelines, organize footage, cut faster, and export professionally.", "icon": "Pr", "enabled": True, "sort_order": 0},
        {"title": "After Effects Motion", "description": "Create titles, motion graphics, transitions, and polished visual effects.", "icon": "Ae", "enabled": True, "sort_order": 1},
        {"title": "AI Editing Tools", "description": "Use modern AI tools to speed up captions, cleanup, reframing, and creative workflows.", "icon": "AI", "enabled": True, "sort_order": 2},
    ],
    "testimonial_videos": [
        {"student_name": "Student 1", "course_name": "", "thumbnail_image_url": "", "video_type": "video_url", "video_url": "", "review_text": "", "rating": 5, "enabled": True, "sort_order": 0},
        {"student_name": "Student 2", "course_name": "", "thumbnail_image_url": "", "video_type": "video_url", "video_url": "", "review_text": "", "rating": 5, "enabled": True, "sort_order": 1},
        {"student_name": "Student 3", "course_name": "", "thumbnail_image_url": "", "video_type": "video_url", "video_url": "", "review_text": "", "rating": 5, "enabled": True, "sort_order": 2},
    ],
    "text_reviews": [
        {"student_name": "Student", "student_image_url": "", "course_name": "Premiere Pro", "rating": 5, "review_text": "This course helped me understand editing workflow clearly and improved my confidence.", "enabled": True, "sort_order": 0},
        {"student_name": "Creator", "student_image_url": "", "course_name": "Video Editing", "rating": 5, "review_text": "The lessons are simple, practical, and useful for real editing projects.", "enabled": True, "sort_order": 1},
    ],
    "comments": [
        {"student_name": "Student", "comment_text": "Clear lessons and practical editing steps.", "date": "", "enabled": True, "sort_order": 0},
    ],
    "faqs": [
        {"question": "Do I need prior editing experience?", "answer": "No. The course content is beginner-friendly and moves into practical professional workflows.", "enabled": True, "sort_order": 0},
    ],
}


DEFAULT_COURSE_VISIBILITY = {
    "courses_enabled": False,
    "show_coming_soon": True,
    "coming_soon_title": "Courses Coming Soon",
    "coming_soon_subtitle": "We are preparing premium video editing courses. Stay tuned.",
    "coming_soon_button_text": "Explore Assets",
    "coming_soon_button_link": "/assets",
}


DEFAULT_PAGE_SETTINGS = {
    "about": {
        "heading": "DOP, filmmaker, editor, drone pilot, and visual storyteller.",
        "subtitle": "About Pranvith Dop",
        "profile_image_url": "/assets/brand-profile.png",
        "description": "PranvithDOP creates cinematic visuals for brands, creators, weddings, products, and digital campaigns.",
        "experience_highlights": "Film, ad & edit projects\nProduct and commercial shoots\nAerial/drone sequences\nPost-production workflow",
        "cta_text": "Book a project",
        "cta_link": "/hire",
        "show_about_image": True,
        "show_hero": True,
        "show_stats": True,
        "show_gear": True,
    },
    "assets": {
        "heading": "Creative Assets Store",
        "subtitle": "Premium LUTs, sound packs, motion templates and more — built for editors.",
        "show_hero": True,
        "show_product_listing": True,
        "show_featured_products": True,
        "cta_text": "Explore Assets",
        "cta_link": "/assets",
    },
    "works": {
        "heading": "Portfolio Built With Light, Motion & Emotion",
        "subtitle": "A curated collection of cinematic commercial, wedding, drone, editing, product, and film work.",
        "show_portfolio_grid": True,
        "show_showreel": True,
        "show_testimonials": True,
        "cta_text": "Book a project",
        "cta_link": "/hire",
    },
    "hire": {
        "heading": "Build a film, campaign, or visual story with cinematic intent.",
        "subtitle": "Tell us about your shoot, brand film, wedding, reel, product campaign, or edit.",
        "show_enquiry_form": True,
        "show_services": True,
        "show_contact_info": True,
        "cta_text": "Send Project Enquiry",
        "cta_link": "/hire",
    },
}


WORKS_CATEGORIES = {"Commercial", "Wedding", "Drone", "Editing", "Product", "Film"}
WORKS_VIDEO_TYPES = {"video_file", "video_url", "youtube", "vimeo"}

DEFAULT_WORKS_PAGE = {
    "hero": {
        "label": "PORTFOLIO",
        "heading": "Films, commercials, aerials, and edits crafted for impact.",
        "subtitle": "A curated portfolio of PranvithDOP cinematography, drone work, product visuals, and post-production projects.",
        "hero_media_type": "image",
        "hero_media_url": "",
        "poster_image_url": "",
        "show_hero": True,
    },
    "showreel": {
        "show_featured_showreel": True,
        "label": "FEATURED SHOWREEL",
        "heading": "A cinematic portfolio of light, movement, and emotion.",
        "description": "Commercials, wedding stories, drone sequences, product frames, and post-production work shaped for premium digital delivery.",
        "video_type": "video_url",
        "video_url": "",
        "thumbnail_image_url": "",
        "button_text": "View all works",
        "button_link": "/works",
    },
    "projects": [
        {"title": "Commercial Brand Film", "category": "Commercial", "thumbnail_image_url": "", "description": "A polished commercial film with controlled lighting, cinematic movement, and premium product framing.", "video_url": "", "video_type": "video_url", "equipment": "Cinema camera, gimbal, LED lighting", "client": "Brand project", "date": "2026", "enabled": True, "sort_order": 0},
        {"title": "Cinematic Wedding Story", "category": "Wedding", "thumbnail_image_url": "", "description": "Emotion-led wedding cinematography built around light, movement, vows, and family moments.", "video_url": "", "video_type": "video_url", "equipment": "Cinema camera, drone, wireless audio", "client": "Private client", "date": "2026", "enabled": True, "sort_order": 1},
        {"title": "Aerial Drone Sequence", "category": "Drone", "thumbnail_image_url": "", "description": "Aerial visuals for locations, events, establishing shots, and cinematic production sequences.", "video_url": "", "video_type": "video_url", "equipment": "4K drone, ND filters", "client": "Production partner", "date": "2026", "enabled": True, "sort_order": 2},
    ],
}


def _safe_works_video_url(video_type: str, value: Optional[str]) -> str:
    return _safe_course_video_url(video_type, value)


def _safe_works_page(works_page: Optional[dict]) -> dict:
    source = {**DEFAULT_WORKS_PAGE, **(works_page or {})}
    hero_source = {**DEFAULT_WORKS_PAGE["hero"], **(source.get("hero") or {})}
    showreel_source = {**DEFAULT_WORKS_PAGE["showreel"], **(source.get("showreel") or {})}

    hero_media_type = str(hero_source.get("hero_media_type") or "image").strip().lower()
    if hero_media_type not in {"image", "video_file", "video_url"}:
        raise ValueError("hero_media_type must be image, video_file, or video_url")

    showreel_video_type = str(showreel_source.get("video_type") or "video_url").strip().lower()
    if showreel_video_type not in WORKS_VIDEO_TYPES:
        raise ValueError("video_type must be video_file, video_url, youtube, or vimeo")

    projects = []
    for index, project in enumerate(source.get("projects") or []):
        if not isinstance(project, dict):
            continue
        category = str(project.get("category") or "Commercial").strip().title()
        if category not in WORKS_CATEGORIES:
            category = "Commercial"
        video_type = str(project.get("video_type") or "video_url").strip().lower()
        if video_type not in WORKS_VIDEO_TYPES:
            raise ValueError("project video_type must be video_file, video_url, youtube, or vimeo")
        projects.append({
            "title": str(project.get("title") or "").strip()[:160],
            "category": category,
            "thumbnail_image_url": _reject_unsafe_url(project.get("thumbnail_image_url") or "") or "",
            "description": str(project.get("description") or "").strip()[:700],
            "video_url": _safe_works_video_url(video_type, project.get("video_url") or ""),
            "video_type": video_type,
            "equipment": str(project.get("equipment") or "").strip()[:220],
            "client": str(project.get("client") or "").strip()[:160],
            "date": str(project.get("date") or "").strip()[:80],
            "enabled": bool(project.get("enabled", True)),
            "sort_order": int(project.get("sort_order", index) or 0),
        })
    projects.sort(key=lambda item: item.get("sort_order", 0))

    return {
        "hero": {
            "label": str(hero_source.get("label") or "").strip()[:80],
            "heading": str(hero_source.get("heading") or "").strip()[:220],
            "subtitle": str(hero_source.get("subtitle") or "").strip()[:700],
            "hero_media_type": hero_media_type,
            "hero_media_url": _safe_hero_media_url(hero_media_type, hero_source.get("hero_media_url") or ""),
            "poster_image_url": _reject_unsafe_url(hero_source.get("poster_image_url") or "") or "",
            "show_hero": bool(hero_source.get("show_hero", True)),
        },
        "showreel": {
            "show_featured_showreel": bool(showreel_source.get("show_featured_showreel", True)),
            "label": str(showreel_source.get("label") or "").strip()[:80],
            "heading": str(showreel_source.get("heading") or "").strip()[:220],
            "description": str(showreel_source.get("description") or "").strip()[:700],
            "video_type": showreel_video_type,
            "video_url": _safe_works_video_url(showreel_video_type, showreel_source.get("video_url") or ""),
            "thumbnail_image_url": _reject_unsafe_url(showreel_source.get("thumbnail_image_url") or "") or "",
            "button_text": str(showreel_source.get("button_text") or "").strip()[:80],
            "button_link": _reject_unsafe_url(showreel_source.get("button_link") or "") or "",
        },
        "projects": projects[:80],
    }


def _safe_page_settings(settings: Optional[dict]) -> dict:
    source = {**DEFAULT_PAGE_SETTINGS, **(settings or {})}
    safe = {}
    for slug, defaults in DEFAULT_PAGE_SETTINGS.items():
        page = {**defaults, **(source.get(slug) or {})}
        safe_page = {}
        for key, default_value in defaults.items():
            if isinstance(default_value, bool):
                safe_page[key] = bool(page.get(key, default_value))
            elif key.endswith("_link") or key.endswith("_url"):
                safe_page[key] = _reject_unsafe_url(page.get(key) or "") or ""
            elif key == "experience_highlights":
                safe_page[key] = str(page.get(key) or "").strip()[:1000]
            else:
                safe_page[key] = str(page.get(key) or "").strip()[:700]
        safe[slug] = safe_page
    return safe


def _safe_course_visibility(visibility: Optional[dict]) -> dict:
    source = {**DEFAULT_COURSE_VISIBILITY, **(visibility or {})}
    return {
        "courses_enabled": bool(source.get("courses_enabled", False)),
        "show_coming_soon": bool(source.get("show_coming_soon", True)),
        "coming_soon_title": str(source.get("coming_soon_title") or "").strip()[:160],
        "coming_soon_subtitle": str(source.get("coming_soon_subtitle") or "").strip()[:500],
        "coming_soon_button_text": str(source.get("coming_soon_button_text") or "").strip()[:80],
        "coming_soon_button_link": _reject_unsafe_url(source.get("coming_soon_button_link") or "") or "",
    }


def _safe_rating(value: Any) -> Optional[int]:
    if value in {None, ""}:
        return None
    rating = int(value)
    if rating < 1 or rating > 5:
        raise ValueError("rating must be between 1 and 5")
    return rating


def _safe_course_video_url(video_type: str, value: Optional[str]) -> str:
    cleaned = _reject_unsafe_url(value) or ""
    if not cleaned:
        return ""
    if cleaned.startswith("/") and not cleaned.startswith("//"):
        return cleaned
    parsed = urlparse(cleaned)
    host = (parsed.netloc or "").lower()
    path = (parsed.path or "").lower()
    if video_type == "video_file":
        if not path.endswith((".mp4", ".webm", ".mov")):
            raise ValueError("video_file must be a direct mp4/webm/mov URL")
    elif video_type == "youtube":
        if host not in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"}:
            raise ValueError("youtube video URL must be a YouTube URL")
    elif video_type == "vimeo":
        if host not in {"vimeo.com", "www.vimeo.com", "player.vimeo.com"}:
            raise ValueError("vimeo video URL must be a Vimeo URL")
    elif video_type == "video_url":
        allowed = path.endswith((".mp4", ".webm", ".mov")) or host in {
            "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be",
            "vimeo.com", "www.vimeo.com", "player.vimeo.com",
        }
        if not allowed:
            raise ValueError("video_url must be YouTube, Vimeo, or a direct mp4/webm/mov URL")
    return cleaned


def _safe_sorted_items(items: Any, mapper, limit: int = 50) -> list:
    safe_items = []
    for index, item in enumerate(items or []):
        if not isinstance(item, dict):
            continue
        safe_items.append(mapper(item, index))
    safe_items.sort(key=lambda item: item.get("sort_order", 0))
    return safe_items[:limit]


def _safe_course_page(course_page: Optional[dict]) -> dict:
    source = {**DEFAULT_COURSE_PAGE, **(course_page or {})}
    hero_source = {**DEFAULT_COURSE_PAGE["hero"], **(source.get("hero") or {})}

    def learn_item(item, index):
        return {
            "title": str(item.get("title") or "").strip()[:120],
            "description": str(item.get("description") or "").strip()[:500],
            "icon": str(item.get("icon") or "").strip()[:20],
            "enabled": bool(item.get("enabled", True)),
            "sort_order": int(item.get("sort_order", index) or 0),
        }

    def testimonial_video(item, index):
        video_type = str(item.get("video_type") or "video_url").strip().lower()
        if video_type not in {"video_file", "video_url", "youtube", "vimeo"}:
            raise ValueError("video_type must be video_file, video_url, youtube, or vimeo")
        return {
            "student_name": str(item.get("student_name") or "").strip()[:120],
            "course_name": str(item.get("course_name") or "").strip()[:120],
            "thumbnail_image_url": _reject_unsafe_url(item.get("thumbnail_image_url") or "") or "",
            "video_type": video_type,
            "video_url": _safe_course_video_url(video_type, item.get("video_url") or ""),
            "review_text": str(item.get("review_text") or "").strip()[:700],
            "rating": _safe_rating(item.get("rating")),
            "enabled": bool(item.get("enabled", True)),
            "sort_order": int(item.get("sort_order", index) or 0),
        }

    def text_review(item, index):
        return {
            "student_name": str(item.get("student_name") or "").strip()[:120],
            "student_image_url": _reject_unsafe_url(item.get("student_image_url") or "") or "",
            "course_name": str(item.get("course_name") or "").strip()[:120],
            "rating": _safe_rating(item.get("rating")),
            "review_text": str(item.get("review_text") or "").strip()[:900],
            "enabled": bool(item.get("enabled", True)),
            "sort_order": int(item.get("sort_order", index) or 0),
        }

    def comment(item, index):
        return {
            "student_name": str(item.get("student_name") or "").strip()[:120],
            "comment_text": str(item.get("comment_text") or "").strip()[:600],
            "date": str(item.get("date") or "").strip()[:80],
            "enabled": bool(item.get("enabled", True)),
            "sort_order": int(item.get("sort_order", index) or 0),
        }

    def faq(item, index):
        return {
            "question": str(item.get("question") or "").strip()[:220],
            "answer": str(item.get("answer") or "").strip()[:900],
            "enabled": bool(item.get("enabled", True)),
            "sort_order": int(item.get("sort_order", index) or 0),
        }

    return {
        "show_right_for_you": bool(source.get("show_right_for_you", True)),
        "hero": {
            "heading": str(hero_source.get("heading") or "").strip()[:180],
            "subtitle": str(hero_source.get("subtitle") or "").strip()[:600],
            "button_text": str(hero_source.get("button_text") or "").strip()[:80],
            "button_link": _reject_unsafe_url(hero_source.get("button_link") or "") or "",
            "media_url": _reject_unsafe_url(hero_source.get("media_url") or "") or "",
        },
        "learn_items": _safe_sorted_items(source.get("learn_items"), learn_item),
        "testimonial_videos": _safe_sorted_items(source.get("testimonial_videos"), testimonial_video),
        "text_reviews": _safe_sorted_items(source.get("text_reviews"), text_review),
        "comments": _safe_sorted_items(source.get("comments"), comment),
        "faqs": _safe_sorted_items(source.get("faqs"), faq),
    }


def _safe_home_hero(hero: Optional[dict]) -> dict:
    source = {**DEFAULT_HOME_HERO, **(hero or {})}
    media_type = str(source.get("hero_media_type") or "auto").strip().lower()
    if media_type not in {"auto", "image", "video_file", "video_url"}:
        raise ValueError("hero_media_type must be auto, image, video_file, or video_url")
    return {
        "badge_text": str(source.get("badge_text") or "").strip()[:240],
        "hero_title": str(source.get("hero_title") or "").strip()[:160],
        "hero_subtitle": str(source.get("hero_subtitle") or "").strip()[:500],
        "primary_button_text": str(source.get("primary_button_text") or "").strip()[:80],
        "primary_button_link": _reject_unsafe_url(source.get("primary_button_link") or "") or "",
        "secondary_button_text": str(source.get("secondary_button_text") or "").strip()[:80],
        "secondary_button_link": _reject_unsafe_url(source.get("secondary_button_link") or "") or "",
        "hero_media_type": media_type,
        "hero_media_url": _safe_hero_media_url(media_type, source.get("hero_media_url") or ""),
        "hero_media_poster_url": _reject_unsafe_url(source.get("hero_media_poster_url") or "") or "",
        "hero_media_autoplay": bool(source.get("hero_media_autoplay", True)),
        "hero_media_muted": bool(source.get("hero_media_muted", True)),
        "hero_media_loop": bool(source.get("hero_media_loop", True)),
    }


def _safe_hero_media_url(media_type: str, value: Optional[str]) -> str:
    cleaned = _reject_unsafe_url(value) or ""
    if not cleaned:
        return ""
    if cleaned.startswith("/") and not cleaned.startswith("//"):
        return cleaned
    parsed = urlparse(cleaned)
    host = (parsed.netloc or "").lower()
    path = (parsed.path or "").lower()
    is_youtube = host in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"}
    is_vimeo = host in {"vimeo.com", "www.vimeo.com", "player.vimeo.com"}
    is_direct_video = path.endswith((".mp4", ".webm", ".mov"))
    is_image = path.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))

    if media_type == "image" and not is_image:
        raise ValueError("image hero media URL must be jpg, jpeg, png, webp, or gif")
    if media_type == "video_file" and not is_direct_video:
        raise ValueError("video_file hero media URL must be mp4, webm, or mov")
    if media_type == "video_url" and not (is_youtube or is_vimeo or is_direct_video):
        raise ValueError("video_url must be YouTube, Vimeo, or a direct mp4/webm/mov URL")
    if media_type == "auto" and not (is_image or is_youtube or is_vimeo or is_direct_video):
        raise ValueError("auto hero media URL must be an image, YouTube, Vimeo, or direct mp4/webm/mov URL")
    return cleaned


def _safe_instagram_profile(profile: Optional[dict]) -> dict:
    source = {**DEFAULT_INSTAGRAM_PROFILE, **(profile or {})}
    safe_cards = []
    for index, card in enumerate(source.get("cards") or []):
        if not isinstance(card, dict):
            continue
        card_type = str(card.get("type") or "Post").strip().title()
        if card_type not in {"Reel", "Post", "Video"}:
            card_type = "Post"
        safe_cards.append({
            "title": str(card.get("title") or "").strip()[:120],
            "type": card_type,
            "thumbnail_image_url": _reject_unsafe_url(card.get("thumbnail_image_url") or "") or "",
            "link_url": _reject_unsafe_url(card.get("link_url") or source.get("follow_button_url") or "") or "",
            "enabled": bool(card.get("enabled", True)),
            "sort_order": int(card.get("sort_order", index) or 0),
        })
    safe_cards.sort(key=lambda item: item.get("sort_order", 0))
    return {
        "username": str(source.get("username") or "").strip()[:80],
        "display_name": str(source.get("display_name") or "").strip()[:120],
        "profile_image_url": _reject_unsafe_url(source.get("profile_image_url") or "") or "",
        "followers_count": str(source.get("followers_count") or "").strip()[:40],
        "following_count": str(source.get("following_count") or "").strip()[:40],
        "posts_count": str(source.get("posts_count") or "").strip()[:40],
        "bio_line_1": str(source.get("bio_line_1") or "").strip()[:200],
        "bio_line_2": str(source.get("bio_line_2") or "").strip()[:200],
        "bio_line_3": str(source.get("bio_line_3") or "").strip()[:200],
        "bio_line_4": str(source.get("bio_line_4") or "").strip()[:200],
        "link_text": str(source.get("link_text") or "").strip()[:160],
        "link_url": _reject_unsafe_url(source.get("link_url") or "") or "",
        "follow_button_url": _reject_unsafe_url(source.get("follow_button_url") or "") or "",
        "cards": safe_cards,
    }


def normalize_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    return slug.strip("-")


def product_url_for_slug(slug: str) -> str:
    return f"/assets/{slug}"


MEDIA_URL_FIELDS = {
    "download_file",
    "download_file_url",
    "hero_image",
    "product_url",
    "youtube_url",
    "video_url",
    "before_image_url",
    "after_image_url",
}


def _reject_unsafe_url(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    cleaned = value.strip()
    if not cleaned:
        return cleaned
    parsed = urlparse(cleaned)
    if parsed.scheme.lower() in {"javascript", "data", "vbscript"}:
        raise ValueError("javascript/data/vbscript URLs are not allowed")
    if parsed.scheme:
        allowed_schemes = {"https"}
        if IS_DEVELOPMENT:
            allowed_schemes.add("http")
        if parsed.scheme.lower() not in allowed_schemes:
            raise ValueError("Only safe HTTPS URLs are allowed")
    return cleaned


def _sanitize_cms_value(value: Any) -> Any:
    if isinstance(value, str):
        cleaned = html.escape(value.strip(), quote=False)
        lowered = cleaned.lower()
        if lowered.startswith(("javascript:", "vbscript:", "data:")):
            raise ValueError("Unsafe URL/content is not allowed")
        return cleaned[:10000]
    if isinstance(value, list):
        return [_sanitize_cms_value(item) for item in value[:200]]
    if isinstance(value, dict):
        safe = {}
        for key, item in value.items():
            safe_key = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(key))[:80]
            if not safe_key:
                continue
            if safe_key.endswith("_url") or safe_key.endswith("_link") or safe_key in {"url", "href", "src", "thumbnail", "image", "video"}:
                safe[safe_key] = _reject_unsafe_url(str(item).strip()) if item else ""
            else:
                safe[safe_key] = _sanitize_cms_value(item)
        return safe
    if isinstance(value, (bool, int, float)) or value is None:
        return value
    return str(value)[:1000]


def _normalize_cms_page_key(page_key: str) -> str:
    key = normalize_slug(page_key)
    if key not in CMS_PAGE_KEYS:
        raise HTTPException(status_code=404, detail="CMS page not found")
    return key


def _cms_page_doc(page_key: str, payload: Optional[CmsPageIn] = None, existing: Optional[dict] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    base = {
        "id": existing.get("id") if existing else str(uuid.uuid4()),
        "page_key": page_key,
        "title": page_key.replace("-", " ").title(),
        "subtitle": "",
        "slug": page_key,
        "path": CMS_PAGE_PATHS.get(page_key, f"/{page_key}"),
        "status": "draft",
        "seo_title": "",
        "seo_description": "",
        "settings": {},
        "created_at": existing.get("created_at") if existing else now,
        "updated_at": now,
    }
    if existing:
        base.update({k: v for k, v in existing.items() if k != "_id"})
    if payload:
        incoming = payload.model_dump(exclude_unset=True)
        if incoming.get("slug"):
            incoming["slug"] = normalize_slug(incoming["slug"])
        if "settings" in incoming:
            incoming["settings"] = _sanitize_cms_value(incoming.get("settings") or {})
        base.update({k: v for k, v in incoming.items() if v is not None})
        base["updated_at"] = now
    return base


def _cms_section_doc(page_key: str, payload: CmsSectionIn, existing: Optional[dict] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    base = {
        "id": existing.get("id") if existing else str(uuid.uuid4()),
        "section_id": existing.get("section_id") if existing else (payload.section_id or str(uuid.uuid4())[:8]),
        "page_key": page_key,
        "type": "text",
        "title": "",
        "subtitle": "",
        "description": "",
        "button_text": "",
        "button_link": "",
        "media_type": "auto",
        "media_url": "",
        "poster_url": "",
        "data": {},
        "enabled": True,
        "sort_order": 0,
        "created_at": existing.get("created_at") if existing else now,
        "updated_at": now,
    }
    if existing:
        base.update({k: v for k, v in existing.items() if k != "_id"})
    incoming = payload.model_dump(exclude_unset=True)
    incoming["data"] = _sanitize_cms_value(incoming.get("data") or {})
    if "section_id" in incoming and incoming["section_id"]:
        incoming["section_id"] = normalize_slug(incoming["section_id"])
    base.update({k: v for k, v in incoming.items() if v is not None})
    base["page_key"] = page_key
    base["updated_at"] = now
    return base


async def _cms_page_response(page_key: str, public: bool = False) -> dict:
    page = await db.cms_pages.find_one({"page_key": page_key}, {"_id": 0})
    if not page:
        return {
            "page_key": page_key,
            "title": page_key.title(),
            "subtitle": "",
            "path": CMS_PAGE_PATHS.get(page_key, f"/{page_key}"),
            "status": "hidden" if public else "draft",
            "seo_title": "",
            "seo_description": "",
            "settings": {},
            "sections": [],
        }
    if public and page.get("status") != "published":
        return {
            "page_key": page_key,
            "title": page.get("title", ""),
            "subtitle": page.get("subtitle", ""),
            "path": page.get("path", CMS_PAGE_PATHS.get(page_key, f"/{page_key}")),
            "status": "hidden",
            "seo_title": "",
            "seo_description": "",
            "settings": {},
            "sections": [],
        }
    section_query = {"page_key": page_key}
    if public:
        section_query["enabled"] = {"$ne": False}
    sections = await db.cms_sections.find(section_query, {"_id": 0}).sort("sort_order", 1).to_list(200)
    safe_page = {k: v for k, v in page.items() if k not in {"_id"}}
    if public:
        safe_page = {
            "page_key": page_key,
            "title": safe_page.get("title", ""),
            "subtitle": safe_page.get("subtitle", ""),
            "path": safe_page.get("path", CMS_PAGE_PATHS.get(page_key, f"/{page_key}")),
            "status": "published",
            "seo_title": safe_page.get("seo_title", ""),
            "seo_description": safe_page.get("seo_description", ""),
            "settings": safe_page.get("settings") or {},
        }
        public_sections = []
        for section in sections:
            public_sections.append({
                "section_id": section.get("section_id", ""),
                "type": section.get("type", "text"),
                "title": section.get("title", ""),
                "subtitle": section.get("subtitle", ""),
                "description": section.get("description", ""),
                "button_text": section.get("button_text", ""),
                "button_link": section.get("button_link", ""),
                "media_type": section.get("media_type", "auto"),
                "media_url": section.get("media_url", ""),
                "poster_url": section.get("poster_url", ""),
                "data": section.get("data") or {},
            })
        safe_page["sections"] = public_sections
        return safe_page
    safe_page["sections"] = sections
    return safe_page


def _normalize_product_media_fields(doc: dict) -> dict:
    if not doc.get("product_images") and doc.get("images"):
        doc["product_images"] = list(doc.get("images") or [])
    if not doc.get("images") and doc.get("product_images"):
        doc["images"] = list(doc.get("product_images") or [])
    doc.setdefault("product_images", [])
    doc.setdefault("images", [])
    doc["product_images"] = [_reject_unsafe_url(item) for item in (doc.get("product_images") or []) if item]
    doc["images"] = [_reject_unsafe_url(item) for item in (doc.get("images") or doc["product_images"] or []) if item]
    for field_name in MEDIA_URL_FIELDS:
        if field_name in doc:
            doc[field_name] = _reject_unsafe_url(doc.get(field_name))
    if not doc.get("download_file_url") and doc.get("download_file"):
        doc["download_file_url"] = doc.get("download_file")
    if not doc.get("download_file") and doc.get("download_file_url"):
        doc["download_file"] = doc.get("download_file_url")
    if doc.get("video_type") not in {None, "", "youtube", "direct"}:
        raise HTTPException(status_code=422, detail="video_type must be youtube, direct, or empty")
    return doc


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


@api_router.get("/cms/pages/{page_key}")
async def public_cms_page(page_key: str):
    page_key = _normalize_cms_page_key(page_key)
    if db is None:
        return {
            "page_key": page_key,
            "title": page_key.title(),
            "status": "hidden",
            "seo_title": "",
            "seo_description": "",
            "sections": [],
        }
    return await _cms_page_response(page_key, public=True)


def _public_product(product: dict) -> dict:
    safe = _normalize_product_media_fields(dict(product))
    safe.pop("download_file", None)
    safe.pop("download_file_url", None)
    safe.pop("download_file_key", None)
    safe.pop("download_file_name", None)
    safe.pop("download_file_bucket", None)
    safe.pop("payment_link", None)
    safe.pop("razorpay_payment_link_id", None)
    safe.pop("razorpay_payment_link_url", None)
    safe.pop("razorpay_payment_link_status", None)
    return safe


@api_router.get("/products")
async def public_products():
    if db is None:
        products = [_public_product(product) for product in ASSET_PRODUCTS if product.get("published", True)]
        logger.info("Product fetch source=fallback scope=public count=%d", len(products))
        return products
    try:
        rows = await db.products.find({"published": True}, {"_id": 0, "download_file": 0, "download_file_url": 0, "download_file_key": 0, "download_file_name": 0, "download_file_bucket": 0, "payment_link": 0, "razorpay_payment_link_id": 0, "razorpay_payment_link_url": 0, "razorpay_payment_link_status": 0}).to_list(100)
        logger.info(
            "Product fetch source=mongodb database=%s collection=products scope=public count=%d",
            db_name,
            len(rows),
        )
        return [_public_product(row) for row in rows]
    except Exception as exc:
        logger.exception(
            "Public products endpoint failed; falling back to seeded catalog. database=%s collection=products error_type=%s",
            db_name,
            type(exc).__name__,
        )
        products = [_public_product(product) for product in ASSET_PRODUCTS if product.get("published", True)]
        return products


@api_router.get("/products/{slug}")
async def public_product_by_slug(slug: str):
    if db is None:
        product = next((product for product in ASSET_PRODUCTS if product.get("slug") == slug and product.get("published", True)), None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return _public_product(product)
    try:
        product = await db.products.find_one({"slug": slug, "published": True}, {"_id": 0, "download_file": 0, "download_file_url": 0, "download_file_key": 0, "download_file_name": 0, "download_file_bucket": 0, "payment_link": 0, "razorpay_payment_link_id": 0, "razorpay_payment_link_url": 0, "razorpay_payment_link_status": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return _public_product(product)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Public product detail endpoint failed; falling back to seeded catalog. database=%s collection=products slug=%s error_type=%s",
            db_name,
            slug,
            type(exc).__name__,
        )
        product = next((product for product in ASSET_PRODUCTS if product.get("slug") == slug and product.get("published", True)), None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return _public_product(product)


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
    message = (payload.message or payload.requirement or "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="Project message is required")
    obj = HireRequest(
        name=payload.name.strip(),
        email=str(payload.email).lower().strip(),
        phone=(payload.phone or "").strip() or None,
        project_type=(payload.project_type or "").strip() or None,
        budget=(payload.budget or "").strip() or None,
        project_date=(payload.project_date or "").strip() or None,
        location=(payload.location or "").strip() or None,
        message=message,
        requirement=message,
    )
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
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login: Optional[str] = None


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


class AdminChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


class AdminUserCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    role: str = "admin"
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    is_active: bool = True


class AdminUserUpdateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    role: str = "admin"
    is_active: bool = True


class AdminResetPasswordIn(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


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
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.environ.get("JWT_EXPIRATION_MINUTES", "180"))
DEFAULT_ADMIN_EMAIL = os.environ.get("DEFAULT_ADMIN_EMAIL")
DEFAULT_ADMIN_PASSWORD = os.environ.get("DEFAULT_ADMIN_PASSWORD")
DEFAULT_ADMIN_NAME = os.environ.get("DEFAULT_ADMIN_NAME", "Super Admin")
APP_ENV = os.environ.get("APP_ENV") or os.environ.get("ENVIRONMENT") or os.environ.get("ENV") or "production"
IS_DEVELOPMENT = APP_ENV.lower() in {"dev", "development", "local"} or os.environ.get("DEBUG", "").lower() == "true"
INITIAL_PRODUCT_SEED_KEY = "initial_asset_products_v1"
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


def _require_jwt_secret() -> str:
    if len(JWT_SECRET) < 32:
        logger.error("Admin authentication is unavailable: JWT_SECRET must be at least 32 characters")
        raise HTTPException(status_code=503, detail="Admin authentication is not configured")
    return JWT_SECRET


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
    if admin.get("is_active", True) is False:
        logger.warning("Admin login failed: inactive admin for email %s", normalized_email)
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
        is_active=doc.get("is_active", True) is not False,
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
        last_login=doc.get("last_login"),
    )


def validate_admin_role(role: str) -> str:
    cleaned = (role or "admin").strip().lower()
    if cleaned not in {"admin", "super_admin"}:
        raise HTTPException(status_code=422, detail="Role must be admin or super_admin")
    return cleaned


def validate_password_confirmation(password: str, confirm_password: str):
    if password != confirm_password:
        raise HTTPException(status_code=422, detail="Password confirmation does not match")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRATION_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _require_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_admin(token: str = Depends(oauth2_scheme)) -> AdminBase:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _require_jwt_secret(), algorithms=[JWT_ALGORITHM])
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
    if admin.get("is_active", True) is False:
        logger.warning("Admin token rejected: inactive admin id %s", admin_id)
        raise credentials_exception
    return admin_doc_to_public(admin)


async def get_current_active_admin(current_admin: AdminBase = Depends(get_current_admin)) -> AdminBase:
    return current_admin


async def get_current_super_admin(current_admin: AdminBase = Depends(get_current_active_admin)) -> AdminBase:
    if current_admin.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access is required")
    return current_admin


async def assert_not_last_super_admin(admin_id: str, next_role: Optional[str] = None, next_active: Optional[bool] = None):
    target = await db.admins.find_one({"id": admin_id})
    if not target:
        raise HTTPException(status_code=404, detail="Admin user not found")
    is_super = target.get("role") == "super_admin"
    will_be_super = (next_role or target.get("role")) == "super_admin"
    will_be_active = (target.get("is_active", True) is not False) if next_active is None else bool(next_active)
    if not is_super:
        return target
    if will_be_super and will_be_active:
        return target
    active_super_count = await db.admins.count_documents({"role": "super_admin", "is_active": {"$ne": False}})
    if active_super_count <= 1:
        raise HTTPException(status_code=409, detail="Cannot remove or disable the last active super admin")
    return target


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
    now = datetime.now(timezone.utc).isoformat()
    await db.admins.update_one({"id": admin["id"]}, {"$set": {"last_login": now, "updated_at": now}})
    admin["last_login"] = now
    admin["updated_at"] = now
    access_token = create_access_token({"id": admin["id"], "sub": admin["id"], "role": admin.get("role", "admin")})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": admin_doc_to_public(admin).model_dump(),
    }


@admin_router.post("/logout")
async def admin_logout(current_admin: AdminBase = Depends(get_current_active_admin)):
    return {"success": True, "message": "Logged out successfully"}


@admin_router.get("/me", response_model=AdminBase)
async def admin_me(current_admin: AdminBase = Depends(get_current_active_admin)):
    return current_admin


@admin_router.post("/change-password")
async def admin_change_password(payload: AdminChangePasswordIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    validate_password_confirmation(payload.new_password, payload.confirm_password)
    admin = await get_admin_by_id(current_admin.id)
    if not admin or admin.get("is_active", True) is False:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    if not verify_password(payload.current_password, admin.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    now = datetime.now(timezone.utc).isoformat()
    await db.admins.update_one(
        {"id": current_admin.id},
        {"$set": {"hashed_password": get_password_hash(payload.new_password), "updated_at": now}},
    )
    return {"success": True, "message": "Password changed successfully"}


@admin_router.get("/users")
async def admin_list_users(current_admin: AdminBase = Depends(get_current_super_admin)):
    rows = await db.admins.find({}, {"_id": 0, "hashed_password": 0}).sort("created_at", 1).to_list(200)
    return [admin_doc_to_public(row).model_dump() for row in rows]


@admin_router.post("/users")
async def admin_create_user(payload: AdminUserCreateIn, current_admin: AdminBase = Depends(get_current_super_admin)):
    validate_password_confirmation(payload.password, payload.confirm_password)
    role = validate_admin_role(payload.role)
    email = str(payload.email).lower().strip()
    existing = await db.admins.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An admin with this email already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": email,
        "role": role,
        "permissions": ["super_admin", "admin", "editor"] if role == "super_admin" else ["admin"],
        "is_active": bool(payload.is_active),
        "hashed_password": get_password_hash(payload.password),
        "created_at": now,
        "updated_at": now,
        "last_login": None,
    }
    try:
        await db.admins.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An admin with this email already exists")
    return admin_doc_to_public(doc).model_dump()


@admin_router.put("/users/{admin_id}")
async def admin_update_user(admin_id: str, payload: AdminUserUpdateIn, current_admin: AdminBase = Depends(get_current_super_admin)):
    role = validate_admin_role(payload.role)
    is_active = bool(payload.is_active)
    if admin_id == current_admin.id and not is_active:
        raise HTTPException(status_code=409, detail="You cannot disable your own admin account")
    await assert_not_last_super_admin(admin_id, next_role=role, next_active=is_active)
    email = str(payload.email).lower().strip()
    duplicate = await db.admins.find_one({"email": email, "id": {"$ne": admin_id}})
    if duplicate:
        raise HTTPException(status_code=409, detail="An admin with this email already exists")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.admins.update_one(
        {"id": admin_id},
        {
            "$set": {
                "name": payload.name.strip(),
                "email": email,
                "role": role,
                "permissions": ["super_admin", "admin", "editor"] if role == "super_admin" else ["admin"],
                "is_active": is_active,
                "updated_at": now,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admin user not found")
    updated = await get_admin_by_id(admin_id)
    return admin_doc_to_public(updated).model_dump()


@admin_router.post("/users/{admin_id}/reset-password")
async def admin_reset_user_password(admin_id: str, payload: AdminResetPasswordIn, current_admin: AdminBase = Depends(get_current_super_admin)):
    validate_password_confirmation(payload.password, payload.confirm_password)
    admin = await get_admin_by_id(admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.admins.update_one(
        {"id": admin_id},
        {"$set": {"hashed_password": get_password_hash(payload.password), "updated_at": now}},
    )
    return {"success": True, "message": "Password reset successfully"}


@admin_router.get("/dashboard")
async def admin_dashboard(current_admin: AdminBase = Depends(get_current_active_admin)):
    pages_count = await db.pages.count_documents({})
    products_count = await db.products.count_documents({})
    orders_count = await db.orders.count_documents({})
    customers_count = await db.customers.count_documents({})
    revenue_result = await db.orders.aggregate([
        {"$match": successful_revenue_order_filter()},
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


@admin_router.get("/debug/razorpay-health")
async def admin_razorpay_health(current_admin: AdminBase = Depends(get_current_active_admin)):
    return {
        "success": True,
        **razorpay_config_summary(),
    }


@admin_router.get("/pages")
async def admin_pages(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        return await db.pages.find({}, {"_id": 0}).to_list(100)
    except Exception:
        logger.exception("Admin pages fetch failed")
        raise HTTPException(status_code=500, detail="Could not load pages")


@admin_router.get("/pages/{page_id}")
async def admin_get_page(page_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@admin_router.get("/cms/pages")
async def admin_cms_pages(current_admin: AdminBase = Depends(get_current_active_admin)):
    rows = await db.cms_pages.find({}, {"_id": 0}).sort("page_key", 1).to_list(100)
    by_key = {row.get("page_key"): row for row in rows}
    result = []
    for page_key in ["home", "courses", "about", "assets", "works", "hire"]:
        result.append(by_key.get(page_key) or _cms_page_doc(page_key))
    return result


@admin_router.get("/cms/pages/{page_key}")
async def admin_cms_page(page_key: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    page_key = _normalize_cms_page_key(page_key)
    return await _cms_page_response(page_key, public=False)


@admin_router.put("/cms/pages/{page_key}")
async def admin_update_cms_page(page_key: str, payload: CmsPageIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    page_key = _normalize_cms_page_key(page_key)
    existing = await db.cms_pages.find_one({"page_key": page_key}, {"_id": 0})
    doc = _cms_page_doc(page_key, payload, existing)
    await db.cms_pages.update_one({"page_key": page_key}, {"$set": doc}, upsert=True)
    return await _cms_page_response(page_key, public=False)


@admin_router.post("/cms/pages/{page_key}/sections")
async def admin_create_cms_section(page_key: str, payload: CmsSectionIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    page_key = _normalize_cms_page_key(page_key)
    page = await db.cms_pages.find_one({"page_key": page_key}, {"_id": 0})
    if not page:
        await db.cms_pages.update_one({"page_key": page_key}, {"$set": _cms_page_doc(page_key)}, upsert=True)
    if payload.sort_order is None:
        payload.sort_order = await db.cms_sections.count_documents({"page_key": page_key}) + 1
    doc = _cms_section_doc(page_key, payload)
    await db.cms_sections.insert_one(doc)
    return {"success": True, "section": doc}


@admin_router.put("/cms/sections/{section_id}")
async def admin_update_cms_section(section_id: str, payload: CmsSectionIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    existing = await db.cms_sections.find_one({"id": section_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="CMS section not found")
    doc = _cms_section_doc(existing["page_key"], payload, existing)
    await db.cms_sections.update_one({"id": section_id}, {"$set": doc})
    return {"success": True, "section": doc}


@admin_router.delete("/cms/sections/{section_id}")
async def admin_delete_cms_section(section_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    section = await db.cms_sections.find_one({"id": section_id}, {"_id": 0})
    if not section:
        raise HTTPException(status_code=404, detail="CMS section not found")
    result = await db.cms_sections.delete_one({"id": section_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="CMS section not found")
    remaining = await db.cms_sections.find({"page_key": section["page_key"]}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    for index, row in enumerate(remaining):
        await db.cms_sections.update_one({"id": row["id"]}, {"$set": {"sort_order": index + 1, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True}


@admin_router.patch("/cms/sections/{section_id}/visibility")
async def admin_cms_section_visibility(section_id: str, payload: CmsVisibilityIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.cms_sections.update_one(
        {"id": section_id},
        {"$set": {"enabled": payload.enabled, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="CMS section not found")
    section = await db.cms_sections.find_one({"id": section_id}, {"_id": 0})
    return {"success": True, "section": section}


@admin_router.patch("/cms/pages/{page_key}/sections/reorder")
async def admin_reorder_cms_sections(page_key: str, payload: CmsReorderIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    page_key = _normalize_cms_page_key(page_key)
    existing = await db.cms_sections.find({"page_key": page_key}, {"_id": 0}).sort("sort_order", 1).to_list(300)
    existing_ids = {row["id"] for row in existing}
    ordered_ids = []
    if payload.section_orders:
        ordered_rows = []
        for item in payload.section_orders:
            item_id = str(item.get("id") or "").strip()
            if item_id in existing_ids:
                try:
                    sort_order = int(item.get("sort_order"))
                except (TypeError, ValueError):
                    sort_order = len(ordered_rows) + 1
                ordered_rows.append({"id": item_id, "sort_order": sort_order})
        ordered_rows.sort(key=lambda row: row["sort_order"])
        ordered_ids = [row["id"] for row in ordered_rows]
    if not ordered_ids:
        ordered_ids = [section_id for section_id in payload.section_ids if section_id in existing_ids]
    for row in existing:
        if row["id"] not in ordered_ids:
            ordered_ids.append(row["id"])
    now = datetime.now(timezone.utc).isoformat()
    for index, item_id in enumerate(ordered_ids):
        await db.cms_sections.update_one({"id": item_id, "page_key": page_key}, {"$set": {"sort_order": index + 1, "updated_at": now}})
    return await _cms_page_response(page_key, public=False)


@admin_router.get("/products")
async def admin_products(current_admin: AdminBase = Depends(get_current_active_admin)):
    rows = await db.products.find({}, {"_id": 0}).to_list(100)
    logger.info(
        "Product fetch source=mongodb database=%s collection=products scope=admin count=%d",
        db_name,
        len(rows),
    )
    return [_normalize_product_media_fields(row) for row in rows]


@admin_router.get("/products/{product_id}")
async def admin_get_product(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _normalize_product_media_fields(product)


@admin_router.post("/products/{product_id}/create-payment-link")
async def admin_create_product_payment_link(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    link_result = await _create_razorpay_payment_link_for_product(product)
    await db.products.update_one({"id": product_id}, {"$set": link_result["fields"]})
    return {
        "success": True,
        "created": link_result["created"],
        "product_id": product_id,
        **link_result["fields"],
    }


@admin_router.post("/products/{product_id}/refresh-payment-link")
async def admin_refresh_product_payment_link(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    link_result = await _refresh_razorpay_payment_link_for_product(product)
    await db.products.update_one({"id": product_id}, {"$set": link_result["fields"]})
    return {
        "success": True,
        "product_id": product_id,
        **link_result["fields"],
    }


@admin_router.get("/orders")
async def admin_orders(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        rows = await db.orders.find(
            {},
            {
                "_id": 0,
                "download_file": 0,
                "download_url": 0,
                "download_token_hash": 0,
                "razorpay_signature": 0,
            },
        ).sort("created_at", -1).to_list(500)
        return [_public_order_payload(row) for row in rows]
    except Exception:
        logger.exception("Admin orders fetch failed")
        raise HTTPException(status_code=500, detail="Could not load orders")


@admin_router.post("/orders/{order_id}/resend-download-email")
async def admin_resend_download_email(order_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    order_filter = {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]}
    order = await db.orders.find_one(order_filter, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Download email can only be sent for paid orders")
    if order.get("razorpay_order_id"):
        payment_id = order.get("razorpay_payment_id")
        if not payment_id:
            await _mark_order_not_paid(order, "failed", "No Razorpay payment ID found for paid order")
            raise HTTPException(status_code=400, detail="Razorpay payment was not verified")
        verification = await _verify_razorpay_paid_order(order, payment_id)
        if not verification.get("verified"):
            await _mark_order_not_paid(order, "failed", verification.get("error") or "Razorpay payment was not verified", payment_id)
            raise HTTPException(status_code=400, detail="Razorpay payment was not verified")

    buyer_email = (order.get("customer_email") or order.get("buyer_email") or "").lower().strip()
    if not buyer_email:
        error = "Customer email is missing"
        now = datetime.now(timezone.utc).isoformat()
        update_fields = _email_delivery_update(False, error, now)
        await db.orders.update_one(order_filter, {"$set": update_fields})
        raise HTTPException(status_code=400, detail=error)

    product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
    download_fields = _product_download_fields(product, order)
    if not download_fields.get("download_file_key") and not download_fields.get("download_file"):
        error = "Download file not configured"
        now = datetime.now(timezone.utc).isoformat()
        update_fields = _email_delivery_update(False, error, now)
        await db.orders.update_one(order_filter, {"$set": update_fields})
        await _upsert_checkout_customer({**order, **update_fields}, product)
        raise HTTPException(status_code=404, detail=error)

    download_token = secrets.token_urlsafe(32)
    public_order_id = order.get("razorpay_order_id") or order.get("id")
    download_url = _paid_download_url(public_order_id, download_token)
    base_fields = {
        "download_token_hash": _hash_download_token(download_token),
        "download_url": download_url,
        **download_fields,
    }

    result = _send_download_email(
        buyer_email,
        order.get("customer_name") or order.get("buyer_name") or "there",
        order.get("product_name") or order.get("product_title") or product.get("name", "your asset"),
        order.get("razorpay_payment_id") or "paid order",
        _public_download_url(download_url),
    )
    sent, error = _normalize_email_result(result)
    now = datetime.now(timezone.utc).isoformat()
    update_fields = {
        **base_fields,
        **_email_delivery_update(sent, error, now),
    }
    if sent:
        update_fields["email_delivery_sent_at"] = now

    await db.orders.update_one(order_filter, {"$set": update_fields})
    updated_order = {**order, **update_fields}
    await _upsert_checkout_customer(updated_order, product)

    if not sent:
        raise HTTPException(status_code=502, detail=error or "Download email could not be sent")

    return {
        "success": True,
        "message": "Download email resent successfully.",
        "order": _public_order_payload(updated_order),
    }


@admin_router.post("/orders/{order_id}/sync-razorpay-status")
async def admin_sync_razorpay_status(order_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    if db is None:
        return JSONResponse(
            status_code=503,
            content={"success": False, "message": "Razorpay sync failed", "details": "Database not configured"},
        )

    try:
        order = await db.orders.find_one({"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]}, {"_id": 0})
    except Exception as exc:
        safe_detail = mongodb_public_error(exc)
        logger.exception("Razorpay sync order lookup failed local_order_id=%s error=%s", order_id, safe_detail)
        return JSONResponse(
            status_code=503,
            content={"success": False, "message": "Razorpay sync failed", "details": safe_detail},
        )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.get("razorpay_order_id"):
        raise HTTPException(status_code=400, detail="Order does not have a Razorpay order ID")
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        logger.warning(
            "Razorpay sync failed local_order_id=%s razorpay_order_id=%s error=%s summary=%s",
            order.get("id"),
            order.get("razorpay_order_id"),
            RAZORPAY_AUTH_ERROR_MESSAGE,
            razorpay_config_summary(),
        )
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Razorpay sync failed", "details": RAZORPAY_AUTH_ERROR_MESSAGE},
        )

    try:
        sync_result = await _sync_order_with_razorpay(order, send_email=False)
    except HTTPException as exc:
        safe_detail = exc.detail if isinstance(exc.detail, str) else "Razorpay sync failed"
        logger.warning(
            "Razorpay sync failed local_order_id=%s razorpay_order_id=%s error=%s",
            order.get("id"),
            order.get("razorpay_order_id"),
            safe_detail,
        )
        return JSONResponse(
            status_code=exc.status_code if exc.status_code < 500 else 502,
            content={"success": False, "message": "Razorpay sync failed", "details": safe_detail},
        )
    except Exception as exc:
        safe_detail = _razorpay_public_error(exc)
        logger.exception(
            "Razorpay sync crashed local_order_id=%s razorpay_order_id=%s error=%s",
            order.get("id"),
            order.get("razorpay_order_id"),
            safe_detail,
        )
        return JSONResponse(
            status_code=502,
            content={"success": False, "message": "Razorpay sync failed", "details": safe_detail},
        )

    synced_order = sync_result.get("order") or {}
    logger.info(
        "Razorpay sync complete local_order_id=%s razorpay_order_id=%s razorpay_payment_status=%s final_local_status=%s reason=%s",
        synced_order.get("id") or order.get("id"),
        synced_order.get("razorpay_order_id") or order.get("razorpay_order_id"),
        sync_result.get("razorpay_payment_status"),
        sync_result.get("local_status") or synced_order.get("payment_status"),
        sync_result.get("reason"),
    )
    return {
        "success": True,
        "verified_paid": sync_result.get("verified_paid"),
        "reason": sync_result.get("reason"),
        "message": "Razorpay status synced",
        "order": _public_order_payload(synced_order),
    }


@admin_router.post("/orders/recheck-razorpay")
async def admin_recheck_razorpay_payments(current_admin: AdminBase = Depends(get_current_active_admin)):
    if db is None:
        return JSONResponse(
            status_code=503,
            content={"success": False, "message": "Razorpay recheck failed", "details": "Database not configured"},
        )
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        logger.warning("Bulk Razorpay recheck failed error=%s summary=%s", RAZORPAY_AUTH_ERROR_MESSAGE, razorpay_config_summary())
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Razorpay recheck failed", "details": RAZORPAY_AUTH_ERROR_MESSAGE},
        )

    try:
        rows = await db.orders.find(
            {
                "$or": [
                    {"razorpay_order_id": {"$exists": True, "$nin": [None, ""]}},
                    {"razorpay_payment_id": {"$exists": True, "$nin": [None, ""]}},
                ]
            },
            {"_id": 0},
        ).sort("created_at", -1).to_list(500)
    except Exception as exc:
        safe_detail = mongodb_public_error(exc)
        logger.exception("Bulk Razorpay recheck order load failed error=%s", safe_detail)
        return JSONResponse(
            status_code=503,
            content={"success": False, "message": "Razorpay recheck failed", "details": safe_detail},
        )

    checked = 0
    updated_paid = 0
    failed = 0
    results = []
    for order in rows:
        checked += 1
        order_id = order.get("razorpay_order_id") or order.get("id")
        try:
            if order.get("razorpay_order_id") and not str(order.get("razorpay_order_id")).startswith("payment_link_"):
                sync_result = await _sync_order_with_razorpay(order, send_email=False)
            else:
                sync_result = await _sync_payment_with_razorpay(order, send_email=False)
            synced_order = sync_result.get("order") or {}
            if sync_result.get("verified_paid"):
                updated_paid += 1
            results.append({
                "order_id": order_id,
                "success": True,
                "verified_paid": bool(sync_result.get("verified_paid")),
                "payment_status": sync_result.get("local_status") or synced_order.get("payment_status"),
                "razorpay_payment_status": sync_result.get("razorpay_payment_status"),
                "reason": sync_result.get("reason"),
            })
        except HTTPException as exc:
            failed += 1
            safe_detail = exc.detail if isinstance(exc.detail, str) else "Razorpay recheck failed"
            logger.warning("Bulk Razorpay recheck failed order_id=%s error=%s", order_id, safe_detail)
            results.append({
                "order_id": order_id,
                "success": False,
                "details": safe_detail,
            })
        except Exception as exc:
            failed += 1
            safe_detail = _razorpay_public_error(exc)
            logger.exception("Bulk Razorpay recheck crashed order_id=%s error=%s", order_id, safe_detail)
            results.append({
                "order_id": order_id,
                "success": False,
                "details": safe_detail,
            })

    return {
        "success": True,
        "message": "Razorpay payments rechecked",
        "checked": checked,
        "updated_paid": updated_paid,
        "failed": failed,
        "results": results[:50],
    }


@admin_router.get("/customers")
async def admin_customers(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        customer_rows = await db.customers.find({}, {"_id": 0}).to_list(500)
        order_rows = await db.orders.find({}, {"_id": 0, "download_file": 0, "download_url": 0, "download_token_hash": 0, "razorpay_signature": 0}).sort("created_at", -1).to_list(1000)
    except Exception:
        logger.exception("Admin customers fetch failed")
        raise HTTPException(status_code=500, detail="Could not load customers")

    grouped: Dict[str, dict] = {}
    for customer in customer_rows:
        email = (customer.get("email") or "").lower().strip()
        if not email:
            continue
        grouped[email] = {
            **customer,
            "email": email,
            "orders": [],
            "total_spend": 0,
        }

    for order in order_rows:
        email = (order.get("customer_email") or order.get("buyer_email") or "").lower().strip()
        if not email:
            continue
        if email not in grouped:
            grouped[email] = {
                "id": str(uuid.uuid4()),
                "name": order.get("customer_name") or order.get("buyer_name") or "Customer",
                "email": email,
                "phone": order.get("customer_phone") or order.get("buyer_phone") or "",
                "created_at": order.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": order.get("verified_at") or order.get("created_at"),
                "purchased_products": [],
                "orders": [],
                "total_spend": 0,
            }

        product = {
            "id": order.get("product_id"),
            "slug": order.get("product_slug"),
            "name": order.get("product_name") or order.get("product_title"),
        }
        summary = _customer_order_summary(order, product)
        grouped[email]["orders"].append(summary)
        if summary.get("payment_status") == "paid":
            grouped[email]["total_spend"] += int(summary.get("amount") or 0)
            if summary.get("product_slug") and summary["product_slug"] not in grouped[email].get("purchased_products", []):
                grouped[email].setdefault("purchased_products", []).append(summary["product_slug"])

    customers = []
    for customer in grouped.values():
        orders = sorted(
            customer.get("orders", []),
            key=lambda item: item.get("purchase_date") or item.get("created_at") or "",
            reverse=True,
        )
        latest_order = orders[0] if orders else None
        customers.append({
            **customer,
            "orders": orders,
            "order_count": len(orders),
            "latest_purchase_at": (latest_order or {}).get("purchase_date") or (latest_order or {}).get("created_at") or customer.get("updated_at") or customer.get("created_at"),
        })

    customers.sort(key=lambda item: item.get("latest_purchase_at") or "", reverse=True)
    return customers


@admin_router.get("/enquiries")
async def admin_enquiries(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        return await db.hire_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    except Exception:
        logger.exception("Admin enquiries fetch failed")
        raise HTTPException(status_code=500, detail="Could not load enquiries")


@admin_router.patch("/enquiries/{enquiry_id}/status")
async def admin_update_enquiry_status(
    enquiry_id: str,
    payload: EnquiryStatusIn,
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.hire_requests.update_one(
        {"id": enquiry_id},
        {"$set": {"status": payload.status, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enquiry = await db.hire_requests.find_one({"id": enquiry_id}, {"_id": 0})
    return {"success": True, "enquiry": enquiry}


@admin_router.delete("/enquiries/{enquiry_id}")
async def admin_delete_enquiry(enquiry_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.hire_requests.delete_one({"id": enquiry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"success": True}


@admin_router.get("/media")
async def admin_media(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        return await db.media.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(200)
    except Exception:
        logger.exception("Admin media fetch failed")
        raise HTTPException(status_code=500, detail="Could not load media")


@admin_router.post("/media/upload")
async def admin_upload_media_library(file: UploadFile = File(...), current_admin: AdminBase = Depends(get_current_active_admin)):
    file_ext, max_bytes, media_type = _validate_media_library_upload(file)
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File exceeds the {limit_mb} MB upload limit")

    bucket = os.environ.get("CLOUDFLARE_R2_BUCKET", "pranvith-assets-public").strip()
    public_base = os.environ.get("CLOUDFLARE_R2_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not bucket or not public_base:
        raise HTTPException(status_code=500, detail="Cloudflare public R2 bucket is not configured")

    key = _r2_media_library_key(file_ext, media_type)
    try:
        _r2_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Media library R2 upload failed key=%s content_type=%s size=%d", key, file.content_type, len(content))
        raise HTTPException(status_code=502, detail="Cloudflare R2 upload failed")

    original_name = Path(file.filename or "").name
    public_url = f"{public_base}/{key}"
    now = datetime.now(timezone.utc).isoformat()
    media_record = {
        "id": str(uuid.uuid4()),
        "filename": Path(key).name,
        "original_filename": original_name,
        "title": original_name,
        "type": file.content_type,
        "mime_type": file.content_type,
        "size": len(content),
        "url": public_url,
        "public_url": public_url,
        "r2_key": key,
        "r2_bucket": bucket,
        "media_type": media_type,
        "thumbnail": None,
        "description": "",
        "used_by": [],
        "created_at": now,
        "updated_at": now,
        "uploaded_at": now,
        "tags": [],
    }
    await db.media.insert_one(media_record)
    return {"success": True, "media": media_record, "url": public_url}


@admin_router.get("/settings")
async def admin_settings(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        settings_doc = await db.settings.find_one({}, {"_id": 0})
    except Exception:
        logger.exception("Admin settings fetch failed")
        raise HTTPException(status_code=500, detail="Could not load settings")
    if not settings_doc:
        return {
            "site_name": "PranvithDOP",
            "theme": "default",
            "notifications_enabled": True,
            "site_description": "A modern CMS foundation for pages, products, orders, customers, media and settings.",
        }
    return _safe_settings(settings_doc)


@admin_router.post("/settings")
async def admin_save_settings(payload: SettingsPayload, current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        update_doc = payload.model_dump(exclude_none=True)
        await db.settings.update_one({}, {"$set": update_doc}, upsert=True)
        return {"success": True, "settings": _safe_settings(update_doc)}
    except Exception:
        logger.exception("Admin settings save failed")
        raise HTTPException(status_code=500, detail="Could not save settings")


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
    doc = _normalize_product_media_fields(payload.model_dump())
    create_payment_link = bool(doc.pop("create_razorpay_payment_link", False))
    doc["slug"] = normalize_slug(doc.get("slug") or doc.get("name"))
    if not doc["slug"]:
        raise HTTPException(status_code=422, detail="Product slug is required")
    if not doc.get("product_url"):
        doc["product_url"] = product_url_for_slug(doc["slug"])
    doc.update({
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "sold_count": 0,
    })
    existing = await db.products.find_one({"slug": doc["slug"]})
    if existing:
        raise HTTPException(status_code=409, detail="Product slug already exists")
    logger.info(
        "Product create requested database=%s collection=products id=%s slug=%s",
        db_name,
        doc["id"],
        doc["slug"],
    )
    try:
        await db.products.insert_one(doc)
    except DuplicateKeyError:
        logger.info(
            "Product create conflict database=%s collection=products slug=%s",
            db_name,
            doc["slug"],
        )
        raise HTTPException(status_code=409, detail="Product slug already exists")
    logger.info(
        "Product created database=%s collection=products id=%s slug=%s",
        db_name,
        doc["id"],
        doc["slug"],
    )
    warning = None
    if create_payment_link:
        try:
            link_result = await _create_razorpay_payment_link_for_product(doc)
            doc.update(link_result["fields"])
            await db.products.update_one({"id": doc["id"]}, {"$set": link_result["fields"]})
        except Exception as exc:
            warning = "Product saved, but Razorpay Payment Link creation failed."
            logger.warning("Product saved without Razorpay Payment Link id=%s slug=%s error=%s", doc["id"], doc["slug"], exc)
    response = {"success": True, "product": doc}
    if warning:
        response["warning"] = warning
    return response


@admin_router.put("/products/{product_id}")
async def admin_update_product(product_id: str, payload: ProductIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    update_doc = _normalize_product_media_fields(payload.model_dump(exclude_none=True))
    create_payment_link = bool(update_doc.pop("create_razorpay_payment_link", False))
    update_doc["slug"] = normalize_slug(update_doc.get("slug") or update_doc.get("name"))
    if not update_doc["slug"]:
        raise HTTPException(status_code=422, detail="Product slug is required")
    if not update_doc.get("product_url"):
        update_doc["product_url"] = product_url_for_slug(update_doc["slug"])
    existing = await db.products.find_one({"slug": update_doc["slug"], "id": {"$ne": product_id}})
    if existing:
        raise HTTPException(status_code=409, detail="Product slug already exists")
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    warning = None
    if create_payment_link:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        try:
            link_result = await _create_razorpay_payment_link_for_product(product)
            await db.products.update_one({"id": product_id}, {"$set": link_result["fields"]})
            product.update(link_result["fields"])
        except Exception as exc:
            warning = "Product saved, but Razorpay Payment Link creation failed."
            logger.warning("Product updated without Razorpay Payment Link id=%s slug=%s error=%s", product_id, update_doc["slug"], exc)
    response = {"success": True}
    if warning:
        response["warning"] = warning
    return response


@admin_router.delete("/products/{product_id}")
async def admin_delete_product(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    product = await db.products.find_one(
        {"id": product_id},
        {"_id": 0, "id": 1, "slug": 1, "name": 1},
    )
    logger.info(
        "Product deletion requested database=%s collection=products id=%s slug=%s",
        db_name,
        product_id,
        product.get("slug") if product else None,
    )
    result = await db.products.delete_one({"id": product_id})
    remaining_count = await db.products.count_documents({})
    logger.info(
        "Product deletion completed database=%s collection=products id=%s slug=%s deleted_count=%d remaining_count=%d",
        db_name,
        product_id,
        product.get("slug") if product else None,
        result.deleted_count,
        remaining_count,
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "message": "Product not found; no document was deleted",
                "product_id": product_id,
                "deleted_count": 0,
            },
        )
    return {
        "success": True,
        "message": "Product deleted from MongoDB",
        "product_id": product_id,
        "slug": product.get("slug") if product else None,
        "deleted_count": result.deleted_count,
    }


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
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_UPLOAD_TYPES = {
    ".pdf": {"application/pdf"},
    ".gif": {"image/gif"},
    ".jpeg": {"image/jpeg"},
    ".jpg": {"image/jpeg"},
    ".mp3": {"audio/mpeg"},
    ".mp4": {"video/mp4"},
    ".png": {"image/png"},
    ".webm": {"video/webm"},
    ".webp": {"image/webp"},
    ".zip": {"application/zip", "application/x-zip-compressed"},
}

R2_IMAGE_TYPES = {
    ".gif": {"image/gif"},
    ".jpeg": {"image/jpeg"},
    ".jpg": {"image/jpeg"},
    ".png": {"image/png"},
    ".webp": {"image/webp"},
}
R2_VIDEO_TYPES = {
    ".mov": {"video/quicktime", "video/mov"},
    ".mp4": {"video/mp4"},
    ".webm": {"video/webm"},
}
R2_PRIVATE_TYPES = {
    ".7z": {"application/x-7z-compressed", "application/octet-stream"},
    ".cube": {"application/octet-stream", "text/plain", "application/x-cube"},
    ".drp": {"application/octet-stream", "application/x-davinci-resolve-project"},
    ".mp4": {"video/mp4"},
    ".pdf": {"application/pdf"},
    ".prproj": {"application/octet-stream", "application/x-premiere-project"},
    ".rar": {"application/vnd.rar", "application/x-rar-compressed", "application/octet-stream"},
    ".xmp": {"application/octet-stream", "application/xml", "text/xml", "text/plain"},
    ".zip": {"application/zip", "application/x-zip-compressed", "application/octet-stream"},
}
R2_PUBLIC_PURPOSES = {"product-image", "product-video", "before-image", "after-image", "banner", "thumbnail"}
R2_PRIVATE_PURPOSES = {"paid-download", "zip-file", "project-file", "lut-pack", "template-pack", "course-material"}
R2_MAX_IMAGE_BYTES = 10 * 1024 * 1024
R2_MAX_VIDEO_BYTES = 100 * 1024 * 1024
R2_MAX_PRIVATE_BYTES = 500 * 1024 * 1024


def _r2_client():
    if boto3 is None:
        raise HTTPException(status_code=500, detail="R2 upload dependency is not installed")
    account_id = os.environ.get("CLOUDFLARE_R2_ACCOUNT_ID", "").strip()
    endpoint = os.environ.get("CLOUDFLARE_R2_ENDPOINT", "").strip()
    if account_id and "ACCOUNT_ID" in endpoint:
        endpoint = endpoint.replace("ACCOUNT_ID", account_id)
    required = {
        "CLOUDFLARE_R2_ACCESS_KEY_ID": os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY": os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
        "CLOUDFLARE_R2_ENDPOINT": endpoint,
    }
    if not all(required.values()):
        raise HTTPException(status_code=500, detail="Cloudflare R2 is not configured")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=required["CLOUDFLARE_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=required["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def _safe_filename(filename: str) -> str:
    name = Path(filename or "download").name.strip()
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip(".-")
    return safe or "download"


def _r2_public_object_key(product_slug: str, purpose: str, file_ext: str) -> str:
    slug = normalize_slug(product_slug)
    if not slug:
        raise HTTPException(status_code=422, detail="product_slug is required")
    if purpose not in R2_PUBLIC_PURPOSES:
        raise HTTPException(status_code=422, detail="Unsupported upload purpose")
    file_id = str(uuid.uuid4())
    if purpose == "product-image":
        return f"products/{slug}/images/{file_id}{file_ext}"
    if purpose == "product-video":
        return f"products/{slug}/videos/{file_id}{file_ext}"
    if purpose == "before-image":
        return f"products/{slug}/before-after/before-{file_id}{file_ext}"
    if purpose == "after-image":
        return f"products/{slug}/before-after/after-{file_id}{file_ext}"
    return f"products/{slug}/media/{purpose}-{file_id}{file_ext}"


def _r2_private_object_key(product_slug: str, purpose: str, safe_filename: str) -> str:
    slug = normalize_slug(product_slug)
    if not slug:
        raise HTTPException(status_code=422, detail="product_slug is required")
    if purpose not in R2_PRIVATE_PURPOSES:
        raise HTTPException(status_code=422, detail="Unsupported upload purpose")
    return f"downloads/{slug}/{purpose}/{uuid.uuid4()}-{safe_filename}"


def _validate_r2_public_upload(file: UploadFile, purpose: str) -> tuple[str, int]:
    original_name = Path(file.filename or "").name
    file_ext = Path(original_name).suffix.lower()
    if purpose in {"product-image", "before-image", "after-image", "banner", "thumbnail"}:
        allowed_types = R2_IMAGE_TYPES.get(file_ext)
        max_bytes = R2_MAX_IMAGE_BYTES
    elif purpose == "product-video":
        allowed_types = R2_VIDEO_TYPES.get(file_ext)
        max_bytes = R2_MAX_VIDEO_BYTES
    else:
        raise HTTPException(status_code=422, detail="Unsupported upload purpose")
    if not allowed_types or file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported file type")
    return file_ext, max_bytes


def _validate_r2_private_upload(file: UploadFile, purpose: str) -> tuple[str, str, int]:
    if purpose not in R2_PRIVATE_PURPOSES:
        raise HTTPException(status_code=422, detail="Unsupported upload purpose")
    safe_filename = _safe_filename(file.filename or "download")
    file_ext = Path(safe_filename).suffix.lower()
    allowed_types = R2_PRIVATE_TYPES.get(file_ext)
    if not allowed_types or file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported file type")
    return file_ext, safe_filename, R2_MAX_PRIVATE_BYTES


def _validate_media_library_upload(file: UploadFile) -> tuple[str, int, str]:
    original_name = Path(file.filename or "").name
    file_ext = Path(original_name).suffix.lower()
    if file_ext in R2_IMAGE_TYPES:
        allowed_types = R2_IMAGE_TYPES[file_ext]
        media_type = "image"
        max_bytes = R2_MAX_IMAGE_BYTES
    elif file_ext in R2_VIDEO_TYPES:
        allowed_types = R2_VIDEO_TYPES[file_ext]
        media_type = "video"
        max_bytes = R2_MAX_VIDEO_BYTES
    elif file_ext in {".pdf", ".zip"}:
        allowed_types = ALLOWED_UPLOAD_TYPES.get(file_ext)
        media_type = "file"
        max_bytes = MAX_UPLOAD_BYTES
    else:
        raise HTTPException(status_code=415, detail="Unsupported file type")
    if not allowed_types or file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported file type")
    return file_ext, max_bytes, media_type


def _r2_media_library_key(file_ext: str, media_type: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y/%m")
    return f"media-library/{media_type}/{today}/{uuid.uuid4()}{file_ext}"


def _document_contains_value(value: Any, target: str) -> bool:
    if isinstance(value, str):
        return value == target
    if isinstance(value, list):
        return any(_document_contains_value(item, target) for item in value)
    if isinstance(value, dict):
        return any(_document_contains_value(item, target) for item in value.values())
    return False


async def _media_usage_locations(media_url: str) -> list[str]:
    if not media_url:
        return []

    checks = [
        ("products", "product"),
        ("pages", "page"),
        ("cms_pages", "CMS page"),
        ("cms_sections", "CMS section"),
        ("settings", "website settings"),
        ("courses", "course"),
        ("testimonials", "testimonial"),
        ("blog_posts", "blog post"),
    ]
    locations = []
    for collection_name, label in checks:
        collection = getattr(db, collection_name, None)
        if collection is None:
            continue
        try:
            rows = await collection.find({}, {"_id": 0}).to_list(500)
        except Exception:
            logger.exception("Media usage check failed collection=%s", collection_name)
            continue
        for row in rows:
            if _document_contains_value(row, media_url):
                name = row.get("name") or row.get("title") or row.get("slug") or row.get("id") or label
                locations.append(f"{label}: {name}")
                break
    return locations


def _safe_local_upload_path(media_url: str) -> Optional[Path]:
    prefix = "/api/uploads/"
    if not media_url or not media_url.startswith(prefix):
        return None
    filename = Path(media_url.replace(prefix, "", 1)).name
    if not filename or filename != media_url.replace(prefix, "", 1):
        raise HTTPException(status_code=400, detail="Unsafe media path")
    upload_root = UPLOAD_DIR.resolve()
    target = (upload_root / filename).resolve()
    if upload_root not in target.parents and target != upload_root:
        raise HTTPException(status_code=400, detail="Unsafe media path")
    return target


def _r2_public_key_from_url(media_url: str) -> Optional[str]:
    public_base = os.environ.get("CLOUDFLARE_R2_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not public_base or not media_url:
        return None
    if not media_url.startswith(f"{public_base}/"):
        return None
    key = media_url.replace(f"{public_base}/", "", 1).strip("/")
    if not key or ".." in Path(key).parts:
        raise HTTPException(status_code=400, detail="Unsafe media key")
    return key


def _media_r2_key_and_bucket(media: dict) -> tuple[Optional[str], Optional[str]]:
    key = media.get("key") or media.get("object_key") or media.get("r2_key")
    bucket = media.get("bucket") or media.get("r2_bucket") or os.environ.get("CLOUDFLARE_R2_BUCKET", "pranvith-assets-public").strip()
    if not key:
        key = _r2_public_key_from_url(media.get("url") or "")
    if key:
        parts = Path(str(key)).parts
        if str(key).startswith("/") or ".." in parts:
            raise HTTPException(status_code=400, detail="Unsafe media key")
    return key, bucket


def _delete_media_storage(media: dict) -> dict:
    media_url = media.get("url") or ""
    local_path = _safe_local_upload_path(media_url)
    if local_path:
        if local_path.exists():
            local_path.unlink()
        return {"storage": "local", "deleted": True}

    key, bucket = _media_r2_key_and_bucket(media)
    if key and bucket:
        try:
            _r2_client().delete_object(Bucket=bucket, Key=key)
        except HTTPException:
            raise
        except Exception:
            logger.exception("R2 delete failed key=%s bucket=%s", key, bucket)
            raise HTTPException(status_code=502, detail="Cloudflare R2 delete failed")
        return {"storage": "r2", "deleted": True}

    return {"storage": "external_or_unknown", "deleted": False}


@admin_router.post("/uploads/public")
async def admin_upload_public_media(
    file: UploadFile = File(...),
    product_slug: str = Form(...),
    purpose: str = Form(...),
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    file_ext, max_bytes = _validate_r2_public_upload(file, purpose)
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File exceeds the {limit_mb} MB upload limit")

    key = _r2_public_object_key(product_slug, purpose, file_ext)
    bucket = os.environ.get("CLOUDFLARE_R2_BUCKET", "pranvith-assets-public").strip()
    public_base = os.environ.get("CLOUDFLARE_R2_PUBLIC_BASE_URL", "").strip().rstrip("/")
    if not bucket or not public_base:
        raise HTTPException(status_code=500, detail="Cloudflare public R2 bucket is not configured")
    try:
        _r2_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("R2 upload failed key=%s content_type=%s size=%d", key, file.content_type, len(content))
        raise HTTPException(status_code=502, detail="Cloudflare R2 upload failed")
    return {
        "url": f"{public_base}/{key}",
        "key": key,
    }


@admin_router.post("/uploads/private")
async def admin_upload_private_download(
    file: UploadFile = File(...),
    product_slug: str = Form(...),
    purpose: str = Form(...),
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    _file_ext, safe_filename, max_bytes = _validate_r2_private_upload(file, purpose)
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File exceeds the {limit_mb} MB upload limit")

    bucket = os.environ.get("CLOUDFLARE_R2_PRIVATE_BUCKET", "pranvith-paid-downloads").strip()
    if not bucket:
        raise HTTPException(status_code=500, detail="Cloudflare private R2 bucket is not configured")
    key = _r2_private_object_key(product_slug, purpose, safe_filename)
    try:
        _r2_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Private R2 upload failed key=%s content_type=%s size=%d", key, file.content_type, len(content))
        raise HTTPException(status_code=502, detail="Cloudflare R2 upload failed")
    return {
        "key": key,
        "bucket": bucket,
        "filename": safe_filename,
    }


@admin_router.post("/uploads")
async def admin_upload_product_media(
    file: UploadFile = File(...),
    type: str = Form(...),
    product_slug: str = Form(...),
    purpose: str = Form(...),
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    return await admin_upload_public_media(file, product_slug, purpose, current_admin)


@admin_router.post("/upload")
async def admin_upload_file(file: UploadFile = File(...), current_admin: AdminBase = Depends(get_current_active_admin)):
    """Upload a file and create a media record."""
    try:
        original_name = Path(file.filename or "").name
        file_ext = Path(original_name).suffix.lower()
        allowed_types = ALLOWED_UPLOAD_TYPES.get(file_ext)
        if not allowed_types or file.content_type not in allowed_types:
            raise HTTPException(status_code=415, detail="Unsupported file type")

        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds the 25 MB upload limit")

        file_id = str(uuid.uuid4())
        saved_filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / saved_filename

        with open(file_path, "wb") as f:
            f.write(content)

        media_record = {
            "id": file_id,
            "title": original_name,
            "type": file.content_type,
            "url": f"/api/uploads/{saved_filename}",
            "thumbnail": None,
            "description": "",
            "size": len(content),
            "filename": original_name,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "tags": [],
        }
        
        await db.media.insert_one(media_record)
        
        return {
            "success": True,
            "media": media_record,
            "message": "File uploaded successfully",
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("File upload failed")
        raise HTTPException(status_code=500, detail="Upload failed")


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
    media = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")

    usage_locations = await _media_usage_locations(media.get("url") or "")
    if usage_locations:
        raise HTTPException(
            status_code=409,
            detail="This media file is currently used on the website. Remove it from the page/product first.",
        )

    storage_result = _delete_media_storage(media)
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media item not found")
    return {"success": True, **storage_result}


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
        "cms_pages",
        "cms_sections",
        "settings",
        "seed_state",
        "downloads",
        "coupons",
        "hire_requests",
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
    try:
        await db.cms_pages.create_index("page_key", unique=True)
    except Exception:
        pass
    try:
        await db.cms_sections.create_index([("page_key", 1), ("sort_order", 1)])
    except Exception:
        pass
    try:
        await db.media.create_index("r2_key")
    except Exception:
        pass
    try:
        await db.webhook_events.create_index("id", unique=True)
    except Exception:
        pass
    try:
        await db.seed_state.create_index("key", unique=True)
    except Exception:
        pass


async def synchronize_default_admin():
    if db is None:
        return {"action": "skipped", "reason": "database_not_configured"}

    default_email = (DEFAULT_ADMIN_EMAIL or "").lower().strip()
    default_password = DEFAULT_ADMIN_PASSWORD or ""
    default_name = DEFAULT_ADMIN_NAME

    if not default_email or not default_password:
        raise ValueError("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD must be configured")

    existing = await db.admins.find_one({"email": default_email})
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        updates = {
            "role": "super_admin",
            "permissions": ["super_admin", "admin", "editor"],
            "is_active": True,
            "updated_at": now,
        }
        if not existing.get("hashed_password"):
            updates["hashed_password"] = get_password_hash(default_password)
        await db.admins.update_one({"email": default_email}, {"$set": updates})
        logger.info("Default admin synchronized")
        return {"action": "synchronized", "email": default_email}

    admin_doc = {
        "id": str(uuid.uuid4()),
        "name": default_name,
        "email": default_email,
        "role": "super_admin",
        "permissions": ["super_admin", "admin", "editor"],
        "is_active": True,
        "hashed_password": get_password_hash(default_password),
        "created_at": now,
        "updated_at": now,
    }
    await db.admins.insert_one(admin_doc)
    logger.info("Admin created")
    return {"action": "created", "email": default_email}


async def initialize_default_products():
    seed_state = await db.seed_state.find_one({"key": INITIAL_PRODUCT_SEED_KEY})
    existing_count = await db.products.count_documents({})
    if seed_state:
        logger.info(
            "Startup product seed skipped key=%s database=%s collection=products existing_count=%d",
            INITIAL_PRODUCT_SEED_KEY,
            db_name,
            existing_count,
        )
        return {"action": "skipped", "existing_count": existing_count}

    seeded_count = 0
    if existing_count == 0:
        for product in ASSET_PRODUCTS:
            result = await db.products.update_one(
                {"slug": product["slug"]},
                {"$setOnInsert": dict(product)},
                upsert=True,
            )
            if result.upserted_id is not None:
                seeded_count += 1
        action = "seeded"
    else:
        action = "adopted_existing_catalog"

    await db.seed_state.update_one(
        {"key": INITIAL_PRODUCT_SEED_KEY},
        {
            "$setOnInsert": {
                "key": INITIAL_PRODUCT_SEED_KEY,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    logger.info(
        "Startup product seed completed key=%s action=%s database=%s collection=products existing_count=%d seeded_count=%d",
        INITIAL_PRODUCT_SEED_KEY,
        action,
        db_name,
        existing_count,
        seeded_count,
    )
    return {
        "action": action,
        "existing_count": existing_count,
        "seeded_count": seeded_count,
    }


@app.on_event("startup")
async def on_startup():
    logger.info("MongoDB configuration: %s", mongodb_config_summary())
    logger.info("Razorpay configured: %s", razorpay_client is not None)
    logger.info("SMTP configured: %s", smtp_configured())
    if db is None:
        logger.warning("MongoDB connection status: not_configured")
        logger.warning("MONGO_URL and DB_NAME are not configured; using public seed-data fallbacks.")
        return
    try:
        await db.command("ping")
        logger.info("MongoDB connection status: connected db=%s", db_name)
    except Exception as exc:
        logger.exception("MongoDB connection status: failed category=%s", mongodb_error_category(exc))
        if IS_DEVELOPMENT:
            logger.warning("MongoDB development error detail: %s", exc)
        return
    await prepare_cms_collections()
    await synchronize_default_admin()
    # Seed default content in the background to keep startup responsive.
    asyncio.create_task(_seed_db())


api_router.include_router(admin_router)


# ---------- Razorpay ----------
DEFAULT_PUBLIC_SITE_URL = "https://pranvithdop.com"


def _normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s().-]+", "", phone or "")
    if not re.fullmatch(r"\+?\d{7,15}", cleaned):
        raise HTTPException(status_code=422, detail="Enter a valid phone number")
    return cleaned


def _hash_download_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _public_site_base() -> str:
    return (
        os.environ.get("PUBLIC_SITE_URL")
        or os.environ.get("FRONTEND_URL")
        or os.environ.get("PUBLIC_BASE_URL")
        or DEFAULT_PUBLIC_SITE_URL
    ).rstrip("/")


def _paid_download_url(order_id: str, token: str) -> str:
    return f"{_public_site_base()}/api/orders/{order_id}/download?token={token}"


def _public_download_url(download_url: str) -> str:
    if download_url.startswith("/"):
        return f"{_public_site_base()}{download_url}"
    return download_url


def _validated_download_url(download_url: str) -> str:
    try:
        parsed = urlparse(download_url)
    except ValueError:
        raise HTTPException(status_code=500, detail="Download URL is invalid")
    allowed_schemes = {"https"}
    if IS_DEVELOPMENT:
        allowed_schemes.add("http")
    if (
        parsed.scheme.lower() not in allowed_schemes
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        raise HTTPException(status_code=500, detail="Download URL is not allowed")
    return download_url


def _product_download_fields(product: dict, order: Optional[dict] = None) -> dict:
    source = {**(product or {}), **(order or {})}
    download_key = source.get("download_file_key")
    if download_key:
        return {
            "download_file_key": download_key,
            "download_file_name": source.get("download_file_name") or Path(download_key).name,
            "download_file_bucket": source.get("download_file_bucket") or os.environ.get("CLOUDFLARE_R2_PRIVATE_BUCKET", "pranvith-paid-downloads"),
            "download_file": source.get("download_file") or source.get("download_file_url"),
        }
    download_file = source.get("download_file") or source.get("download_file_url")
    if download_file:
        return {
            "download_file": download_file,
            "download_file_url": download_file,
        }
    return {}


def _private_download_presigned_url(key: str, bucket: Optional[str] = None, expires_in: int = 300) -> str:
    resolved_bucket = bucket or os.environ.get("CLOUDFLARE_R2_PRIVATE_BUCKET", "pranvith-paid-downloads")
    if not key or not resolved_bucket:
        raise HTTPException(status_code=404, detail="Download file not configured")
    try:
        return _r2_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": resolved_bucket, "Key": key},
            ExpiresIn=expires_in,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Private R2 presigned URL generation failed bucket=%s key=%s", resolved_bucket, key)
        raise HTTPException(status_code=502, detail="Download is temporarily unavailable")


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


def _payment_link_amount_paise(product: dict) -> int:
    price_rupees = product.get("sale_price")
    if price_rupees is None:
        price_rupees = product.get("price", 0)
    amount = int(round(float(price_rupees or 0) * 100))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment Link requires a paid product")
    if amount < 100:
        raise HTTPException(status_code=400, detail="Amount must be at least 100 paise")
    return amount


def _payment_link_fields(payment_link: dict) -> dict:
    return {
        "razorpay_payment_link_id": payment_link.get("id"),
        "razorpay_payment_link_url": payment_link.get("short_url") or payment_link.get("url"),
        "razorpay_payment_link_status": payment_link.get("status"),
    }


def _payment_link_reference(product: dict) -> str:
    return f"cms-product-{product.get('slug') or product.get('id')}"


async def _create_razorpay_payment_link_for_product(product: dict, force: bool = False) -> dict:
    client = _require_razorpay_client()
    if product.get("razorpay_payment_link_id") and not force:
        return {
            "created": False,
            "payment_link": {
                "id": product.get("razorpay_payment_link_id"),
                "short_url": product.get("razorpay_payment_link_url"),
                "status": product.get("razorpay_payment_link_status"),
            },
            "fields": {
                "razorpay_payment_link_id": product.get("razorpay_payment_link_id"),
                "razorpay_payment_link_url": product.get("razorpay_payment_link_url"),
                "razorpay_payment_link_status": product.get("razorpay_payment_link_status"),
            },
        }
    amount = _payment_link_amount_paise(product)
    payload = {
        "amount": amount,
        "currency": "INR",
        "description": f"PranvithDOP product: {product.get('name', 'Product')}",
        "reference_id": _payment_link_reference(product),
        "notes": {
            "product_id": product.get("id", ""),
            "product_slug": product.get("slug", ""),
            "product_name": product.get("name", ""),
        },
    }
    try:
        payment_link = client.payment_link.create(payload)
    except HTTPException:
        raise
    except Exception as exc:
        if _is_razorpay_auth_error(exc):
            logger.warning("Razorpay Payment Link authentication failed product_id=%s slug=%s config=%s error=%s", product.get("id"), product.get("slug"), razorpay_config_summary(), _razorpay_error_summary(exc))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay Payment Link creation failed product_id=%s slug=%s", product.get("id"), product.get("slug"))
        raise HTTPException(status_code=502, detail=_razorpay_public_error(exc))
    fields = _payment_link_fields(payment_link)
    return {"created": True, "payment_link": payment_link, "fields": fields}


async def _refresh_razorpay_payment_link_for_product(product: dict) -> dict:
    payment_link_id = product.get("razorpay_payment_link_id")
    if not payment_link_id:
        raise HTTPException(status_code=404, detail="Razorpay Payment Link is not configured for this product")
    client = _require_razorpay_client()
    try:
        payment_link = client.payment_link.fetch(payment_link_id)
    except Exception as exc:
        if _is_razorpay_auth_error(exc):
            logger.warning("Razorpay Payment Link refresh authentication failed product_id=%s payment_link_id=%s config=%s error=%s", product.get("id"), payment_link_id, razorpay_config_summary(), _razorpay_error_summary(exc))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay Payment Link refresh failed product_id=%s payment_link_id=%s", product.get("id"), payment_link_id)
        raise HTTPException(status_code=502, detail=_razorpay_public_error(exc))
    fields = _payment_link_fields(payment_link)
    return {"payment_link": payment_link, "fields": fields}


def _customer_order_summary(order: dict, product: dict) -> dict:
    email_delivery_status = order.get("email_delivery_status")
    if not email_delivery_status:
        email_delivery_status = "sent" if order.get("email_sent") else ("failed" if order.get("email_error") else "pending")
    email_delivery_error = order.get("email_delivery_error")
    if email_delivery_error is None:
        email_delivery_error = order.get("email_error")
    return {
        "order_id": order.get("id"),
        "razorpay_order_id": order.get("razorpay_order_id"),
        "razorpay_payment_id": order.get("razorpay_payment_id"),
        "product_id": product.get("id"),
        "product_slug": product.get("slug") or order.get("product_slug"),
        "product_name": order.get("product_name") or order.get("product_title") or product.get("name"),
        "asset_slug": product.get("slug") or order.get("product_slug"),
        "asset_title": order.get("product_name") or order.get("product_title") or product.get("name"),
        "amount": int(order.get("amount") or 0),
        "currency": order.get("currency", "INR"),
        "payment_status": order.get("payment_status") or order.get("status") or "pending",
        "status": order.get("status") or order.get("payment_status") or "pending",
        "purchase_date": order.get("paid_at") or order.get("verified_at") or order.get("created_at"),
        "created_at": order.get("created_at"),
        "paid_at": order.get("paid_at"),
        "email_delivery_status": email_delivery_status,
        "email_delivery_error": email_delivery_error,
        "email_sent": email_delivery_status == "sent",
        "email_error": email_delivery_error,
        "email_attempted_at": order.get("email_attempted_at"),
        "email_delivery_attempted_at": order.get("email_delivery_attempted_at") or order.get("email_attempted_at"),
    }


async def _upsert_checkout_customer(order: dict, product: dict) -> None:
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
    }
    await db.customers.update_one(
        {"email": email},
        {"$set": customer_doc, "$setOnInsert": set_on_insert},
        upsert=True,
    )

    await _rebuild_customer_purchase_summary(email, fallback_order=order, fallback_product=product)


async def _rebuild_customer_purchase_summary(email: str, fallback_order: Optional[dict] = None, fallback_product: Optional[dict] = None) -> None:
    if db is None:
        return
    normalized_email = (email or "").lower().strip()
    if not normalized_email:
        return

    order_rows = []
    try:
        order_rows = await db.orders.find(
            {
                "$or": [
                    {"customer_email": normalized_email},
                    {"buyer_email": normalized_email},
                ]
            },
            {"_id": 0},
        ).sort("created_at", -1).to_list(1000)
    except AttributeError:
        if fallback_order:
            order_rows = [fallback_order]
    except Exception:
        logger.exception("Customer purchase summary rebuild failed while loading orders email=%s", normalized_email)
        if fallback_order:
            order_rows = [fallback_order]
        else:
            raise

    seen_orders = set()
    summaries = []
    paid_summaries = []
    purchased_products = []
    total_spend = 0

    for order_row in order_rows:
        key = order_row.get("razorpay_order_id") or order_row.get("id")
        if key and key in seen_orders:
            continue
        if key:
            seen_orders.add(key)
        product = {
            "id": order_row.get("product_id") or (fallback_product or {}).get("id"),
            "slug": order_row.get("product_slug") or (fallback_product or {}).get("slug"),
            "name": order_row.get("product_name") or order_row.get("product_title") or (fallback_product or {}).get("name"),
        }
        summary = _customer_order_summary(order_row, product)
        summaries.append(summary)
        if summary.get("payment_status") == "paid":
            paid_summaries.append(summary)
            total_spend += int(summary.get("amount") or 0)
            slug = summary.get("product_slug") or summary.get("asset_slug")
            if slug and slug not in purchased_products:
                purchased_products.append(slug)

    summaries.sort(key=lambda item: item.get("purchase_date") or item.get("created_at") or "", reverse=True)
    paid_summaries.sort(key=lambda item: item.get("purchase_date") or item.get("created_at") or "", reverse=True)

    await db.customers.update_one(
        {"email": normalized_email},
        {"$set": {
            "orders": summaries,
            "purchase_history": paid_summaries,
            "purchased_products": purchased_products,
            "total_spend": total_spend,
            "total_paid": total_spend,
            "order_count": len(summaries),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )


def _email_delivery_update(sent: bool, error: Optional[str], attempted_at: str) -> dict:
    return {
        "email_delivery_status": "sent" if sent else "failed",
        "email_delivery_error": None if sent else error,
        "email_delivery_attempted_at": attempted_at,
        "email_sent": sent,
        "email_error": None if sent else error,
        "email_attempted_at": attempted_at,
    }


def _normalize_email_result(result: Any) -> tuple[bool, Optional[str]]:
    if isinstance(result, bool):
        return result, None if result else "Download email could not be sent. Please use the Download Now button."
    if isinstance(result, dict):
        sent = bool(result.get("sent"))
        return sent, None if sent else (result.get("error") or "Download email could not be sent. Please use the Download Now button.")
    return False, "Download email could not be sent. Please use the Download Now button."


def _public_order_payload(order: dict) -> dict:
    hidden_fields = {"_id", "download_file", "download_url", "download_token_hash", "razorpay_signature"}
    return {key: value for key, value in order.items() if key not in hidden_fields}


def _smtp_error_message(exc: Exception) -> str:
    detail = str(exc).strip()
    return f"{type(exc).__name__}: {detail}" if detail else type(exc).__name__


def _send_download_email(to_email: str, buyer_name: str, product_name: str, payment_id: str, download_url: str) -> dict:
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port_value = os.environ.get("SMTP_PORT", "587") or "587"
    try:
        smtp_port = int(smtp_port_value)
    except (TypeError, ValueError):
        error = "SMTP_PORT is invalid"
        logger.warning("Download email skipped: %s", error)
        return {"sent": False, "error": error}
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_from = os.environ.get("FROM_EMAIL") or os.environ.get("SMTP_FROM") or smtp_user
    if not all([smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from]):
        error = "SMTP is not fully configured"
        logger.warning("Download email skipped: %s", error)
        return {"sent": False, "error": error}

    msg = EmailMessage()
    msg["Subject"] = "Your download is ready - PranvithDOP"
    msg["From"] = smtp_from
    msg["To"] = to_email
    safe_buyer_name = html.escape(buyer_name)
    safe_product_name = html.escape(product_name)
    safe_download_url = html.escape(download_url, quote=True)
    msg.set_content(
        "\n".join([
            f"Hi {buyer_name},",
            "",
            "Thank you for your purchase.",
            "",
            "Your download is ready:",
            download_url,
            "",
            "Product:",
            product_name,
            "",
            "Regards,",
            "PranvithDOP",
        ])
    )
    msg.add_alternative(
        "\n".join([
            "<!doctype html>",
            "<html>",
            "  <body>",
            f"    <p>Hi {safe_buyer_name},</p>",
            "    <p>Thank you for your purchase.</p>",
            f"    <p>Your download is ready: <a href=\"{safe_download_url}\">{safe_download_url}</a></p>",
            f"    <p><strong>Product:</strong> {safe_product_name}</p>",
            "    <p>Regards,<br>PranvithDOP</p>",
            "  </body>",
            "</html>",
        ]),
        subtype="html",
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
        logger.info("Download email sent via SMTP to=%s product=%s payment_id=%s", to_email, product_name, payment_id)
        return {"sent": True, "error": None}
    except Exception as exc:
        error = _smtp_error_message(exc)
        logger.exception("Download email SMTP failure to=%s product=%s payment_id=%s error=%s", to_email, product_name, payment_id, error)
        return {"sent": False, "error": error}


def _send_confirmation_email(to_email: str, buyer_name: str, product_name: str, payment_id: str, download_url: str) -> bool:
    return _send_download_email(to_email, buyer_name, product_name, payment_id, download_url)


def _razorpay_public_error(exc: Exception) -> str:
    detail = str(exc).strip()
    if not detail:
        return "Razorpay verification failed"
    return detail[:240]


def _extract_razorpay_items(response: Any) -> list:
    if isinstance(response, dict):
        items = response.get("items")
        return items if isinstance(items, list) else []
    return []


async def _fetch_razorpay_order(razorpay_order_id: str) -> Optional[dict]:
    client = _require_razorpay_client()
    try:
        return client.order.fetch(razorpay_order_id)
    except Exception as exc:
        if _is_razorpay_auth_error(exc):
            logger.warning("Razorpay order fetch authentication failed order_id=%s config=%s error=%s", razorpay_order_id, razorpay_config_summary(), _razorpay_error_summary(exc))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay order fetch failed order_id=%s", razorpay_order_id)
        raise HTTPException(status_code=502, detail=_razorpay_public_error(exc))


async def _fetch_razorpay_order_payments(razorpay_order_id: str) -> list:
    client = _require_razorpay_client()
    try:
        return _extract_razorpay_items(client.order.payments(razorpay_order_id))
    except Exception as exc:
        if _is_razorpay_auth_error(exc):
            logger.warning("Razorpay order payments authentication failed order_id=%s config=%s error=%s", razorpay_order_id, razorpay_config_summary(), _razorpay_error_summary(exc))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay order payments fetch failed order_id=%s", razorpay_order_id)
        raise HTTPException(status_code=502, detail=_razorpay_public_error(exc))


async def _fetch_razorpay_payment(razorpay_payment_id: str) -> dict:
    client = _require_razorpay_client()
    try:
        return client.payment.fetch(razorpay_payment_id)
    except Exception as exc:
        if _is_razorpay_auth_error(exc):
            logger.warning("Razorpay payment fetch authentication failed payment_id=%s config=%s error=%s", razorpay_payment_id, razorpay_config_summary(), _razorpay_error_summary(exc))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay payment fetch failed payment_id=%s", razorpay_payment_id)
        raise HTTPException(status_code=502, detail=_razorpay_public_error(exc))


def _expected_order_amount(order: dict) -> int:
    return int(order.get("amount") or 0)


def _order_age_seconds(order: dict) -> Optional[float]:
    created_at = order.get("created_at")
    if not created_at:
        return None
    try:
        created = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - created).total_seconds()
    except (TypeError, ValueError):
        return None


def _status_for_uncaptured_sync(order: dict, razorpay_order: Optional[dict], payments: list) -> tuple[str, str]:
    if (order.get("payment_status") or order.get("status")) == "cancelled":
        return "cancelled", "Checkout was cancelled"

    for payment in payments:
        if payment.get("status") == "authorized":
            return "pending", "Razorpay payment is authorized but not captured"

    razorpay_status = (razorpay_order or {}).get("status")
    age_seconds = _order_age_seconds(order)
    if age_seconds is not None and age_seconds >= 30 * 60:
        return "cancelled", f"No captured Razorpay payment found; Razorpay order is {razorpay_status or 'not paid'}"

    if razorpay_status in {"created", "attempted"}:
        return "pending", f"Razorpay order is {razorpay_status}"

    return "pending", f"Razorpay order is {razorpay_status or 'not paid'}"


def _is_captured_payment_for_order(payment: dict, order: dict) -> tuple[bool, str]:
    stored_order_id = order.get("razorpay_order_id")
    expected_amount = _expected_order_amount(order)
    expected_currency = (order.get("currency") or "INR").upper()
    if not payment:
        return False, "Razorpay payment not found"
    if payment.get("order_id") != stored_order_id:
        return False, "Razorpay payment order mismatch"
    if payment.get("status") != "captured":
        return False, f"Razorpay payment is {payment.get('status') or 'not captured'}"
    if payment.get("captured") is not True:
        return False, "Razorpay payment was not captured"
    if int(payment.get("amount") or 0) != expected_amount:
        return False, "Razorpay payment amount mismatch"
    if (payment.get("currency") or "").upper() != expected_currency:
        return False, "Razorpay payment currency mismatch"
    if expected_currency != "INR":
        return False, "Razorpay payment currency must be INR"
    return True, ""


def _is_paid_razorpay_order(razorpay_order: Optional[dict], order: dict) -> tuple[bool, str]:
    if not razorpay_order:
        return False, "Razorpay order not found"
    expected_amount = _expected_order_amount(order)
    if razorpay_order.get("id") != order.get("razorpay_order_id"):
        return False, "Razorpay order mismatch"
    if razorpay_order.get("status") != "paid":
        return False, f"Razorpay order is {razorpay_order.get('status') or 'not paid'}"
    if int(razorpay_order.get("amount_paid") or 0) != expected_amount:
        return False, "Razorpay order paid amount mismatch"
    return True, ""


def _is_captured_webhook_payment(payment: dict, order: dict) -> tuple[bool, str]:
    if not payment:
        return False, "Webhook payment payload missing"
    if payment.get("order_id") and payment.get("order_id") != order.get("razorpay_order_id"):
        return False, "Webhook payment order mismatch"
    if not payment.get("order_id") and not (payment.get("payment_link_id") or payment.get("payment_link") or order.get("razorpay_payment_link_id")):
        return False, "Webhook payment order missing"
    if payment.get("status") != "captured":
        return False, f"Webhook payment is {payment.get('status') or 'not captured'}"
    if payment.get("captured") is not True:
        return False, "Webhook payment was not captured"
    if int(payment.get("amount") or 0) != _expected_order_amount(order):
        return False, "Webhook payment amount mismatch"
    if (payment.get("currency") or "").upper() != (order.get("currency") or "INR").upper():
        return False, "Webhook payment currency mismatch"
    return True, ""


def _is_paid_webhook_order(razorpay_order: dict, order: dict) -> tuple[bool, str]:
    if not razorpay_order:
        return False, "Webhook order payload missing"
    if razorpay_order.get("id") != order.get("razorpay_order_id"):
        return False, "Webhook order mismatch"
    if razorpay_order.get("status") != "paid":
        return False, f"Webhook order is {razorpay_order.get('status') or 'not paid'}"
    amount_paid = razorpay_order.get("amount_paid", razorpay_order.get("amount"))
    if int(amount_paid or 0) != _expected_order_amount(order):
        return False, "Webhook order paid amount mismatch"
    webhook_currency = (razorpay_order.get("currency") or order.get("currency") or "INR").upper()
    if webhook_currency != (order.get("currency") or "INR").upper():
        return False, "Webhook order currency mismatch"
    return True, ""


def _webhook_notes(*entities: dict) -> dict:
    for entity in entities:
        notes = (entity or {}).get("notes")
        if isinstance(notes, dict):
            return notes
    return {}


async def _find_payment_link_product(payment_entity: dict, payment_link_entity: dict, order_entity: dict) -> Optional[dict]:
    notes = _webhook_notes(payment_entity, payment_link_entity, order_entity)
    product_id = notes.get("product_id")
    product_slug = notes.get("product_slug")
    payment_link_id = (
        payment_entity.get("payment_link_id")
        or payment_entity.get("payment_link")
        or payment_link_entity.get("id")
    )
    reference_id = payment_link_entity.get("reference_id") or order_entity.get("reference_id")

    query_options = []
    if product_id:
        query_options.append({"id": product_id})
    if product_slug:
        query_options.append({"slug": product_slug})
    if payment_link_id:
        query_options.append({"razorpay_payment_link_id": payment_link_id})
    if reference_id and str(reference_id).startswith("cms-product-"):
        slug_or_id = str(reference_id).replace("cms-product-", "", 1)
        query_options.extend([{"slug": slug_or_id}, {"id": slug_or_id}])

    for query in query_options:
        product = await db.products.find_one(query, {"_id": 0})
        if product:
            return product
    return None


async def _get_or_create_payment_link_order(
    razorpay_order_id: Optional[str],
    razorpay_payment_id: Optional[str],
    payment_entity: dict,
    payment_link_entity: dict,
    order_entity: dict,
) -> Optional[dict]:
    if razorpay_order_id:
        order = await db.orders.find_one({"razorpay_order_id": razorpay_order_id}, {"_id": 0})
        if order:
            return order
    if razorpay_payment_id:
        order = await db.orders.find_one({"razorpay_payment_id": razorpay_payment_id}, {"_id": 0})
        if order:
            return order

    product = await _find_payment_link_product(payment_entity, payment_link_entity, order_entity)
    if not product:
        return None

    notes = _webhook_notes(payment_entity, payment_link_entity, order_entity)
    payment_link_id = payment_entity.get("payment_link_id") or payment_entity.get("payment_link") or payment_link_entity.get("id")
    payment_link_customer = payment_link_entity.get("customer") if isinstance(payment_link_entity.get("customer"), dict) else {}
    buyer_email = (
        payment_entity.get("email")
        or payment_link_customer.get("email")
        or notes.get("customer_email")
        or ""
    )
    buyer_name = (
        payment_entity.get("name")
        or payment_link_customer.get("name")
        or notes.get("customer_name")
        or "Customer"
    )
    buyer_phone = (
        payment_entity.get("contact")
        or payment_link_customer.get("contact")
        or notes.get("customer_phone")
        or ""
    )
    amount = int(payment_entity.get("amount") or order_entity.get("amount_paid") or order_entity.get("amount") or 0)
    currency = (payment_entity.get("currency") or order_entity.get("currency") or "INR").upper()
    now = datetime.now(timezone.utc).isoformat()
    order_doc = {
        "id": str(uuid.uuid4()),
        "razorpay_order_id": razorpay_order_id or f"payment_link_{razorpay_payment_id}",
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_payment_link_id": payment_link_id,
        "amount": amount,
        "currency": currency,
        "receipt": payment_link_entity.get("reference_id") or _payment_link_reference(product),
        "product_id": product.get("id"),
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "product_title": product.get("name"),
        "status": "pending",
        "payment_status": "pending",
        "customer_name": str(buyer_name).strip(),
        "customer_email": str(buyer_email).lower().strip() if buyer_email else "",
        "customer_phone": str(buyer_phone).strip(),
        "buyer_name": str(buyer_name).strip(),
        "buyer_email": str(buyer_email).lower().strip() if buyer_email else "",
        "buyer_phone": str(buyer_phone).strip(),
        "created_at": now,
        "source": "razorpay_payment_link",
        "email_delivery_status": "pending",
        "email_delivery_error": None,
        "email_sent": False,
        "email_error": None,
    }
    await db.orders.insert_one(order_doc)
    await _upsert_checkout_customer(order_doc, product)
    return order_doc


async def _verify_razorpay_paid_order(order: dict, razorpay_payment_id: str) -> dict:
    payment = await _fetch_razorpay_payment(razorpay_payment_id)
    payment_ok, payment_error = _is_captured_payment_for_order(payment, order)
    if not payment_ok:
        return {"verified": False, "payment": payment, "razorpay_order": None, "error": payment_error}

    razorpay_order = await _fetch_razorpay_order(order.get("razorpay_order_id"))
    order_ok, order_error = _is_paid_razorpay_order(razorpay_order, order)
    if not order_ok:
        return {"verified": False, "payment": payment, "razorpay_order": razorpay_order, "error": order_error}

    return {"verified": True, "payment": payment, "razorpay_order": razorpay_order, "error": None}


async def _mark_order_not_paid(order: dict, payment_status: str, reason: str, payment_id: Optional[str] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    order_filter = {"$or": [{"razorpay_order_id": order.get("razorpay_order_id")}, {"id": order.get("id")}]}
    update_fields = {
        "status": payment_status,
        "payment_status": payment_status,
        "payment_failure_reason": reason,
        "verified_at": now,
        "email_delivery_status": "pending",
        "email_delivery_error": "Payment not verified; download email blocked.",
        "email_sent": False,
        "email_error": "Payment not verified; download email blocked.",
    }
    if payment_id:
        update_fields["razorpay_payment_id"] = payment_id
    await db.orders.update_one(
        order_filter,
        {
            "$set": update_fields,
            "$unset": {
                "paid_at": "",
                "download_token_hash": "",
                "download_url": "",
            },
        },
    )
    corrected_order = {**order, **update_fields}
    corrected_order.pop("paid_at", None)
    corrected_order.pop("download_token_hash", None)
    corrected_order.pop("download_url", None)
    try:
        product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
        await _upsert_checkout_customer(corrected_order, product)
    except Exception:
        logger.exception("Failed to update customer record after marking order not paid")
    return corrected_order


async def _sync_order_with_razorpay(order: dict, send_email: bool = False) -> dict:
    if not order.get("razorpay_order_id"):
        raise HTTPException(status_code=400, detail="Order is not a Razorpay checkout order")

    razorpay_order = await _fetch_razorpay_order(order.get("razorpay_order_id"))
    payments = await _fetch_razorpay_order_payments(order.get("razorpay_order_id"))
    captured_payment = None
    failed_payment = None
    for payment in payments:
        payment_ok, _ = _is_captured_payment_for_order(payment, order)
        if payment_ok:
            captured_payment = payment
            break
        if payment.get("status") == "failed":
            failed_payment = payment

    if captured_payment:
        order_ok, order_error = _is_paid_razorpay_order(razorpay_order, order)
        if not order_ok:
            corrected = await _mark_order_not_paid(order, "failed", order_error, captured_payment.get("id"))
            return {"verified_paid": False, "order": corrected, "reason": order_error, "razorpay_payment_status": captured_payment.get("status"), "local_status": corrected.get("payment_status")}
        product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
        fulfillment = await _fulfill_paid_order(order, product, captured_payment.get("id"), send_email=send_email)
        return {"verified_paid": True, "order": fulfillment["order"], "reason": None, "razorpay_payment_status": captured_payment.get("status"), "local_status": "paid"}

    razorpay_status = razorpay_order.get("status") if razorpay_order else None
    if failed_payment:
        reason = failed_payment.get("error_description") or failed_payment.get("error_reason") or "Razorpay payment failed"
        corrected = await _mark_order_not_paid(order, "failed", reason, failed_payment.get("id"))
        return {"verified_paid": False, "order": corrected, "reason": reason, "razorpay_payment_status": failed_payment.get("status"), "local_status": corrected.get("payment_status")}

    next_status, reason = _status_for_uncaptured_sync(order, razorpay_order, payments)
    corrected = await _mark_order_not_paid(order, next_status, reason, order.get("razorpay_payment_id"))
    payment_statuses = ",".join(str(payment.get("status") or "unknown") for payment in payments) or "none"
    return {"verified_paid": False, "order": corrected, "reason": reason, "razorpay_payment_status": payment_statuses, "local_status": corrected.get("payment_status")}


async def _sync_payment_with_razorpay(order: dict, send_email: bool = False) -> dict:
    payment_id = order.get("razorpay_payment_id")
    if not payment_id:
        raise HTTPException(status_code=400, detail="Order does not have a Razorpay payment ID")

    payment = await _fetch_razorpay_payment(payment_id)
    payment_status = payment.get("status")
    expected_amount = _expected_order_amount(order)
    expected_currency = (order.get("currency") or "INR").upper()
    payment_currency = (payment.get("currency") or "").upper()
    if payment_status == "captured" and payment.get("captured") is True:
        if int(payment.get("amount") or 0) != expected_amount:
            corrected = await _mark_order_not_paid(order, "failed", "Razorpay payment amount mismatch", payment_id)
            return {"verified_paid": False, "order": corrected, "reason": "Razorpay payment amount mismatch", "razorpay_payment_status": payment_status, "local_status": corrected.get("payment_status")}
        if payment_currency != expected_currency:
            corrected = await _mark_order_not_paid(order, "failed", "Razorpay payment currency mismatch", payment_id)
            return {"verified_paid": False, "order": corrected, "reason": "Razorpay payment currency mismatch", "razorpay_payment_status": payment_status, "local_status": corrected.get("payment_status")}
        product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
        payment_order_id = payment.get("order_id")
        fulfillment_order = {**order}
        if payment_order_id and str(order.get("razorpay_order_id") or "").startswith("payment_link_"):
            fulfillment_order["razorpay_order_id"] = payment_order_id
        fulfillment = await _fulfill_paid_order(fulfillment_order, product, payment_id, send_email=send_email)
        return {"verified_paid": True, "order": fulfillment["order"], "reason": None, "razorpay_payment_status": payment_status, "local_status": "paid"}

    next_status = "failed" if payment_status == "failed" else "pending"
    reason = payment.get("error_description") or payment.get("error_reason") or f"Razorpay payment is {payment_status or 'not captured'}"
    corrected = await _mark_order_not_paid(order, next_status, reason, payment_id)
    return {"verified_paid": False, "order": corrected, "reason": reason, "razorpay_payment_status": payment_status, "local_status": corrected.get("payment_status")}


async def _fulfill_paid_order(order: dict, product: dict, payment_id: str, send_email: bool = True) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    was_paid = order.get("status") == "paid" or order.get("payment_status") == "paid"
    download_url = order.get("download_url")
    download_token = None
    download_token_hash = order.get("download_token_hash")
    if not download_url or not download_token_hash:
        download_token = secrets.token_urlsafe(32)
        download_url = _paid_download_url(order.get("razorpay_order_id") or order.get("id"), download_token)
        download_token_hash = _hash_download_token(download_token)

    download_fields = _product_download_fields(product, order)
    if not download_fields.get("download_file_key") and not download_fields.get("download_file"):
        raise HTTPException(status_code=404, detail="Download file not configured")

    paid_fields = {
        "status": "paid",
        "payment_status": "paid",
        "razorpay_payment_id": payment_id,
        "verified_at": order.get("verified_at") or now,
        "paid_at": order.get("paid_at") or now,
        "download_token_hash": download_token_hash,
        "download_url": download_url,
        **download_fields,
    }
    if order.get("razorpay_order_id"):
        paid_fields["razorpay_order_id"] = order.get("razorpay_order_id")

    await db.orders.update_one(
        {"$or": [{"razorpay_order_id": order.get("razorpay_order_id")}, {"id": order.get("id")}]},
        {"$set": paid_fields},
    )
    if not was_paid:
        await db.products.update_one({"id": product.get("id")}, {"$inc": {"sold_count": 1}})

    email_delivery_status = order.get("email_delivery_status") or ("sent" if order.get("email_sent") else ("failed" if order.get("email_error") else "pending"))
    email_sent = email_delivery_status == "sent"
    email_error = order.get("email_delivery_error") if order.get("email_delivery_error") is not None else order.get("email_error")
    email_attempted_at = order.get("email_delivery_attempted_at") or order.get("email_attempted_at")
    buyer_email = (order.get("customer_email") or order.get("buyer_email") or "").lower().strip()
    if send_email and buyer_email and not email_sent:
        result = _send_download_email(
            buyer_email,
            order.get("customer_name") or order.get("buyer_name", "there"),
            order.get("product_name") or product.get("name", "your asset"),
            payment_id,
            _public_download_url(download_url),
        )
        email_sent, email_error = _normalize_email_result(result)
        email_attempted_at = now
        email_update = _email_delivery_update(email_sent, email_error, email_attempted_at)
        if email_sent:
            email_update["email_delivery_sent_at"] = now
        await db.orders.update_one(
            {"$or": [{"razorpay_order_id": order.get("razorpay_order_id")}, {"id": order.get("id")}]},
            {"$set": email_update},
        )
        email_delivery_status = email_update["email_delivery_status"]

    fulfilled_order = {
        **order,
        **paid_fields,
        "email_delivery_status": email_delivery_status,
        "email_delivery_error": email_error,
        "email_delivery_attempted_at": email_attempted_at,
        "email_sent": email_sent,
        "email_error": email_error,
        "email_attempted_at": email_attempted_at,
    }
    await _upsert_checkout_customer(fulfilled_order, product)
    return {
        "order": fulfilled_order,
        "download_token": download_token,
        "download_url": download_url,
        "email_sent": email_sent,
        "email_error": email_error,
        "email_delivery_status": email_delivery_status,
        "email_delivery_error": email_error,
    }


@api_router.post("/checkout/create-order")
async def checkout_create_order(payload: PaymentCreateOrderIn):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    client = _require_razorpay_client()

    phone = _normalize_phone(payload.phone)
    product = await _find_checkout_product(payload.product_id, payload.product_slug)
    amount = _product_price_paise(product)
    local_order_id = str(uuid.uuid4())
    receipt = f"asset_{uuid.uuid4().hex[:24]}"
    customer_name = payload.name.strip()
    customer_email = str(payload.email).lower().strip()

    try:
        razorpay_order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "local_order_id": local_order_id,
                "product_id": product.get("id", ""),
                "product_name": product.get("name", ""),
                "product_slug": product.get("slug", ""),
                "customer_name": customer_name,
                "customer_email": customer_email,
                "customer_phone": phone,
            },
        })
    except razorpay.errors.BadRequestError as e:
        if _is_razorpay_auth_error(e):
            logger.warning("Razorpay order create authentication failed config=%s error=%s", razorpay_config_summary(), _razorpay_error_summary(e))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay bad request")
        raise HTTPException(status_code=400, detail=_razorpay_public_error(e))
    except razorpay.errors.ServerError:
        logger.exception("Razorpay server error")
        raise HTTPException(status_code=502, detail="Payment gateway error")
    except Exception as exc:
        if _is_razorpay_auth_error(exc):
            logger.warning("Razorpay order create authentication failed config=%s error=%s", razorpay_config_summary(), _razorpay_error_summary(exc))
            raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)
        logger.exception("Razorpay order failure")
        raise HTTPException(status_code=500, detail="Could not create order")

    order_doc = {
        "id": local_order_id,
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
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": phone,
        "buyer_name": customer_name,
        "buyer_email": customer_email,
        "buyer_phone": phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "razorpay_checkout",
        "email_delivery_status": "pending",
        "email_delivery_error": None,
        "email_sent": False,
        "email_error": None,
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


@api_router.post("/checkout/{order_id}/cancel")
async def checkout_cancel(order_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    order = await db.orders.find_one({"razorpay_order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("payment_status") == "paid":
        return {"success": True, "status": "paid"}
    corrected_order = await _mark_order_not_paid(order, "cancelled", "Checkout dismissed before payment capture")
    return {
        "success": True,
        "status": corrected_order.get("payment_status"),
    }


@api_router.post("/checkout/verify-payment")
async def checkout_verify_payment(payload: PaymentVerifyIn):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if not RAZORPAY_KEY_SECRET:
        logger.warning("Razorpay payment verification unavailable summary=%s", razorpay_config_summary())
        raise HTTPException(status_code=502, detail=RAZORPAY_AUTH_ERROR_MESSAGE)

    order = await db.orders.find_one({"razorpay_order_id": payload.razorpay_order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    stored_razorpay_order_id = order.get("razorpay_order_id")
    if payload.razorpay_order_id != stored_razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not match this order")

    message = f"{stored_razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    expected_sig = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), message, hashlib.sha256).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    if not hmac.compare_digest(expected_sig, payload.razorpay_signature):
        failed_fields = {
            "status": "failed",
            "payment_status": "failed",
            "razorpay_payment_id": payload.razorpay_payment_id,
            "payment_failure_reason": "Invalid payment signature",
            "email_delivery_status": "pending",
            "email_delivery_error": "Payment not verified; download email blocked.",
            "email_sent": False,
            "email_error": "Payment not verified; download email blocked.",
            "verified_at": now,
        }
        await db.orders.update_one(
            {"razorpay_order_id": payload.razorpay_order_id},
            {"$set": failed_fields},
        )
        try:
            failed_product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
            await _upsert_checkout_customer({**order, **failed_fields}, failed_product)
        except Exception:
            logger.exception("Failed to update customer record after payment signature mismatch")
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
    if payload.asset_slug and payload.asset_slug != product.get("slug"):
        raise HTTPException(status_code=400, detail="Payment does not match this asset")

    order_email = (order.get("customer_email") or order.get("buyer_email") or "").lower().strip()
    payload_email = str(payload.buyer_email).lower().strip() if payload.buyer_email else ""
    if payload_email and order_email and payload_email != order_email:
        raise HTTPException(status_code=400, detail="Payment does not match this buyer email")
    buyer_email = order_email or payload_email
    if not buyer_email:
        raise HTTPException(status_code=400, detail="Buyer email is required")

    verification = await _verify_razorpay_paid_order(order, payload.razorpay_payment_id)
    if not verification.get("verified"):
        corrected_order = await _mark_order_not_paid(
            order,
            "failed",
            verification.get("error") or "Razorpay payment was not verified",
            payload.razorpay_payment_id,
        )
        logger.warning(
            "Razorpay checkout verification rejected order_id=%s payment_id=%s reason=%s",
            stored_razorpay_order_id,
            payload.razorpay_payment_id,
            verification.get("error"),
        )
        return {
            "success": False,
            "verified_paid": False,
            "order_id": stored_razorpay_order_id,
            "payment_id": payload.razorpay_payment_id,
            "payment_status": corrected_order.get("payment_status"),
            "error": verification.get("error") or "Payment was not captured",
        }

    if order.get("status") == "paid" or order.get("payment_status") == "paid":
        email_delivery_status = order.get("email_delivery_status") or ("sent" if order.get("email_sent") else ("failed" if order.get("email_error") else "pending"))
        email_sent = email_delivery_status == "sent"
        email_error = order.get("email_delivery_error") if order.get("email_delivery_error") is not None else order.get("email_error")
        if not email_sent and order.get("download_url"):
            result = _send_download_email(
                buyer_email,
                order.get("customer_name") or order.get("buyer_name", "there"),
                order.get("product_name") or product.get("name", "your asset"),
                order.get("razorpay_payment_id") or payload.razorpay_payment_id,
                _public_download_url(order.get("download_url")),
            )
            email_sent, email_error = _normalize_email_result(result)
            email_update = _email_delivery_update(email_sent, email_error, now)
            if email_sent:
                email_update["email_delivery_sent_at"] = now
            await db.orders.update_one(
                {"razorpay_order_id": payload.razorpay_order_id},
                {"$set": email_update},
            )
            await _upsert_checkout_customer(
                {**order, **email_update},
                product,
            )
            email_delivery_status = email_update["email_delivery_status"]
        else:
            await _upsert_checkout_customer(order, product)
        return {
            "success": True,
            "verified_paid": True,
            "order_id": payload.razorpay_order_id,
            "payment_id": order.get("razorpay_payment_id") or payload.razorpay_payment_id,
            "product_slug": product.get("slug"),
            "product_name": product.get("name"),
            "download_url": order.get("download_url"),
            "email_sent": email_sent,
            "email_error": email_error,
            "email_delivery_status": email_delivery_status,
            "email_delivery_error": email_error,
        }

    await db.orders.update_one(
        {"razorpay_order_id": payload.razorpay_order_id},
        {"$set": {"razorpay_signature": payload.razorpay_signature}},
    )
    fulfillment = await _fulfill_paid_order(
        {**order, "razorpay_signature": payload.razorpay_signature},
        product,
        payload.razorpay_payment_id,
        send_email=True,
    )

    return {
        "success": True,
        "verified_paid": True,
        "order_id": payload.razorpay_order_id,
        "payment_id": payload.razorpay_payment_id,
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "download_url": fulfillment["download_url"],
        "download_token": fulfillment["download_token"],
        "email_sent": fulfillment["email_sent"],
        "email_error": fulfillment["email_error"],
        "email_delivery_status": fulfillment["email_delivery_status"],
        "email_delivery_error": fulfillment["email_delivery_error"],
    }


@api_router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    body = await request.body()
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not webhook_secret:
        logger.error("Razorpay webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Razorpay webhook is not configured")
    expected = hmac.new(webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_id = request.headers.get("X-Razorpay-Event-Id") or hashlib.sha256(body).hexdigest()
    existing_event = await db.webhook_events.find_one({"id": event_id}, {"_id": 0, "id": 1, "status": 1})
    if existing_event:
        return {"success": True, "duplicate": True, "status": existing_event.get("status")}

    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    event = payload.get("event")
    event_doc = {
        "id": event_id,
        "provider": "razorpay",
        "event": event,
        "status": "received",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.webhook_events.insert_one(event_doc)
    except DuplicateKeyError:
        return {"success": True, "duplicate": True, "status": "received"}

    if event not in {"payment.captured", "order.paid", "payment.failed", "order.cancelled"}:
        await db.webhook_events.update_one(
            {"id": event_id},
            {"$set": {"status": "ignored", "processed_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"success": True, "ignored": True}

    payment_entity = (((payload.get("payload") or {}).get("payment") or {}).get("entity") or {})
    order_entity = (((payload.get("payload") or {}).get("order") or {}).get("entity") or {})
    payment_link_entity = (((payload.get("payload") or {}).get("payment_link") or {}).get("entity") or {})
    razorpay_order_id = payment_entity.get("order_id") or order_entity.get("id")
    razorpay_payment_id = payment_entity.get("id")
    payment_link_id = payment_entity.get("payment_link_id") or payment_entity.get("payment_link") or payment_link_entity.get("id")
    if not razorpay_order_id and not payment_link_id:
        logger.warning("Razorpay webhook missing order id event=%s event_id=%s", event, event_id)
        await db.webhook_events.update_one(
            {"id": event_id},
            {"$set": {"status": "ignored", "reason": "missing_order_id", "processed_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"success": True, "ignored": True}

    order = await _get_or_create_payment_link_order(
        razorpay_order_id,
        razorpay_payment_id,
        payment_entity,
        payment_link_entity,
        order_entity,
    )
    if not order:
        logger.warning("Razorpay webhook order not found razorpay_order_id=%s payment_link_id=%s event_id=%s", razorpay_order_id, payment_link_id, event_id)
        await db.webhook_events.update_one(
            {"id": event_id},
            {
                "$set": {
                    "status": "ignored",
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_link_id": payment_link_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "reason": "order_not_found",
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return {"success": True, "ignored": True}
    razorpay_order_id = order.get("razorpay_order_id") or razorpay_order_id

    if event in {"payment.failed", "order.cancelled"}:
        reason = payment_entity.get("error_description") or payment_entity.get("error_reason") or "Razorpay payment failed"
        if event == "order.cancelled":
            reason = "Razorpay order cancelled"
        corrected = await _mark_order_not_paid(order, "failed" if event == "payment.failed" else "cancelled", reason, razorpay_payment_id)
        await db.webhook_events.update_one(
            {"id": event_id},
            {
                "$set": {
                    "status": "processed",
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "local_status": corrected.get("payment_status"),
                    "email_sent": False,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return {
            "success": True,
            "order_id": razorpay_order_id,
            "payment_id": razorpay_payment_id,
            "payment_status": corrected.get("payment_status"),
            "email_sent": False,
        }

    if event == "payment.captured":
        verified, reason = _is_captured_webhook_payment(payment_entity, order)
        payment_id = razorpay_payment_id
    else:
        verified, reason = _is_paid_webhook_order(order_entity, order)
        payment_id = razorpay_payment_id or order.get("razorpay_payment_id") or order_entity.get("payment_id") or "order.paid"

    if not verified:
        logger.warning("Razorpay webhook verification failed event=%s order_id=%s reason=%s", event, razorpay_order_id, reason)
        await db.webhook_events.update_one(
            {"id": event_id},
            {
                "$set": {
                    "status": "rejected",
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": payment_id,
                    "reason": reason,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        raise HTTPException(status_code=400, detail=reason)

    product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
    fulfillment = await _fulfill_paid_order(order, product, payment_id, send_email=True)
    fulfilled_order = fulfillment.get("order") or {}
    await db.webhook_events.update_one(
        {"id": event_id},
        {
            "$set": {
                "status": "processed",
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "local_status": fulfilled_order.get("payment_status"),
                "email_sent": bool(fulfilled_order.get("email_sent")),
                "email_delivery_status": fulfilled_order.get("email_delivery_status"),
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {
        "success": True,
        "order_id": razorpay_order_id,
        "payment_id": payment_id,
        "verified_paid": True,
        "email_sent": bool(fulfilled_order.get("email_sent")),
        "email_delivery_status": fulfilled_order.get("email_delivery_status"),
    }


def _validate_download_access(order: Optional[dict], token: str) -> dict:
    if not order or order.get("payment_status") != "paid":
        raise HTTPException(status_code=403, detail="Download is available only after successful payment")
    expected_hash = order.get("download_token_hash")
    if not expected_hash or not hmac.compare_digest(expected_hash, _hash_download_token(token)):
        raise HTTPException(status_code=403, detail="Invalid or expired download link")
    return order


async def _ensure_verified_paid_download_order(order: dict) -> dict:
    if not order.get("razorpay_order_id"):
        return order
    payment_id = order.get("razorpay_payment_id")
    if not payment_id:
        await _mark_order_not_paid(order, "failed", "No Razorpay payment ID found for paid order")
        raise HTTPException(status_code=403, detail="Download is available only after successful payment")
    verification = await _verify_razorpay_paid_order(order, payment_id)
    if not verification.get("verified"):
        await _mark_order_not_paid(order, "failed", verification.get("error") or "Razorpay payment was not verified", payment_id)
        raise HTTPException(status_code=403, detail="Download is available only after successful payment")
    return order


@api_router.get("/orders/{order_id}/access")
async def order_access(order_id: str, token: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    order = await db.orders.find_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]}, {"_id": 0}
    )
    order = _validate_download_access(order, token)
    order = await _ensure_verified_paid_download_order(order)
    return {
        "verified": True,
        "verified_paid": True,
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
        "email_sent": bool(order.get("email_sent")),
        "email_error": order.get("email_error"),
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
    order = await _ensure_verified_paid_download_order(order)

    product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
    download_fields = _product_download_fields(product, order)
    if not download_fields.get("download_file_key") and not download_fields.get("download_file"):
        raise HTTPException(status_code=404, detail="Download file not configured")

    await db.orders.update_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]},
        {"$inc": {"download_count": 1}, "$set": {"last_downloaded_at": datetime.now(timezone.utc).isoformat()}},
    )
    if download_fields.get("download_file_key"):
        download_url = _private_download_presigned_url(
            download_fields["download_file_key"],
            download_fields.get("download_file_bucket"),
        )
    else:
        download_url = _validated_download_url(download_fields["download_file"])
    return RedirectResponse(
        download_url,
        status_code=302,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin"},
    )


@api_router.get("/downloads/{order_id}/{product_id}")
async def protected_product_download(order_id: str, product_id: str, token: Optional[str] = None):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    order = await db.orders.find_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]}, {"_id": 0}
    )
    if not order or order.get("payment_status") != "paid":
        raise HTTPException(status_code=403, detail="Download is available only after successful payment")
    if token:
        order = _validate_download_access(order, token)
    order = await _ensure_verified_paid_download_order(order)
    if product_id not in {order.get("product_id"), order.get("product_slug")}:
        raise HTTPException(status_code=403, detail="Download does not belong to this order")
    product = await _find_checkout_product(order.get("product_id"), order.get("product_slug"))
    download_fields = _product_download_fields(product, order)
    if download_fields.get("download_file_key"):
        download_url = _private_download_presigned_url(
            download_fields["download_file_key"],
            download_fields.get("download_file_bucket"),
        )
    elif download_fields.get("download_file"):
        download_url = _validated_download_url(download_fields["download_file"])
    else:
        raise HTTPException(status_code=404, detail="Download file not configured")
    await db.orders.update_one(
        {"$or": [{"razorpay_order_id": order_id}, {"id": order_id}]},
        {"$inc": {"download_count": 1}, "$set": {"last_downloaded_at": datetime.now(timezone.utc).isoformat()}},
    )
    return RedirectResponse(
        download_url,
        status_code=302,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin"},
    )


@api_router.post("/payments/free-order")
async def payment_free_order(payload: PaymentFreeOrderIn):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    product = await _find_checkout_product(payload.product_id, payload.product_slug)
    if not product.get("is_free") and int(round(float(product.get("sale_price") or product.get("price") or 0) * 100)) > 0:
        raise HTTPException(status_code=400, detail="This product is not free")

    download_fields = _product_download_fields(product)
    if not download_fields.get("download_file_key") and not download_fields.get("download_file"):
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
        "download_url": download_url,
        **download_fields,
        "email_delivery_status": "pending",
        "email_delivery_error": None,
        "email_sent": False,
        "email_error": None,
    }
    buyer_email = str(payload.email).lower().strip() if payload.email else ""
    if buyer_email:
        result = _send_download_email(
            buyer_email,
            payload.name.strip() if payload.name else "there",
            product.get("name", "your asset"),
            "Free download",
            _public_download_url(download_url),
        )
        email_sent, email_error = _normalize_email_result(result)
        now = datetime.now(timezone.utc).isoformat()
        order_doc.update(_email_delivery_update(email_sent, email_error, now))
        if email_sent:
            order_doc["email_delivery_sent_at"] = now
    await db.orders.insert_one(order_doc)
    await _upsert_checkout_customer(order_doc, product)

    return {
        "success": True,
        "order_id": order_id,
        "product_slug": product.get("slug"),
        "product_name": product.get("name"),
        "download_url": download_url,
        "download_token": download_token,
        "email_sent": bool(order_doc.get("email_sent")),
        "email_error": order_doc.get("email_error"),
        "email_delivery_status": order_doc.get("email_delivery_status"),
        "email_delivery_error": order_doc.get("email_delivery_error"),
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

        # Seed database-backed CMS pages/sections without overwriting admin edits.
        for page in CMS_PAGES:
            await db.cms_pages.update_one(
                {"page_key": page["page_key"]},
                {"$setOnInsert": dict(page)},
                upsert=True,
            )
        for section in CMS_SECTIONS:
            await db.cms_sections.update_one(
                {"page_key": section["page_key"], "section_id": section["section_id"]},
                {"$setOnInsert": dict(section)},
                upsert=True,
            )
        logger.info("Ensured %d CMS pages and %d CMS sections", len(CMS_PAGES), len(CMS_SECTIONS))

        # Initialize the catalog once. Admin-managed products are authoritative
        # after this marker is written, so deleted products stay deleted.
        await initialize_default_products()

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
            for coll_name in ("faqs", "pages", "cms_pages", "cms_sections", "blog_posts", "settings", "products"):
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
            await db.cms_pages.create_index("page_key", unique=True)
        except Exception:
            pass
        try:
            await db.cms_sections.create_index([("page_key", 1), ("sort_order", 1)])
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
