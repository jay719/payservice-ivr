# syntax=docker/dockerfile:1

# ---------- deps stage (cache pnpm store) ----------
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Fetch all packages into pnpm store (no node_modules yet)
RUN pnpm fetch

# ---------- build stage ----------
FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Bring pnpm store from deps stage
COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Install (offline from store) so we can build
RUN pnpm install --offline --frozen-lockfile

# Copy source
COPY apps/api apps/api

# Build your API (tsc -> dist)
RUN pnpm --filter @payservice/api build

# Produce a portable prod bundle for just the API
RUN pnpm --filter @payservice/api deploy --prod /out

# ---------- runtime stage ----------
FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy the deployed (portable) API bundle
COPY --from=build /out/ ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
