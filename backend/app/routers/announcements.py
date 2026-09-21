from datetime import datetime
import inspect

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..models.announcement import Announcement, AnnouncementRead
from ..models.organization import SupportTeam, SupportTeamMember
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.announcement import AnnouncementCreate, AnnouncementResponse, AnnouncementUpdate
from ..services.permissions import (
    can_create_company_announcement,
    can_create_team_announcement,
    leader_team_ids,
    role_code,
    team_ids as member_team_ids,
)
from ..services.notification_service import create_notification
from ..services.telegram_service import send_notification_to_group

router = APIRouter(prefix="/announcements", tags=["Announcements"])


def _visible_query(db, user):
    from sqlalchemy import or_

    q = db.query(Announcement).filter(Announcement.is_active == True)
    role = role_code(user)
    if role in {"admin", "supervisor"}:
        return q
    ids = member_team_ids(db, user.id)
    filters = [Announcement.target_type == "company"]
    if ids:
        filters.append(Announcement.teams.any(SupportTeam.id.in_(ids)))
    return q.filter(or_(*filters))


def _response(db, announcement, user_id):
    read = db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement.id,
        AnnouncementRead.user_id == user_id,
    ).first()
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        target_type=announcement.target_type,
        team_ids=[team.id for team in announcement.teams],
        team_names=[team.name for team in announcement.teams],
        creator_id=announcement.creator_id,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at,
        is_read=bool(read),
        creator_name=announcement.creator.full_name if announcement.creator else None,
    )


def _get_active_teams(db, ids: list[int]):
    clean_ids = list(dict.fromkeys(int(x) for x in ids if x))
    if not clean_ids:
        return []
    teams = db.query(SupportTeam).filter(
        SupportTeam.id.in_(clean_ids),
        SupportTeam.is_active == True,
    ).all()
    if len(teams) != len(clean_ids):
        raise HTTPException(404, "Một hoặc nhiều Team không tồn tại hoặc đã bị tắt.")
    return teams


def _can_edit(db, user, item):
    role = role_code(user)
    if role in {"admin", "supervisor"}:
        return True
    if role == "leader":
        allowed = leader_team_ids(db, user.id)
        return bool(allowed.intersection({team.id for team in item.teams}))
    return False


def _notify_announcement(db, item, actor):
    title = f"📢 {item.title}"
    if item.target_type == "company":
        message = f"{title}\n\n{item.content}\n\n🏢 Thông báo toàn công ty"
        try:
            params = list(inspect.signature(send_notification_to_group).parameters)
            if len(params) >= 2:
                send_notification_to_group(title, message)
            else:
                send_notification_to_group(f"{title}\n\n{message}")
        except Exception as exc:
            print(f"[Telegram Announcement Group] {exc}")

        recipients = db.query(User).filter(User.is_active == True).all()
    else:
        team_ids = [team.id for team in item.teams]
        member_rows = db.query(SupportTeamMember).filter(
            SupportTeamMember.team_id.in_(team_ids),
            SupportTeamMember.is_active == True,
        ).all()
        recipient_ids = sorted({row.user_id for row in member_rows})
        recipients = db.query(User).filter(User.id.in_(recipient_ids), User.is_active == True).all() if recipient_ids else []
        message = f"{title}\n\n{item.content}\n\n👥 {', '.join(team.name for team in item.teams)}"

    for user in recipients:
        create_notification(
            db=db,
            user_id=user.id,
            task_id=None,
            type="announcement",
            title=title,
            message=message,
            send_telegram=(item.target_type == "team"),
        )


@router.get("", response_model=list[AnnouncementResponse])
def list_announcements(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    items = _visible_query(db, current_user).order_by(Announcement.created_at.desc()).all()
    return [_response(db, item, current_user.id) for item in items]


@router.post("", response_model=AnnouncementResponse, status_code=201)
def create_announcement(data: AnnouncementCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    target = (data.target_type or "company").strip().lower()
    if target not in {"company", "team"}:
        raise HTTPException(400, "Loại thông báo không hợp lệ.")

    teams = []
    if target == "company":
        if not can_create_company_announcement(current_user):
            raise HTTPException(403, "Bạn không có quyền đăng thông báo toàn công ty.")
    else:
        if not data.team_ids:
            raise HTTPException(400, "Vui lòng chọn ít nhất một Team.")
        teams = _get_active_teams(db, data.team_ids)
        for team in teams:
            if not can_create_team_announcement(db, current_user, team.id):
                raise HTTPException(403, f"Bạn không có quyền đăng thông báo cho Team {team.name}.")

    item = Announcement(
        title=data.title.strip(),
        content=data.content.strip(),
        target_type=target,
        creator_id=current_user.id,
    )
    item.teams = teams
    db.add(item)
    db.commit()
    db.refresh(item)
    _notify_announcement(db, item, current_user)
    return _response(db, item, current_user.id)


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(announcement_id: int, data: AnnouncementUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(Announcement, announcement_id)
    if not item or not item.is_active:
        raise HTTPException(404, "Không tìm thấy thông báo.")
    if not _can_edit(db, current_user, item):
        raise HTTPException(403, "Bạn không có quyền chỉnh sửa thông báo này.")

    if data.title is not None:
        item.title = data.title.strip()
    if data.content is not None:
        item.content = data.content.strip()

    if data.target_type is not None:
        target = data.target_type.strip().lower()
        if target not in {"company", "team"}:
            raise HTTPException(400, "Loại thông báo không hợp lệ.")
        if target == "company":
            if not can_create_company_announcement(current_user):
                raise HTTPException(403, "Bạn không có quyền đăng thông báo toàn công ty.")
            item.target_type = target
            item.teams = []
        else:
            if data.team_ids is None or not data.team_ids:
                raise HTTPException(400, "Vui lòng chọn ít nhất một Team.")
            teams = _get_active_teams(db, data.team_ids)
            for team in teams:
                if not can_create_team_announcement(db, current_user, team.id):
                    raise HTTPException(403, f"Bạn không có quyền đăng thông báo cho Team {team.name}.")
            item.target_type = target
            item.teams = teams
    elif data.team_ids is not None:
        if item.target_type != "team":
            raise HTTPException(400, "Thông báo toàn công ty không có Team đích.")
        teams = _get_active_teams(db, data.team_ids)
        for team in teams:
            if not can_create_team_announcement(db, current_user, team.id):
                raise HTTPException(403, f"Bạn không có quyền chỉnh sửa Team {team.name}.")
        item.teams = teams

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _response(db, item, current_user.id)


@router.patch("/{announcement_id}/read", response_model=AnnouncementResponse)
def mark_read(announcement_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.get(Announcement, announcement_id)
    if not item or not item.is_active:
        raise HTTPException(404, "Không tìm thấy thông báo.")
    if not _visible_query(db, current_user).filter(Announcement.id == announcement_id).first():
        raise HTTPException(403, "Bạn không có quyền xem thông báo này.")
    existing = db.query(AnnouncementRead).filter_by(announcement_id=announcement_id, user_id=current_user.id).first()
    if not existing:
        db.add(AnnouncementRead(announcement_id=announcement_id, user_id=current_user.id))
        db.commit()
    return _response(db, item, current_user.id)
