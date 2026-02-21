from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List
from ..database import get_session
from ..schemas.db_models import User, Blog, Feedback
from ..dependencies import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

def check_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

@router.get("/stats")
async def get_stats(session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Overview statistics for the dashboard."""
    total_users = session.exec(select(func.count(User.id))).one()
    total_blogs = session.exec(select(func.count(Blog.id))).one()
    total_feedback = session.exec(select(func.count(Feedback.id))).one()
    premium_users = session.exec(select(func.count(User.id)).where(User.is_premium == True)).one()
    
    return {
        "total_users": total_users,
        "total_blogs": total_blogs,
        "total_feedback": total_feedback,
        "premium_users": premium_users
    }

@router.get("/users", response_model=List[User])
async def list_users(session: Session = Depends(get_session), _ = Depends(check_admin)):
    """List all registered users."""
    return session.exec(select(User).order_by(User.created_at.desc())).all()

@router.get("/feedback", response_model=List[Feedback])
async def list_feedback(session: Session = Depends(get_session), _ = Depends(check_admin)):
    """List all support messages."""
    return session.exec(select(Feedback).order_by(Feedback.created_at.desc())).all()

@router.post("/users/{user_id}/credits")
async def update_user_credits(user_id: int, credits: int, session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Manually adjust user credits."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.credits_left = credits
    session.add(user)
    session.commit()
    return {"status": "success"}
