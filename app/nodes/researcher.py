from typing import List
import asyncio
from langchain_core.messages import SystemMessage, HumanMessage
from ..schemas.models import State, EvidencePack
from ..prompts.templates import RESEARCH_SYSTEM
from ..services.search_service import tavily_search
from ..services.llm_service import get_llm
from ..services.logging_service import logger

class ResearcherNode:
    def __init__(self):
        self.llm = get_llm()

    async def __call__(self, state: State) -> dict:
        queries = (state.get("queries", []) or [])
        logger.info(f"--- RESEARCHER NODE START ---")
        logger.info(f"Executing {len(queries)} queries in parallel.")
        
        # Parallel execution of searches
        tasks = [tavily_search(q, max_results=6) for q in queries]
        results = await asyncio.gather(*tasks)
        
        raw_results = []
        for r in results:
            raw_results.extend(r)

        if not raw_results:
            logger.warning("No raw research results found.")
            return {"evidence": []}

        logger.info(f"Total raw results collected: {len(raw_results)}. Synthesizing...")

        # Structured output synthesis can also be wrapped in thread if needed, 
        # but let's focus on IO parallelism first.
        extractor = self.llm.with_structured_output(EvidencePack)
        pack = await asyncio.to_thread(
            extractor.invoke,
            [
                SystemMessage(content=RESEARCH_SYSTEM),
                HumanMessage(content=f"Raw results: {raw_results}"),
            ]
        )

        # Deduplicate by URL
        dedup = {}
        for e in pack.evidence:
            if e.url:
                dedup[e.url] = e

        logger.info(f"Synthesis complete. Deduplicated into {len(dedup)} evidence items.")
        return {"evidence": list(dedup.values())}
