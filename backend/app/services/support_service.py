from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from ..models.support import SupportTicket, SupportTicketActivity, SupportTicketComment
from ..models.organization import Department, SupportTeam, SupportTeamMember
from ..models.user import User
from ..services.notification_service import create_notification
from .organization_service import route_ticket
from .permissions import role_code, team_ids, department_ids, leader_team_ids, leader_department_ids

VALID_STATUSES = {"open", "assigned", "in_progress", "waiting", "resolved", "closed"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_CATEGORIES = {"technical", "software", "hardware", "network", "account", "other"}


def generate_ticket_code(ticket_id): return f"TCK-{ticket_id:05d}"


def create_activity(db, ticket_id, user_id, action, old_value=None, new_value=None):
    activity = SupportTicketActivity(ticket_id=ticket_id, user_id=user_id, action=action, old_value=old_value, new_value=new_value)
    db.add(activity)
    return activity


def get_ticket(db, ticket_id):
    return (
        db.query(SupportTicket)
        .options(
            joinedload(SupportTicket.creator), joinedload(SupportTicket.assignee),
            joinedload(SupportTicket.department), joinedload(SupportTicket.team),
            joinedload(SupportTicket.comments).joinedload(SupportTicketComment.user),
            joinedload(SupportTicket.activities).joinedload(SupportTicketActivity.user),
        ).filter(SupportTicket.id == ticket_id).first()
    )


def _role(current_user):
    return role_code(current_user)


def _team_ids_for_user(db, user_id):
    return list(team_ids(db, user_id))


def _department_ids_for_user(db, user_id):
    return list(department_ids(db, user_id))


def can_view_ticket(ticket, current_user, db=None):
    role = _role(current_user)
    if role in {"admin", "supervisor"}: return True
    if ticket.creator_id == current_user.id or ticket.assignee_id == current_user.id: return True
    if db is None: return False
    if role == "leader":
        return ticket.team_id in leader_team_ids(db, current_user.id) or ticket.department_id in _department_ids_for_user(db, current_user.id)
    return False


def can_manage_ticket(ticket, current_user, db=None):
    role = _role(current_user)
    if role in {"admin", "supervisor"}: return True
    if db is None: return ticket.creator_id == current_user.id or ticket.assignee_id == current_user.id
    if role == "leader":
        return ticket.team_id in leader_team_ids(db, current_user.id) or ticket.assignee_id == current_user.id or ticket.creator_id == current_user.id
    return ticket.assignee_id == current_user.id or ticket.creator_id == current_user.id


def get_tickets(db, current_user):
    role = _role(current_user)
    q = db.query(SupportTicket).options(joinedload(SupportTicket.creator), joinedload(SupportTicket.assignee), joinedload(SupportTicket.department), joinedload(SupportTicket.team))
    if role in {"admin", "supervisor"}: return q.order_by(SupportTicket.created_at.desc()).all()
    from sqlalchemy import or_
    filters = [SupportTicket.creator_id == current_user.id, SupportTicket.assignee_id == current_user.id]
    if role == "leader":
        tids, dids = leader_team_ids(db, current_user.id), leader_department_ids(db, current_user.id)
        if tids: filters.append(SupportTicket.team_id.in_(tids))
        if dids: filters.append(SupportTicket.department_id.in_(dids))
    return q.filter(or_(*filters)).order_by(SupportTicket.created_at.desc()).all()

def create_ticket(db, current_user, title, description, category, priority):
    title, description = title.strip(), description.strip()
    if not title: raise ValueError("Tiêu đề yêu cầu không được để trống.")
    if not description: raise ValueError("Nội dung yêu cầu không được để trống.")
    if category not in VALID_CATEGORIES: raise ValueError("Category không hợp lệ.")
    if priority not in VALID_PRIORITIES: raise ValueError("Priority không hợp lệ.")

    department_id, team_id, score, method = route_ticket(db, f"{title} {description}", category)
    ticket = SupportTicket(ticket_code="TEMP", title=title, description=description, creator_id=current_user.id,
                           category=category, priority=priority, status="open", department_id=department_id,
                           team_id=team_id, routing_score=score, routing_method=method)
    db.add(ticket); db.flush()
    ticket.ticket_code = generate_ticket_code(ticket.id)
    create_activity(db, ticket.id, current_user.id, "ticket_created")
    if team_id:
        create_activity(db, ticket.id, current_user.id, "auto_routed", None, f"team:{team_id};score:{score}")
    db.commit(); db.refresh(ticket)
    return get_ticket(db, ticket.id)


def update_ticket(db, ticket, current_user, data):
    changed = False
    for field in ("title", "description", "category", "priority"):
        value = getattr(data, field, None)
        if value is None: continue
        value = value.strip() if isinstance(value, str) else value
        if field == "title" and not value: raise ValueError("Tiêu đề không được để trống.")
        if field == "description" and not value: raise ValueError("Nội dung không được để trống.")
        if field == "category" and value not in VALID_CATEGORIES: raise ValueError("Category không hợp lệ.")
        if field == "priority" and value not in VALID_PRIORITIES: raise ValueError("Priority không hợp lệ.")
        old = getattr(ticket, field)
        if old != value:
            create_activity(db, ticket.id, current_user.id, f"{field}_changed", str(old), str(value))
            setattr(ticket, field, value); changed = True
    if changed:
        ticket.updated_at = datetime.utcnow()
        # Re-route only when content/category changes and nobody has claimed it.
        if not ticket.assignee_id and any(getattr(data, f, None) is not None for f in ("title","description","category")):
            dept, team, score, method = route_ticket(db, f"{ticket.title} {ticket.description}", ticket.category)
            ticket.department_id, ticket.team_id, ticket.routing_score, ticket.routing_method = dept, team, score, method
    db.commit(); return get_ticket(db, ticket.id)


def assign_ticket(db, ticket, current_user, assignee_id):
    if assignee_id is not None:
        user = db.get(User, assignee_id)
        if not user or not user.is_active: raise ValueError("Người xử lý không hợp lệ.")
        if ticket.team_id and not db.query(SupportTeamMember).filter_by(team_id=ticket.team_id, user_id=assignee_id, is_active=True).first():
            raise ValueError("Người xử lý chưa thuộc Team của ticket.")
    old = ticket.assignee_id
    ticket.assignee_id = assignee_id
    if assignee_id and ticket.status == "open": ticket.status = "assigned"
    if not assignee_id and ticket.status == "assigned": ticket.status = "open"
    create_activity(db, ticket.id, current_user.id, "assignee_changed", str(old) if old else None, str(assignee_id) if assignee_id else None)
    db.commit()
    if assignee_id and assignee_id != current_user.id:
        try: create_notification(db, assignee_id, None, "support_ticket_assigned", "Yêu cầu hỗ trợ mới", f'Bạn được giao xử lý "{ticket.ticket_code} - {ticket.title}"')
        except Exception as e: print(f"[Support Notification] Error: {e}")
    return get_ticket(db, ticket.id)


def claim_ticket(db, ticket, current_user):
    if ticket.assignee_id: raise ValueError("Ticket đã có người xử lý.")
    if not ticket.team_id or not db.query(SupportTeamMember).filter_by(team_id=ticket.team_id, user_id=current_user.id, is_active=True).first():
        raise ValueError("Bạn không thuộc Team xử lý ticket này.")
    return assign_ticket(db, ticket, current_user, current_user.id)


def update_ticket_status(db, ticket, current_user, status):
    if status not in VALID_STATUSES: raise ValueError("Status không hợp lệ.")
    old = ticket.status
    if old == status: return get_ticket(db, ticket.id)
    ticket.status = status
    if status == "resolved": ticket.resolved_at = datetime.utcnow()
    elif status == "closed":
        ticket.resolved_at = ticket.resolved_at or datetime.utcnow(); ticket.closed_at = datetime.utcnow()
    else:
        if old == "resolved": ticket.resolved_at = None
        if old == "closed": ticket.closed_at = None
    create_activity(db, ticket.id, current_user.id, "status_changed", old, status)
    db.commit()
    if ticket.creator_id != current_user.id:
        try: create_notification(db, ticket.creator_id, None, "support_ticket_status", "Cập nhật yêu cầu hỗ trợ", f'{ticket.ticket_code} đã chuyển sang "{status}"')
        except Exception as e: print(f"[Support Notification] Error: {e}")
    return get_ticket(db, ticket.id)


def add_comment(db, ticket, current_user, content):
    content = content.strip()
    if not content: raise ValueError("Nội dung trao đổi không được để trống.")
    comment = SupportTicketComment(ticket_id=ticket.id, user_id=current_user.id, content=content)
    db.add(comment); create_activity(db, ticket.id, current_user.id, "comment_added"); db.commit(); db.refresh(comment)
    recipients = {ticket.creator_id}
    if ticket.assignee_id: recipients.add(ticket.assignee_id)
    for uid in recipients - {current_user.id}:
        try: create_notification(db, uid, None, "support_ticket_comment", "Trao đổi mới", f'{current_user.full_name} đã bình luận trong {ticket.ticket_code}')
        except Exception as e: print(f"[Support Notification] Error: {e}")
    return comment


def get_comments(db, ticket_id):
    return db.query(SupportTicketComment).options(joinedload(SupportTicketComment.user)).filter(SupportTicketComment.ticket_id == ticket_id).order_by(SupportTicketComment.created_at.asc()).all()


def get_activities(db, ticket_id):
    return db.query(SupportTicketActivity).options(joinedload(SupportTicketActivity.user)).filter(SupportTicketActivity.ticket_id == ticket_id).order_by(SupportTicketActivity.created_at.asc()).all()
