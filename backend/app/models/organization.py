from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database.connection import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    parent = relationship("Department", remote_side=[id], back_populates="children")
    children = relationship("Department", back_populates="parent")
    manager = relationship("User", foreign_keys=[manager_id])
    teams = relationship("SupportTeam", back_populates="department", cascade="all, delete-orphan")
    members = relationship("DepartmentMember", back_populates="department", cascade="all, delete-orphan")


class DepartmentMember(Base):
    __tablename__ = "department_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("department_id", "user_id", name="uq_department_member"),)

    department = relationship("Department", back_populates="members")
    user = relationship("User")


class SupportTeam(Base):
    __tablename__ = "support_teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("department_id", "code", name="uq_support_team_department_code"),)

    department = relationship("Department", back_populates="teams")
    lead = relationship("User", foreign_keys=[lead_id])
    members = relationship("SupportTeamMember", back_populates="team", cascade="all, delete-orphan")
    rules = relationship("SupportRoutingRule", back_populates="team", cascade="all, delete-orphan")


class SupportTeamMember(Base):
    __tablename__ = "support_team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("support_teams.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_support_team_member"),)

    team = relationship("SupportTeam", back_populates="members")
    user = relationship("User")


class SupportRoutingRule(Base):
    __tablename__ = "support_routing_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("support_teams.id"), nullable=False, index=True)
    keyword: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    weight: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("SupportTeam", back_populates="rules")
