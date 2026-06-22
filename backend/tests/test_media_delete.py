import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import server


class FakeDeleteResult:
    deleted_count = 1


class FakeFindCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    async def to_list(self, _limit):
        return list(self.rows)


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])
        self.deleted = []

    async def find_one(self, query, projection=None):
        for row in self.rows:
            if all(row.get(key) == value for key, value in query.items()):
                return dict(row)
        return None

    def find(self, query=None, projection=None):
        return FakeFindCursor(self.rows)

    async def delete_one(self, query):
        self.deleted.append(query)
        self.rows = [row for row in self.rows if not all(row.get(key) == value for key, value in query.items())]
        return FakeDeleteResult()


class FakeDatabase:
    def __init__(self, media_rows=None, product_rows=None):
        self.media = FakeCollection(media_rows)
        self.products = FakeCollection(product_rows)
        self.pages = FakeCollection()
        self.settings = FakeCollection()


def test_delete_media_requires_admin_auth():
    client = TestClient(server.app)

    response = client.delete("/api/admin/media/media-1")

    assert response.status_code == 401


def test_delete_media_removes_local_file_and_record(monkeypatch, tmp_path):
    media_file = tmp_path / "media-1.png"
    media_file.write_bytes(b"image")
    monkeypatch.setattr(server, "UPLOAD_DIR", tmp_path)
    fake_db = FakeDatabase(media_rows=[{
        "id": "media-1",
        "url": "/api/uploads/media-1.png",
        "title": "Hero image",
    }])
    monkeypatch.setattr(server, "db", fake_db)

    result = asyncio.run(server.admin_delete_media("media-1", SimpleNamespace(role="admin")))

    assert result["success"] is True
    assert result["storage"] == "local"
    assert not media_file.exists()
    assert fake_db.media.deleted == [{"id": "media-1"}]


def test_delete_used_media_is_blocked(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "UPLOAD_DIR", tmp_path)
    fake_db = FakeDatabase(
        media_rows=[{"id": "media-1", "url": "/api/uploads/media-1.png", "title": "Hero image"}],
        product_rows=[{"id": "product-1", "hero_image": "/api/uploads/media-1.png"}],
    )
    monkeypatch.setattr(server, "db", fake_db)

    with pytest.raises(server.HTTPException) as raised:
        asyncio.run(server.admin_delete_media("media-1", SimpleNamespace(role="admin")))

    assert raised.value.status_code == 409


def test_unsafe_local_media_path_is_rejected(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "UPLOAD_DIR", tmp_path)

    with pytest.raises(server.HTTPException) as raised:
        server._safe_local_upload_path("/api/uploads/../secret.txt")

    assert raised.value.status_code == 400
