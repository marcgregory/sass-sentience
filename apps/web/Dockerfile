# Sentience Web — Dockerfile
#
# Next.js 15 standalone output. Builds static + server bundles,
# then runs the production server.

FROM node:20-alpine AS base
RUN npm install -g pnpm@10.14.0
WORKDIR /app

# ─── Dependencies ──────────────────────────────────────────────────
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/ui/package.json packages/ui/
COPY packages/hooks/package.json packages/hooks/
COPY packages/mock/package.json packages/mock/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile

# ─── Shared packages source ────────────────────────────────────────
COPY packages/types/src packages/types/src
COPY packages/utils/src packages/utils/src
COPY packages/ui/src packages/ui/src
COPY packages/hooks/src packages/hooks/src
COPY packages/mock/src packages/mock/src
COPY packages/config/src packages/config/src

# ─── Web app source ────────────────────────────────────────────────
COPY apps/web/src apps/web/src
COPY apps/web/public apps/web/public
COPY apps/web/next.config.ts apps/web/
COPY apps/web/tsconfig.json apps/web/
COPY apps/web/tailwind.config.ts apps/web/
COPY apps/web/postcss.config.mjs apps/web/
COPY apps/web/.eslintrc.json apps/web/

# ─── Build args (baked into client JS) ─────────────────────────────
ARG NEXT_PUBLIC_API_URL=http://api:3001/api
ARG NEXT_PUBLIC_SOCKET_URL=http://realtime:3002
ARG NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_ENABLE_DEMO_LOGIN=$NEXT_PUBLIC_ENABLE_DEMO_LOGIN

# Enable standalone output for Docker builds
ENV NEXT_STANDALONE=true

# ─── Build ─────────────────────────────────────────────────────────
RUN pnpm --filter @sentience/web build

# ─── Production server ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Standalone output includes server.js + bundled node_modules
COPY --from=base /app/apps/web/.next/standalone ./
# Static assets must be copied separately
COPY --from=base /app/apps/web/.next/static ./.next/static
COPY --from=base /app/apps/web/public ./public

EXPOSE 3000

# Standalone server bundles are in the output root by default
# (next.config.js outputFileTracingRoot can adjust this)
CMD ["node", "server.js"]
