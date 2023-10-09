import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

declare global {
  var drizzle_client: postgres.Sql | undefined;
  var db: PostgresJsDatabase<Record<string, never>> | undefined;
}

const drizzle_client =
  global.drizzle_client || postgres(process.env.PSQL_URL!!);
export const db = global.db || drizzle(drizzle_client);
