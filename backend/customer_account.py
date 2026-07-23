"""
Customer Account Routes for PranvithDOP.

Google OAuth 2.0 login + Customer Dashboard + Orders + Downloads + Invoices.
All routes are prefixed with /api/account.
Uses lazy imports to avoid circular dependency with server.py.
"""
import os
import json
import logging
import uuid
import hmac
import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/account")

# ── Helpers for lazy server access ──────────────────────────────────────────
def _server():
    import server as s
    return s

def _db():
    return _server().db

# ── Environment ──────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/account/auth/google/callback")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_MINUTES = 60 * 24 * 7
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

PAID_STATUSES = ("paid", "captured", "completed", "success")

# Rate limiting
_download_rate_limit: Dict[str, List[datetime]] = {}
_RATE_LIMIT_WINDOW = 60
_RATE_LIMIT_MAX = 10

# ── Models ───────────────────────────────────────────────────────────────────
class GoogleAuthIn(BaseModel):
    credential: str = Field(..., min_length=1)

class ProfileUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    profile_photo: Optional[str] = None

# ── JWT ──────────────────────────────────────────────────────────────────────
def _create_jwt(customer_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": customer_id, "email": email, "iat": now, "exp": now + timedelta(minutes=JWT_EXPIRY_MINUTES), "type": "customer"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def _verify_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "customer":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_customer(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth.removeprefix("Bearer ")
    payload = _verify_jwt(token)
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    customer = await db.customers.find_one({"id": payload["sub"]}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

def _check_rate_limit(key: str):
    now = datetime.now(timezone.utc)
    entries = [t for t in _download_rate_limit.get(key, []) if (now - t).total_seconds() < _RATE_LIMIT_WINDOW]
    if len(entries) >= _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    entries.append(now)
    _download_rate_limit[key] = entries

def _generate_signed_url(order_id: str, customer_id: str, product_slug: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    data = f"{order_id}:{customer_id}:{product_slug}:{expires.timestamp()}"
    sig = hmac.new(JWT_SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
    params = urlencode({"order_id": order_id, "customer_id": customer_id, "product": product_slug, "expires": expires.timestamp(), "sig": sig})
    return f"/api/account/downloads/access?{params}"

def _clean_doc(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}

async def _get_paid_orders(email: str, search: str = "", limit: int = 50) -> list:
    db = _db()
    if db is None:
        return []
    query = {"customer_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, "payment_status": {"$in": list(PAID_STATUSES)}}
    if search:
        q = re.escape(search)
        query["$or"] = [{"product_name": {"$regex": q, "$options": "i"}}, {"product_slug": {"$regex": q, "$options": "i"}}, {"razorpay_order_id": {"$regex": q, "$options": "i"}}, {"razorpay_payment_id": {"$regex": q, "$options": "i"}}, {"id": {"$regex": q, "$options": "i"}}]
    return await db.orders.find(query, {"_id": 0}).sort("paid_at", -1).to_list(length=limit)

async def _get_download_stats(email: str) -> dict:
    db = _db()
    if db is None:
        return {"total_downloads": 0, "total_spent": 0, "purchased_assets": 0}
    pipe = [{"$match": {"customer_email": email, "payment_status": {"$in": list(PAID_STATUSES)}}}, {"$group": {"_id": None, "total_downloads": {"$sum": {"$ifNull": ["$download_count", 0]}}, "total_spent": {"$sum": {"$ifNull": ["$amount", 0]}}, "purchased_assets": {"$sum": 1}}}]
    r = await db.orders.aggregate(pipe).to_list(length=1)
    if r:
        return {"total_downloads": r[0].get("total_downloads", 0), "total_spent": r[0].get("total_spent", 0), "purchased_assets": r[0].get("purchased_assets", 0)}
    return {"total_downloads": 0, "total_spent": 0, "purchased_assets": 0}

async def _get_product_images(slugs: list) -> dict:
    db = _db()
    if not db or not slugs:
        return {}
    result = {}
    cursor = db.products.find({"slug": {"$in": slugs}}, {"slug": 1, "hero_image": 1, "images": 1, "_id": 0})
    async for p in cursor:
        s = p.get("slug", "")
        img = p.get("hero_image") or (p.get("images") or [None])[0] or ""
        result[s] = img
    return result

# ── Google OAuth ─────────────────────────────────────────────────────────────
@router.post("/auth/google")
async def google_auth(payload: GoogleAuthIn):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured")
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post("https://oauth2.googleapis.com/tokeninfo", data={"id_token": payload.credential})
            if resp.status_code != 200:
                resp = await client.get(f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={payload.credential}")
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Google token verification failed")
            info = resp.json()
            aud = info.get("aud", "")
            if aud and aud != GOOGLE_CLIENT_ID:
                azp = info.get("azp", "")
                if azp != GOOGLE_CLIENT_ID:
                    raise HTTPException(status_code=401, detail="Token audience mismatch")
    except httpx.HTTPError as e:
        logger.error(f"Google token verification error: {e}")
        raise HTTPException(status_code=502, detail="Could not verify Google token")

    google_id = info.get("sub", "")
    name = info.get("name", info.get("given_name", "Customer"))
    email = info.get("email", "")
    picture = info.get("picture", "")
    verified = info.get("email_verified", False)
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided")

    existing = await db.customers.find_one({"$or": [{"google_id": google_id}, {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}]})
    now = _now_iso()

    if existing:
        upd = {"last_login": now, "name": name}
        if picture:
            upd["profile_photo"] = picture
        if verified:
            upd["verified_email"] = True
        if not existing.get("google_id"):
            upd["google_id"] = google_id
        await db.customers.update_one({"_id": existing["_id"]}, {"$set": upd})
        cid = existing["id"]
        doc = await db.customers.find_one({"_id": existing["_id"]}, {"_id": 0}) or existing
    else:
        cid = str(uuid.uuid4())
        doc = {"id": cid, "google_id": google_id, "name": name, "email": email, "profile_photo": picture or "", "verified_email": bool(verified), "created_at": now, "last_login": now, "updated_at": None}
        await db.customers.insert_one(dict(doc))

    token = _create_jwt(cid, email)
    return {"access_token": token, "token_type": "bearer", "customer": _clean_doc(doc)}

@router.post("/auth/google/server")
async def google_auth_server(code: str = Query(...), state: Optional[str] = Query(None)):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            tr = await client.post("https://oauth2.googleapis.com/token", data={"code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code"})
            if tr.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to exchange code")
            id_token = tr.json().get("id_token")
            if not id_token:
                raise HTTPException(status_code=401, detail="No id_token")
            try:
                info = jwt.get_unverified_claims(id_token)
            except JWTError:
                vr = await client.post("https://oauth2.googleapis.com/tokeninfo", data={"id_token": id_token})
                if vr.status_code != 200:
                    raise HTTPException(status_code=401, detail="Failed to verify id_token")
                info = vr.json()
    except httpx.HTTPError as e:
        logger.error(f"Google OAuth error: {e}")
        raise HTTPException(status_code=502, detail="Could not complete authentication")

    google_id = info.get("sub", "")
    name = info.get("name", info.get("given_name", "Customer"))
    email = info.get("email", "")
    picture = info.get("picture", "")
    verified = info.get("email_verified", False)
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided")

    existing = await db.customers.find_one({"$or": [{"google_id": google_id}, {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}]})
    now = _now_iso()
    if existing:
        upd = {"last_login": now, "name": name}
        if picture:
            upd["profile_photo"] = picture
        if verified:
            upd["verified_email"] = True
        if not existing.get("google_id"):
            upd["google_id"] = google_id
        await db.customers.update_one({"_id": existing["_id"]}, {"$set": upd})
        cid = existing["id"]
    else:
        cid = str(uuid.uuid4())
        doc = {"id": cid, "google_id": google_id, "name": name, "email": email, "profile_photo": picture or "", "verified_email": bool(verified), "created_at": now, "last_login": now, "updated_at": None}
        await db.customers.insert_one(dict(doc))

    token = _create_jwt(cid, email)
    return RedirectResponse(url=f"{FRONTEND_URL.rstrip('/')}/account?token={token}")

# ── Dashboard ────────────────────────────────────────────────────────────────
@router.get("/dashboard")
async def customer_dashboard(customer: dict = Depends(get_current_customer)):
    email = customer["email"]
    stats = await _get_download_stats(email)
    orders = await _get_paid_orders(email, limit=10)
    slugs = [o.get("product_slug", "") for o in orders if o.get("product_slug")]
    images = await _get_product_images(slugs)
    recent = []
    for o in orders:
        s = o.get("product_slug", "")
        recent.append({"id": o.get("id", ""), "product_name": o.get("product_name", "Product"), "product_slug": s, "product_image": images.get(s, ""), "amount": o.get("amount", 0), "currency": o.get("currency", "INR"), "payment_status": o.get("payment_status", "paid"), "payment_id": o.get("razorpay_payment_id"), "payment_method": o.get("payment_method"), "razorpay_order_id": o.get("razorpay_order_id"), "created_at": o.get("created_at", ""), "paid_at": o.get("paid_at"), "download_count": o.get("download_count", 0), "last_downloaded_at": o.get("last_downloaded_at")})
    return {"customer": _clean_doc(customer), "total_orders": stats.get("purchased_assets", 0), "total_downloads": stats.get("total_downloads", 0), "total_spent": stats.get("total_spent", 0), "purchased_assets": stats.get("purchased_assets", 0), "recent_orders": recent}

@router.get("/orders")
async def customer_orders(search: str = "", page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), customer: dict = Depends(get_current_customer)):
    orders = await _get_paid_orders(customer["email"], search=search, limit=per_page)
    slugs = [o.get("product_slug", "") for o in orders if o.get("product_slug")]
    images = await _get_product_images(slugs)
    items = []
    for o in orders:
        s = o.get("product_slug", "")
        items.append({"id": o.get("id", ""), "product_name": o.get("product_name", "Product"), "product_slug": s, "product_image": images.get(s, ""), "amount": o.get("amount", 0), "currency": o.get("currency", "INR"), "payment_status": o.get("payment_status", "paid"), "payment_method": o.get("payment_method"), "razorpay_order_id": o.get("razorpay_order_id"), "razorpay_payment_id": o.get("razorpay_payment_id"), "created_at": o.get("created_at", ""), "paid_at": o.get("paid_at"), "download_count": o.get("download_count", 0), "last_downloaded_at": o.get("last_downloaded_at")})
    return {"items": items, "total": len(items), "page": page, "per_page": per_page}

@router.get("/orders/{order_id}")
async def customer_order_detail(order_id: str, customer: dict = Depends(get_current_customer)):
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    email = customer["email"]
    order = await db.orders.find_one({"id": order_id, "customer_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, "payment_status": {"$in": list(PAID_STATUSES)}}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    slug = order.get("product_slug", "")
    product_info = {"name": "", "slug": "", "image": "", "description": ""}
    if slug:
        p = await db.products.find_one({"slug": slug}, {"_id": 0, "name": 1, "slug": 1, "hero_image": 1, "images": 1, "description": 1})
        if p:
            img = p.get("hero_image") or (p.get("images") or [None])[0] or ""
            product_info = {"name": p.get("name", ""), "slug": slug, "image": img, "description": p.get("description", "")}
    history = []
    if db:
        history = await db.download_logs.find({"order_id": order_id}, {"_id": 0, "downloaded_at": 1, "ip_address": 1}).sort("downloaded_at", -1).to_list(length=50)
    return {"order": {"id": order.get("id", ""), "razorpay_order_id": order.get("razorpay_order_id"), "razorpay_payment_id": order.get("razorpay_payment_id"), "product_name": order.get("product_name", "Product"), "product_slug": slug, "amount": order.get("amount", 0), "currency": order.get("currency", "INR"), "payment_status": order.get("payment_status", ""), "payment_method": order.get("payment_method"), "customer_name": order.get("customer_name", customer.get("name", "")), "customer_email": order.get("customer_email", email), "customer_phone": order.get("customer_phone", ""), "created_at": order.get("created_at", ""), "paid_at": order.get("paid_at"), "download_count": order.get("download_count", 0), "last_downloaded_at": order.get("last_downloaded_at")}, "product": product_info, "download_history": history}

@router.post("/orders/{order_id}/download-link")
async def customer_download_link(order_id: str, customer: dict = Depends(get_current_customer)):
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    _check_rate_limit(customer["id"])
    email = customer["email"]
    order = await db.orders.find_one({"id": order_id, "customer_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, "payment_status": {"$in": list(PAID_STATUSES)}}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or payment not verified")
    slug = order.get("product_slug", "")
    download_url = ""
    if slug:
        p = await db.products.find_one({"slug": slug}, {"download_file": 1, "download_file_url": 1, "_id": 0})
        if p:
            download_url = p.get("download_file_url") or p.get("download_file", "")
    if not download_url:
        raise HTTPException(status_code=404, detail="Download file not available")
    now = _now_iso()
    await db.download_logs.insert_one({"id": str(uuid.uuid4()), "order_id": order_id, "customer_id": customer["id"], "customer_email": email, "product_slug": slug, "downloaded_at": now, "ip_address": "", "user_agent": ""})
    await db.orders.update_one({"id": order_id}, {"$inc": {"download_count": 1}, "$set": {"last_downloaded_at": now}})
    signed = _generate_signed_url(order_id, customer["id"], slug)
    return {"url": download_url, "signed_url": signed, "download_count": (order.get("download_count", 0) or 0) + 1}

@router.get("/downloads/access")
async def verify_signed_download(order_id: str = Query(...), customer_id: str = Query(...), product: str = Query(...), expires: float = Query(...), sig: str = Query(...)):
    if datetime.now(timezone.utc).timestamp() > expires:
        return JSONResponse(status_code=410, content={"success": False, "message": "Download link has expired"})
    expected = hmac.new(JWT_SECRET.encode(), f"{order_id}:{customer_id}:{product}:{expires}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=403, detail="Invalid download link")
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    p = await db.products.find_one({"slug": product}, {"download_file": 1, "download_file_url": 1, "_id": 0})
    url = ""
    if p:
        url = p.get("download_file_url") or p.get("download_file", "")
    if not url:
        raise HTTPException(status_code=404, detail="Download file not found")
    return RedirectResponse(url=url)

@router.post("/orders/{order_id}/invoice")
async def customer_invoice(order_id: str, customer: dict = Depends(get_current_customer)):
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    email = customer["email"]
    order = await db.orders.find_one({"id": order_id, "customer_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, "payment_status": {"$in": list(PAID_STATUSES)}}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or payment not verified")
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from io import BytesIO
        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        styles = getSampleStyleSheet()
        elements = [
            Paragraph("PRANVITH DOP", ParagraphStyle("T2", parent=styles["Title"], fontSize=24, spaceAfter=6)),
            Paragraph("INVOICE", ParagraphStyle("T3", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#6b21a8"), spaceAfter=20)),
            Paragraph(f"<b>Invoice ID:</b> INV-{order.get('id', '')[:12].upper()}", ParagraphStyle("D", fontSize=10, spaceAfter=4)),
            Paragraph(f"<b>Date:</b> {(order.get('paid_at') or order.get('created_at', '')).split('T')[0] if order.get('paid_at') or order.get('created_at') else 'N/A'}", ParagraphStyle("D", fontSize=10, spaceAfter=4)),
            Paragraph(f"<b>Payment ID:</b> {order.get('razorpay_payment_id', 'N/A')}", ParagraphStyle("D", fontSize=10, spaceAfter=4)),
            Paragraph(f"<b>Order ID:</b> {order.get('razorpay_order_id', 'N/A')}", ParagraphStyle("D", fontSize=10, spaceAfter=4)),
            Spacer(1, 15*mm),
            Paragraph("<b>BILLED TO</b>", ParagraphStyle("S", fontSize=12, spaceAfter=6, textColor=colors.HexColor("#6b21a8"))),
            Paragraph(f"<b>{order.get('customer_name', customer.get('name', 'Customer'))}</b>", styles["Normal"]),
            Paragraph(email, styles["Normal"]),
        ]
        if order.get("customer_phone"):
            elements.append(Paragraph(order["customer_phone"], styles["Normal"]))
        elements.append(Spacer(1, 10*mm))
        amount = (order.get("amount", 0) or 0) / 100
        table = Table([["Product", "Amount"], [order.get("product_name", "Digital Product"), f"\u20b9{amount:,.2f}"], ["", ""], ["Total", f"\u20b9{amount:,.2f}"]], colWidths=[350, 100])
        table.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 10), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6b21a8")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("GRID", (0, 0), (-1, -2), 0.5, colors.grey), ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#6b21a8")), ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
        elements.append(table)
        elements.append(Spacer(1, 15*mm))
        elements.append(Paragraph("Thank you for your purchase!", ParagraphStyle("F", fontSize=10, textColor=colors.grey, alignment=1)))
        doc.build(elements)
        pdf = buf.getvalue()
        buf.close()
        return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="invoice-{order.get("id", "order")[:12]}.pdf"'})
    except ImportError:
        logger.warning("reportlab not available for PDF generation")
        return JSONResponse(content={"success": True, "invoice": {"order_id": order.get("id", ""), "razorpay_order_id": order.get("razorpay_order_id"), "razorpay_payment_id": order.get("razorpay_payment_id"), "product_name": order.get("product_name"), "amount": order.get("amount", 0), "currency": order.get("currency", "INR"), "customer_name": order.get("customer_name", customer.get("name", "")), "customer_email": email, "paid_at": order.get("paid_at")}})

@router.get("/profile")
async def customer_profile(customer: dict = Depends(get_current_customer)):
    return {"customer": _clean_doc(customer)}

@router.put("/profile")
async def update_customer_profile(update: ProfileUpdateIn, customer: dict = Depends(get_current_customer)):
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    upd = {}
    if update.name is not None:
        upd["name"] = update.name
    if update.profile_photo is not None:
        upd["profile_photo"] = update.profile_photo
    if upd:
        upd["updated_at"] = _now_iso()
        await db.customers.update_one({"id": customer["id"]}, {"$set": upd})
        updated = await db.customers.find_one({"id": customer["id"]}, {"_id": 0})
        return {"customer": updated or {**customer, **upd}}
    return {"customer": _clean_doc(customer)}

@router.get("/downloads")
async def customer_downloads(customer: dict = Depends(get_current_customer)):
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    email = customer["email"]
    orders = await db.orders.find({"customer_email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, "payment_status": {"$in": list(PAID_STATUSES)}}, {"_id": 0}).sort("paid_at", -1).to_list(length=100)
    items = []
    for o in orders:
        slug = o.get("product_slug", "")
        pinfo = {"name": "", "image": "", "version": ""}
        if slug:
            p = await db.products.find_one({"slug": slug}, {"name": 1, "hero_image": 1, "images": 1, "download_file_name": 1, "_id": 0})
            if p:
                pinfo = {"name": p.get("name", ""), "image": p.get("hero_image") or (p.get("images") or [None])[0] or "", "version": p.get("download_file_name", "")}
        hist = await db.download_logs.find({"order_id": o.get("id", "")}, {"_id": 0, "downloaded_at": 1}).sort("downloaded_at", -1).to_list(length=10)
        items.append({"order_id": o.get("id", ""), "product_name": pinfo.get("name", o.get("product_name", "Product")), "product_slug": slug, "product_image": pinfo.get("image", ""), "latest_version": pinfo.get("version", "1.0"), "download_count": o.get("download_count", 0), "last_downloaded_at": o.get("last_downloaded_at"), "download_history": hist, "status": "available", "paid_at": o.get("paid_at", o.get("created_at", ""))})
    return {"items": items}
