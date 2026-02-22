from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, delete
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from pathlib import Path
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
    total_users = session.exec(select(func.count(User.id))).one()
    total_blogs = session.exec(select(func.count(Blog.id))).one()
    total_feedback = session.exec(select(func.count(Feedback.id))).one()
    premium_users = session.exec(select(func.count(User.id)).where(User.is_premium == True)).one()
    
    # Integration Stats
    devto_published = session.exec(select(func.count(Blog.id)).where(Blog.devto_url != None)).one()
    hashnode_published = session.exec(select(func.count(Blog.id)).where(Blog.hashnode_url != None)).one()
    
    estimated_revenue = premium_users * 499 

    return {
        "total_users": total_users,
        "total_blogs": total_blogs,
        "total_feedback": total_feedback,
        "premium_users": premium_users,
        "estimated_revenue": estimated_revenue,
        "devto_published": devto_published,
        "hashnode_published": hashnode_published
    }

@router.get("/analytics/growth")
async def get_growth_data(session: Session = Depends(get_session), _ = Depends(check_admin)):
    growth = []
    for i in range(6, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).date()
        count = session.exec(select(func.count(User.id)).where(func.date(User.created_at) <= date)).one()
        growth.append({"date": date.strftime("%b %d"), "users": count})
    return growth

@router.get("/users", response_model=List[User])
async def list_users(session: Session = Depends(get_session), _ = Depends(check_admin)):
    return session.exec(select(User).order_by(User.created_at.desc())).all()

@router.post("/users/{user_id}/credits")
async def update_user_credits(
    user_id: int, 
    credits: int = Query(...), 
    session: Session = Depends(get_session), 
    _ = Depends(check_admin)
):
    """Admin only: Manually update a user's credit balance."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.credits_left = credits
    session.add(user)
    session.commit()
    return {"status": "success", "message": f"Credits updated to {credits}"}

@router.delete("/users/{user_id}")
async def toggle_user_status(user_id: int, session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Soft Delete: Mark user as inactive instead of deleting history."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Toggle active status
    user.is_active = not user.is_active
    session.add(user)
    session.commit()
    status = "Deactivated" if not user.is_active else "Activated"
    return {"status": "success", "message": f"User account {status}."}

@router.get("/blogs")
async def list_all_blogs(session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Join Blog and User tables to show who created what."""
    statement = select(Blog, User.full_name, User.email).join(User, Blog.user_id == User.id).order_by(Blog.created_at.desc())
    results = session.exec(statement).all()
    
    blogs_with_users = []
    for blog, name, email in results:
        blog_dict = blog.model_dump()
        blog_dict["user_name"] = name or "Anonymous"
        blog_dict["user_email"] = email
        blogs_with_users.append(blog_dict)
        
    return blogs_with_users

@router.get("/blogs/{job_id}")
async def get_blog_detail(job_id: str, session: Session = Depends(get_session), _ = Depends(check_admin)):
    """Fetch full blog content and details for admin review."""
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")
            
    return {
        "blog": db_blog,
        "content": content
    }

@router.get("/feedback", response_model=List[Feedback])
async def list_feedback(session: Session = Depends(get_session), _ = Depends(check_admin)):
    return session.exec(select(Feedback).order_by(Feedback.created_at.desc())).all()
