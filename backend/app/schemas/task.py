from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# SUBTASK
# =========================================================

class SubtaskCreate(BaseModel):
    title: str


class SubtaskResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    task_id: int
    title: str
    completed: bool
    created_at: datetime
    completed_at: datetime | None


# =========================================================
# TASK ACTIVITY
# =========================================================

class TaskActivityResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    task_id: int
    user_id: int
    subtask_id: int | None
    action: str
    created_at: datetime


# =========================================================
# TASK SUPPORTER
# =========================================================

class TaskSupporterResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    task_id: int
    user_id: int


# =========================================================
# TASK CREATE
# =========================================================

class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assignee_id: int | None = None
    priority: str = "medium"
    deadline: datetime | None = None
    subtasks: list[SubtaskCreate] = []


# =========================================================
# TASK UPDATE
# =========================================================

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: int | None = None
    status: str | None = None
    priority: str | None = None
    progress: int | None = None
    deadline: datetime | None = None


# =========================================================
# TASK RESPONSE
# =========================================================

class TaskResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    title: str
    description: str | None
    creator_id: int
    assignee_id: int | None
    status: str
    priority: str
    progress: int
    deadline: datetime | None
    created_at: datetime
    updated_at: datetime

    subtasks: list[SubtaskResponse] = Field(
        default_factory=list
    )

    supporters: list[TaskSupporterResponse] = Field(
        default_factory=list,
        validation_alias="supporter_links",
    )

    activities: list[TaskActivityResponse] = Field(
        default_factory=list
    )