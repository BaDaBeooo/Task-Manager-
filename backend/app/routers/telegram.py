from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..routers.auth import get_current_user
from ..schemas.telegram import (
    TelegramAdminUserResponse,
    TelegramChatIdUpdate,
    TelegramLinkResponse,
    TelegramStatusResponse,
    TelegramTestResponse,
)
from ..services.telegram_service import (
    create_link_code,
    get_bot_info,
    get_group_chat_id,
    is_configured,
    is_group_configured,
    send_message,
    send_notification_to_group,
    list_telegram_users,
    create_admin_telegram_link,
    unlink_telegram_user,
)


router = APIRouter(prefix="/telegram", tags=["Telegram"])


def _status(current_user):
    configured = is_configured()
    bot_username = None
    if configured:
        try:
            bot_username = get_bot_info().get("username")
        except Exception:
            bot_username = None

    return configured, bot_username


@router.get("/status", response_model=TelegramStatusResponse)
def get_telegram_status(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    configured, bot_username = _status(current_user)
    return TelegramStatusResponse(
        configured=configured,
        connected=bool(current_user.telegram_chat_id),
        bot_username=bot_username,
        chat_id=current_user.telegram_chat_id,
        group_configured=is_group_configured(),
    )


@router.post("/me/link", response_model=TelegramLinkResponse)
def create_my_telegram_link(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not is_configured():
        raise HTTPException(status_code=503, detail="Telegram Bot chưa được cấu hình trên server.")

    try:
        _, url, _ = create_link_code(db, current_user)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể tạo liên kết Telegram: {exc}") from exc

    return TelegramLinkResponse(
        success=True,
        url=url,
        expires_in=600,
        message="Liên kết có hiệu lực trong 10 phút. Mở liên kết bằng Telegram rồi bấm Start.",
    )


@router.put("/me/chat-id", response_model=TelegramStatusResponse)
def update_my_telegram_chat_id(
    data: TelegramChatIdUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not is_configured():
        raise HTTPException(status_code=503, detail="Telegram Bot chưa được cấu hình trên server.")

    chat_id = data.chat_id.strip()
    if not chat_id:
        raise HTTPException(status_code=400, detail="Chat ID không được để trống.")

    # Prevent the same Telegram private chat from being linked to multiple accounts.
    db.query(type(current_user)).filter(
        type(current_user).telegram_chat_id == chat_id,
        type(current_user).id != current_user.id,
    ).update({type(current_user).telegram_chat_id: None}, synchronize_session=False)

    current_user.telegram_chat_id = chat_id
    current_user.telegram_link_code = None
    current_user.telegram_link_code_expires_at = None
    db.commit()
    db.refresh(current_user)
    return get_telegram_status(current_user=current_user, db=db)


@router.delete("/me/chat-id", response_model=TelegramStatusResponse)
def remove_my_telegram_chat_id(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.telegram_chat_id = None
    current_user.telegram_link_code = None
    current_user.telegram_link_code_expires_at = None
    db.commit()
    db.refresh(current_user)
    return get_telegram_status(current_user=current_user, db=db)


@router.post("/me/test", response_model=TelegramTestResponse)
def send_telegram_test(current_user=Depends(get_current_user)):
    if not is_configured():
        raise HTTPException(status_code=503, detail="Telegram Bot chưa được cấu hình trên server.")
    if not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Bạn chưa cấu hình Telegram Chat ID.")

    try:
        send_message(current_user.telegram_chat_id, "✅ Task Manager đã kết nối Telegram thành công.")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể gửi tin nhắn Telegram: {exc}") from exc

    return TelegramTestResponse(success=True, message="Đã gửi tin nhắn kiểm tra đến Telegram.")



def _require_admin(current_user):
    role = getattr(current_user, "role", None)
    role_code = getattr(role, "code", role)
    if str(role_code).lower() != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin được quản lý liên kết Telegram.")


@router.get("/admin/users", response_model=list[TelegramAdminUserResponse])
def list_admin_telegram_users(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    return list_telegram_users(db)


@router.post("/admin/users/{user_id}/link", response_model=TelegramLinkResponse)
def create_admin_user_telegram_link(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.query(type(current_user)).filter(type(current_user).id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if not is_configured():
        raise HTTPException(status_code=503, detail="Telegram Bot chưa được cấu hình trên server.")
    try:
        _, url, _ = create_admin_telegram_link(db, user)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể tạo liên kết Telegram: {exc}") from exc
    return TelegramLinkResponse(
        success=True,
        url=url,
        expires_in=600,
        message=f"Đã tạo liên kết Telegram cho {user.full_name or user.username}.",
    )


@router.delete("/admin/users/{user_id}/chat-id")
def unlink_admin_telegram_user(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    user = db.query(type(current_user)).filter(type(current_user).id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    unlink_telegram_user(db, user)
    return {"success": True, "message": "Đã xóa liên kết Telegram của người dùng."}


@router.post("/group/test")
def send_telegram_group_test(current_user=Depends(get_current_user)):
    role = getattr(current_user, "role", None)
    role_code = getattr(role, "code", role)
    if str(role_code).lower() != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin được kiểm tra Telegram Group.")
    if not is_configured():
        raise HTTPException(status_code=503, detail="Telegram Bot chưa được cấu hình trên server.")

    group_chat_id = get_group_chat_id()
    if not group_chat_id:
        raise HTTPException(status_code=400, detail="Chưa cấu hình TELEGRAM_GROUP_CHAT_ID trên server.")

    try:
        send_notification_to_group(
            title="Test Telegram Group",
            message="✅ Task Manager đã kết nối Telegram Group thành công.",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể gửi tin nhắn đến Group: {exc}") from exc

    return {"success": True, "message": "Đã gửi tin nhắn kiểm tra đến Telegram Group.", "chat_id": group_chat_id}
