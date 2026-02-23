import uuid
import json
import os
import markdown
import asyncio
from typing import Dict, Optional, List, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException, APIRouter, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pathlib import Path
from sqlmodel import Session, select
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import HTMLResponse

# Internal package imports
from .main import run, stream_run
from .services.logging_service import logger
from .database import create_db_and_tables, get_session
from .routers import auth, payment, support, admin, publish
from .dependencies import get_current_user
from .schemas.db_models import User, Blog
from .schemas.models import Plan, EvidenceItem
from .utils.slug import slugify

# --- Security & Rate Limiting ---
limiter = Limiter(key_func=get_remote_address)
generation_semaphore = asyncio.Semaphore(2)

# Global task tracker to allow cancellation
# Maps job_id -> asyncio.Task
running_tasks: Dict[str, asyncio.Task] = {}

# Initialize FastAPI app
app = FastAPI(
    title="AuthoGraph AI API",
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
    # logger.info(f"Response status: {response.status_code}")
    return response

# --- PERMISSIVE CORS (For Debugging) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom StaticFiles
class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

static_dir = Path("outputs")
static_dir.mkdir(parents=True, exist_ok=True)
(static_dir / "images").mkdir(parents=True, exist_ok=True)
(static_dir / "profiles").mkdir(parents=True, exist_ok=True)
(static_dir / "blogs").mkdir(parents=True, exist_ok=True)
app.mount("/static", CORSStaticFiles(directory="outputs"), name="static")

# --- STREAM MANAGER ---
class StreamManager:
    def __init__(self):
        self.queues: Dict[str, asyncio.Queue] = {}

    def create(self, job_id: str):
        self.queues[job_id] = asyncio.Queue()

    def _make_serializable(self, obj):
        """Recursively convert Pydantic models or other non-serializable objects to dicts."""
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        if isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        return obj

    async def push(self, job_id: str, event: str, data: Any):
        if job_id in self.queues:
            serializable_data = self._make_serializable(data)
            await self.queues[job_id].put({"event": event, "data": serializable_data})

    async def generator(self, job_id: str):
        q = self.queues.get(job_id)
        if not q:
            logger.error(f"Worker {os.getpid()} - No queue found for job {job_id}. This request likely hit the wrong Gunicorn worker.")
            yield f"event: error\ndata: {json.dumps({'message': 'Stream queue not found on this worker'})}\n\n"
            return
            
        logger.info(f"Worker {os.getpid()} - Starting stream for job {job_id}")
        try:
            while True:
                try:
                    # Wait for message with a timeout to send heartbeats
                    msg = await asyncio.wait_for(q.get(), timeout=15.0)
                    
                    if msg["event"] == "end":
                        yield f"event: end\ndata: {json.dumps(msg['data'])}\n\n"
                        break
                        
                    yield f"event: {msg['event']}\ndata: {json.dumps(msg['data'])}\n\n"
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive and bypass proxy buffering
                    yield f"event: ping\ndata: {json.dumps({'time': datetime.utcnow().isoformat()})}\n\n"
                    
        except asyncio.CancelledError:
            logger.info(f"Worker {os.getpid()} - Client disconnected from stream {job_id}")
        finally:
            self.queues.pop(job_id, None)

stream_manager = StreamManager()

# --- Pydantic Models ---

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
    meta_description: Optional[str] = None
    keywords: Optional[str] = None
    tone: Optional[str] = None

# --- Background Task ---

async def generate_blog_task_streaming(job_id: str, topic: str, tone: str):
    """Background worker that pushes updates to the StreamManager."""
    async with generation_semaphore:
        logger.info(f"Streaming task started for Job ID: {job_id}")
        
        # 1. Update DB to Processing
        with next(get_session()) as session:
            db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
            if db_blog:
                db_blog.status = "processing"
                session.add(db_blog)
                session.commit()

        try:
            final_output = {}
            
            # 2. Run the Streaming Workflow
            async for event_type, event_data in stream_run(topic, tone=tone):
                # Push to SSE stream
                await stream_manager.push(job_id, event_type, event_data)
                
                # Accumulate state data as it arrives
                if event_type in ["plan", "evidence", "image_specs", "seo"]:
                    final_output[event_type] = event_data
                elif event_type == "complete":
                    final_output.update(event_data)

            # 3. Process Result (Persistence)
            if final_output.get("plan") or final_output.get("final"):
                plan = final_output.get("plan")
                evidence = final_output.get("evidence", [])
                image_specs = final_output.get("image_specs", [])
                seo_data = final_output.get("seo", {})
                
                raw_title = "Unknown Title"
                if plan:
                    raw_title = plan.blog_title if hasattr(plan, "blog_title") else plan.get("blog_title", "Unknown Title")
                
                safe_name = slugify(raw_title)
                download_url = f"/static/blogs/{safe_name}.md"
                image_urls = [f"/static/images/{spec['filename']}" for spec in image_specs]

                # Serialization logic
                plan_dict = plan.model_dump() if hasattr(plan, "model_dump") else plan
                evidence_list = []
                for e in evidence:
                    if hasattr(e, "model_dump"): evidence_list.append(e.model_dump())
                    elif isinstance(e, dict): evidence_list.append(e)
                    else: evidence_list.append(str(e))

                with next(get_session()) as session:
                    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
                    if db_blog:
                        db_blog.status = "completed"
                        db_blog.title = raw_title
                        db_blog.download_url = download_url
                        db_blog.plan_json = json.dumps(plan_dict) if plan_dict else db_blog.plan_json
                        db_blog.evidence_json = json.dumps(evidence_list) if evidence_list else db_blog.evidence_json
                        db_blog.images_json = json.dumps(image_urls) if image_urls else db_blog.images_json
                        db_blog.meta_description = seo_data.get("meta_description") if seo_data else db_blog.meta_description
                        db_blog.keywords = seo_data.get("keywords") if seo_data else db_blog.keywords
                        db_blog.updated_at = datetime.utcnow()
                        session.add(db_blog)
                        session.commit()
                
                await stream_manager.push(job_id, "end", {"status": "completed"})
            else:
                with next(get_session()) as session:
                    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
                    if db_blog and db_blog.status == "completed":
                        await stream_manager.push(job_id, "end", {"status": "completed"})
                        return
                raise Exception("Workflow finished but returned no output.")
        except asyncio.CancelledError:
            logger.warning(f"Job {job_id} was CANCELLED mid-execution. Refunding credit.")
            with next(get_session()) as session:
                db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
                if db_blog:
                    db_user = session.get(User, db_blog.user_id)
                    db_blog.status = "abandoned"
                    if db_user:
                        db_user.credits_left += 1 # REFUND
                        session.add(db_user)
                    session.add(db_blog)
                    session.commit()
            await stream_manager.push(job_id, "end", {"status": "cancelled"})
        except Exception as e:
            logger.error(f"Error in streaming job {job_id}: {str(e)}", exc_info=True)
            with next(get_session()) as session:
                db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
                if db_blog:
                    db_blog.status = "failed"
                    db_blog.error = str(e)
                    session.add(db_blog)
                    session.commit()
            await stream_manager.push(job_id, "error", str(e))
            await stream_manager.push(job_id, "end", {"status": "failed"})
        finally:
            running_tasks.pop(job_id, None)

# --- API Router Setup ---

@app.on_event("startup")
def on_startup():
    if os.path.exists("database.db"):
        try: os.chmod("database.db", 0o666)
        except: pass
    create_db_and_tables()

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(payment.router)
api_router.include_router(support.router)
api_router.include_router(admin.router)
api_router.include_router(publish.router)

@api_router.get("/stream/{job_id}")
async def stream_job_events(job_id: str):
    """
    SSE Endpoint for real-time updates.
    Includes headers to prevent Nginx/Reverse Proxy buffering.
    """
    return StreamingResponse(
        stream_manager.generator(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Critical for Nginx
        }
    )

@api_router.post("/cancel/{job_id}")
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Aborts a running asyncio task and triggers the refund in the worker's except block."""
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job_id in running_tasks:
        running_tasks[job_id].cancel()
        return {"status": "cancelling", "message": "Task termination signal sent."}
    
    # If it wasn't running but was queued/processing in DB, handle it
    if db_blog.status in ["queued", "processing"]:
        db_blog.status = "abandoned"
        current_user.credits_left += 1 # Refund
        session.add(db_blog)
        session.add(current_user)
        session.commit()
        return {"status": "cancelled", "message": "Job marked as abandoned and credit refunded."}
        
    return {"status": "error", "message": "Job is not in a cancellable state."}

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
    
    # Create the Queue for this job
    stream_manager.create(job_id)
    
    new_blog = Blog(
        job_id=job_id, 
        user_id=current_user.id, 
        topic=blog_req.topic, 
        tone=blog_req.tone,
        status="queued"
    )
    session.add(new_blog)
    
    db_user = session.get(User, current_user.id)
    if not db_user: raise HTTPException(status_code=404, detail="User not found")
    db_user.credits_left -= 1
    session.add(db_user)
    session.commit()
    
    # Use asyncio.create_task instead of background_tasks to allow tracking/cancellation
    task = asyncio.create_task(generate_blog_task_streaming(job_id, blog_req.topic, blog_req.tone))
    running_tasks[job_id] = task
    
    return {"job_id": job_id}

# --- Standard Endpoints (Status, History, Public) ---
@api_router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, session: Session = Depends(get_session)):
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog: raise HTTPException(status_code=404, detail="Job not found")

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
        "keywords": db_blog.keywords,
        "tone": db_blog.tone
    }

