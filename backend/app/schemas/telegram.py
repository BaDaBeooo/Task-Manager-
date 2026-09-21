from pydantic import BaseModel, Field


class TelegramChatIdUpdate(BaseModel):
    chat_id: str = Field(min_length=1, max_length=50)


class TelegramStatusResponse(BaseModel):
    configured: bool
    connected: bool
    bot_username: str | None = None
    chat_id: str | None = None
    group_configured: bool = False
    auto_link_url: str | None = None
    auto_link_expires_in: int | None = None


class TelegramTestResponse(BaseModel):
    success: bool
    message: str


class TelegramLinkResponse(BaseModel):
    success: bool
    url: str
    expires_in: int
    message: str


class TelegramAdminUserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    is_active: bool
    connected: bool
    chat_id: str | None = None
    link_url: str | None = None
    link_expires_in: int | None = None
