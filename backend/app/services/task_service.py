from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models.task import Subtask, Task, TaskSupporter, TaskActivity
from ..schemas.task import TaskCreate, TaskUpdate
from .notification_service import create_notification

# =========================================================
# CREATE TASK
# =========================================================

def create_task(
    db: Session,
    task_data: TaskCreate,
    creator_id: int,
) -> Task:

    task = Task(
        title=task_data.title,
        description=task_data.description,
        creator_id=creator_id,
        assignee_id=task_data.assignee_id,
        priority=task_data.priority,
        deadline=task_data.deadline,
        status="todo",
        progress=0,
    )

    for subtask_data in task_data.subtasks:
        task.subtasks.append(
            Subtask(
                title=subtask_data.title,
            )
        )

    db.add(task)
    db.commit()
    db.refresh(task)

    #    # -----------------------------------------------------
    # NOTIFICATION - TASK ASSIGNED
    # -----------------------------------------------------

    if (
        task.assignee_id is not None
        and task.assignee_id != creator_id
    ):
        create_notification(
            db=db,
            user_id=task.assignee_id,
            task_id=task.id,
            type="task_assigned",
            title="Task mới được giao",
            message=(
                f'Bạn được giao task "{task.title}"'
            ),
        )

    return task

# =========================================================
# GET SINGLE TASK
# =========================================================

def get_task(
    db: Session,
    task_id: int,
) -> Task | None:

    return db.get(
        Task,
        task_id,
    )


# =========================================================
# GET TASKS
# =========================================================

def get_tasks(
    db: Session,
    current_user=None,
    mine: bool = False,
) -> list[Task]:

    statement = select(Task)


    # -----------------------------------------------------
    # MY TASKS
    #
    # Một task được xem là "Việc của tôi" nếu:
    #
    # 1. User là người phụ trách chính
    # OR
    # 2. User là người hỗ trợ
    # -----------------------------------------------------

    if mine:

        statement = statement.where(

            or_(

                Task.assignee_id
                == current_user.id,

                Task.supporter_links.any(
                    TaskSupporter.user_id
                    == current_user.id
                ),

            )

        )


    statement = statement.order_by(
        Task.created_at.desc()
    )


    return list(
        db.scalars(statement).all()
    )


# =========================================================
# UPDATE TASK
# =========================================================

def update_task(
    db: Session,
    task: Task,
    task_data: TaskUpdate,
) -> Task:

    update_data = task_data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # SAVE OLD ASSIGNEE
    # -----------------------------------------------------

    old_assignee_id = task.assignee_id

    # -----------------------------------------------------
    # UPDATE TASK
    # -----------------------------------------------------

    for field, value in update_data.items():
        setattr(
            task,
            field,
            value,
        )

    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    # -----------------------------------------------------
    # NOTIFICATION - ASSIGNEE CHANGED
    # -----------------------------------------------------

    new_assignee_id = task.assignee_id

    if new_assignee_id != old_assignee_id:

        # ---------------------------------------------
        # NEW ASSIGNEE
        # ---------------------------------------------

        if new_assignee_id is not None:

            create_notification(
                db=db,
                user_id=new_assignee_id,
                task_id=task.id,
                type="task_assigned",
                title="Task mới được giao",
                message=(
                    f'Bạn được giao task "{task.title}"'
                ),
            )

        # ---------------------------------------------
        # OLD ASSIGNEE
        # ---------------------------------------------

        if old_assignee_id is not None:

            create_notification(
                db=db,
                user_id=old_assignee_id,
                task_id=task.id,
                type="task_unassigned",
                title="Bạn không còn phụ trách task",
                message=(
                    f'Bạn không còn phụ trách task '
                    f'"{task.title}"'
                ),
            )

    return task


# =========================================================
# DELETE TASK
# =========================================================

def delete_task(
    db: Session,
    task: Task,
) -> None:

    db.delete(task)

    db.commit()


# =========================================================
# UPDATE SUBTASK
# =========================================================

