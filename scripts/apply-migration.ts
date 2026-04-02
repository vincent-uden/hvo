import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function applyMigration() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!!,
    authToken: process.env.TURSO_AUTH_TOKEN!!,
  });

  // Read the migration file
  const migrationPath = path.join(
    process.cwd(),
    "drizzle",
    "0000_solid_cloak.sql",
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  console.log("Applying migration...");
  console.log(migrationSql);

  // Execute the migration
  await client.execute(migrationSql);

  console.log("Migration applied successfully!");

  // Verify by querying the table
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='price_history'",
  );
  if (result.rows.length > 0) {
    console.log("✓ price_history table created successfully");
  }
}

applyMigration().catch((err) => {
  console.error("Error applying migration:", err);
  process.exit(1);
});
