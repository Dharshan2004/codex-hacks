// Applies SQL migrations (in order, once each) and the seed to a hosted
// Supabase Postgres database. Reads SUPABASE_DB_URL from .env.local.
//
// Usage:  npm run db:push
//
// Each migration runs inside a transaction and is recorded in a
// `schema_migrations` ledger, so re-running only applies new files. The seed is
// idempotent (upsert by slug) and runs every time.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Next.js reads .env.local; mirror that here so credentials live in one place.
loadEnv({ path: join(root, ".env.local") });
const migrationsDir = join(root, "supabase", "migrations");
const seedPath = join(root, "supabase", "seed.sql");

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "\n✗ SUPABASE_DB_URL is not set in .env.local.\n" +
      "  Find it in Supabase: Project Settings -> Database -> Connection string (URI).\n",
  );
  process.exit(1);
}

// Supabase requires SSL; allow self-signed in this demo context.
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function ensureLedger() {
  await client.query(
    `create table if not exists public.schema_migrations (
       filename text primary key,
       applied_at timestamptz not null default now()
     );`,
  );
}

async function appliedSet() {
  const { rows } = await client.query(
    "select filename from public.schema_migrations",
  );
  return new Set(rows.map((r) => r.filename));
}

async function applyMigration(file, sql) {
  // Whole file in one transaction so a partial failure rolls back cleanly.
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into public.schema_migrations (filename) values ($1)",
      [file],
    );
    await client.query("commit");
    console.log(`  ✓ ${file}`);
  } catch (err) {
    await client.query("rollback");
    throw new Error(`${file}: ${err.message}`);
  }
}

async function main() {
  console.log("→ Connecting to Supabase Postgres…");
  await client.connect();
  await ensureLedger();

  const applied = await appliedSet();
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("→ Applying migrations:");
  let newCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  • ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await applyMigration(file, sql);
    newCount += 1;
  }
  if (newCount === 0) console.log("  (no new migrations)");

  console.log("→ Applying seed:");
  await client.query(readFileSync(seedPath, "utf8"));
  console.log("  ✓ seed.sql");

  await client.end();
  console.log("\n✓ Database is up to date.\n");
}

main().catch(async (err) => {
  console.error("\n✗ db:push failed:", err.message);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
