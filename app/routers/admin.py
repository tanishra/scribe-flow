from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func, delete
from typing import List, Optional
from datetime import datetime, timedelta
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
    
    # Calculate revenue (Approximate based on Premium users)
    # 499 for basic, 999 for pro - let's assume average 600 per premium user for stats
    estimated_revenue = premium_users * 499 

    return {
        "total_users": total_users,
        "total_blogs": total_blogs,
        "total_feedback": total_feedback,
        "premium_users": premium_users,
        "estimated_revenue": estimated_revenue
    }

@router.get("/analytics/growth")
async def get_growth_data(session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Returns data for a growth chart (last 7 days)."""
    growth = []
    for i in range(6, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).date()
        count = session.exec(select(func.count(User.id)).where(func.date(User.created_at) <= date)).one()
        growth.append({"date": date.strftime("%b %d"), "users": count})
    return growth

@router.get("/users", response_model=List[User])
async def list_users(session: Session = Depends(get_session), _ = Depends(check_admin)):
    return session.exec(select(User).order_by(User.created_at.desc())).all()

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Hard delete a user and all their blogs."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete their blogs first
    session.exec(delete(Blog).where(Blog.user_id == user_id))
    session.delete(user)
    session.commit()
    return {"status": "success", "message": "User and associated data deleted."}

@router.post("/users/{user_id}/credits")
async def update_user_credits(user_id: int, credits: int, session: Session = Depends(get_session), _ = Depends(check_admin)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.credits_left = credits
    session.add(user)
    session.commit()
    return {"status": "success"}

@router.get("/blogs")
async def list_all_blogs(session: Session = Depends(get_session), _ = Depends(check_admin)):
    """View every blog generated on the platform."""
    return session.exec(select(Blog).order_by(Blog.created_at.desc())).all()

@router.get("/feedback", response_model=List[Feedback])
async def list_feedback(session: Session = Depends(get_session), _ = Depends(check_admin)):
    return session.exec(select(Feedback).order_by(Feedback.created_at.desc())).all()
