/**
 * Inventory Compliance Test: No Movement Items
 *
 * Purpose:
 * This test identifies inventory items that show no movement between opening and closing
 * balances. Stagnant inventory might indicate:
 * - Obsolete or dead stock
 * - Poor inventory management
 * - Potential write-off requirements
 * - Inefficient working capital allocation
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each inventory item:
 *    - Identifies opening and closing balances
 *    - Compares quantities to detect lack of movement
 *    - Groups by item code for complete picture
 * 3. Returns:
 *    - Full list of stagnant items
 *    - Summary with opening/closing quantities
 *    - Any validation errors encountered
 *
 * Required Fields (based on Inventory Register Template):
 * - Material Code: Inventory item identifier
 * - Material Description: Description of the item
 * - Closing Units: Item closing quantity
 * - Opening Units: Item opening quantity (Optional)
 * - Date Of Receipt: Transaction date (Optional)
 */

import { log } from "../../lib/utils/log";
import { toDate, isValidDate } from "../../lib/utils/date-utils";

interface Entry {
  "Material Code": string;
  "Material Description": string;
  "Inventory Type": string;
  "Closing Units": number;
  "Opening Units"?: number;
  "Date Of Receipt"?: Date;
}

export interface NoMovementItemsResult {
  results: Entry[];
  summary: {
    itemCode: string;
    itemName: string;
    openingQuantity: number;
    closingQuantity: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface NoMovementItemsConfig {
  // No specific config needed for this test
}

export default function noMovementItems(
  data: Entry[],
  config: NoMovementItemsConfig = {}
): NoMovementItemsResult {
  const errors: ErrorType[] = [];
  const results: Entry[] = [];

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Normalize data - ensure dates are properly converted
  const normalizedData = data
    .map((entry) => ({
      ...entry,
      "Date Of Receipt": entry["Date Of Receipt"]
        ? toDate(entry["Date Of Receipt"])
        : entry["Date Of Receipt"],
    }))
    .filter((entry) =>
      /^(finished\s*goods?|fg|raw\s*materials?|rm|traded\s*goods)$/i.test(
        entry["Inventory Type"]
      )
    );

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
        message:
          "Invalid entry format: Entry must contain Material Description",
        row: entry,
      });
    }
    if (entry["Date Of Receipt"] && !isValidDate(entry["Date Of Receipt"])) {
      errors.push({
        message: "Date Of Receipt is invalid",
        row: entry,
      });
    }
    if (entry["Closing Units"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Closing Units",
        row: entry,
      });
    }
    if (entry["Inventory Type"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Inventory Type",
        row: entry,
      });
    }
  }

  if (errors.length > 0) {
    return { results, summary: [], errors };
  }

  try {
    // Group entries by item
    const itemMap = new Map<
      string,
      {
        entries: Entry[];
        itemName: string;
        openingQuantity?: number;
        closingQuantity?: number;
      }
    >();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Material Code"];
      const closingQuantity = entry["Closing Units"];
      const openingQuantity = entry["Opening Units"];
      const itemName = entry["Material Description"];

      if (!itemCode || closingQuantity === undefined) return;

      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          entries: [],
          itemName: itemName,
        });
      }

      const itemData = itemMap.get(itemCode)!;
      itemData.entries.push(entry);
      itemData.closingQuantity = closingQuantity;
      if (openingQuantity !== undefined) {
        itemData.openingQuantity = openingQuantity;
      }
    });

    // Find items with no movement (opening = closing)
    const noMovementItems: NoMovementItemsResult["summary"] = [];

    itemMap.forEach((data, itemCode) => {
      if (
        data.openingQuantity !== undefined &&
        data.closingQuantity !== undefined &&
        data.openingQuantity === data.closingQuantity
      ) {
        results.push(...data.entries);
        noMovementItems.push({
          itemCode,
          itemName: data.itemName,
          openingQuantity: data.openingQuantity,
          closingQuantity: data.closingQuantity,
          entries: data.entries,
        });
      } else if (
        data.openingQuantity === undefined &&
        data.closingQuantity === 0
      ) {
        results.push(...data.entries);
        noMovementItems.push({
          itemCode,
          itemName: data.itemName,
          openingQuantity: 0,
          closingQuantity: data.closingQuantity,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: noMovementItems,
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
