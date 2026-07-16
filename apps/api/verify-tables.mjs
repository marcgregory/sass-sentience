import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_fBsPSa4TecF9@ep-snowy-darkness-ao2pkoqm-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});
try {
  const tables = ["firmware_packages", "rollouts", "rollout_devices", "device_groups", "devices"];
  for (const t of tables) {
    const r = await pool.query(`SELECT COUNT(*)::int as c FROM "${t}"`);
    console.log(`  ${t}: ${r.rows[0].c} rows`);
  }
} catch (e) {
  console.log("ERROR:", e.message);
}
await pool.end();
