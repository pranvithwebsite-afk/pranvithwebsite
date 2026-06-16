import asyncio
import hashlib
import hmac

import server


def _matches(document, query):
    if "$or" in query:
        return any(_matches(document, item) for item in query["$or"])
    return all(document.get(key) == value for key, value in query.items())


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = list(documents or [])

    async def find_one(self, query, projection=None):
        return next((dict(item) for item in self.documents if _matches(item, query)), None)

    async def insert_one(self, document):
        self.documents.append(dict(document))

    async def update_one(self, query, update, upsert=False):
        document = next((item for item in self.documents if _matches(item, query)), None)
        if document is None and upsert:
            document = dict(query)
            document.update(update.get("$setOnInsert", {}))
            self.documents.append(document)
        if document is None:
            return
        document.update(update.get("$set", {}))
        for key, value in update.get("$inc", {}).items():
            document[key] = document.get(key, 0) + value


class FakeDatabase:
    def __init__(self, product):
        self.products = FakeCollection([product])
        self.orders = FakeCollection()
        self.customers = FakeCollection()


class FakeRazorpayOrders:
    def create(self, payload):
        return {
            "id": "order_guest_checkout",
            "amount": payload["amount"],
            "currency": payload["currency"],
        }


class FakeRazorpayClient:
    order = FakeRazorpayOrders()


def test_guest_checkout_verification_and_download(monkeypatch):
    product = {
        "id": "asset-1",
        "slug": "creative-luts",
        "name": "Creative LUTs",
        "price": 499,
        "published": True,
        "download_file": "https://files.example.com/creative-luts.zip",
    }
    fake_db = FakeDatabase(product)
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "razorpay_client", FakeRazorpayClient())
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "test_secret")
    email_calls = []
    monkeypatch.setattr(server, "_send_download_email", lambda *args: email_calls.append(args) or True)

    created = asyncio.run(server.checkout_create_order(server.PaymentCreateOrderIn(
        product_id=product["id"],
        product_slug=product["slug"],
        name="Guest Buyer",
        email="buyer@example.com",
        phone="+91 98765 43210",
    )))
    assert created["order_id"] == "order_guest_checkout"
    assert created["amount"] == 49900

    payment_id = "pay_guest_checkout"
    signature = hmac.new(
        b"test_secret",
        f"{created['order_id']}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    verified = asyncio.run(server.checkout_verify_payment(server.PaymentVerifyIn(
        razorpay_order_id=created["order_id"],
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
        buyer_email="buyer@example.com",
        asset_slug=product["slug"],
    )))
    assert verified["success"] is True
    assert verified["download_token"]
    assert verified["email_sent"] is True
    assert email_calls[0][0] == "buyer@example.com"

    access = asyncio.run(server.order_access(created["order_id"], verified["download_token"]))
    assert access["verified"] is True
    assert access["payment_status"] == "paid"
    assert access["product_title"] == product["name"]

    response = asyncio.run(server.order_download(created["order_id"], verified["download_token"]))
    assert response.status_code == 302
    assert response.headers["location"] == product["download_file"]


def test_guest_checkout_rejects_mismatched_asset_after_signature(monkeypatch):
    product = {
        "id": "asset-1",
        "slug": "vo",
        "name": "VO Asset",
        "price": 499,
        "published": True,
        "download_file": "https://files.example.com/vo.zip",
    }
    fake_db = FakeDatabase(product)
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "razorpay_client", FakeRazorpayClient())
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_test_key")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "test_secret")

    created = asyncio.run(server.checkout_create_order(server.PaymentCreateOrderIn(
        product_id=product["id"],
        product_slug=product["slug"],
        name="Guest Buyer",
        email="buyer@example.com",
        phone="+91 98765 43210",
    )))
    payment_id = "pay_guest_checkout"
    signature = hmac.new(
        b"test_secret",
        f"{created['order_id']}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    try:
        asyncio.run(server.checkout_verify_payment(server.PaymentVerifyIn(
            razorpay_order_id=created["order_id"],
            razorpay_payment_id=payment_id,
            razorpay_signature=signature,
            buyer_email="buyer@example.com",
            asset_slug="different-asset",
        )))
    except server.HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == "Payment does not match this asset"
    else:
        raise AssertionError("Expected mismatched asset verification to fail")
