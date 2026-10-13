from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models.user import User
from ..models.task import (
    Subtask,
    Task,
    TaskActivity,
    TaskSupporter,
)
from ..schemas.task import TaskCreate, TaskUpdate
from .notification_service import create_notification
from .telegram_service import send_notification_to_group
from .realtime_service import realtime_manager


# Hiển thị trạng thái bằng tiếng Việt trong notification
def display_status(status: str | None) -> str:
    labels = {
        "todo": "chưa làm",
        "in_progress": "đang làm",
        "completed": "đã hoàn thành",
    }
    return labels.get(status, status or "")


# =========================================================
# CREATE TASK
# =========================================================

def create_task(
    db: Session,
    task_data: TaskCreate,
    creator_id: int,
) -> Task:

    if task_data.assignee_id is not None:
        assignee = db.get(User, task_data.assignee_id)
        if not assignee or not assignee.is_active or assignee.deleted_at is not None:
            raise ValueError("Không thể giao công việc cho tài khoản đã khóa hoặc đã xóa.")

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
        task.subtasks.append(Subtask(title=subtask_data.title))

    db.add(task)
    db.commit()
    db.refresh(task)

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "created",
        "task_id": task.id,
    })

    activity = TaskActivity(task_id=task.id, user_id=creator_id, action="task_created")
    db.add(activity)
    db.commit()

    creator = db.get(User, creator_id)
    assignee = db.get(User, task.assignee_id) if task.assignee_id else None
    creator_name = creator.full_name if creator else str(creator_id)
    supporter_name = assignee.full_name if assignee else "Chưa phân công"
    deadline_text = task.deadline.strftime("%d/%m/%Y") if task.deadline else "Không có"

    # Shared Telegram group: ONLY task creation.
    try:
        send_notification_to_group(
            title="Task mới được tạo",
            message=(
                f'Task: "{task.title}"'
                f"\nNgười tạo: {creator_name}"
                f"\nNgười hỗ trợ: {supporter_name}"
                f"\nƯu tiên: {task.priority}"
                f"\nDeadline: {deadline_text}"
            ),
        )
    except Exception as error:
        print(f"[Telegram Group Notification] Task created: {error}")

    # Individual Telegram + web notification for the assignee.
    if task.assignee_id is not None and task.assignee_id != creator_id:
        create_notification(
            db=db,
            user_id=task.assignee_id,
            task_id=task.id,
            type="task_assigned",
            title="Task mới được giao",
            message=(
                f'Bạn được giao task "{task.title}"'
                f"\nNgười tạo: {creator.full_name if creator else creator_id}"
                f"\nDeadline: {deadline_text}"
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
    user_id: int,
) -> Task:

    update_data = task_data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # SAVE OLD VALUES
    # -----------------------------------------------------

    old_assignee_id = task.assignee_id
    old_status = task.status
    old_priority = task.priority
    old_deadline = task.deadline

    # -----------------------------------------------------
    # VALIDATE ASSIGNEE
    # -----------------------------------------------------

    if "assignee_id" in update_data and update_data["assignee_id"] is not None:
        assignee = db.get(User, update_data["assignee_id"])
        if not assignee or not assignee.is_active or assignee.deleted_at is not None:
            raise ValueError("Không thể giao công việc cho tài khoản đã khóa hoặc đã xóa.")

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
    # NEW VALUES
    # -----------------------------------------------------

    new_assignee_id = task.assignee_id
    new_status = task.status
    new_priority = task.priority
    new_deadline = task.deadline

    # =====================================================
    # ACTIVITY - ASSIGNEE CHANGED
    # =====================================================

    if new_assignee_id != old_assignee_id:

        if (
            old_assignee_id is None
            and new_assignee_id is not None
        ):

            action = "assigned"

        elif (
            old_assignee_id is not None
            and new_assignee_id is None
        ):

            action = "unassigned"

        else:

            action = "reassigned"

        activity = TaskActivity(
            task_id=task.id,
            user_id=user_id,
            action=action,
        )

        db.add(activity)

    # =====================================================
    # ACTIVITY - STATUS CHANGED
    # =====================================================

    if new_status != old_status:

        activity = TaskActivity(
            task_id=task.id,
            user_id=user_id,
            action="status_changed",
        )

        db.add(activity)

    # =====================================================
    # ACTIVITY - PRIORITY CHANGED
    # =====================================================

    if new_priority != old_priority:

        activity = TaskActivity(
            task_id=task.id,
            user_id=user_id,
            action="priority_changed",
        )

        db.add(activity)

    # =====================================================
    # ACTIVITY - DEADLINE CHANGED
    # =====================================================

    if new_deadline != old_deadline:

        activity = TaskActivity(
            task_id=task.id,
            user_id=user_id,
            action="deadline_changed",
        )

        db.add(activity)

    # -----------------------------------------------------
    # SAVE ACTIVITY LOGS
    # -----------------------------------------------------

    db.commit()

    # =====================================================
    # NOTIFICATION RECIPIENTS
    # =====================================================

    recipient_ids = set()

    if task.creator_id is not None:

        recipient_ids.add(
            task.creator_id
        )

    if task.assignee_id is not None:

        recipient_ids.add(
            task.assignee_id
        )

    for supporter in task.supporter_links:

        recipient_ids.add(
            supporter.user_id
        )

    # Không gửi notification cho chính người thao tác
    recipient_ids.discard(user_id)

    # =====================================================
    # NOTIFICATION - ASSIGNEE CHANGED
    # =====================================================

    if new_assignee_id != old_assignee_id:

        # -------------------------------------------------
        # NEW ASSIGNEE
        # -------------------------------------------------

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

        # -------------------------------------------------
        # OLD ASSIGNEE
        # -------------------------------------------------

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

    # =====================================================
    # NOTIFICATION - STATUS CHANGED
    # =====================================================

    if new_status != old_status:

        for recipient_id in recipient_ids:

            create_notification(
                db=db,
                user_id=recipient_id,
                task_id=task.id,
                type="task_status_changed",
                title="Trạng thái task đã thay đổi",
                message=(
                    f'Trạng thái task "{task.title}" '
                    f'đã thay đổi từ '
                    f'"{display_status(old_status)}" sang "{display_status(new_status)}"'
                ),
            )

    # =====================================================
    # NOTIFICATION - PRIORITY CHANGED
    # =====================================================

    if new_priority != old_priority:

        for recipient_id in recipient_ids:

            create_notification(
                db=db,
                user_id=recipient_id,
                task_id=task.id,
                type="task_priority_changed",
                title="Ưu tiên task đã thay đổi",
                message=(
                    f'Ưu tiên task "{task.title}" '
                    f'đã được thay đổi'
                ),
            )

    # =====================================================
    # NOTIFICATION - DEADLINE CHANGED
    # =====================================================

    if new_deadline != old_deadline:

        for recipient_id in recipient_ids:

            if new_deadline is None:

                deadline_text = (
                    "đã được bỏ"
                )

            else:

                deadline_text = (
                    new_deadline.strftime(
                        "%d/%m/%Y"
                    )
                )

            create_notification(
                db=db,
                user_id=recipient_id,
                task_id=task.id,
                type="task_deadline_changed",
                title="Deadline task đã thay đổi",
                message=(
                    f'Deadline task "{task.title}" '
                    f'đã thay đổi thành '
                    f'{deadline_text}'
                ),
            )

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "updated",
        "task_id": task.id,
    })

    return task


