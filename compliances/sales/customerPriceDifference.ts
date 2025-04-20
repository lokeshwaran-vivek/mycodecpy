/**
 * Invoice Compliance Test: Customer Price Variations
 *
 * Purpose:
 * This test identifies significant variations in selling prices for the same item
 * across different customers. Price variations might indicate:
 * - Unauthorized discounts
 * - Preferential pricing
 * - Pricing policy violations
 * - Data entry errors
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable threshold for acceptable price variation
 * 3. For each item:
 *    - Calculates average selling price
 *    - Identifies variations above threshold
 *    - Groups by customer for analysis
 * 4. Returns:
 *    - Full list of price variations
 *    - Summary with percentage differences
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Date: Transaction date
 * - Customer Code: Customer identifier
 * - Item Code: Product identifier
 * - Selling Price: Unit selling price
 *
 * Configuration:
 * - threshold: Maximum acceptable price variation percentage
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate
} from "../../lib/utils/date-utils";

export interface Entry {
  "Invoice Date": Date;
  "Customer Code": string;
  "Item Code": string;
  "Selling Price": number;
}

export interface CustomerPriceDifferenceResult {
  results: Entry[];
  summary: {
    itemCode: string;
    customerCode: string;
    invoiceDate: Date;
    price: number;
    averagePrice: number;
    percentageDifference: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface CustomerPriceDifferenceConfig {
  threshold?: number;
}

export default function customerPriceDifference(
  data: Entry[],
  config: CustomerPriceDifferenceConfig = { threshold: 5 },
): CustomerPriceDifferenceResult {
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
  const normalizedData = data.map(entry => ({
    ...entry,
    "Invoice Date": entry["Invoice Date"] ? toDate(entry["Invoice Date"]) : entry["Invoice Date"]
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
    if (!entry["Customer Code"]) {
      errors.push({
        message: "Customer Code is missing",
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

  try {
    // Group entries by item code
    const itemPrices = new Map<string, Map<string, Entry[]>>();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Item Code"];
      const customerCode = entry["Customer Code"];
      const sellingPrice = entry["Selling Price"];
      
      if (!itemCode || !customerCode || typeof sellingPrice !== "number") return;

      if (!itemPrices.has(itemCode)) {
        itemPrices.set(itemCode, new Map());
      }
      
      const itemCustomers = itemPrices.get(itemCode)!;
      
      if (!itemCustomers.has(customerCode)) {
        itemCustomers.set(customerCode, []);
      }
      
      itemCustomers.get(customerCode)!.push(entry);
    });

    // Calculate average prices and find variations
    const summary: CustomerPriceDifferenceResult["summary"] = [];

    itemPrices.forEach((customers, itemCode) => {
      // Calculate overall average price for this item across all customers
      let totalPrice = 0;
      let totalEntries = 0;
      
      customers.forEach((entries) => {
        entries.forEach((entry) => {
          totalPrice += entry["Selling Price"];
          totalEntries++;
        });
      });
      
      const overallAveragePrice = totalPrice / totalEntries;
      
      // Compare each customer's price to overall average
      customers.forEach((entries, customerCode) => {
        entries.forEach((entry) => {
          const price = entry["Selling Price"];
          const percentageDifference = ((price - overallAveragePrice) / overallAveragePrice) * 100;
          
          if (Math.abs(percentageDifference) > threshold) {
            results.push(entry);
            
            summary.push({
              itemCode,
              customerCode,
              invoiceDate: entry["Invoice Date"],
              price,
              averagePrice: overallAveragePrice,
              percentageDifference,
            });
          }
        });
      });
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in customerPriceDifference",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
