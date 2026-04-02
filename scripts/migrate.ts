import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!!,
  authToken: process.env.TURSO_AUTH_TOKEN!!,
});

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = resolve("drizzle/0001_add_date_index.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("Running migration:");
    console.log(migrationSQL);

    // Execute the SQL
    await client.execute(migrationSQL);

    console.log("✓ Migration applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigration();
