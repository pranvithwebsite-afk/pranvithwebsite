import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import server


class FakeUpdateResult:
    matched_count = 1


class FakeInsertResult:
    inserted_id = "inserted"


class FakeFindCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, *_args):
        return self

    async def to_list(self, _limit):
        return list(self.rows)


class FakeAdmins:
    def __init__(self, rows=None):
        self.rows = list(rows or [])

    async def find_one(self, query, projection=None):
        for row in self.rows:
            if self._matches(row, query):
                result = dict(row)
                if projection and projection.get("hashed_password") == 0:
                    result.pop("hashed_password", None)
                return result
        return None

    def find(self, query=None, projection=None):
        rows = []
        for row in self.rows:
            if self._matches(row, query or {}):
                result = dict(row)
                if projection and projection.get("hashed_password") == 0:
                    result.pop("hashed_password", None)
                rows.append(result)
        return FakeFindCursor(rows)

    async def insert_one(self, doc):
        self.rows.append(dict(doc))
        return FakeInsertResult()

    async def update_one(self, query, update):
        row = await self.find_one(query)
        if not row:
            result = FakeUpdateResult()
            result.matched_count = 0
            return result
        for stored in self.rows:
            if stored.get("id") == row.get("id"):
                stored.update(update.get("$set", {}))
                break
        return FakeUpdateResult()

    async def count_documents(self, query):
        return sum(1 for row in self.rows if self._matches(row, query))

    def _matches(self, row, query):
        for key, expected in query.items():
            actual = row.get(key)
            if isinstance(expected, dict):
                if "$ne" in expected and actual == expected["$ne"]:
                    return False
                continue
            if actual != expected:
                return False
        return True


class FakeDatabase:
    def __init__(self, admins):
        self.admins = FakeAdmins(admins)


def test_change_password_requires_auth():
    client = TestClient(server.app)

    response = client.post("/api/admin/change-password", json={
        "current_password": "current-password",
        "new_password": "new-password",
        "confirm_password": "new-password",
    })

    assert response.status_code == 401


def test_change_password_verifies_current_and_hashes_new(monkeypatch):
    fake_db = FakeDatabase([{
        "id": "admin-1",
        "name": "Admin",
        "email": "admin@example.com",
        "role": "super_admin",
        "is_active": True,
        "hashed_password": server.get_password_hash("current-password"),
    }])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(server.admin_change_password(
        server.AdminChangePasswordIn(
            current_password="current-password",
            new_password="new-password",
            confirm_password="new-password",
        ),
        SimpleNamespace(id="admin-1", role="super_admin"),
    ))

    assert result["success"] is True
    stored = fake_db.admins.rows[0]["hashed_password"]
    assert stored != "new-password"
    assert server.verify_password("new-password", stored)


def test_admin_users_list_does_not_expose_password_hash(monkeypatch):
    fake_db = FakeDatabase([{
        "id": "admin-1",
        "name": "Admin",
        "email": "admin@example.com",
        "role": "super_admin",
        "is_active": True,
        "hashed_password": "secret-hash",
    }])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(server.admin_list_users(SimpleNamespace(role="super_admin")))

    assert result[0]["email"] == "admin@example.com"
    assert "hashed_password" not in result[0]


def test_create_admin_hashes_password(monkeypatch):
    fake_db = FakeDatabase([])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(server.admin_create_user(
        server.AdminUserCreateIn(
            name="Editor",
            email="editor@example.com",
            role="admin",
            password="temporary-password",
            confirm_password="temporary-password",
            is_active=True,
        ),
        SimpleNamespace(role="super_admin"),
    ))

    assert result["email"] == "editor@example.com"
    assert "hashed_password" not in result
    stored = fake_db.admins.rows[0]["hashed_password"]
    assert stored != "temporary-password"
    assert server.verify_password("temporary-password", stored)


def test_cannot_disable_last_super_admin(monkeypatch):
    fake_db = FakeDatabase([{
        "id": "admin-1",
        "name": "Admin",
        "email": "admin@example.com",
        "role": "super_admin",
        "is_active": True,
        "hashed_password": "hash",
    }])
    monkeypatch.setattr(server, "db", fake_db)

    with pytest.raises(server.HTTPException) as raised:
        asyncio.run(server.admin_update_user(
            "admin-1",
            server.AdminUserUpdateIn(
                name="Admin",
                email="admin@example.com",
                role="admin",
                is_active=True,
            ),
            SimpleNamespace(id="other-admin", role="super_admin"),
        ))

    assert raised.value.status_code == 409
