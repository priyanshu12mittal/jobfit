# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ── Stage 2: Build the Next.js app ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Carry over installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# In Docker we talk directly to the orchestrator container by service name,
# not localhost. The proxy rewrites in next.config.ts handle this, so we pass
# the orchestrator URL as a build-time env var for Next.js to pick up.
ARG ORCHESTRATOR_URL=http://orchestrator:8081
ENV NEXT_PUBLIC_ORCHESTRATOR_URL=$ORCHESTRATOR_URL

# Build the optimised production bundle
RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
# Use a minimal node image — only what's needed to serve the built app.
FROM node:20-alpine AS runner

WORKDIR /app

# Don't run as root inside the container — security best practice
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
USER nextjs

# Copy built output from builder
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
