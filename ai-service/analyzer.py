import logging
import time

from google.genai import errors as genai_errors
from google.genai import types

from llm import gemini_client
from models import AnalysisResult
from prompts import ANALYZE_PROMPT

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
INITIAL_BACKOFF_SECS = 5


def call_gemini(prompt: str, model: str) -> AnalysisResult:
    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            response = gemini_client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AnalysisResult,
                ),
            )
            return AnalysisResult.model_validate_json(response.text)

        except genai_errors.ClientError as exc:
            if exc.code == 429:
                wait = INITIAL_BACKOFF_SECS * (2 ** attempt)
                logger.warning(
                    "Rate limited (429). Retry %d/%d in %ds",
                    attempt + 1, MAX_RETRIES, wait,
                )
                last_exception = exc
                time.sleep(wait)
                continue
            raise

    raise last_exception
