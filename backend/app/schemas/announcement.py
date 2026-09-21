from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    target_type: str = "company"
    team_ids: list[int] = Field(default_factory=list)


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    target_type: str | None = None
    team_ids: list[int] | None = None


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    target_type: str
    team_ids: list[int] = Field(default_factory=list)
    team_names: list[str] = Field(default_factory=list)
    creator_id: int
    created_at: datetime
    updated_at: datetime
    is_read: bool = False
    creator_name: str | None = None
