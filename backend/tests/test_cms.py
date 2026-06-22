import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import server


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, *_args):
        self.rows.sort(key=lambda row: row.get("sort_order", 0))
        return self

    async def to_list(self, _limit):
        return list(self.rows)


class FakeResult:
    def __init__(self, matched_count=1, deleted_count=1):
        self.matched_count = matched_count
        self.deleted_count = deleted_count


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = [dict(row) for row in (rows or [])]

    async def find_one(self, query, projection=None):
        for row in self.rows:
            if all(row.get(key) == value for key, value in query.items()):
                return {key: value for key, value in row.items() if key != "_id"}
        return None

    def find(self, query=None, projection=None):
        query = query or {}
        rows = []
        for row in self.rows:
            matched = True
            for key, value in query.items():
                if isinstance(value, dict) and "$ne" in value:
                    matched = row.get(key) != value["$ne"]
                else:
                    matched = row.get(key) == value
                if not matched:
                    break
            if matched:
                rows.append({key: value for key, value in row.items() if key != "_id"})
        return FakeCursor(rows)

    async def insert_one(self, document):
        self.rows.append(dict(document))
        return SimpleNamespace(inserted_id=document["id"])

    async def update_one(self, query, update, upsert=False):
        row = await self.find_one(query)
        if row:
            for existing in self.rows:
                if existing.get("id") == row.get("id") or existing.get("page_key") == row.get("page_key"):
                    existing.update(update.get("$set", {}))
                    return FakeResult()
        if upsert:
            self.rows.append(dict(update.get("$set", {})))
            return FakeResult()
        return FakeResult(matched_count=0)

    async def delete_one(self, query):
        before = len(self.rows)
        self.rows = [row for row in self.rows if not all(row.get(key) == value for key, value in query.items())]
        return FakeResult(deleted_count=1 if len(self.rows) < before else 0)

    async def count_documents(self, query):
        return len(await self.find(query).to_list(100))


class FakeDb:
    def __init__(self):
        self.cms_pages = FakeCollection([
            {"id": "page-home", "page_key": "home", "title": "Home", "path": "/", "status": "published"},
            {"id": "page-about", "page_key": "about", "title": "About", "path": "/about", "status": "draft"},
        ])
        self.cms_sections = FakeCollection([
            {"id": "section-1", "section_id": "hero", "page_key": "home", "type": "hero", "title": "Hero", "enabled": True, "sort_order": 0},
            {"id": "section-2", "section_id": "draft", "page_key": "home", "type": "text", "title": "Hidden", "enabled": False, "sort_order": 1},
        ])


def test_public_cms_returns_only_published_enabled_content(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb())

    result = asyncio.run(server.public_cms_page("home"))

    assert result["status"] == "published"
    assert [section["id"] for section in result["sections"]] == ["section-1"]


def test_public_cms_hidden_or_draft_page_returns_safe_empty(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb())

    result = asyncio.run(server.public_cms_page("about"))

    assert result["status"] == "hidden"
    assert result["sections"] == []


def test_admin_can_create_update_delete_and_reorder_section(monkeypatch):
    fake_db = FakeDb()
    monkeypatch.setattr(server, "db", fake_db)
    admin = SimpleNamespace(role="admin")

    created = asyncio.run(server.admin_create_cms_section("home", server.CmsSectionIn(type="cta", title="CTA"), admin))
    section_id = created["section"]["id"]
    updated = asyncio.run(server.admin_update_cms_section(section_id, server.CmsSectionIn(type="cta", title="Updated"), admin))
    reordered = asyncio.run(server.admin_reorder_cms_sections("home", server.CmsReorderIn(section_ids=[section_id, "section-1", "section-2"]), admin))
    deleted = asyncio.run(server.admin_delete_cms_section(section_id, admin))

    assert updated["section"]["title"] == "Updated"
    assert reordered["sections"][0]["id"] == section_id
    assert deleted["success"] is True


def test_media_upload_requires_admin_auth():
    client = TestClient(server.app)

    response = client.post("/api/admin/media/upload")

    assert response.status_code == 401


def test_cms_rejects_unsafe_urls():
    with pytest.raises(ValueError):
        server.CmsSectionIn(type="hero", button_link="javascript:alert(1)")
