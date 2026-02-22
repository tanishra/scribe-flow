import re

def slugify_hashnode(text: str) -> str:
    """
    Convert text into a URL-safe slug using hyphens (Standard for Hashnode).
    Example: "RAG vs. CRAG" -> "rag-vs-crag"
    """
    if not text:
        return "blog"
    # Convert to lowercase and remove non-alphanumeric (except spaces/hyphens)
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    # Replace whitespace/hyphens/underscores with single hyphen
    text = re.sub(r'[\s_-]+', '-', text)
    # Trim leading/trailing hyphens
    text = re.sub(r'^-+|-+$', '', text)
    return text or "blog"