# =========================================================
# DELETE TASK
# =========================================================

def delete_task(
    db: Session,
    task: Task,
) -> None:

    task_id = task.id
    db.delete(task)

    db.commit()

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "deleted",
        "task_id": task_id,
    })


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
    # SAVE
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
    # NOTIFICATION RECIPIENTS
    # -----------------------------------------------------

    recipient_ids = set()

    if task.creator_id is not None:

        recipient_ids.add(
            task.creator_id
        )

    if task.assignee_id is not None:

        recipient_ids.add(
            task.assignee_id
        )

    for supporter in task.supporter_links:

        recipient_ids.add(
            supporter.user_id
        )

    # Không gửi notification cho chính người thao tác
    recipient_ids.discard(user_id)

    # -----------------------------------------------------
    # NOTIFICATION MESSAGE
    # -----------------------------------------------------

    if completed:

        notification_type = (
            "subtask_completed"
        )

        notification_title = (
            "Việc cần làm đã hoàn thành"
        )

        notification_message = (
            f'Việc cần làm "{subtask.title}" '
            f'trong task "{task.title}" '
            f'đã được hoàn thành'
        )

    else:

        notification_type = (
            "subtask_uncompleted"
        )

        notification_title = (
            "Việc cần làm chưa hoàn thành"
        )

        notification_message = (
            f'Việc cần làm "{subtask.title}" '
            f'trong task "{task.title}" '
            f'đã được bỏ hoàn thành'
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

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "updated",
        "task_id": task.id,
    })

    return subtask


