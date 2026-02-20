from langchain_core.messages import SystemMessage, HumanMessage
from ..schemas.models import Task, Plan, EvidenceItem
from ..prompts.templates import WORKER_PROMPT
from ..services.llm_service import get_llm
from ..services.logging_service import logger

class WorkerNode:
    def __init__(self):
        self.llm = get_llm()

    def __call__(self, payload: dict) -> dict:
        task = Task(**payload["task"])
        plan = Plan(**payload["plan"])
        evidence = [EvidenceItem(**e) for e in payload.get("evidence", [])]
        topic = payload["topic"]
        mode = payload.get("mode", "closed_book")

        logger.info(f"--- WORKER NODE START (Task ID: {task.id}) ---")
        logger.info(f"Writing section: '{task.title}' for topic: {topic}")

        bullets_text = "- " + "- ".join(task.bullets)

        evidence_text = ""
        if evidence:
            evidence_text = "".join(
                f"- {e.title} | {e.url} | {e.published_at or 'date:unknown'}".strip()
                for e in evidence[:20]
            )

        try:
            section_md = self.llm.invoke(
                [
                    SystemMessage(content=WORKER_PROMPT),
                    HumanMessage(
                        content=(
                            f"Blog title: {plan.blog_title}"
                            f"Audience: {plan.audience}"
                            f"Tone: {plan.tone}"
                            f"Blog kind: {plan.blog_kind}"
                            f"Constraints: {plan.constraints}"
                            f"Topic: {topic}"
                            f"Mode: {mode}"
                            f"Section title: {task.title}"
                            f"Goal: {task.goal}"
                            f"Target words: {task.target_words}"
                            f"Tags: {task.tags}"
                            f"requires_research: {task.requires_research}"
                            f"requires_citations: {task.requires_citation}"
                            f"requires_code: {task.requires_code}"
                            f"Bullets:{bullets_text}"
                            f"Evidence (ONLY use these URLs when citing):{evidence_text}"
                        )
                    ),
                ]
            ).content.strip()
            logger.info(f"Successfully wrote section: '{task.title}' ({len(section_md)} chars)")
        except Exception as e:
            logger.error(f"Worker failed for section '{task.title}': {e}")
            raise

        return {"sections": [(task.id, section_md)]}