@api_router.patch("/blogs/{job_id}")
async def update_blog_content(
    job_id: str, 
    update_req: UpdateBlogRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog: raise HTTPException(status_code=404, detail="Blog not found")
    if db_blog.user_id != current_user.id and not current_user.is_admin: raise HTTPException(status_code=403, detail="Not authorized")

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
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed": raise HTTPException(status_code=404, detail="Blog not found or not ready")
    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists(): content = file_path.read_text(encoding="utf-8")
    return {"title": db_blog.title, "content": content, "meta_description": db_blog.meta_description, "author": "AuthoGraph User"}

@api_router.get("/history", response_model=List[JobStatusResponse])
async def get_history(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(Blog).where(Blog.user_id == current_user.id).order_by(Blog.created_at.desc())
    blogs = session.exec(statement).all()
    return [
        {
            "job_id": b.job_id, "status": b.status, "blog_title": b.title or b.topic,
            "download_url": b.download_url, "images": json.loads(b.images_json) if b.images_json else [],
            "plan": json.loads(b.plan_json) if b.plan_json else None,
            "evidence": json.loads(b.evidence_json) if b.evidence_json else [],
            "error": b.error
        } for b in blogs
    ]

# Public render endpoint for Medium
@api_router.get("/public/render/{job_id}", response_class=HTMLResponse)
async def render_public_blog(job_id: str, session: Session = Depends(get_session)):
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed": raise HTTPException(status_code=404, detail="Blog not found")
    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists(): content = file_path.read_text(encoding="utf-8")
    import markdown
    html_body = markdown.markdown(content, extensions=['extra', 'codehilite', 'toc'])
    api_base_url = "https://api.tanish.website"
    html_body = html_body.replace('src="/static/', f'src="{api_base_url}/static/')
    title = db_blog.title or "AuthoGraph AI Blog"
    description = (db_blog.meta_description or "")[:160]
    canonical_url = f"https://scribe-flow-sable.vercel.app/share/{job_id}"
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{title}</title><meta name="description" content="{description}"><link rel="canonical" href="{canonical_url}"><meta name="author" content="AuthoGraph AI"><style>body {{ font-family: Georgia, serif; line-height: 1.8; max-width: 740px; margin: 50px auto; padding: 20px; color: #292929; }} h1 {{ font-family: sans-serif; font-size: 42px; }} img {{ max-width: 100%; height: auto; display: block; margin: 2em auto; }} pre {{ background: #f4f4f4; padding: 20px; overflow-x: auto; }}</style></head><body><article><header><h1>{title}</h1></header><section class="content">{html_body}</section></article></body></html>"""

app.include_router(api_router)
