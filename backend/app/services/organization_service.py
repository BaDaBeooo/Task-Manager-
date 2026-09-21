from sqlalchemy.orm import Session, joinedload
from ..models.organization import Department, SupportRoutingRule, SupportTeam, SupportTeamMember
from ..models.user import User


def require_admin(current_user):
    role = getattr(current_user, "role", None)
    role_code = getattr(role, "code", role)
    if str(role_code or "").lower() != "admin":
        raise PermissionError("Chỉ Admin được quản lý cơ cấu Support.")


def list_departments(db: Session):
    return db.query(Department).options(joinedload(Department.manager)).filter(Department.is_active == True).order_by(Department.name).all()


def create_department(db, data):
    code = data.code.strip().lower()
    if db.query(Department).filter(Department.code == code).first():
        raise ValueError("Mã phòng ban đã tồn tại.")
    manager = db.get(User, data.manager_id) if data.manager_id else None
    if data.manager_id and (not manager or not manager.is_active):
        raise ValueError("Không tìm thấy trưởng phòng đang hoạt động.")
    if data.parent_id:
        parent = db.get(Department, data.parent_id)
        if not parent or not parent.is_active:
            raise ValueError("Phòng ban cha không hợp lệ.")
    d = Department(name=data.name.strip(), code=code, parent_id=data.parent_id, manager_id=data.manager_id)
    db.add(d); db.commit(); db.refresh(d)
    return db.query(Department).options(joinedload(Department.manager)).get(d.id)


def update_department(db, department_id, data):
    d = db.get(Department, department_id)
    if not d: raise ValueError("Không tìm thấy phòng ban.")
    if data.name is not None:
        name = data.name.strip()
        if not name: raise ValueError("Tên phòng ban không được để trống.")
        d.name = name
    if data.code is not None:
        code = data.code.strip().lower()
        if db.query(Department).filter(Department.code == code, Department.id != department_id).first():
            raise ValueError("Mã phòng ban đã tồn tại.")
        d.code = code
    fields_set = getattr(data, "model_fields_set", set())
    if "parent_id" in fields_set:
        if data.parent_id == department_id: raise ValueError("Phòng ban không thể là cha của chính nó.")
        if data.parent_id is None:
            d.parent_id = None
        else:
            parent = db.get(Department, data.parent_id)
            if not parent or not parent.is_active: raise ValueError("Phòng ban cha không hợp lệ.")
            d.parent_id = data.parent_id
    if "manager_id" in fields_set:
        if data.manager_id is None:
            d.manager_id = None
        else:
            manager = db.get(User, data.manager_id)
            if not manager or not manager.is_active: raise ValueError("Không tìm thấy trưởng phòng đang hoạt động.")
            d.manager_id = data.manager_id
    if data.is_active is not None:
        d.is_active = data.is_active
        if not data.is_active: _deactivate_department_children(db, d)
    db.commit()
    return db.query(Department).options(joinedload(Department.manager)).get(department_id)


def delete_department(db, department_id):
    d = db.get(Department, department_id)
    if not d: raise ValueError("Không tìm thấy phòng ban.")
    d.is_active = False
    _deactivate_department_children(db, d)
    db.commit()


def _deactivate_department_children(db, department):
    teams = db.query(SupportTeam).filter(SupportTeam.department_id == department.id).all()
    for team in teams:
        team.is_active = False
        db.query(SupportTeamMember).filter(SupportTeamMember.team_id == team.id).update({SupportTeamMember.is_active: False}, synchronize_session=False)
        db.query(SupportRoutingRule).filter(SupportRoutingRule.team_id == team.id).update({SupportRoutingRule.is_active: False}, synchronize_session=False)


def list_teams(db: Session, department_id=None):
    q = db.query(SupportTeam).join(Department, SupportTeam.department_id == Department.id).options(joinedload(SupportTeam.lead)).filter(SupportTeam.is_active == True, Department.is_active == True)
    if department_id: q = q.filter(SupportTeam.department_id == department_id)
    return q.order_by(SupportTeam.name).all()


def create_team(db, data):
    dept = db.get(Department, data.department_id)
    if not dept or not dept.is_active: raise ValueError("Không tìm thấy phòng ban đang hoạt động.")
    code = data.code.strip().lower()
    if db.query(SupportTeam).filter(SupportTeam.department_id == data.department_id, SupportTeam.code == code).first():
        raise ValueError("Mã team đã tồn tại trong phòng ban.")
    if data.lead_id:
        lead = db.get(User, data.lead_id)
        if not lead or not lead.is_active: raise ValueError("Không tìm thấy Team Lead đang hoạt động.")
    t = SupportTeam(department_id=data.department_id, name=data.name.strip(), code=code, lead_id=data.lead_id)
    db.add(t); db.commit(); db.refresh(t)
    return db.query(SupportTeam).options(joinedload(SupportTeam.lead)).get(t.id)


