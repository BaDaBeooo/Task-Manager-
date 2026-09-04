from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.security import hash_password
from ..database.connection import get_db
from ..models.role import Role
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.user import (
    AdminResetPasswordRequest,
    UserCreate,
    UserResponse,
    UserRoleUpdate,
)
from ..services.user_service import (
    create_user,
    get_user_by_username,
)


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

    if current_user.role.code != "admin":

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
        role=(
            user.role.name
            if user.role
            else "Chưa phân loại"
        ),
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
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    users = (
        db.query(User)
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