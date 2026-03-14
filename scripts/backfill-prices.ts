import { db } from "../src/db/drizzle";
import { priceHistory, type NewPriceHistory } from "../src/db/schema";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";

const EXCEL_URL =
  "https://www.datocms-assets.com/142139/1773061172-prishistorik-listpriser-2008-2026.xls";

interface ParsedPriceRow {
  date: string; // YYYY-MM-DD
  hvo100Price: number | null;
  dieselPrice: number | null;
}

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
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON with raw values
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });

  const prices: ParsedPriceRow[] = [];

  // The Excel file structure from the webfetch suggests it has data organized by year
  // and fuel types. Looking at the binary data, I can see references to:
  // - HVO Diesel 100
  // - Diesel
  // - Different years from 2008 to 2026

  // Since we don't have exact column structure, let's try to identify it
  // The data likely has columns like: Date, Diesel Price, HVO 100 Price

  let currentYear = 2008;
  let headerRow = -1;

  // Find header row and identify columns
  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any[];
    const rowStr = row
      .map((cell) => String(cell))
      .join(" ")
      .toLowerCase();

    // Look for headers that indicate fuel types
    if (rowStr.includes("hvo") || rowStr.includes("diesel")) {
      headerRow = i;
      console.log(`Found header row at index ${i}:`, row);
      break;
    }
  }

  if (headerRow === -1) {
    console.log("Could not find header row. Trying alternative parsing...");
    // Try to parse without explicit headers
    return parseWithoutHeaders(data);
  }

  // Find column indices
  const headerRowData = data[headerRow] as any[];
  let dateCol = -1;
  let hvoCol = -1;
  let dieselCol = -1;

  headerRowData.forEach((cell, index) => {
    const cellStr = String(cell).toLowerCase();
    if (cellStr.includes("datum") || cellStr.includes("date")) {
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
    `Column mapping - Date: ${dateCol}, HVO: ${hvoCol}, Diesel: ${dieselCol}`,
  );

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
      } else if (typeof dateCell === "number") {
        // Excel date serial number
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(
          excelEpoch.getTime() + dateCell * 24 * 60 * 60 * 1000,
        );
        dateValue = date.toISOString().split("T")[0];
      } else {
        // Try to parse as string
        const dateStr = String(dateCell);
        // Handle various date formats
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          dateValue = parsed.toISOString().split("T")[0];
        }
      }
    }

    // Parse HVO price
    if (hvoCol >= 0 && row[hvoCol] !== undefined) {
      const val = parseFloat(String(row[hvoCol]).replace(",", "."));
      if (!isNaN(val)) hvoValue = val;
    }

    // Parse Diesel price
    if (dieselCol >= 0 && row[dieselCol] !== undefined) {
      const val = parseFloat(String(row[dieselCol]).replace(",", "."));
      if (!isNaN(val)) dieselValue = val;
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

function parseWithoutHeaders(data: any[][]): ParsedPriceRow[] {
  const prices: ParsedPriceRow[] = [];

  // Try to identify rows with date and price data
  for (const row of data) {
    if (row.length < 2) continue;

    // Look for a date in the first column
    const firstCell = row[0];
    let dateValue: string | null = null;

    if (firstCell instanceof Date) {
      dateValue = firstCell.toISOString().split("T")[0];
    } else if (typeof firstCell === "number" && firstCell > 40000) {
      // Likely an Excel date
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(
        excelEpoch.getTime() + firstCell * 24 * 60 * 60 * 1000,
      );
      dateValue = date.toISOString().split("T")[0];
    } else if (typeof firstCell === "string") {
      // Try parsing as date
      const parsed = new Date(firstCell);
      if (!isNaN(parsed.getTime())) {
        dateValue = parsed.toISOString().split("T")[0];
      }
    }

    if (dateValue) {
      // Try to find numeric values that could be prices
      const numericValues = row
        .slice(1)
        .map((cell) => parseFloat(String(cell).replace(",", ".")))
        .filter((val) => !isNaN(val) && val > 0 && val < 100); // Reasonable price range

      if (numericValues.length >= 2) {
        prices.push({
          date: dateValue,
          hvo100Price: numericValues[0] || null,
          dieselPrice: numericValues[1] || null,
        });
      }
    }
  }

  return prices;
}

async function insertPrices(prices: ParsedPriceRow[]) {
  console.log(`Inserting ${prices.length} price records...`);

  let inserted = 0;
  let skipped = 0;

  for (const price of prices) {
    // Skip if both prices are null
    if (price.hvo100Price === null && price.dieselPrice === null) {
      skipped++;
      continue;
    }

    // Check if record already exists for this date
    const existing = await db
      .select()
      .from(priceHistory)
      .where((table) => table.date === price.date);

    if (existing.length > 0) {
      console.log(`Skipping duplicate date: ${price.date}`);
      skipped++;
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

    await db.insert(priceHistory).values(record);
    inserted++;
  }

  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);
}

async function cleanup(tempFile: string) {
  try {
    fs.unlinkSync(tempFile);
    console.log("Cleaned up temporary file");
  } catch (err) {
    console.error("Error cleaning up:", err);
  }
}

async function main() {
  let tempFile: string | null = null;

  try {
    tempFile = await downloadExcelFile();
    const prices = parseExcelFile(tempFile);

    if (prices.length === 0) {
      console.log("No prices found in the Excel file");
      return;
    }

    console.log(`Found ${prices.length} price entries`);
    console.log("First few entries:", prices.slice(0, 5));

    await insertPrices(prices);
    console.log("Backfill complete!");
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  } finally {
    if (tempFile) {
      await cleanup(tempFile);
    }
  }
}

// Run the script
main();
