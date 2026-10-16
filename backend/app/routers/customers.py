from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from ..database.connection import get_db
from ..models.customer import CustomerCompany, CustomerCompanyGrant, CustomerContact
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.customer import CompanyCreate, CompanyUpdate, ContactCreate, ContactUpdate
from ..services.permissions import role_code

router = APIRouter(prefix="/customers", tags=["Customers & Contacts"])

def is_admin(user):
    return role_code(user) == "admin"

def role_of(user):
    return str(role_code(user) or "user").strip().lower()

def roles_of(value, default="admin,supervisor,leader,user"):
    return {item.strip().lower() for item in (value or default).split(",") if item.strip()}

def can_view_contact(contact, user):
    return is_admin(user) or contact.created_by_id == user.id or role_of(user) in roles_of(contact.view_roles)

def can_edit_contact(contact, user):
    return is_admin(user) or contact.created_by_id == user.id or role_of(user) in roles_of(contact.edit_roles)

def can_edit(company, user):
    return is_admin(user) or company.created_by_id == user.id or any(g.user_id == user.id and g.can_edit for g in company.grants)

def serialize_contact(c, user):
    if not can_view_contact(c, user):
        return None
    return {
        "id": c.id, "company_id": c.company_id, "full_name": c.full_name,
        "position": c.position, "department": c.department, "email": c.email,
        "phone": c.phone, "decision_role": c.decision_role, "notes": c.notes,
        "created_by_id": c.created_by_id, "created_at": c.created_at,
        "view_roles": sorted(roles_of(c.view_roles)),
        "edit_roles": sorted(roles_of(c.edit_roles)),
        "can_view": True, "can_edit": can_edit_contact(c, user),
    }

def serialize(company, user):
    return {
        "id": company.id, "name": company.name, "company_type": company.company_type,
        "industry": company.industry, "region": company.region, "website": company.website,
        "address": company.address, "notes": company.notes, "visibility": "all",
        "created_by_id": company.created_by_id,
        "contacts": [item for c in company.contacts if (item := serialize_contact(c, user)) is not None],
        "access_user_ids": [], "edit_user_ids": [],
        "can_edit": can_edit(company, user),
    }

