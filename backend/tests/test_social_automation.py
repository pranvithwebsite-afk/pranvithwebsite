import pytest
from backend.social_automation import (
    detect_comment_language,
    evaluate_comment,
    calculate_token_expiry_status,
    mask_token,
    get_instagram_oauth_url,
    get_youtube_oauth_url,
)
from datetime import datetime, timedelta, timezone

def test_language_detection():
    # Native Telugu
    assert detect_comment_language("నమస్కారం బ్రో సెట్టింగ్స్ కావాలి") == "telugu"
    assert detect_comment_language("ధర ఎంత") == "telugu"
    
    # Romanized Telugu (Teluglish)
    assert detect_comment_language("settings kavali anna") == "telugu"
    assert detect_comment_language("ela cheyyali bro") == "telugu"
    assert detect_comment_language("bavundi anna super") == "telugu"
    
    # English
    assert detect_comment_language("Can you share the camera settings please?") == "english"
    assert detect_comment_language("What is the price of this lut pack?") == "english"

def test_evaluate_comment_auto_reply():
    # English LUT request
    res = evaluate_comment("Can I get the LUT link please?", username="arjun")
    assert res["status"] == "auto_replied"
    assert "lut" in res["matched_keywords"]
    assert "https://pranvithdop.com/assets/creative-lut-pack" in res["reply_text"]
    assert res["is_sensitive"] is False

    # Telugu settings request
    res_te = evaluate_comment("Nikon Z6III settings kavali anna", username="kiran")
    assert res_te["status"] == "auto_replied"
    assert res_te["detected_language"] == "telugu"
    assert "నమస్కారం" in res_te["reply_text"]

def test_evaluate_comment_sensitive_approval():
    # Price inquiry must require admin approval
    res_price = evaluate_comment("How much does the course cost? What is the price?", username="kavya")
    assert res_price["status"] == "pending_approval"
    assert res_price["is_sensitive"] is True
    assert "price" in res_price["matched_keywords"]
    assert res_price["reply_text"] is None
    assert "₹49" in res_price["suggested_reply"]

    # Booking inquiry
    res_book = evaluate_comment("We want to book you for a wedding shoot", username="suresh")
    assert res_book["status"] == "pending_approval"
    assert res_book["is_sensitive"] is True
    assert "book" in res_book["matched_keywords"]

def test_token_mask_and_expiry():
    assert mask_token("EAAG1234567890abcdef") == "EAAG12...cdef"
    assert mask_token("short") == ""

    # Expired token
    past = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    exp_status = calculate_token_expiry_status(past)
    assert exp_status["is_expired"] is True
    assert exp_status["severity"] == "danger"

    # Active token (50 days)
    future = (datetime.now(timezone.utc) + timedelta(days=50)).isoformat()
    act_status = calculate_token_expiry_status(future)
    assert act_status["is_expired"] is False
    assert act_status["days_remaining"] >= 49
    assert act_status["severity"] == "success"

def test_oauth_urls():
    ig_url = get_instagram_oauth_url("test_app_id", "https://pranvithdop.com/admin/social-media")
    assert "client_id=test_app_id" in ig_url
    assert "instagram_manage_comments" in ig_url

    yt_url = get_youtube_oauth_url("test_client_id", "https://pranvithdop.com/admin/social-media")
    assert "client_id=test_client_id" in yt_url
    assert "youtube.upload" in yt_url
    assert "redirect_uri=https://pranvithdop.com/admin/social-media" in yt_url


def test_youtube_callback_requires_code():
    from fastapi.testclient import TestClient
    import backend.server as server

    client = TestClient(server.app)
    token = server.create_access_token({'id': '6e14307b-cb07-4328-a8c9-35de3912349c', 'sub': '6e14307b-cb07-4328-a8c9-35de3912349c', 'role': 'super_admin'})
    res = client.post(
        '/api/admin/social/oauth/youtube/callback',
        json={'code': '', 'redirect_uri': 'https://pranvithdop.com/admin/social-media'},
        headers={'Authorization': f'Bearer {token}'}
    )
    assert res.status_code == 400
    msg = res.json().get("detail") or res.json().get("message") or ""
    assert "Authorization code is required" in msg


