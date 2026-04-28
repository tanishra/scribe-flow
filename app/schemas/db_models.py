from typing import Optional, List, Any
import os
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String, TypeDecorator
from sqlmodel import Field, SQLModel, Column, JSON

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if ENCRYPTION_KEY:
    fernet = Fernet(ENCRYPTION_KEY.encode())
else:
    fernet = None

class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if not fernet:
                raise ValueError("ENCRYPTION_KEY must be set in environment variables to encrypt data.")
            return fernet.encrypt(value.encode()).decode()
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if not fernet:
                raise ValueError("ENCRYPTION_KEY must be set in environment variables to decrypt data.")
            try:
                return fernet.decrypt(value.encode()).decode()
            except InvalidToken:
                # Fallback for existing plaintext tokens before encryption was enabled
                return value
        return value

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
    devto_api_key: Optional[str] = Field(default=None, sa_column=Column(EncryptedString))
    hashnode_api_key: Optional[str] = Field(default=None, sa_column=Column(EncryptedString)) # NEW
    hashnode_publication_id: Optional[str] = Field(default=None) # NEW
    medium_token: Optional[str] = Field(default=None, sa_column=Column(EncryptedString)) # NEW
    linkedin_access_token: Optional[str] = Field(default=None, sa_column=Column(EncryptedString))
    linkedin_urn: Optional[str] = Field(default=None)
    
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
    thoughts_json: Optional[str] = Field(default="[]")
    intermediate_content: Optional[str] = Field(default="")
    
    # SEO Fields
    meta_description: Optional[str] = Field(default=None)
    keywords: Optional[str] = Field(default=None)
    
    # Publishing
    devto_url: Optional[str] = Field(default=None)
    hashnode_url: Optional[str] = Field(default=None) # NEW
    medium_url: Optional[str] = Field(default=None) # NEW
    linkedin_url: Optional[str] = Field(default=None)
    
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    plan: str
    amount: int  # in paise
    credits_added: int
    razorpay_order_id: str
    razorpay_payment_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
