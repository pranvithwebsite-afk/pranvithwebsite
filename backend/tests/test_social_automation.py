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
