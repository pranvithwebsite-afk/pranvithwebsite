import asyncio
import json
from types import SimpleNamespace

import server
from fastapi import HTTPException
from starlette.requests import Request


class FakeProducts:
    def __init__(self, documents=None, fail_update=False):
        self.documents = [dict(document) for document in (documents or [])]
        self.fail_update = fail_update

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
        if self.fail_update:
            raise RuntimeError("database write failed")
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
            for key in update.get("$unset", {}).keys():
                document.pop(key, None)


class FakeDatabase:
    def __init__(self, products=None, fail_update=False):
        self.products = FakeProducts(products, fail_update=fail_update)


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


def _creatable_product():
    product = _product()
    product.pop("razorpay_payment_link_id", None)
    product.pop("razorpay_payment_link_url", None)
    product.pop("razorpay_payment_link_status", None)
    return product


class FakePaymentLinkAPI:
    def __init__(self, *, create_response=None, fetch_response=None, create_error=None, fetch_error=None):
        self.create_response = create_response or {
            "id": "plink_123",
            "short_url": "https://rzp.io/i/plink_123",
            "status": "created",
        }
        self.fetch_response = fetch_response or {
            "id": "plink_123",
            "short_url": "https://rzp.io/i/plink_123",
            "status": "created",
        }
        self.create_error = create_error
        self.fetch_error = fetch_error
        self.created_payloads = []

    def create(self, payload):
        self.created_payloads.append(payload)
        if self.create_error:
            raise self.create_error
        return dict(self.create_response)

    def fetch(self, payment_link_id):
        if self.fetch_error:
            raise self.fetch_error
        response = dict(self.fetch_response)
        response.setdefault("id", payment_link_id)
        return response


class FakeRazorpayClient:
    def __init__(self, payment_link_api):
        self.payment_link = payment_link_api


class FakeBadRequestError(Exception):
    def __init__(self, message="bad request", *, status_code=400, code=None, description=None, field=None, source=None, step=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.description = description
        self.field = field
        self.source = source
        self.step = step


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


def test_create_payment_link_uses_unique_reference_id_and_callback(monkeypatch):
    payment_link_api = FakePaymentLinkAPI()
    fake_db = FakeDatabase([_creatable_product()])
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "razorpay_client", FakeRazorpayClient(payment_link_api))
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://pranvithdop.com")

    response = asyncio.run(server.admin_create_product_payment_link("product-1", SimpleNamespace(role="admin")))

    assert response["success"] is True
    payload = payment_link_api.created_payloads[0]
    assert payload["amount"] == 49900
    assert payload["currency"] == "INR"
    assert payload["reference_id"].startswith("pl_product1_")
    assert len(payload["reference_id"]) <= 40
    assert payload["callback_url"] == "https://pranvithdop.com/assets/creative-lut-pack"
    assert payload["callback_method"] == "get"
    assert "notes" not in payload
    assert response["razorpay_payment_link_reference_id"] == payload["reference_id"]


def test_make_payment_link_reference_is_always_40_chars_or_less():
    product = {
        "id": "cc91e97f1234567890abcdef",
        "slug": "this-is-a-very-long-product-slug-that-should-not-appear-in-full",
        "name": "Very Long Product Name That Should Not Be Used As The Razorpay Reference",
    }

    reference_id = server.make_payment_link_reference(product)

    assert reference_id.startswith("pl_cc91e97f_")
    assert len(reference_id) <= 40


def test_make_payment_link_reference_ignores_long_slug_and_title():
    product = {
        "id": "ABCD1234EFGH5678IJKL9012MNOP3456",
        "slug": "x" * 120,
        "name": "y" * 200,
    }

    reference_id = server.make_payment_link_reference(product)

    assert len(reference_id) <= 40
    assert reference_id.startswith("pl_abcd1234_")
    assert "x" * 10 not in reference_id
    assert "y" * 10 not in reference_id


def test_create_payment_link_rejects_invalid_product_price(monkeypatch):
    product = _creatable_product()
    product["price"] = "₹0"
    product["sale_price"] = ""
    fake_db = FakeDatabase([product])
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "razorpay_client", FakeRazorpayClient(FakePaymentLinkAPI()))

    response = asyncio.run(server.admin_create_product_payment_link("product-1", SimpleNamespace(role="admin")))
    body = _body(response)

    assert response.status_code == 400
    assert body == {
        "success": False,
        "message": "Invalid product price for Razorpay Payment Link",
        "code": "INVALID_PRODUCT_PRICE",
    }


