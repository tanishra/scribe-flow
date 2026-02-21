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
    """Posts the blog LIVE to Dev.to. Supports re-publishing (updates)."""
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

    # Base URL for ScribeFlow
    scribe_flow_url = f"https://scribe-flow-sable.vercel.app/share/{job_id}"
    
    # Fix relative images to absolute URLs for Dev.to
    backend_url = "http://13.61.4.241:8000"
    content = content.replace("(/static/", f"({backend_url}/static/")

    # Clean tags for Dev.to (strictly ALPHANUMERIC)
    raw_tags = [t.strip() for t in (db_blog.keywords or "ai, automation").split(",")]
    clean_tags = []
    for t in raw_tags:
        clean = "".join(c for c in t.lower() if c.isalnum())
        if clean and len(clean) >= 2:
            clean_tags.append(clean[:20])
    
    payload = {
        "article": {
            "title": db_blog.title,
            "published": True,
            "body_markdown": content,
            "description": db_blog.meta_description or "",
            "tags": clean_tags[:4],
            "canonical_url": scribe_flow_url
        }
    }

    headers = {
        "api-key": current_user.devto_api_key,
        "Content-Type": "application/json"
    }

    # Logic: If devto_url already exists, we UPDATE. Otherwise, we CREATE.
    # Note: Dev.to update API requires the numeric ID of the article.
    # We can try to extract the ID from the URL if we have it.
    
    async with httpx.AsyncClient() as client:
        try:
            if db_blog.devto_url:
                # Update existing (requires numeric ID)
                # Example URL: https://dev.to/username/title-slug-12345
                # The ID is the last part of the slug.
                article_id = db_blog.devto_url.split("-")[-1]
                response = await client.put(f"https://dev.to/api/articles/{article_id}", json=payload, headers=headers)
                action = "updated"
            else:
                # Create new
                response = await client.post("https://dev.to/api/articles", json=payload, headers=headers)
                action = "posted"

            if response.status_code in [200, 201]:
                data = response.json()
                db_blog.devto_url = data.get("url")
                session.add(db_blog)
                session.commit()
                return {
                    "status": "success", 
                    "message": f"Blog {action} successfully on Dev.to!",
                    "url": data.get("url")
                }
            else:
                # If update failed (maybe ID changed), fallback to a fresh POST
                # Dev.to usually blocks this via canonical_url, so we report the error.
                logger.error(f"Dev.to API error: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Dev.to Error: {response.text}")
        except Exception as e:
            logger.error(f"Failed to connect to Dev.to: {e}")
            raise HTTPException(status_code=500, detail="Failed to connect to Dev.to API.")
