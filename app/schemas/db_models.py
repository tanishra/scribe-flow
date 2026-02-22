from typing import Optional, List
from sqlmodel import Field, SQLModel, Column, JSON
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: Optional[str] = Field(default=None, index=True)
    google_id: Optional[str] = Field(default=None, index=True)
    full_name: Optional[str] = Field(default=None)
    
    gender: Optional[str] = Field(default=None)
    profession: Optional[str] = Field(default=None)
    source: Optional[str] = Field(default=None) 
    bio: Optional[str] = Field(default=None)
    profile_image: Optional[str] = Field(default=None)
    
    onboarding_completed: bool = Field(default=False)
    is_admin: bool = Field(default=False)
    
    is_active: bool = Field(default=True)
    password_hash: Optional[str] = Field(default=None)
    
    credits_left: int = Field(default=3) 
    is_premium: bool = Field(default=False)
    
    # Integrations
    devto_api_key: Optional[str] = Field(default=None)
    hashnode_api_key: Optional[str] = Field(default=None) # NEW
    hashnode_publication_id: Optional[str] = Field(default=None) # NEW
    medium_token: Optional[str] = Field(default=None) # NEW
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Blog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: str = Field(index=True, unique=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    topic: str
    title: Optional[str] = None
    tone: Optional[str] = Field(default="Professional")
    
    status: str = "queued" 
    download_url: Optional[str] = None
    
    plan_json: Optional[str] = Field(default=None)
    evidence_json: Optional[str] = Field(default=None)
    images_json: Optional[str] = Field(default=None)
    
    # SEO Fields
    meta_description: Optional[str] = Field(default=None)
    keywords: Optional[str] = Field(default=None)
    
    # Publishing
    devto_url: Optional[str] = Field(default=None)
    hashnode_url: Optional[str] = Field(default=None) # NEW
    medium_url: Optional[str] = Field(default=None) # NEW
    
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    subject: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OTP(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    identifier: str = Field(index=True)
    code: str
    expires_at: datetime
    is_verified: bool = Field(default=False)
