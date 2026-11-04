import pytest
import asyncio
from camera_ai import answer_camera_query, detect_language, extract_camera_context


def test_detect_language():
    assert detect_language("Nikon Z6IIIలో 4K 120fps ఎలా రికార్డ్ చేయాలి?") == "telugu"
    assert detect_language("Explain aperture in Telugu.") == "telugu"
    assert detect_language("Nikon Z6III lo slow motion ela cheyyali?") == "telugu"
    assert detect_language("Nikon Z6III me slow motion kaise shoot kare?") == "hindi"
    assert detect_language("Explain the 180-degree shutter rule.") == "english"
    assert detect_language("Best camera settings for indoor wedding?") == "english"


def test_extract_camera_context():
    assert extract_camera_context("Best settings for Nikon Z6III?") == "nikon_z6iii"
    assert extract_camera_context("Sony FX3 vs A7SIII") == "sony_fx3"
    
    # Check context from history
    history = [
        {"role": "user", "text": "I shoot with Nikon Z6III"},
        {"role": "model", "text": "Great camera!"}
    ]
    assert extract_camera_context("What about slow motion?", history) == "nikon_z6iii"


def test_10_benchmark_questions():
    test_cases = [
        ("Nikon Z6IIIలో 4K 120fps ఎలా రికార్డ్ చేయాలి?", ["Nikon Z6III", "120fps", "1.5x DX Crop", "1/240s"]),
        ("Explain the 180-degree shutter rule.", ["180-Degree", "Shutter Speed", "Frame Rate", "1/50s"]),
        ("Best lens for Nikon Z6III wedding cinematography?", ["NIKKOR Z 24-70mm", "NIKKOR Z 85mm", "wedding"]),
        ("Sony FX3 vs Nikon Z6III for filmmaking?", ["Sony FX3", "Nikon Z6III", "Sensor", "RAW"]),
        ("Explain aperture in Telugu.", ["ఎపర్చర్", "Aperture", "f-number", "బోకె"]),
        ("Best camera settings for indoor wedding?", ["Indoor", "25 fps", "1/50s", "Kelvin"]),
        ("How to shoot cinematic slow motion?", ["Slow-Motion", "180° Shutter", "1/120s"]),
        ("Nikon Z6III autofocus settings for wedding?", ["Autofocus", "AF-C", "People", "Tracking Sensitivity"]),
        ("Which lens is best for low-light video?", ["Low-Light", "f/1.4", "f/1.2"]),
        ("How can I shoot professional Instagram Reels?", ["Instagram Reels", "1080x1920", "30fps"])
    ]

    for question, expected_keywords in test_cases:
        res = asyncio.run(answer_camera_query(question))
        response_text = res.get("response", "")
        assert response_text, f"Empty response for question: {question}"
        for kw in expected_keywords:
            assert kw.lower() in response_text.lower(), f"Expected keyword '{kw}' missing in response for '{question}'"


def test_conversation_context_retention():
    history = []
    
    # Turn 1: User mentions camera
    t1 = asyncio.run(answer_camera_query("I have Nikon Z6III", history))
    assert "Nikon Z6III" in t1["response"]
    history.append({"role": "user", "text": "I have Nikon Z6III"})
    history.append({"role": "model", "text": t1["response"]})

    # Turn 2: User asks for wedding settings without repeating camera model
    t2 = asyncio.run(answer_camera_query("What settings should I use for wedding?", history))
    assert "Nikon Z6III" in t2["response"]
    history.append({"role": "user", "text": "What settings should I use for wedding?"})
    history.append({"role": "model", "text": t2["response"]})

    # Turn 3: User asks for slow motion
    t3 = asyncio.run(answer_camera_query("What about slow motion?", history))
    assert "Nikon Z6III" in t3["response"]
    assert "1.5x" in t3["response"] or "120" in t3["response"]


def test_admin_settings_disable():
    res = asyncio.run(answer_camera_query(
        "Nikon Z6III settings",
        admin_settings={"camera_ai_enabled": False}
    ))
    assert "temporarily paused" in res["response"].lower()
