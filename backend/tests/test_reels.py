import asyncio
from types import SimpleNamespace
import pytest
import server


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, *args, **kwargs):
        self.rows.sort(key=lambda row: row.get("sort_order", 0))
        return self

    async def to_list(self, *args, **kwargs):
        return list(self.rows)


class FakeCollection:
    def __init__(self, rows=None):
        self.rows = list(rows or [])

    async def count_documents(self, _query):
        return len(self.rows)

    async def insert_many(self, docs):
        self.rows.extend(docs)
        return docs

    async def insert_one(self, doc):
        self.rows.append(doc)
        return doc

    def find(self, query=None, projection=None):
        query = query or {}
        matches = [
            r for r in self.rows
            if all(r.get(k) == v for k, v in query.items() if not k.startswith("$"))
        ]
        return FakeCursor(matches)

    async def find_one(self, query, projection=None, sort=None):
        for r in self.rows:
            if all(r.get(k) == v for k, v in query.items() if not k.startswith("$")):
                return dict(r)
        return None

    async def find_one_and_update(self, query, update, return_document=True, projection=None):
        for r in self.rows:
            if all(r.get(k) == v for k, v in query.items() if not k.startswith("$")):
                if "$inc" in update:
                    for k, inc_val in update["$inc"].items():
                        r[k] = r.get(k, 0) + inc_val
                if "$set" in update:
                    for k, set_val in update["$set"].items():
                        r[k] = set_val
                return dict(r)
        return None

    async def update_one(self, query, update, upsert=False):
        for r in self.rows:
            if all(r.get(k) == v for k, v in query.items() if not k.startswith("$")):
                if "$set" in update:
                    r.update(update["$set"])
                return SimpleNamespace(matched_count=1, modified_count=1)
        return SimpleNamespace(matched_count=0, modified_count=0)

    async def delete_one(self, query):
        initial = len(self.rows)
        self.rows = [r for r in self.rows if not all(r.get(k) == v for k, v in query.items())]
        deleted = initial - len(self.rows)
        return SimpleNamespace(deleted_count=deleted)


class FakeDb:
    def __init__(self, reels=None):
        self.reels = FakeCollection(reels)


def test_public_reels_fallback_when_db_none(monkeypatch):
    monkeypatch.setattr(server, "db", None)
    result = asyncio.run(server.public_reels())
    assert isinstance(result, list)
    assert len(result) == len([r for r in server.DEFAULT_REELS if r.get("is_active", True)])
    assert result[0]["title"] == server.DEFAULT_REELS[0]["title"]
    assert "ad_settings" in result[0]
    assert result[0]["ad_settings"]["pre_roll_enabled"] in (True, False)


def test_admin_reels_crud_and_reorder(monkeypatch):
    fake_db = FakeDb()
    monkeypatch.setattr(server, "db", fake_db)
    admin = SimpleNamespace(role="admin")

    # 1. Admin gets reels (seeds default reels if empty)
    initial_reels = asyncio.run(server.admin_get_reels(admin))
    assert len(initial_reels) >= 4

    # 2. Admin creates a new reel
    new_reel_payload = server.ReelIn(
        title="New Cinematic Reel",
        description="Testing creation #tag",
        video_url="https://example.com/video.mp4",
        thumbnail_url="https://example.com/thumb.jpg",
        sound_title="Epic Music",
        author_name="Pranvith DOP",
        duration=15.0,
        sort_order=10,
        is_active=True,
        ad_settings=server.ReelAdSettings(
            pre_roll_enabled=True,
            mid_roll_enabled=True,
            mid_roll_cue_seconds=7.5,
            ad_tag_url="https://pubads.g.doubleclick.net/gampad/ads?iu=/test",
            gam_ad_unit_path="/12345/test",
        ),
    )
    created = asyncio.run(server.admin_create_reel(new_reel_payload, admin))
    assert created["success"] is True
    reel_id = created["reel"]["id"]
    assert created["reel"]["title"] == "New Cinematic Reel"
    assert created["reel"]["ad_settings"]["mid_roll_cue_seconds"] == 7.5

    # 3. Public view count
    view_res = asyncio.run(server.public_record_reel_view(reel_id))
    assert view_res["success"] is True

    # 4. Public like toggle
    like_res = asyncio.run(server.public_toggle_reel_like(reel_id))
    assert like_res["success"] is True
    assert like_res["likes_count"] >= 1

    # 5. Admin updates the reel
    update_payload = server.ReelIn(
        title="Updated Cinematic Reel Title",
        video_url="https://example.com/video2.mp4",
        ad_settings=server.ReelAdSettings(pre_roll_enabled=False, mid_roll_enabled=False),
    )
    updated = asyncio.run(server.admin_update_reel(reel_id, update_payload, admin))
    assert updated["success"] is True
    assert updated["reel"]["title"] == "Updated Cinematic Reel Title"
    assert updated["reel"]["ad_settings"]["pre_roll_enabled"] is False

    # 6. Admin toggles status
    toggle_res = asyncio.run(server.admin_toggle_reel_status(reel_id, admin))
    assert toggle_res["success"] is True
    assert toggle_res["is_active"] is False

    # 7. Admin deletes reel
    delete_res = asyncio.run(server.admin_delete_reel(reel_id, admin))
    assert delete_res["success"] is True

