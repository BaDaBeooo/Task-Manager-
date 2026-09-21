from sqlalchemy.orm import Session

from ..models.notification import Notification
from ..models.user import User
from .telegram_service import send_notification_to_user


def create_notification(
    db: Session,
    user_id: int,
    task_id: int | None,
    type: str,
    title: str,
    message: str,
    send_telegram: bool = True,
) -> Notification:
    """Create a web notification and optionally send it privately on Telegram.

    This function NEVER sends to the shared Telegram group. Group messages are
    explicit event notifications only (currently task/support creation).
    """
    notification = Notification(
        user_id=user_id,
        task_id=task_id,
        type=type,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    if send_telegram:
        try:
            user = db.get(User, user_id)
            if user and user.telegram_chat_id:
                send_notification_to_user(user, title, message)
        except Exception as exc:
            print(f"[Telegram Private Notification] user={user_id}: {exc}")

    return notification
