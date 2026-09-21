from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from ..database.connection import get_db
from ..schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)
from ..services.permissions import permissions_for, role_code, role_name
from ..services.user_service import (
    create_user,
    get_user_by_id,
    get_user_by_username,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

security = HTTPBearer()


# =========================================================
# USER RESPONSE HELPER
# =========================================================

def build_user_response(user):

    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        position=user.position,
        role=role_name(user),
        role_code=role_code(user),
        permissions=permissions_for(user),
        is_active=user.is_active,
        must_change_password=user.must_change_password,
    )


# =========================================================
# CURRENT USER
#
# User bắt buộc đổi password sẽ bị chặn khỏi các API
# nghiệp vụ.
# =========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
    db: Session = Depends(get_db),
):

    payload = decode_access_token(
        credentials.credentials
    )

    user_id = payload.get("sub")

    if not user_id:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = get_user_by_id(
        db,
        int(user_id),
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if user.must_change_password:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password change required",
        )

    return user


# =========================================================
# CURRENT USER - ALLOW PASSWORD CHANGE
#
# Dependency riêng cho /change-password.
# =========================================================

def get_current_user_for_password_change(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
    db: Session = Depends(get_db),
):

    payload = decode_access_token(
        credentials.credentials
    )

    user_id = payload.get("sub")

    if not user_id:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = get_user_by_id(
        db,
        int(user_id),
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


# =========================================================
# REGISTER
#
# Giữ endpoint để tương thích API cũ nhưng không cho
# đăng ký tự do nữa.
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
)
def register(
    user_data: UserCreate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    if (
        role_code(current_user) != "admin"
    ):

        raise HTTPException(
            status_code=403,
            detail="Admin permission required",
        )

    existing_user = get_user_by_username(
        db,
        user_data.username,
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    try:

        user = create_user(
            db,
            user_data,
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
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):

    user = get_user_by_username(
        db,
        login_data.username,
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not verify_password(
        login_data.password,
        user.password_hash,
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = create_access_token(
        user_id=user.id,
        role=(
            user.role.code
            if user.role
            else None
        ),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "must_change_password": (
            user.must_change_password
        ),
    }


# =========================================================
# CHANGE PASSWORD
# =========================================================

@router.post(
    "/change-password",
)
def change_password(
    data: ChangePasswordRequest,
    current_user=Depends(
        get_current_user_for_password_change
    ),
    db: Session = Depends(get_db),
):

    if len(data.new_password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự.",
        )

    if (
        data.new_password
        != data.confirm_password
    ):

        raise HTTPException(
            status_code=400,
            detail="Xác nhận mật khẩu không khớp.",
        )

    if not verify_password(
        data.current_password,
        current_user.password_hash,
    ):

        raise HTTPException(
            status_code=400,
            detail="Mật khẩu hiện tại không đúng.",
        )

    if (
        data.current_password
        == data.new_password
    ):

        raise HTTPException(
            status_code=400,
            detail="Mật khẩu mới phải khác mật khẩu hiện tại.",
        )

    current_user.password_hash = (
        hash_password(
            data.new_password
        )
    )

    current_user.must_change_password = False

    db.commit()

    return {
        "message": "Đổi mật khẩu thành công.",
        "must_change_password": False,
    }


# =========================================================
# GET ME
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user=Depends(
        get_current_user
    ),
):

    return build_user_response(
        current_user
    )