from typing import List
from langchain_community.tools.tavily_search import TavilySearchResults
from .logging_service import logger
import asyncio

async def tavily_search(query: str, max_results: int = 5) -> List[dict]:
    logger.info(f"Initiating search for query: '{query}'")
    try:
        # TavilySearchResults.ainvoke is the async version
        tool = TavilySearchResults(max_results=max_results)
        results = await tool.ainvoke({"query": query})
        logger.debug(f"Search successful. Found {len(results) if results else 0} results.")
    except Exception as e:
        logger.error(f"Search failed for query '{query}': {e}")
        return []

    normalized: List[dict] = []
    for r in results or []:
        normalized.append(
            {
                "title": r.get("title") or "",
                "url": r.get("url") or "",
                "snippet": r.get("content") or r.get("snippet") or "",
                "published_at": r.get("published_date") or r.get("published_at"),
                "source": r.get("source"),
            }
        )
    return normalized
