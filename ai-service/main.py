import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from google.genai import errors as genai_errors
from pydantic import ValidationError

from analyzer import call_gemini
from models import AnalyzeRequest
from prompts import ANALYZE_PROMPT

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="JobFit AI Service")

MODEL = "gemini-2.5-flash"


@app.exception_handler(genai_errors.APIError)
def handle_gemini_error(_request: Request, exc: genai_errors.APIError):
    if exc.code == 429:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded. Please try again later."},
        )
    logging.getLogger(__name__).error("Gemini API error: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"error": "AI service temporarily unavailable."},
    )


@app.exception_handler(ValidationError)
def handle_parse_error(_request: Request, exc: ValidationError):
    logging.getLogger(__name__).error("Failed to parse model response: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"error": "AI returned an unparseable response. Please retry."},
    )


@app.get("/health")
def health():
    return {"status": "ok", "gemini_model": MODEL}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    prompt = ANALYZE_PROMPT.format(
        resume_text=request.resume_text,
        jd_text=request.jd_text,
    )
    return call_gemini(prompt, MODEL)
