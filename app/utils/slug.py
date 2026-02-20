import re

def slugify(text: str) -> str:
    """
    Convert text into a URL-safe filename.
    Example: "Who is an AI Architect?" -> "who_is_an_ai_architect"
    """
    if not text:
        return "blog"
    # Convert to lowercase and remove non-alphanumeric
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    # Replace whitespace/hyphens/underscores with single underscore
    text = re.sub(r'[\s_-]+', '_', text)
    # Trim leading/trailing underscores or hyphens
    text = re.sub(r'^[_-]+|[_-]+$', '', text)
    return text or "blog"
