from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubtaskCreate(BaseModel):
    title: str


class SubtaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    title: str
    completed: bool
    created_at: datetime
    completed_at: datetime | None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assignee_id: int | None = None
    priority: str = "medium"
    deadline: datetime | None = None
    subtasks: list[SubtaskCreate] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: int | None = None
    status: str | None = None
    priority: str | None = None
    progress: int | None = None
    deadline: datetime | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    subtasks: list[SubtaskResponse] = []