from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str = "member"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str
    role: str
    is_active: bool