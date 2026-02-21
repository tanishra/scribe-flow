from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pathlib import Path
import httpx
import json
from ..database import get_session
from ..schemas.db_models import User, Blog
from ..dependencies import get_current_user
from ..services.logging_service import logger

router = APIRouter(prefix="/publish", tags=["Publishing"])

@router.post("/devto/{job_id}")
async def publish_to_devto(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Posts the blog as a draft to Dev.to."""
    if not current_user.devto_api_key:
        raise HTTPException(status_code=400, detail="Dev.to API key not found in profile.")

    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed":
        raise HTTPException(status_code=404, detail="Blog not found or not completed.")

    if db_blog.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to publish this blog.")

    # Read content from file
    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")
    
    if not content:
        raise HTTPException(status_code=400, detail="Blog content is empty.")

    # Format for Dev.to
    # Dev.to expects a specific JSON structure
    # We add a canonical URL pointing to our public share link
    # And we fix image URLs to be absolute
    
    # Base URL for ScribeFlow (In Prod, this should be your Vercel domain)
    # For now, we'll try to detect it or use a placeholder
    scribe_flow_url = f"https://scribe-flow.vercel.app/share/{job_id}" # Update with actual domain if known
    
    # Fix relative images: /static/images/foo.png -> http://13.61.4.241:8000/static/images/foo.png
    # Dev.to needs absolute URLs to render images
    backend_url = "http://13.61.4.241:8000" # Your EC2 IP
    content = content.replace("(/static/", f"({backend_url}/static/")

    # Clean tags for Dev.to (must be strictly ALPHANUMERIC)
    raw_tags = [t.strip() for t in (db_blog.keywords or "ai, automation").split(",")]
    clean_tags = []
    for t in raw_tags:
        # Remove all non-alphanumeric characters (including hyphens and spaces)
        clean = "".join(c for c in t.lower() if c.isalnum())
        if clean and len(clean) >= 2:
            clean_tags.append(clean[:20]) # Dev.to limit is 20 chars
    
    payload = {
        "article": {
            "title": db_blog.title,
            "published": True, # Publish LIVE immediately
            "body_markdown": content,
            "description": db_blog.meta_description or "",
            "tags": clean_tags[:4], # Dev.to limit is 4 tags
            "canonical_url": scribe_flow_url
        }
    }

    headers = {
        "api-key": current_user.devto_api_key,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("https://dev.to/api/articles", json=payload, headers=headers)
            if response.status_code == 201:
                data = response.json()
                return {
                    "status": "success", 
                    "message": "Blog posted as draft to Dev.to!",
                    "url": data.get("url")
                }
            else:
                logger.error(f"Dev.to API error: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Dev.to Error: {response.text}")
        except Exception as e:
            logger.error(f"Failed to connect to Dev.to: {e}")
            raise HTTPException(status_code=500, detail="Failed to connect to Dev.to API.")
