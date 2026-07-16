import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_fBsPSa4TecF9@ep-snowy-darkness-ao2pkoqm-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});
try {
  // Check the drizzle migration tracking table
  const r = await pool.query("SELECT * FROM __drizzle_migrations ORDER BY id");
  console.log("DRIZZLE MIGRATIONS TRACKED (" + r.rows.length + "):");
  for (const row of r.rows) {
    console.log("  id:", row.id, "| hash:", row.hash, "| created_at:", row.created_at);
  }

  // Also check if there's a _journal table in the migrations schema
  try {
    const j = await pool.query(
      "SELECT id, idx, tag, when_created FROM __drizzle_migrations ORDER BY id",
    );
  } catch (_) {
    console.log("\n(no secondary tracking table)");
  }
} catch (e) {
  console.log("ERROR checking drizzle meta:", e.message);
}

// Now try a raw SQL create
try {
  console.log("\n--- Trying direct CREATE TABLE ---");
  await pool.query(
    `CREATE TABLE IF NOT EXISTS firmware_packages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      version text NOT NULL,
      device_type text[] DEFAULT '{}' NOT NULL,
      release_notes text,
      file_hash text,
      file_size integer,
      status text DEFAULT 'active' NOT NULL,
      created_by uuid,
      metadata jsonb DEFAULT '{}',
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    )`,
  );
  console.log("  firmware_packages CREATED!");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS rollouts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_type text DEFAULT 'firmware' NOT NULL,
      name text NOT NULL,
      firmware_package_id uuid,
      job_config jsonb,
      target_group_id uuid NOT NULL,
      status text DEFAULT 'draft' NOT NULL,
      device_count integer DEFAULT 0 NOT NULL,
      completed_count integer DEFAULT 0 NOT NULL,
      failed_count integer DEFAULT 0 NOT NULL,
      created_by uuid NOT NULL,
      started_at timestamp with time zone,
      completed_at timestamp with time zone,
      cancelled_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    )`,
  );
  console.log("  rollouts CREATED!");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS rollout_devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rollout_id uuid NOT NULL,
      device_id uuid NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      error_message text,
      started_at timestamp with time zone,
      completed_at timestamp with time zone
    )`,
  );
  console.log("  rollout_devices CREATED!");
} catch (e) {
  console.log("ERROR creating tables:", e.message);
}

await pool.end();
