from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    company_type: str = "customer"
    industry: str | None = None
    region: str | None = None
    website: str | None = None
    address: str | None = None
    notes: str | None = None
    visibility: str = "selected"
    access_user_ids: list[int] = []
    edit_user_ids: list[int] = []

class CompanyUpdate(BaseModel):
    name: str | None = None
    company_type: str | None = None
    industry: str | None = None
    region: str | None = None
    website: str | None = None
    address: str | None = None
    notes: str | None = None
    visibility: str | None = None
    access_user_ids: list[int] | None = None
    edit_user_ids: list[int] | None = None

class ContactCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    position: str | None = None
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    decision_role: str | None = None
    notes: str | None = None
    view_roles: list[str] = ["admin"]
    edit_roles: list[str] = ["admin"]

class ContactUpdate(BaseModel):
    full_name: str | None = None
    position: str | None = None
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    decision_role: str | None = None
    notes: str | None = None
    view_roles: list[str] | None = None
    edit_roles: list[str] | None = None

class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    full_name: str
    position: str | None
    department: str | None
    email: str | None
    phone: str | None
    decision_role: str | None
    notes: str | None
    created_by_id: int
    created_at: datetime

class CompanyOut(BaseModel):
    id: int
    name: str
    company_type: str
    industry: str | None
    region: str | None
    website: str | None
    address: str | None
    notes: str | None
    visibility: str
    created_by_id: int
    contacts: list[ContactOut]
    access_user_ids: list[int] = []
    edit_user_ids: list[int] = []
