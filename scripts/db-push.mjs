// Applies the SQL migrations (in order) and the seed to a hosted Supabase
// Postgres database. Reads SUPABASE_DB_URL from .env.local.
//
// Usage:  npm run db:push
//
// This is a lightweight alternative to the Supabase CLI for a solo demo: it
// just runs each .sql file. Migrations are written to be re-runnable
// (IF NOT EXISTS / idempotent seed), but `alter publication ... add table`
// errors if the table is already in the publication — we tolerate that.

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

// Errors that are safe to ignore on re-run (object already exists).
function isIgnorable(err) {
  // 42710 duplicate_object (e.g. policy/table already in publication),
  // 42P07 duplicate_table, 42P06 duplicate_schema, 42701 duplicate_column.
  return ["42710", "42P07", "42P06", "42701"].includes(err.code);
}

async function runSqlFile(label, sql) {
  // Run the whole file as one batch; on an ignorable duplicate error, retry
  // statement-by-statement so the rest of the file still applies.
  try {
    await client.query(sql);
    console.log(`  ✓ ${label}`);
  } catch (err) {
    if (!isIgnorable(err)) throw err;
    console.log(`  • ${label}: re-applying statement-by-statement…`);
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (e) {
        if (!isIgnorable(e)) throw e;
      }
    }
    console.log(`  ✓ ${label} (idempotent)`);
  }
}

async function main() {
  console.log("→ Connecting to Supabase Postgres…");
  await client.connect();

  console.log("→ Applying migrations:");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await runSqlFile(file, sql);
  }

  console.log("→ Applying seed:");
  await runSqlFile("seed.sql", readFileSync(seedPath, "utf8"));

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
