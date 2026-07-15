#!/usr/bin/env tsx
/**
 * wait-for-services.ts
 *
 * Polls each service endpoint until it is ready, then exits 0.
 * Times out with a diagnostic summary if any service fails to respond.
 *
 * Usage:
 *   npx tsx scripts/wait-for-services.ts [--timeout 120]
 *
 * Environment variables (with defaults for the e2e compose environment):
 *   POSTGRES_HOST=postgres  POSTGRES_PORT=5432
 *   MQTT_HOST=mosquitto     MQTT_PORT=1883
 *   API_URL=http://api:3001
 *   REALTIME_HOST=realtime  REALTIME_PORT=3002
 *   SIMULATOR_HOST=simulator  SIMULATOR_PORT=3000
 *   WEB_URL=http://web:3000
 */

type CheckResult = { name: string; ok: boolean; detail: string };

const TIMEOUT_S = process.argv.includes("--timeout")
  ? parseInt(process.argv[process.argv.indexOf("--timeout") + 1], 10) || 120
  : 120;

const POLL_INTERVAL_MS = 2_000;
const start = Date.now();

// ─── Configuration ───────────────────────────────────────────────────

const CFG = {
  postgres: {
    host: process.env.POSTGRES_HOST ?? "postgres",
    port: parseInt(process.env.POSTGRES_PORT ?? "5432", 10),
  },
  mqtt: {
    host: process.env.MQTT_HOST ?? "mosquitto",
    port: parseInt(process.env.MQTT_PORT ?? "1883", 10),
  },
  api: {
    healthUrl: `${process.env.API_URL ?? "http://api:3001"}/api/health`,
    readyUrl: `${process.env.API_URL ?? "http://api:3001"}/api/ready`,
  },
  realtime: {
    host: process.env.REALTIME_HOST ?? "realtime",
    port: parseInt(process.env.REALTIME_PORT ?? "3002", 10),
  },
  simulator: {
    // Simulator is MQTT-only and does not expose a TCP listener
    // Skip TCP check — rely on MQTT broker readiness instead
    skip: true as const,
  },
  web: {
    url: process.env.WEB_URL ?? "http://web:3000",
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

async function tcpCheck(
  host: string,
  port: number,
): Promise<boolean> {
  try {
    const { connect } = await import("net");
    return new Promise((resolve) => {
      const socket = connect(port, host, () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
      socket.setTimeout(3_000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function httpCheck(url: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false };
  }
}

function elapsed(): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

function isTimeout(): boolean {
  return Date.now() - start > TIMEOUT_S * 1000;
}

function log(msg: string): void {
  console.log(`[wait-for-services] ${msg}`);
}

// ─── Service Checks ──────────────────────────────────────────────────

async function waitForService(
  name: string,
  check: () => Promise<boolean>,
): Promise<CheckResult> {
  log(`Waiting for ${name}...`);
  while (!isTimeout()) {
    const ok = await check();
    if (ok) {
      log(`  ✅ ${name} ready (${elapsed()})`);
      return { name, ok: true, detail: "ready" };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { name, ok: false, detail: `timed out after ${TIMEOUT_S}s` };
}

async function checkAll(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. PostgreSQL TCP
  results.push(
    await waitForService("PostgreSQL", () => tcpCheck(CFG.postgres.host, CFG.postgres.port)),
  );

  // 2. Mosquitto TCP
  results.push(
    await waitForService("Mosquitto", () => tcpCheck(CFG.mqtt.host, CFG.mqtt.port)),
  );

  // 3. API /health (liveness)
  results.push(
    await waitForService("API (liveness)", async () => {
      const { ok } = await httpCheck(CFG.api.healthUrl);
      return ok;
    }),
  );

  // 4. API /ready (readiness — migrations applied)
  results.push(
    await waitForService("API (readiness)", async () => {
      const { ok } = await httpCheck(CFG.api.readyUrl);
      return ok;
    }),
  );

  // 5. Realtime bridge TCP
  results.push(
    await waitForService("Realtime Bridge", () => tcpCheck(CFG.realtime.host, CFG.realtime.port)),
  );

  // 6. Simulator (MQTT-only — no TCP listener; skip check)
  log("  ✅ Simulator: MQTT-only, no TCP listener (skipped)");
  results.push({ name: "Simulator", ok: true, detail: "skipped (MQTT-only)" });

  // 7. Web HTTP
  results.push(
    await waitForService("Web", async () => {
      const { ok } = await httpCheck(CFG.web.url);
      return ok;
    }),
  );

  return results;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  log(`Starting readiness checks (timeout: ${TIMEOUT_S}s)`);
  log("");

  const results = await checkAll();

  console.log("");
  log("=== Results ===");
  let allOk = true;
  for (const r of results) {
    if (r.ok) {
      console.log(`  ✅ ${r.name}: ${r.detail}`);
    } else {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
      allOk = false;
    }
  }

  if (allOk) {
    log(`✅ All services ready! (total: ${elapsed()})`);
    process.exit(0);
  } else {
    log("❌ Some services failed to become ready");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[wait-for-services] Fatal error:", err);
  process.exit(1);
});
