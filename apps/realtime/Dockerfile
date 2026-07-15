# Sentience Realtime Bridge — Dockerfile
#
# Socket.IO + MQTT bridge server. Connects to Mosquitto MQTT broker
# and exposes a Socket.IO endpoint for web clients.
# Runs from TypeScript source via tsx.

FROM node:20-alpine AS base
RUN npm install -g pnpm@10.14.0
WORKDIR /app

# ─── Dependencies ──────────────────────────────────────────────────
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/realtime/package.json apps/realtime/
COPY packages/types/package.json packages/types/

RUN pnpm install --frozen-lockfile

# ─── Shared packages source ────────────────────────────────────────
COPY packages/types/src packages/types/src

# ─── Bridge source ─────────────────────────────────────────────────
COPY apps/realtime/src apps/realtime/src
COPY apps/realtime/tsconfig.json apps/realtime/

ENV NODE_ENV=production
EXPOSE 3002

CMD ["pnpm", "--filter", "@sentience/realtime", "start"]
