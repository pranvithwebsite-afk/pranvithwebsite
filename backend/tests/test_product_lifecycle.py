import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

import server


class FakeProducts:
    def __init__(self, documents=None, duplicate_on_insert=False):
        self.documents = [dict(document) for document in (documents or [])]
        self.seed_upserts = 0
        self.duplicate_on_insert = duplicate_on_insert

    async def find_one(self, query, projection=None):
        document = next(
            (
                item
                for item in self.documents
                if all(item.get(key) == value for key, value in query.items())
            ),
            None,
        )
        if document is None:
            return None
        if not projection:
            return dict(document)
        return {
            key: value
            for key, value in document.items()
            if key != "_id" and projection.get(key, 0)
        }

    async def count_documents(self, _query):
        return len(self.documents)

    async def delete_one(self, query):
        document = await self.find_one(query)
        if document is None:
            return SimpleNamespace(deleted_count=0)
        self.documents = [
            item for item in self.documents if item.get("id") != document.get("id")
        ]
        return SimpleNamespace(deleted_count=1)

    async def insert_one(self, document):
        if self.duplicate_on_insert:
            raise DuplicateKeyError("duplicate slug")
        self.documents.append(dict(document))
        return SimpleNamespace(inserted_id=document["id"])

    async def update_one(self, query, update, upsert=False):
        document = await self.find_one(query)
        if document is not None or not upsert:
            return SimpleNamespace(upserted_id=None)
        inserted = dict(update["$setOnInsert"])
        self.documents.append(inserted)
        self.seed_upserts += 1
        return SimpleNamespace(upserted_id=inserted["id"])


class FakeSeedState:
    def __init__(self):
        self.documents = []

    async def find_one(self, query):
        return next(
            (
                dict(item)
                for item in self.documents
                if all(item.get(key) == value for key, value in query.items())
            ),
            None,
        )

    async def update_one(self, query, update, upsert=False):
        existing = await self.find_one(query)
        if existing is None and upsert:
            self.documents.append(dict(update["$setOnInsert"]))
            return SimpleNamespace(upserted_id=query["key"])
        return SimpleNamespace(upserted_id=None)


class FakeDatabase:
    def __init__(self, products=None, duplicate_on_insert=False):
        self.products = FakeProducts(products, duplicate_on_insert)
        self.seed_state = FakeSeedState()


def product_payload(slug="transitions"):
    return server.ProductIn(
        slug=slug,
        name="Transitions",
        price=100,
    )


def test_product_create_rejects_existing_slug_before_insert(monkeypatch):
    fake_db = FakeDatabase([
        {
            "id": "product-1",
            "slug": "transitions",
            "name": "Existing Transitions",
        }
    ])
    monkeypatch.setattr(server, "db", fake_db)

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_create_product(product_payload(), None))

    assert raised.value.status_code == 409
    assert raised.value.detail == "Product slug already exists"
    assert len(fake_db.products.documents) == 1


def test_product_create_converts_duplicate_key_race_to_conflict(monkeypatch):
    fake_db = FakeDatabase(duplicate_on_insert=True)
    monkeypatch.setattr(server, "db", fake_db)

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_create_product(product_payload(), None))

    assert raised.value.status_code == 409
    assert raised.value.detail == "Product slug already exists"


def test_product_delete_removes_mongodb_document(monkeypatch):
    fake_db = FakeDatabase([
        {
            "id": "product-1",
            "slug": "royalty-free-music-bundle",
            "name": "Royalty-Free Music Bundle",
        }
    ])
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "db_name", "test_db")

    response = asyncio.run(server.admin_delete_product("product-1", None))

    assert response == {
        "success": True,
        "message": "Product deleted from MongoDB",
        "product_id": "product-1",
        "slug": "royalty-free-music-bundle",
        "deleted_count": 1,
    }
    assert fake_db.products.documents == []


def test_product_delete_returns_clear_not_found_response(monkeypatch):
    monkeypatch.setattr(server, "db", FakeDatabase())

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_delete_product("missing-product", None))

    assert raised.value.status_code == 404
    assert raised.value.detail["success"] is False
    assert raised.value.detail["deleted_count"] == 0


def test_existing_catalog_is_marked_without_restoring_missing_products(monkeypatch):
    fake_db = FakeDatabase([
        {
            "id": "custom-product",
            "slug": "custom-product",
            "name": "Custom Product",
        }
    ])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(server.initialize_default_products())

    assert result == {
        "action": "adopted_existing_catalog",
        "existing_count": 1,
        "seeded_count": 0,
    }
    assert fake_db.products.seed_upserts == 0
    assert [item["slug"] for item in fake_db.products.documents] == ["custom-product"]


def test_deleted_products_are_not_recreated_after_seed_marker(monkeypatch):
    fake_db = FakeDatabase([
        {
            "id": "product-1",
            "slug": "royalty-free-music-bundle",
            "name": "Royalty-Free Music Bundle",
        }
    ])
    monkeypatch.setattr(server, "db", fake_db)

    asyncio.run(server.initialize_default_products())
    fake_db.products.documents.clear()
    result = asyncio.run(server.initialize_default_products())

    assert result == {"action": "skipped", "existing_count": 0}
    assert fake_db.products.documents == []
    assert fake_db.products.seed_upserts == 0


def test_empty_new_catalog_is_seeded_once(monkeypatch):
    fake_db = FakeDatabase()
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(server.initialize_default_products())

    assert result["action"] == "seeded"
    assert result["seeded_count"] == len(server.ASSET_PRODUCTS)
    assert len(fake_db.products.documents) == len(server.ASSET_PRODUCTS)
