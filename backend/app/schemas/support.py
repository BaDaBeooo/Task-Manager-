from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# CREATE TICKET
# =========================================================

class SupportTicketCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        min_length=1,
    )

    category: str = "other"

    priority: str = "medium"


# =========================================================
# UPDATE TICKET
# =========================================================

class SupportTicketUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    priority: str | None = None


# =========================================================
# ASSIGN
# =========================================================

class SupportTicketAssign(BaseModel):
    assignee_id: int | None = None


# =========================================================
# STATUS
# =========================================================

class SupportTicketStatusUpdate(BaseModel):
    status: str


# =========================================================
# COMMENT
# =========================================================

class SupportTicketCommentCreate(BaseModel):
    content: str = Field(
        min_length=1,
    )


# =========================================================
# USER MINI RESPONSE
# =========================================================

class SupportUserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    username: str
    full_name: str


# =========================================================
# COMMENT RESPONSE
# =========================================================

class SupportTicketCommentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    ticket_id: int
    user_id: int
    content: str
    created_at: datetime
    updated_at: datetime

    user: SupportUserResponse | None = None


# =========================================================
# ACTIVITY RESPONSE
# =========================================================

class SupportTicketActivityResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    ticket_id: int
    user_id: int
    action: str
    old_value: str | None
    new_value: str | None
    created_at: datetime

    user: SupportUserResponse | None = None


class SupportDepartmentMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str


class SupportTeamMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department_id: int
    name: str
    code: str


# =========================================================
# TICKET RESPONSE
# =========================================================

class SupportTicketResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    ticket_code: str

    title: str
    description: str

    creator_id: int
    assignee_id: int | None

    category: str
    priority: str
    status: str

    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    closed_at: datetime | None

    department_id: int | None = None
    team_id: int | None = None
    routing_score: int = 0
    routing_method: str | None = None

    department: SupportDepartmentMini | None = None
    team: SupportTeamMini | None = None

    creator: SupportUserResponse | None = None
    assignee: SupportUserResponse | None = None


# =========================================================
# TICKET DETAIL
# =========================================================

class SupportTicketDetailResponse(
    SupportTicketResponse
):

    comments: list[
        SupportTicketCommentResponse
    ] = []

    activities: list[
        SupportTicketActivityResponse
    ] = []