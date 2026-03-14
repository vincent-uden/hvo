import type { APIRoute } from "astro";

import { db } from "../../db/drizzle";
import { priceHistory } from "../../db/schema";
import { scrapePrices } from "./logPrice";

export const GET: APIRoute = async () => {
  const data = await scrapePrices();
  if (data !== undefined) {
    // Check if entry already exists for this date
    const existing = await db
      .select()
      .from(priceHistory)
      .where((table) => table.date === data.log.date);

    if (existing.length === 0) {
      await db.insert(priceHistory).values(data.log);
    }

    return new Response(
      JSON.stringify({
        hvo100Price: data.log.hvo100Price,
        dieselPrice: data.log.dieselPrice,
        date: data.date,
      }),
    );
  }
  return new Response(
    JSON.stringify({
      message: "Preem couldn't be reached or prices couldn't be parsed",
    }),
    { status: 500 },
  );
};
