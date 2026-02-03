# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy only what is needed for install first (better caching)
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Now copy source
COPY . .

# Build the API
RUN pnpm --filter @payservice/api build

# ---------- Runtime stage ----------
FROM node:20-alpine

ENV NODE_ENV=production
RUN corepack enable

WORKDIR /app

# Copy the API package.json and lock/workspace files
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# Install ONLY the API's prod deps
RUN pnpm --filter @payservice/api install --prod --frozen-lockfile

# Copy the built dist into the SAME package folder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Run from inside the package so Node resolves ./node_modules correctly
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
