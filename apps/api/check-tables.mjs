import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
try {
  const r = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
  );
  console.log("TABLES (" + r.rows.length + "):");
  for (const t of r.rows) console.log("  -", t.table_name);
} catch (e) {
  console.log("ERROR:", e.message);
}
await pool.end();
