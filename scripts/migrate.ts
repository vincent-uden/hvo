import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
}

const client = createClient({ url, authToken });
const migrationsDir = resolve("drizzle");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

async function migrationAlreadyApplied(file: string): Promise<boolean> {
  // The initial migration predates the migration table. Recognize its table
  // as the marker so existing databases can be upgraded safely.
  if (file === "0000_solid_cloak.sql") {
    const result = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'price_history'",
    );
    return result.rows.length > 0;
  }

  const result = await client.execute({
    sql: "SELECT 1 FROM app_migrations WHERE name = ?",
    args: [file],
  });
  return result.rows.length > 0;
}

async function runMigration() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  for (const file of migrationFiles) {
    if (await migrationAlreadyApplied(file)) {
      console.log(`✓ ${file} already applied`);
      // The initial migration may be from before app_migrations existed.
      if (file === "0000_solid_cloak.sql") {
        await client.execute({
          sql: "INSERT OR IGNORE INTO app_migrations (name, applied_at) VALUES (?, unixepoch())",
          args: [file],
        });
      }
      continue;
    }

    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.execute(sql);
    await client.execute({
      sql: "INSERT INTO app_migrations (name, applied_at) VALUES (?, unixepoch())",
      args: [file],
    });
    console.log(`✓ ${file} applied`);
  }
}

runMigration()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
