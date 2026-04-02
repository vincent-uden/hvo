import { parse } from "node-html-parser";

async function testNewParsing() {
  console.log("=== Testing New Parsing Logic ===\n");

  try {
    const response = await fetch("https://www.preem.se/foretag/listpriser/");
    const html = await response.text();
    const parsedHtml = parse(html);

    const tables = parsedHtml.querySelectorAll("table");

    let hvoPrice: number | undefined;
    let dieselPrice: number | undefined;
    let priceDate: string | undefined;

    // Look through the first few tables
    for (const table of tables.slice(0, 5)) {
      const rows = table.querySelectorAll("tr");

      for (const row of rows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 3) continue;

        const fuelTypeCell = cells[0]?.text?.trim() || "";
        const priceCell = cells[1]?.text?.trim() || "";
        const dateCell = cells[2]?.text?.trim() || "";

        console.log(`Row: "${fuelTypeCell}" | "${priceCell}" | "${dateCell}"`);

        // Extract date
        if (dateCell && !priceDate) {
          const dateMatch = dateCell.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            priceDate = dateMatch[1];
            console.log(`  → Found date: ${priceDate}`);
          }
        }

        // Parse price
        const priceMatch = priceCell.match(/(\d+[,.]\d+)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(",", "."));

          if (
            fuelTypeCell.includes("HVO100") ||
            fuelTypeCell.includes("HVO 100")
          ) {
            hvoPrice = price;
            console.log(`  → Found HVO price: ${price} kr/l`);
          } else if (
            fuelTypeCell.includes("Diesel") &&
            !fuelTypeCell.includes("HVO") &&
            !fuelTypeCell.includes("ACP") &&
            !fuelTypeCell.includes("Biodiesel")
          ) {
            dieselPrice = price;
            console.log(`  → Found Diesel price: ${price} kr/l`);
          }
        }
      }

      if (hvoPrice !== undefined && dieselPrice !== undefined && priceDate) {
        break;
      }
    }

    console.log("\n=== Results ===");
    console.log(`HVO 100 Price: ${hvoPrice} kr/l`);
    console.log(`Diesel Price: ${dieselPrice} kr/l`);
    console.log(`Date: ${priceDate}`);

    if (hvoPrice && dieselPrice && priceDate) {
      console.log("\n✅ All values found successfully!");
    } else {
      console.log("\n❌ Missing some values");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testNewParsing();
