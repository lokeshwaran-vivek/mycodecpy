/**
 * Inventory Compliance Test: Negative Quantities
 *
 * Purpose:
 * This test identifies inventory items with negative closing quantities, which should not
 * normally occur in a well-managed system. Negative quantities might indicate:
 * - Timing issues in transaction recording
 * - System configuration problems
 * - Incorrect stock adjustments
 * - Poor inventory control
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each inventory item:
 *    - Checks for negative closing quantities
 *    - Groups by item code for complete picture
 * 3. Returns:
 *    - Full list of items with negative closing quantities
 *    - Summary with quantity details
 *    - Any validation errors encountered
 *
 * Required Fields (based on Inventory Register Template):
 * - Material Code: Inventory item identifier
 * - Material Description: Description of the item
 * - Closing Units: Item closing quantity
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Material Code": string;
  "Material Description": string;
  "Closing Units": number;
}

export interface NegativeQuantityResult {
  results: Entry[];
  summary: {
    itemCode: string;
    itemName: string;
    quantity: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface NegativeQuantityConfig {
  // No specific config needed for this test
}

export default function negativeQuantity(
  data: Entry[],
  config: NegativeQuantityConfig = {},
): NegativeQuantityResult {
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
    if (entry["Closing Units"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Closing Units",
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
        quantity: number;
      }
    >();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Material Code"];
      const quantity = entry["Closing Units"];
      const itemName = entry["Material Description"];

      if (!itemCode || quantity === undefined) return;

      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          entries: [],
          itemName: itemName,
          quantity: 0,
        });
      }

      const itemData = itemMap.get(itemCode)!;
      itemData.entries.push(entry);
      itemData.quantity = quantity; // Use Closing Units as quantity
    });

    // Find items with negative quantities
    const negativeItems: NegativeQuantityResult["summary"] = [];

    itemMap.forEach((data, itemCode) => {
      if (data.quantity < 0) {
        results.push(...data.entries);
        negativeItems.push({
          itemCode,
          itemName: data.itemName,
          quantity: data.quantity, //report Closing Units as quantity
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
