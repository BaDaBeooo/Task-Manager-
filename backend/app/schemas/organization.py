from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=50)
    parent_id: int | None = None
    manager_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=50)
    parent_id: int | None = None
    manager_id: int | None = None
    is_active: bool | None = None


class TeamCreate(BaseModel):
    department_id: int
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=50)
    lead_id: int | None = None


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=50)
    lead_id: int | None = None
    is_active: bool | None = None


class TeamMemberCreate(BaseModel):
    user_id: int


class RoutingRuleCreate(BaseModel):
    team_id: int
    keyword: str = Field(min_length=1, max_length=100)
    weight: int = Field(default=10, ge=1, le=100)


class RoutingRuleUpdate(BaseModel):
    keyword: str | None = Field(default=None, min_length=1, max_length=100)
    weight: int | None = Field(default=None, ge=1, le=100)
    is_active: bool | None = None


class OrgUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str
    parent_id: int | None
    manager_id: int | None
    is_active: bool
    created_at: datetime
    manager: OrgUser | None = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department_id: int
    name: str
    code: str
    lead_id: int | None
    is_active: bool
    created_at: datetime
    lead: OrgUser | None = None


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    team_id: int
    user_id: int
    is_active: bool
    user: OrgUser


class RoutingRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    team_id: int
    keyword: str
    weight: int
    is_active: bool
    created_at: datetime
