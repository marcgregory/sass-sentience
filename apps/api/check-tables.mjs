import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_fBsPSa4TecF9@ep-snowy-darkness-ao2pkoqm-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
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
