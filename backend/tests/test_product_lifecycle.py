import asyncio
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError
from starlette.datastructures import UploadFile

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


class FakeMediaCollection:
    def __init__(self):
        self.documents = []

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

    async def insert_one(self, document):
        self.documents.append(dict(document))
        return SimpleNamespace(inserted_id=document["id"])


class FakeMediaDatabase:
    def __init__(self):
        self.media = FakeMediaCollection()


def product_payload(slug="transitions"):
    return server.ProductIn(
        slug=slug,
        name="Transitions",
        price=100,
    )


def upload_file(name, content_type, content=b"test-bytes"):
    return UploadFile(filename=name, file=BytesIO(content), headers={"content-type": content_type})


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


def test_product_save_supports_new_media_fields(monkeypatch):
    fake_db = FakeDatabase()
    monkeypatch.setattr(server, "db", fake_db)

    payload = server.ProductIn(
        slug="creative-lut",
        name="Creative LUT",
        price=499,
        product_images=["https://assets.pranvithdop.com/products/creative-lut/images/a.webp"],
        video_type="youtube",
        youtube_url="https://www.youtube.com/watch?v=abc123",
        before_image_url="https://assets.pranvithdop.com/products/creative-lut/before-after/before-a.webp",
        after_image_url="https://assets.pranvithdop.com/products/creative-lut/before-after/after-a.webp",
        download_file_key="downloads/creative-lut/paid-download/file.zip",
        download_file_name="file.zip",
        download_file_bucket="pranvith-paid-downloads",
    )

    response = asyncio.run(server.admin_create_product(payload, None))
    product = response["product"]

    assert product["product_images"] == ["https://assets.pranvithdop.com/products/creative-lut/images/a.webp"]
    assert product["images"] == product["product_images"]
    assert product["product_url"] == "/assets/creative-lut"
    assert product["video_type"] == "youtube"
    assert product["youtube_url"].endswith("abc123")
    assert product["before_image_url"].endswith("before-a.webp")
    assert product["after_image_url"].endswith("after-a.webp")
    assert product["download_file_key"] == "downloads/creative-lut/paid-download/file.zip"


def test_product_save_returns_structured_warning_when_optional_payment_link_fails(monkeypatch):
    fake_db = FakeDatabase()
    monkeypatch.setattr(server, "db", fake_db)

    async def boom(_product, force=False):
        raise server.HTTPException(
            status_code=409,
            detail={
                "success": False,
                "code": "DUPLICATE_REFERENCE_ID",
                "message": "Razorpay rejected a duplicate payment link reference",
                "detail": "reference_id already exists",
                "razorpay_error": {
                    "code": "BAD_REQUEST_ERROR",
                    "description": "reference_id already exists",
                    "field": "reference_id",
                    "source": "business",
                    "step": "payment_link_create",
                },
            },
        )

    monkeypatch.setattr(server, "_create_razorpay_payment_link_for_product", boom)

    payload = server.ProductIn(
        slug="creative-lut-warning",
        name="Creative LUT Warning",
        price=499,
        create_razorpay_payment_link=True,
    )

    response = asyncio.run(server.admin_create_product(payload, None))

    assert response["success"] is True
    assert response["product"]["slug"] == "creative-lut-warning"
    assert response["warning"] == {
        "success": False,
        "code": "DUPLICATE_REFERENCE_ID",
        "message": "Razorpay rejected a duplicate payment link reference",
        "detail": "reference_id already exists",
        "razorpay_error": {
            "code": "BAD_REQUEST_ERROR",
            "description": "reference_id already exists",
            "field": "reference_id",
            "source": "business",
            "step": "payment_link_create",
        },
    }


