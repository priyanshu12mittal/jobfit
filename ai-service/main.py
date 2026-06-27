from fastapi import FastAPI, Body
from google.genai import types

from llm import gemini_client
from models import AnalysisResult
from prompts import ANALYZE_PROMPT

app = FastAPI(title="JobFit AI Service")

MODEL = "gemini-2.5-flash"


@app.get("/health")
def health():
    return {"status": "ok", "gemini_model": MODEL}


@app.post("/analyze")
def analyze(
    resume_text: str = Body(...),
    jd_text: str = Body(...),
):
    prompt = ANALYZE_PROMPT.format(resume_text=resume_text, jd_text=jd_text)

    response = gemini_client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AnalysisResult,
        ),
    )

    result = AnalysisResult.model_validate_json(response.text)
    return result
