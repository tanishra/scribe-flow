import os
import re
import json
import time
import zipfile
import requests
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional, List, Tuple

import pandas as pd
import streamlit as st

# --- Configuration ---
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
BASE_OUTPUT_DIR = Path("outputs")
BLOGS_DIR = BASE_OUTPUT_DIR / "blogs"
IMAGES_DIR = BASE_OUTPUT_DIR / "images"

# --- Page Setup ---
    st.set_page_config(
        page_title="ScribeFlow AI Agent",
        page_icon="✍️",
        layout="wide",
        initial_sidebar_state="expanded"
    )
# --- Helper Functions ---

def safe_slug(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^a-z0-9 _-]+", "", s)
    s = re.sub(r"\s+", "_", s).strip("_")
    return s or "blog"

def bundle_zip(md_text: str, md_filename: str, images_list: List[str]) -> bytes:
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr(md_filename, md_text.encode("utf-8"))
        for img_url in images_list:
            filename = img_url.split("/")[-1]
            img_path = IMAGES_DIR / filename
            if img_path.exists():
                z.write(img_path, arcname=f"images/{filename}")
    return buf.getvalue()

def list_past_blogs() -> List[Path]:
    if not BLOGS_DIR.exists():
        return []
    # List only .md files
    files = [p for p in BLOGS_DIR.glob("*.md") if p.is_file()]
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files

def extract_title_from_md(md: str, fallback: str) -> str:
    for line in md.splitlines():
        if line.startswith("# "):
            return line[2:].strip() or fallback
    return fallback

# --- API Interaction Layer ---

def trigger_generation(topic: str) -> Optional[str]:
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/generate",
            json={"topic": topic}
        )
        response.raise_for_status()
        return response.json().get("job_id")
    except Exception as e:
        st.error(f"Failed to connect to backend: {e}")
        return None

def poll_job_status(job_id: str) -> Dict[str, Any]:
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/status/{job_id}")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}

# --- UI Rendering Helpers ---

def render_markdown_with_images(md: str):
    modified_md = md.replace("../images/", f"{BACKEND_URL}/static/images/")
    st.markdown(modified_md, unsafe_allow_html=True)

# --- Sidebar ---

with st.sidebar:
    st.title("✍️ ScribeFlow AI")
    st.caption("v2.0 Production Grade")
    
    with st.expander("🚀 Generate New Blog", expanded=True):
        topic = st.text_area("What should the blog be about?", placeholder="e.g. Future of AI", height=100)
        as_of = st.date_input("Knowledge Cutoff Date", value=date.today())
        run_btn = st.button("Generate Blog", type="primary", use_container_width=True)

    st.divider()
    st.subheader("📚 Past Blogs")
    past_files = list_past_blogs()
    if past_files:
        options = {f"{extract_title_from_md(p.read_text()[:500], p.stem)} ({p.name})": p for p in past_files[:20]}
        selected_label = st.selectbox("Select a blog to load", options.keys())
        if st.button("Load Blog", use_container_width=True):
            selected_path = options[selected_label]
            md_content = selected_path.read_text(encoding="utf-8")
            
            # Load metadata if it exists
            json_path = selected_path.with_suffix(".json")
            metadata = {}
            if json_path.exists():
                try:
                    metadata = json.loads(json_path.read_text(encoding="utf-8"))
                except:
                    pass
            
            st.session_state["last_result"] = {
                "status": "completed",
                "blog_title": extract_title_from_md(md_content, selected_path.stem),
                "final": md_content,
                "images": metadata.get("images", []),
                "plan": metadata.get("plan"),
                "evidence": metadata.get("evidence", []),
                "source": "history"
            }
    else:
        st.info("No blogs found.")

# --- Session State ---

if "last_result" not in st.session_state:
    st.session_state["last_result"] = None

# --- Main Logic ---

if run_btn:
    if len(topic) < 5:
        st.warning("Please enter a more detailed topic.")
    else:
        job_id = trigger_generation(topic)
        if job_id:
            status_container = st.empty()
            
            with st.spinner("AI Agents are working..."):
                while True:
                    data = poll_job_status(job_id)
                    status = data.get("status")
                    
                    if status == "completed":
                        try:
                            md_url = f"{BACKEND_URL}{data['download_url']}"
                            md_res = requests.get(md_url)
                            data["final"] = md_res.text
                            st.session_state["last_result"] = data
                        except Exception as e:
                            st.error(f"Error fetching final content: {e}")
                            st.session_state["last_result"] = data
                        break
                    elif status == "failed":
                        st.error(f"Generation failed: {data.get('error')}")
                        break
                    
                    status_container.info(f"Current Phase: **{status.upper()}**")
                    time.sleep(3)
            status_container.empty()

