from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models import (
    Subtask,
    Task,
    TaskActivity,
    TaskComment,
    TaskSupporter,
    User,
)
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
from ..services.notification_service import create_notification
from ..services.realtime_service import realtime_manager


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


class SubtaskUpdateRequest(BaseModel):
    completed: bool


class SubtaskCreateRequest(BaseModel):
    title: str


class TaskCommentCreateRequest(BaseModel):
    content: str


# =========================================================
# PERMISSION HELPERS
# =========================================================

def is_admin(current_user) -> bool:
    """
    Kiểm tra user hiện tại có phải Admin hay không.
    Role hiện tại là Role object.
    """

    return (
        current_user.role is not None
        and current_user.role.code == "admin"
    )


def is_task_creator(
    current_user,
    task,
) -> bool:

    return (
        current_user.id == task.creator_id
    )


def is_task_assignee(
    current_user,
    task,
) -> bool:

    return (
        current_user.id == task.assignee_id
    )


def is_task_supporter(
    current_user,
    task_id: int,
    db: Session,
) -> bool:

    return (
        db.query(TaskSupporter)
        .filter(
            TaskSupporter.task_id == task_id,
            TaskSupporter.user_id == current_user.id,
        )
        .first()
        is not None
    )


def can_view_task(
    current_user,
    task,
    db: Session,
) -> bool:

    if is_admin(current_user):
        return True

    if is_task_creator(
        current_user,
        task,
    ):
        return True

    if is_task_assignee(
        current_user,
        task,
    ):
        return True

    return is_task_supporter(
        current_user,
        task.id,
        db,
    )


def can_manage_task(
    current_user,
    task,
) -> bool:

    return (
        is_admin(current_user)
        or is_task_creator(
            current_user,
            task,
        )
        or is_task_assignee(
            current_user,
            task,
        )
    )


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

    try:
        return create_task(
            db=db,
            task_data=task_data,
            creator_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


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

    if not can_view_task(
        current_user,
        task,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to view this task"
            ),
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

    if not can_manage_task(
        current_user,
        task,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "Not allowed to manage "
                "task supporters"
            ),
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

    # -----------------------------------------------------
    # ASSIGNEE KHÔNG ĐƯỢC LÀ SUPPORTER
    # -----------------------------------------------------

    if task.assignee_id == user_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "Assignee cannot also "
                "be a supporter"
            ),
        )

    # -----------------------------------------------------
    # CHECK EXISTING SUPPORTER
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # ADD SUPPORTER
    # -----------------------------------------------------

    supporter = TaskSupporter(
        task_id=task_id,
        user_id=user_id,
    )

    db.add(supporter)

    db.commit()

    db.refresh(supporter)

    # =====================================================
    # ACTIVITY LOG - SUPPORTER ADDED
    # =====================================================

    activity = TaskActivity(
        task_id=task_id,
        user_id=current_user.id,
        action="supporter_added",
    )

    db.add(activity)

    db.commit()

    # =====================================================
    # NOTIFICATION - SUPPORTER ADDED
    # =====================================================

    if user_id != current_user.id:

        create_notification(
            db=db,
            user_id=user_id,
            task_id=task_id,
            type="supporter_added",
            title="Bạn được thêm làm người hỗ trợ",
            message=(
                f'Bạn được thêm làm người hỗ trợ '
                f'cho task "{task.title}"'
            ),
        )

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "updated",
        "task_id": task_id,
    })

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

    if not can_manage_task(
        current_user,
        task,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "Not allowed to manage "
                "task supporters"
            ),
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

    # -----------------------------------------------------
    # SAVE SUPPORTER ID
    # -----------------------------------------------------

    removed_user_id = supporter.user_id

    # -----------------------------------------------------
    # REMOVE SUPPORTER
    # -----------------------------------------------------

    db.delete(supporter)

    db.commit()

    # =====================================================
    # ACTIVITY LOG - SUPPORTER REMOVED
    # =====================================================

    activity = TaskActivity(
        task_id=task_id,
        user_id=current_user.id,
        action="supporter_removed",
    )

    db.add(activity)

    db.commit()

    # =====================================================
    # NOTIFICATION - SUPPORTER REMOVED
    # =====================================================

    if removed_user_id != current_user.id:

        create_notification(
            db=db,
            user_id=removed_user_id,
            task_id=task_id,
            type="supporter_removed",
            title="Bạn không còn hỗ trợ task",
            message=(
                f'Bạn không còn là người hỗ trợ '
                f'cho task "{task.title}"'
            ),
        )

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "updated",
        "task_id": task_id,
    })

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

    # -----------------------------------------------------
    # ADMIN / CREATOR / ASSIGNEE
    # -----------------------------------------------------

    if not can_manage_task(
        current_user,
        task,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to update this task"
            ),
        )

    try:
        return update_task(
            db=db,
            task=task,
            task_data=task_data,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


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

    # -----------------------------------------------------
    # ADMIN / CREATOR / ASSIGNEE / SUPPORTER
    # -----------------------------------------------------

    if not can_view_task(
        current_user,
        task,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to update this task"
            ),
        )

    # -----------------------------------------------------
    # FIND SUBTASK
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # UPDATE SUBTASK
    # -----------------------------------------------------

    update_subtask(
        db=db,
        subtask=subtask,
        completed=subtask_data.completed,
        user_id=current_user.id,
    )

    # -----------------------------------------------------
    # RECALCULATE PROGRESS
    #
    # Truyền current_user.id để nếu việc tick subtask
    # làm thay đổi status task thì Activity Log biết
    # ai là người gây ra thay đổi đó.
    # -----------------------------------------------------

    return recalculate_task_progress(
        db=db,
        task=task,
        user_id=current_user.id,
    )


