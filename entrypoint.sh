#!/bin/sh
# entrypoint.sh — starts the MQTT simulator
#
# The simulator's built-in HTTP health/ready endpoint (on $PORT) handles
# Render's port detection and provides real operational metrics.
set -e

exec pnpm --filter @sentience/mock simulate -- --count "${SIMULATOR_DEVICE_COUNT:-55}"
