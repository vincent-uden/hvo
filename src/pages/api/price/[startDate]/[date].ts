import type { APIRoute } from "astro";

import { db } from "../../../../db/drizzle";
import { priceHistory } from "../../../../db/schema";
import { and, gte, lte } from "drizzle-orm";

const log = (phase: string, message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${phase}] ${message}`);
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: ${operation} exceeded ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
};

export const GET: APIRoute = async ({ params, request }) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log(requestId, `START Request: ${request.url}`);
    log(
      requestId,
      `Params: startDate=${params.startDate}, date=${params.date}`,
    );

    const sDate = params.startDate;
    const date = params.date;
    if (date == null || sDate == null) {
      log(requestId, "ERROR: Missing required parameters");
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Phase 1: Parse dates
    const parseStart = Date.now();
    const startDate = new Date(sDate);
    const endDate = new Date(date);
    endDate.setMonth(endDate.getMonth() + 1);
    log(requestId, `PARSE Dates parsed in ${Date.now() - parseStart}ms`);
    log(
      requestId,
      `Parsed dates: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`,
    );

    // Phase 2: Format date strings
    const formatStart = Date.now();
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    log(
      requestId,
      `FORMAT Date strings formatted in ${Date.now() - formatStart}ms`,
    );
    log(requestId, `Date range: ${startDateStr} to ${endDateStr}`);

    // Phase 3: Database query with 60-second timeout
    const queryStart = Date.now();
    log(requestId, `DB Starting query...`);

    const entries = await withTimeout(
      db
        .select()
        .from(priceHistory)
        .where(
          and(
            gte(priceHistory.date, startDateStr),
            lte(priceHistory.date, endDateStr),
          ),
        )
        .orderBy(priceHistory.date),
      60000,
      "Database query",
    );

    const queryDuration = Date.now() - queryStart;
    log(
      requestId,
      `DB Query completed in ${queryDuration}ms, returned ${entries.length} rows`,
    );

    // Phase 4: JSON serialization
    const jsonStart = Date.now();
    const jsonBody = JSON.stringify(entries);
    log(
      requestId,
      `JSON Serialization completed in ${Date.now() - jsonStart}ms, size=${jsonBody.length} bytes`,
    );

    const totalDuration = Date.now() - startTime;
    log(requestId, `COMPLETE Total request time: ${totalDuration}ms`);

    return new Response(jsonBody, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    log(
      requestId,
      `ERROR after ${errorDuration}ms: ${error instanceof Error ? error.message : String(error)}`,
    );

    if (error instanceof Error && error.stack) {
      log(requestId, `Stack trace: ${error.stack}`);
    }

    return new Response(
      JSON.stringify({
        error: "Request failed",
        message: error instanceof Error ? error.message : String(error),
        duration: errorDuration,
        requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

// -> 2023-08-01 -> 2023-09-01 -> [ { date: "2023-08-01", hvo100Price: 22.65, dieselPrice: 24.41, ... }, ... ]
