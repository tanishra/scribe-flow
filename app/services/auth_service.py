import os
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from sqlmodel import Session, select
from ..schemas.db_models import User, OTP
from ..services.logging_service import logger
from google.oauth2 import id_token
from google.auth.transport import requests

# Secure keys
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_PLEASE_CHANGE")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 

# SMTP Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER") # Your email
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD") # Your App Password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

def generate_otp_code(length=6) -> str:
    return "".join(random.choices(string.digits, k=length))

async def send_email_otp(receiver_email: str, code: str):
    """
    Sends a real OTP email to the user.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP_USER or SMTP_PASSWORD not set. Falling back to console log.")
        logger.info(f"--- MOCK OTP FOR {receiver_email}: {code} ---")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"ScribeFlow AI <{SMTP_USER}>"
        msg['To'] = receiver_email
        msg['Subject'] = f"{code} is your ScribeFlow verification code"

        body = f"""
        <html>
            <body style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2563eb;">Welcome to ScribeFlow AI</h2>
                <p>Use the following code to sign in to your account:</p>
                <div style="background: #f3f4f6; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    {code}
                </div>
                <p style="font-size: 12px; color: #666;">This code will expire in 5 minutes. If you didn't request this, please ignore this email.</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, receiver_email, msg.as_string())
        
        logger.info(f"OTP successfully sent to {receiver_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

async def verify_google_token(token: str) -> Optional[dict]:
    try:
        return id_token.verify_oauth2_token(token, requests.Request())
    except ValueError:
        return None

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    return session.exec(select(User).where(User.email == email)).first()

def create_user(session: Session, email: str = None, google_id: str = None, name: str = None) -> User:
    user = User(email=email, google_id=google_id, full_name=name, credits_left=3, is_premium=False)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
