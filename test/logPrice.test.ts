import { expect, test } from "bun:test";
import { scrapePrice } from "../src/pages/api/logPrice";

test("Scraping works", async () => {
  let data = await scrapePrice();
  expect(data).not.toBeUndefined();
});
