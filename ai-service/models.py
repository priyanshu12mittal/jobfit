from pydantic import BaseModel, Field

MAX_INPUT_CHARS = 15_000


class AnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=50, max_length=MAX_INPUT_CHARS)
    jd_text: str = Field(min_length=50, max_length=MAX_INPUT_CHARS)
    relevant_chunks: list[str] | None = Field(default=None, description="Most relevant resume chunks for RAG")


class AnalysisResult(BaseModel):
    fit_score: int = Field(ge=0, le=100, description="0-100 match score")
    strengths: list[str] = Field(description="3-5 candidate strengths matching the JD")
    gaps: list[str] = Field(description="1-4 gaps or missing qualifications")
    suggested_bullets: list[str] = Field(description="2-3 rewritten resume bullets")


class EmbedRequest(BaseModel):
    texts: list[str] = Field(description="List of text chunks to embed", min_length=1)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]] = Field(description="List of vector embeddings (384 dimensions)")