def test_create_payment_link_returns_clean_json_for_razorpay_bad_request(monkeypatch):
    fake_db = FakeDatabase([_creatable_product()])
    payment_link_api = FakePaymentLinkAPI(
        create_error=FakeBadRequestError(
            "reference issue",
            code="BAD_REQUEST_ERROR",
            description="reference_id already exists",
            field="reference_id",
            source="business",
            step="payment_link_create",
        )
    )
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "razorpay_client", FakeRazorpayClient(payment_link_api))
    monkeypatch.setattr(server.razorpay.errors, "BadRequestError", FakeBadRequestError)

    response = asyncio.run(server.admin_create_product_payment_link("product-1", SimpleNamespace(role="admin")))
    body = _body(response)

    assert response.status_code == 409
    assert body == {
        "success": False,
        "message": "Razorpay rejected a duplicate payment link reference",
        "code": "DUPLICATE_REFERENCE_ID",
        "detail": "reference_id already exists",
    }


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


def test_refresh_payment_link_returns_clean_json_for_stale_link(monkeypatch):
    product = _product()
    product["razorpay_payment_link_url"] = "https://rzp.io/i/plink_123"
    product["razorpay_payment_link_status"] = "created"
    fake_db = FakeDatabase([product])
    payment_link_api = FakePaymentLinkAPI(
        fetch_error=FakeBadRequestError(
            "stale link",
            code="BAD_REQUEST_ERROR",
            description="payment link does not exist",
            field="id",
            source="business",
            step="payment_link_fetch",
        )
    )
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "razorpay_client", FakeRazorpayClient(payment_link_api))
    monkeypatch.setattr(server.razorpay.errors, "BadRequestError", FakeBadRequestError)

    response = asyncio.run(server.admin_refresh_product_payment_link("product-1", SimpleNamespace(role="admin")))
    body = _body(response)

    assert response.status_code == 404
    assert body == {
        "success": False,
        "message": "Stored Razorpay Payment Link is stale or no longer exists",
        "code": "STALE_PAYMENT_LINK",
        "detail": "payment link does not exist",
    }
    assert fake_db.products.documents[0]["razorpay_payment_link_status"] == "stale"
    assert "razorpay_payment_link_id" not in fake_db.products.documents[0]
    assert "razorpay_payment_link_url" not in fake_db.products.documents[0]


def test_payment_link_config_debug_route_returns_only_set_or_missing(monkeypatch):
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret")
    monkeypatch.setattr(server, "mongo_url", "mongodb+srv://example")
    monkeypatch.setattr(server, "db_name", "pranvith")
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://pranvithdop.com")
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    response = asyncio.run(server.admin_payment_link_config_debug(SimpleNamespace(role="admin")))

    assert response == {
        "success": True,
        "config": {
            "RAZORPAY_KEY_ID": "SET",
            "RAZORPAY_KEY_SECRET_OR_RAZORPAY_SECRET": "SET",
            "MONGO_URL_OR_DATABASE_URL": "SET",
            "DB_NAME": "SET",
            "PUBLIC_SITE_URL": "SET",
            "FRONTEND_URL": "MISSING",
        },
    }
    assert "super-secret" not in str(response)


def test_domain_config_debug_route_returns_safe_domain_values(monkeypatch):
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://pranvithdop.com")
    monkeypatch.setenv("FRONTEND_URL", "https://www.pranvithdop.com")
    monkeypatch.setenv("CLOUDFLARE_R2_PUBLIC_BASE_URL", "https://assets.pranvithdop.com")

    response = asyncio.run(server.admin_domain_config_debug(SimpleNamespace(role="admin")))

    assert response == {
        "success": True,
        "PUBLIC_SITE_URL": "https://pranvithdop.com",
        "FRONTEND_URL": "https://pranvithdop.com",
        "CLOUDFLARE_R2_PUBLIC_BASE_URL": "https://assets.pranvithdop.com",
        "api_expected": "/api routes on same Vercel domain",
    }


def test_find_payment_link_product_supports_new_short_reference_id(monkeypatch):
    product = _creatable_product()
    product["razorpay_payment_link_reference_id"] = "pl_cc91e97f_lx8k21"
    fake_db = FakeDatabase([product])
    monkeypatch.setattr(server, "db", fake_db)

    found = asyncio.run(server._find_payment_link_product(
        payment_entity={},
        payment_link_entity={"reference_id": "pl_cc91e97f_lx8k21"},
        order_entity={},
    ))

    assert found["id"] == product["id"]


def test_unhandled_api_exception_handler_returns_json():
    request = Request({
        "type": "http",
        "method": "POST",
        "path": "/api/admin/products/product-1/create-payment-link",
        "headers": [],
    })

    response = asyncio.run(server.unhandled_exception_handler(request, RuntimeError("boom")))
    body = _body(response)

    assert response.status_code == 500
    assert body == {
        "success": False,
        "message": "Internal server error",
        "code": "INTERNAL_SERVER_ERROR",
    }


def test_http_exception_handler_returns_json_for_api():
    request = Request({
        "type": "http",
        "method": "POST",
        "path": "/api/admin/products/product-1/create-payment-link",
        "headers": [],
    })

    response = asyncio.run(server.http_exception_handler(request, HTTPException(status_code=403, detail="Forbidden")))
    body = _body(response)

    assert response.status_code == 403
    assert body == {
        "success": False,
        "message": "Forbidden",
    }
