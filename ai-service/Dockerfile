# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# We use a slim Python 3.12 image as our base.
# "slim" means it has only the bare minimum OS packages — keeps the image small.
FROM python:3.12-slim AS builder

# Set the working directory inside the container.
# All subsequent commands run from here.
WORKDIR /app

# Copy ONLY requirements first.
# Docker caches each layer — if requirements.txt hasn't changed, this layer
# is reused on rebuild (much faster rebuilds during development).
COPY requirements.txt .

# Install dependencies into a separate directory (/install) so we can copy
# just the packages in the final stage, without pip itself or build tools.
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Final image ──────────────────────────────────────────────────────
# Start fresh from the same slim base — this is called a "multi-stage build".
# We only carry over the installed packages, not the pip cache or build tools.
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from the builder stage
COPY --from=builder /install /usr/local

# Copy our application source code
COPY . .

RUN useradd -m -r -s /bin/false appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# The GEMINI_API_KEY will be injected at runtime via docker-compose env vars.
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
