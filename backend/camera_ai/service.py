import json
import logging
import re
import uuid
from dataclasses import dataclass
from typing import Optional, Protocol

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None

from .config import CameraAiConfig
from .prompt import CAMERA_AI_SYSTEM_PROMPT, build_camera_ai_prompt
from .schemas import CameraAiChatRequest, CameraSettings

logger = logging.getLogger(__name__)


class CameraAiProviderUnavailable(RuntimeError): pass
class CameraAiProviderRateLimited(RuntimeError): pass
class CameraAiProviderFailure(RuntimeError): pass


@dataclass
class CameraAiResult:
    message: str
    settings: Optional[CameraSettings] = None


class CameraAiProvider(Protocol):
    async def generate(self, prompt: list[dict[str, str]]) -> CameraAiResult: ...


SETTING_FIELDS = ("title", "mode", "aperture", "shutter", "shutterAngle", "iso", "whiteBalance", "focus", "lens", "frameRate", "pictureProfile", "metering", "ndFilter", "proTip")
CAMERA_AI_JSON_SCHEMA = {"type": "object", "additionalProperties": False, "properties": {"message": {"type": "string"}, "settings": {"anyOf": [{"type": "null"}, {"type": "object", "additionalProperties": False, "properties": {key: {"type": ["string", "null"]} for key in SETTING_FIELDS}, "required": list(SETTING_FIELDS)}]}}, "required": ["message", "settings"]}


def _response_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str) and payload["output_text"].strip(): return payload["output_text"]
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and isinstance(content.get("text"), str): return content["text"]
    raise CameraAiProviderFailure("OpenAI response did not include output text")


class OpenAiResponsesProvider:
    endpoint = "https://api.openai.com/v1/responses"
    def __init__(self, config: CameraAiConfig): self.config = config

    async def generate(self, prompt: list[dict[str, str]]) -> CameraAiResult:
        if not self.config.api_key: raise CameraAiProviderUnavailable("OPENAI_API_KEY is missing")
        if httpx is None: raise CameraAiProviderUnavailable("httpx dependency is unavailable")
        body = {"model": self.config.model, "instructions": CAMERA_AI_SYSTEM_PROMPT, "input": prompt, "max_output_tokens": self.config.max_tokens, "store": False, "text": {"verbosity": "low", "format": {"type": "json_schema", "name": "camera_ai_reply", "strict": True, "schema": CAMERA_AI_JSON_SCHEMA}}}
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.config.timeout_seconds)) as client:
                response = await client.post(self.endpoint, headers={"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"}, json=body)
        except httpx.TimeoutException as exc: raise CameraAiProviderFailure("OpenAI request timed out") from exc
        except httpx.HTTPError as exc: raise CameraAiProviderFailure("OpenAI network request failed") from exc
        if response.status_code == 429: raise CameraAiProviderRateLimited("OpenAI rate limit reached")
        if response.status_code in {401, 403}: raise CameraAiProviderUnavailable("OpenAI credentials were rejected")
        if response.status_code >= 400:
            logger.warning("OpenAI Camera AI request failed status=%s", response.status_code)
            raise CameraAiProviderFailure("OpenAI request failed")
        try:
            parsed = json.loads(_response_text(response.json())); message = str(parsed["message"]).strip()
            if not message: raise ValueError("empty message")
            return CameraAiResult(message=message, settings=CameraSettings.model_validate(parsed["settings"]) if parsed.get("settings") else None)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("OpenAI Camera AI returned malformed structured output")
            raise CameraAiProviderFailure("OpenAI returned an invalid response") from exc


class DevelopmentMockCameraAiProvider:
    async def generate(self, prompt: list[dict[str, str]]) -> CameraAiResult:
        context = " ".join(item["content"] for item in prompt); question = prompt[-1]["content"]; lower = context.lower()
        if re.search(r"\b(creative|shot ideas|bride entry|what is aperture|composition)\b", question, re.I):
            if "aperture" in question.lower(): return CameraAiResult("Aperture is the opening in a lens. A lower f-number admits more light and gives shallower depth of field; a higher f-number admits less light and keeps more of the scene in focus.")
            return CameraAiResult("For a bride entry, begin with a wide establishing shot, then capture hands, jewellery, reactions, a slow tracking reveal, foreground framing, a close-up of the expression, and cutaways of family and decor. Build the sequence around emotion rather than using every movement at once.")
        is_video = bool(re.search(r"\b(video|cinematic|fps|frame rate)\b", lower)); fps = re.search(r"\b(24|25|30|50|60|120)\s*fps\b", lower)
        shutter_map = {"24": "1/48s or 1/50s", "25": "1/50s", "30": "1/60s", "50": "1/100s", "60": "1/120s or 1/125s", "120": "1/240s or 1/250s"}
        settings = CameraSettings(title="Cinematic Video Starting Point" if is_video else "Photography Starting Point", mode="Manual", aperture="f/1.8 – f/2.8 for subject separation", shutter=shutter_map.get(fps.group(1) if fps else "", "1/50s at 24/25fps") if is_video else "1/250s or faster for moving subjects", shutterAngle="180°" if is_video else None, iso="Start at base ISO; raise only as light requires", whiteBalance="Set a manual Kelvin value for consistency", focus="AF-C with face/eye tracking", lens="Use the lens you mentioned; 85mm is excellent for flattering portraits" if "85" in lower else None, frameRate=f"{fps.group(1)}fps" if fps and is_video else None, pictureProfile="Choose a profile you can expose and grade confidently" if is_video else None, metering="Multi / Evaluative", ndFilter="Use ND outdoors when video shutter speed must stay fixed" if is_video else None, proTip="These are strong starting settings; adjust for actual light, subject movement, sensor and desired look.")
        return CameraAiResult("Here is a practical starting point. Watch highlights and skin tones, then refine exposure as the scene changes.", settings)


def get_camera_ai_provider(config: Optional[CameraAiConfig] = None) -> CameraAiProvider:
    config = config or CameraAiConfig.from_env()
    if not config.enabled: raise CameraAiProviderUnavailable("Camera AI is disabled")
    if config.mock_enabled: return DevelopmentMockCameraAiProvider()
    if config.provider != "openai": raise CameraAiProviderUnavailable("Configured Camera AI provider is unsupported")
    return OpenAiResponsesProvider(config)


async def create_camera_ai_reply(payload: CameraAiChatRequest) -> tuple[str, CameraAiResult]:
    config = CameraAiConfig.from_env(); conversation_id = payload.conversation_id or str(uuid.uuid4())
    prompt = build_camera_ai_prompt(payload.message, payload.history[-config.max_history:] if config.max_history else [])
    return conversation_id, await get_camera_ai_provider(config).generate(prompt)
