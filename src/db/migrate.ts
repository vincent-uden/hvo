import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config()

console.log(process.env.PSQL_URL)

const connectionString = process.env.PSQL_URL;
const sql = postgres(connectionString!!, { max: 1 });
const db = drizzle(sql, { logger: true });

//console.log(db.select().from(users));

await migrate(db, { migrationsFolder: "drizzle" });

console.log("Migration Complete");
