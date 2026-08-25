from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoleCreate(BaseModel):
    name: str
    code: str


class RoleUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    is_active: bool | None = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    name: str
    code: str
    is_active: bool
    created_at: datetime