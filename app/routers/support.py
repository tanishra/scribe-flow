from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel, EmailStr
from ..services.auth_service import SMTP_USER, SMTP_PASSWORD, SMTP_SERVER, SMTP_PORT
from ..database import get_session
from ..schemas.db_models import Feedback
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/support", tags=["Support"])

class FeedbackRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@router.post("/send")
async def send_feedback(req: FeedbackRequest, session: Session = Depends(get_session)):
    """Sends user feedback to admin and saves to DB"""
    # 1. Save to DB
    new_feedback = Feedback(
        name=req.name,
        email=req.email,
        subject=req.subject,
        message=req.message
    )
    session.add(new_feedback)
    session.commit()

    # 2. Send Email
    if not SMTP_USER or not SMTP_PASSWORD:
        return {"status": "success", "message": "Saved to DB (Email skipped)"}

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = "tanishrajput9@gmail.com"
        msg['Subject'] = f"ScribeFlow Feedback: {req.subject}"
        body = f"Support Message from {req.name} ({req.email})\n\n{req.message}"
        msg.attach(MIMEText(body, 'plain'))
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, "tanishrajput9@gmail.com", msg.as_string())
    except:
        pass # Still return success if DB save worked
        
    return {"status": "success", "message": "Feedback received!"}
