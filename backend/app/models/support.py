from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from ..database.connection import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    ticket_code: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    creator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(30),
        default="other",
        nullable=False,
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        default="medium",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="open",
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id"),
        nullable=True,
        index=True,
    )

    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("support_teams.id"),
        nullable=True,
        index=True,
    )

    routing_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    routing_method: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    creator = relationship(
        "User",
        foreign_keys=[creator_id],
    )

    assignee = relationship(
        "User",
        foreign_keys=[assignee_id],
    )

    department = relationship(
        "Department",
        foreign_keys=[department_id],
    )

    team = relationship(
        "SupportTeam",
        foreign_keys=[team_id],
    )

    comments = relationship(
        "SupportTicketComment",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="SupportTicketComment.created_at",
    )

    activities = relationship(
        "SupportTicketActivity",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="SupportTicketActivity.created_at",
    )


class SupportTicketComment(Base):
    __tablename__ = "support_ticket_comments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("support_tickets.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    ticket = relationship(
        "SupportTicket",
        back_populates="comments",
    )

    user = relationship(
        "User",
    )


class SupportTicketActivity(Base):
    __tablename__ = "support_ticket_activities"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("support_tickets.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    old_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    new_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    ticket = relationship(
        "SupportTicket",
        back_populates="activities",
    )

    user = relationship(
        "User",
    )