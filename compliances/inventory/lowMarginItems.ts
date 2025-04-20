/**
 * Inventory Compliance Test: Low Margin Items
 *
 * Purpose:
 * This test identifies inventory items with low profit margins based on
 * selling price comparison from Sales Register data.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable margin threshold (default: 75%)
 * 3. For each inventory item:
 *    - Analyzes selling price trends from Sales Register
 *    - Flags items with concerning price patterns
 * 4. Returns:
 *    - Full list of low margin items
 *    - Summary with price analysis
 *    - Any validation errors encountered
 *
 * Required Fields (based on Inventory Register Template):
 * - Material Code: Inventory item identifier
 * - Material Description: Description of the item
 * - Closing Units: Closing quantity
 * - Value: Total value
 *
 * Required Fields (based on Sales Register Template):
 * - Invoice Number: Unique sales invoice identifier
 * - Invoice Date: Date of sale
 * - Item Code: Product identifier
 * - Sale Quantity: Quantity sold
 * - Selling Price: Price per unit
 * - Taxable Value: Value before tax
 */

import { log } from "../../lib/utils/log";

interface InventoryEntry {
  "Material Code": string;
  "Material Description": string;
  "Closing Units": number;
  "Inventory Type": string;
  "Value Rate": number;
}

interface SalesEntry {
  "Invoice Number": string;
  "Invoice Date": Date;
  "Item Code": string;
  "Sale Quantity": number;
  "Selling Price": number;
  "Taxable Value": number;
}

