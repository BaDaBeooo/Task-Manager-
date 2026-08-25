from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.task import Task
from ..routers.auth import get_current_user
from ..schemas.task import TaskCreate, TaskResponse, TaskUpdate
from ..services.task_service import (
    create_task,
    delete_task,
    get_task,
    get_tasks,
    update_task,
)


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


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
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_tasks(db)


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

    delete_task(
        db,
        task,
    )

    return {
        "message": "Task deleted successfully"
    }