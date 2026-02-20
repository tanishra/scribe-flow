from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from ..services.auth_service import SMTP_USER, SMTP_PASSWORD, SMTP_SERVER, SMTP_PORT
from ..dependencies import get_current_user
from ..schemas.db_models import User
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
async def send_feedback(req: FeedbackRequest):
    """Sends user feedback to tanishrajput9@gmail.com"""
    if not SMTP_USER or not SMTP_PASSWORD:
        raise HTTPException(status_code=500, detail="Mail server not configured.")

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = "tanishrajput9@gmail.com"
        msg['Subject'] = f"ScribeFlow Feedback: {req.subject}"

        body = f"""
        <h3>New Support Message from {req.name}</h3>
        <p><strong>User Email:</strong> {req.email}</p>
        <p><strong>Subject:</strong> {req.subject}</p>
        <hr/>
        <p><strong>Message:</strong></p>
        <p>{req.message}</p>
        """
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, "tanishrajput9@gmail.com", msg.as_string())
        
        return {"status": "success", "message": "Feedback sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send feedback: {str(e)}")
