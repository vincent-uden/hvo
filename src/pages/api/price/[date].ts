import type { APIRoute } from "astro";

import { db } from "../../../db/drizzle";
import { priceLogs } from "../../../db/schema";
import { gt, sql } from "drizzle-orm";

export const GET: APIRoute = async ({ params, request }) => {
  const date = params.date;
  if (date == null) {
    return new Response(JSON.stringify({}));
  }
  const startDate = new Date(date);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth()+1)
  
  const priceRows = await db.select().from(priceLogs).where(gt(priceLogs.createdAt, startDate));
  const query = sql`SELECT date_trunc('day', created_at, 'GMT') as day, avg(price) FROM price_logs GROUP BY day;`
  const entries = await db.execute(query);
  
  let output: any = [];
  entries.forEach((x) => output.push(x));
  
  return new Response(JSON.stringify(output));
};

// -> 2023-08-01 -> [ 2023-08-01: 22.65, 2023-08-02: 24:41, ... ]