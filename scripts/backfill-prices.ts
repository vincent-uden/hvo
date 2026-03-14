import { db } from "../src/db/drizzle";
import { priceHistory, type NewPriceHistory } from "../src/db/schema";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";

const EXCEL_URL =
  "https://www.datocms-assets.com/142139/1773061172-prishistorik-listpriser-2008-2026.xls";

interface ParsedPriceRow {
  date: string; // YYYY-MM-DD
  hvo100Price: number | null;
  dieselPrice: number | null;
}

interface InsertResult {
  wouldInsert: number;
  wouldSkip: number;
  invalid: number;
  preview: Array<{
    date: string;
    hvo100Price: number;
    dieselPrice: number;
    reason?: string;
  }>;
}

const DRY_RUN =
  process.argv.includes("--dry-run") || process.argv.includes("-d");

async function downloadExcelFile(): Promise<string> {
  console.log("Downloading Excel file...");
  const response = await fetch(EXCEL_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to download: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = await response.arrayBuffer();
  const tempFile = path.join(process.cwd(), "temp_prices.xls");
  fs.writeFileSync(tempFile, Buffer.from(buffer));

  console.log("Downloaded to:", tempFile);
  return tempFile;
}

function parseExcelFile(filePath: string): ParsedPriceRow[] {
  console.log("Parsing Excel file...");

  const workbook = xlsx.readFile(filePath, { type: "file" });
  const prices: ParsedPriceRow[] = [];

  // Process all sheets - the Excel has one sheet per year
  for (const sheetName of workbook.SheetNames) {
    console.log(`\nProcessing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with raw values
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });

    if (data.length === 0) {
      console.log(`  Skipping empty sheet: ${sheetName}`);
      continue;
    }

    // Extract year from sheet name or data
    let year: number;
    const yearMatch = sheetName.match(/\d{4}/);
    if (yearMatch) {
      year = parseInt(yearMatch[0]);
    } else {
      // Try to find year in first few rows
      const firstRowStr = String(data[0]).toLowerCase();
      const yearInData = firstRowStr.match(/\b(20\d{2})\b/);
      year = yearInData ? parseInt(yearInData[1]) : new Date().getFullYear();
    }

    console.log(`  Year: ${year}`);

    // Find header row and identify columns
    let headerRow = -1;
    let dateCol = -1;
    let hvoCol = -1;
    let dieselCol = -1;

    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i] as any[];
      const rowStr = row
        .map((cell) => String(cell))
        .join(" ")
        .toLowerCase();

      // Look for headers that indicate fuel types
      if (rowStr.includes("hvo") || rowStr.includes("diesel")) {
        headerRow = i;
        console.log(`  Found header row at index ${i}:`, row.slice(0, 6));

        // Find column indices
        row.forEach((cell, index) => {
          const cellStr = String(cell).toLowerCase();
          if (
            cellStr.includes("datum") ||
            cellStr.includes("date") ||
            cellStr.match(/^\d{4}-\d{2}-\d{2}$/)
          ) {
            dateCol = index;
          } else if (
            cellStr.includes("hvo") ||
            cellStr.includes("hvo100") ||
            cellStr.includes("hvo 100")
          ) {
            hvoCol = index;
          } else if (cellStr.includes("diesel") && !cellStr.includes("hvo")) {
            dieselCol = index;
          }
        });

        console.log(
          `  Column mapping - Date: ${dateCol}, HVO: ${hvoCol}, Diesel: ${dieselCol}`,
        );
        break;
      }
    }

    if (headerRow === -1) {
      console.log(
        `  Could not find header row in sheet ${sheetName}, skipping`,
      );
      continue;
    }

    if (dateCol === -1 && hvoCol === -1 && dieselCol === -1) {
      console.log(
        `  Could not identify columns in sheet ${sheetName}, trying flexible parsing`,
      );
      // Try flexible parsing for this sheet
      const flexibleResults = parseSheetFlexibly(data, year, headerRow);
      prices.push(...flexibleResults);
      continue;
    }

    // Parse data rows
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (row.length === 0) continue;

      let dateValue: string | null = null;
      let hvoValue: number | null = null;
      let dieselValue: number | null = null;

      // Parse date
      if (dateCol >= 0 && row[dateCol]) {
        const dateCell = row[dateCol];
        if (dateCell instanceof Date) {
          dateValue = dateCell.toISOString().split("T")[0];
        } else if (typeof dateCell === "number" && dateCell > 30000) {
          // Excel date serial number
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(
            excelEpoch.getTime() + dateCell * 24 * 60 * 60 * 1000,
          );
          dateValue = date.toISOString().split("T")[0];
        } else {
          // Try to parse as string - might already be in YYYY-MM-DD format
          const dateStr = String(dateCell).trim();
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateValue = dateStr;
          } else {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              dateValue = parsed.toISOString().split("T")[0];
            }
          }
        }
      }

      // Parse HVO price
      if (hvoCol >= 0 && row[hvoCol] !== undefined && row[hvoCol] !== null) {
        const val = parseFloat(String(row[hvoCol]).replace(",", "."));
        if (!isNaN(val) && val > 0) hvoValue = val;
      }

      // Parse Diesel price
      if (
        dieselCol >= 0 &&
        row[dieselCol] !== undefined &&
        row[dieselCol] !== null
      ) {
        const val = parseFloat(String(row[dieselCol]).replace(",", "."));
        if (!isNaN(val) && val > 0) dieselValue = val;
      }

      if (dateValue && (hvoValue !== null || dieselValue !== null)) {
        prices.push({
          date: dateValue,
          hvo100Price: hvoValue,
          dieselPrice: dieselValue,
        });
      }
    }
  }

  return prices;
}

function parseSheetFlexibly(
  data: any[][],
  year: number,
  headerRow: number,
): ParsedPriceRow[] {
  const prices: ParsedPriceRow[] = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i] as any[];
    if (row.length < 2) continue;

    let dateValue: string | null = null;
    let hvoValue: number | null = null;
    let dieselValue: number | null = null;

    // Try to find date in the first few columns
    for (let j = 0; j < Math.min(row.length, 3); j++) {
      const cell = row[j];
      if (cell instanceof Date) {
        dateValue = cell.toISOString().split("T")[0];
        break;
      } else if (typeof cell === "number" && cell > 30000) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(
          excelEpoch.getTime() + cell * 24 * 60 * 60 * 1000,
        );
        dateValue = date.toISOString().split("T")[0];
        break;
      } else if (typeof cell === "string") {
        const str = cell.trim();
        if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateValue = str;
          break;
        }
      }
    }

    // If no date found but row has valid data, construct date from row index
    if (!dateValue) {
      // Skip rows without clear dates in flexible mode
      continue;
    }

    // Find numeric values that could be prices (reasonable range 5-50 kr)
    const numericValues: number[] = [];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell === null || cell === undefined) continue;

      const val = parseFloat(String(cell).replace(",", "."));
      if (!isNaN(val) && val >= 5 && val <= 100) {
        numericValues.push(val);
      }
    }

    // Assume first reasonable value is Diesel, second is HVO (if present)
    if (numericValues.length >= 1) {
      dieselValue = numericValues[0];
      if (numericValues.length >= 2) {
        hvoValue = numericValues[1];
      }
    }

    if (dateValue && (hvoValue !== null || dieselValue !== null)) {
      prices.push({
        date: dateValue,
        hvo100Price: hvoValue,
        dieselPrice: dieselValue,
      });
    }
  }

  return prices;
}

async function insertPrices(prices: ParsedPriceRow[]): Promise<InsertResult> {
  const result: InsertResult = {
    wouldInsert: 0,
    wouldSkip: 0,
    invalid: 0,
    preview: [],
  };

  if (DRY_RUN) {
    console.log(`\n📋 DRY RUN MODE - Previewing ${prices.length} records\n`);
  } else {
    console.log(`\n💾 Inserting ${prices.length} price records...\n`);
  }

  for (const price of prices) {
    // Skip if both prices are null
    if (price.hvo100Price === null && price.dieselPrice === null) {
      result.invalid++;
      if (result.preview.length < 10) {
        result.preview.push({
          date: price.date,
          hvo100Price: 0,
          dieselPrice: 0,
          reason: "Both prices null",
        });
      }
      continue;
    }

    // Validate prices are reasonable
    const hvoValid =
      price.hvo100Price === null ||
      (price.hvo100Price >= 5 && price.hvo100Price <= 100);
    const dieselValid =
      price.dieselPrice === null ||
      (price.dieselPrice >= 5 && price.dieselPrice <= 100);

    if (!hvoValid || !dieselValid) {
      result.invalid++;
      if (result.preview.length < 10) {
        result.preview.push({
          date: price.date,
          hvo100Price: price.hvo100Price || 0,
          dieselPrice: price.dieselPrice || 0,
          reason: `Invalid price range (HVO: ${price.hvo100Price}, Diesel: ${price.dieselPrice})`,
        });
      }
      continue;
    }

    // Check if record already exists for this date
    const existing = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.date, price.date));

    if (existing.length > 0) {
      result.wouldSkip++;
      if (result.preview.length < 10) {
        result.preview.push({
          date: price.date,
          hvo100Price: price.hvo100Price || 0,
          dieselPrice: price.dieselPrice || 0,
          reason: "Already exists in database",
        });
      }
      continue;
    }

    const now = new Date();
    const record: NewPriceHistory = {
      date: price.date,
      hvo100Price: price.hvo100Price || 0,
      dieselPrice: price.dieselPrice || 0,
      createdAt: now,
      updatedAt: now,
      source: "backfill",
    };

    if (!DRY_RUN) {
      await db.insert(priceHistory).values(record);
    }

    result.wouldInsert++;
    if (result.preview.length < 10) {
      result.preview.push({
        date: price.date,
        hvo100Price: price.hvo100Price || 0,
        dieselPrice: price.dieselPrice || 0,
      });
    }
  }

  return result;
}

function printSummary(result: InsertResult, totalPrices: number) {
  console.log("\n" + "=".repeat(50));

  if (DRY_RUN) {
    console.log("📋 DRY RUN SUMMARY (No data was written)");
  } else {
    console.log("💾 BACKFILL COMPLETE");
  }

  console.log("=".repeat(50));
  console.log(`Total records processed: ${totalPrices}`);
  console.log(`✅ Would insert: ${result.wouldInsert}`);
  console.log(`⏭️  Would skip (duplicates): ${result.wouldSkip}`);
  console.log(`❌ Invalid entries: ${result.invalid}`);
  console.log("=".repeat(50));

  if (result.preview.length > 0) {
    console.log("\n📊 Sample of records that would be inserted:");
    console.log("-".repeat(50));
    console.log("Date          | HVO100    | Diesel    | Status");
    console.log("-".repeat(50));

    result.preview.slice(0, 10).forEach((item) => {
      const hvoStr =
        item.hvo100Price > 0
          ? item.hvo100Price.toFixed(2).padEnd(9)
          : "N/A       ";
      const dieselStr =
        item.dieselPrice > 0
          ? item.dieselPrice.toFixed(2).padEnd(9)
          : "N/A       ";
      const status = item.reason || (DRY_RUN ? "Would insert" : "Inserted");
      console.log(`${item.date} | ${hvoStr} | ${dieselStr} | ${status}`);
    });

    if (result.wouldInsert > 10) {
      console.log(`... and ${result.wouldInsert - 10} more`);
    }
  }

  if (DRY_RUN) {
    console.log("\n⚠️  This was a DRY RUN. To actually insert data, run:");
    console.log("   bun run backfill");
    console.log("   (without --dry-run flag)");
  }
}

async function cleanup(tempFile: string) {
  try {
    fs.unlinkSync(tempFile);
    console.log("\n🧹 Cleaned up temporary file");
  } catch (err) {
    console.error("\n⚠️  Error cleaning up:", err);
  }
}

async function main() {
  let tempFile: string | null = null;

  try {
    if (DRY_RUN) {
      console.log("\n🔍 DRY RUN MODE ENABLED");
      console.log(
        "   Previewing what would be inserted without writing to database\n",
      );
    }

    tempFile = await downloadExcelFile();
    const prices = parseExcelFile(tempFile);

    if (prices.length === 0) {
      console.log("\n❌ No prices found in the Excel file");
      return;
    }

    console.log(`\n📈 Found ${prices.length} price entries total`);
    console.log("\nFirst 5 entries from Excel:");
    prices.slice(0, 5).forEach((p) => {
      console.log(
        `  ${p.date}: HVO=${p.hvo100Price || "N/A"}, Diesel=${p.dieselPrice || "N/A"}`,
      );
    });

    const result = await insertPrices(prices);
    printSummary(result, prices.length);

    if (!DRY_RUN) {
      console.log("\n✅ Backfill complete!");
    }
  } catch (error) {
    console.error("\n❌ Error during backfill:", error);
    process.exit(1);
  } finally {
    if (tempFile) {
      await cleanup(tempFile);
    }
  }
}

// Run the script
main();
