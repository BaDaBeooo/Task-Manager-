from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.role import Role
from ..routers.auth import get_current_user
from ..services.permissions import role_code
from ..schemas.role import (
    RoleCreate,
    RoleResponse,
    RoleUpdate,
)


router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
)


def require_admin(current_user):

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
# GET ROLES
# =========================================================

@router.get(
    "",
    response_model=list[RoleResponse],
)
def list_roles(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    roles = (
        db.query(Role)
        .filter(Role.is_active == True, Role.code.in_(["admin", "supervisor", "leader", "user"]))
        .order_by(
            Role.id.asc()
        )
        .all()
    )

    return roles


# =========================================================
# CREATE ROLE
# =========================================================

@router.post(
    "",
    response_model=RoleResponse,
)
def create_role(
    data: RoleCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    require_admin(current_user)
    raise HTTPException(status_code=400, detail="Hệ thống chỉ sử dụng 4 vai trò cố định: Admin, Supervisor, Leader, User.")


    existing_name = (
        db.query(Role)
        .filter(
            Role.name == data.name
        )
        .first()
    )

    if existing_name:
        raise HTTPException(
            status_code=400,
            detail="Role name already exists",
        )


    existing_code = (
        db.query(Role)
        .filter(
            Role.code == data.code
        )
        .first()
    )

    if existing_code:
        raise HTTPException(
            status_code=400,
            detail="Role code already exists",
        )


    role = Role(
        name=data.name.strip(),
        code=data.code.strip().lower(),
        is_active=True,
    )

    db.add(role)
    db.commit()
    db.refresh(role)

    return role


# =========================================================
# UPDATE ROLE
# =========================================================

@router.put(
    "/{role_id}",
    response_model=RoleResponse,
)
def update_role(
    role_id: int,
    data: RoleUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    require_admin(current_user)
    raise HTTPException(status_code=400, detail="Vai trò hệ thống là cố định và không thể chỉnh sửa.")


    role = db.get(
        Role,
        role_id,
    )

    if not role:
        raise HTTPException(
            status_code=404,
            detail="Role not found",
        )


    if data.name is not None:

        name = data.name.strip()

        existing = (
            db.query(Role)
            .filter(
                Role.name == name,
                Role.id != role_id,
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Role name already exists",
            )

        role.name = name


    if data.code is not None:

        code = (
            data.code
            .strip()
            .lower()
        )

        existing = (
            db.query(Role)
            .filter(
                Role.code == code,
                Role.id != role_id,
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Role code already exists",
            )

        role.code = code


    if data.is_active is not None:

        role.is_active = (
            data.is_active
        )


    db.commit()
    db.refresh(role)

    return role


# =========================================================
# DELETE / DEACTIVATE ROLE
# =========================================================

@router.delete(
    "/{role_id}",
)
def delete_role(
    role_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):

    require_admin(current_user)
    raise HTTPException(status_code=400, detail="Vai trò hệ thống là cố định và không thể xóa.")


    role = db.get(
        Role,
        role_id,
    )

    if not role:
        raise HTTPException(
            status_code=404,
            detail="Role not found",
        )


    if role.code == "admin":
        raise HTTPException(
            status_code=400,
            detail="Admin role cannot be deleted",
        )


    role.is_active = False

    db.commit()


    return {
        "message": "Role deactivated successfully"
    }