import asyncio
import hashlib
import hmac
import json

from fastapi import HTTPException
from starlette.requests import Request

import server
from test_guest_checkout import FakeCollection, FakeDatabase


def _request(body, signature, event_id="evt_1"):
    headers = [
        (b"content-type", b"application/json"),
        (b"x-razorpay-signature", signature.encode()),
        (b"x-razorpay-event-id", event_id.encode()),
    ]
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(
        {"type": "http", "method": "POST", "path": "/api/webhooks/razorpay", "headers": headers},
        receive,
    )


def test_settings_allowlist_removes_secrets():
    settings = server._safe_settings({
        "site_name": "PranvithDOP",
        "razorpay_key_id": "rzp_test_public",
        "razorpay_key_secret": "must_not_leak",
        "email_smtp_password": "must_not_leak",
    })
    assert settings == {"site_name": "PranvithDOP"}


def test_webhook_rejects_invalid_signature(monkeypatch):
    fake_db = FakeDatabase({})
    fake_db.webhook_events = FakeCollection()
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "webhook_test_secret")

    request = _request(b'{"event":"payment.captured"}', "invalid")
    try:
        asyncio.run(server.razorpay_webhook(request))
        assert False, "Expected webhook signature rejection"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Invalid webhook signature"


def test_webhook_fulfills_once(monkeypatch):
    product = {
        "id": "asset-1",
        "slug": "creative-luts",
        "name": "Creative LUTs",
        "price": 499,
        "published": True,
        "download_file": "https://files.example.com/creative-luts.zip",
        "sold_count": 0,
    }
    fake_db = FakeDatabase(product)
    fake_db.webhook_events = FakeCollection()
    fake_db.orders.documents.append({
        "id": "local-order",
        "razorpay_order_id": "order_webhook",
        "razorpay_payment_id": None,
        "amount": 49900,
        "currency": "INR",
        "product_id": product["id"],
        "product_slug": product["slug"],
        "product_name": product["name"],
        "payment_status": "pending",
        "status": "pending",
        "customer_name": "Buyer",
        "customer_email": "buyer@example.com",
        "customer_phone": "+919876543210",
    })
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "webhook_test_secret")
    email_calls = []
    monkeypatch.setattr(server, "_send_download_email", lambda *args: email_calls.append(args) or {"sent": True, "error": None})

    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook",
                    "order_id": "order_webhook",
                    "amount": 49900,
                    "currency": "INR",
                    "status": "captured",
                    "captured": True,
                }
            }
        },
    }
    body = json.dumps(payload, separators=(",", ":")).encode()
    signature = hmac.new(b"webhook_test_secret", body, hashlib.sha256).hexdigest()

    first = asyncio.run(server.razorpay_webhook(_request(body, signature)))
    second = asyncio.run(server.razorpay_webhook(_request(body, signature)))

    assert first["success"] is True
    assert first["verified_paid"] is True
    assert first["email_sent"] is True
    assert second == {"success": True, "duplicate": True, "status": "processed"}
    assert fake_db.orders.documents[0]["payment_status"] == "paid"
    assert fake_db.orders.documents[0]["email_delivery_status"] == "sent"
    assert fake_db.products.documents[0]["sold_count"] == 1
    assert len(email_calls) == 1


def test_order_paid_webhook_does_not_send_duplicate_email_after_payment_captured(monkeypatch):
    product = {
        "id": "asset-1",
        "slug": "creative-luts",
        "name": "Creative LUTs",
        "price": 499,
        "published": True,
        "download_file": "https://files.example.com/creative-luts.zip",
        "sold_count": 0,
    }
    fake_db = FakeDatabase(product)
    fake_db.webhook_events = FakeCollection()
    fake_db.orders.documents.append({
        "id": "local-order",
        "razorpay_order_id": "order_webhook",
        "razorpay_payment_id": None,
        "amount": 49900,
        "currency": "INR",
        "product_id": product["id"],
        "product_slug": product["slug"],
        "product_name": product["name"],
        "payment_status": "pending",
        "status": "pending",
        "customer_name": "Buyer",
        "customer_email": "buyer@example.com",
        "customer_phone": "+919876543210",
    })
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "webhook_test_secret")
    email_calls = []
    monkeypatch.setattr(server, "_send_download_email", lambda *args: email_calls.append(args) or {"sent": True, "error": None})

    captured_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_webhook",
                    "order_id": "order_webhook",
                    "amount": 49900,
                    "currency": "INR",
                    "status": "captured",
                    "captured": True,
                }
            }
        },
    }
    paid_payload = {
        "event": "order.paid",
        "payload": {
            "order": {
                "entity": {
                    "id": "order_webhook",
                    "amount": 49900,
                    "amount_paid": 49900,
                    "currency": "INR",
                    "status": "paid",
                }
            }
        },
    }
    captured_body = json.dumps(captured_payload, separators=(",", ":")).encode()
    paid_body = json.dumps(paid_payload, separators=(",", ":")).encode()
    captured_signature = hmac.new(b"webhook_test_secret", captured_body, hashlib.sha256).hexdigest()
    paid_signature = hmac.new(b"webhook_test_secret", paid_body, hashlib.sha256).hexdigest()

    first = asyncio.run(server.razorpay_webhook(_request(captured_body, captured_signature, event_id="evt_captured")))
    second = asyncio.run(server.razorpay_webhook(_request(paid_body, paid_signature, event_id="evt_paid")))

    assert first["email_sent"] is True
    assert second["email_sent"] is True
    assert len(email_calls) == 1
    assert fake_db.products.documents[0]["sold_count"] == 1
