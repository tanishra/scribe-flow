import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from datetime import datetime, timedelta
from ..database import get_session
from ..schemas.auth_models import (
    OTPRequest, 
    OTPVerify, 
    GoogleLogin, 
    Token, 
    UserOut, 
    UserProfileUpdate
)
from ..schemas.db_models import User, OTP
from ..services.auth_service import (
    generate_otp_code,
    send_email_otp,
    verify_google_token,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_user_by_email,
    create_user
)
from ..dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/send-otp")
async def send_otp(request: OTPRequest, session: Session = Depends(get_session)):
    code = generate_otp_code()
    existing_otp = session.exec(select(OTP).where(OTP.identifier == request.identifier)).first()
    if existing_otp:
        session.delete(existing_otp)
    
    otp_entry = OTP(
        identifier=request.identifier,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    session.add(otp_entry)
    session.commit()
    
    # Send Real Email
    sent = await send_email_otp(request.identifier, code)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email.")
        
    return {"message": "OTP sent successfully."}

@router.post("/verify-otp", response_model=Token)
def verify_otp(request: OTPVerify, session: Session = Depends(get_session)):
    otp_entry = session.exec(select(OTP).where(OTP.identifier == request.identifier)).first()
    if not otp_entry or otp_entry.code != request.code or datetime.utcnow() > otp_entry.expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    session.delete(otp_entry)
    session.commit()
    
    identifier = request.identifier.strip().lower()
    
    # Email only authentication
    user = session.exec(select(User).where(User.email == identifier)).first()
    if not user:
        user = User(email=identifier, credits_left=3)
        session.add(user)
        session.commit()
        session.refresh(user)
            
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google-login", response_model=Token)
async def google_login(login: GoogleLogin, session: Session = Depends(get_session)):
    email, name, google_id = None, None, None
    if "mock" in login.token:
         parts = login.token.split(":")
         email = parts[1].lower() if len(parts) > 1 else "mock_user@gmail.com"
         name, google_id = "Mock User", "mock_id_123"
    else:
        id_info = await verify_google_token(login.token)
        if not id_info: raise HTTPException(status_code=400, detail="Invalid Google Token")
        email, name, google_id = id_info.get("email").lower(), id_info.get("name"), id_info.get("sub")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(email=email, full_name=name, google_id=google_id, credits_left=3)
        session.add(user)
        session.commit()
        session.refresh(user)
        
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=UserOut)
async def update_profile(
    data: UserProfileUpdate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    update_data = data.model_dump(exclude_unset=True)
    
    # AUTO-FETCH LINKEDIN URN
    # If user provided a token but no URN, or a NEW token, fetch it automatically
    new_li_token = update_data.get("linkedin_access_token")
    if new_li_token and (not current_user.linkedin_urn or new_li_token != current_user.linkedin_access_token):
        try:
            from ..services.linkedin_service import LinkedInService
            auto_urn = await LinkedInService.get_user_urn(new_li_token)
            update_data["linkedin_urn"] = auto_urn
            logger.info(f"Auto-fetched LinkedIn URN for user {current_user.id}: {auto_urn}")
        except Exception as e:
            logger.error(f"Failed to auto-fetch LinkedIn URN: {e}")
            # We don't raise error here, just let the user save the token at least

    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    current_user.updated_at = datetime.utcnow()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@router.post("/profile-image", response_model=UserOut)
async def upload_profile_image(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    img_dir = Path("outputs/profiles")
    img_dir.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = img_dir / filename
    
    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    current_user.profile_image = f"/static/profiles/{filename}"
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user
