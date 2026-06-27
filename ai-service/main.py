from fastapi import FastAPI

app = FastAPI(title="JobFit AI Service")


@app.get("/health")
def health():
    return {"status": "ok"}