# =========================================================
# RECALCULATE TASK PROGRESS
# =========================================================

def recalculate_task_progress(
    db: Session,
    task: Task,
    user_id: int | None = None,
) -> Task:

    # -----------------------------------------------------
    # SAVE OLD STATUS
    # -----------------------------------------------------

    old_status = task.status

    # -----------------------------------------------------
    # CALCULATE PROGRESS
    # -----------------------------------------------------

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
    # AUTO STATUS
    # -----------------------------------------------------

    if total_subtasks > 0:

        if completed_subtasks == total_subtasks:

            task.status = "completed"

        elif completed_subtasks > 0:

            task.status = "in_progress"

        else:

            task.status = "todo"

    # -----------------------------------------------------
    # SAVE TASK
    # -----------------------------------------------------

    task.updated_at = datetime.utcnow()

    db.commit()

    db.refresh(task)

    # =====================================================
    # ACTIVITY - AUTO STATUS CHANGED
    # =====================================================

    if (
        user_id is not None
        and task.status != old_status
    ):

        activity = TaskActivity(
            task_id=task.id,
            user_id=user_id,
            action="status_changed",
        )

        db.add(activity)

        db.commit()

    # =====================================================
    # NOTIFICATION - AUTO STATUS CHANGED
    # =====================================================

    if (
        user_id is not None
        and task.status != old_status
    ):

        recipient_ids = set()

        if task.creator_id is not None:

            recipient_ids.add(
                task.creator_id
            )

        if task.assignee_id is not None:

            recipient_ids.add(
                task.assignee_id
            )

        for supporter in task.supporter_links:

            recipient_ids.add(
                supporter.user_id
            )

        recipient_ids.discard(user_id)

        # -------------------------------------------------
        # TASK COMPLETED
        # -------------------------------------------------

        if task.status == "completed":

            notification_type = (
                "task_completed"
            )

            notification_title = (
                "Task đã hoàn thành"
            )

            notification_message = (
                f'Task "{task.title}" đã hoàn thành'
            )

        # -------------------------------------------------
        # OTHER AUTO STATUS CHANGE
        # -------------------------------------------------

        else:

            notification_type = (
                "task_status_changed"
            )

            notification_title = (
                "Trạng thái task đã thay đổi"
            )

            notification_message = (
                f'Trạng thái task "{task.title}" '
                f'đã thay đổi từ '
                f'"{display_status(old_status)}" sang '
                f'"{display_status(task.status)}"'
            )

        for recipient_id in recipient_ids:

            create_notification(
                db=db,
                user_id=recipient_id,
                task_id=task.id,
                type=notification_type,
                title=notification_title,
                message=notification_message,
            )

    realtime_manager.publish_all({
        "type": "data_changed",
        "entity": "task",
        "action": "updated",
        "task_id": task.id,
    })

    return task