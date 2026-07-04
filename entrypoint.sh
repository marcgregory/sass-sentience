#!/bin/sh
# entrypoint.sh — starts health HTTP server + MQTT simulator
set -e

PORT="${PORT:-3000}"

# Start tiny HTTP health-check server in background
node -e "
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
}).listen($PORT, () => {
  console.log('[health] HTTP server on port $PORT');
});
" &

# Run simulator in foreground (keeps container alive)
exec pnpm --filter @sentience/mock simulate -- --count "${SIMULATOR_DEVICE_COUNT:-55}"