export interface LowMarginItemsResult {
  results: InventoryEntry[];
  summary: {
    itemCode: string;
    itemName: string;
    sellingPrice: number;
    valuePerUnit: number;
    totalSalesValue: number;
    margin: number;
    lastSaleDate: Date;
    lastSaleQuantity: number;
    lastInvoiceNumber: string;
    entries: InventoryEntry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: InventoryEntry | SalesEntry;
};

export interface LowMarginItemsConfig {
  marginThreshold?: number;
}

export default function lowMarginItems(
  data: {
    "Inventory Register": InventoryEntry[];
    "Sales Register": SalesEntry[];
  },
  config: LowMarginItemsConfig = { marginThreshold: 75 }
): LowMarginItemsResult {
  const marginThreshold = config.marginThreshold ?? 75; // Default to 75% if not provided
  const errors: ErrorType[] = [];
  const results: InventoryEntry[] = [];

  const {
    "Inventory Register": inventoryRegister,
    "Sales Register": salesRegister = [],
  } = data;

  // Input validation for inventory data
  if (!Array.isArray(inventoryRegister)) {
    errors.push({
      message: "Inventory Register data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Input validation for sales data
  if (!Array.isArray(salesRegister)) {
    errors.push({
      message: "Sales Register data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Normalize inventory data
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
      if (entry["Value Rate"] === undefined) {
        errors.push({
          message: "Invalid entry format: Entry must contain Value Rate",
          row: entry,
        });
      }

      return {
        ...entry,
        "Material Code": entry["Material Code"]?.trim() || "",
        "Material Description": entry["Material Description"]?.trim() || "",
      };
    })
    .filter((entry) =>
      /^(finished\s*goods?|fg|traded\s*goods)$/i.test(entry["Inventory Type"])
    );

  // Normalize sales data
  let normalizedSalesData = salesRegister.map((entry) => {
    if (!entry["Invoice Number"]) {
      errors.push({
        message:
          "Invalid entry format: Sales entry must contain Invoice Number",
        row: entry,
      });
    }
    if (!entry["Item Code"]) {
      errors.push({
        message: "Invalid entry format: Sales entry must contain Item Code",
        row: entry,
      });
    }
    if (entry["Sale Quantity"] === undefined) {
      errors.push({
        message: "Invalid entry format: Sales entry must contain Sale Quantity",
        row: entry,
      });
    }
    if (entry["Selling Price"] === undefined) {
      errors.push({
        message: "Invalid entry format: Sales entry must contain Selling Price",
        row: entry,
      });
    }
    if (entry["Taxable Value"] === undefined) {
      errors.push({
        message: "Invalid entry format: Sales entry must contain Taxable Value",
        row: entry,
      });
    }

    return {
      ...entry,
      "Item Code": entry["Item Code"]?.trim() || "",
      "Invoice Date":
        entry["Invoice Date"] instanceof Date
          ? entry["Invoice Date"]
          : new Date(entry["Invoice Date"]),
    };
  });

  if (errors.length > 0) {
    log({
      message: "Validation errors in low margin items data",
      type: "error",
      data: errors,
    });
    return { results, summary: [], errors };
  }

  try {
    // First, create a normalized map of all item codes to handle variations
    const itemCodeMap = new Map<string, string>();

    // Process sales data first to build our reference of item codes
    normalizedSalesData.forEach((entry) => {
      const originalCode = entry["Item Code"];
      if (!originalCode) return;

      const normalizedCode = originalCode.trim().toLowerCase();
      itemCodeMap.set(normalizedCode, originalCode);
    });

    // Group inventory entries by item code
    const itemMap = new Map<
      string,
      {
        entries: InventoryEntry[];
        itemName: string;
        valuePerUnit: number;
        totalSalesValue: number;
      }
    >();

    // Build inventory data map with normalized codes
    normalizedInventoryData.forEach((entry) => {
      const originalCode = entry["Material Code"];
      if (!originalCode) return;

      const normalizedCode = originalCode.trim().toLowerCase();
      itemCodeMap.set(normalizedCode, originalCode);

      if (!itemMap.has(normalizedCode)) {
        itemMap.set(normalizedCode, {
          entries: [],
          itemName: entry["Material Description"],
          valuePerUnit: entry["Value Rate"],
          totalSalesValue: entry["Value Rate"] || 0,
        });
      }

      const itemData = itemMap.get(normalizedCode)!;
      itemData.entries.push(entry);
    });

    // Process sales data with normalized codes
    const salesByItem = new Map<string, SalesEntry[]>();

    normalizedSalesData = normalizedSalesData.reverse();

    normalizedSalesData.forEach((entry) => {
      const originalCode = entry["Item Code"];
      if (!originalCode) return;

      const normalizedCode = originalCode.trim().toLowerCase();

      if (!salesByItem.has(normalizedCode)) {
        salesByItem.set(normalizedCode, []);
      }

      salesByItem.get(normalizedCode)!.push(entry);
    });

    // Get latest sales data for each item
    const sellingPriceMap = new Map<
      string,
      {
        sellingPrice: number;
        saleQuantity: number;
        invoiceDate: Date;
        invoiceNumber: string;
        taxableValue: number;
      }
    >();

    salesByItem.forEach((entries, normalizedCode) => {
      // Sort by date descending
      const sortedEntries = entries.sort(
        (a, b) => b["Invoice Date"].getTime() - a["Invoice Date"].getTime()
      );

      const latestEntry = sortedEntries[0];
      if (latestEntry && latestEntry["Selling Price"] > 0) {
        sellingPriceMap.set(normalizedCode, {
          sellingPrice: latestEntry["Selling Price"],
          saleQuantity: latestEntry["Sale Quantity"],
          invoiceDate: latestEntry["Invoice Date"],
          invoiceNumber: latestEntry["Invoice Number"],
          taxableValue: latestEntry["Taxable Value"],
        });
      }
    });

    // Find items with concerning price patterns
    const lowMarginItems: LowMarginItemsResult["summary"] = [];

    // Process each inventory item
    itemMap.forEach((data, normalizedCode) => {
      const latestSale = sellingPriceMap.get(normalizedCode);

      if (!latestSale) return; // Skip if no sales data

      const { valuePerUnit, totalSalesValue } = data;
      const {
        sellingPrice,
        saleQuantity,
        invoiceDate,
        invoiceNumber,
        taxableValue,
      } = latestSale;

      // Skip if invalid values
      if (
        !sellingPrice ||
        sellingPrice <= 0 ||
        !valuePerUnit ||
        valuePerUnit <= 0
      )
        return;

      // Calculate margin percentage
      const margin = ((sellingPrice - valuePerUnit) / sellingPrice) * 100;

      // Only include items with margin below threshold
      if (margin < marginThreshold) {
        results.push(...data.entries);

        // Get original item code for output
        const originalCode = itemCodeMap.get(normalizedCode) || normalizedCode;

        lowMarginItems.push({
          itemCode: originalCode,
          itemName: data.itemName,
          sellingPrice,
          valuePerUnit,
          totalSalesValue: taxableValue,
          margin,
          lastSaleDate: invoiceDate,
          lastSaleQuantity: saleQuantity,
          lastInvoiceNumber: invoiceNumber,
          entries: [...data.entries],
        });
      }
    });

    // Sort summary by most recent sales first
    const sortedSummary = lowMarginItems.sort(
      (a, b) => b.lastSaleDate.getTime() - a.lastSaleDate.getTime()
    );

    return {
      results,
      summary: sortedSummary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in low margin items",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
