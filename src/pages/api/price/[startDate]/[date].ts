import type { APIRoute } from "astro";

import { db } from "../../../../db/drizzle";
import { sql } from "drizzle-orm";

export const GET: APIRoute = async ({ params, request }) => {
  const sDate = params.startDate;
  const date = params.date;
  if (date == null || sDate == null) {
    return new Response(JSON.stringify({}));
  }

  const startDate = new Date(sDate);
  const endDate = new Date(date);
  endDate.setMonth(endDate.getMonth() + 1);

  const query = sql`SELECT date_trunc('day', created_at, 'GMT') as day, avg(price) FROM price_logs GROUP BY day ORDER BY day ASC;`;
  const entries = await db.execute(query);

  let output: any = [];
  entries.forEach((x) => {
    if ((x.day as Date) > startDate && (x.day as Date) < endDate) {
      output.push(x);
    }
  });

  return new Response(JSON.stringify(output));
};

// -> 2023-08-01 -> [ 2023-08-01: 22.65, 2023-08-02: 24:41, ... ]
