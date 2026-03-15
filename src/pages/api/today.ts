import type { APIRoute } from "astro";

import { db } from "../../db/drizzle";
import { priceHistory } from "../../db/schema";
import { eq } from "drizzle-orm";
import { scrapePrices } from "./logPrice";

export const GET: APIRoute = async () => {
  const startTime = Date.now();

  // Check if today's entry already exists
  const today = new Date().toISOString().split("T")[0];
  const dbCheckStart = Date.now();

  const existing = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.date, today));

  const dbCheckDuration = Date.now() - dbCheckStart;
  console.log(
    `⏱️ [today.ts] DB check for ${today}: ${dbCheckDuration}ms, found: ${existing.length > 0}`,
  );

  if (existing.length > 0) {
    const totalDuration = Date.now() - startTime;
    console.log(`⏱️ [today.ts] Cache hit! Total time: ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        hvo100Price: existing[0].hvo100Price,
        dieselPrice: existing[0].dieselPrice,
        date: existing[0].date,
        cached: true,
      }),
    );
  }

  console.log(`⏱️ [today.ts] Cache miss - need to scrape Preem`);

  const scrapeStart = Date.now();
  const data = await scrapePrices();
  const scrapeDuration = Date.now() - scrapeStart;
  console.log(`⏱️ [today.ts] Scrape prices: ${scrapeDuration}ms`);

  if (data !== undefined) {
    const insertStart = Date.now();
    await db.insert(priceHistory).values(data.log);
    const insertDuration = Date.now() - insertStart;
    console.log(`⏱️ [today.ts] DB insert: ${insertDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`⏱️ [today.ts] Total request time: ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        hvo100Price: data.log.hvo100Price,
        dieselPrice: data.log.dieselPrice,
        date: data.date,
        cached: false,
      }),
    );
  }

  const totalDuration = Date.now() - startTime;
  console.log(`⏱️ [today.ts] Total request time (failed): ${totalDuration}ms`);

  return new Response(
    JSON.stringify({
      message: "Preem couldn't be reached or prices couldn't be parsed",
    }),
    { status: 500 },
  );
};
