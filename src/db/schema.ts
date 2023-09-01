import { numeric, pgTable, timestamp, uuid,  } from "drizzle-orm/pg-core";

export const priceLogs = pgTable("price_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    price: numeric("price", { precision: 8, scale: 2}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PriceLog = typeof priceLogs.$inferSelect;
export type NewPriceLog = typeof priceLogs.$inferInsert;
