# ---------- build stage ----------
FROM node:20-slim AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Install deps (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api apps/api

# Build API
RUN pnpm --filter api build


# ---------- runtime stage ----------
FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Install production deps only
RUN pnpm install --prod --frozen-lockfile

# Copy compiled output
COPY --from=build /app/apps/api/dist apps/api/dist

EXPOSE 3001

CMD ["pnpm", "--filter", "api", "start"]