# =========================================================
# ADD SUBTASK TO EXISTING TASK
# =========================================================

@router.post("/{task_id}/subtasks", status_code=status.HTTP_201_CREATED)
def add_task_subtask(
    task_id: int,
    payload: SubtaskCreateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not can_view_task(current_user, task, db):
        raise HTTPException(status_code=403, detail="You do not have permission to add checklist items")
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Tên việc cần làm không được để trống")
    if len(title) > 200:
        raise HTTPException(status_code=400, detail="Tên việc cần làm tối đa 200 ký tự")

    subtask = Subtask(task_id=task.id, title=title, completed=False)
    db.add(subtask)
    db.flush()
    db.add(TaskActivity(task_id=task.id, user_id=current_user.id, subtask_id=subtask.id, action="subtask_added"))
    db.commit()
    db.refresh(subtask)
    recalculate_task_progress(db=db, task=task, user_id=current_user.id)
    realtime_manager.publish_all({"type": "data_changed", "entity": "task", "action": "updated", "task_id": task_id})
    return {"id": subtask.id, "task_id": subtask.task_id, "title": subtask.title, "completed": subtask.completed, "created_at": subtask.created_at, "completed_at": subtask.completed_at}


# =========================================================
# TASK COMMENTS
# =========================================================

@router.get("/{task_id}/comments")
def list_task_comments(
    task_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not can_view_task(current_user, task, db):
        raise HTTPException(status_code=403, detail="You do not have permission to view this task")
    comments = (db.query(TaskComment).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc(), TaskComment.id.asc()).all())
    return [{"id": c.id, "task_id": c.task_id, "user_id": c.user_id, "user_name": c.user.full_name if c.user else "Người dùng", "content": c.content, "created_at": c.created_at, "updated_at": c.updated_at} for c in comments]


@router.post("/{task_id}/comments", status_code=status.HTTP_201_CREATED)
def create_task_comment(
    task_id: int,
    payload: TaskCommentCreateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not can_view_task(current_user, task, db):
        raise HTTPException(status_code=403, detail="You do not have permission to comment on this task")
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Nội dung bình luận không được để trống")
    if len(content) > 5000:
        raise HTTPException(status_code=400, detail="Bình luận tối đa 5000 ký tự")
    comment = TaskComment(task_id=task_id, user_id=current_user.id, content=content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    realtime_manager.publish_all({"type": "data_changed", "entity": "task", "action": "updated", "task_id": task_id})
    return {"id": comment.id, "task_id": comment.task_id, "user_id": comment.user_id, "user_name": current_user.full_name, "content": comment.content, "created_at": comment.created_at, "updated_at": comment.updated_at}


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

    if not can_manage_task(
        current_user,
        task,
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have permission "
                "to delete this task"
            ),
        )

    delete_task(
        db,
        task,
    )

    return {
        "message": "Task deleted successfully"
    }