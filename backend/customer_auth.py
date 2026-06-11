"""Customer (end-user) authentication and order/webhook flow for PranvithDOP.

Separate from the admin auth in server.py. Uses passlib (bcrypt) + python-jose JWT
with Bearer token stored on the frontend in localStorage (mirrors the admin pattern).
"""
from __future__ import annotations

import os
import uuid
import hmac
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from starlette.responses import RedirectResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, ConfigDict

logger = logging.getLogger(__name__)

# ---- Config / crypto -------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get("CUSTOMER_JWT_SECRET", os.environ.get("JWT_SECRET", "change-customer-secret"))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.environ.get("CUSTOMER_JWT_EXPIRATION_MINUTES", "1440"))  # 24h
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(pw, hashed)
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "customer",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ---- Models ----------------------------------------------------------------
class CustomerPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    created_at: str


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CustomerPublic


class CheckoutInitIn(BaseModel):
    product_slug: str


class CheckoutInitOut(BaseModel):
    payment_link: str
    order_id: str
    is_free: bool = False


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=200)


# ---- Helpers ---------------------------------------------------------------
def _user_to_public(doc: dict) -> CustomerPublic:
    return CustomerPublic(
        id=doc["id"],
        name=doc.get("name", ""),
        email=doc["email"],
        created_at=doc.get("created_at", ""),
    )


