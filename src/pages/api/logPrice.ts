import type { APIRoute } from "astro";

import { parse } from "node-html-parser";
import { db } from "../../db/drizzle";
import { priceLogs, type NewPriceLog } from "../../db/schema";

export async function scrapePrice(): Promise<
  { log: NewPriceLog; date: string | undefined } | undefined
> {
  try {
    const response = await fetch("https://www.preem.se/foretag/listpriser/");
    if (response.ok) {
      let parsedHtml = parse(await response.text());

      let priceTable = parsedHtml.querySelector("table");
      let hvoRow = priceTable?.querySelectorAll("tr")[2];
      let priceCell = hvoRow
        ?.querySelectorAll("td")[1]
        .querySelectorAll("span")[1];
      let dateCell = parsedHtml.querySelector("div>div>p>strong");

      let price = priceCell?.innerText
        .replaceAll("\n", "")
        .split(" ")[0]
        .replace(",", ".");
      if (price === undefined) {
        return undefined;
      } else {
        return {
          log: { price },
          date: dateCell?.innerText.split(": ")[1],
        };
      }
    } else {
      return undefined;

    }
  } catch {
    return undefined;
  }
}

export const POST: APIRoute = async ({ params, request }) => {
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
