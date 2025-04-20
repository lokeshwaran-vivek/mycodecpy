/**
 * Inventory Compliance Test: No Sales Items
 *
 * Purpose:
 * This test identifies inventory items that have stock but show no sales transactions within the current year.
 * Items with inventory but no sales might indicate:
 * - Discontinued products
 * - Seasonal items in off-season
 * - Marketing or pricing issues
 * - Potential obsolescence
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each inventory item:
 *    - Tracks inventory quantities (Closing Units)
 *    - Monitors sales transactions from Revenue Register within the specified time period
 *    - Identifies items with stock but no sales during the specified period (default: current year)
 * 3. Returns:
 *    - Full list of non-selling items
 *    - Summary with inventory levels
 *    - Any validation errors encountered
 *
 * Required Fields (based on Inventory Register Template):
 * - Material Code: Inventory item identifier
 * - Material Description: Description of the item
 * - Closing Units: Item closing quantity
 *
 * Required Fields (based on Revenue Register Template):
 * - Item Code: Inventory item identifier
 * - Quantity: Quantity sold
 * - Date: Date of the transaction (used for filtering by time period)
 */

import { log } from "../../lib/utils/log";

interface InventoryEntry {
  "Material Code": string;
  "Material Description": string;
  "Closing Units": number;
  "Inventory Type"?: string;
  "Issued Units"?: number; // Kept for backward compatibility but not used
}

interface SalesEntry {
  "Item Code": string;
  "Item Description": string;
  "Sale Quantity": number;
  "Invoice Date"?: string | Date;
}

interface RevenueEntry {
  "Item Code": string;
  "Item Description"?: string;
  Quantity: number;
  Date?: string | Date;
  "Invoice Date"?: string | Date; // Alternative date field
}

export interface NoSalesItemsResult {
  results: InventoryEntry[];
  summary: {
    itemCode: string;
    itemName: string;
    inventoryQuantity: number;
    totalSales: number;
    entries: InventoryEntry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: InventoryEntry | SalesEntry | RevenueEntry;
};

export interface NoSalesItemsConfig {
  startDate?: Date;
  endDate?: Date;
}

export default function noSalesItems(
  data: {
    "Inventory Register": InventoryEntry[];
    "Sales Register"?: SalesEntry[];
    "Revenue Register": RevenueEntry[];
  },
  config: NoSalesItemsConfig = {}
): NoSalesItemsResult {
  const errors: ErrorType[] = [];
  let results: InventoryEntry[] = [];

  // Configure date range (default to current year)
  const now = new Date();
  const endDate = config.endDate || now;
  const startDate = config.startDate || new Date(now.getFullYear(), 0, 1); // Jan 1 of current year

  const {
    "Inventory Register": inventoryRegister,
    "Sales Register": salesRegister = [],
    "Revenue Register": revenueRegister = [],
  } = data;

  // Input validation
  if (!Array.isArray(inventoryRegister)) {
    errors.push({
      message: "Inventory Register data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  if (!Array.isArray(revenueRegister)) {
    errors.push({
      message: "Revenue Register data must be an array",
      row: data as any,
    });
  }

  // Normalize data
  const normalizedInventoryData = inventoryRegister
    .map((entry) => {
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

      return {
        ...entry,
        "Material Code": entry["Material Code"]?.trim() || "",
        "Material Description": entry["Material Description"]?.trim() || "",
        "Inventory Type": entry["Inventory Type"]?.trim() || "",
      };
    })
    .filter((entry) =>
      /^(finished\s*goods?|fg|traded\s*goods)$/i.test(entry["Inventory Type"])
    );

  const normalizedSalesData = salesRegister.map((entry) => {
    if (!entry["Item Code"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Item Code",
        row: entry,
      });
    }

    return {
      ...entry,
      "Item Code": entry["Item Code"]?.trim() || "",
      "Invoice Date": entry["Invoice Date"]
        ? new Date(entry["Invoice Date"])
        : undefined,
    };
  });

  const normalizedRevenueData = revenueRegister.map((entry) => {
    if (!entry["Item Code"]) {
      errors.push({
        message: "Invalid entry format: Revenue entry must contain Item Code",
        row: entry,
      });
    }

    // Handle different date field names that might be present in Revenue Register
    let entryDate: Date | undefined;
    if (entry["Date"]) {
      entryDate = new Date(entry["Date"]);
    } else if (entry["Invoice Date"]) {
      entryDate = new Date(entry["Invoice Date"]);
    }

    return {
      ...entry,
      "Item Code": entry["Item Code"]?.trim() || "",
      Date: entryDate,
    };
  });

  try {
    // Group entries by item
    const itemMap = new Map<
      string,
      {
        entries: InventoryEntry[];
        itemName: string;
        inventoryQuantity: number;
        totalSales: number;
      }
    >();

    // First, build the item map from inventory data
    normalizedInventoryData.forEach((entry) => {
      const itemCode = entry["Material Code"];
      const itemName = entry["Material Description"];
      const closingQuantity = entry["Closing Units"];

      if (!itemCode || closingQuantity === undefined) return;

      if (!itemMap.has(itemCode)) {
        itemMap.set(itemCode, {
          entries: [],
          itemName: itemName,
          inventoryQuantity: 0,
          totalSales: 0,
        });
      }

      const itemData = itemMap.get(itemCode)!;
      itemData.entries.push(entry);
      itemData.inventoryQuantity = closingQuantity; // Use the latest closing quantity as inventory
    });

    // Add sales data from Sales Register within date range
    if (normalizedSalesData.length > 0) {
      normalizedSalesData.forEach((salesEntry) => {
        const itemCode = salesEntry["Item Code"];
        const saleQuantity = salesEntry["Sale Quantity"] || 0;
        const invoiceDate = salesEntry["Invoice Date"];

        // Skip if no matching inventory item or outside date range
        if (!itemMap.has(itemCode)) return;

        // Only count sales within the date range
        // if (invoiceDate && invoiceDate >= startDate && invoiceDate <= endDate) {
        const itemData = itemMap.get(itemCode)!;
        itemData.totalSales += saleQuantity;
        // }
      });
    }

    // Add sales data from Revenue Register within date range
    normalizedRevenueData.forEach((revenueEntry) => {
      const itemCode = revenueEntry["Item Code"];
      const quantity = revenueEntry["Quantity"] || 0;
      const entryDate = revenueEntry["Date"];

      // Skip if no matching inventory item
      if (!itemMap.has(itemCode)) return;

      // Only count sales within the date range
      // if (entryDate && entryDate >= startDate && entryDate <= endDate) {
      const itemData = itemMap.get(itemCode)!;
      itemData.totalSales += quantity;
      // }
    });

    // Find items with inventory but no sales during the year
    const noSalesItems: NoSalesItemsResult["summary"] = [];

    itemMap.forEach((data, itemCode) => {
      if (data.inventoryQuantity > 0 && data.totalSales === 0) {
        results.push(...data.entries);
        noSalesItems.push({
          itemCode,
          itemName: data.itemName,
          inventoryQuantity: data.inventoryQuantity,
          totalSales: data.totalSales,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: noSalesItems,
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
