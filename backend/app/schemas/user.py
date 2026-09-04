from pydantic import BaseModel, ConfigDict


# =========================================================
# USER CREATE
# =========================================================

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role_id: int


# =========================================================
# LOGIN
# =========================================================

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


# =========================================================
# USER RESPONSE
# =========================================================

class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    must_change_password: bool


# =========================================================
# ROLE
# =========================================================

class UserRoleUpdate(BaseModel):
    role_id: int


# =========================================================
# CHANGE PASSWORD
# =========================================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


# =========================================================
# ADMIN RESET PASSWORD
# =========================================================

class AdminResetPasswordRequest(BaseModel):
    new_password: str


# =========================================================
# USER CREATE RESPONSE
# =========================================================

class UserCreateResponse(UserResponse):
    pass