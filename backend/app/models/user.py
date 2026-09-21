from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.connection import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role_id: Mapped[int | None] = mapped_column(ForeignKey("roles.id"), nullable=True)
    role = relationship("Role", back_populates="users")

    telegram_chat_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    telegram_link_code: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    telegram_link_code_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
