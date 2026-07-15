// One-off migration for production Neon DB
// Adds notification_preferences column to users table

import pg from "pg";
const { Client } = pg;

const DATABASE_URL =
  "postgresql://neondb_owner:npg_fBsPSa4TecF9@ep-snowy-darkness-ao2pkoqm-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

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
