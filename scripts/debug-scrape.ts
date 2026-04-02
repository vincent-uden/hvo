import { parse } from "node-html-parser";

async function debugScraping() {
  console.log("=== Debugging Preem Scraping ===\n");

  try {
    console.log("1. Fetching Preem website...");
    const response = await fetch("https://www.preem.se/foretag/listpriser/");

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    console.log("✓ Successfully fetched page\n");

    const html = await response.text();
    const parsedHtml = parse(html);

    // Find all tables
    const tables = parsedHtml.querySelectorAll("table");
    console.log(`2. Found ${tables.length} table(s)\n`);

    tables.forEach((table, tableIndex) => {
      console.log(`\n--- Table ${tableIndex + 1} ---`);
      const rows = table.querySelectorAll("tr");
      console.log(`   Rows: ${rows.length}`);

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll("td");
        if (cells.length > 0) {
          const cellTexts = cells
            .map((cell, cellIndex) => {
              const text = cell.text?.trim() || "";
              return `[${cellIndex}]: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`;
            })
            .join(", ");
          console.log(`   Row ${rowIndex}: ${cellTexts}`);
        }
      });
    });

    // Also look for the date
    console.log("\n3. Looking for date element...");
    const dateElements = parsedHtml.querySelectorAll("div div p strong");
    console.log(`   Found ${dateElements.length} candidate elements`);

    dateElements.forEach((el, index) => {
      const text = el.text?.trim() || "";
      if (text.includes(":")) {
        console.log(`   [${index}]: "${text}"`);
      }
    });

    console.log("\n=== Debug Complete ===");
  } catch (error) {
    console.error("❌ Error during debugging:", error);
  }
}

debugScraping();
