import type { APIRoute } from "astro";

import { parse } from "node-html-parser";
import { db } from "../../db/drizzle";
import { priceLogs, type NewPriceLog } from "../../db/schema";
import { scrapePrice } from "./logPrice";

export const GET: APIRoute = async ({ params, request }) => {
  let data = await scrapePrice();
  if (data !== undefined) {
    await db.insert(priceLogs).values(data.log);

    return new Response(
      JSON.stringify({
        price: Number(data?.log.price),
        date: data?.date,
      }),
    );
  }
  return new Response(
    JSON.stringify({
      message: "Preem couldn't be reached",
    }),
  );
};
