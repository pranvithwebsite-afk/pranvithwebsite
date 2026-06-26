import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import server


class FakeCursor:
    def __init__(self, rows):
        self.rows = [dict(row) for row in rows]

    def sort(self, field, direction):
        reverse = direction < 0
        self.rows.sort(key=lambda row: row.get(field, 0), reverse=reverse)
        return self

    async def to_list(self, _limit):
        return [dict(row) for row in self.rows]


class FakeServices:
    def __init__(self, rows=None):
        self.rows = [dict(row) for row in (rows or [])]

    def _matches(self, row, query):
        for key, expected in (query or {}).items():
            actual = row.get(key)
            if isinstance(expected, dict):
                if "$ne" in expected and actual == expected["$ne"]:
                    return False
                continue
            if actual != expected:
                return False
        return True

    def find(self, query=None, projection=None):
        rows = []
        for row in self.rows:
            if self._matches(row, query or {}):
                rows.append({key: value for key, value in row.items() if key != "_id"})
        return FakeCursor(rows)

    async def find_one(self, query, projection=None, sort=None):
        rows = [row for row in self.rows if self._matches(row, query)]
        if sort:
            field, direction = sort[0]
            rows.sort(key=lambda row: row.get(field, 0), reverse=direction < 0)
        if not rows:
            return None
        return {key: value for key, value in rows[0].items() if key != "_id"}

    async def insert_one(self, doc):
        self.rows.append(dict(doc))
        return SimpleNamespace(inserted_id=doc["id"])

    async def update_one(self, query, update):
        for row in self.rows:
            if self._matches(row, query):
                row.update(update.get("$set", {}))
                return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)

    async def delete_one(self, query):
        before = len(self.rows)
        self.rows = [row for row in self.rows if not self._matches(row, query)]
        return SimpleNamespace(deleted_count=1 if len(self.rows) < before else 0)


class FakeDb:
    def __init__(self, services):
        self.services = FakeServices(services)


def service_row(service_id, slug, sort_order, is_published=True):
    return {
        "id": service_id,
        "title": slug.replace("-", " ").title(),
        "slug": slug,
        "subtitle": "Subtitle",
        "short_description": "Short",
        "description": "Full service description",
        "banner_url": "",
        "thumbnail_url": "",
        "icon": "Camera",
        "category": "Production",
        "offers": [{"title": "Offer", "description": "Offer description"}],
        "why_choose": [{"title": "Reason", "description": "Reason description"}],
        "process_steps": [{"step": 1, "title": "Brief", "description": "Understand the project"}],
        "cta_title": "Ready?",
        "cta_button_text": "Contact",
        "cta_button_url": "/hire",
        "sort_order": sort_order,
        "is_published": is_published,
        "created_at": "2026-06-25T00:00:00Z",
        "updated_at": None,
    }


def test_public_services_only_returns_published_sorted(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb([
        service_row("s2", "second", 2, True),
        service_row("hidden", "hidden", 1, False),
        service_row("s1", "first", 1, True),
    ]))

    result = asyncio.run(server.public_services())

    assert [service["slug"] for service in result] == ["first", "second"]


def test_public_service_detail_normalizes_slug_and_hides_drafts(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb([
        service_row("s1", "film-dop", 1, True),
        service_row("s2", "draft-service", 2, False),
    ]))

    result = asyncio.run(server.public_service_by_slug("Film DOP"))

    assert result["slug"] == "film-dop"
    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.public_service_by_slug("draft-service"))
    assert raised.value.status_code == 404


def test_admin_service_lifecycle_and_reorder(monkeypatch):
    fake_db = FakeDb([service_row("s1", "first", 1, True)])
    monkeypatch.setattr(server, "db", fake_db)
    admin = SimpleNamespace(role="admin")

    created = asyncio.run(server.admin_create_service(server.ServiceIn(title="Second Service"), admin))
    service_id = created["service"]["id"]
    updated = asyncio.run(server.admin_update_service(
        service_id,
        server.ServiceIn(title="Updated Service", slug="updated-service", is_published=False),
        admin,
    ))
    publish = asyncio.run(server.admin_publish_service(service_id, server.ServicePublishIn(is_published=True), admin))
    reordered = asyncio.run(server.admin_reorder_services(server.ServiceReorderIn(service_ids=[service_id, "s1"]), admin))
    deleted = asyncio.run(server.admin_delete_service(service_id, admin))

    assert created["service"]["slug"] == "second-service"
    assert updated["service"]["slug"] == "updated-service"
    assert publish == {"success": True, "is_published": True}
    assert [service["id"] for service in reordered["services"]][:2] == [service_id, "s1"]
    assert deleted == {"success": True}


def test_admin_service_rejects_duplicate_slug(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb([service_row("s1", "existing", 1, True)]))

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_create_service(server.ServiceIn(title="Existing", slug="existing"), SimpleNamespace(role="admin")))

    assert raised.value.status_code == 409


def test_service_media_urls_reject_unsafe_schemes():
    with pytest.raises(ValueError):
        server.ServiceIn(title="Unsafe", banner_url="javascript:alert(1)")
