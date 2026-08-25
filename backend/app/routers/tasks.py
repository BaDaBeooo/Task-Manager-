from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models import Subtask, Task, TaskSupporter, User
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


# =========================================================
# CREATE TASK
# =========================================================

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


# =========================================================
# LIST TASKS
# =========================================================

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


# =========================================================
# GET TASK DETAIL
# =========================================================

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


# =========================================================
# ADD SUPPORTER
# =========================================================

@router.post(
    "/{task_id}/supporters/{user_id}",
    status_code=status.HTTP_201_CREATED,
)
def add_task_supporter(
    task_id: int,
    user_id: int,
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


    # Chỉ creator hoặc admin được quản lý supporter
    if (
        current_user.id != task.creator_id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Not allowed to manage task supporters",
        )


    user = db.get(
        User,
        user_id,
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )


    # Assignee chính không đồng thời là supporter
    if task.assignee_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Assignee cannot also be a supporter",
        )


    # Kiểm tra supporter đã tồn tại
    existing = (
        db.query(TaskSupporter)
        .filter(
            TaskSupporter.task_id == task_id,
            TaskSupporter.user_id == user_id,
        )
        .first()
    )


    if existing:
        raise HTTPException(
            status_code=400,
            detail="User is already a supporter",
        )


    supporter = TaskSupporter(
        task_id=task_id,
        user_id=user_id,
    )


    db.add(supporter)
    db.commit()
    db.refresh(supporter)


    return supporter


# =========================================================
# REMOVE SUPPORTER
# =========================================================

@router.delete(
    "/{task_id}/supporters/{user_id}",
)
def remove_task_supporter(
    task_id: int,
    user_id: int,
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


    # Chỉ creator hoặc admin được quản lý supporter
    if (
        current_user.id != task.creator_id
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Not allowed to manage task supporters",
        )


    supporter = (
        db.query(TaskSupporter)
        .filter(
            TaskSupporter.task_id == task_id,
            TaskSupporter.user_id == user_id,
        )
        .first()
    )


    if not supporter:
        raise HTTPException(
            status_code=404,
            detail="Supporter not found",
        )


    db.delete(supporter)
    db.commit()


    return {
        "message": "Supporter removed successfully"
    }


# =========================================================
# UPDATE TASK
# =========================================================

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


# =========================================================
# UPDATE SUBTASK
# =========================================================

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


    # Creator, assignee chính hoặc supporter
    # đều được cập nhật subtask.

    is_supporter = (
        db.query(TaskSupporter)
        .filter(
            TaskSupporter.task_id == task_id,
            TaskSupporter.user_id == current_user.id,
        )
        .first()
        is not None
    )


    if (
        current_user.id != task.creator_id
        and current_user.id != task.assignee_id
        and not is_supporter
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


# =========================================================
# DELETE TASK
# =========================================================

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