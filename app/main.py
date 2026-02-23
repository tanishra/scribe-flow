import asyncio
import os
import json
from .graph.workflow import create_workflow
from .services.logging_service import logger

async def run(topic: str, tone: str = "Professional"):
    """
    Main entry point for the Blog Generation Agent.
    Runs the workflow exactly ONCE and extracts full state.
    """
    logger.info("==================================================")
    logger.info("       BLOG WRITER - STARTING WORKFLOW        ")
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
        # ainvoke returns the FULL final state dictionary
        final_state = await app.ainvoke(initial_state)
        
        # Log evidence count for debugging
        evidence = final_state.get("evidence", [])
        logger.info(f"Final state captured with {len(evidence)} evidence items.")

        final_output = {
            "plan": final_state.get("plan"),
            "evidence": evidence,
            "image_specs": final_state.get("image_specs", []),
            "seo": final_state.get("seo", {})
        }
        
        logger.info("==================================================")
        logger.info("    BLOG WRITER - COMPLETED SUCCESSFULLY      ")
        logger.info("==================================================")
        
        return final_output
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}", exc_info=True)
        raise e

async def stream_run(topic: str, tone: str = "Professional"):
    """
    Generator that yields real-time updates from the workflow.
    Yields tuples of (event_type, event_data)
    """
    app = create_workflow()
    
    initial_state = {
        "topic": topic,
        "plan": None,
        "sections": [],
        "image_specs": [],
        "image_results": [],
        "user_tone": tone 
    }
    
    # We iterate over the stream of events
    async for event in app.astream_events(initial_state, version="v2"):
        kind = event["event"]
        name = event["name"]
        data = event["data"]
        
        # 1. Real Thought Process
        if kind == "on_tool_start":
            tool_input = data.get("input", "")
            if name == "tavily_search_results_json":
                yield ("thought", f"Searching the web for: {tool_input}")
            else:
                yield ("thought", f"Using tool {name}...")
                
        elif kind == "on_chain_start":
            if name == "research":
                yield ("thought", "Researcher agent is starting deep web analysis...")
            elif name == "orchestrator":
                yield ("thought", "Orchestrator is architecting the blog structure...")
            elif name == "worker":
                yield ("thought", "Writer agent is drafting a section...")
            elif name == "merge_content":
                yield ("thought", "Merging all drafted sections into a unified draft...")
            elif name == "decide_images":
                yield ("thought", "Visual Strategist is deciding on image placements...")
            elif name == "image_worker":
                yield ("thought", "Generating custom visual assets...")
            elif name == "finalize_blog":
                yield ("thought", "Finalizing blog, integrating images, and optimizing SEO...")
        
        # 2. Progress & Granular Data Yielding
        elif kind == "on_chain_end":
            output = data.get("output", {})
            if output:
                # Capture dynamic thought/reasoning if present
                if "thought" in output:
                    yield ("thought", output["thought"])

                # Capture and yield granular state updates as they happen
                if name == "orchestrator" and "plan" in output:
                    yield ("plan", output["plan"])
                elif name == "research" and "evidence" in output:
                    yield ("evidence", output["evidence"])
                elif name == "decide_images" and "image_specs" in output:
                    yield ("image_specs", output["image_specs"])
                elif name == "worker":
                    yield ("thought", "Section completed and added to draft.")
                
                # Content Streaming
                elif name == "merge_content" and "merged_md" in output:
                    yield ("content", output["merged_md"])
                elif name == "finalize_blog" and "final" in output:
                    yield ("content", output["final"])
                    if "seo" in output:
                        yield ("seo", output["seo"])
                    yield ("thought", "Blog completely finished with all visuals integrated!")
        
        # 3. Final Output (For State Persistence)
        elif kind == "on_chain_end" and name in ["LangGraph", "__root__"]:
            output = data.get("output", {})
            if output:
                 yield ("complete", {
                    "plan": output.get("plan"),
                    "evidence": output.get("evidence", []),
                    "image_specs": output.get("image_specs", []),
                    "seo": output.get("seo", {}),
                    "final": output.get("final")
                })

if __name__ == "__main__":
    # Local test
    asyncio.run(run("The Future of AI in 2025", tone="Witty"))
