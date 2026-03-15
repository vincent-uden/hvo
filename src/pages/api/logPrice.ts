import type { APIRoute } from "astro";

import { parse } from "node-html-parser";
import { db } from "../../db/drizzle";
import { priceHistory, type NewPriceHistory } from "../../db/schema";

export interface ScrapedPriceData {
  log: NewPriceHistory;
  date: string;
}

export async function scrapePrices(): Promise<ScrapedPriceData | undefined> {
  try {
    const fetchStart = Date.now();
    const response = await fetch("https://www.preem.se/foretag/listpriser/");
    const fetchDuration = Date.now() - fetchStart;
    console.log(`⏱️ [logPrice.ts] HTTP request to Preem: ${fetchDuration}ms`);

    if (!response.ok) {
      return undefined;
    }

    const parseStart = Date.now();
    const responseText = await response.text();
    const parsedHtml = parse(responseText);

    // Find the first table (it contains both Diesel and HVO prices)
    const tables = parsedHtml.querySelectorAll("table");

    let hvoPrice: number | undefined;
    let dieselPrice: number | undefined;
    let priceDate: string | undefined;

    // Look through the first few tables to find the one with Diesel and HVO
    for (const table of tables.slice(0, 5)) {
      const rows = table.querySelectorAll("tr");

      for (const row of rows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 3) continue;

        const fuelTypeCell = cells[0]?.text?.trim() || "";
        const priceCell = cells[1]?.text?.trim() || "";
        const dateCell = cells[2]?.text?.trim() || "";

        // Extract date from format "Gäller fr.om2026-03-13"
        if (dateCell && !priceDate) {
          const dateMatch = dateCell.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            priceDate = dateMatch[1];
          }
        }

        // Parse price from format "Pris inkl. moms21,84 kr/l"
        const priceMatch = priceCell.match(/(\d+[,.]\d+)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(",", "."));

          // Check fuel type (first cell contains both category and name)
          if (
            fuelTypeCell.includes("HVO100") ||
            fuelTypeCell.includes("HVO 100")
          ) {
            hvoPrice = price;
          } else if (
            fuelTypeCell.includes("Diesel") &&
            !fuelTypeCell.includes("HVO") &&
            !fuelTypeCell.includes("ACP") &&
            !fuelTypeCell.includes("Biodiesel")
          ) {
            // Regular Diesel (not HVO, ACP, or Biodiesel)
            dieselPrice = price;
          }
        }
      }

      // If we found both prices, we can stop
      if (hvoPrice !== undefined && dieselPrice !== undefined && priceDate) {
        break;
      }
    }
    const parseDuration = Date.now() - parseStart;
    console.log(`⏱️ [logPrice.ts] HTML parsing: ${parseDuration}ms`);

    if (hvoPrice === undefined || dieselPrice === undefined || !priceDate) {
      console.log("Could not find all required data:", {
        hvoPrice,
        dieselPrice,
        priceDate,
      });
      return undefined;
    }

    const now = new Date();

    return {
      log: {
        date: priceDate,
        hvo100Price: hvoPrice,
        dieselPrice: dieselPrice,
        createdAt: now,
        updatedAt: now,
        source: "scraped",
      },
      date: priceDate,
    };
  } catch (error) {
    console.error("Error scraping prices:", error);
    return undefined;
  }
}

export const POST: APIRoute = async () => {
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
