import uuid
import json
import os
from typing import Dict, Optional, List, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, APIRouter, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pathlib import Path
from sqlmodel import Session, select
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Internal package imports
from .main import run
from .services.logging_service import logger
from .database import create_db_and_tables, get_session
from .routers import auth, payment, support, admin, publish
from .dependencies import get_current_user
from .schemas.db_models import User, Blog
from .schemas.models import Plan, EvidenceItem
from .utils.slug import slugify

# --- Security & Rate Limiting ---
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="ScribeFlow AI API",
    description="A production-grade API for generating high-impact blogs using LangGraph and AI agents.",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- DEBUG LOGGER ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# --- PERMISSIVE CORS (For Debugging) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom StaticFiles to ensure CORS headers are sent for images
class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

# Serve generated images as static files
static_dir = Path("outputs")
static_dir.mkdir(parents=True, exist_ok=True)
(static_dir / "images").mkdir(parents=True, exist_ok=True)
(static_dir / "profiles").mkdir(parents=True, exist_ok=True)
(static_dir / "blogs").mkdir(parents=True, exist_ok=True)
app.mount("/static", CORSStaticFiles(directory="outputs"), name="static")

# --- Pydantic Models for API Requests/Responses ---

class BlogRequest(BaseModel):
    topic: str = Field(..., description="The subject of the blog to be generated.")
    tone: Optional[str] = Field("Professional", description="The tone/style of the blog.")
    as_of: Optional[str] = Field(None, description="Optional date context for news-based blogs.")

class UpdateBlogRequest(BaseModel):
    content: str = Field(..., description="The updated markdown content.")

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    blog_title: Optional[str] = None
    download_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    plan: Optional[Any] = None
    evidence: Optional[List[Any]] = None
    error: Optional[str] = None
    # SEO Fields
    meta_description: Optional[str] = None
    keywords: Optional[str] = None

# --- Background Task ---

async def generate_blog_task(job_id: str, topic: str, tone: str):
    """Background worker to run the LangGraph workflow."""
    logger.info(f"Background task started for Job ID: {job_id}")
    try:
        with next(get_session()) as session:
            db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
            if db_blog:
                db_blog.status = "processing"
                session.add(db_blog)
                session.commit()

        # Run the main generation logic with TONE
        result = await run(topic, tone=tone)
        
        # Extract results
        plan = result.get("plan")
        evidence = result.get("evidence", [])
        image_specs = result.get("image_specs", [])
        seo_data = result.get("seo", {}) 
        
        # Construct Safe URLs
        raw_title = plan.blog_title if plan else "Unknown Title"
        safe_name = slugify(raw_title)
        download_url = f"/static/blogs/{safe_name}.md"
        image_urls = [f"/static/images/{spec['filename']}" for spec in image_specs]

        # Serialization
        plan_dict = plan.model_dump() if hasattr(plan, "model_dump") else plan
        evidence_list = [e.model_dump() if hasattr(e, "model_dump") else e for e in evidence]

        # Update SQL Database
        with next(get_session()) as session:
            db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
            if db_blog:
                db_blog.status = "completed"
                db_blog.title = raw_title
                db_blog.download_url = download_url
                db_blog.plan_json = json.dumps(plan_dict)
                db_blog.evidence_json = json.dumps(evidence_list)
                db_blog.images_json = json.dumps(image_urls)
                
                # Save SEO Data
                db_blog.meta_description = seo_data.get("meta_description")
                db_blog.keywords = seo_data.get("keywords")
                
                db_blog.updated_at = datetime.utcnow()
                session.add(db_blog)
                session.commit()
        
        logger.info(f"Job {job_id} completed successfully.")
        
    except Exception as e:
        logger.error(f"Error in background job {job_id}: {str(e)}", exc_info=True)
        with next(get_session()) as session:
            db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
            if db_blog:
                db_blog.status = "failed"
                db_blog.error = str(e)
                session.add(db_blog)
                session.commit()

# --- API Router Setup ---

@app.on_event("startup")
def on_startup():
    # Fix SQLite permissions if it exists
    if os.path.exists("database.db"):
        try:
            os.chmod("database.db", 0o666)
        except:
            pass
    create_db_and_tables()

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(payment.router)
api_router.include_router(support.router)
api_router.include_router(admin.router)

@api_router.post("/generate", response_model=Dict[str, str], status_code=202)
@limiter.limit("5/minute")
async def create_blog_job(
    request: Request,
    blog_req: BlogRequest, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.credits_left <= 0:
        raise HTTPException(status_code=403, detail="Free tier limit reached. Please upgrade.")

    job_id = str(uuid.uuid4())
    logger.info(f"--- API REQUEST --- User ID: {current_user.id} | Topic: {blog_req.topic} | Tone: {blog_req.tone}")
    
    new_blog = Blog(
        job_id=job_id, 
        user_id=current_user.id, 
        topic=blog_req.topic, 
        tone=blog_req.tone,
        status="queued"
    )
    session.add(new_blog)
    
    # Universal credit deduction
    db_user = session.get(User, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.credits_left -= 1
    session.add(db_user)
    session.commit()
    
    background_tasks.add_task(generate_blog_task, job_id, blog_req.topic, blog_req.tone)
    
    return {"job_id": job_id}

@api_router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, session: Session = Depends(get_session)):
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": db_blog.job_id,
        "status": db_blog.status,
        "blog_title": db_blog.title or db_blog.topic,
        "download_url": db_blog.download_url,
        "images": json.loads(db_blog.images_json) if db_blog.images_json else [],
        "plan": json.loads(db_blog.plan_json) if db_blog.plan_json else None,
        "evidence": json.loads(db_blog.evidence_json) if db_blog.evidence_json else [],
        "error": db_blog.error,
        "meta_description": db_blog.meta_description,
        "keywords": db_blog.keywords
    }

@api_router.patch("/blogs/{job_id}")
async def update_blog_content(
    job_id: str, 
    update_req: UpdateBlogRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Allows user to edit and save their blog content."""
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    
    if not db_blog:
        raise HTTPException(status_code=404, detail="Blog not found")
        
    if db_blog.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this blog")

    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        
        try:
            file_path.write_text(update_req.content, encoding="utf-8")
            return {"status": "success", "message": "Blog updated successfully"}
        except Exception as e:
            logger.error(f"Failed to save blog edit: {e}")
            raise HTTPException(status_code=500, detail="Failed to save changes to file")
            
    raise HTTPException(status_code=400, detail="Blog file not found")

@api_router.get("/public/blogs/{job_id}")
async def get_public_blog(job_id: str, session: Session = Depends(get_session)):
    """Public read-only access to a blog."""
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    
    if not db_blog or db_blog.status != "completed":
        raise HTTPException(status_code=404, detail="Blog not found or not ready")
    
    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")

    return {
        "title": db_blog.title,
        "content": content,
        "meta_description": db_blog.meta_description,
        "author": "ScribeFlow User"
    }

@api_router.get("/history", response_model=List[JobStatusResponse])
async def get_history(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(Blog).where(Blog.user_id == current_user.id).order_by(Blog.created_at.desc())
    blogs = session.exec(statement).all()
    return [
        {
            "job_id": b.job_id,
            "status": b.status,
            "blog_title": b.title or b.topic,
            "download_url": b.download_url,
            "images": json.loads(b.images_json) if b.images_json else [],
            "plan": json.loads(b.plan_json) if b.plan_json else None,
            "evidence": json.loads(b.evidence_json) if b.evidence_json else [],
            "error": b.error
        }
        for b in blogs
    ]

app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
