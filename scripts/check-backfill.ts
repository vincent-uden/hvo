import { db } from "../src/db/drizzle";
import { priceHistory } from "../src/db/schema";

async function checkBackfillProgress() {
  console.log("=== Checking Backfill Progress ===\n");

  // Get all records
  const allRecords = await db
    .select({
      id: priceHistory.id,
      date: priceHistory.date,
      hvo100Price: priceHistory.hvo100Price,
      dieselPrice: priceHistory.dieselPrice,
    })
    .from(priceHistory);

  console.log(`Total records in database: ${allRecords.length}`);

  if (allRecords.length > 0) {
    const dates = allRecords.map((r) => r.date).sort();
    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    console.log(`Date range: ${earliest} to ${latest}`);

    // Sample some records
    console.log("\nSample records:");
    allRecords.slice(0, 5).forEach((row) => {
      const hvo =
        row.hvo100Price > 0 ? `${row.hvo100Price.toFixed(2)} kr` : "N/A";
      const diesel =
        row.dieselPrice > 0 ? `${row.dieselPrice.toFixed(2)} kr` : "N/A";
      console.log(`  ${row.date}: HVO=${hvo}, Diesel=${diesel}`);
    });

    // Show records with both prices
    const bothPrices = allRecords.filter(
      (r) => r.hvo100Price > 0 && r.dieselPrice > 0,
    );
    console.log(`\nRecords with both HVO and Diesel: ${bothPrices.length}`);

    if (bothPrices.length > 0) {
      console.log("\nFirst record with both prices:");
      const first = bothPrices[0];
      console.log(
        `  ${first.date}: HVO=${first.hvo100Price.toFixed(2)} kr, Diesel=${first.dieselPrice.toFixed(2)} kr`,
      );
    }
  }

  console.log("\n" + "=".repeat(50));
}

checkBackfillProgress().catch(console.error);
