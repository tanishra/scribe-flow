from __future__ import annotations
import operator
from typing import TypedDict, List, Annotated, Literal, Optional, Dict
from pydantic import BaseModel, Field

class Task(BaseModel):
    id: int
    title: str
    goal: str = Field(..., description="One sentence describing what the reader should be able to do/understand after this section.")
    bullets: List[str] = Field(..., description="3-6 concrete, non-overlapping subpoints to cover in this section.", min_length=3, max_length=6)
    target_words: int = Field(..., description="Target word count for this section(120 - 450)")
    tags: List[str] = Field(default_factory=list)
    requires_research: bool = False
    requires_citation: bool = False
    requires_code: bool = False

class Plan(BaseModel):
    blog_title: str
    audience: str = Field(..., description="Who this blog is for.")
    tone: str = Field(..., description="Writing tone (e.g. practical, crisp).")
    blog_kind: Literal["explainer", "tutorial", "news_roundup", "comparison", "system_design"] = "explainer"
    constraints: List[str] = Field(default_factory=list)
    tasks: List[Task]

class EvidenceItem(BaseModel):
    title: str
    url: str
    published_at: Optional[str] = None
    snippet: Optional[str] = None
    source: Optional[str] = None

class RouterDecision(BaseModel):
    needs_research: bool = False
    mode: Literal['open_book', 'closed_book', 'hybrid']
    queries: List[str] = Field(default_factory=list)

class EvidencePack(BaseModel):
    evidence: List[EvidenceItem] = Field(default_factory=list)

class ImageSpec(BaseModel):
    placeholder: str = Field(..., description="e.g. [[IMAGE_1]]")
    filename: str = Field(..., description="Save under images/, e.g. qkv_flow.png")
    alt: str
    caption: str
    prompt: str = Field(..., description="Prompt to send to the image model.")
    size: Literal["1024x1024", "1024x1536", "1536x1024"] = "1024x1024"
    quality: Literal["low", "medium", "high"] = "medium"

class GlobalImagePlan(BaseModel):
    md_with_placeholders: str
    images: List[ImageSpec] = Field(default_factory=list)

class ImageDecision(BaseModel):
    task_id: int = Field(..., description="The ID of the section where the image should be placed.")
    placeholder: str = Field(..., description="e.g. [[IMAGE_1]]")
    filename: str = Field(..., description="Descriptive filename ending in .png")
    alt: str = Field(..., description="Short descriptive alt text.")
    caption: str = Field(..., description="Helpful caption for the reader.")
    prompt: str = Field(..., description="Detailed prompt for the image model.")

class ImageDecisionList(BaseModel):
    decisions: List[ImageDecision] = Field(default_factory=list)

class ImageTask(BaseModel):
    spec: ImageSpec
    topic: str

class SEOData(BaseModel):
    meta_description: str = Field(..., description="SEO meta description (150-160 chars)")
    keywords: str = Field(..., description="Comma-separated SEO keywords")

class State(TypedDict):
    topic: str
    user_tone: str
    mode: str
    needs_research: bool
    queries: List[str]
    # Use operator.add to ensure research evidence is preserved in the state
    evidence: Annotated[List[EvidenceItem], operator.add] 
    plan: Optional[Plan]
    sections: Annotated[List[tuple[int, str]], operator.add]
    merged_md: str
    md_with_placeholders: str
    image_specs: List[dict]
    image_results: Annotated[List[tuple[str, str, bool, int]], operator.add]
    seo: Dict[str, str]
    final: str
