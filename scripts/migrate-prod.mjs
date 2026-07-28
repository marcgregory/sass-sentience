// One-off migration for production Neon DB
// Adds notification_preferences column to users table

import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Connected to Neon DB");

  const result = await client.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}';`,
  );
  console.log("Migration applied:", result.command, result.rowCount ?? 0);
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
