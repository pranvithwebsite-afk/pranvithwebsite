
import asyncio
import csv
import hashlib
import hmac
import html
import io
import json
import logging
import os
import re
import secrets
import smtplib
import ssl
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import boto3
import motor.motor_asyncio
import razorpay
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import (APIRouter, BackgroundTasks, Depends, FastAPI, File, Form,
                   HTTPException, Query, Request, Response, UploadFile, status)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import (BaseModel, ConfigDict, EmailStr, Field, HttpUrl,
                      ValidationError, field_validator, model_validator)
from pymongo.errors import DuplicateKeyError

from ..database import db
from ..models.models import *
from ..excel_export import create_excel_report
from ..utils.auth import (get_current_active_admin, get_current_admin,
                          get_current_super_admin, authenticate_admin, get_admin_by_id, verify_password, get_password_hash,
                          validate_password_confirmation, create_access_token, assert_not_last_super_admin, validate_admin_role,
                          admin_doc_to_public)

from ..utils.cms import (CMS_PAGE_KEYS, CMS_PAGE_PATHS,
                         _cms_page_doc, _cms_page_response, _cms_section_doc,
                         _normalize_cms_page_key)
from ..utils.common import (MEDIA_URL_FIELDS, PAYMENT_ATTEMPT_STATUSES,
                            R2_DIRECT_VIDEO_PURPOSES, R2_IMAGE_TYPES,
                            R2_MAX_IMAGE_BYTES, R2_MAX_PRIVATE_BYTES,
                            R2_MAX_VIDEO_BYTES, R2_PRIVATE_PURPOSES,
                            R2_PUBLIC_PURPOSES, R2_VIDEO_TYPES, ROOT_DIR,
                            UPLOAD_DIR, _is_razorpay_auth_error,
                            _normalize_public_origin,
                            _payment_link_config_error_response,
                            _payment_link_config_status,
                            _payment_link_warning_payload,
                            _razorpay_error_summary, _razorpay_http_status,
                            _razorpay_log_details, _razorpay_not_found_error,
                            _razorpay_public_error,
                            _require_razorpay_client, _r2_client,
                            _r2_config_status, _r2_not_configured_detail,
                            _r2_private_object_key,
                            _r2_public_object_key,
                            _r2_require_public_upload_config,
                            _safe_filename, backend_env_status,
                            mongodb_config_summary, mongodb_error_category,
                            mongodb_public_error, normalize_slug,
                            product_url_for_slug, razorpay_config_summary)

from ..utils.services import _normalize_service_doc, _public_service
from ..utils.products import _normalize_product_media_fields
from ..utils.orders import _report_orders, _public_order_payload
from ..utils.payments import _public_payment_attempt_payload
from ..utils.media import (_store_public_r2_media, _validate_media_library_upload, _validate_r2_public_upload, 
                           _validate_r2_private_upload, _validate_direct_video_upload_request, _r2_direct_video_object_key,
                           _save_direct_video_media_record, _media_usage_locations, _delete_media_storage, _remove_duplicate_media_records,
                           _serialize_media_record, _upsert_media_record_by_storage)
from ..utils.razorpay import (_create_razorpay_payment_link_for_product, _refresh_razorpay_payment_link_for_product,
                              _sync_order_with_razorpay, _sync_payment_with_razorpay)

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin", tags=["admin"])

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
    orders_count = await db.orders.count_documents({"payment_status": "paid", "verified": True})
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
        "environment": backend_env_status(),
    }


@admin_router.get("/debug/payment-link-config")
async def admin_payment_link_config_debug(current_admin: AdminBase = Depends(get_current_active_admin)):
    return {
        "success": True,
        "config": _payment_link_config_status(),
    }


@admin_router.get("/debug/domain-config")
async def admin_domain_config_debug(current_admin: AdminBase = Depends(get_current_active_admin)):
    return {
        "success": True,
        "PUBLIC_SITE_URL": _normalize_public_origin(os.environ.get("PUBLIC_SITE_URL")),
        "FRONTEND_URL": _normalize_public_origin(os.environ.get("FRONTEND_URL")),
        "CLOUDFLARE_R2_PUBLIC_BASE_URL": _normalize_public_origin(
            os.environ.get("CLOUDFLARE_R2_PUBLIC_BASE_URL"),
            default="https://assets.pranvithdop.com",
        ),
        "api_expected": "/api routes on same Vercel domain",
    }