def test_youtube_intent_classification():
    from backend.social_automation import classify_comment_intent

    # Price -> Sensitive
    c1 = classify_comment_intent("Short films theeyocha బ్రో దీనితో ప్రైస్ ఎంత ఉంటుంది")
    assert c1["is_sensitive"] is True
    assert c1["requires_approval"] is True
    assert c1["intent"] == "SENSITIVE_PRICE"

    # Booking -> Sensitive
    c2 = classify_comment_intent("Wedding film shoot booking available next month?")
    assert c2["is_sensitive"] is True
    assert c2["requires_approval"] is True
    assert c2["intent"] == "SENSITIVE_BOOKING"

    # Settings -> Safe
    c3 = classify_comment_intent("Z6ii. Setting kavali plz")
    assert c3["is_sensitive"] is False
    assert c3["requires_approval"] is False
    assert c3["intent"] in ("CAMERA_SPECIFIC_SETTINGS", "CAMERA_SETTINGS")

    # LUT -> Safe
    c4 = classify_comment_intent("Send Sony S-Log3 creative lut pack link")
    assert c4["is_sensitive"] is False
    assert c4["requires_approval"] is False
    assert c4["intent"] == "LUT_REQUEST"

    # Technical Observation
    c5 = classify_comment_intent("The Nikon ZR shows good details.")
    assert c5["is_sensitive"] is False
    assert c5["intent"] == "CAMERA_TECHNICAL"


@pytest.mark.anyio
async def test_youtube_dynamic_ai_reply_generation():
    from backend.social_automation import generate_youtube_ai_reply

    # Telugu settings request
    r1 = await generate_youtube_ai_reply("Z6ii. Setting kavali plz", author_name="rambabu")
    assert r1["detected_language"] == "telugu"
    assert r1["intent"] in ("CAMERA_SPECIFIC_SETTINGS", "CAMERA_SETTINGS")
    assert r1["is_sensitive"] is False
    assert "@rambabu" in r1["reply_text"]
    assert "https://pranvithdop.com/assets" in r1["reply_text"]

    # Sensitive price inquiry
    r2 = await generate_youtube_ai_reply("Short films theeyocha బ్రో దీనితో ప్రైస్ ఎంత ఉంటుంది", author_name="agent007")
    assert r2["detected_language"] == "telugu"
    assert r2["is_sensitive"] is True
    assert r2["requires_approval"] is True
    assert "@agent007" in r2["reply_text"]

    # English technical camera appreciation
    r3 = await generate_youtube_ai_reply("The Nikon ZR shows good details.", author_name="shakeel")
    assert r3["detected_language"] == "english"
    assert r3["is_sensitive"] is False
    assert "@shakeel" in r3["reply_text"]


