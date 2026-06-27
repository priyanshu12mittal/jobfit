from pydantic import BaseModel, Field

MAX_INPUT_CHARS = 15_000


class AnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=50, max_length=MAX_INPUT_CHARS)
    jd_text: str = Field(min_length=50, max_length=MAX_INPUT_CHARS)


class AnalysisResult(BaseModel):
    fit_score: int = Field(ge=0, le=100, description="0-100 match score")
    strengths: list[str] = Field(description="3-5 candidate strengths matching the JD")
    gaps: list[str] = Field(description="1-4 gaps or missing qualifications")
    suggested_bullets: list[str] = Field(description="2-3 rewritten resume bullets")
