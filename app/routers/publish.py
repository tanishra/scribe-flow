from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pathlib import Path
import httpx
import json
import re
from ..database import get_session
from ..schemas.db_models import User, Blog
from ..dependencies import get_current_user
from ..services.logging_service import logger
from ..services.linkedin_service import LinkedInService
from ..utils.slug import slugify
from ..utils.hashnode_slug import slugify_hashnode

router = APIRouter(prefix="/publish", tags=["Publishing"])

@router.get("/linkedin/teaser/{job_id}")
async def get_linkedin_teaser(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Generates an attractive LinkedIn teaser for the blog."""
    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed":
        raise HTTPException(status_code=404, detail="Blog not found or not completed.")

    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")
    
    if not content:
        raise HTTPException(status_code=400, detail="Blog content is empty.")

    try:
        teaser = await LinkedInService.generate_teaser(content, db_blog.title)
        return {"teaser": teaser}
    except Exception as e:
        logger.error(f"Failed to generate LinkedIn teaser: {e}")
        raise HTTPException(status_code=500, detail="AI failed to generate teaser.")

@router.post("/linkedin/{job_id}")
async def publish_to_linkedin(
    job_id: str,
    teaser_text: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Publishes the teaser + article link to LinkedIn."""
    if not current_user.linkedin_access_token or not current_user.linkedin_urn:
        raise HTTPException(status_code=400, detail="LinkedIn credentials (Token/URN) missing in profile.")

    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed":
        raise HTTPException(status_code=404, detail="Blog not found or not completed.")

    article_url = f"https://scribe-flow-sable.vercel.app/share/{job_id}"
    
    try:
        result = await LinkedInService.publish_post(
            current_user.linkedin_access_token,
            current_user.linkedin_urn,
            teaser_text,
            article_url,
            db_blog.title
        )
        
        db_blog.linkedin_url = f"https://www.linkedin.com/feed/update/{result['urn']}"
        session.add(db_blog)
        session.commit()
        
        return {"status": "success", "message": "Successfully posted to LinkedIn!", "url": db_blog.linkedin_url}
    except Exception as e:
        logger.error(f"LinkedIn Publishing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")
    
    if not content:
        raise HTTPException(status_code=400, detail="Blog content is empty.")

    scribe_flow_url = f"https://scribe-flow-sable.vercel.app/share/{job_id}"
    backend_url = "https://api.tanish.website"
    content = content.replace("(/static/", f"({backend_url}/static/")

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

    async with httpx.AsyncClient() as client:
        try:
            if db_blog.devto_url:
                article_id = db_blog.devto_url.split("-")[-1]
                response = await client.put(f"https://dev.to/api/articles/{article_id}", json=payload, headers=headers)
                action = "updated"
            else:
                response = await client.post("https://dev.to/api/articles", json=payload, headers=headers)
                action = "posted"

            if response.status_code in [200, 201]:
                data = response.json()
                db_blog.devto_url = data.get("url")
                session.add(db_blog)
                session.commit()
                return {"status": "success", "message": f"Blog {action} successfully on Dev.to!", "url": data.get("url")}
            else:
                raise HTTPException(status_code=response.status_code, detail=f"Dev.to Error: {response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/hashnode/{job_id}")
async def publish_to_hashnode(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Publishes the blog to Hashnode via GraphQL API."""
    if not current_user.hashnode_api_key or not current_user.hashnode_publication_id:
        raise HTTPException(status_code=400, detail="Hashnode API Key or Publication ID missing.")

    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed":
        raise HTTPException(status_code=404, detail="Blog not found or not completed.")

    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")

    scribe_flow_url = f"https://scribe-flow-sable.vercel.app/share/{job_id}"
    backend_url = "https://api.tanish.website"
    
    # Replace all static paths with absolute URLs
    content = content.replace("(/static/", f"({backend_url}/static/")

    # Find first image for the cover image
    cover_image_url = None
    img_match = re.search(r"!\[.*?\]\((http[s]?://.*?/static/images/.*?)\)", content)
    if img_match:
        cover_image_url = img_match.group(1)
    elif "/static/images/" in content:
        # Fallback if first replace didn't catch it for some reason
        img_match = re.search(r"!\[.*?\]\((/static/images/.*?)\)", content)
        if img_match:
            cover_image_url = f"{backend_url}{img_match.group(1)}"

    # Hashnode GraphQL Mutation
    query = """
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          url
          id
        }
      }
    }
    """
    
    # Hashnode requires a specific tag format (slug and name)
    raw_tags = [t.strip() for t in (db_blog.keywords or "ai, automation").split(",")]
    hashnode_tags = []
    for t in raw_tags:
        clean = "".join(c for c in t.lower() if c.isalnum())
        if clean and len(clean) >= 2:
            hashnode_tags.append({"slug": clean[:20], "name": t[:50]})
    
    if not hashnode_tags:
        hashnode_tags = [{"slug": "ai", "name": "AI"}]
    
    # Generate a unique slug for Hashnode using hyphens
    blog_slug = slugify_hashnode(db_blog.title)
    
    variables = {
        "input": {
            "title": db_blog.title,
            "slug": blog_slug,
            "contentMarkdown": content,
            "publicationId": current_user.hashnode_publication_id,
            "tags": hashnode_tags[:5],
            "metaTags": {
                "description": (db_blog.meta_description or "")[:150],
                "title": db_blog.title[:70]
            },
            "originalArticleURL": scribe_flow_url,
        }
    }

    if cover_image_url:
        variables["input"]["coverImageOptions"] = {
            "coverImageURL": cover_image_url
        }

    headers = {
        "Authorization": current_user.hashnode_api_key,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://gql.hashnode.com/",
                json={"query": query, "variables": variables},
                headers=headers
            )
            res_data = response.json()
            
            if "errors" in res_data:
                logger.error(f"Hashnode API error: {res_data['errors']}")
                raise HTTPException(status_code=400, detail=f"Hashnode Error: {res_data['errors'][0]['message']}")

            post_data = res_data["data"]["publishPost"]["post"]
            db_blog.hashnode_url = post_data["url"]
            session.add(db_blog)
            session.commit()

            return {
                "status": "success",
                "message": "Blog published successfully to Hashnode!",
                "url": post_data["url"]
            }
        except Exception as e:
            logger.error(f"Failed to connect to Hashnode: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/medium/{job_id}")
async def publish_to_medium(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Publishes the blog to Medium using an Integration Token."""
    if not current_user.medium_token:
        raise HTTPException(status_code=400, detail="Medium Integration Token not found in profile.")

    db_blog = session.exec(select(Blog).where(Blog.job_id == job_id)).first()
    if not db_blog or db_blog.status != "completed":
        raise HTTPException(status_code=404, detail="Blog not found or not completed.")

    content = ""
    if db_blog.download_url:
        relative_path = db_blog.download_url.lstrip("/").replace("static/", "")
        file_path = Path("outputs") / relative_path
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")

    scribe_flow_url = f"https://scribe-flow-sable.vercel.app/share/{job_id}"
    backend_url = "https://api.tanish.website"
    content = content.replace("(/static/", f"({backend_url}/static/")

    headers = {
        "Authorization": f"Bearer {current_user.medium_token}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            # Step 1: Get User ID
            me_res = await client.get("https://api.medium.com/v1/me", headers=headers)
            if me_res.status_code != 200:
                raise HTTPException(status_code=me_res.status_code, detail=f"Medium Auth Error: {me_res.text}")
            
            user_id = me_res.json()["data"]["id"]

            # Step 2: Publish Post
            raw_tags = [t.strip() for t in (db_blog.keywords or "AI").split(",")]
            clean_tags = [re.sub(r'[^a-zA-Z0-9 ]', '', t)[:25] for t in raw_tags if len(t) > 1]

            payload = {
                "title": db_blog.title,
                "contentFormat": "markdown",
                "content": content,
                "canonicalUrl": scribe_flow_url,
                "tags": clean_tags[:5],
                "publishStatus": "public"
            }

            post_res = await client.post(f"https://api.medium.com/v1/users/{user_id}/posts", json=payload, headers=headers)
            if post_res.status_code in [200, 201]:
                data = post_res.json()
                db_blog.medium_url = data["data"]["url"]
                session.add(db_blog)
                session.commit()
                return {"status": "success", "message": "Blog published successfully to Medium!", "url": data["data"]["url"]}
            else:
                raise HTTPException(status_code=post_res.status_code, detail=f"Medium Error: {post_res.text}")

        except Exception as e:
            logger.error(f"Medium integration failure: {e}")
            raise HTTPException(status_code=500, detail=str(e))
