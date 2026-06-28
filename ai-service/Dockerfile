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

# Tell Docker this container will listen on port 8000
EXPOSE 8000

# The GOOGLE_API_KEY will be injected at runtime via docker-compose env vars.
# We do NOT bake secrets into the image.
ENV PYTHONUNBUFFERED=1

# Start Uvicorn — same as running it locally, but bound to 0.0.0.0 so
# Docker can route external traffic into the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