def update_subtask(
    db: Session,
    subtask: Subtask,
    completed: bool,
    user_id: int,
) -> Subtask:

    # -----------------------------------------------------
    # UPDATE SUBTASK STATUS
    # -----------------------------------------------------

    subtask.completed = completed

    if completed:
        subtask.completed_at = datetime.utcnow()
        action = "completed"
    else:
        subtask.completed_at = None
        action = "uncompleted"

    # -----------------------------------------------------
    # CREATE ACTIVITY LOG
    # -----------------------------------------------------

    activity = TaskActivity(
        task_id=subtask.task_id,
        user_id=user_id,
        subtask_id=subtask.id,
        action=action,
    )

    db.add(activity)

    # -----------------------------------------------------
    # SAVE SUBTASK + ACTIVITY
    # -----------------------------------------------------

    db.commit()
    db.refresh(subtask)

    # -----------------------------------------------------
    # GET TASK
    # -----------------------------------------------------

    task = db.get(
        Task,
        subtask.task_id,
    )

    if task is None:
        return subtask

    # -----------------------------------------------------
    # NOTIFICATION - SUBTASK
    # -----------------------------------------------------

    recipient_ids = set()

    # Creator
    if task.creator_id is not None:
        recipient_ids.add(
            task.creator_id
        )

    # Assignee
    if task.assignee_id is not None:
        recipient_ids.add(
            task.assignee_id
        )

    # Supporters
    for supporter in task.supporter_links:

        recipient_ids.add(
            supporter.user_id
        )

    # Không gửi cho chính người vừa thao tác
    recipient_ids.discard(user_id)

    # -----------------------------------------------------
    # NOTIFICATION MESSAGE
    # -----------------------------------------------------

    if completed:

        notification_type = "subtask_completed"
        notification_title = "Subtask đã hoàn thành"
        notification_message = (
            f'Subtask "{subtask.title}" '
            f'trong task "{task.title}" đã được hoàn thành'
        )

    else:

        notification_type = "subtask_uncompleted"
        notification_title = "Subtask đã bỏ hoàn thành"
        notification_message = (
            f'Subtask "{subtask.title}" '
            f'trong task "{task.title}" đã được bỏ hoàn thành'
        )

    # -----------------------------------------------------
    # CREATE NOTIFICATIONS
    # -----------------------------------------------------

    for recipient_id in recipient_ids:

        create_notification(
            db=db,
            user_id=recipient_id,
            task_id=task.id,
            type=notification_type,
            title=notification_title,
            message=notification_message,
        )

    return subtask


# =========================================================
# RECALCULATE TASK PROGRESS
# =========================================================

def recalculate_task_progress(
    db: Session,
    task: Task,
) -> Task:

    # -----------------------------------------------------
    # SAVE OLD STATUS
    # -----------------------------------------------------

    old_status = task.status

    total_subtasks = len(
        task.subtasks
    )

    completed_subtasks = sum(
        1
        for subtask in task.subtasks
        if subtask.completed
    )

    # -----------------------------------------------------
    # PROGRESS
    # -----------------------------------------------------

    if total_subtasks == 0:

        task.progress = 0

    else:

        task.progress = round(
            (
                completed_subtasks
                / total_subtasks
            )
            * 100
        )

    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    if total_subtasks > 0:

        if completed_subtasks == total_subtasks:

            task.status = "completed"

        elif completed_subtasks > 0:

            task.status = "in_progress"

        else:

            task.status = "todo"

    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    # -----------------------------------------------------
    # NOTIFICATION - TASK COMPLETED
    # -----------------------------------------------------

    if (
        old_status != "completed"
        and task.status == "completed"
    ):

        recipient_ids = set()

        # Creator
        if task.creator_id is not None:
            recipient_ids.add(
                task.creator_id
            )

        # Assignee
        if task.assignee_id is not None:
            recipient_ids.add(
                task.assignee_id
            )

        # Supporters
        for supporter in task.supporter_links:

            recipient_ids.add(
                supporter.user_id
            )

        for user_id in recipient_ids:

            create_notification(
                db=db,
                user_id=user_id,
                task_id=task.id,
                type="task_completed",
                title="Task đã hoàn thành",
                message=(
                    f'Task "{task.title}" đã hoàn thành'
                ),
            )

    return task


    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    if total_subtasks > 0:

        if (
            completed_subtasks
            == total_subtasks
        ):

            task.status = "completed"


        elif completed_subtasks > 0:

            task.status = "in_progress"


        else:

            task.status = "todo"


    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return task