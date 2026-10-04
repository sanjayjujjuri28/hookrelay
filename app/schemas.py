from pydantic import BaseModel,EmailStr

class UserCreate(BaseModel):
    email:EmailStr
    password:str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_verified: bool
    dev_otp: str | None = None
    message: str | None = None


class UserLogin(BaseModel):
    email:EmailStr
    password:str

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class WebhookCreate(BaseModel):
    name: str
    target_url: str


class WebhookResponse(BaseModel):
    id: int
    name: str
    target_url: str
    user_id: int
    is_active: bool

class WebhookUpdate(BaseModel):
    name: str
    target_url: str
    is_active: bool

class WebhookCreateResponse(BaseModel):
    id: int
    name: str
    target_url: str
    user_id: int
    is_active: bool
    secret: str
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: str
    reset_token: str
    new_password: str