import asyncio

import pytest
from pydantic import ValidationError

from backend.camera_ai.schemas import CameraAiChatRequest, CameraAiHistoryMessage
from backend.camera_ai.config import CameraAiConfig
from backend.camera_ai import service
from backend.camera_ai.service import OpenAiResponsesProvider, create_camera_ai_reply


def reply(monkeypatch, message, history=None):
    monkeypatch.setenv("CAMERA_AI_MOCK", "true")
    return asyncio.run(create_camera_ai_reply(CameraAiChatRequest(message=message, history=history or [])))[1]


def test_wedding_settings_are_useful(monkeypatch):
    result = reply(monkeypatch, "Wedding settings")
    assert result.settings and result.settings.aperture and result.settings.focus


def test_golden_hour_portrait_returns_structured_photo_settings(monkeypatch):
    result = reply(monkeypatch, "Sony A7 IV, 85mm f1.8, golden hour portrait")
    assert result.settings and result.settings.shutter == "1/250s or faster for moving subjects"


def test_25fps_video_uses_frame_rate_aware_shutter(monkeypatch):
    result = reply(monkeypatch, "Sony A7 IV, shooting cinematic video at 25fps outdoors")
    assert result.settings and result.settings.shutter == "1/50s"


def test_50fps_video_uses_frame_rate_aware_shutter(monkeypatch):
    result = reply(monkeypatch, "Canon R6 Mark II night wedding video 50fps")
    assert result.settings and result.settings.shutter == "1/100s"


def test_creative_question_does_not_fabricate_settings(monkeypatch):
    result = reply(monkeypatch, "Give me 10 creative shots for bride entry")
    assert result.settings is None and "bride entry" in result.message.lower()


def test_educational_question_is_explained_without_settings(monkeypatch):
    result = reply(monkeypatch, "What is aperture?")
    assert result.settings is None and "opening" in result.message.lower()


def test_history_is_available_for_follow_up(monkeypatch):
    history = [CameraAiHistoryMessage(role="user", content="I have a Nikon Z8 with 24-70 f2.8")]
    result = reply(monkeypatch, "What settings for indoor reception?", history)
    assert result.settings and result.settings.aperture


def test_empty_message_is_rejected():
    with pytest.raises(ValidationError):
        CameraAiChatRequest(message="   ")


def test_openai_provider_parses_structured_responses(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200
        def json(self):
            return {"output": [{"content": [{"type": "output_text", "text": '{"message":"Use these as a starting point.","settings":{"title":"Golden Hour","mode":null,"aperture":"f/2","shutter":null,"shutterAngle":null,"iso":null,"whiteBalance":null,"focus":null,"lens":null,"frameRate":null,"pictureProfile":null,"metering":null,"ndFilter":null,"proTip":null}}'}]}]}

    class FakeClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return None
        async def post(self, _url, **kwargs): captured.update(kwargs); return FakeResponse()

    class FakeHttpx:
        Timeout = staticmethod(lambda value: value)
        AsyncClient = staticmethod(lambda **_kwargs: FakeClient())
        class TimeoutException(Exception): pass
        class HTTPError(Exception): pass

    monkeypatch.setattr(service, "httpx", FakeHttpx)
    config = CameraAiConfig(True, "openai", "test-model", "test-key", 10, 700, 25, 12, False)
    result = asyncio.run(OpenAiResponsesProvider(config).generate([{"role": "user", "content": "golden hour settings"}]))

    assert captured["json"]["model"] == "test-model"
    assert captured["json"]["text"]["format"]["type"] == "json_schema"
    assert result.settings and result.settings.aperture == "f/2"
