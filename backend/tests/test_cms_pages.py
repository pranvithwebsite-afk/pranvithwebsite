import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import server


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, _limit):
        return [dict(row) for row in self.rows]


class FakePages:
    def __init__(self, documents=None):
        self.documents = [dict(document) for document in (documents or [])]

    def find(self, query, projection=None):
        if query == {}:
            rows = self.documents
        else:
            rows = []
            for item in self.documents:
                if query.get("slug") and item.get("slug") != query["slug"]:
                    continue
                if "$or" in query:
                    published = item.get("status") == "published" or (
                        "status" not in item and item.get("published") is True
                    )
                    if not published:
                        continue
                rows.append(item)
        return FakeCursor(rows)

    async def find_one(self, query, projection=None):
        for item in self.documents:
            if "$or" in query:
                if any(
                    all(item.get(key) == value for key, value in option.items())
                    for option in query["$or"]
                ):
                    return dict(item)
                continue
            matches = True
            for key, value in query.items():
                if isinstance(value, dict) and "$ne" in value:
                    matches = matches and item.get(key) != value["$ne"]
                else:
                    matches = matches and item.get(key) == value
            if matches:
                return dict(item)
        return None

    async def insert_one(self, document):
        self.documents.append(dict(document))
        return SimpleNamespace(inserted_id=document["id"])

    async def update_one(self, query, update, upsert=False):
        for index, item in enumerate(self.documents):
            if all(item.get(key) == value for key, value in query.items()):
                self.documents[index] = {**item, **update["$set"]}
                return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)

    async def delete_one(self, query):
        before = len(self.documents)
        self.documents = [item for item in self.documents if item.get("id") != query.get("id")]
        return SimpleNamespace(deleted_count=before - len(self.documents))


class FakeDb:
    def __init__(self, pages):
        self.pages = FakePages(pages)


def page_doc(status="published"):
    return {
        "id": "page-1",
        "slug": "about",
        "path": "/about",
        "title": "About",
        "status": status,
        "sections": [
            {"id": "a", "type": "text", "title": "A", "enabled": True, "sort_order": 1},
            {"id": "b", "type": "text", "title": "B", "enabled": True, "sort_order": 0},
        ],
        "created_at": "2026-01-01T00:00:00+00:00",
    }


REQUIRED_PAGES = [
    ("home", "/"),
    ("courses", "/courses"),
    ("about", "/about"),
    ("assets", "/assets"),
    ("works", "/works"),
    ("hire", "/hire"),
]


def test_public_published_page_fetch(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb([page_doc("published")]))

    page = asyncio.run(server.public_page_by_slug("about"))

    assert page["slug"] == "about"
    assert page["status"] == "published"
    assert [section["id"] for section in page["sections"]] == ["b", "a"]


def test_admin_can_create_fetch_update_all_required_pages(monkeypatch):
    fake_db = FakeDb([])
    monkeypatch.setattr(server, "db", fake_db)

    for slug, path in REQUIRED_PAGES:
        created = asyncio.run(server.admin_create_page(server.PageIn(
            slug=slug,
            path=path,
            title=slug.title(),
            status="draft",
            sections=[{"id": f"{slug}-hero", "type": "hero", "title": slug.title()}],
        ), None))

        fetched = asyncio.run(server.admin_get_page(slug, None))
        assert fetched["id"] == created["page"]["id"]
        assert fetched["slug"] == slug
        assert fetched["path"] == path

        updated = asyncio.run(server.admin_update_page(slug, server.PageIn(
            slug=slug,
            path=path,
            title=f"{slug.title()} Updated",
            status="published",
            sections=[{"id": f"{slug}-text", "type": "text", "title": "Updated"}],
        ), None))
        assert updated["page"]["status"] == "published"
        assert updated["page"]["sections"][0]["id"] == f"{slug}-text"


def test_draft_page_not_visible_publicly(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDb([page_doc("draft")]))

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.public_page_by_slug("about"))

    assert raised.value.status_code == 404


def test_public_required_pages_fallback_contract_for_draft_or_not_created(monkeypatch):
    for slug, _path in REQUIRED_PAGES:
        monkeypatch.setattr(server, "db", FakeDb([{
            **page_doc("draft"),
            "id": f"{slug}-id",
            "slug": slug,
            "path": "/" if slug == "home" else f"/{slug}",
            "title": slug.title(),
        }]))
        with pytest.raises(HTTPException) as draft_raised:
            asyncio.run(server.public_page_by_slug(slug))
        assert draft_raised.value.status_code == 404

        monkeypatch.setattr(server, "db", FakeDb([]))
        with pytest.raises(HTTPException) as missing_raised:
            asyncio.run(server.public_page_by_slug(slug))
        assert missing_raised.value.status_code == 404


def test_admin_can_create_and_update_page(monkeypatch):
    fake_db = FakeDb([])
    monkeypatch.setattr(server, "db", fake_db)

    created = asyncio.run(server.admin_create_page(server.PageIn(
        slug="about",
        path="/about",
        title="About",
        status="draft",
        sections=[{"id": "intro", "type": "text", "title": "Intro"}],
    ), None))
    page_id = created["page"]["id"]

    updated = asyncio.run(server.admin_update_page(page_id, server.PageIn(
        slug="about",
        path="/about",
        title="About Us",
        status="published",
        sections=[{"id": "intro", "type": "text", "title": "Updated"}],
    ), None))

    assert updated["page"]["title"] == "About Us"
    assert fake_db.pages.documents[0]["status"] == "published"


def test_section_reorder_save_persists_sort_order(monkeypatch):
    fake_db = FakeDb([page_doc("draft")])
    monkeypatch.setattr(server, "db", fake_db)

    response = asyncio.run(server.admin_update_page("about", server.PageIn(
        slug="about",
        path="/about",
        title="About",
        status="draft",
        sections=[
            {"id": "b", "type": "text", "title": "B", "sort_order": 0},
            {"id": "a", "type": "text", "title": "A", "sort_order": 1},
        ],
    ), None))

    assert [section["id"] for section in response["page"]["sections"]] == ["b", "a"]


def test_unsafe_links_and_custom_html_are_sanitized(monkeypatch):
    fake_db = FakeDb([])
    monkeypatch.setattr(server, "db", fake_db)

    created = asyncio.run(server.admin_create_page(server.PageIn(
        slug="safe",
        path="/safe",
        title="Safe",
        status="published",
        sections=[
            {
                "id": "html",
                "type": "custom_html",
                "html": '<p onclick="bad()">Hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>',
                "button_link": "/safe",
            }
        ],
    ), None))

    html = created["page"]["sections"][0]["html"]
    assert "<script" not in html.lower()
    assert "onclick" not in html.lower()
    assert "javascript:" not in html.lower()
