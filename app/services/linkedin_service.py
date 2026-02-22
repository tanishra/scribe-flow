import json
import httpx
from typing import Optional
from .llm_service import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
from .logging_service import logger

class LinkedInService:
    @staticmethod
    async def get_user_urn(access_token: str) -> str:
        """Automatically fetches the user's URN (Person ID) using the access token."""
        # Try OpenID Connect endpoint first (Modern standard)
        url_openid = "https://api.linkedin.com/v2/userinfo"
        # Try legacy endpoint as fallback
        url_legacy = "https://api.linkedin.com/v2/me"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        
        async with httpx.AsyncClient() as client:
            # Attempt 1: OpenID (Returns 'sub' as ID)
            try:
                response = await client.get(url_openid, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("sub") # In OpenID, the ID is called 'sub'
            except Exception as e:
                logger.warning(f"OpenID fetch failed: {e}")

            # Attempt 2: Legacy /me (Returns 'id' as ID)
            response = await client.get(url_legacy, headers=headers)
            if response.status_code != 200:
                logger.error(f"LinkedIn ID fetch failed entirely: {response.text}")
                raise Exception("Invalid LinkedIn Access Token or Missing Scopes (r_liteprofile or openid)")
            
            data = response.json()
            return data.get("id")

    @staticmethod
    async def generate_teaser(blog_content: str, blog_title: str) -> str:
        """Uses AI to transform a markdown blog into a viral LinkedIn teaser."""
        llm = get_llm()
        
        prompt = f"""
        You are a world-class social media strategist and ghostwriter for top tech influencers.
        
        TASK:
        Transform the following technical blog into an ATTENTION-GRABBING, high-conversion LinkedIn post.
        
        BLOG TITLE: {blog_title}
        BLOG CONTENT (Markdown):
        {blog_content[:4000]} # Truncate to save context
        
        CONSTRAINTS & STYLE:
        1. HOOK: Start with a powerful first line that stops the scroll (curiosity, controversial take, or a massive benefit).
        2. FORMAT: Use short paragraphs (1-2 sentences max). 
        3. LISTS: Use bullet points or emojis for readability.
        4. VALUE: Highlight 3 key takeaways from the blog.
        5. CALL TO ACTION: Tell them to read the full story at the link below.
        6. NO HASHTAG OVERLOAD: Use exactly 3-5 relevant technical/professional hashtags at the end.
        7. EMOJIS: Use them strategically to guide the eye, but keep it professional.
        8. NO BOLD/ITALIC: LinkedIn API does not support markdown formatting (no ** or __). Use CAPS for emphasis if needed.
        
        The teaser must be enticing enough that people feel they HAVE to click the link to see the full implementation.
        
        OUTPUT ONLY THE POST TEXT.
        """
        
        messages = [
            SystemMessage(content="You are a LinkedIn Growth Expert. You write viral technical posts."),
            HumanMessage(content=prompt)
        ]
        
        response = await llm.ainvoke(messages)
        return response.content

    @staticmethod
    async def publish_post(access_token: str, person_urn: str, text: str, article_url: str, title: str):
        """Publishes a post to LinkedIn using the UGC (User Generated Content) API."""
        url = "https://api.linkedin.com/v2/ugcPosts"
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        
        post_data = {
            "author": f"urn:li:person:{person_urn.replace('urn:li:person:', '')}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": text
                    },
                    "shareMediaCategory": "ARTICLE",
                    "media": [
                        {
                            "status": "READY",
                            "description": {
                                "text": "Read the full technical deep-dive on ScribeFlow AI."
                            },
                            "originalUrl": article_url,
                            "title": {
                                "text": title
                            }
                        }
                    ]
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=post_data)
            
            if response.status_code != 201:
                logger.error(f"LinkedIn Publish Failed: {response.text}")
                raise Exception(f"LinkedIn API Error: {response.json().get('message', 'Unknown error')}")
            
            # The API doesn't return a direct link easily, but we can return success
            return {"status": "success", "urn": response.json().get("id")}
