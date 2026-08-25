from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.security import hash_password
from ..models.user import User
from ..schemas.user import UserCreate


def get_user_by_username(
    db: Session,
    username: str,
) -> User | None:
    statement = select(User).where(
        User.username == username
    )

    return db.scalar(statement)


def get_user_by_id(
    db: Session,
    user_id: int,
) -> User | None:
    return db.get(User, user_id)


def create_user(
    db: Session,
    user_data: UserCreate,
) -> User:

    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        password_hash=hash_password(
            user_data.password
        ),
        role=user_data.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user