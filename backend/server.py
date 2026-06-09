from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import asyncio
import hmac
import hashlib
import logging
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


@api_router.get("/settings")
async def public_settings():
    settings_doc = await db.settings.find_one({}, {"_id": 0})
    if not settings_doc:
        return {
            "site_name": "PranavithDOP",
            "theme": "dark",
            "notifications_enabled": True,
            "site_description": "Premium video editing training, assets and tutorials.",
            "contact_email": "info@pranavithdop.com",
            "contact_phone": "+91 9059867883",
            "contact_address": "Hyderabad, India",
        }
    return settings_doc


@api_router.get("/pages")
async def public_pages():
    return await db.pages.find({"published": True}, {"_id": 0}).to_list(100)


@api_router.get("/pages/{slug}")
async def public_page_by_slug(slug: str):
    page = await db.pages.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@api_router.get("/products")
async def public_products():
    return await db.products.find({"published": True}, {"_id": 0}).to_list(100)


@api_router.get("/products/{slug}")
async def public_product_by_slug(slug: str):
    product = await db.products.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.get("/blog-posts")
async def public_blog_posts():
    return await db.blog_posts.find({"published": True}, {"_id": 0}).to_list(100)


@api_router.get("/blog-posts/{slug}")
async def public_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post


@api_router.get("/blog-categories")
async def public_blog_categories():
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
    return {"id": sub.id, "success": True, "message": "Subscribed! Thanks for joining BBEdits."}


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
    role: Optional[str] = "admin"


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.environ.get("JWT_EXPIRATION_MINUTES", "180"))
admin_router = APIRouter(prefix="/admin", tags=["admin"])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


async def get_admin_by_email(email: str):
    return await db.admins.find_one({"email": email})


async def get_admin_by_id(admin_id: str):
    return await db.admins.find_one({"id": admin_id})


async def authenticate_admin(email: str, password: str):
    admin = await get_admin_by_email(email.lower().strip())
    if not admin or not verify_password(password, admin.get("hashed_password", "")):
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
    if not token_data.id:
        raise credentials_exception
    admin = await get_admin_by_id(token_data.id)
    if admin is None:
        raise credentials_exception
    return admin_doc_to_public(admin)


async def get_current_active_admin(current_admin: AdminBase = Depends(get_current_admin)) -> AdminBase:
    return current_admin


@admin_router.post("/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginIn):
    admin = await authenticate_admin(payload.email, payload.password)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token({"sub": admin["id"], "role": admin.get("role", "admin")})
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
            "site_name": "BBEdits",
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


# Create uploads directory if it doesn't exist
UPLOAD_DIR = ROOT_DIR / "uploads"
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


async def seed_default_admin():
    existing = await db.admins.count_documents({})
    if existing:
        return
    default_email = os.environ.get("DEFAULT_ADMIN_EMAIL", "admin@bbedits.com").lower().strip()
    default_password = os.environ.get("DEFAULT_ADMIN_PASSWORD", "Admin123!")
    default_name = os.environ.get("DEFAULT_ADMIN_NAME", "Super Admin")
    admin_doc = {
        "id": str(uuid.uuid4()),
        "name": default_name,
        "email": default_email,
        "role": "super_admin",
        "permissions": ["super_admin", "admin", "editor"],
        "hashed_password": get_password_hash(default_password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.admins.insert_one(admin_doc)
        logger.info("Created default admin user %s", default_email)
    except Exception:
        logger.exception("Failed to seed default admin")


@app.on_event("startup")
async def on_startup():
    await prepare_cms_collections()
    await seed_default_admin()
    # Seed default content in the background to keep startup responsive.
    asyncio.create_task(_seed_db())


api_router.include_router(admin_router)


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

# Serve uploaded files statically
from fastapi.staticfiles import StaticFiles
if UPLOAD_DIR.exists():
    app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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

        # Seed CMS pages
        existing_pages = await db.pages.count_documents({})
        if existing_pages == 0:
            await db.pages.insert_many([dict(p) for p in PAGES])
            logger.info("Seeded %d pages", len(PAGES))
        else:
            for page in PAGES:
                if await db.pages.count_documents({"slug": page["slug"]}) == 0:
                    await db.pages.insert_one(dict(page))
                    logger.info("Inserted missing page %s", page["slug"])

        # Seed products/assets
        existing_products = await db.products.count_documents({})
        if existing_products == 0:
            await db.products.insert_many([dict(p) for p in ASSET_PRODUCTS])
            logger.info("Seeded %d products", len(ASSET_PRODUCTS))
        else:
            for product in ASSET_PRODUCTS:
                if await db.products.count_documents({"slug": product["slug"]}) == 0:
                    await db.products.insert_one(dict(product))
                    logger.info("Inserted missing product %s", product["slug"]) 

        # Seed blog categories
        if await db.blog_categories.count_documents({}) == 0:
            await db.blog_categories.insert_many([dict(c) for c in BLOG_CATEGORIES])
            logger.info("Seeded %d blog categories", len(BLOG_CATEGORIES))

        # Seed blog posts
        if await db.blog_posts.count_documents({}) == 0:
            await db.blog_posts.insert_many([dict(p) for p in BLOG_POSTS])
            logger.info("Seeded %d blog posts", len(BLOG_POSTS))

        # Seed default settings
        if await db.settings.count_documents({}) == 0:
            await db.settings.insert_one(SETTINGS)
            logger.info("Seeded default settings")

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
    client.close()
