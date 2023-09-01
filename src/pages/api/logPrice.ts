import type { APIRoute } from "astro";

import { parse } from "node-html-parser";
import { db } from "../../db/drizzle";
import { priceLogs, type NewPriceLog } from "../../db/schema";

export const POST: APIRoute = async ({ params, request }) => {
  const response = await fetch(
    "https://www.preem.se/privat/drivmedel/drivmedelspriser/"
  );
  if (response.ok) {
    let parsedHtml = parse(await response.text());

    let priceTable = parsedHtml.querySelector("table");
    let hvoRow = priceTable?.querySelectorAll("tr")[3];
    let priceCell = hvoRow?.querySelectorAll("td")[1];
    let dateCell = hvoRow?.querySelectorAll("td")[2];
    
    let price = priceCell?.innerText.replaceAll("\n", "").split(" ")[0].replace(",", ".");
    
    if (price != null) {
      let newPrice: NewPriceLog = {
        price: price,
      };
      
      await db.insert(priceLogs).values(newPrice);
    }

    return new Response(
      JSON.stringify({
        price: Number(price),
        date: dateCell?.innerText.replaceAll("\n", ""),
      })
    );
  }

  return new Response(
    JSON.stringify({
      message: "Preem couldn't be reached",
    })
  );
};
