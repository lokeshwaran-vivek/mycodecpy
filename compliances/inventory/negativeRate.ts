/**
 * Inventory Compliance Test: Negative Rates
 *
 * Purpose:
 * This test identifies inventory items with negative rates or unit prices, which
 * should not occur in normal circumstances. Negative rates might indicate:
 * - Data entry errors
 * - System calculation issues
 * - Incorrect price adjustments
 * - Configuration problems
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each inventory item:
 *    - Checks for negative rates
 *    - Groups by item code for complete picture
 *    - Tracks rate history
 * 3. Returns:
 *    - Full list of items with negative rates
 *    - Summary with rate details
 *    - Any validation errors encountered
 *
 * Required Fields (based on Inventory Register Template):
 * - Material Code: Inventory item identifier
 * - Material Description: Description of the item
 * - Value Rate: Unit price or rate
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Material Code": string;
  "Material Description": string;
  "Value Rate": number;
}

export interface NegativeRateResult {
  results: Entry[];
  summary: {
    itemCode: string;
    itemName: string;
    rate: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface NegativeRateConfig {
  // No specific config needed for this test
}

export default function negativeRate(
  data: Entry[],
  config: NegativeRateConfig = {},
): NegativeRateResult {
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

  // Normalize data
  const normalizedData = [...data];

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Material Code"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Material Code",
        row: entry,
      });
    }
    if (!entry["Material Description"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Material Description",
        row: entry,
      });
    }
    if (entry["Value Rate"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Value Rate",
        row: entry,
      });
    }
  }

  try {
    // Group entries by item
    const itemMap = new Map<
      string,
      {
        entries: Entry[];
        itemName: string;
        rate: number;
      }
    >();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Material Code"];
      const rate = entry["Value Rate"];

      if (!itemCode || rate === undefined) return;

      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          entries: [],
          itemName: entry["Material Description"],
          rate: 0,
        });
      }

      const itemData = itemMap.get(itemCode)!;
      itemData.entries.push(entry);
      itemData.rate = rate; // Use the latest rate
    });

    // Find items with negative rates
    const negativeItems: NegativeRateResult["summary"] = [];

    itemMap.forEach((data, itemCode) => {
      if (data.rate < 0) {
        results.push(...data.entries);
        negativeItems.push({
          itemCode,
          itemName: data.itemName,
          rate: data.rate,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: negativeItems,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
