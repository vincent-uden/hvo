import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(), // ISO 8601 format: YYYY-MM-DD
    hvo100Price: real("hvo100_price").notNull(),
    dieselPrice: real("diesel_price").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    source: text("source").notNull().default("scraped"), // 'scraped', 'backfill', 'manual'
  },
  (table) => ({
    dateIdx: index("price_history_date_idx").on(table.date),
  }),
);

export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
