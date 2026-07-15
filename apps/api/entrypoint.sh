#!/bin/sh
# entrypoint.sh — Sentience API
#
# Runs database migrations and seed, then starts the API server.
# The RUN_MIGRATIONS env var controls whether migrations run.
# The SEED_DATABASE env var controls whether seed data is loaded.

set -e

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] Running database migrations..."
  pnpm --filter @sentience/api db:migrate
  echo "[entrypoint] Migrations complete."
fi

if [ "${SEED_DATABASE}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  pnpm --filter @sentience/api db:seed
  echo "[entrypoint] Seed complete."
fi

echo "[entrypoint] Starting API server..."
exec pnpm --filter @sentience/api start
