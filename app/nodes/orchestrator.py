from langgraph.types import Send
from langchain_core.messages import SystemMessage, HumanMessage
from ..schemas.models import State, Plan
from ..prompts.templates import ORCHESTRATION_PROMPT
from ..services.llm_service import get_llm
from ..services.logging_service import logger

class OrchestratorNode:
    def __init__(self):
        self.llm = get_llm()

    def __call__(self, state: State) -> dict:
        logger.info(f"--- ORCHESTRATOR NODE START ---")
        planner = self.llm.with_structured_output(Plan)
        evidence = state.get("evidence", [])
        mode = state.get("mode", "closed_book")

        logger.info(f"Planning blog for topic with {len(evidence)} evidence items in {mode} mode.")

        plan = planner.invoke(
            [
                SystemMessage(content=ORCHESTRATION_PROMPT),
                HumanMessage(
                    content=(
                        f"Topic: {state['topic']}"
                        f"Mode: {mode}"
                        f"Evidence (ONLY use for fresh claims; may be empty):"
                        f"{[e.model_dump() for e in evidence][:16]}"
                    )
                ),
            ]
        )
        logger.info(f"Plan generated: '{plan.blog_title}' with {len(plan.tasks)} tasks.")
        return {"plan": plan}

def fanout(state: State):
    tasks = state["plan"].tasks
    logger.info(f"Fanning out {len(tasks)} tasks to Workers.")
    return [
        Send(
            "worker",
            {
                "task": task.model_dump(),
                "topic": state["topic"],
                "mode": state["mode"],
                "plan": state["plan"].model_dump(),
                "evidence": [e.model_dump() for e in state.get("evidence", [])],
            },
        )
        for task in tasks
    ]