def load_company(db, company_id):
    company = db.query(CustomerCompany).options(joinedload(CustomerCompany.grants), joinedload(CustomerCompany.contacts)).filter(CustomerCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ công ty.")
    return company

def apply_grants(db, company, access_ids, edit_ids):
    edit_set = set(edit_ids or [])
    access_set = set(access_ids or []) | edit_set
    valid_ids = {u.id for u in db.query(User).filter(User.id.in_(access_set), User.deleted_at.is_(None), User.is_active.is_(True)).all()} if access_set else set()
    if valid_ids != access_set:
        raise HTTPException(status_code=400, detail="Danh sách người được cấp quyền không hợp lệ.")
    company.grants.clear()
    for uid in sorted(access_set):
        company.grants.append(CustomerCompanyGrant(user_id=uid, can_edit=uid in edit_set))

@router.get("")
def list_companies(q: str = Query("", max_length=200), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(CustomerCompany).options(joinedload(CustomerCompany.grants), joinedload(CustomerCompany.contacts)).order_by(CustomerCompany.name.asc())
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.outerjoin(CustomerContact).filter(or_(CustomerCompany.name.ilike(like), CustomerCompany.industry.ilike(like), CustomerContact.full_name.ilike(like), CustomerContact.email.ilike(like), CustomerContact.phone.ilike(like))).distinct()
    return [serialize(c, current_user) for c in query.all()]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_company(data: CompanyCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên công ty không được để trống.")
    visibility = data.visibility if data.visibility in ("all", "selected") else "selected"
    company = CustomerCompany(name=name, company_type=data.company_type if data.company_type in ("customer", "partner", "supplier") else "customer", industry=data.industry, region=data.region, website=data.website, address=data.address, notes=data.notes, visibility=visibility, created_by_id=current_user.id)
    db.add(company); db.flush()
    apply_grants(db, company, data.access_user_ids, data.edit_user_ids)
    db.commit(); db.refresh(company)
    return serialize(load_company(db, company.id), current_user)

@router.get("/{company_id}")
def get_company(company_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = load_company(db, company_id)
    return serialize(company, current_user)

@router.put("/{company_id}")
def update_company(company_id: int, data: CompanyUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = load_company(db, company_id)
    if not can_edit(company, current_user):
        raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa hồ sơ này.")
    fields = data.model_dump(exclude_unset=True)
    access_ids = fields.pop("access_user_ids", None); edit_ids = fields.pop("edit_user_ids", None)
    for key, value in fields.items():
        if key == "name" and value is not None and not value.strip():
            raise HTTPException(status_code=400, detail="Tên công ty không được để trống.")
        if key == "visibility" and value not in ("all", "selected"):
            raise HTTPException(status_code=400, detail="Chế độ truy cập không hợp lệ.")
        if key == "company_type" and value not in ("customer", "partner", "supplier"):
            raise HTTPException(status_code=400, detail="Loại hồ sơ không hợp lệ.")
        setattr(company, key, value.strip() if key == "name" and value else value)
    if access_ids is not None or edit_ids is not None:
        if not is_admin(current_user) and company.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Chỉ Admin hoặc người tạo hồ sơ được đổi phân quyền.")
        apply_grants(db, company, access_ids if access_ids is not None else [g.user_id for g in company.grants], edit_ids if edit_ids is not None else [g.user_id for g in company.grants if g.can_edit])
    db.commit(); return serialize(load_company(db, company.id), current_user)

@router.delete("/{company_id}")
def delete_company(company_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = load_company(db, company_id)
    if not (is_admin(current_user) or company.created_by_id == current_user.id):
        raise HTTPException(status_code=403, detail="Chỉ Admin hoặc người tạo hồ sơ được xóa.")
    db.delete(company); db.commit(); return {"success": True}

@router.post("/{company_id}/contacts", status_code=status.HTTP_201_CREATED)
def create_contact(company_id: int, data: ContactCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    company = load_company(db, company_id)
    name = data.full_name.strip()
    if not name: raise HTTPException(status_code=400, detail="Tên contact không được để trống.")
    contact = CustomerContact(company_id=company.id, full_name=name, position=data.position, department=data.department, email=data.email, phone=data.phone, decision_role=data.decision_role, notes=data.notes, view_roles=",".join(sorted(set(data.view_roles or ["admin","supervisor","leader","user"]))), edit_roles=",".join(sorted(set(data.edit_roles or ["admin"]))), created_by_id=current_user.id)
    db.add(contact); db.commit(); db.refresh(contact)
    return serialize_contact(contact, current_user)

@router.put("/contacts/{contact_id}")
def update_contact(contact_id: int, data: ContactUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(CustomerContact).filter(CustomerContact.id == contact_id).first()
    if not contact: raise HTTPException(status_code=404, detail="Không tìm thấy contact.")
    company = load_company(db, contact.company_id)
    if not can_edit_contact(contact, current_user): raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa contact này.")
    for key, value in data.model_dump(exclude_unset=True).items():
        if key in ("view_roles", "edit_roles"):
            allowed = {"admin", "supervisor", "leader", "user"}
            if not isinstance(value, list) or any(str(role).lower() not in allowed for role in value):
                raise HTTPException(status_code=400, detail="Role phân quyền không hợp lệ.")
            setattr(contact, key, ",".join(sorted({str(role).lower() for role in value})))
            continue
        if key == "full_name" and value is not None and not value.strip(): raise HTTPException(status_code=400, detail="Tên contact không được để trống.")
        setattr(contact, key, value.strip() if key == "full_name" and value else value)
    db.commit(); db.refresh(contact)
    return serialize_contact(contact, current_user)

@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(CustomerContact).filter(CustomerContact.id == contact_id).first()
    if not contact: raise HTTPException(status_code=404, detail="Không tìm thấy contact.")
    company = load_company(db, contact.company_id)
    if not can_edit_contact(contact, current_user): raise HTTPException(status_code=403, detail="Bạn không có quyền xóa contact này.")
    db.delete(contact); db.commit(); return {"success": True}
