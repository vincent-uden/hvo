import type { APIRoute } from "astro";

import { parse } from "node-html-parser";

export const GET: APIRoute = async ({ params, request }) => {
  const response = await fetch(
    "https://www.preem.se/privat/drivmedel/drivmedelspriser/"
  );
  if (response.ok) {
    let parsedHtml = parse(await response.text());

    let priceTable = parsedHtml.querySelector("table");
    let hvoRow = priceTable?.querySelectorAll("tr")[3];
    let priceCell = hvoRow?.querySelectorAll("td")[1];
    let dateCell = hvoRow?.querySelectorAll("td")[2];
    
    console.log(priceCell?.innerText);
    console.log(dateCell?.innerText);

    return new Response(
      JSON.stringify({
        price: Number(priceCell?.innerText.replaceAll("\n", "").split(" ")[0].replace(",", ".")),
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
