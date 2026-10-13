from datetime import datetime
import base64
import binascii
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..core.security import hash_password
from ..database.connection import get_db
from ..models.role import Role
from ..models.user import User
from ..models.task import Task, TaskSupporter
from ..models.support import SupportTicket
from ..models.organization import Department, DepartmentMember, SupportTeam, SupportTeamMember
from ..routers.auth import get_current_user
from ..services.permissions import permissions_for, role_code, role_name
from ..schemas.user import (
    AdminResetPasswordRequest,
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserPositionUpdate,
)
from ..services.user_service import (
    create_user,
    get_user_by_username,
)

import secrets


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# =========================================================
# ADMIN CHECK
# =========================================================

def require_admin(
    current_user,
):

    if not current_user.role:

        raise HTTPException(
            status_code=403,
            detail="Admin permission required",
        )

    if role_code(current_user) != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin permission required",
        )


# =========================================================
# RESPONSE
# =========================================================

def build_user_response(
    user,
):

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        position=user.position,
        avatar_url=user.avatar_url,
        role=role_name(user),
        role_code=role_code(user),
        permissions=permissions_for(user),
        is_active=user.is_active,
        must_change_password=(
            user.must_change_password
        ),
    )


# =========================================================
# GET USERS
# =========================================================

@router.get(
    "",
    response_model=list[UserResponse],
)
def list_users(
    include_inactive: bool = Query(False),
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    if include_inactive:
        require_admin(current_user)

    query = db.query(User).filter(User.deleted_at.is_(None))

    if not include_inactive:
        query = query.filter(User.is_active == True)

    users = (
        query
        .order_by(
            User.is_active.desc(),
            User.full_name.asc(),
        )
        .all()
    )

    return [
        build_user_response(user)
        for user in users
    ]


# =========================================================
# CREATE USER
# =========================================================

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_user(
    data: UserCreate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    require_admin(
        current_user
    )

    username = data.username.strip()

    full_name = data.full_name.strip()
    position = (data.position or "").strip() or None

    if not username:

        raise HTTPException(
            status_code=400,
            detail="Username không được để trống.",
        )

    if not full_name:

        raise HTTPException(
            status_code=400,
            detail="Họ tên không được để trống.",
        )

    if len(data.password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Mật khẩu phải có ít nhất 6 ký tự.",
        )

    existing_user = get_user_by_username(
        db,
        username,
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Username đã tồn tại.",
        )

    role = db.get(
        Role,
        data.role_id,
    )

    if not role:

        raise HTTPException(
            status_code=404,
            detail="Role không tồn tại.",
        )

    if not role.is_active:

        raise HTTPException(
            status_code=400,
            detail="Role đã bị tắt.",
        )

    try:

        user = create_user(
            db,
            UserCreate(
                username=username,
                full_name=full_name,
                position=position,
                password=data.password,
                role_id=data.role_id,
            ),
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    return build_user_response(
        user
    )


# =========================================================
# UPDATE ROLE
# =========================================================

@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
)
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    require_admin(
        current_user
    )

    user = db.get(
        User,
        user_id,
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    role = db.get(
        Role,
        data.role_id,
    )

    if not role:

        raise HTTPException(
            status_code=404,
            detail="Role not found",
        )

    if not role.is_active:

        raise HTTPException(
            status_code=400,
            detail="Role is inactive",
        )

    user.role_id = role.id

    db.commit()

    db.refresh(user)

    return build_user_response(
        user
    )


# =========================================================
# UPDATE POSITION / CHỨC VỤ
# =========================================================

@router.put(
    "/{user_id}/position",
    response_model=UserResponse,
)
def update_user_position(
    user_id: int,
    data: UserPositionUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.position = (data.position or "").strip() or None
    db.commit()
    db.refresh(user)
    return build_user_response(user)


# =========================================================
# AVATAR UPLOAD / DELIVERY
# Frontend sends a cropped PNG data URL, so no multipart dependency
# or third-party image library is required.
# =========================================================

@router.put("/me/avatar")
def upload_my_avatar(
    data: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    avatar_data = data.get("avatar_data", "")
    if not isinstance(avatar_data, str) or not avatar_data.startswith("data:image/png;base64,"):
        raise HTTPException(status_code=400, detail="Ảnh avatar phải là PNG đã crop.")

    encoded = avatar_data.split(",", 1)[1]
    if len(encoded) > 4_000_000:
        raise HTTPException(status_code=413, detail="Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.")

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Dữ liệu ảnh không hợp lệ.")

    if len(image_bytes) > 2_500_000 or not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=400, detail="Ảnh PNG không hợp lệ hoặc vượt quá 2.5 MB.")

    avatar_dir = Path(__file__).resolve().parents[2] / "uploads" / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)
    target = avatar_dir / f"{current_user.id}.png"
    temp = avatar_dir / f"{current_user.id}.tmp"
    temp.write_bytes(image_bytes)
    temp.replace(target)

    current_user.avatar_url = f"/api/users/{current_user.id}/avatar?v={int(datetime.utcnow().timestamp())}"
    db.commit()
    db.refresh(current_user)
    return {"avatar_url": current_user.avatar_url}


@router.get("/{user_id}/avatar", include_in_schema=False)
def get_user_avatar(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user or not user.avatar_url:
        raise HTTPException(status_code=404, detail="Chưa có avatar.")

    target = Path(__file__).resolve().parents[2] / "uploads" / "avatars" / f"{user_id}.png"
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Không tìm thấy avatar.")
    return FileResponse(target, media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post(
    "/{user_id}/reset-password",
)
def reset_user_password(
    user_id: int,
    data: AdminResetPasswordRequest,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    require_admin(
        current_user
    )

    user = db.get(
        User,
        user_id,
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if len(data.new_password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Mật khẩu phải có ít nhất 6 ký tự.",
        )

    user.password_hash = hash_password(
        data.new_password
    )

    user.must_change_password = True

    db.commit()

    return {
        "message": (
            "Đã reset mật khẩu. "
            "User sẽ phải đổi mật khẩu khi đăng nhập."
        )
    }


# =========================================================
# LOCK USER
# =========================================================

@router.post(
    "/{user_id}/deactivate",
    response_model=UserResponse,
)
def deactivate_user(
    user_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    require_admin(
        current_user
    )

    if user_id == current_user.id:

        raise HTTPException(
            status_code=400,
            detail="Không thể khóa tài khoản đang đăng nhập.",
        )

    user = db.get(
        User,
        user_id,
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.is_active = False

    db.commit()

    db.refresh(user)

    return build_user_response(
        user
    )


# =========================================================
# UNLOCK USER
# =========================================================

@router.post(
    "/{user_id}/activate",
    response_model=UserResponse,
)
def activate_user(
    user_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    require_admin(
        current_user
    )

    user = db.get(
        User,
        user_id,
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.is_active = True

    db.commit()

    db.refresh(user)

    return build_user_response(
        user
    )

# =========================================================
# DELETE USER ACCOUNT
# =========================================================

@router.delete(
    "/{user_id}",
)
def delete_user_account(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)

    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa tài khoản đang đăng nhập.",
        )

    user = db.get(User, user_id)
    if not user or user.deleted_at is not None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if role_code(user) == "admin":
        raise HTTPException(
            status_code=400,
            detail="Không thể xóa tài khoản Admin.",
        )

    # Preserve historical task/ticket/announcement records while making
    # the account unusable and invisible to normal user pickers.
    user_id_value = user.id
    user.deleted_at = datetime.utcnow()
    user.is_active = False
    user.telegram_chat_id = None
    user.telegram_link_code = None
    user.telegram_link_code_expires_at = None
    user.must_change_password = False
    user.full_name = "Tài khoản đã xóa"
    user.position = None
    user.username = f"deleted_{user_id_value}_{secrets.token_hex(4)}"
    user.password_hash = hash_password(secrets.token_urlsafe(32))

    # Remove the account from assignment/support/member pickers without
    # destroying historical activity records.
    db.query(Task).filter(Task.assignee_id == user_id_value).update(
        {Task.assignee_id: None}, synchronize_session=False
    )
    db.query(TaskSupporter).filter(TaskSupporter.user_id == user_id_value).delete(
        synchronize_session=False
    )
    db.query(SupportTicket).filter(SupportTicket.assignee_id == user_id_value).update(
        {SupportTicket.assignee_id: None}, synchronize_session=False
    )
    db.query(SupportTeamMember).filter(SupportTeamMember.user_id == user_id_value).delete(
        synchronize_session=False
    )
    db.query(DepartmentMember).filter(DepartmentMember.user_id == user_id_value).delete(
        synchronize_session=False
    )
    db.query(SupportTeam).filter(SupportTeam.lead_id == user_id_value).update(
        {SupportTeam.lead_id: None}, synchronize_session=False
    )
    db.query(Department).filter(Department.manager_id == user_id_value).update(
        {Department.manager_id: None}, synchronize_session=False
    )

    db.commit()

    return {
        "message": "Tài khoản đã được xóa.",
        "user_id": user_id_value,
    }
