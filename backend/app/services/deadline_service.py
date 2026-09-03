from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..models.task import Task
from ..models.notification import Notification
from .notification_service import create_notification


def check_task_deadlines(db: Session) -> None:
    now = datetime.utcnow()
    warning_time = now + timedelta(hours=24)

    tasks = db.query(Task).filter(
        Task.deadline.isnot(None)
    ).all()

    for task in tasks:

        # -------------------------------------------------
        # TASK ĐÃ HOÀN THÀNH → KHÔNG BÁO DEADLINE
        # -------------------------------------------------

        if task.status == "completed":
            continue

        # -------------------------------------------------
        # RECIPIENTS
        # Creator + Assignee + Supporters
        # -------------------------------------------------

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

        if not recipient_ids:
            continue

        # -------------------------------------------------
        # DEADLINE - OVERDUE
        # -------------------------------------------------

        if task.deadline < now:

            notification_type = "task_overdue"

            notification_title = (
                "Task đã quá hạn"
            )

            notification_message = (
                f'Task "{task.title}" đã quá deadline'
            )

        # -------------------------------------------------
        # DEADLINE - WITHIN 24 HOURS
        # -------------------------------------------------

        elif task.deadline <= warning_time:

            notification_type = (
                "task_deadline_soon"
            )

            notification_title = (
                "Task sắp đến hạn"
            )

            notification_message = (
                f'Task "{task.title}" '
                f'sẽ đến hạn trong vòng 24 giờ'
            )

        else:
            continue

        # -------------------------------------------------
        # CREATE NOTIFICATION
        # Mỗi user / task / loại notification chỉ 1 lần
        # -------------------------------------------------

        for user_id in recipient_ids:

            existing = db.query(
                Notification
            ).filter(
                Notification.user_id == user_id,
                Notification.task_id == task.id,
                Notification.type == notification_type,
            ).first()

            if existing:
                continue

            create_notification(
                db=db,
                user_id=user_id,
                task_id=task.id,
                type=notification_type,
                title=notification_title,
                message=notification_message,
            )