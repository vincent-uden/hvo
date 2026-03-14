import { db } from "../src/db/drizzle";
import { priceHistory } from "../src/db/schema";
import { scrapePrices } from "../src/pages/api/logPrice";
import { eq } from "drizzle-orm";

async function testScrapingEndToEnd() {
  console.log("=== End-to-End Scraping Test ===\n");

  // Step 1: Scrape prices
  console.log("1. Scraping prices from Preem...");
  const scrapedData = await scrapePrices();

  if (!scrapedData) {
    console.error("❌ FAILED: Could not scrape prices from Preem");
    console.error("   Possible reasons:");
    console.error("   - Preem website is down");
    console.error("   - HTML structure has changed");
    console.error("   - Network connectivity issue");
    process.exit(1);
  }

  console.log("✓ Successfully scraped data:");
  console.log(`   Date: ${scrapedData.date}`);
  console.log(`   HVO 100 Price: ${scrapedData.log.hvo100Price} kr`);
  console.log(`   Diesel Price: ${scrapedData.log.dieselPrice} kr`);
  console.log(`   Source: ${scrapedData.log.source}`);
  console.log();

  // Step 2: Check if entry already exists
  console.log("2. Checking if entry already exists in database...");
  const existingEntries = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.date, scrapedData.log.date));

  if (existingEntries.length > 0) {
    console.log(
      `⚠ Entry for ${scrapedData.log.date} already exists, skipping insert`,
    );
    console.log(`   Existing data:`, existingEntries[0]);
    console.log("\n=== Test Complete (Skipped Insert) ===");
    return;
  }

  console.log("✓ No existing entry found, proceeding with insert\n");

  // Step 3: Insert into database
  console.log("3. Inserting scraped data into database...");
  try {
    await db.insert(priceHistory).values(scrapedData.log);
    console.log("✓ Successfully inserted data\n");
  } catch (error) {
    console.error("❌ FAILED: Could not insert data into database");
    console.error("   Error:", error);
    process.exit(1);
  }

  // Step 4: Validate the inserted data
  console.log("4. Validating inserted data...");
  const [insertedRow] = await db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.date, scrapedData.log.date));

  if (!insertedRow) {
    console.error("❌ FAILED: Could not find inserted row in database");
    process.exit(1);
  }

  // Validate each field
  const validations = [
    {
      field: "date",
      expected: scrapedData.log.date,
      actual: insertedRow.date,
    },
    {
      field: "hvo100Price",
      expected: scrapedData.log.hvo100Price,
      actual: insertedRow.hvo100Price,
      tolerance: 0.01, // Allow tiny floating point differences
    },
    {
      field: "dieselPrice",
      expected: scrapedData.log.dieselPrice,
      actual: insertedRow.dieselPrice,
      tolerance: 0.01,
    },
    {
      field: "source",
      expected: "scraped",
      actual: insertedRow.source,
    },
  ];

  let allValid = true;
  for (const validation of validations) {
    const { field, expected, actual, tolerance } = validation;

    let isValid: boolean;
    if (
      tolerance &&
      typeof expected === "number" &&
      typeof actual === "number"
    ) {
      isValid = Math.abs(expected - actual) < tolerance;
    } else {
      isValid = expected === actual;
    }

    if (isValid) {
      console.log(`   ✓ ${field}: ${actual}`);
    } else {
      console.error(`   ❌ ${field}: expected ${expected}, got ${actual}`);
      allValid = false;
    }
  }

  // Validate timestamps
  const now = new Date();
  const createdAt = new Date(insertedRow.createdAt);
  const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
  const withinOneMinute = timeDiff < 60000;

  if (withinOneMinute) {
    console.log(
      `   ✓ createdAt: ${createdAt.toISOString()} (within 1 minute of now)`,
    );
  } else {
    console.error(
      `   ❌ createdAt: ${createdAt.toISOString()} (more than 1 minute old)`,
    );
    allValid = false;
  }

  console.log();

  // Step 5: Final result
  if (allValid) {
    console.log("✅ ALL VALIDATIONS PASSED");
    console.log("\n=== End-to-End Test Complete ===");
    console.log("The scraping and database pipeline is working correctly!");

    // Cleanup: Remove the test entry
    console.log("\n5. Cleaning up test data...");
    await db
      .delete(priceHistory)
      .where(eq(priceHistory.date, scrapedData.log.date));
    console.log("✓ Test entry removed from database");
  } else {
    console.error("❌ SOME VALIDATIONS FAILED");
    console.error("\n=== Test Failed ===");
    process.exit(1);
  }
}

// Run the test
testScrapingEndToEnd().catch((error) => {
  console.error("\n❌ Unexpected error during test:", error);
  process.exit(1);
});