# --- Content Display (TABS) ---

result = st.session_state["last_result"]

if result:
    st.header(result.get("blog_title", "Generated Blog"))
    
    # Define the 4 Tabs
    tab_plan, tab_evidence, tab_preview, tab_images = st.tabs(
        ["🧩 Plan", "🔎 Evidence", "📝 Markdown Preview", "🖼️ Images"]
    )
    
    with tab_plan:
        st.subheader("Structural Strategy")
        plan = result.get("plan")
        if plan:
            # Normalize to dict
            p_dict = plan if isinstance(plan, dict) else plan.model_dump()
            st.write(f"**Tone:** {p_dict.get('tone', 'N/A')} | **Audience:** {p_dict.get('audience', 'N/A')}")
            
            tasks = p_dict.get("tasks", [])
            if tasks:
                task_list = [t if isinstance(t, dict) else t.model_dump() for t in tasks]
                df_tasks = pd.DataFrame(task_list)
                cols_to_show = [c for c in ["id", "title", "goal", "target_words", "requires_research"] if c in df_tasks.columns]
                st.dataframe(df_tasks[cols_to_show], use_container_width=True, hide_index=True)
                
                for t in task_list:
                    with st.expander(f"Section {t.get('id', '?')}: {t.get('title', 'Untitled')}"):
                        st.write(f"**Goal:** {t.get('goal', 'N/A')}")
                        st.write("**Target Bullets:**")
                        for b in t.get("bullets", []):
                            st.write(f"- {b}")
        else:
            st.info("No structural plan available for this blog.")

    with tab_evidence:
        st.subheader("Research & Sources")
        evidence = result.get("evidence", [])
        if evidence:
            st.write(f"The AI found {len(evidence)} high-signal sources.")
            
            ev_list = [e if isinstance(e, dict) else e.model_dump() for e in evidence]
            df_ev = pd.DataFrame(ev_list)
            cols_to_show = [c for c in ["title", "source", "published_at", "url"] if c in df_ev.columns]
            st.dataframe(df_ev[cols_to_show], use_container_width=True, hide_index=True)
            
            for e in ev_list:
                with st.expander(e.get("title", "Untitled Source")):
                    st.write(f"**Source:** {e.get('source', 'Web')}")
                    st.write(f"**Published At:** {e.get('published_at', 'Unknown')}")
                    st.write(f"**Snippet:** {e.get('snippet', 'N/A')}")
                    st.write(f"[View Original Source]({e.get('url', '#')})")
        else:
            st.info("No research evidence was found or required for this post.")

    with tab_preview:
        st.subheader("Final Rendered Content")
        if "final" in result:
            render_markdown_with_images(result["final"])
            st.divider()
            col1, col2 = st.columns(2)
            with col1:
                st.download_button("⬇️ Download Markdown", result["final"].encode("utf-8"), f"{safe_slug(result['blog_title'])}.md", "text/markdown", use_container_width=True)
            with col2:
                bundle = bundle_zip(result["final"], f"{safe_slug(result['blog_title'])}.md", result.get("images", []))
                st.download_button("📦 Download Bundle (MD + Images)", bundle, f"{safe_slug(result['blog_title'])}_bundle.zip", "application/zip", use_container_width=True)
        else:
            st.warning("Markdown content not loaded.")

    with tab_images:
        st.subheader("Visual Assets")
        images = result.get("images", [])
        if images:
            cols = st.columns(2)
            for i, img_url in enumerate(images):
                with cols[i % 2]:
                    # Ensure URL starts with /static
                    full_url = f"{BACKEND_URL}{img_url}" if img_url.startswith("/") else f"{BACKEND_URL}/static/images/{img_url.split('/')[-1]}"
                    st.image(full_url, caption=f"Asset: {img_url.split('/')[-1]}", use_container_width=True)
        else:
            st.info("No images available for this post.")

else:
    st.info("👈 Enter a topic in the sidebar and click **Generate Blog** to start.")
    
    # Activity Dashboard
    st.subheader("Recent activity")
    past_blogs = list_past_blogs()
    if past_blogs:
        recent_data = []
        for p in past_blogs[:10]:
            try:
                recent_data.append({
                    "Date": date.fromtimestamp(p.stat().st_mtime).isoformat(),
                    "File": p.name,
                    "Size": f"{p.stat().st_size / 1024:.1f} KB"
                })
            except:
                pass
        if recent_data:
            st.table(pd.DataFrame(recent_data))
