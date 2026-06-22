import asyncio
from types import SimpleNamespace

from fastapi.testclient import TestClient

import server


def _matches_value(value, expected):
    if isinstance(expected, dict):
        if "$in" in expected:
            return value in expected["$in"]
        if "$exists" in expected:
            return (value is not None) is bool(expected["$exists"])
        if "$nin" in expected:
            return value not in expected["$nin"]
    return value == expected


def _matches(document, query):
    if "$or" in query:
        return any(_matches(document, item) for item in query["$or"])
    return all(_matches_value(document.get(key), value) for key, value in query.items())


class FakeAggregateCursor:
    def __init__(self, documents, pipeline):
        self.documents = list(documents)
        self.pipeline = pipeline

    async def to_list(self, length=1):
        rows = self.documents
        for stage in self.pipeline:
            if "$match" in stage:
                rows = [row for row in rows if _matches(row, stage["$match"])]
            if "$group" in stage:
                return [{"_id": None, "total": sum(row.get("amount") or 0 for row in rows)}] if rows else []
        return rows[:length]


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = list(documents or [])

    async def count_documents(self, query):
        if not query:
            return len(self.documents)
        return sum(1 for document in self.documents if _matches(document, query))

    def aggregate(self, pipeline):
        return FakeAggregateCursor(self.documents, pipeline)


class FakeDatabase:
    def __init__(self, orders):
        self.pages = FakeCollection()
        self.products = FakeCollection()
        self.orders = FakeCollection(orders)
        self.customers = FakeCollection()


def test_dashboard_revenue_includes_successful_orders_only(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDatabase([
        {"amount": 10000, "payment_status": "paid", "status": "paid"},
        {"amount": 20000, "payment_status": "captured", "status": "captured"},
        {"amount": 30000, "payment_status": "completed", "status": "completed"},
        {"amount": 40000, "payment_status": "success", "status": "success"},
        {"amount": 99900, "payment_status": "failed", "status": "failed"},
    ]))

    response = asyncio.run(server.admin_dashboard(SimpleNamespace(role="admin")))

    assert response["totalRevenue"] == 1000


def test_dashboard_revenue_excludes_unsuccessful_orders(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDatabase([
        {"amount": 10000, "payment_status": "created", "status": "created"},
        {"amount": 20000, "payment_status": "pending", "status": "pending"},
        {"amount": 30000, "payment_status": "failed", "status": "failed"},
        {"amount": 40000, "payment_status": "cancelled", "status": "cancelled"},
        {"amount": 50000, "payment_status": "expired", "status": "expired"},
        {"amount": 60000, "payment_status": "unpaid", "status": "unpaid"},
    ]))

    response = asyncio.run(server.admin_dashboard(SimpleNamespace(role="admin")))

    assert response["totalRevenue"] == 0


def test_recheck_razorpay_endpoint_requires_admin_auth():
    client = TestClient(server.app)

    response = client.post("/api/admin/orders/recheck-razorpay")

    assert response.status_code == 401


def test_recheck_razorpay_error_does_not_expose_secrets(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDatabase([]))
    monkeypatch.setattr(server, "RAZORPAY_KEY_ID", "rzp_live_public_id")
    monkeypatch.setattr(server, "RAZORPAY_KEY_SECRET", "super-secret-value")
    monkeypatch.setattr(server, "razorpay_client", None)

    response = asyncio.run(server.admin_recheck_razorpay_payments(SimpleNamespace(role="admin")))
    body = response.body.decode("utf-8")

    assert response.status_code == 400
    assert "super-secret-value" not in body
    assert "rzp_live_public_id" not in body
