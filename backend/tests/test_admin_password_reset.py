import asyncio

import pytest
from fastapi import HTTPException

import server


class FakeAdmins:
    def __init__(self, documents=None):
        self.documents = list(documents or [])

    async def find_one(self, query):
        return next(
            (document for document in self.documents if document["email"] == query["email"]),
            None,
        )

    async def update_one(self, query, update):
        document = await self.find_one(query)
        document.update(update["$set"])

    async def insert_one(self, document):
        self.documents.append(dict(document))


class FakeDatabase:
    def __init__(self, admins=None):
        self.admins = FakeAdmins(admins)


def test_reset_default_admin_password_updates_existing_hash(monkeypatch):
    fake_db = FakeDatabase([
        {
            "id": "admin-1",
            "email": "admin@example.com",
            "hashed_password": server.get_password_hash("old-password"),
        }
    ])
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "DEFAULT_ADMIN_EMAIL", "ADMIN@example.com")
    monkeypatch.setattr(server, "DEFAULT_ADMIN_PASSWORD", "new-password")

    result = asyncio.run(server.reset_default_admin_password())

    assert result == {"action": "password_reset", "email": "admin@example.com"}
    assert server.verify_password(
        "new-password",
        fake_db.admins.documents[0]["hashed_password"],
    )
    assert "hashed_password" not in result


def test_reset_endpoint_rejects_invalid_recovery_key(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDatabase())
    monkeypatch.setattr(server, "JWT_SECRET", "configured-secret")

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_reset_default_password("wrong-secret"))

    assert raised.value.status_code == 403
