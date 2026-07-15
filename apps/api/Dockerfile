# Sentience API — Dockerfile
#
# Fastify 5 API server. Runs from TypeScript source via tsx.
# Requires PostgreSQL at the DATABASE_URL endpoint.

FROM node:20-alpine AS base
RUN npm install -g pnpm@10.14.0
WORKDIR /app

# ─── Dependencies ──────────────────────────────────────────────────
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/config/package.json packages/config/

# bcrypt native module requires build tools on Alpine
RUN apk add --no-cache python3 make g++
RUN pnpm install --frozen-lockfile
RUN apk del python3 make g++

# ─── Shared packages source ────────────────────────────────────────
COPY packages/types/src packages/types/src
COPY packages/utils/src packages/utils/src
COPY packages/config/tailwind packages/config/tailwind
COPY packages/config/typescript packages/config/typescript

# ─── API source ────────────────────────────────────────────────────
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/drizzle.config.ts apps/api/
COPY apps/api/migrations apps/api/migrations

# ─── Entrypoint ─────────────────────────────────────────────────────
COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["/entrypoint.sh"]
