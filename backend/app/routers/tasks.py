from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..routers.auth import get_current_user
from ..schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from ..services.task_service import (
    create_task,
    delete_task,
    get_task,
    get_tasks,
    recalculate_task_progress,
    update_subtask,
    update_task,
)


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


class SubtaskUpdateRequest(BaseModel):
    completed: bool


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_task(
    task_data: TaskCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_task(
        db=db,
        task_data=task_data,
        creator_id=current_user.id,
    )


@router.get(
    "",
    response_model=list[TaskResponse],
)
def list_tasks(
    mine: bool = False,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_tasks(
        db,
        current_user=current_user,
        mine=mine,
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
)
def get_single_task(
    task_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(
        db,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    return task


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
)
def update_existing_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(
        db,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )

    return update_task(
        db,
        task,
        task_data,
    )


@router.patch(
    "/{task_id}/subtasks/{subtask_id}",
    response_model=TaskResponse,
)
def update_task_subtask(
    task_id: int,
    subtask_id: int,
    subtask_data: SubtaskUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(
        db,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )


    # Chỉ người được giao hoặc người tạo task
    # mới được cập nhật subtask.
    if (
        current_user.id != task.creator_id
        and current_user.id != task.assignee_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update this task",
        )


    subtask = next(
        (
            item
            for item in task.subtasks
            if item.id == subtask_id
        ),
        None,
    )


    if not subtask:
        raise HTTPException(
            status_code=404,
            detail="Subtask not found",
        )


    update_subtask(
        db=db,
        subtask=subtask,
        completed=subtask_data.completed,
    )


    return recalculate_task_progress(
        db=db,
        task=task,
    )


@router.delete(
    "/{task_id}",
)
def delete_existing_task(
    task_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(
        db,
        task_id,
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found",
        )


    if (
        current_user.id != task.creator_id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this task",
        )


    delete_task(
        db,
        task,
    )

    return {
        "message": "Task deleted successfully"
    }