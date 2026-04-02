import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

declare global {
  var dbClient: ReturnType<typeof createClient> | undefined;
  var db: LibSQLDatabase<Record<string, never>> | undefined;
}

const dbClient =
  global.dbClient ||
  createClient({
    url: process.env.TURSO_DATABASE_URL!!,
    authToken: process.env.TURSO_AUTH_TOKEN!!,
  });

export const db = global.db || drizzle(dbClient);

if (process.env.NODE_ENV !== "production") {
  global.dbClient = dbClient;
  global.db = db;
}
