import os
import random
import string
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from sqlmodel import Session, select
from ..schemas.db_models import User, OTP
from ..services.logging_service import logger
from google.oauth2 import id_token
from google.auth.transport import requests

# Secure keys (should be in .env)
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_PLEASE_CHANGE")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def generate_otp_code(length=6) -> str:
    return "".join(random.choices(string.digits, k=length))

def send_mock_otp(identifier: str, code: str):
    """
    Simulate sending OTP via SMS/Email.
    In production, use Twilio/SendGrid here.
    """
    logger.info(f"--- MOCK OTP ---")
    logger.info(f"To: {identifier}")
    logger.info(f"Code: {code}")
    logger.info(f"--- END MOCK ---")
    return True

async def verify_google_token(token: str) -> Optional[dict]:
    try:
        # In production, replace specific CLIENT_ID
        id_info = id_token.verify_oauth2_token(token, requests.Request())
        return id_info
    except ValueError:
        return None

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()

def create_user(session: Session, email: str = None, google_id: str = None, name: str = None) -> User:
    user = User(
        email=email,
        google_id=google_id,
        full_name=name,
        credits_left=3,  # Free tier default
        is_premium=False
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
