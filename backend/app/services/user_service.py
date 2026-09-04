from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.security import hash_password
from ..models.role import Role
from ..models.user import User
from ..schemas.user import UserCreate


# =========================================================
# GET USER BY USERNAME
# =========================================================

def get_user_by_username(
    db: Session,
    username: str,
) -> User | None:

    statement = select(User).where(
        User.username == username
    )

    return db.scalar(statement)


# =========================================================
# GET USER BY ID
# =========================================================

def get_user_by_id(
    db: Session,
    user_id: int,
) -> User | None:

    return db.get(
        User,
        user_id,
    )


# =========================================================
# CREATE USER
# =========================================================

def create_user(
    db: Session,
    user_data: UserCreate,
) -> User:

    role = db.get(
        Role,
        user_data.role_id,
    )

    if not role:
        raise ValueError(
            "Role not found"
        )

    if not role.is_active:
        raise ValueError(
            "Role is inactive"
        )

    user = User(
        username=user_data.username.strip(),
        full_name=user_data.full_name.strip(),
        password_hash=hash_password(
            user_data.password
        ),
        role_id=role.id,
        is_active=True,
        must_change_password=True,
    )

    db.add(user)

    db.commit()

    db.refresh(user)

    return user