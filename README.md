# JobFit AI

A job-application copilot that uses RAG (Retrieval-Augmented Generation) to evaluate how well a candidate's resume matches a job description, providing fit scores, gap analysis, and tailored resume bullets.

## Architecture

```
Browser :3000 → Frontend (Next.js)
                    │
                    ▼ (server-side proxy)
              Orchestrator :8081 (Spring Boot + JPA)
                    │              │
                    ▼              ▼
              PostgreSQL        AI Service :8000 (FastAPI)
              (pgvector)       ├── Gemini (generation)
                               └── fastembed (local embeddings)
```

| Service | Stack | Purpose |
|---------|-------|---------|
| **Frontend** | Next.js 16, React 19, CSS | Kanban board UI, API proxy via middleware |
| **Orchestrator** | Spring Boot 3.4, JPA, PostgreSQL | Application CRUD, RAG retrieval via pgvector |
| **AI Service** | FastAPI, google-genai SDK, fastembed | Embedding generation (BAAI/bge-small-en-v1.5, 384d), Gemini-powered analysis |
| **Database** | PostgreSQL 16 + pgvector | Stores applications, users, and resume chunk embeddings |

### RAG Pipeline

1. Resume text is chunked (~500 chars) and embedded locally via fastembed
2. Embeddings are stored as `vector(384)` columns with an HNSW index
3. At analysis time, the JD is embedded and top-5 similar resume chunks are retrieved via `<=>` cosine distance
4. Retrieved chunks + JD are injected into a structured Gemini prompt
5. Gemini returns fit score, strengths, gaps, and suggested resume bullets

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and a DB_PASSWORD

# 2. Run everything
docker compose up --build

# 3. Open http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_USERNAME` | No | PostgreSQL user (default: `jobfit`) |
| `APP_API_KEY` | No | Bearer token for API auth (blank = disabled) |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated frontend origins (default: `http://localhost:3000`) |

## Development

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend dev)
- JDK 21 (for orchestrator dev)
- Python 3.12+ (for AI service dev)

### Running services individually

```bash
# Frontend
cd frontend && npm install && npm run dev

# Orchestrator (needs Postgres running)
cd orchestrator && ./gradlew bootRun

# AI Service
cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload
```

### Running evaluations

```bash
cd ai-service && python evals/evaluate.py
```

This runs Recall@5 and Faithfulness scoring against a golden dataset.

## CI/CD

- **CI** (GitHub Actions): Ruff lint (Python), Gradle build (Java), ESLint + TypeScript check (Frontend)
- **CD**: Docker images published to GHCR on merge to `main`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/applications` | Create application |
| `GET` | `/api/applications` | List user's applications |
| `GET` | `/api/applications/:id` | Get application detail |
| `PATCH` | `/api/applications/:id` | Update application |
| `POST` | `/api/applications/:id/analyze` | Run AI fit analysis |

All `/api/` endpoints require `X-User-Id` header and (when configured) `Authorization: Bearer <token>`.
