from fastapi import FastAPI

from llm import gemini_client

app = FastAPI(title="JobFit AI Service")


@app.get("/health")
def health():
    return {"status": "ok", "gemini_model": "gemini-2.5-flash"}
