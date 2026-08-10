import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request

from .config import CameraAiConfig
from .schemas import CameraAiChatRequest, CameraAiChatResponse
from .service import CameraAiProviderFailure, CameraAiProviderRateLimited, CameraAiProviderUnavailable, create_camera_ai_reply

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/camera-ai", tags=["camera-ai"])
_recent_requests: dict[str, deque[float]] = defaultdict(deque)


def _request_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def _enforce_rate_limit(request: Request, limit: int) -> None:
    now = time.monotonic(); records = _recent_requests[_request_ip(request)]
    while records and now - records[0] > 60: records.popleft()
    if len(records) >= limit:
        logger.warning("Camera AI rate limit exceeded")
        raise HTTPException(status_code=429, detail="Camera AI is busy. Please wait a moment and try again.")
    records.append(now)


@router.post("/chat", response_model=CameraAiChatResponse)
async def camera_ai_chat(payload: CameraAiChatRequest, request: Request) -> CameraAiChatResponse:
    _enforce_rate_limit(request, CameraAiConfig.from_env().rate_limit_per_minute)
    try:
        conversation_id, result = await create_camera_ai_reply(payload)
        logger.info("Camera AI reply generated conversation_id=%s history_count=%d", conversation_id, len(payload.history))
        return CameraAiChatResponse(message=result.message, conversation_id=conversation_id, settings=result.settings)
    except CameraAiProviderRateLimited as exc:
        logger.warning("Camera AI provider rate limited: %s", exc)
        raise HTTPException(status_code=429, detail="Camera AI is busy. Please try again shortly.") from exc
    except CameraAiProviderUnavailable as exc:
        logger.error("Camera AI unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Camera AI is temporarily unavailable. Please try again later.") from exc
    except CameraAiProviderFailure as exc:
        logger.warning("Camera AI provider failure: %s", exc)
        raise HTTPException(status_code=502, detail="Camera AI is having trouble responding right now. Please try again.") from exc
    except Exception as exc:
        logger.exception("Camera AI request failed type=%s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Camera AI is having trouble responding right now. Please try again.") from exc
