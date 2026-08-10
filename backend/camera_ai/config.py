import os
from dataclasses import dataclass


def _bounded_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        value = default
    return min(max(value, minimum), maximum)


@dataclass(frozen=True)
class CameraAiConfig:
    enabled: bool
    provider: str
    model: str
    api_key: str
    max_history: int
    max_tokens: int
    timeout_seconds: int
    rate_limit_per_minute: int
    mock_enabled: bool

    @classmethod
    def from_env(cls) -> "CameraAiConfig":
        return cls(
            enabled=os.environ.get("CAMERA_AI_ENABLED", "true").lower() == "true",
            provider=os.environ.get("AI_PROVIDER", "openai").strip().lower(),
            model=os.environ.get("CAMERA_AI_MODEL", "gpt-5.6-luna").strip(),
            api_key=os.environ.get("OPENAI_API_KEY", "").strip(),
            max_history=_bounded_int("CAMERA_AI_MAX_HISTORY", 10, 0, 16),
            max_tokens=_bounded_int("CAMERA_AI_MAX_TOKENS", 700, 100, 1600),
            timeout_seconds=_bounded_int("CAMERA_AI_TIMEOUT_SECONDS", 25, 5, 55),
            rate_limit_per_minute=_bounded_int("CAMERA_AI_RATE_LIMIT_PER_MINUTE", 12, 1, 60),
            mock_enabled=os.environ.get("CAMERA_AI_MOCK", "false").lower() == "true",
        )


def camera_ai_config_summary() -> dict:
    config = CameraAiConfig.from_env()
    return {"enabled": config.enabled, "provider": config.provider, "model": config.model, "api_key_configured": bool(config.api_key), "mock_enabled": config.mock_enabled, "max_history": config.max_history}
