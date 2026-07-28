// One-off migration: add notification_preferences column to users table
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function main() {
  const client = new Client(DATABASE_URL);
  await client.connect();
  console.log("Connected to database");

  try {
    const result = await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}';`,
    );
    console.log("Migration applied:", result.command, result.rowCount);
  } catch (err) {
    console.error("Migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
