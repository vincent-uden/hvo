import type { APIRoute } from "astro";

import { db } from "../../../../db/drizzle";
import { priceHistory } from "../../../../db/schema";
import { and, gte, lte } from "drizzle-orm";

export const GET: APIRoute = async ({ params }) => {
  const sDate = params.startDate;
  const date = params.date;
  if (date == null || sDate == null) {
    return new Response(JSON.stringify({}));
  }

  const startDate = new Date(sDate);
  const endDate = new Date(date);
  endDate.setMonth(endDate.getMonth() + 1);

  // Format dates as ISO strings (YYYY-MM-DD) for comparison
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Query using Drizzle ORM with SQLite-compatible date comparison
  const entries = await db
    .select()
    .from(priceHistory)
    .where(
      and(
        gte(priceHistory.date, startDateStr),
        lte(priceHistory.date, endDateStr),
      ),
    )
    .orderBy(priceHistory.date);

  return new Response(JSON.stringify(entries), {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
};

// -> 2023-08-01 -> 2023-09-01 -> [ { date: "2023-08-01", hvo100Price: 22.65, dieselPrice: 24.41, ... }, ... ]
