from langgraph.graph import START, END, StateGraph
from ..schemas.models import State
from ..nodes.router import RouterNode, route_next
from ..nodes.researcher import ResearcherNode
from ..nodes.orchestrator import OrchestratorNode, fanout
from ..nodes.worker import WorkerNode
from ..nodes.reducer import ReducerNode, ImageWorkerNode

def create_app():
    # Initialize nodes
    router = RouterNode()
    researcher = ResearcherNode()
    orchestrator = OrchestratorNode()
    worker = WorkerNode()
    reducer = ReducerNode()
    image_worker = ImageWorkerNode()

    # --- Reducer Subgraph (Optimized with Fanout) ---
    reducer_graph = StateGraph(State)
    reducer_graph.add_node("merge_content", reducer.merge_content)
    reducer_graph.add_node("decide_images", reducer.decide_images)
    reducer_graph.add_node("image_worker", image_worker)
    reducer_graph.add_node("finalize_blog", reducer.finalize_blog)

    reducer_graph.add_edge(START, "merge_content")
    reducer_graph.add_edge("merge_content", "decide_images")
    
    # Fanout Images: decide_images -> image_worker (multiple) -> finalize_blog
    reducer_graph.add_conditional_edges(
        "decide_images", 
        reducer.fanout_images, 
        ["image_worker", "finalize_blog"]
    )
    reducer_graph.add_edge("image_worker", "finalize_blog")
    reducer_graph.add_edge("finalize_blog", END)
    
    reducer_subgraph = reducer_graph.compile()

    # --- Main Graph ---
    graph = StateGraph(State)
    graph.add_node("router", router)
    graph.add_node("research", researcher)
    graph.add_node("orchestrator", orchestrator)
    graph.add_node("worker", worker)
    graph.add_node("reducer", reducer_subgraph)

    graph.add_edge(START, "router")
    graph.add_conditional_edges("router", route_next, {"research": "research", "orchestrator": "orchestrator"})
    graph.add_edge("research", "orchestrator")

    graph.add_conditional_edges("orchestrator", fanout, ["worker"])
    graph.add_edge("worker", "reducer")
    graph.add_edge("reducer", END)

    return graph.compile()
