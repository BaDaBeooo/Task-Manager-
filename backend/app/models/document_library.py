from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database.connection import Base


class LibraryFolder(Base):
    __tablename__ = "library_folders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("library_folders.id"), nullable=True, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    parent = relationship("LibraryFolder", remote_side=[id], backref="children")
    creator = relationship("User")


class LibraryDocument(Base):
    __tablename__ = "library_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("library_folders.id"), nullable=True, index=True)
    vendor: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    product: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    document_type: Mapped[str] = mapped_column(String(60), default="Khác", nullable=False, index=True)
    tags_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), default="all", nullable=False)
    allowed_user_ids_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    folder = relationship("LibraryFolder")
    creator = relationship("User")
    versions: Mapped[list["LibraryDocumentVersion"]] = relationship(
        "LibraryDocumentVersion", back_populates="document", cascade="all, delete-orphan",
        order_by="desc(LibraryDocumentVersion.version_number)"
    )


class LibraryDocumentVersion(Base):
    __tablename__ = "library_document_versions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("library_documents.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    content_type: Mapped[str] = mapped_column(String(150), default="application/octet-stream", nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    scan_status: Mapped[str] = mapped_column(String(20), default="not_scanned", nullable=False)

    document = relationship("LibraryDocument", back_populates="versions")
    uploader = relationship("User", foreign_keys=[uploaded_by])
