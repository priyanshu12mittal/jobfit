import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from google.genai import errors as genai_errors
from pydantic import ValidationError
import re
from collections import deque
import time

from analyzer import call_gemini
from embeddings import generate_embeddings
from models import AnalyzeRequest, EmbedRequest, EmbedResponse
from prompts import ANALYZE_PROMPT

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="JobFit AI Service")

MODEL = "gemini-3.1-flash-lite"

# Rate Limiter State
request_times = deque(maxlen=10)

def is_rate_limited() -> bool:
    now = time.time()
    # Remove timestamps older than 60 seconds
    while request_times and request_times[0] < now - 60:
        request_times.popleft()
    if len(request_times) >= 10:
        return True
    request_times.append(now)
    return False

def redact_pii(text: str) -> str:
    # Redact email addresses
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL REDACTED]', text)
    # Redact phone numbers (simple heuristics)
    text = re.sub(r'\+?\d{1,3}?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '[PHONE REDACTED]', text)
    # Redact LinkedIn URLs
    text = re.sub(r'https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+/?', '[LINKEDIN REDACTED]', text)
    return text


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
    if is_rate_limited():
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded (10 RPM). Please try again later."}
        )

    if not request.relevant_chunks:
        return JSONResponse(
            status_code=400,
            content={"error": "No resume data found. Please ensure the candidate's resume has been uploaded and processed."}
        )
        
    relevant_chunks_section = "RELEVANT RESUME EXPERIENCES (PRIORITIZE THESE):\n- " + "\n- ".join(request.relevant_chunks)

    prompt = ANALYZE_PROMPT.format(
        relevant_chunks_section=relevant_chunks_section,
        jd_text=request.jd_text,
    )
    
    # Log the redacted prompt
    logging.getLogger(__name__).info(f"Sending prompt to Gemini:\n{redact_pii(prompt)}")
    
    return call_gemini(prompt, MODEL)


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    try:
        vectors = generate_embeddings(request.texts)
        return EmbedResponse(embeddings=vectors)
    except RuntimeError as e:
        return JSONResponse(status_code=503, content={"error": str(e)})