@pytest.mark.anyio
async def test_youtube_settings_api_and_preview():
    import backend.server as server
    from backend.server import get_current_active_admin, AdminBase
    import httpx

    fake_admin = AdminBase(
        id="test_admin_id",
        email="pranvithwebsite@gmail.com",
        name="Admin",
        role="super_admin",
        permissions=["super_admin"]
    )
    server.app.dependency_overrides[get_current_active_admin] = lambda: fake_admin

    try:
        transport = httpx.ASGITransport(app=server.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET Settings
            get_res = await client.get('/api/admin/social/youtube/settings')
            assert get_res.status_code == 200
            data = get_res.json()
            assert "auto_reply_enabled" in data
            assert "safe_testing_mode" in data

            # 2. POST Preview Reply
            prev_res = await client.post(
                '/api/admin/social/youtube/preview-reply',
                json={'comment_text': 'Z6ii. Setting kavali plz', 'author_name': 'rambabu'}
            )
            assert prev_res.status_code == 200
            pdata = prev_res.json()
            assert pdata["success"] is True
            assert pdata["evaluation"]["intent"] in ("CAMERA_SPECIFIC_SETTINGS", "CAMERA_SETTINGS")
            assert pdata["evaluation"]["detected_language"] == "telugu"
            assert "@rambabu" in pdata["evaluation"]["reply_text"]
    finally:
        server.app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_five_target_requirement_examples():
    """
    Directly tests the 5 core requirement examples from the user prompt:
    1. 'Sony A7 IV best settings?' -> Sony A7 IV camera settings
    2. 'Camera price?' -> Relevant camera & asset pricing
    3. 'Send camera links' -> Product links from knowledge base
    4. 'Instagram ID?' -> Follow us on Instagram @pranvith_dop
    5. 'Thank you' -> Friendly thank-you response
    Plus ensuring technical queries NEVER get generic 'Thanks for watching' replies.
    """
    from backend.social_automation import generate_social_ai_reply, classify_comment_intent

    # 1. Sony A7 IV best settings?
    res_a7iv = await generate_social_ai_reply("Sony A7 IV best settings?", author_name="kiran", platform="youtube")
    assert res_a7iv["intent"] == "CAMERA_SPECIFIC_SETTINGS"
    assert "S-Log3" in res_a7iv["reply_text"] or "800" in res_a7iv["reply_text"] or "ISO" in res_a7iv["reply_text"]
    assert "Thanks for watching" not in res_a7iv["reply_text"]

    # 2. Camera price?
    res_price = await generate_social_ai_reply("Camera price?", author_name="rahul", platform="youtube")
    assert res_price["intent"] == "CAMERA_PRICE" or res_price["is_sensitive"] is True
    assert "₹" in res_price["reply_text"] or "price" in res_price["reply_text"].lower()

    # 3. Send camera links
    res_links = await generate_social_ai_reply("Send camera links", author_name="nikhil", platform="youtube")
    assert res_links["intent"] == "CAMERA_LINKS"
    assert "https://pranvithdop.com/assets" in res_links["reply_text"]

    # 4. Instagram ID?
    res_ig = await generate_social_ai_reply("Instagram ID?", author_name="sneha", platform="youtube")
    assert res_ig["intent"] == "INSTAGRAM_ID"
    assert "@pranvith_dop" in res_ig["reply_text"]
    assert "instagram.com/pranvith_dop" in res_ig["reply_text"]

    # 5. Thank you
    res_ty = await generate_social_ai_reply("Thank you", author_name="manoj", platform="youtube")
    assert res_ty["intent"] == "THANK_YOU"
    assert any(w in res_ty["reply_text"].lower() for w in ["welcome", "pleasure", "glad", "thank you", "thanks"])


@pytest.mark.anyio
async def test_multilingual_hindi_telugu_mixed():
    """Tests Telugu, Hindi, and mixed-language comments."""
    from backend.social_automation import generate_social_ai_reply, detect_comment_language

    # Telugu settings
    te_text = "Sony A7 IV video settings cheppandi bro"
    res_te = await generate_social_ai_reply(te_text, author_name="srinivas", platform="youtube")
    assert res_te["detected_language"] == "telugu"
    assert "S-Log3" in res_te["reply_text"] or "సెట్టింగ్స్" in res_te["reply_text"] or "settings" in res_te["reply_text"].lower()

    # Hindi price inquiry
    hi_text = "Bhai camera price kitna hai batao"
    res_hi = await generate_social_ai_reply(hi_text, author_name="amit", platform="facebook")
    assert res_hi["detected_language"] == "hindi"
    assert "₹" in res_hi["reply_text"] or "price" in res_hi["reply_text"].lower()


@pytest.mark.anyio
async def test_facebook_settings_api_and_preview():
    """Tests Facebook settings API, preview endpoint, and emergency kill switch."""
    import backend.server as server
    from backend.server import get_current_active_admin, AdminBase
    import httpx

    fake_admin = AdminBase(
        id="test_admin_id",
        email="pranvithwebsite@gmail.com",
        name="Admin",
        role="super_admin",
        permissions=["super_admin"]
    )
    server.app.dependency_overrides[get_current_active_admin] = lambda: fake_admin

    try:
        transport = httpx.ASGITransport(app=server.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET Facebook Settings
            get_res = await client.get('/api/admin/social/facebook/settings')
            assert get_res.status_code == 200
            data = get_res.json()
            assert "auto_reply_enabled" in data
            assert "safe_testing_mode" in data

            # 2. POST Preview Facebook Reply
            prev_res = await client.post(
                '/api/admin/social/facebook/preview-reply',
                json={'comment_text': 'Sony A7 IV best settings?', 'author_name': 'fb_user'}
            )
            assert prev_res.status_code == 200
            pdata = prev_res.json()
            assert pdata["success"] is True
            assert "Sony A7 IV" in pdata["evaluation"]["reply_text"] or "S-Log3" in pdata["evaluation"]["reply_text"]
            assert "@fb_user" in pdata["evaluation"]["reply_text"]

            # 3. GET Facebook comments endpoint
            comm_res = await client.get('/api/admin/social/facebook/comments')
            assert comm_res.status_code == 200
            assert isinstance(comm_res.json(), list)
    finally:
        server.app.dependency_overrides.clear()


def test_meta_facebook_webhook_verification():
    """Tests Meta Graph API webhook subscription challenge response."""
    from fastapi.testclient import TestClient
    import backend.server as server

    client = TestClient(server.app)
    # Correct verify token
    res = client.get('/api/webhooks/facebook?hub.mode=subscribe&hub.challenge=test_challenge_code_999&hub.verify_token=pranvith_fb_meta_webhook')
    assert res.status_code == 200
    assert res.text == "test_challenge_code_999"

    # Wrong verify token -> 403
    res_bad = client.get('/api/webhooks/facebook?hub.mode=subscribe&hub.challenge=test_challenge_code_999&hub.verify_token=wrong_token')
    assert res_bad.status_code == 403


@pytest.mark.anyio
async def test_self_comment_filtering():
    """Tests that comments from our own connected account are ignored (preventing reply loops)."""
    from backend.social_automation import YouTubeAutomationClient, FacebookAutomationClient

    yt = YouTubeAutomationClient(db=None)
    # Connected channel ID matching author channel ID
    assert yt._is_self_comment("UCRDl6hJTm0_VoAF70rZjdgQ", "UCRDl6hJTm0_VoAF70rZjdgQ", "viewer") is True
    # PranvithDOP handle
    assert yt._is_self_comment("pranvithdop", "different_id", "@pranvithdop") is True
    # Genuine external viewer
    assert yt._is_self_comment("viewer_123", "different_id", "external_creator") is False

    fb = FacebookAutomationClient(db=None)
    # Page ID matching author ID
    assert fb._is_self_comment("100200300", "100200300", "follower") is True
    # Genuine external follower
    assert fb._is_self_comment("999888777", "100200300", "external_follower") is False


@pytest.mark.anyio
async def test_nikon_sony_canon_camera_specifications():
    """
    Verifies that camera technical questions for Nikon, Sony, and Canon
    are matched accurately (even with punctuation) and answered with
    hard facts from CAMERA_DATABASE (never invented specs or prices).
    """
    from backend.social_automation import match_camera_profile, generate_social_ai_reply

    # 1. Nikon Z6II (with dot punctuation as often typed on YouTube)
    m_z6ii = match_camera_profile("Z6ii. Setting kavali plz")
    assert m_z6ii is not None
    assert m_z6ii[0] == "nikon_z6ii"
    r_z6ii = await generate_social_ai_reply("Z6ii. Setting kavali plz", author_name="rambabu", platform="youtube")
    assert "800" in r_z6ii["reply_text"] or "Flat" in r_z6ii["reply_text"] or "N-Log" in r_z6ii["reply_text"]
    assert "https://pranvithdop.com/assets" in r_z6ii["reply_text"]

    # 2. Nikon Z8
    m_z8 = match_camera_profile("Nikon Z8 best 8K video settings?")
    assert m_z8 is not None
    assert m_z8[0] == "nikon_z8"
    r_z8 = await generate_social_ai_reply("Nikon Z8 best 8K video settings?", author_name="arun", platform="youtube")
    assert "4,000" in r_z8["reply_text"] or "4000" in r_z8["reply_text"] or "N-Log" in r_z8["reply_text"]

    # 3. Sony A7 III
    m_a73 = match_camera_profile("Sony A73 settings for wedding video?")
    assert m_a73 is not None
    assert m_a73[0] == "sony_a7iii"
    r_a73 = await generate_social_ai_reply("Sony A73 settings for wedding video?", author_name="sanjay", platform="youtube")
    assert "S-Log2" in r_a73["reply_text"] or "HLG" in r_a73["reply_text"]

    # 4. Canon EOS R5
    m_r5 = match_camera_profile("Canon R5 best settings for video?")
    assert m_r5 is not None
    assert m_r5[0] == "canon_r5"
    r_r5 = await generate_social_ai_reply("Canon R5 best settings for video?", author_name="raj", platform="youtube")
    assert "C-Log3" in r_r5["reply_text"]
    assert "800" in r_r5["reply_text"]

    # 5. Canon EOS R6 Mark II
    m_r6 = match_camera_profile("Canon R6 II wedding settings?")
    assert m_r6 is not None
    assert m_r6[0] == "canon_r6_ii"
    r_r6 = await generate_social_ai_reply("Canon R6 II wedding settings?", author_name="manoj", platform="youtube")
    assert "C-Log3" in r_r6["reply_text"]
    assert "6K" in r_r6["reply_text"] or "800" in r_r6["reply_text"]


@pytest.mark.anyio
async def test_historical_vs_new_comment_filtering():
    """
    Verifies that historical comments (published before cutoff) are safely
    archived with status='historical' and zero auto-replies, while new comments
    on old or new videos are processed as new_evaluated.
    """
    from backend.social_automation import YouTubeAutomationClient
    from datetime import datetime, timedelta, timezone

    # Mock database in memory
    stored_comments = {}
    stored_settings = {}
    stored_accounts = {
        "youtube": {
            "platform": "youtube",
            "is_connected": True,
            "account_id": "UCRDl6hJTm0_VoAF70rZjdgQ",
            "connected_at": "2026-11-04T12:00:00Z"
        }
    }

    class MockCollection:
        def __init__(self, storage):
            self.storage = storage

        async def find_one(self, query, projection=None):
            if "platform" in query:
                return self.storage.get(query["platform"])
            if "id" in query:
                return self.storage.get(query["id"])
            return None

        async def update_one(self, query, update, upsert=False):
            key = query.get("platform") or query.get("id")
            if "$set" in update:
                doc = self.storage.get(key, {})
                doc.update(update["$set"])
                self.storage[key] = doc
            return None

    class MockDB:
        def __init__(self):
            self.social_accounts = MockCollection(stored_accounts)
            self.social_settings = MockCollection(stored_settings)
            self.social_comments = MockCollection(stored_comments)

    mock_db = MockDB()
    yt_client = YouTubeAutomationClient(db=mock_db)

    # 1. Historical comment from 6 months ago (on an old video)
    old_time = "2026-05-01T10:00:00Z"
    # 2. Brand new comment from 5 minutes ago (on an old video or new video)
    new_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()

    mock_comments = [
        {
            "id": "yt_hist_001",
            "comment_id": "hist_001",
            "thread_id": "hist_001",
            "platform": "youtube",
            "author_name": "old_viewer",
            "author_channel_id": "UC_diff_1",
            "comment_text": "Nice video bro",
            "published_at": old_time,
            "video_id": "old_vid_123"
        },
        {
            "id": "yt_new_002",
            "comment_id": "new_002",
            "thread_id": "new_002",
            "platform": "youtube",
            "author_name": "new_viewer",
            "author_channel_id": "UC_diff_2",
            "comment_text": "Sony A7 IV best settings?",
            "published_at": new_time,
            "video_id": "old_vid_123" # New comment on an old video!
        }
    ]

    # Override fetch_recent_comments to return our test comments
    async def mock_fetch(max_results=25):
        return True, mock_comments, None
    yt_client.fetch_recent_comments = mock_fetch

    res = await yt_client.sync_and_process_comments(
        auto_reply_enabled=False,
        safe_testing_mode=True
    )

    assert res["success"] is True
    assert res["total_fetched"] == 2
    assert res["historical_count"] == 1
    assert res["new_evaluated"] == 1
    assert res["previews_ready"] == 1
    assert res["auto_replied"] == 0

    # Verify historical comment status in DB
    c_hist = stored_comments.get("yt_hist_001")
    assert c_hist is not None
    assert c_hist["status"] == "historical"
    assert c_hist["suggested_reply"] is None

    # Verify new comment was evaluated
    c_new = stored_comments.get("yt_new_002")
    assert c_new is not None
    assert c_new["status"] == "preview_ready"
    assert "S-Log3" in c_new["suggested_reply"] or "800" in c_new["suggested_reply"]






# ==================== PHASE 4: HYBRID AUTOMATION BUILDER TESTS ====================

@pytest.mark.anyio
async def test_phase4_initial_seed_automation():
    from backend.social_automation import INITIAL_SEED_AUTOMATION, get_social_automations

    seed = INITIAL_SEED_AUTOMATION
    assert seed["name"] == "Sony Camera Settings"
    assert "youtube" in seed["platforms"]
    assert "facebook" in seed["platforms"]
    assert "instagram" in seed["platforms"]
    assert seed["videoUrl"] == ""
    assert seed["resourceUrl"] == ""
    assert seed["triggerType"] == "keyword"
    assert seed["keywords"] == ["SETTINGS", "LINK", "PRICE"]
    assert "Camera settings మరియు links ఇక్కడ చూడండి 👇" in seed["replyMessage"]
    assert seed["aiFallback"] is True
    assert seed["enabled"] is False
    assert seed["safeTestingMode"] is True
    assert seed["status"] == "draft"

    # Test get_social_automations seeds when db is empty
    class EmptyMockDB:
        def __init__(self):
            self.docs = []
            self.social_automations = self
        def find(self, *args, **kwargs):
            return self
        def sort(self, *args, **kwargs):
            return self
        async def to_list(self, limit):
            return list(self.docs)
        async def insert_one(self, doc):
            self.docs.append(doc)

    mock_db = EmptyMockDB()
    autos = await get_social_automations(mock_db)
    assert len(autos) >= 1
    assert autos[0]["name"] == "Sony Camera Settings"
    assert autos[0]["videoUrl"] == ""
    assert autos[0]["resourceUrl"] == ""


def test_phase4_validation_rules():
    from backend.social_automation import validate_automation_payload

    # 1. Missing name
    ok, err = validate_automation_payload({"name": ""})
    assert ok is False
    assert "Name is required" in err

    # 2. Missing platforms
    ok, err = validate_automation_payload({"name": "Test", "platforms": []})
    assert ok is False
    assert "At least one platform" in err

    # 3. Invalid platform
    ok, err = validate_automation_payload({"name": "Test", "platforms": ["tiktok"]})
    assert ok is False
    assert "Invalid platform" in err

    # 4. Keyword trigger without keywords
    ok, err = validate_automation_payload({
        "name": "Test",
        "platforms": ["youtube"],
        "triggerType": "keyword",
        "keywords": []
    })
    assert ok is False
    assert "At least one keyword is required" in err

    # 5. Invalid URL on activation
    ok, err = validate_automation_payload({
        "name": "Test",
        "platforms": ["youtube"],
        "triggerType": "keyword",
        "keywords": ["LUT"],
        "replyMessage": "Here is your link",
        "enabled": True,
        "videoUrl": "not_a_valid_url"
    })
    assert ok is False
    assert "must be a valid HTTP or HTTPS URL" in err

    # 6. Instagram activation without SuperProfile coordination confirmation
    ok, err = validate_automation_payload({
        "name": "Insta Auto",
        "platforms": ["instagram"],
        "triggerType": "keyword",
        "keywords": ["LUT"],
        "replyMessage": "Check DM",
        "enabled": True,
        "superprofile_coordinated": False
    })
    assert ok is False
    assert "SuperProfile Safety Check" in err

    # 7. Instagram activation WITH SuperProfile coordination confirmation
    ok, err = validate_automation_payload({
        "name": "Insta Auto",
        "platforms": ["instagram"],
        "triggerType": "keyword",
        "keywords": ["LUT"],
        "replyMessage": "Check DM",
        "enabled": True,
        "superprofile_coordinated": True
    })
    assert ok is True
    assert err is None


def test_phase4_keyword_matching_multilingual():
    from backend.social_automation import match_keywords_in_text

    kws = ["SETTINGS", "LINK", "PRICE", "ధర", "సెట్టింగ్స్"]

    # English query
    assert match_keywords_in_text(kws, "Sony A7 IV settings?") == ["SETTINGS"]
    # Romanized Telugu (Tanglish) query
    assert match_keywords_in_text(kws, "bro link pampandi") == ["LINK"]
    # Telugu native script query
    assert match_keywords_in_text(kws, "కెమెరా ధర ఎంత?") == ["ధర"]
    # Punctuation isolation
    assert match_keywords_in_text(kws, "Z6ii. Settings. Plz send") == ["SETTINGS"]
    # Case insensitive
    assert match_keywords_in_text(kws, "what is the price?") == ["PRICE"]


@pytest.mark.anyio
async def test_phase4_hybrid_reply_simulation():
    from backend.social_automation import simulate_hybrid_reply

    test_auto = {
        "id": "auto_sony_test",
        "name": "Sony Camera Settings",
        "platforms": ["youtube", "facebook", "instagram"],
        "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "triggerType": "keyword",
        "keywords": ["SETTINGS", "LINK", "PRICE"],
        "replyMessage": "Camera settings మరియు links ఇక్కడ చూడండి 👇",
        "resourceUrl": "https://pranvithdop.com/assets",
        "aiFallback": True,
        "enabled": False,
        "safeTestingMode": True,
        "status": "draft"
    }

    # 1. Keyword match on YouTube (Specific Video Match)
    res_yt = await simulate_hybrid_reply(
        db=None,
        platform="youtube",
        comment_text="Camera settings kavali bro",
        author_name="raj_creator",
        video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        automation_override=test_auto
    )
    assert res_yt["status"] == "preview_only"
    assert res_yt["action"] == "keyword_automation"
    assert res_yt["ai_fallback_used"] is False
    assert "Camera settings మరియు links ఇక్కడ చూడండి 👇" in res_yt["public_reply"]
    assert "https://pranvithdop.com/assets" in res_yt["public_reply"]
    assert res_yt["dm_reply"] is None  # DMs not supported on YouTube

    # 2. Keyword match on Instagram: Provides both Public Reply AND Private DM Preview
    res_ig = await simulate_hybrid_reply(
        db=None,
        platform="instagram",
        comment_text="send link plz",
        author_name="ramesh_cine",
        video_url="https://www.instagram.com/reel/DfTekPtNTe5/",
        automation_override=test_auto
    )
    assert res_ig["status"] == "preview_only"
    assert res_ig["public_reply"] is not None
    assert res_ig["dm_reply"] is not None
    assert "ramesh_cine" in res_ig["dm_reply"]
    assert "https://pranvithdop.com/assets" in res_ig["dm_reply"]
    assert "30 SuperProfile automations protected" in res_ig["superprofile_status"]

    # 3. No keyword match with AI Fallback ON: generates contextual AI response
    res_ai = await simulate_hybrid_reply(
        db=None,
        platform="youtube",
        comment_text="Nikon Z6II base ISO entha?",
        author_name="shakeel",
        automation_override=test_auto
    )
    assert res_ai["ai_fallback_used"] is True
    assert "800" in res_ai["public_reply"] or "N-Log" in res_ai["public_reply"]
    assert res_ai["action"] == "ai_fallback"

    # 4. No keyword match with AI Fallback OFF: takes no action
    auto_no_ai = dict(test_auto)
    auto_no_ai["aiFallback"] = False
    res_no_ai = await simulate_hybrid_reply(
        db=None,
        platform="youtube",
        comment_text="What do you think of this location?",
        author_name="shakeel",
        automation_override=auto_no_ai
    )
    assert res_no_ai["action"] == "none"
    assert res_no_ai["public_reply"] is None
    assert res_no_ai["ai_fallback_used"] is False


@pytest.mark.anyio
async def test_phase4_duplicate_detection_simulation():
    from backend.social_automation import simulate_hybrid_reply

    class MockDuplicateDB:
        def __init__(self):
            self.social_comments = self
            self.social_automations = self
        def find(self, *args, **kwargs):
            return self
        def sort(self, *args, **kwargs):
            return self
        async def to_list(self, limit):
            return []
        async def find_one(self, query, projection=None):
            if query.get("comment_id") == "comm_duplicate_123":
                return {"status": "auto_replied", "published_at": "2026-11-04T12:00:00Z"}
            return None

    mock_db = MockDuplicateDB()
    res = await simulate_hybrid_reply(
        db=mock_db,
        platform="youtube",
        comment_text="Sony settings plz",
        author_name="test_user",
        comment_id="comm_duplicate_123"
    )
    assert res["is_duplicate"] is True
    assert "DUPLICATE_DETECTED" in res["duplicate_detection_result"]