@admin_router.get("/debug/r2-health")
async def admin_r2_health(current_admin: AdminBase = Depends(get_current_active_admin)):
    config = _r2_config_status()
    return {
        "success": True,
        "configured": all(value == "SET" for value in config.values()),
        "fields": config,
        "cors_required_origins": [
            "https://pranvithdop.com",
            "http://localhost:3000",
            "http://localhost:5173",
        ],
        "cors_required_methods": ["PUT", "GET"],
        "cors_required_headers": ["Content-Type", "Authorization"],
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


@admin_router.get("/services", response_model=List[Service])
async def admin_services(current_admin: AdminBase = Depends(get_current_active_admin)):
    rows = await db.services.find({}, {"_id": 0}).sort("sort_order", 1).to_list(300)
    return [_public_service(row) for row in rows]


@admin_router.post("/services")
async def admin_create_service(payload: ServiceIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    doc = _normalize_service_doc(payload.model_dump())
    if not doc.get("sort_order"):
        last = await db.services.find_one({}, {"_id": 0, "sort_order": 1}, sort=[("sort_order", -1)])
        doc["sort_order"] = int((last or {}).get("sort_order") or 0) + 1
    existing = await db.services.find_one({"slug": doc["slug"]})
    if existing:
        raise HTTPException(status_code=409, detail="Service slug already exists")
    try:
        await db.services.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Service slug already exists")
    return {"success": True, "service": doc}


@admin_router.put("/services/{service_id}")
async def admin_update_service(service_id: str, payload: ServiceIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    existing_doc = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not existing_doc:
        raise HTTPException(status_code=404, detail="Service not found")
    update_doc = _normalize_service_doc(payload.model_dump(exclude_none=True), existing=existing_doc)
    duplicate = await db.services.find_one({"slug": update_doc["slug"], "id": {"$ne": service_id}})
    if duplicate:
        raise HTTPException(status_code=409, detail="Service slug already exists")
    await db.services.update_one({"id": service_id}, {"$set": update_doc})
    return {"success": True, "service": update_doc}


@admin_router.delete("/services/{service_id}")
async def admin_delete_service(service_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True}


@admin_router.patch("/services/{service_id}/publish")
async def admin_publish_service(service_id: str, payload: ServicePublishIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.services.update_one(
        {"id": service_id},
        {"$set": {"is_published": payload.is_published, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True, "is_published": payload.is_published}


@admin_router.patch("/services/reorder")
async def admin_reorder_services(payload: ServiceReorderIn, current_admin: AdminBase = Depends(get_current_active_admin)):
    existing = await db.services.find({}, {"_id": 0, "id": 1}).to_list(500)
    existing_ids = {row["id"] for row in existing}
    ordered_ids = [item_id for item_id in payload.service_ids if item_id in existing_ids]
    for row in existing:
        if row["id"] not in ordered_ids:
            ordered_ids.append(row["id"])
    now = datetime.now(timezone.utc).isoformat()
    for index, service_id in enumerate(ordered_ids):
        await db.services.update_one({"id": service_id}, {"$set": {"sort_order": index + 1, "updated_at": now}})
    rows = await db.services.find({}, {"_id": 0}).sort("sort_order", 1).to_list(300)
    return {"success": True, "services": [_public_service(row) for row in rows]}


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
    print("ADMIN_CREATE_PAYMENT_LINK_START", product_id)
    if db is None:
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_DB_MISSING", product_id)
        return _json_error_response(503, "Payment link creation failed", detail="Database not configured")
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_CONFIG_ERROR", product_id, _payment_link_config_status())
        return _payment_link_config_error_response("create")

    try:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
    except Exception as error:
        safe_detail = mongodb_public_error(error)
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_LOOKUP_ERROR", product_id, safe_detail)
        print("Payment link creation failed:", repr(error))
        logger.exception("Payment link product lookup failed product_id=%s detail=%s", product_id, safe_detail)
        return _json_error_response(503, "Payment link creation failed", detail=safe_detail)

    if not product:
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_NOT_FOUND", product_id)
        return _json_error_response(404, "Product not found", code="PRODUCT_NOT_FOUND")

    try:
        link_result = await _create_razorpay_payment_link_for_product(product)
        try:
            await db.products.update_one({"id": product_id}, {"$set": link_result["fields"]})
        except Exception as error:
            safe_detail = mongodb_public_error(error)
            payment_link_id = link_result.get("fields", {}).get("razorpay_payment_link_id")
            print("ADMIN_CREATE_PAYMENT_LINK_RETURN_DB_SAVE_WARNING", product_id, payment_link_id, safe_detail)
            logger.exception("Payment link created but local save failed product_id=%s payment_link_id=%s detail=%s", product_id, payment_link_id, safe_detail)
            return _json_error_response(
                503,
                "Payment link created in Razorpay but could not be saved locally",
                code="PAYMENT_LINK_SAVE_WARNING",
                detail=safe_detail,
                extra={
                    "payment_link_id": payment_link_id,
                    "payment_link_url": link_result.get("fields", {}).get("razorpay_payment_link_url"),
                    "payment_link_status": link_result.get("fields", {}).get("razorpay_payment_link_status"),
                },
            )
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_SUCCESS", product_id, link_result.get("created"))
        return {
            "success": True,
            "created": link_result["created"],
            "product_id": product_id,
            **link_result["fields"],
        }
    except HTTPException as error:
        safe_detail = error.detail if isinstance(error.detail, str) else "Payment link creation failed"
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_HTTP_ERROR", product_id, error.status_code, safe_detail)
        print("Payment link creation failed:", repr(error))
        if error.status_code in {401, 402, 403, 502, 503} and (
            safe_detail == RAZORPAY_AUTH_ERROR_MESSAGE
            or safe_detail == RAZORPAY_CONFIG_ERROR_MESSAGE
            or (isinstance(error.detail, dict) and error.detail.get("code") == "RAZORPAY_CONFIG_ERROR")
        ):
            return _payment_link_config_error_response("create")
        if isinstance(error.detail, dict):
            return JSONResponse(
                status_code=error.status_code if error.status_code < 500 else 502,
                content=error.detail,
            )
        return _json_error_response(
            error.status_code if error.status_code < 500 else 502,
            "Payment link creation failed",
            detail=safe_detail,
        )
    except Exception as error:
        safe_detail = _razorpay_public_error(error)
        print("ADMIN_CREATE_PAYMENT_LINK_RETURN_UNHANDLED_ERROR", product_id, safe_detail)
        print("Payment link creation failed:", repr(error))
        logger.exception("Payment link creation crashed product_id=%s", product_id)
        return _json_error_response(502, "Payment link creation failed", detail=safe_detail)


@admin_router.post("/products/{product_id}/refresh-payment-link")
async def admin_refresh_product_payment_link(product_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    if db is None:
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_DB_MISSING", product_id)
        return _json_error_response(503, "Payment link status refresh failed", detail="Database not configured")
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET or razorpay_client is None:
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_CONFIG_ERROR", product_id, _payment_link_config_status())
        return _payment_link_config_error_response("refresh")

    try:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
    except Exception as error:
        safe_detail = mongodb_public_error(error)
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_LOOKUP_ERROR", product_id, safe_detail)
        print("Payment link status refresh failed:", repr(error))
        logger.exception("Payment link refresh product lookup failed product_id=%s detail=%s", product_id, safe_detail)
        return _json_error_response(503, "Payment link status refresh failed", detail=safe_detail)

    if not product:
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_NOT_FOUND", product_id)
        return _json_error_response(404, "Product not found", code="PRODUCT_NOT_FOUND")

    try:
        link_result = await _refresh_razorpay_payment_link_for_product(product)
        try:
            await db.products.update_one({"id": product_id}, {"$set": link_result["fields"]})
        except Exception as error:
            safe_detail = mongodb_public_error(error)
            payment_link_id = link_result.get("fields", {}).get("razorpay_payment_link_id")
            print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_DB_SAVE_WARNING", product_id, payment_link_id, safe_detail)
            logger.exception("Payment link refresh succeeded but local save failed product_id=%s payment_link_id=%s detail=%s", product_id, payment_link_id, safe_detail)
            return _json_error_response(
                503,
                "Payment link status refreshed in Razorpay but could not be saved locally",
                code="PAYMENT_LINK_SAVE_WARNING",
                detail=safe_detail,
                extra={
                    "payment_link_id": payment_link_id,
                    "payment_link_url": link_result.get("fields", {}).get("razorpay_payment_link_url"),
                    "payment_link_status": link_result.get("fields", {}).get("razorpay_payment_link_status"),
                },
            )
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_SUCCESS", product_id)
        return {
            "success": True,
            "product_id": product_id,
            **link_result["fields"],
        }
    except HTTPException as error:
        safe_detail = error.detail if isinstance(error.detail, str) else "Payment link status refresh failed"
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_HTTP_ERROR", product_id, error.status_code, safe_detail)
        print("Payment link status refresh failed:", repr(error))
        if (
            isinstance(error.detail, dict)
            and error.detail.get("code") == "STALE_PAYMENT_LINK"
            and product.get("razorpay_payment_link_id")
        ):
            try:
                await db.products.update_one(
                    {"id": product_id},
                    {"$set": {"razorpay_payment_link_status": "stale"}, "$unset": {"razorpay_payment_link_id": "", "razorpay_payment_link_url": ""}},
                )
            except Exception as stale_update_error:
                logger.exception("Failed to clear stale payment link metadata product_id=%s error=%s", product_id, mongodb_public_error(stale_update_error))
        if error.status_code in {401, 402, 403, 502, 503} and (
            safe_detail == RAZORPAY_AUTH_ERROR_MESSAGE
            or safe_detail == RAZORPAY_CONFIG_ERROR_MESSAGE
            or (isinstance(error.detail, dict) and error.detail.get("code") == "RAZORPAY_CONFIG_ERROR")
        ):
            return _payment_link_config_error_response("refresh")
        if isinstance(error.detail, dict):
            return JSONResponse(
                status_code=error.status_code if error.status_code < 500 else 502,
                content=error.detail,
            )
        return _json_error_response(
            error.status_code if error.status_code < 500 else 502,
            "Payment link status refresh failed",
            detail=safe_detail,
        )
    except Exception as error:
        safe_detail = _razorpay_public_error(error)
        print("ADMIN_REFRESH_PAYMENT_LINK_RETURN_UNHANDLED_ERROR", product_id, safe_detail)
        print("Payment link status refresh failed:", repr(error))
        logger.exception("Payment link refresh crashed product_id=%s", product_id)
        return _json_error_response(502, "Payment link status refresh failed", detail=safe_detail)


@admin_router.get("/reports/orders")
async def admin_report_orders(start: Optional[str] = None, end: Optional[str] = None, status_filter: Optional[str] = None, search: Optional[str] = None, page: int = 1, page_size: int = 50, current_admin: AdminBase = Depends(get_current_active_admin)):
    return await _report_orders(start, end, status_filter, search, (max(page, 1) - 1) * page_size, page_size)


@admin_router.get("/reports/dashboard")
async def admin_report_dashboard(current_admin: AdminBase = Depends(get_current_active_admin)):
    today = datetime.now(timezone.utc).date().isoformat()
    all_data = await _report_orders(limit=1)
    today_data = await _report_orders(start=today, end=today, limit=1)
    customers = await db.orders.distinct("customer_email", {"payment_status": "paid"})
    downloads = await db.download_logs.count_documents({})
    products = await db.products.count_documents({})
    return {"today_orders": today_data["summary"].get("orders", 0), "today_revenue": today_data["summary"].get("revenue", 0), "lifetime_revenue": all_data["summary"].get("revenue", 0), "total_customers": len([x for x in customers if x]), "total_products": products, "total_downloads": downloads, "pending_orders": all_data["summary"].get("pending", 0), "failed_orders": all_data["summary"].get("failed", 0), "cancelled_orders": all_data["summary"].get("cancelled", 0)}


@admin_router.get("/reports/customers")
async def admin_report_customers(start: Optional[str] = None, end: Optional[str] = None, search: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    match = _report_match(start, end, None, search)
    if "$or" in match: match.pop("$or")  # Customer search is applied after aggregation by stable fields.
    pipeline = [{"$match": match}, {"$group": {"_id": "$customer_email", "customer_name": {"$last": "$customer_name"}, "phone": {"$last": "$customer_phone"}, "first_purchase": {"$min": "$created_at"}, "last_purchase": {"$max": "$created_at"}, "total_orders": {"$sum": 1}, "successful_orders": {"$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, 1, 0]}}, "failed_orders": {"$sum": {"$cond": [{"$eq": ["$payment_status", "failed"]}, 1, 0]}}, "amount_spent": {"$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, "$amount", 0]}}, "products": {"$addToSet": "$product_name"}, "downloads": {"$sum": {"$ifNull": ["$download_count", 0]}}}}, {"$project": {"_id": 0, "email": "$_id", "customer_name": 1, "phone": 1, "first_purchase": 1, "last_purchase": 1, "total_orders": 1, "successful_orders": 1, "failed_orders": 1, "amount_spent": 1, "purchased_products": "$products", "downloads": 1}}, {"$sort": {"last_purchase": -1}}]
    return {"items": await db.orders.aggregate(pipeline, allowDiskUse=True).to_list(10000)}


@admin_router.get("/reports/downloads")
async def admin_report_downloads(start: Optional[str] = None, end: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    match = {"downloaded_at": {}}
    if start: match["downloaded_at"]["$gte"] = start
    if end: match["downloaded_at"]["$lte"] = f"{end}T23:59:59.999999+00:00"
    if not match["downloaded_at"]: match = {}
    return {"items": await db.download_logs.find(match, {"_id": 0}).sort("downloaded_at", -1).to_list(10000), "total": await db.download_logs.count_documents(match)}


@admin_router.get("/reports/revenue")
async def admin_report_revenue(start: Optional[str] = None, end: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    match = _report_match(start, end, "paid", None)
    pipeline = [{"$match": match}, {"$group": {"_id": {"$substrBytes": ["$paid_at", 0, 10]}, "revenue": {"$sum": "$amount"}, "orders": {"$sum": 1}}}, {"$sort": {"_id": 1}}]
    return {"items": [{"date": row["_id"], "revenue": row["revenue"], "orders": row["orders"]} async for row in db.orders.aggregate(pipeline, allowDiskUse=True)]}


@admin_router.get("/reports/products")
async def admin_report_products(start: Optional[str] = None, end: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    match = _report_match(start, end, None, None)
    pipeline = [{"$match": match}, {"$group": {"_id": "$product_slug", "product": {"$last": "$product_name"}, "sales_count": {"$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, 1, 0]}}, "revenue": {"$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, "$amount", 0]}}, "unique_customers": {"$addToSet": "$customer_email"}, "downloads": {"$sum": {"$ifNull": ["$download_count", 0]}}}}, {"$project": {"_id": 0, "product_slug": "$_id", "product": 1, "sales_count": 1, "revenue": 1, "unique_customers": {"$size": "$unique_customers"}, "downloads": 1}}, {"$sort": {"revenue": -1}}]
    return {"items": await db.orders.aggregate(pipeline, allowDiskUse=True).to_list(10000)}


@admin_router.get("/reports/orders/excel")
async def admin_report_orders_excel(
    start: Optional[str] = None,
    end: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    """
    Exports a list of orders to an Excel file.
    """
    data = await _report_orders(start, end, status_filter, search, 0, 1000000)
    orders = data.get("items", [])
    summary = data.get("summary", {})

    report_data = []
    for order in orders:
        report_data.append({
            "Order ID": order.get("id"),
            "Customer Name": order.get("customer_name"),
            "Email": order.get("customer_email"),
            "Phone": order.get("customer_phone"),
            "Product": order.get("product_name"),
            "Category": None,  # Not available in _report_orders
            "Price": order.get("amount"),
            "Discount": 0,  # Not available in _report_orders
            "Tax": 0,  # Not available in _report_orders
            "Total": order.get("amount"),
            "Payment Method": "Razorpay", # Hardcoded for now
            "Payment Status": order.get("payment_status"),
            "Verified": order.get("payment_status") == "paid",
            "Purchase Date": order.get("created_at"),
            "Download Status": "Downloaded" if order.get("download_count", 0) > 0 else "Not Downloaded",
            "Downloaded At": None, # Not available in _report_orders
            "Country": None, # Not available in _report_orders
            "State": None, # Not available in _report_orders
            "City": None, # Not available in _report_orders
        })

    # Prepare summary data
    total_orders = summary.get("total_orders", 0)
    total_revenue = summary.get("total_revenue", 0)
    summary_data = {
        "Total Orders": total_orders,
        "Revenue": total_revenue,
        "Downloads": sum(o.get("download_count", 0) for o in orders),
        "Average Order Value": total_revenue / total_orders if total_orders > 0 else 0,
    }


    file_buffer = create_excel_report(
        title="Orders Report",
        report_data=report_data,
        summary_data=summary_data,
        sheet_name="Orders"
    )

    return StreamingResponse(
        io.BytesIO(file_buffer),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=orders_{datetime.now().strftime('%Y-%m-%d')}.xlsx"}
    )


@admin_router.get("/reports/export/csv")
async def admin_report_csv(start: Optional[str] = None, end: Optional[str] = None, status_filter: Optional[str] = None, search: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    data = await _report_orders(start, end, status_filter, search, 0, 100000)
    fields = ["id", "created_at", "customer_name", "customer_email", "customer_phone", "product_name", "product_slug", "amount", "currency", "payment_status", "razorpay_order_id", "razorpay_payment_id", "email_delivery_status", "download_count"]
    def stream():
        output = io.StringIO(); writer = csv.DictWriter(output, fieldnames=fields); writer.writeheader(); yield "\ufeff" + output.getvalue(); output.seek(0); output.truncate(0)
        for row in data["items"]:
            writer.writerow({key: row.get(key, "") for key in fields}); yield output.getvalue(); output.seek(0); output.truncate(0)
    return StreamingResponse(stream(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=orders-report.csv"})


@admin_router.get("/reports/export/excel")
async def admin_report_excel(start: Optional[str] = None, end: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    from openpyxl import Workbook
    from openpyxl.styles import Font
    rows = (await _report_orders(start, end, None, None, 0, 100000))["items"]
    workbook = Workbook(); sheet = workbook.active; sheet.title = "Orders"
    fields = ["id", "created_at", "customer_name", "customer_email", "customer_phone", "product_name", "amount", "currency", "payment_status", "razorpay_order_id", "razorpay_payment_id", "email_delivery_status", "download_count"]
    sheet.append(fields)
    for cell in sheet[1]: cell.font = Font(bold=True)
    sheet.freeze_panes = "A2"; sheet.auto_filter.ref = f"A1:{chr(64 + len(fields))}{max(len(rows) + 1, 1)}"
    for row in rows: sheet.append([row.get(key, "") for key in fields])
    for column in sheet.columns: sheet.column_dimensions[column[0].column_letter].width = min(max(len(str(cell.value or "")) for cell in column) + 2, 36)
    output = io.BytesIO(); workbook.save(output); output.seek(0)
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=orders-report.xlsx"})


@admin_router.get("/reports/export/pdf")
async def admin_report_pdf(start: Optional[str] = None, end: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    data = await _report_orders(start, end, None, None, 0, 500)
    output = io.BytesIO(); pdf = canvas.Canvas(output, pagesize=A4); _, height = A4
    pdf.setFont("Helvetica-Bold", 18); pdf.drawString(42, height - 48, "PranvithDOP — Orders Report")
    pdf.setFont("Helvetica", 10); pdf.drawString(42, height - 68, f"Date range: {start or 'All time'} to {end or 'Today'}")
    summary = data["summary"]; pdf.drawString(42, height - 88, f"Orders: {summary.get('orders', 0)}   Paid revenue: ₹{summary.get('revenue', 0) / 100:,.2f}")
    y = height - 116
    for row in data["items"]:
        if y < 50: pdf.showPage(); y = height - 45
        pdf.drawString(42, y, f"{row.get('created_at', '')[:10]}  {row.get('customer_email', '')[:28]}  {row.get('product_name', '')[:28]}  {row.get('payment_status', '')}"); y -= 14
    pdf.save(); output.seek(0)
    return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=orders-report.pdf"})


@admin_router.get("/orders")
async def admin_orders(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        rows = await db.orders.find(
            {"payment_status": "paid", "verified": True},
            {
                "_id": 0,
                "download_file": 0,
                "download_url": 0,
                "download_token_hash": 0,
                "razorpay_signature": 0,
            },
        ).sort([("created_at", -1)]).to_list(500)
        return [_public_order_payload(row) for row in rows]
    except Exception:
        logger.exception("Admin orders fetch failed")
        raise HTTPException(status_code=500, detail="Could not load orders")


@admin_router.get("/payments/payment-attempts")
async def admin_payment_attempts(status: Optional[str] = None, search: Optional[str] = None, current_admin: AdminBase = Depends(get_current_active_admin)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        match: dict = {"payment_status": {"$in": list(PAYMENT_ATTEMPT_STATUSES)}}
        if status and status != "all":
            match["payment_status"] = status
        if search:
            escaped = re.escape(search.strip())
            match["$or"] = [{field: {"$regex": escaped, "$options": "i"}} for field in ["id", "razorpay_order_id", "razorpay_payment_id", "customer_name", "customer_email", "product_name", "product_slug"]]
        rows = await db.payment_attempts.find(match, {"_id": 0}).sort([("created_at", -1)]).to_list(500)
        return [_public_payment_attempt_payload(row) for row in rows]
    except Exception:
        logger.exception("Admin payment attempts fetch failed")
        raise HTTPException(status_code=500, detail="Could not load payment attempts")


@admin_router.get("/reports/payments/excel")
async def admin_report_payments_excel(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    """
    Exports a list of payment attempts to an Excel file.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    match: dict = {"payment_status": {"$in": list(PAYMENT_ATTEMPT_STATUSES)}}
    if status_filter and status_filter != "all":
        match["payment_status"] = status_filter
    if search:
        escaped = re.escape(search.strip())
        match["$or"] = [{field: {"$regex": escaped, "$options": "i"}} for field in ["id", "razorpay_order_id", "razorpay_payment_id", "customer_name", "customer_email", "product_name", "product_slug"]]
    
    attempts = await db.payment_attempts.find(match, {"_id": 0}).sort([("created_at", -1)]).to_list(1000000)

    report_data = []
    for attempt in attempts:
        report_data.append({
            "Attempt ID": attempt.get("id"),
            "Customer": attempt.get("customer_name"),
            "Email": attempt.get("customer_email"),
            "Phone": attempt.get("customer_phone"),
            "Product": attempt.get("product_name"),
            "Status": attempt.get("payment_status"),
            "Reason": attempt.get("payment_failure_reason"),
            "Gateway": "Razorpay",
            "Created At": attempt.get("created_at"),
            "Updated At": attempt.get("updated_at"),
        })

    # Summary
    summary_data = {
        "Pending": len([a for a in attempts if a.get("payment_status") == "pending"]),
        "Failed": len([a for a in attempts if a.get("payment_status") == "failed"]),
        "Cancelled": len([a for a in attempts if a.get("payment_status") == "cancelled"]),
        "Expired": len([a for a in attempts if a.get("payment_status") == "expired"]),
        "Recovery Rate": 0 # Not sure how to calculate this yet
    }

    file_buffer = create_excel_report(
        title="Payment Attempts Report",
        report_data=report_data,
        summary_data=summary_data,
        sheet_name="Payment Attempts"
    )

    return StreamingResponse(
        io.BytesIO(file_buffer),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=payments_{datetime.now().strftime('%Y-%m-%d')}.xlsx"}
    )



@admin_router.post("/payments/payment-attempts/archive-invalid")
async def admin_archive_invalid_payment_attempts(days: int = 7, current_admin: AdminBase = Depends(get_current_active_admin)):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    cutoff = datetime.now(timezone.utc) - timedelta(days=max(days, 1))
    cutoff_iso = cutoff.isoformat()
    result = await db.payment_attempts.delete_many(
        {
            "payment_status": {"$in": ["pending", "created", "failed", "cancelled", "expired", "abandoned"]},
            "created_at": {"$lt": cutoff_iso},
        }
    )
    return {"success": True, "deleted": result.deleted_count, "cutoff": cutoff_iso}


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


@admin_router.post("/orders/{order_id}/download-access")
async def admin_set_download_access(order_id: str, enabled: bool = True, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.orders.update_one({"$or": [{"id": order_id}, {"razorpay_order_id": order_id}]}, {"$set": {"download_disabled": not enabled, "download_access_updated_at": datetime.now(timezone.utc).isoformat(), "download_access_updated_by": current_admin.id}})
    if not result.matched_count: raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "enabled": enabled}

@admin_router.post("/orders/{order_id}/reset-download-count")
async def admin_reset_download_count(order_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    result = await db.orders.update_one({"$or": [{"id": order_id}, {"razorpay_order_id": order_id}]}, {"$set": {"download_count": 0, "last_downloaded_at": None, "download_count_reset_at": datetime.now(timezone.utc).isoformat(), "download_count_reset_by": current_admin.id}})
    if not result.matched_count: raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True}

@admin_router.get("/orders/{order_id}/download-history")
async def admin_download_history(order_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    return {"items": await db.download_logs.find({"order_id": order_id}, {"_id": 0}).sort([("downloaded_at", -1)]).to_list(500)}


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
        ).sort([("created_at", -1)]).to_list(500)
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
        order_rows = await db.orders.find({}, {"_id": 0, "download_file": 0, "download_url": 0, "download_token_hash": 0, "razorpay_signature": 0}).sort([("created_at", -1)]).to_list(1000)
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
        return await db.hire_requests.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(500)
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
        return await db.media.find({}, {"_id": 0}).sort([("uploaded_at", -1)]).to_list(200)
    except Exception:
        logger.exception("Admin media fetch failed")
        raise HTTPException(status_code=500, detail="Could not load media")



@admin_router.get("/media/{media_id}/usage")
async def admin_media_usage(media_id: str, current_admin: AdminBase = Depends(get_current_active_admin)):
    media = await db.media.find_one({"id": media_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")
    usage_locations = await _media_usage_locations(media.get("url") or media.get("public_url") or "")
    return {
        "success": True,
        "used": bool(usage_locations),
        "locations": usage_locations,
    }


@admin_router.post("/media/remove-duplicates")
async def admin_remove_duplicate_media_records(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        return await _remove_duplicate_media_records(keep="newest")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Admin media duplicate cleanup failed")
        raise HTTPException(status_code=500, detail="Could not remove duplicate media records")


@admin_router.post("/media/upload")
async def admin_upload_media_library(file: UploadFile = File(...), current_admin: AdminBase = Depends(get_current_active_admin)):
    file_ext, max_bytes, media_type = _validate_media_library_upload(file)
    if media_type == "video":
        raise HTTPException(
            status_code=413,
            detail="This video is too large for normal upload. Upload directly to Cloudflare R2 or paste a YouTube/Vimeo/R2 URL.",
        )
    return await _store_public_r2_media(file, "media-library-image" if media_type == "image" else "media-library-file")


@admin_router.get("/settings")
async def admin_settings(current_admin: AdminBase = Depends(get_current_active_admin)):
    try:
        settings_doc = await db.settings.find_one({}, {"_id": 0})
    except Exception:
        logger.exception("Admin settings fetch failed")
        raise HTTPException(status_code=500, detail="Could not load settings")
    if not settings_doc:
        return _safe_settings(SETTINGS)
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
    try:
        existing = await db.products.find_one({"slug": doc["slug"]})
    except Exception as exc:
        detail = mongodb_public_error(exc)
        logger.exception("Product create lookup failed slug=%s detail=%s", doc["slug"], detail)
        return _json_error_response(503, "Product could not be saved", code="PRODUCT_DATABASE_ERROR", detail=detail)
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
    except Exception as exc:
        detail = mongodb_public_error(exc)
        logger.exception("Product create failed id=%s slug=%s detail=%s", doc["id"], doc["slug"], detail)
        return _json_error_response(503, "Product could not be saved", code="PRODUCT_DATABASE_ERROR", detail=detail)
    logger.info(
        "Product created database=%s collection=products id=%s slug=%s",
        db_name,
        doc["id"],
        doc["slug"],
    )
    warning = None
    if create_payment_link and not (doc.get("razorpay_payment_link_id") or doc.get("razorpay_payment_link_url")):
        try:
            link_result = await _create_razorpay_payment_link_for_product(doc)
            doc.update(link_result["fields"])
            await db.products.update_one({"id": doc["id"]}, {"$set": link_result["fields"]})
        except Exception as exc:
            warning = _payment_link_warning_payload(exc)
            logger.warning("Product saved without Razorpay Payment Link id=%s slug=%s warning=%s", doc["id"], doc["slug"], warning)
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
    try:
        existing = await db.products.find_one({"slug": update_doc["slug"], "id": {"$ne": product_id}})
    except Exception as exc:
        detail = mongodb_public_error(exc)
        logger.exception("Product update lookup failed id=%s slug=%s detail=%s", product_id, update_doc["slug"], detail)
        return _json_error_response(503, "Product could not be saved", code="PRODUCT_DATABASE_ERROR", detail=detail)
    if existing:
        raise HTTPException(status_code=409, detail="Product slug already exists")
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        result = await db.products.update_one({"id": product_id}, {"$set": update_doc})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Product slug already exists")
    except Exception as exc:
        detail = mongodb_public_error(exc)
        logger.exception("Product update failed id=%s slug=%s detail=%s", product_id, update_doc["slug"], detail)
        return _json_error_response(503, "Product could not be saved", code="PRODUCT_DATABASE_ERROR", detail=detail)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    warning = None
    if create_payment_link:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not (product.get("razorpay_payment_link_id") or product.get("razorpay_payment_link_url")):
            try:
                link_result = await _create_razorpay_payment_link_for_product(product)
                await db.products.update_one({"id": product_id}, {"$set": link_result["fields"]})
                product.update(link_result["fields"])
            except Exception as exc:
                warning = _payment_link_warning_payload(exc)
                logger.warning("Product updated without Razorpay Payment Link id=%s slug=%s warning=%s", product_id, update_doc["slug"], warning)
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


@admin_router.post("/uploads/public")
async def admin_upload_public_media(
    file: UploadFile = File(...),
    product_slug: str = Form(""),
    purpose: str = Form(...),
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    return await _store_public_r2_media(file, purpose, product_slug)


@admin_router.post("/uploads/video/presign")
async def admin_presign_direct_video_upload(
    payload: DirectVideoUploadSignIn,
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    file_ext, _safe_filename_value, max_bytes = _validate_direct_video_upload_request(payload)
    bucket, public_base = _require_r2_public_upload_config()

    key = _r2_direct_video_object_key(payload.purpose, file_ext, payload.slug)
    try:
        upload_url = _r2_client().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": payload.content_type,
            },
            ExpiresIn=900,
            HttpMethod="PUT",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Direct video presign failed purpose=%s key=%s", payload.purpose, key)
        raise HTTPException(status_code=502, detail="Cloudflare R2 upload could not be prepared")

    return {
        "success": True,
        "upload_url": upload_url,
        "public_url": f"{public_base}/{key}",
        "key": key,
        "method": "PUT",
        "required_headers": {
            "Content-Type": payload.content_type,
        },
        "headers": {
            "Content-Type": payload.content_type,
        },
        "max_bytes": max_bytes,
    }


@admin_router.post("/uploads/presign-video")
async def admin_presign_video_upload(
    payload: DirectVideoUploadSignIn,
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    return await admin_presign_direct_video_upload(payload, current_admin)


@admin_router.post("/uploads/video/complete")
async def admin_complete_direct_video_upload(
    payload: DirectVideoUploadCompleteIn,
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    if db is None:
        raise HTTPException(status_code=500, detail="Database is not configured")
    if payload.purpose not in R2_DIRECT_VIDEO_PURPOSES:
        raise HTTPException(status_code=422, detail="Unsupported video upload purpose")
    if payload.size > R2_MAX_VIDEO_BYTES:
        raise HTTPException(status_code=413, detail="Video exceeds the maximum allowed upload size")

    file_ext = Path(_safe_filename(payload.filename)).suffix.lower()
    allowed_types = R2_VIDEO_TYPES.get(file_ext)
    if not allowed_types or payload.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported video type. Allowed: MP4, WEBM, MOV.")

    _bucket, public_base = _require_r2_public_upload_config()
    if _r2_public_key_from_url(payload.url) != payload.key:
        raise HTTPException(status_code=400, detail="Uploaded video URL does not match the signed key")

    saved_media = await _save_direct_video_media_record(
        key=payload.key,
        filename=payload.filename,
        content_type=payload.content_type,
        size=payload.size,
        purpose=payload.purpose,
        title=payload.title,
    )
    return {
        "success": True,
        "media": saved_media,
        "url": saved_media.get("public_url") or saved_media.get("url") or payload.url,
        "key": payload.key,
        "message": "Video uploaded directly to Cloudflare R2.",
        "filename": saved_media.get("filename") or Path(payload.filename).name,
        "mime_type": saved_media.get("type") or payload.content_type,
        "size_bytes": saved_media.get("size") or payload.size,
    }


@admin_router.post("/uploads/video/fallback")
async def admin_upload_video_fallback(
    file: UploadFile = File(...),
    purpose: str = Form(...),
    slug: str = Form(""),
    title: str = Form(""),
    current_admin: AdminBase = Depends(get_current_active_admin),
):
    if db is None:
        raise HTTPException(status_code=500, detail="Database is not configured")

    safe_filename = _safe_filename(file.filename or "video")
    file_ext = Path(safe_filename).suffix.lower()
    allowed_types = R2_VIDEO_TYPES.get(file_ext)
    if purpose not in R2_DIRECT_VIDEO_PURPOSES:
        raise HTTPException(status_code=422, detail="Unsupported video upload purpose")
    if not allowed_types or file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Unsupported video type. Allowed: MP4, WEBM, MOV.")

    content = await file.read(R2_MAX_VIDEO_BYTES + 1)
    if len(content) > R2_MAX_VIDEO_BYTES:
        limit_mb = R2_MAX_VIDEO_BYTES // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"Video exceeds the maximum allowed upload size of {limit_mb} MB.")

    bucket, public_base = _require_r2_public_upload_config()
    key = _r2_direct_video_object_key(purpose, file_ext, slug)
    try:
        _r2_client().put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Fallback video upload failed key=%s content_type=%s size=%d", key, file.content_type, len(content))
        raise HTTPException(status_code=502, detail="Cloudflare R2 upload failed")

    saved_media = await _save_direct_video_media_record(
        key=key,
        filename=file.filename or safe_filename,
        content_type=file.content_type,
        size=len(content),
        purpose=purpose,
        title=title or file.filename or safe_filename,
    )
    public_url = saved_media.get("public_url") or saved_media.get("url") or f"{public_base}/{key}"
    return {
        "success": True,
        "media": saved_media,
        "url": public_url,
        "key": key,
        "message": "Video uploaded via backend fallback.",
        "filename": saved_media.get("filename") or Path(safe_filename).name,
        "mime_type": saved_media.get("mime_type") or saved_media.get("type") or file.content_type,
        "size_bytes": saved_media.get("size_bytes") or saved_media.get("size") or len(content),
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
    """Compatibility wrapper for legacy callers. New image uploads go to Cloudflare R2."""
    original_name = Path(file.filename or "").name
    file_ext = Path(original_name).suffix.lower()
    if file_ext in R2_VIDEO_TYPES:
        raise HTTPException(
            status_code=413,
            detail="This video is too large for normal upload. Upload directly to Cloudflare R2 or paste a YouTube/Vimeo/R2 URL.",
        )
    if file_ext not in R2_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type. Allowed: JPG, JPEG, PNG, WEBP.")
    return await _store_public_r2_media(file, "media-library-image")


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
    result = await db.media.delete_one({"id": media_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media item not found")
    try:
        storage_result = _delete_media_storage(media)
    except HTTPException as error:
        if error.status_code == 502:
            return {
                "success": True,
                "warning": "Media record deleted, but Cloudflare R2 file deletion failed. Please check R2 manually.",
                "storage": "r2",
                "deleted": False,
            }
        raise
    return {"success": True, **storage_result}
