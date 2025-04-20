/**
 * Invoice Compliance Test: Sudden Price Changes
 *
 * Purpose:
 * This test identifies sudden increases or decreases in product selling prices
 * compared to previous transactions. Sudden price changes might indicate:
 * - Pricing errors
 * - Unauthorized adjustments
 * - Market volatility
 * - System issues
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable threshold for acceptable price changes
 * 3. For each product:
 *    - Tracks price history
 *    - Calculates percentage changes
 *    - Identifies spikes above threshold
 * 4. Returns:
 *    - Full list of price spike transactions
 *    - Summary with change percentages
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Date: Transaction date
 * - Item Code: Product identifier
 * - Selling Price: Unit selling price
 *
 * Configuration:
 * - threshold: Maximum acceptable price change percentage
 */

import { log } from "../../lib/utils/log";
import { toDate, isValidDate, isDateAfter } from "../../lib/utils/date-utils";

interface Entry {
  "Invoice Date": Date;
  "Item Code": string;
  "Selling Price": number;
}

export interface SuddenPriceSpikeResult {
  results: Entry[];
  summary: {
    itemCode: string;
    previousPrice: number;
    currentPrice: number;
    percentageChange: number;
    currentDate: Date;
    previousDate: Date;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface SuddenPriceSpikeConfig {
  threshold?: number;
}

export default function suddenPriceSpike(
  data: Entry[],
  config: SuddenPriceSpikeConfig = { threshold: 5 }
): SuddenPriceSpikeResult {
  const threshold = config.threshold || 5;
  const errors: ErrorType[] = [];
  let results: Entry[] = [];

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Normalize data - ensure dates are properly converted
  let normalizedData = data.map((entry) => ({
    ...entry,
    "Invoice Date": entry["Invoice Date"]
      ? toDate(entry["Invoice Date"])
      : entry["Invoice Date"],
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Invoice Date"]) {
      errors.push({
        message: "Invoice Date is missing",
        row: entry,
      });
    } else if (!isValidDate(entry["Invoice Date"])) {
      errors.push({
        message: "Invoice Date is invalid",
        row: entry,
      });
    }
    if (!entry["Item Code"]) {
      errors.push({
        message: "Item Code is missing",
        row: entry,
      });
    }
    if (typeof entry["Selling Price"] !== "number") {
      errors.push({
        message: "Selling Price must be a number",
        row: entry,
      });
    }
  }

  if (errors.length > 0) {
    return { results, summary: [], errors };
  }

  try {
    // Group entries by item code
    const itemPrices = new Map<string, Entry[]>();
    normalizedData = normalizedData.reverse();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Item Code"];
      if (!itemCode) return;

      if (!itemPrices.has(itemCode)) {
        itemPrices.set(itemCode, []);
      }

      itemPrices.get(itemCode)!.push(entry);
    });

    // Find price spikes
    const summary: SuddenPriceSpikeResult["summary"] = [];

    itemPrices.forEach((entries, itemCode) => {
      // No need to sort again as entries are already in reverse chronological order
      // Compare prices for consecutive entries (newer to older)
      for (let i = 0; i < entries.length - 1; i++) {
        const currentEntry = entries[i];
        const previousEntry = entries[i + 1];

        const currentPrice = currentEntry["Selling Price"];
        const previousPrice = previousEntry["Selling Price"];

        // Calculate percentage change
        const percentageChange =
          ((currentPrice - previousPrice) / previousPrice) * 100;

        // Check if the change exceeds the threshold (positive or negative)
        if (
          Math.abs(percentageChange) > threshold ||
          Math.abs(percentageChange) <= -threshold
        ) {
          results.push(currentEntry);

          summary.push({
            itemCode,
            previousPrice,
            currentPrice,
            percentageChange,
            currentDate: currentEntry["Invoice Date"],
            previousDate: previousEntry["Invoice Date"],
          });
        }
      }
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in suddenPriceSpike",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
