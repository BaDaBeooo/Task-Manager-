import asyncio
import json
import os
from pathlib import Path
from urllib import error, request

from sqlalchemy.orm import Session

from ..database.connection import SessionLocal
from ..models.user import User


TELEGRAM_API_BASE = "https://api.telegram.org"
POLL_TIMEOUT = 20


def _load_local_env() -> None:
    """Load simple KEY=VALUE pairs from backend/.env."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
    except OSError as exc:
        print(f"[Telegram] Could not read .env: {exc}")


def get_bot_token() -> str | None:
    _load_local_env()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    return token or None


def get_group_chat_id() -> str | None:
    _load_local_env()
    chat_id = os.getenv("TELEGRAM_GROUP_CHAT_ID", "").strip()
    return chat_id or None


def is_configured() -> bool:
    return bool(get_bot_token())


def is_group_configured() -> bool:
    return bool(get_bot_token() and get_group_chat_id())


def _api_call(method: str, payload: dict, timeout: int = 10) -> dict:
    token = get_bot_token()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN chưa được cấu hình.")

    url = f"{TELEGRAM_API_BASE}/bot{token}/{method}"
    body = json.dumps(payload).encode("utf-8")
    http_request = request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram API HTTP {exc.code}: {detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Không kết nối được Telegram API: {exc.reason}") from exc

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Telegram API trả về dữ liệu không hợp lệ.") from exc

    if not data.get("ok"):
        raise RuntimeError(data.get("description") or "Telegram API request failed.")

    return data


def get_bot_info() -> dict:
    result = _api_call("getMe", {})
    return result.get("result") or {}


def send_message(chat_id: str, message: str) -> bool:
    if not chat_id:
        return False
    _api_call(
        "sendMessage",
        {
            "chat_id": str(chat_id),
            "text": message,
            "disable_web_page_preview": True,
        },
    )
    return True


def send_notification_to_user(user: User, title: str, message: str) -> bool:
    if not user.telegram_chat_id:
        return False
    return send_message(user.telegram_chat_id, f"🔔 {title}\n\n{message}")


def send_notification_to_group(title: str, message: str) -> bool:
    chat_id = get_group_chat_id()
    if not chat_id:
        return False
    return send_message(chat_id, f"🔔 {title}\n\n{message}")


def create_link_code(db: Session, user: User) -> tuple[str, str, str]:
    """Create a short-lived Telegram deep-link code for this user."""
    import secrets
    from datetime import datetime, timedelta

    code = secrets.token_urlsafe(18)
    user.telegram_link_code = code
    user.telegram_link_code_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    db.refresh(user)

    bot = get_bot_info()
    username = bot.get("username")
    if not username:
        raise RuntimeError("Không lấy được username của Telegram Bot.")

    deep_link = f"https://t.me/{username}?start={code}"
    return code, deep_link, username


def _handle_start_update(update: dict) -> None:
    message = update.get("message") or {}
    chat = message.get("chat") or {}
    from_user = message.get("from") or {}
    text = (message.get("text") or "").strip()
    chat_id = str(chat.get("id")) if chat.get("id") is not None else ""
    chat_type = chat.get("type")

    # Auto-linking is intentionally limited to private chats. Never let a
    # normal group message trigger a bot reply in the group.
    if not chat_id or chat_type != "private":
        return

    if not text.startswith("/start"):
        # Helpful response for the first contact even without a deep link.
        send_message(
            chat_id,
            "👋 Xin chào! Tôi là Miraway Task Manager Bot.\n\n"
            f"Chat ID của bạn: {chat_id}\n\n"
            "Để tự động liên kết với tài khoản Task Manager, "
            "hãy mở nút Liên kết Telegram trong phần Cài đặt của Task Manager.\n\n"
            "⚠️ Không cần gửi mật khẩu hoặc thông tin đăng nhập cho bot.",
        )
        return

    parts = text.split(maxsplit=1)
    code = parts[1].strip() if len(parts) == 2 else ""

    db = SessionLocal()
    try:
        if not code:
            send_message(
                chat_id,
                "👋 Task Manager Bot đã sẵn sàng.\n\n"
                f"Chat ID của bạn: {chat_id}\n\n"
                "Để tự động liên kết, hãy tạo liên kết Telegram "
                "trong Task Manager rồi bấm Start từ liên kết đó.",
            )
            return

        user = (
            db.query(User)
            .filter(User.telegram_link_code == code)
            .first()
        )

        if not user:
            send_message(
                chat_id,
                "❌ Mã liên kết không hợp lệ hoặc đã được sử dụng.\n\n"
                f"Chat ID của bạn: {chat_id}\n"
                "Hãy tạo một liên kết Telegram mới trong Task Manager.",
            )
            return

        from datetime import datetime
        if (
            user.telegram_link_code_expires_at
            and user.telegram_link_code_expires_at < datetime.utcnow()
        ):
            user.telegram_link_code = None
            user.telegram_link_code_expires_at = None
            db.commit()
            send_message(
                chat_id,
                "⏰ Mã liên kết đã hết hạn.\n\n"
                f"Chat ID của bạn: {chat_id}\n"
                "Hãy tạo liên kết Telegram mới trong Task Manager.",
            )
            return

        # One Chat ID can only belong to one Task Manager account.
        db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.id != user.id,
        ).update(
            {
                User.telegram_chat_id: None,
            },
            synchronize_session=False,
        )

        user.telegram_chat_id = chat_id
        user.telegram_link_code = None
        user.telegram_link_code_expires_at = None
        db.commit()

        display_name = user.full_name or user.username
        telegram_username = from_user.get("username")
        extra = f"\nTelegram: @{telegram_username}" if telegram_username else ""

        send_message(
            chat_id,
            "✅ Liên kết Telegram thành công!\n\n"
            f"Tài khoản Task Manager: {display_name}\n"
            f"Username: {user.username}\n"
            f"Chat ID: {chat_id}"
            f"{extra}\n\n"
            "Từ bây giờ bạn sẽ nhận được các thông báo riêng từ Task Manager.",
        )

        print(f"[Telegram] Linked chat {chat_id} -> user {user.username} ({user.id})")
    except Exception as exc:
        db.rollback()
        print(f"[Telegram Poller] Error handling update: {exc}")
    finally:
        db.close()


async def telegram_poller() -> None:
    """Long-poll Telegram so a local/on-premise Task Manager needs no public webhook."""
    offset = None
    print("[Telegram Poller] Started")

    while True:
        if not is_configured():
            await asyncio.sleep(10)
            continue

        try:
            payload = {"timeout": POLL_TIMEOUT, "allowed_updates": ["message"]}
            if offset is not None:
                payload["offset"] = offset

            result = await asyncio.to_thread(
                _api_call,
                "getUpdates",
                payload,
                POLL_TIMEOUT + 10,
            )

            for update in result.get("result") or []:
                offset = int(update["update_id"]) + 1
                await asyncio.to_thread(_handle_start_update, update)

        except asyncio.CancelledError:
            print("[Telegram Poller] Stopped")
            raise
        except Exception as exc:
            print(f"[Telegram Poller] Error: {exc}")
            await asyncio.sleep(5)


def list_telegram_users(db: Session) -> list[dict]:
    """Return users with Telegram connection state for Admin management."""
    users = (
        db.query(User)
        .order_by(User.full_name.asc(), User.username.asc())
        .all()
    )
    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "is_active": bool(user.is_active),
            "connected": bool(user.telegram_chat_id),
            "chat_id": user.telegram_chat_id,
            "link_url": None,
            "link_expires_in": None,
        }
        for user in users
    ]


def create_admin_telegram_link(db: Session, user: User) -> tuple[str, str, str]:
    """Create a Telegram deep link for a selected user, same flow as self-link."""
    return create_link_code(db, user)


def unlink_telegram_user(db: Session, user: User) -> None:
    user.telegram_chat_id = None
    user.telegram_link_code = None
    user.telegram_link_code_expires_at = None
    db.commit()
