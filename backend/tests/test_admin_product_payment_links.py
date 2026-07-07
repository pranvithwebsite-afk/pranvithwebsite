import asyncio
import json
from types import SimpleNamespace

import server


class FakeProducts:
    def __init__(self, documents=None):
        self.documents = [dict(document) for document in (documents or [])]

    async def find_one(self, query, projection=None):
        document = next(
            (
                dict(item)
                for item in self.documents
                if all(item.get(key) == value for key, value in query.items())
            ),
            None,
        )
        if document is None or not projection:
            return document
        return {
            key: value
            for key, value in document.items()
            if key != "_id" and projection.get(key, 1) != 0
        }

    async def update_one(self, query, update):
        document = next(
            (
                item
                for item in self.documents
                if all(item.get(key) == value for key, value in query.items())
            ),
            None,
        )
        if document is not None:
            document.update(update.get("$set", {}))


class FakeDatabase:
    def __init__(self, products=None):
        self.products = FakeProducts(products)


def _body(response):
    return json.loads(response.body.decode("utf-8"))


def _product():
    return {
        "id": "product-1",
        "slug": "creative-lut-pack",
        "name": "Creative LUT Pack",
        "price": 499,
        "published": True,
        "razorpay_payment_link_id": "plink_123",
    }


def test_create_payment_link_returns_clean_error_when_razorpay_credentials_missing(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDatabase([_product()]))
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "")
    monkeypatch.setattr(server, "razorpay_client", None)
    monkeypatch.setattr(server, "db_name", "test_db")
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://pranvithdop.com")

    response = asyncio.run(server.admin_create_product_payment_link("product-1", SimpleNamespace(role="admin")))
    body = _body(response)

    assert response.status_code == 503
    assert body == {
        "success": False,
        "message": "Razorpay credentials are missing or invalid",
        "code": "RAZORPAY_CONFIG_ERROR",
        "detail": "Missing required environment variables for Razorpay payment link operations.",
        "missing": [
            "RAZORPAY_KEY_ID",
            "RAZORPAY_KEY_SECRET or RAZORPAY_SECRET",
            "MONGO_URL or DATABASE_URL",
        ],
    }


def test_create_payment_link_returns_clean_error_when_razorpay_api_throws(monkeypatch):
    fake_db = FakeDatabase([_product()])
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "razorpay_client", object())

    async def boom(_product, force=False):
        raise RuntimeError("Upstream payment link create exploded")

    monkeypatch.setattr(server, "_create_razorpay_payment_link_for_product", boom)

    response = asyncio.run(server.admin_create_product_payment_link("product-1", SimpleNamespace(role="admin")))
    body = _body(response)

    assert response.status_code == 502
    assert body == {
        "success": False,
        "message": "Payment link creation failed",
        "detail": "Upstream payment link create exploded",
    }
    assert "super-secret" not in response.body.decode("utf-8")


def test_refresh_payment_link_returns_clean_error_when_razorpay_api_throws(monkeypatch):
    fake_db = FakeDatabase([_product()])
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "razorpay_client", object())

    async def boom(_product):
        raise RuntimeError("Remote payment link fetch failed")

    monkeypatch.setattr(server, "_refresh_razorpay_payment_link_for_product", boom)

    response = asyncio.run(server.admin_refresh_product_payment_link("product-1", SimpleNamespace(role="admin")))
    body = _body(response)

    assert response.status_code == 502
    assert body == {
        "success": False,
        "message": "Payment link status refresh failed",
        "detail": "Remote payment link fetch failed",
    }
    assert "super-secret" not in response.body.decode("utf-8")