# ---- Router factory --------------------------------------------------------
def build_customer_router(db) -> APIRouter:
    """Create the customer auth router bound to the provided Motor DB handle."""

    router = APIRouter(prefix="/auth", tags=["customer-auth"])

    async def get_current_customer(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        if not token:
            raise credentials_exception
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except JWTError:
            raise credentials_exception
        if payload.get("type") != "customer":
            raise credentials_exception
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise credentials_exception
        return user

    # ---- Endpoints --------------------------------------------------------
    @router.post("/register", response_model=AuthResponse)
    async def register(payload: RegisterIn):
        email = str(payload.email).lower().strip()
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        now = datetime.now(timezone.utc).isoformat()
        user_doc = {
            "id": str(uuid.uuid4()),
            "name": payload.name.strip(),
            "email": email,
            "password_hash": hash_password(payload.password),
            "purchased_products": [],
            "created_at": now,
        }
        await db.users.insert_one(user_doc)
        return AuthResponse(
            access_token=create_token(user_doc["id"], email),
            user=_user_to_public(user_doc),
        )

    @router.post("/login", response_model=AuthResponse)
    async def login(payload: LoginIn):
        email = str(payload.email).lower().strip()
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return AuthResponse(
            access_token=create_token(user["id"], email),
            user=_user_to_public(user),
        )

    @router.get("/me", response_model=CustomerPublic)
    async def me(user: dict = Depends(get_current_customer)):
        return _user_to_public(user)

    @router.post("/logout")
    async def logout(_user: dict = Depends(get_current_customer)):
        # Stateless JWT — the frontend just drops the token.
        return {"success": True}

    @router.post("/change-password")
    async def change_password(payload: PasswordChangeIn, user: dict = Depends(get_current_customer)):
        if not verify_password(payload.current_password, user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": hash_password(payload.new_password)}},
        )
        return {"success": True}

    @router.get("/my-orders")
    async def my_orders(user: dict = Depends(get_current_customer)):
        orders = await db.orders.find(
            {"user_id": user["id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(200)
        return orders

    @router.get("/my-downloads")
    async def my_downloads(user: dict = Depends(get_current_customer)):
        # Pull paid orders for this user, then enrich with product details.
        paid_orders = await db.orders.find(
            {"user_id": user["id"], "status": "paid"}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)
        # Free assets the user has claimed (kept in user.purchased_products)
        claimed_slugs = set(user.get("purchased_products") or [])
        for o in paid_orders:
            if o.get("product_slug"):
                claimed_slugs.add(o["product_slug"])
        products = await db.products.find(
            {"slug": {"$in": list(claimed_slugs)}}, {"_id": 0, "download_file": 0}
        ).to_list(500)
        # Add purchased_at timestamps when we know them
        by_slug_purchased_at: Dict[str, str] = {}
        by_slug_download_url: Dict[str, str] = {}
        for o in paid_orders:
            slug = o.get("product_slug")
            if slug and slug not in by_slug_purchased_at:
                by_slug_purchased_at[slug] = o.get("verified_at") or o.get("created_at") or ""
            if slug and slug not in by_slug_download_url:
                order_identifier = o.get("razorpay_order_id") or o.get("id") or ""
                token_hash = o.get("download_token_hash")
                download_token = None
                if order_identifier and not token_hash:
                    download_token = secrets.token_urlsafe(32)
                    generated_download_url = f"/api/orders/{order_identifier}/download?token={download_token}"
                    await db.orders.update_one(
                        {"id": o.get("id")},
                        {"$set": {
                            "download_token_hash": hashlib.sha256(download_token.encode("utf-8")).hexdigest(),
                            "download_url": generated_download_url,
                        }},
                    )
                if order_identifier:
                    if download_token:
                        by_slug_download_url[slug] = generated_download_url
                    elif o.get("download_url"):
                        by_slug_download_url[slug] = o["download_url"]
        for p in products:
            p["purchased_at"] = by_slug_purchased_at.get(p.get("slug"), user.get("created_at", ""))
            download_url = by_slug_download_url.get(p.get("slug"))
            if download_url:
                p["download_url"] = download_url
        return products

    @router.get("/orders/{order_id}/download")
    async def download_order(order_id: str, user: dict = Depends(get_current_customer)):
        order = await db.orders.find_one(
            {"id": order_id, "user_id": user["id"], "status": "paid"}, {"_id": 0}
        )
        if not order:
            order = await db.orders.find_one(
                {"razorpay_order_id": order_id, "user_id": user["id"], "status": "paid"}, {"_id": 0}
            )
        if not order:
            raise HTTPException(status_code=403, detail="Download is available only after successful payment")
        product = await db.products.find_one({"slug": order.get("product_slug"), "published": True}, {"_id": 0})
        if not product or not product.get("download_file"):
            raise HTTPException(status_code=404, detail="Download file not configured")
        await db.orders.update_one(
            {"id": order.get("id")},
            {"$inc": {"download_count": 1}, "$set": {"last_downloaded_at": datetime.now(timezone.utc).isoformat()}},
        )
        return RedirectResponse(product["download_file"], status_code=302)

    @router.post("/claim-free", response_model=Dict[str, Any])
    async def claim_free(payload: CheckoutInitIn, user: dict = Depends(get_current_customer)):
        """Adds a free product to the user's downloads."""
        product = await db.products.find_one({"slug": payload.product_slug, "published": True}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if (product.get("sale_price") or product.get("price") or 0) > 0:
            raise HTTPException(status_code=400, detail="This product is not free")
        slug = product["slug"]
        already = slug in (user.get("purchased_products") or [])
        if not already:
            await db.users.update_one(
                {"id": user["id"]},
                {"$addToSet": {"purchased_products": slug}},
            )
            # also record an order for audit trail
            await db.orders.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "user_email": user["email"],
                "product_slug": slug,
                "product_name": product.get("name"),
                "amount": 0,
                "currency": "INR",
                "status": "paid",
                "source": "free_claim",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "verified_at": datetime.now(timezone.utc).isoformat(),
            })
        return {"success": True, "product_slug": slug}

    @router.post("/checkout/init", response_model=CheckoutInitOut)
    async def checkout_init(payload: CheckoutInitIn, request: Request):
        """Create a pending order for a product and return the rzp.io payment link.

        Anonymous users may also call this — the order will be linked to the user
        later via email match in the webhook handler.
        """
        product = await db.products.find_one({"slug": payload.product_slug, "published": True}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        payment_link = product.get("payment_link") or ""
        is_free = (product.get("sale_price") or product.get("price") or 0) == 0

        # Try to resolve current user (optional auth)
        user: Optional[dict] = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                payload_jwt = jwt.decode(auth_header[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
                if payload_jwt.get("type") == "customer":
                    user = await db.users.find_one({"id": payload_jwt.get("sub")}, {"_id": 0})
            except JWTError:
                user = None

        order_id = str(uuid.uuid4())
        order_doc = {
            "id": order_id,
            "user_id": user["id"] if user else None,
            "user_email": user["email"] if user else None,
            "product_slug": product["slug"],
            "product_name": product.get("name"),
            "amount": int((product.get("sale_price") or product.get("price") or 0) * 100),  # paise
            "currency": "INR",
            "status": "pending",
            "source": "rzp_link",
            "payment_link": payment_link,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.orders.insert_one(order_doc)

        # Append prefill params to the payment link if we know the user's email/name
        out_link = payment_link
        if user and payment_link and not is_free:
            sep = "&" if "?" in payment_link else "?"
            from urllib.parse import quote
            out_link = (
                f"{payment_link}{sep}prefill[email]={quote(user['email'])}"
                f"&prefill[name]={quote(user.get('name',''))}"
                f"&notes[order_id]={order_id}"
                f"&notes[user_id]={user['id']}"
            )

        return CheckoutInitOut(payment_link=out_link, order_id=order_id, is_free=is_free)

    return router


# ---- Razorpay webhook router ----------------------------------------------
def build_webhook_router(db) -> APIRouter:
    router = APIRouter(prefix="/webhooks", tags=["webhooks"])

    @router.post("/razorpay")
    async def razorpay_webhook(request: Request):
        raw = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        if RAZORPAY_WEBHOOK_SECRET:
            expected = hmac.new(
                RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
                raw,
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, signature):
                logger.warning("Razorpay webhook signature mismatch")
                raise HTTPException(status_code=400, detail="Invalid signature")
        else:
            logger.warning("RAZORPAY_WEBHOOK_SECRET is not configured — webhook accepted without verification.")

        import json
        try:
            event = json.loads(raw.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

        event_type = event.get("event", "")
        payload = event.get("payload", {}) or {}
        await db.webhook_events.insert_one({
            "id": str(uuid.uuid4()),
            "event": event_type,
            "payload": event,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })

        # Extract payment info — supports both `payment.captured` and `payment_link.paid`
        payment = (payload.get("payment") or {}).get("entity", {}) or {}
        payment_link = (payload.get("payment_link") or {}).get("entity", {}) or {}
        email = (payment.get("email") or payment_link.get("customer", {}).get("email") or "").lower().strip()
        notes = payment.get("notes") or payment_link.get("notes") or {}
        order_id = notes.get("order_id") if isinstance(notes, dict) else None
        user_id = notes.get("user_id") if isinstance(notes, dict) else None
        payment_link_id = payment.get("invoice_id") or payment_link.get("id") or payment.get("order_id")
        payment_link_short_url = payment_link.get("short_url") or ""
        amount_paise = payment.get("amount") or payment_link.get("amount")

        # Identify the product (multiple fallbacks).
        product = None
        if payment_link_short_url:
            product = await db.products.find_one({"payment_link": payment_link_short_url}, {"_id": 0})
        if not product and payment_link_id:
            product = await db.products.find_one({"payment_link": {"$regex": payment_link_id}}, {"_id": 0})

        # Identify the user.
        user = None
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user and email:
            user = await db.users.find_one({"email": email}, {"_id": 0})

        # Update/insert order.
        update_fields = {
            "status": "paid",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "razorpay_payment_id": payment.get("id"),
            "razorpay_payment_link_id": payment_link.get("id"),
            "razorpay_event": event_type,
            "buyer_email": email or None,
        }
        if user:
            update_fields["user_id"] = user["id"]
            update_fields["user_email"] = user["email"]
        if product:
            update_fields["product_slug"] = product.get("slug")
            update_fields["product_name"] = product.get("name")

        if order_id:
            existing_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
            if existing_order and existing_order.get("status") == "paid":
                return {"received": True, "idempotent": True}
            await db.orders.update_one(
                {"id": order_id},
                {"$set": update_fields},
                upsert=False,
            )
        else:
            # No order_id — create a fresh paid order record.
            new_doc = {
                "id": str(uuid.uuid4()),
                "amount": amount_paise,
                "currency": payment.get("currency") or "INR",
                "source": "rzp_webhook",
                "created_at": datetime.now(timezone.utc).isoformat(),
                **update_fields,
            }
            await db.orders.insert_one(new_doc)

        # Credit the product to the user's library.
        if user and product:
            await db.users.update_one(
                {"id": user["id"]},
                {"$addToSet": {"purchased_products": product["slug"]}},
            )

        return {"received": True}

    return router
