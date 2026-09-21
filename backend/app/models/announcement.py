from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Table, Column, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.connection import Base


announcement_teams = Table(
    "announcement_teams",
    Base.metadata,
    Column("announcement_id", ForeignKey("announcements.id", ondelete="CASCADE"), primary_key=True),
    Column("team_id", ForeignKey("support_teams.id", ondelete="CASCADE"), primary_key=True),
)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False, default="company")
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    teams = relationship("SupportTeam", secondary=announcement_teams, lazy="selectin")
    creator = relationship("User")
    reads = relationship("AnnouncementRead", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    announcement_id: Mapped[int] = mapped_column(ForeignKey("announcements.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    read_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("announcement_id", "user_id", name="uq_announcement_read"),)

    announcement = relationship("Announcement", back_populates="reads")
    user = relationship("User")