def update_team(db, team_id, data):
    t = db.get(SupportTeam, team_id)
    if not t: raise ValueError("Không tìm thấy Support Team.")
    if data.name is not None:
        name = data.name.strip()
        if not name: raise ValueError("Tên Team không được để trống.")
        t.name = name
    if data.code is not None:
        code = data.code.strip().lower()
        if db.query(SupportTeam).filter(SupportTeam.department_id == t.department_id, SupportTeam.code == code, SupportTeam.id != team_id).first():
            raise ValueError("Mã team đã tồn tại trong phòng ban.")
        t.code = code
    if data.lead_id is not None:
        if data.lead_id == 0:
            t.lead_id = None
        else:
            lead = db.get(User, data.lead_id)
            if not lead or not lead.is_active: raise ValueError("Không tìm thấy Team Lead đang hoạt động.")
            t.lead_id = data.lead_id
    if data.is_active is not None:
        t.is_active = data.is_active
        if not data.is_active:
            db.query(SupportTeamMember).filter(SupportTeamMember.team_id == t.id).update({SupportTeamMember.is_active: False}, synchronize_session=False)
            db.query(SupportRoutingRule).filter(SupportRoutingRule.team_id == t.id).update({SupportRoutingRule.is_active: False}, synchronize_session=False)
    db.commit()
    return db.query(SupportTeam).options(joinedload(SupportTeam.lead)).get(team_id)


def delete_team(db, team_id):
    t = db.get(SupportTeam, team_id)
    if not t: raise ValueError("Không tìm thấy Support Team.")
    t.is_active = False
    db.query(SupportTeamMember).filter(SupportTeamMember.team_id == t.id).update({SupportTeamMember.is_active: False}, synchronize_session=False)
    db.query(SupportRoutingRule).filter(SupportRoutingRule.team_id == t.id).update({SupportRoutingRule.is_active: False}, synchronize_session=False)
    db.commit()


def list_team_members(db, team_id):
    return db.query(SupportTeamMember).options(joinedload(SupportTeamMember.user)).filter(SupportTeamMember.team_id == team_id, SupportTeamMember.is_active == True).all()


def add_team_member(db, team_id, user_id):
    team = db.get(SupportTeam, team_id)
    if not team or not team.is_active: raise ValueError("Không tìm thấy Team đang hoạt động.")
    user = db.get(User, user_id)
    if not user or not user.is_active: raise ValueError("Không tìm thấy người dùng đang hoạt động.")
    existing = db.query(SupportTeamMember).filter_by(team_id=team_id, user_id=user_id).first()
    if existing: existing.is_active = True
    else: db.add(SupportTeamMember(team_id=team_id, user_id=user_id))
    db.commit()
    return db.query(SupportTeamMember).options(joinedload(SupportTeamMember.user)).filter_by(team_id=team_id, user_id=user_id).first()


def remove_team_member(db, team_id, user_id):
    m = db.query(SupportTeamMember).filter_by(team_id=team_id, user_id=user_id).first()
    if not m: raise ValueError("Không tìm thấy thành viên trong Team.")
    m.is_active = False
    db.commit()


def list_rules(db, team_id=None):
    q = db.query(SupportRoutingRule).join(SupportTeam, SupportRoutingRule.team_id == SupportTeam.id).join(Department, SupportTeam.department_id == Department.id).filter(SupportRoutingRule.is_active == True, SupportTeam.is_active == True, Department.is_active == True)
    if team_id: q = q.filter(SupportRoutingRule.team_id == team_id)
    return q.order_by(SupportRoutingRule.weight.desc(), SupportRoutingRule.keyword).all()


def create_rule(db, data):
    team = db.get(SupportTeam, data.team_id)
    if not team or not team.is_active: raise ValueError("Không tìm thấy Team đang hoạt động.")
    keyword = data.keyword.strip()
    if not keyword: raise ValueError("Keyword không được để trống.")
    r = SupportRoutingRule(team_id=data.team_id, keyword=keyword, weight=data.weight)
    db.add(r); db.commit(); db.refresh(r)
    return r


def update_rule(db, rule_id, data):
    r = db.get(SupportRoutingRule, rule_id)
    if not r: raise ValueError("Không tìm thấy routing rule.")
    if data.keyword is not None:
        keyword = data.keyword.strip()
        if not keyword: raise ValueError("Keyword không được để trống.")
        r.keyword = keyword
    if data.weight is not None: r.weight = data.weight
    if data.is_active is not None: r.is_active = data.is_active
    db.commit(); db.refresh(r)
    return r


def delete_rule(db, rule_id):
    r = db.get(SupportRoutingRule, rule_id)
    if not r: raise ValueError("Không tìm thấy routing rule.")
    r.is_active = False
    db.commit()


def route_ticket(db: Session, text: str, category: str = "other"):
    rules = db.query(SupportRoutingRule).join(SupportRoutingRule.team).join(SupportTeam.department).filter(SupportRoutingRule.is_active == True, SupportTeam.is_active == True, Department.is_active == True).options(joinedload(SupportRoutingRule.team).joinedload(SupportTeam.department)).all()
    normalized = _normalize(text); scores = {}
    for rule in rules:
        keyword = _normalize(rule.keyword)
        if keyword and keyword in normalized: scores[rule.team_id] = scores.get(rule.team_id, 0) + rule.weight
    if not scores: return None, None, 0, "unmatched"
    team_id, score = max(scores.items(), key=lambda item: item[1])
    team = db.query(SupportTeam).options(joinedload(SupportTeam.department)).get(team_id)
    return team.department_id, team.id, score, "keyword"


def _normalize(value: str):
    import unicodedata
    value = unicodedata.normalize("NFD", value.lower())
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn").replace("đ", "d")
