import asyncio
import os
from .graph.workflow import create_workflow
from .services.logging_service import logger

async def run(topic: str, tone: str = "Professional"):
    """
    Main entry point for the Blog Generation Agent.
    Corrected to run the workflow exactly ONCE.
    """
    logger.info("==================================================")
    logger.info("       BLOG WRITER PRO - STARTING WORKFLOW        ")
    logger.info("==================================================")
    
    app = create_workflow()
    
    initial_state = {
        "topic": topic,
        "plan": None,
        "sections": [],
        "image_specs": [],
        "image_results": [],
        "user_tone": tone 
    }
    
    try:
        # Run the workflow exactly ONCE and get the final state
        final_state = await app.ainvoke(initial_state)
        
        final_output = {
            "plan": final_state.get("plan"),
            "evidence": final_state.get("evidence", []),
            "image_specs": final_state.get("image_specs", []),
            "seo": final_state.get("seo", {})
        }
        
        logger.info("==================================================")
        logger.info("    BLOG WRITER PRO - COMPLETED SUCCESSFULLY      ")
        logger.info("==================================================")
        
        return final_output
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}", exc_info=True)
        raise e

if __name__ == "__main__":
    # Local test
    asyncio.run(run("The Future of AI in 2025", tone="Witty"))
