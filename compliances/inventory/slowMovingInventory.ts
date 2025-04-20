/**
 * Inventory Compliance Test: Slow Moving Inventory
 *
 * Purpose:
 * This test identifies inventory items with low turnover rates based on purchase
 * and issue transactions. Slow-moving inventory might indicate:
 * - Excess stock levels
 * - Changes in demand patterns
 * - Purchasing inefficiencies
 * - Need for inventory optimization
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each inventory item:
 *    - Tracks opening balance
 *    - Monitors purchase transactions
 *    - Analyzes issue/consumption patterns
 *    - Calculates turnover ratios
 * 3. Returns:
 *    - Full list of slow-moving items
 *    - Summary with movement statistics
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Material Code: Inventory item identifier
 * - Material Description: Description of the item
 * - Opening Units: Opening quantity of the item
 * - Receipt Units: Receipt quantity of the item
 * - Issued Units: Issued quantity of the item
 */

import { log } from "../../lib/utils/log";
import { toDate, isValidDate } from "../../lib/utils/date-utils";

interface InventoryEntry {
  "Material Code": string;
  "Material Description": string;
  "Opening Units"?: number;
  "Receipt Units"?: number;
  "Issued Units"?: number;
  "Closing Units": number;
  "Value Rate"?: number;
  "Value": number;
  "Physical Count Quantity"?: number;
  "Date Of Receipt"?: Date;
  "Age Of Inventory"?: number;
  "Inventory Type": string;
}

interface PurchaseEntry {
  "Purchase Reference Number": string;
  "Purchase Reference Date": Date;
  "Item Code": string;
  "Item Name": string;
  "Units": number;
  "Rate": number;
  "Value": number;
}

export interface SlowMovingInventoryResult {
  results: InventoryEntry[];
  summary: {
    itemCode: string;
    itemName: string;
    openingQuantity: number;
    issueQuantity: number;
    purchaseQuantity: number;
    entries: InventoryEntry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: InventoryEntry | PurchaseEntry;
};

export interface SlowMovingInventoryConfig {
  // Configuration options if needed
}

export default function slowMovingInventory(
  data: {
    "Inventory Register": InventoryEntry[];
    "Purchase Register": PurchaseEntry[];
  },
  config: SlowMovingInventoryConfig = {}
): SlowMovingInventoryResult {
  const errors: ErrorType[] = [];
  const results: InventoryEntry[] = [];

  const {
    "Inventory Register": inventoryRegister,
    "Purchase Register": purchaseRegister,
  } = data;

  // Input validation
  if (!Array.isArray(inventoryRegister) || !Array.isArray(purchaseRegister)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Normalize data - ensure dates are properly converted
  const normalizedInventoryData = inventoryRegister.map((entry) => {
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
    if (entry["Value"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Value",
        row: entry,
      });
    }

    return {
      ...entry,
      "Date Of Receipt": entry["Date Of Receipt"] ? toDate(entry["Date Of Receipt"]) : undefined
    };
  }).filter((entry) =>
    /^(raw\s*material(|s)?|rm|traded\s*goods)$/i.test(entry["Inventory Type"])
  );

  const normalizedPurchaseData = purchaseRegister.map((entry) => {
    if (!entry["Purchase Reference Number"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Purchase Reference Number",
        row: entry,
      });
    }
    if (!entry["Item Code"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Item Code",
        row: entry,
      });
    }
    if (!entry["Item Name"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Item Name",
        row: entry,
      });
    }
    if (entry["Units"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Units",
        row: entry,
      });
    }
    if (entry["Value"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Value",
        row: entry,
      });
    }

    return {
      ...entry,
      "Purchase Reference Date": toDate(entry["Purchase Reference Date"])
    };
  });

  if (errors.length > 0) {
    log({
      message: "Validation errors in slow moving inventory data",
      type: "error",
      data: errors,
    });
    return { results, summary: [], errors };
  }

  try {
    // Group entries by item
    const itemMap = new Map<
      string,
      {
        entries: InventoryEntry[];
        itemName: string;
        openingQuantity: number;
        issueQuantity: number;
        purchaseQuantity: number;
        lastPurchaseDate?: Date;
      }
    >();

    // Process inventory data
    normalizedInventoryData.forEach((entry) => {
      const itemCode = entry["Material Code"];
      
      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          entries: [],
          itemName: entry["Material Description"],
          openingQuantity: entry["Opening Units"] || 0,
          issueQuantity: entry["Issued Units"] || 0,
          purchaseQuantity: 0,
        });
      }

      const itemData = itemMap.get(itemCode)!;
      itemData.entries.push(entry);
    });

    // Process purchase data
    normalizedPurchaseData.forEach((purchase) => {
      const itemCode = purchase["Item Code"];
      
      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          entries: [],
          itemName: purchase["Item Name"],
          openingQuantity: 0,
          issueQuantity: 0,
          purchaseQuantity: 0,
        });
      }

      const itemData = itemMap.get(itemCode)!;
      itemData.purchaseQuantity += purchase["Units"];
      
      const purchaseDate = purchase["Purchase Reference Date"];
      if (!itemData.lastPurchaseDate || purchaseDate > itemData.lastPurchaseDate) {
        itemData.lastPurchaseDate = purchaseDate;
      }
    });

    // Find slow-moving items considering both inventory and purchase data
    const slowMovingItems: SlowMovingInventoryResult["summary"] = [];

    itemMap.forEach((data, itemCode) => {
      
      // Check for exceptions based on the examples:
      // 1. Opening: 100, Issue: 4, Purchase: 300 → Balance: 396 → Exception
      // 2. Opening: 0, Issue: 1, Purchase: 400 → Balance: -1 → Not an Exception
      // 3. Opening: 0, Issue: 0, Purchase: 0 → Balance: 0 → Not an exception

      const totalAvailable = data.openingQuantity + data.purchaseQuantity;
      const closingBalance = totalAvailable - data.issueQuantity;
      
      const isException = totalAvailable > 0 && (
        (closingBalance > 0) && // Positive balance
        (data.issueQuantity < totalAvailable * 0.5) // Low turnover (using less than 50% of available)
      );
      
      // Only include items that have entries in inventory register and are exceptions
      if (isException && data.entries.length > 0) {
        results.push(...data.entries);
        slowMovingItems.push({
          itemCode,
          itemName: data.itemName,
          openingQuantity: data.openingQuantity,
          issueQuantity: data.issueQuantity,
          purchaseQuantity: data.purchaseQuantity,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: slowMovingItems,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in slow moving inventory",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
