from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class OTPRequest(BaseModel):
    identifier: EmailStr = Field(..., description="A valid email address is required.")

class OTPVerify(BaseModel):
    identifier: EmailStr
    code: str

class GoogleLogin(BaseModel):
    token: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    profession: Optional[str] = None
    source: Optional[str] = None
    bio: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    devto_api_key: Optional[str] = None # NEW
    hashnode_api_key: Optional[str] = None # NEW
    hashnode_publication_id: Optional[str] = None # NEW

class UserOut(BaseModel):
    id: int
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    gender: Optional[str] = None
    profession: Optional[str] = None
    source: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    onboarding_completed: bool
    is_admin: bool
    credits_left: int
    is_premium: bool
    devto_api_key: Optional[str] = None
    hashnode_api_key: Optional[str] = None # NEW
    hashnode_publication_id: Optional[str] = None # NEW
    # NEW
