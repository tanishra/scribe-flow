from pathlib import Path
import asyncio
import json
from langgraph.types import Send
from langchain_core.messages import SystemMessage, HumanMessage
from ..schemas.models import State, GlobalImagePlan, ImageTask, ImageSpec
from ..prompts.templates import DECIDE_IMAGES_SYSTEM
from ..services.llm_service import get_llm
from ..services.image_service import generate_image_bytes
from ..services.logging_service import logger
from ..utils.slug import slugify

class ImageWorkerNode:
    """Standalone worker for generating a single image in parallel."""
    async def __call__(self, payload: dict) -> dict:
        spec = ImageSpec(**payload["spec"])
        
        logger.info(f"--- IMAGE WORKER START: {spec.filename} ---")
        
        images_dir = Path("outputs/images")
        images_dir.mkdir(parents=True, exist_ok=True)
        out_path = images_dir / spec.filename
        
        replacement_md = ""
        success = False

        if not out_path.exists():
            try:
                img_bytes = await generate_image_bytes(spec.prompt)
                out_path.write_bytes(img_bytes)
                logger.debug(f"Saved image to {out_path}")
                replacement_md = f"\n![{spec.alt}](../images/{spec.filename})\n*{spec.caption}*\n"
                success = True
            except Exception as e:
                logger.warning(f"Image generation failed for {spec.filename}: {e}")
                replacement_md = (
                    f"\n> **[IMAGE GENERATION FAILED]** {spec.caption}\n"
                    f"> **Alt:** {spec.alt}\n"
                    f"> **Prompt:** {spec.prompt}\n"
                    f"> **Error:** {e}\n"
                )
        else:
            replacement_md = f"\n![{spec.alt}](../images/{spec.filename})\n*{spec.caption}*\n"
            success = True

        return {
            "image_results": [(spec.placeholder, replacement_md, success, payload.get("task_id"))]
        }

class ReducerNode:
    def __init__(self):
        self.llm = get_llm()

    async def merge_content(self, state: State) -> dict:
        logger.info(f"--- REDUCER: MERGING CONTENT START ---")
        plan = state["plan"]
        ordered_sections = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
        logger.info(f"Merging {len(ordered_sections)} sections into final blog.")
        body = "\n\n".join(ordered_sections).strip()
        merged_md = f"# {plan.blog_title}\n\n{body}\n"
        return {"merged_md": merged_md}

    async def decide_images(self, state: State) -> dict:
        logger.info(f"--- REDUCER: DECIDING IMAGES START (Optimized) ---")
        plan = state["plan"]
        
        # FAST: Only send the Plan/Tasks to the LLM, not the 3000 words of MD
        tasks_summary = [{"id": t.id, "title": t.title, "goal": t.goal} for t in plan.tasks]
        
        try:
            from ..schemas.models import ImageDecisionList
            structured_llm = self.llm.with_structured_output(ImageDecisionList)
            
            result = await asyncio.to_thread(
                structured_llm.invoke,
                [
                    SystemMessage(content=DECIDE_IMAGES_SYSTEM),
                    HumanMessage(content=f"Blog Plan:\n{json.dumps(tasks_summary, indent=2)}"),
                ]
            )
            
            image_mappings = [d.model_dump() for d in result.decisions]
            logger.info(f"AI decided on {len(image_mappings)} visual placements.")
            
            return {"image_specs": image_mappings}
        except Exception as e:
            logger.error(f"Failed to decide images: {e}")
            return {"image_specs": []}

    def fanout_images(self, state: State):
        """Dynamic fanout to parallel Image Workers."""
        specs = state.get("image_specs", [])
        if not specs:
            logger.info("No images to generate. Finalizing.")
            return "finalize_blog"
            
        logger.info(f"Fanning out {len(specs)} Image Tasks to workers.")
        return [
            Send("image_worker", {"spec": s, "topic": state["topic"], "task_id": s.get("task_id")})
            for s in specs
        ]

    async def finalize_blog(self, state: State) -> dict:
        """Collects results and programmatically places images into the text."""
        logger.info(f"--- REDUCER: FINALIZING BLOG START ---")
        plan = state["plan"]
        sections_map = {task_id: content for task_id, content in state["sections"]}
        image_results = state.get("image_results", [])

        # Programmatically attach images to the end of their respective sections
        for placeholder, replacement, success, task_id in image_results:
            if task_id in sections_map:
                logger.debug(f"Attaching {placeholder} to section {task_id}")
                sections_map[task_id] += f"\n\n{replacement}"
            else:
                # Fallback: append to bottom of last section
                if sections_map:
                    logger.warning(f"Task ID {task_id} not found. Appending to bottom.")
                    last_id = max(sections_map.keys())
                    sections_map[last_id] += f"\n\n{replacement}"

        # Re-merge everything (Correctly OUTSIDE the loop)
        ordered_ids = sorted(sections_map.keys())
        body = "\n\n".join([sections_map[i] for i in ordered_ids]).strip()
        final_md = f"# {plan.blog_title}\n\n{body}\n"

        # Setup paths and save with safe slugified filename
        blogs_dir = Path("outputs/blogs")
        blogs_dir.mkdir(parents=True, exist_ok=True)
        safe_name = slugify(plan.blog_title)
        blog_path = blogs_dir / f"{safe_name}.md"

        try:
            blog_path.write_text(final_md, encoding="utf-8")
            logger.info(f"Final blog written to {blog_path}")
        except Exception as e:
            logger.error(f"Failed to write final blog file: {e}")

        return {"final": final_md}
