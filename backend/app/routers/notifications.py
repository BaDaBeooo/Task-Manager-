from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.notification import Notification
from ..routers.auth import get_current_user
from ..schemas.notification import NotificationResponse


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# =========================================================
# GET MY NOTIFICATIONS
# =========================================================

@router.get(
    "",
    response_model=list[NotificationResponse],
)
def get_my_notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id
            == current_user.id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .all()
    )

    return notifications


# =========================================================
# MARK AS READ
# =========================================================

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_as_read(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.id
            == notification_id,
            Notification.user_id
            == current_user.id,
        )
        .first()
    )

    if notification is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification