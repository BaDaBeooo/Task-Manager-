import json
import os
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from ..database.connection import get_db
from ..models.document_library import LibraryFolder, LibraryDocument, LibraryDocumentVersion
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/document-library", tags=["Document Library"])
MAX_FILE_SIZE = int(os.getenv("DOCUMENT_LIBRARY_MAX_FILE_SIZE", str(500 * 1024 * 1024)))
MAX_TOTAL_STORAGE = int(os.getenv("DOCUMENT_LIBRARY_MAX_TOTAL_STORAGE", str(20 * 1024 * 1024 * 1024)))
CHUNK_SIZE = 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".csv",
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt", ".zip", ".rar",
    ".7z", ".dwg", ".dxf", ".vsdx", ".json", ".xml", ".mp4"
}


def storage_root() -> Path:
    configured = os.getenv("TASKMANAGER_STORAGE_DIR")
    if configured:
        root = Path(configured).expanduser()
    elif os.name == "nt":
        root = Path(r"D:\TaskManager_Storage")
    else:
        root = Path.home() / "TaskManager_Storage"
    target = root / "document_library"
    target.mkdir(parents=True, exist_ok=True)
    return target


def role_code(user: User) -> str:
    role = getattr(user, "role", None)
    return str(getattr(role, "code", "") or "").strip().lower()


def is_admin(user: User) -> bool:
    return role_code(user) == "admin"


def parse_json_list(value: str | None) -> list:
    try:
        result = json.loads(value or "[]")
        return result if isinstance(result, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def can_view(document: LibraryDocument, user: User) -> bool:
    return is_admin(user) or document.visibility != "restricted" or user.id == document.created_by or user.id in parse_json_list(document.allowed_user_ids_json)


def can_manage(document: LibraryDocument, user: User) -> bool:
    return is_admin(user) or user.id == document.created_by


def get_document_or_404(db: Session, document_id: int, user: User) -> LibraryDocument:
    document = (
        db.query(LibraryDocument)
        .options(joinedload(LibraryDocument.versions))
        .filter(LibraryDocument.id == document_id, LibraryDocument.deleted_at.is_(None))
        .first()
    )
    if not document or not can_view(document, user):
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return document


def version_payload(version: LibraryDocumentVersion) -> dict:
    return {
        "id": version.id,
        "version_number": version.version_number,
        "original_filename": version.original_filename,
        "content_type": version.content_type,
        "size_bytes": version.size_bytes,
        "uploaded_by": version.uploaded_by,
        "uploaded_at": version.uploaded_at.isoformat() if version.uploaded_at else None,
        "scan_status": version.scan_status,
    }


def document_payload(document: LibraryDocument, include_versions: bool = True) -> dict:
    versions = sorted(document.versions, key=lambda item: item.version_number, reverse=True)
    latest = versions[0] if versions else None
    return {
        "id": document.id,
        "folder_id": document.folder_id,
        "title": document.title,
        "vendor": document.vendor or "",
        "product": document.product or "",
        "model": document.model or "",
        "document_type": document.document_type,
        "tags": parse_json_list(document.tags_json),
        "description": document.description or "",
        "visibility": document.visibility,
        "allowed_user_ids": parse_json_list(document.allowed_user_ids_json),
        "created_by": document.created_by,
        "created_by_name": getattr(document.creator, "full_name", "") if document.creator else "",
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
        "version_count": len(versions),
        "latest_version": version_payload(latest) if latest else None,
        "versions": [version_payload(item) for item in versions] if include_versions else [],
        "can_manage": True if document.created_by else False,
    }


def _safe_original_name(name: str | None) -> str:
    cleaned = Path((name or "file").replace("\\", "/")).name
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", cleaned).strip(" .")
    return cleaned[:240] or "file"


def _storage_used(db: Session) -> int:
    result = db.query(LibraryDocumentVersion.size_bytes).join(LibraryDocument).filter(LibraryDocument.deleted_at.is_(None)).all()
    return sum(row[0] or 0 for row in result)


def _save_upload(upload: UploadFile) -> tuple[str, int, str]:
    original_name = _safe_original_name(upload.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng file chưa được hỗ trợ: {extension or '(không có đuôi)'}")

    stored_name = f"{uuid.uuid4().hex}{extension}"
    destination = storage_root() / stored_name
    size = 0
    try:
        with destination.open("xb") as target:
            while True:
                chunk = upload.file.read(CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File vượt quá giới hạn 500 MB")
                target.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="File rỗng, vui lòng chọn file khác")
        return stored_name, size, original_name
    except Exception:
        destination.unlink(missing_ok=True)
        raise


def _create_version(db: Session, document: LibraryDocument, upload: UploadFile, user: User) -> LibraryDocumentVersion:
    if _storage_used(db) >= MAX_TOTAL_STORAGE:
        raise HTTPException(status_code=413, detail="Kho dữ liệu đã đạt giới hạn dung lượng cấu hình")
    stored_name, size, original_name = _save_upload(upload)
    if _storage_used(db) + size > MAX_TOTAL_STORAGE:
        (storage_root() / stored_name).unlink(missing_ok=True)
        raise HTTPException(status_code=413, detail="File sẽ làm vượt giới hạn tổng dung lượng kho")
    version_number = (db.query(LibraryDocumentVersion.version_number)
        .filter(LibraryDocumentVersion.document_id == document.id)
        .order_by(LibraryDocumentVersion.version_number.desc()).first())
    next_version = (version_number[0] + 1) if version_number else 1
    version = LibraryDocumentVersion(
        document_id=document.id,
        version_number=next_version,
        original_filename=original_name,
        stored_filename=stored_name,
        content_type=upload.content_type or "application/octet-stream",
        size_bytes=size,
        uploaded_by=user.id,
        scan_status="not_scanned",
    )
    db.add(version)
    document.updated_at = datetime.utcnow()
    return version


@router.get("/folders")
def list_folders(parent_id: int | None = Query(None), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folders = db.query(LibraryFolder).filter(LibraryFolder.parent_id == parent_id).order_by(LibraryFolder.name.asc()).all()
    return [{"id": f.id, "name": f.name, "parent_id": f.parent_id, "created_by": f.created_by,
             "can_manage": is_admin(current_user) or f.created_by == current_user.id,
             "document_count": db.query(LibraryDocument).filter(LibraryDocument.folder_id == f.id, LibraryDocument.deleted_at.is_(None)).count(),
             "child_count": db.query(LibraryFolder).filter(LibraryFolder.parent_id == f.id).count()} for f in folders]


@router.get("/folders/{folder_id}/path")
def folder_path(folder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(LibraryFolder).filter(LibraryFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")
    result = []
    current = folder
    while current:
        result.append({"id": current.id, "name": current.name, "parent_id": current.parent_id})
        current = current.parent
    return list(reversed(result))


@router.post("/folders", status_code=status.HTTP_201_CREATED)
def create_folder(name: str = Form(...), parent_id: int | None = Form(None), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    name = name.strip()
    if not name or len(name) > 200 or name in {".", ".."} or any(c in name for c in "\\/\0"):
        raise HTTPException(status_code=400, detail="Tên thư mục không hợp lệ")
    if parent_id is not None and not db.query(LibraryFolder).filter(LibraryFolder.id == parent_id).first():
        raise HTTPException(status_code=404, detail="Không tìm thấy thư mục cha")
    duplicate = db.query(LibraryFolder).filter(LibraryFolder.parent_id == parent_id, LibraryFolder.name.ilike(name)).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Đã tồn tại thư mục cùng tên tại vị trí này")
    folder = LibraryFolder(name=name, parent_id=parent_id, created_by=current_user.id)
    db.add(folder); db.commit(); db.refresh(folder)
    return {"id": folder.id, "name": folder.name, "parent_id": folder.parent_id, "created_by": folder.created_by, "can_manage": True, "document_count": 0, "child_count": 0}


@router.patch("/folders/{folder_id}")
def rename_folder(folder_id: int, name: str = Form(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(LibraryFolder).filter(LibraryFolder.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")
    if not (is_admin(current_user) or folder.created_by == current_user.id): raise HTTPException(status_code=403, detail="Không có quyền đổi tên thư mục")
    name = name.strip()
    if not name or len(name) > 200 or any(c in name for c in "\\/\0"): raise HTTPException(status_code=400, detail="Tên thư mục không hợp lệ")
    duplicate = db.query(LibraryFolder).filter(LibraryFolder.parent_id == folder.parent_id, LibraryFolder.id != folder.id, LibraryFolder.name.ilike(name)).first()
    if duplicate: raise HTTPException(status_code=409, detail="Đã tồn tại thư mục cùng tên")
    folder.name = name; db.commit()
    return {"success": True, "name": name}


@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(LibraryFolder).filter(LibraryFolder.id == folder_id).first()
    if not folder: raise HTTPException(status_code=404, detail="Không tìm thấy thư mục")
    if not (is_admin(current_user) or folder.created_by == current_user.id): raise HTTPException(status_code=403, detail="Không có quyền xóa thư mục")
    has_children = db.query(LibraryFolder).filter(LibraryFolder.parent_id == folder.id).first()
    has_docs = db.query(LibraryDocument).filter(LibraryDocument.folder_id == folder.id, LibraryDocument.deleted_at.is_(None)).first()
    if has_children or has_docs: raise HTTPException(status_code=409, detail="Thư mục còn chứa thư mục con hoặc tài liệu. Hãy di chuyển/xóa nội dung trước.")
    db.delete(folder); db.commit()
    return {"success": True}


@router.get("")
def list_documents(
    q: str = Query("", max_length=200),
    vendor: str = Query("", max_length=200),
    document_type: str = Query("", max_length=60),
    tag: str = Query("", max_length=80),
    folder_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LibraryDocument).options(joinedload(LibraryDocument.versions), joinedload(LibraryDocument.creator)).filter(LibraryDocument.deleted_at.is_(None))
    if folder_id is not None:
        query = query.filter(LibraryDocument.folder_id == folder_id)
    if q.strip():
        pattern = f"%{q.strip()}%"
        query = query.filter((LibraryDocument.title.ilike(pattern)) | (LibraryDocument.vendor.ilike(pattern)) | (LibraryDocument.product.ilike(pattern)) | (LibraryDocument.model.ilike(pattern)) | (LibraryDocument.description.ilike(pattern)))
    if vendor.strip():
        query = query.filter(LibraryDocument.vendor.ilike(f"%{vendor.strip()}%"))
    if document_type.strip():
        query = query.filter(LibraryDocument.document_type == document_type.strip())
    documents = query.order_by(LibraryDocument.updated_at.desc()).all()
    visible = [doc for doc in documents if can_view(doc, current_user) and (not tag.strip() or tag.strip().casefold() in [str(item).casefold() for item in parse_json_list(doc.tags_json)])]
    items = []
    for doc in visible:
        payload = document_payload(doc)
        payload["can_manage"] = can_manage(doc, current_user)
        items.append(payload)
    return {"items": items, "total": len(visible), "max_file_size": MAX_FILE_SIZE, "max_total_storage": MAX_TOTAL_STORAGE, "storage_used": _storage_used(db)}


@router.post("", status_code=status.HTTP_201_CREATED)
def upload_documents(
    files: list[UploadFile] = File(...),
    title: str = Form(""),
    vendor: str = Form(""),
    product: str = Form(""),
    model: str = Form(""),
    document_type: str = Form("Khác"),
    tags: str = Form(""),
    description: str = Form(""),
    visibility: str = Form("all"),
    allowed_user_ids: str = Form("[]"),
    folder_id: int | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất một file")
    if visibility not in {"all", "restricted"}:
        raise HTTPException(status_code=400, detail="Phạm vi truy cập không hợp lệ")
    try:
        user_ids = [int(value) for value in json.loads(allowed_user_ids or "[]")]
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Danh sách người được cấp quyền không hợp lệ")
    if visibility == "restricted" and not is_admin(current_user) and not user_ids:
        user_ids = [current_user.id]
    tags_list = list(dict.fromkeys([item.strip()[:80] for item in re.split(r"[,;\n]", tags) if item.strip()]))[:30]
    created = []
    created_paths = []
    try:
        for upload in files:
            base_title = title.strip() or Path(_safe_original_name(upload.filename)).stem
            document = LibraryDocument(
                title=(base_title if len(files) == 1 else f"{base_title} - {Path(_safe_original_name(upload.filename)).stem}")[:255],
                folder_id=folder_id,
                vendor=vendor.strip() or None,
                product=product.strip() or None,
                model=model.strip() or None,
                document_type=document_type.strip() or "Khác",
                tags_json=json.dumps(tags_list, ensure_ascii=False),
                description=description.strip() or None,
                visibility=visibility,
                allowed_user_ids_json=json.dumps(sorted(set(user_ids)), ensure_ascii=False),
                created_by=current_user.id,
            )
            db.add(document)
            db.flush()
            version = _create_version(db, document, upload, current_user)
            created_paths.append(version.stored_filename)
            created.append(document)
        db.commit()
        for document in created:
            db.refresh(document)
        return {"items": [document_payload(document) for document in created], "total": len(created)}
    except Exception:
        db.rollback()
        for stored_name in created_paths:
            (storage_root() / stored_name).unlink(missing_ok=True)
        raise
    finally:
        for upload in files:
            upload.file.close()


@router.post("/{document_id}/versions", status_code=status.HTTP_201_CREATED)
def upload_new_version(
    document_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, current_user)
    if not can_manage(document, current_user):
        raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật phiên bản tài liệu này")
    stored_name = None
    try:
        version = _create_version(db, document, file, current_user)
        stored_name = version.stored_filename
        db.commit()
        db.refresh(document)
        return document_payload(document)
    except Exception:
        db.rollback()
        if stored_name:
            (storage_root() / stored_name).unlink(missing_ok=True)
        raise
    finally:
        file.file.close()


@router.get("/{document_id}")
def get_document(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = get_document_or_404(db, document_id, current_user)
    payload = document_payload(document)
    payload["can_manage"] = can_manage(document, current_user)
    return payload


@router.get("/{document_id}/versions/{version_id}/file")
def download_version(
    document_id: int,
    version_id: int,
    inline: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, current_user)
    version = db.query(LibraryDocumentVersion).filter(LibraryDocumentVersion.id == version_id, LibraryDocumentVersion.document_id == document.id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên bản file")
    path = storage_root() / version.stored_filename
    if not path.is_file():
        raise HTTPException(status_code=410, detail="File không còn tồn tại trên ổ lưu trữ")
    media_type = version.content_type or "application/octet-stream"
    if inline and Path(version.original_filename).suffix.lower() not in {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt"}:
        inline = False
    return FileResponse(path, media_type=media_type, filename=version.original_filename, content_disposition_type="inline" if inline else "attachment")


@router.patch("/{document_id}")
def update_document(
    document_id: int,
    title: str = Form(...),
    vendor: str = Form(""),
    product: str = Form(""),
    model: str = Form(""),
    document_type: str = Form("Khác"),
    tags: str = Form(""),
    description: str = Form(""),
    visibility: str = Form("all"),
    allowed_user_ids: str = Form("[]"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, current_user)
    if not can_manage(document, current_user):
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa tài liệu này")
    try:
        user_ids = [int(value) for value in json.loads(allowed_user_ids or "[]")]
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Danh sách người được cấp quyền không hợp lệ")
    if visibility not in {"all", "restricted"}:
        raise HTTPException(status_code=400, detail="Phạm vi truy cập không hợp lệ")
    document.title = title.strip()[:255] or document.title
    document.vendor = vendor.strip() or None
    document.product = product.strip() or None
    document.model = model.strip() or None
    document.document_type = document_type.strip() or "Khác"
    document.tags_json = json.dumps(list(dict.fromkeys([item.strip()[:80] for item in re.split(r"[,;\n]", tags) if item.strip()]))[:30], ensure_ascii=False)
    document.description = description.strip() or None
    document.visibility = visibility
    document.allowed_user_ids_json = json.dumps(sorted(set(user_ids)), ensure_ascii=False)
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    return document_payload(document)


@router.delete("/{document_id}")
def delete_document(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = get_document_or_404(db, document_id, current_user)
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ Admin được xóa tài liệu")
    versions = list(document.versions)
    document.deleted_at = datetime.utcnow()
    db.commit()
    for version in versions:
        try:
            (storage_root() / version.stored_filename).unlink(missing_ok=True)
        except OSError:
            pass
    return {"success": True}
