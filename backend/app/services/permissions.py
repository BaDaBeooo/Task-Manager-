from sqlalchemy.orm import Session

from ..models.organization import Department, SupportTeam, SupportTeamMember

ROLE_NAMES = {"admin": "Admin", "supervisor": "Supervisor", "leader": "Leader", "user": "User"}
LEGACY_ROLE_MAP = {"management": "supervisor", "project_manager": "supervisor", "support": "user", "sale": "user", "pre_sale": "user", "developer": "user"}

ROLE_PERMISSIONS = {
    "admin": ["*"],
    "supervisor": [
        "task.view_all", "task.create", "task.edit", "task.delete", "task.assign", "task.supporter", "task.status", "task.subtask",
        "support.view_all", "support.create", "support.comment", "support.claim", "support.assign", "support.status",
        "support.team.manage", "support.team.delete", "support.member.manage", "support.member.remove", "support.routing.manage",
        "announcement.company", "announcement.team", "announcement.view_all",
        "user.view",
    ],
    "leader": [
        "task.view_team", "task.status", "task.subtask",
        "support.view_team", "support.comment", "support.claim", "support.assign", "support.status", "support.routing.edit",
        "announcement.team",
    ],
    "user": ["task.view_assigned", "task.status", "task.subtask", "support.create", "support.view_own", "support.comment"],
}


def role_code(user) -> str:
    code = str(getattr(getattr(user, "role", None), "code", "") or "").strip().lower()
    return LEGACY_ROLE_MAP.get(code, code or "user")


def role_name(user) -> str:
    return ROLE_NAMES.get(role_code(user), "User")


def permissions_for(user) -> list[str]:
    return ROLE_PERMISSIONS.get(role_code(user), ROLE_PERMISSIONS["user"])


def has_permission(user, permission: str) -> bool:
    p = permissions_for(user)
    return "*" in p or permission in p


def is_admin(user): return role_code(user) == "admin"
def is_supervisor(user): return role_code(user) == "supervisor"
def is_leader(user): return role_code(user) == "leader"


def team_ids(db: Session, user_id: int) -> set[int]:
    return {x.team_id for x in db.query(SupportTeamMember).filter(SupportTeamMember.user_id == user_id, SupportTeamMember.is_active == True).all()}


def department_ids(db: Session, user_id: int) -> set[int]:
    ids = set()
    ids.update(
        x.department_id for x in db.query(SupportTeam)
        .join(SupportTeamMember, SupportTeamMember.team_id == SupportTeam.id)
        .filter(SupportTeamMember.user_id == user_id, SupportTeamMember.is_active == True, SupportTeam.is_active == True).all()
    )
    ids.update(x.id for x in db.query(Department).filter(Department.manager_id == user_id, Department.is_active == True).all())
    return ids


def leader_team_ids(db: Session, user_id: int) -> set[int]:
    ids = {x.id for x in db.query(SupportTeam).filter(SupportTeam.lead_id == user_id, SupportTeam.is_active == True).all()}
    depts = department_ids(db, user_id)
    if depts:
        ids.update(x.id for x in db.query(SupportTeam).filter(SupportTeam.department_id.in_(depts), SupportTeam.is_active == True).all())
    return ids


def leader_department_ids(db: Session, user_id: int) -> set[int]:
    ids = department_ids(db, user_id)
    teams = leader_team_ids(db, user_id)
    if teams:
        ids.update(x.department_id for x in db.query(SupportTeam).filter(SupportTeam.id.in_(teams)).all())
    return ids


def can_manage_support_org(user): return role_code(user) in {"admin", "supervisor"}
def can_delete_department(user): return is_admin(user)
def can_manage_team(user): return role_code(user) in {"admin", "supervisor"}
def can_manage_team_members(user): return role_code(user) in {"admin", "supervisor"}
def can_manage_routing(user): return role_code(user) in {"admin", "supervisor", "leader"}
def can_manage_own_routing_team(db, user, team_id): return role_code(user) in {"admin", "supervisor"} or (role_code(user) == "leader" and team_id in leader_team_ids(db, user.id))
def can_create_company_announcement(user): return role_code(user) in {"admin", "supervisor"}
def can_create_team_announcement(db, user, team_id): return role_code(user) in {"admin", "supervisor"} or (role_code(user) == "leader" and team_id in leader_team_ids(db, user.id))
