from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    full_name: str
    position: str | None = None
    password: str
    role_id: int


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    position: str | None = None
    role: str
    is_active: bool
    must_change_password: bool
    role_code: str = "user"
    permissions: list[str] = []


class UserRoleUpdate(BaseModel):
    role_id: int


class UserPositionUpdate(BaseModel):
    position: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class AdminResetPasswordRequest(BaseModel):
    new_password: str


class UserCreateResponse(UserResponse):
    pass
