import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  driver: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!!,
    authToken: process.env.TURSO_AUTH_TOKEN!!,
  },
} satisfies Config;