def test_upload_accepts_valid_image(monkeypatch):
    calls = []

    class FakeR2:
        def put_object(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(server, "_r2_client", lambda: FakeR2())
    monkeypatch.setenv("CLOUDFLARE_R2_BUCKET", "pranvith-assets-public")
    monkeypatch.setenv("CLOUDFLARE_R2_PUBLIC_BASE_URL", "https://assets.pranvithdop.com")

    response = asyncio.run(server.admin_upload_public_media(
        file=upload_file("preview.webp", "image/webp"),
        product_slug="Creative LUT",
        purpose="product-image",
        current_admin=None,
    ))

    assert response["url"].startswith("https://assets.pranvithdop.com/products/creative-lut/images/")
    assert response["key"].startswith("products/creative-lut/images/")
    assert calls[0]["ContentType"] == "image/webp"


def test_upload_accepts_valid_video(monkeypatch):
    calls = []

    class FakeR2:
        def put_object(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(server, "_r2_client", lambda: FakeR2())
    monkeypatch.setenv("CLOUDFLARE_R2_BUCKET", "pranvith-assets-public")
    monkeypatch.setenv("CLOUDFLARE_R2_PUBLIC_BASE_URL", "https://assets.pranvithdop.com")

    response = asyncio.run(server.admin_upload_public_media(
        file=upload_file("trailer.mp4", "video/mp4"),
        product_slug="Creative LUT",
        purpose="product-video",
        current_admin=None,
    ))

    assert response["key"].startswith("products/creative-lut/videos/")
    assert response["url"].endswith(".mp4")
    assert calls[0]["ContentType"] == "video/mp4"


def test_upload_rejects_invalid_file_type(monkeypatch):
    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_upload_product_media(
            file=upload_file("script.svg", "image/svg+xml"),
            type="image",
            product_slug="creative-lut",
            purpose="product-image",
            current_admin=None,
        ))

    assert raised.value.status_code == 415


def test_upload_rejects_invalid_video_type(monkeypatch):
    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_upload_public_media(
            file=upload_file("trailer.mov", "application/octet-stream"),
            product_slug="creative-lut",
            purpose="product-video",
            current_admin=None,
        ))

    assert raised.value.status_code == 415


def test_admin_video_fallback_upload_saves_video_to_r2(monkeypatch):
    calls = []

    class FakeR2:
        def put_object(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(server, "_r2_client", lambda: FakeR2())
    monkeypatch.setattr(server, "db", FakeMediaDatabase())
    monkeypatch.setenv("CLOUDFLARE_R2_BUCKET", "pranvith-assets-public")
    monkeypatch.setenv("CLOUDFLARE_R2_PUBLIC_BASE_URL", "https://assets.pranvithdop.com")

    response = asyncio.run(server.admin_upload_video_fallback(
        file=upload_file("trailer.mp4", "video/mp4", b"video-bytes"),
        purpose="product-video",
        slug="Creative LUT",
        title="Trailer",
        current_admin=None,
    ))

    assert response["success"] is True
    assert response["message"] == "Video uploaded via backend fallback."
    assert response["key"].startswith("products/creative-lut/videos/")
    assert response["url"].startswith("https://assets.pranvithdop.com/products/creative-lut/videos/")
    assert calls[0]["ContentType"] == "video/mp4"


def test_admin_video_fallback_rejects_non_quicktime_mov(monkeypatch):
    monkeypatch.setattr(server, "db", FakeMediaDatabase())

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.admin_upload_video_fallback(
            file=upload_file("trailer.mov", "video/mov", b"video-bytes"),
            purpose="cms-video",
            slug="",
            title="Trailer",
            current_admin=None,
        ))

    assert raised.value.status_code == 415


def test_private_zip_upload_stores_key_without_public_url(monkeypatch):
    calls = []

    class FakeR2:
        def put_object(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(server, "_r2_client", lambda: FakeR2())
    monkeypatch.setenv("CLOUDFLARE_R2_PRIVATE_BUCKET", "pranvith-paid-downloads")

    response = asyncio.run(server.admin_upload_private_download(
        file=upload_file("Paid Pack.zip", "application/zip"),
        product_slug="Creative LUT",
        purpose="paid-download",
        current_admin=None,
    ))

    assert response["bucket"] == "pranvith-paid-downloads"
    assert response["filename"] == "Paid-Pack.zip"
    assert response["key"].startswith("downloads/creative-lut/paid-download/")
    assert "url" not in response
    assert calls[0]["Bucket"] == "pranvith-paid-downloads"


def test_upload_requires_authentication():
    route = next(route for route in server.admin_router.routes if getattr(route, "path", "") == "/uploads/private")
    dependant_names = [dependency.call.__name__ for dependency in route.dependant.dependencies]

    assert "get_current_active_admin" in dependant_names


def test_old_product_data_gets_product_images_alias():
    product = server._public_product({
        "id": "old-product",
        "slug": "old-product",
        "name": "Old Product",
        "images": ["https://example.com/old.jpg"],
        "download_file": "https://example.com/private.zip",
    })

    assert product["product_images"] == ["https://example.com/old.jpg"]
    assert "download_file" not in product


def test_protected_download_rejects_unpaid_access(monkeypatch):
    class FakeOrders:
        async def find_one(self, query, projection=None):
            return {
                "id": "local-order",
                "product_id": "product-1",
                "product_slug": "creative-lut",
                "payment_status": "pending",
            }

    monkeypatch.setattr(server, "db", SimpleNamespace(orders=FakeOrders()))

    with pytest.raises(HTTPException) as raised:
        asyncio.run(server.protected_product_download("local-order", "product-1"))

    assert raised.value.status_code == 403
