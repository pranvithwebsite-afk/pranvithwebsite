from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class CameraAiHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class CameraAiChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(default=None, max_length=128)
    history: list[CameraAiHistoryMessage] = Field(default_factory=list, max_length=16)

    @field_validator("message", "conversation_id", mode="before")
    @classmethod
    def strip_text(cls, value):
        if value is None:
            return value
        cleaned = str(value).strip()
        if not cleaned:
            raise ValueError("must not be empty")
        return cleaned


class CameraSettings(BaseModel):
    title: Optional[str] = None
    mode: Optional[str] = None
    aperture: Optional[str] = None
    shutter: Optional[str] = None
    shutterAngle: Optional[str] = None
    iso: Optional[str] = None
    whiteBalance: Optional[str] = None
    focus: Optional[str] = None
    lens: Optional[str] = None
    frameRate: Optional[str] = None
    pictureProfile: Optional[str] = None
    metering: Optional[str] = None
    ndFilter: Optional[str] = None
    proTip: Optional[str] = None


class CameraAiChatResponse(BaseModel):
    message: str
    conversation_id: str
    settings: Optional[CameraSettings] = None
