from langchain_core.messages import SystemMessage, HumanMessage
from ..schemas.models import State, RouterDecision
from ..prompts.templates import ROUTER_SYSTEM
from ..services.llm_service import get_llm
from ..services.logging_service import logger

class RouterNode:
    def __init__(self):
        self.llm = get_llm()

    def __call__(self, state: State) -> dict:
        topic = state["topic"]
        logger.info(f"--- ROUTER NODE START ---")
        logger.info(f"Processing topic: {topic}")
        
        decider = self.llm.with_structured_output(RouterDecision)
        decision = decider.invoke(
            [
                SystemMessage(content=ROUTER_SYSTEM),
                HumanMessage(content=f"Topic: {topic}"),
            ]
        )

        logger.info(f"Router Decision: Mode={decision.mode}, Needs Research={decision.needs_research}")
        if decision.queries:
            logger.debug(f"Generated queries: {decision.queries}")

        return {
            "needs_research": decision.needs_research,
            "mode": decision.mode,
            "queries": decision.queries,
        }

def route_next(state: State) -> str:
    next_node = "research" if state["needs_research"] else "orchestrator"
    logger.info(f"Routing to: {next_node}")
    return next_node
