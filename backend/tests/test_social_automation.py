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
    assert c3["intent"] == "CAMERA_SETTINGS"

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
    assert r1["intent"] == "CAMERA_SETTINGS"
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
            assert pdata["evaluation"]["intent"] == "CAMERA_SETTINGS"
            assert pdata["evaluation"]["detected_language"] == "telugu"
            assert "@rambabu" in pdata["evaluation"]["reply_text"]
    finally:
        server.app.dependency_overrides.clear()


