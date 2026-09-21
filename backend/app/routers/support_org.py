from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..models.organization import SupportRoutingRule

from ..database.connection import get_db
from ..routers.auth import get_current_user
from ..schemas.organization import *
from ..services.organization_service import *
from ..services.permissions import (
    can_delete_department, can_manage_routing, can_manage_support_org,
    can_manage_team, can_manage_team_members, can_manage_own_routing_team,
    leader_team_ids, leader_department_ids, role_code,
)

router = APIRouter(prefix="/support/org", tags=["Support Organization"])


def deny(message="Bạn không có quyền thực hiện thao tác này."):
    raise HTTPException(403, message)


def org_manager(user):
    if not can_manage_support_org(user): deny("Chỉ Admin hoặc Supervisor được quản lý cơ cấu phòng ban/team.")


@router.get("/departments", response_model=list[DepartmentResponse])
def departments(current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    items = list_departments(db)
    if role_code(current_user) == "leader":
        allowed = leader_department_ids(db, current_user.id)
        items = [x for x in items if x.id in allowed]
    return items


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
def create_department_endpoint(data: DepartmentCreate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    org_manager(current_user)
    try: return create_department(db, data)
    except ValueError as e: raise HTTPException(400, str(e))


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department_endpoint(department_id: int, data: DepartmentUpdate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    org_manager(current_user)
    try: return update_department(db, department_id, data)
    except ValueError as e: raise HTTPException(status_code=404 if "Không tìm thấy" in str(e) else 400, detail=str(e))


@router.delete("/departments/{department_id}")
def delete_department_endpoint(department_id: int, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not can_delete_department(current_user): deny("Chỉ Admin được xóa phòng ban.")
    try: delete_department(db, department_id); return {"message": "Department deleted"}
    except ValueError as e: raise HTTPException(404, str(e))


@router.get("/teams", response_model=list[TeamResponse])
def teams(department_id: int | None=None, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    items = list_teams(db, department_id)
    if role_code(current_user) == "leader":
        allowed = leader_team_ids(db, current_user.id)
        items = [x for x in items if x.id in allowed]
    return items


@router.post("/teams", response_model=TeamResponse, status_code=201)
def create_team_endpoint(data: TeamCreate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not can_manage_team(current_user): deny("Chỉ Admin hoặc Supervisor được tạo Team.")
    try: return create_team(db, data)
    except ValueError as e: raise HTTPException(400, str(e))


@router.put("/teams/{team_id}", response_model=TeamResponse)
def update_team_endpoint(team_id: int, data: TeamUpdate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not can_manage_team(current_user): deny("Bạn không có quyền sửa Team.")
    try: return update_team(db, team_id, data)
    except ValueError as e: raise HTTPException(status_code=404 if "Không tìm thấy" in str(e) else 400, detail=str(e))


@router.delete("/teams/{team_id}")
def delete_team_endpoint(team_id: int, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not can_manage_team(current_user): deny("Bạn không có quyền xóa Team.")
    try: delete_team(db, team_id); return {"message": "Support Team deleted"}
    except ValueError as e: raise HTTPException(404, str(e))


@router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
def members(team_id: int, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if role_code(current_user) == "leader" and team_id not in leader_team_ids(db, current_user.id): deny("Bạn không thuộc quyền quản lý Team này.")
    if role_code(current_user) == "user": deny("Bạn không có quyền quản lý thành viên.")
    return list_team_members(db, team_id)


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
def add_member(team_id: int, data: TeamMemberCreate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not can_manage_team_members(current_user): deny("Chỉ Admin hoặc Supervisor được quản lý thành viên Team.")
    try: return add_team_member(db, team_id, data.user_id)
    except ValueError as e: raise HTTPException(400, str(e))


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_member(team_id: int, user_id: int, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not can_manage_team_members(current_user): deny("Chỉ Admin hoặc Supervisor được xóa thành viên khỏi Team.")
    try: remove_team_member(db, team_id, user_id); return {"message": "Team member removed"}
    except ValueError as e: raise HTTPException(404, str(e))


@router.get("/rules", response_model=list[RoutingRuleResponse])
def rules(team_id: int | None=None, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    items = list_rules(db, team_id)
    if role_code(current_user) == "leader":
        allowed = leader_team_ids(db, current_user.id)
        items = [x for x in items if x.team_id in allowed]
    elif role_code(current_user) == "user":
        return []
    return items


@router.post("/rules", response_model=RoutingRuleResponse, status_code=201)
def create_rule_endpoint(data: RoutingRuleCreate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if role_code(current_user) not in {"admin", "supervisor"}: deny("Leader chỉ được cập nhật câu từ Routing, không được tạo Rule mới.")
    try: return create_rule(db, data)
    except ValueError as e: raise HTTPException(400, str(e))


@router.put("/rules/{rule_id}", response_model=RoutingRuleResponse)
def update_rule_endpoint(rule_id: int, data: RoutingRuleUpdate, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    rule = db.get(SupportRoutingRule, rule_id)
    if not rule: raise HTTPException(404, "Không tìm thấy routing rule.")
    if not can_manage_own_routing_team(db, current_user, rule.team_id): deny("Bạn không có quyền sửa Routing Rule này.")
    try: return update_rule(db, rule_id, data)
    except ValueError as e: raise HTTPException(400, str(e))


@router.delete("/rules/{rule_id}")
def delete_rule_endpoint(rule_id: int, current_user=Depends(get_current_user), db: Session=Depends(get_db)):
    if role_code(current_user) not in {"admin", "supervisor"}: deny("Leader chỉ được cập nhật câu từ Routing, không được xóa Rule.")
    try: delete_rule(db, rule_id); return {"message": "Routing rule deleted"}
    except ValueError as e: raise HTTPException(404, str(e))
