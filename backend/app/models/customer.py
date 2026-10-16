from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database.connection import Base

class CustomerCompany(Base):
    __tablename__ = "customer_companies"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    company_type: Mapped[str] = mapped_column(String(30), default="customer", nullable=False)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), default="selected", nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    contacts = relationship("CustomerContact", back_populates="company", cascade="all, delete-orphan")
    grants = relationship("CustomerCompanyGrant", back_populates="company", cascade="all, delete-orphan")

class CustomerCompanyGrant(Base):
    __tablename__ = "customer_company_grants"
    __table_args__ = (UniqueConstraint("company_id", "user_id", name="uq_customer_company_user"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("customer_companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    company = relationship("CustomerCompany", back_populates="grants")

class CustomerContact(Base):
    __tablename__ = "customer_contacts"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("customer_companies.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    position: Mapped[str | None] = mapped_column(String(150), nullable=True)
    department: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    decision_role: Mapped[str | None] = mapped_column(String(120), nullable=True)
    view_roles: Mapped[str] = mapped_column(String(300), default="admin", nullable=False)
    edit_roles: Mapped[str] = mapped_column(String(300), default="admin", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    company = relationship("CustomerCompany", back_populates="contacts")
