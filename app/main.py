import asyncio
import os
from .graph.workflow import create_workflow
from .services.logging_service import logger

async def run(topic: str, tone: str = "Professional"):
    """
    Main entry point for the Blog Generation Agent.
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
        # Pass the tone into the initial state so it reaches the Planner & Workers
        "user_tone": tone 
    }
    
    final_output = {}

    try:
        # Using astream to process the graph execution
        async for event in app.astream(initial_state):
            for key, value in event.items():
                logger.info(f"Finished Step: {key}")
                # We can add more granular logging here if needed
                
        # Extract final state from the execution
        # Since astream yields partial updates, we might need to invoke it directly to get the final state cleanly
        # OR better, trust the reducer's final update to the DB/File which happens inside the graph nodes.
        
        # However, to return data to the API immediately, we can run invoke() instead of astream() for simplicity in this context
        # But astream is better for long running tasks. Let's use invoke for the final return value.
        
        final_state = await app.ainvoke(initial_state)
        
        final_output = {
            "plan": final_state.get("plan"),
            "evidence": [], # If we stored evidence in state, extract it
            "image_specs": final_state.get("image_specs", []),
            "seo": final_state.get("seo", {}) # Extract SEO data
        }
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}", exc_info=True)
        raise e

    logger.info("==================================================")
    logger.info("    BLOG WRITER PRO - COMPLETED SUCCESSFULLY      ")
    logger.info("==================================================")
    
    return final_output

if __name__ == "__main__":
    # Local test
    asyncio.run(run("The Future of AI in 2025", tone="Witty"))
