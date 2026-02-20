from typing import Optional
from .graph.workflow import create_app
from .services.logging_service import logger

async def run(topic: str, as_of: Optional[str] = None):
    logger.info("==================================================")
    logger.info(f"STARTING BLOG WRITER AI (ASYNC): {topic}")
    logger.info("==================================================")
    
    try:
        app = create_app()
        out = await app.ainvoke(
            {
                "topic": topic,
                "mode": "",
                "needs_research": False,
                "queries": [],
                "evidence": [],
                "plan": None,
                "sections": [],
                "merged_md": "",
                "md_with_placeholders": "",
                "image_specs": [],
                "final": "",
            }
        )
        logger.info("==================================================")
        logger.info("BLOG WRITER PRO COMPLETED SUCCESSFULLY")
        logger.info("==================================================")
        return out
    except Exception as e:
        logger.critical(f"UNHANDLED EXCEPTION DURING EXECUTION: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    import sys
    import asyncio
    if len(sys.argv) > 1:
        topic_input = sys.argv[1]
        asyncio.run(run(topic_input))
    else:
        print("Please provide a topic.")
