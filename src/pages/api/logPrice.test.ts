import { expect, test } from "bun:test";
import { scrapePrice } from "./logPrice";

test("Scraping works", async () => {
  let data = await scrapePrice();
  expect(data).not.toBeUndefined();
});
