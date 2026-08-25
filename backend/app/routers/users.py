from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.role import Role
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.user import (
    UserResponse,
    UserRoleUpdate,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


def require_admin(current_user):

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
# GET USERS
# =========================================================

@router.get(
    "",
    response_model=list[UserResponse],
)
def list_users(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    users = (
        db.query(User)
        .filter(
            User.is_active == True
        )
        .order_by(
            User.full_name.asc()
        )
        .all()
    )

    result = []

    for user in users:

        result.append(
            UserResponse(
                id=user.id,
                username=user.username,
                full_name=user.full_name,
                role=(
                    user.role.name
                    if user.role
                    else "Chưa phân loại"
                ),
                is_active=user.is_active,
            )
        )

    return result


# =========================================================
# UPDATE USER ROLE
# =========================================================

@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
)
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    require_admin(current_user)


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
    )