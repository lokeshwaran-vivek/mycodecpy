/**
 * Purchase Compliance Test: Sudden Purchase Price Spike Detection
 *
 * Purpose:
 * This test identifies sudden price increases for the same item compared to the immediately preceding purchase,
 * based on a configurable percentage threshold. It helps detect:
 * - Unjustified price hikes
 * - Vendor pricing errors
 * - Potential fraud or inflated costs
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present based on Purchase Register template.
 * 2. Groups purchase entries by 'Item Code'.
 * 3. Sorts entries by 'Purchase Reference Date' for each item to establish chronological order.
 * 4. Compares the 'Rate' of each purchase with the 'Rate' of the immediately preceding purchase for the same 'Item Code'.
 * 5. Calculates the percentage change in price between consecutive purchases.
 * 6. Flags entries where the percentage price increase exceeds the defined threshold.
 * 7. Returns:
 *    - Full list of entries identified as having a sudden price spike.
 *    - Summary of each price spike incident, including item details, dates, prices, and percentage change.
 *    - Any validation errors encountered during data processing.
 *
 * Required Fields (based on Purchase Register Template):
 * - Purchase Reference Number: Unique identifier for each purchase transaction.
 * - Purchase Reference Date: Date of the purchase transaction.
 * - Item Code: Unique code for the purchased item.
 * - Item Name: Name or description of the purchased item.
 * - Units: Quantity of items purchased.
 * - Rate: Price per unit of the item.
 * - Value: Total value of the purchase (Units * Rate).
 * - Vendor Number: Unique code assigned to the vendor.
 * - Vendor Name: Name of the vendor.
 */
import { log } from "../../lib/utils/log";
import { toDate, isValidDate, isDateAfter } from "../../lib/utils/date-utils";

interface Entry {
  "Purchase Reference Number": string;
  "Purchase Reference Date": Date;
  "PO Number"?: string;
  "PO Date"?: Date;
  "PO Quantity"?: number;
  "PO Rate"?: number;
  "PO Preparer"?: string;
  "PO Approver"?: string;
  "Purchase Preparer": string;
  "Purchase Approver"?: string;
  "Vendor Number": string;
  "Vendor Name": string;
  "Item Code": string;
  "Item Name": string;
  Units: number;
  UOM?: string;
  Rate: number;
  Currency?: string;
  Discount?: number;
  Value: number;
  "Receipt Date"?: Date;
  "Delivery Challan Number"?: string;
  Location?: string;
}

export interface SuddenPurchasePriceSpikeResult {
  results: Entry[];
  summary: {
    itemCode: string;
    itemName: string;
    purchaseReferenceDate: Date;
    previousPrice: number;
    currentPrice: number;
    percentageChange: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface SuddenPurchasePriceSpikeConfig {
  threshold?: number;
}

/**
 * Analyzes purchase data to identify sudden price spikes compared to the
 * immediately preceding purchase of the same item, based on a percentage threshold.
 *
 * @param {Entry[]} data Array of purchase entries.
 * @param {SuddenPurchasePriceSpikeConfig} [config={ threshold: 5 }] Configuration object with a percentage threshold.
 * @returns {SuddenPurchasePriceSpikeResult} Results including summary of price spikes,
 *                                          full entries of spikes, and any validation errors.
 */
export default function suddenPurchasePriceSpike(
  data: Entry[],
  config: SuddenPurchasePriceSpikeConfig = { threshold: 5 }
): SuddenPurchasePriceSpikeResult {
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
    "Purchase Reference Date": entry["Purchase Reference Date"]
      ? toDate(entry["Purchase Reference Date"])
      : entry["Purchase Reference Date"],
    "PO Date": entry["PO Date"] ? toDate(entry["PO Date"]) : entry["PO Date"],
    "Receipt Date": entry["Receipt Date"]
      ? toDate(entry["Receipt Date"])
      : entry["Receipt Date"],
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Purchase Reference Number"]) {
      errors.push({
        message: "Purchase Reference Number is missing",
        row: entry,
      });
    }
    if (!entry["Purchase Reference Date"]) {
      errors.push({
        message: "Purchase Reference Date is missing",
        row: entry,
      });
    } else if (!isValidDate(entry["Purchase Reference Date"])) {
      errors.push({
        message: "Purchase Reference Date is invalid",
        row: entry,
      });
    }
    if (!entry["Item Code"]) {
      errors.push({
        message: "Item Code is missing",
        row: entry,
      });
    }
    if (!entry["Item Name"]) {
      errors.push({
        message: "Item Name is missing",
        row: entry,
      });
    }
    if (typeof entry["Rate"] !== "number") {
      errors.push({
        message: "Rate must be a number",
        row: entry,
      });
    }
    if (entry["PO Date"] && !isValidDate(entry["PO Date"])) {
      errors.push({
        message: "PO Date is invalid",
        row: entry,
      });
    }
    if (entry["Receipt Date"] && !isValidDate(entry["Receipt Date"])) {
      errors.push({
        message: "Receipt Date is invalid",
        row: entry,
      });
    }
  }

  try {
    // Group entries by item code
    const itemEntries = new Map<string, Entry[]>();

    normalizedData = normalizedData.reverse();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Item Code"];
      if (!itemCode) return;

      if (!itemEntries.has(itemCode)) {
        itemEntries.set(itemCode, []);
      }

      itemEntries.get(itemCode)!.push(entry);
    });

    // Find price spikes by comparing consecutive purchases
    const summary: SuddenPurchasePriceSpikeResult["summary"] = [];

    itemEntries.forEach((entries, itemCode) => {
      // No need to sort again as entries are already in reverse chronological order
      // Compare each entry with the next one (newer to older)
      for (let i = 0; i < entries.length - 1; i++) {
        const currentEntry = entries[i];
        const previousEntry = entries[i + 1];

        const currentPrice = currentEntry["Rate"];
        const previousPrice = previousEntry["Rate"];

        // Calculate percentage change
        const percentageChange =
          ((currentPrice - previousPrice) / previousPrice) * 100;

        // Check if the percentage change exceeds the threshold
        if (percentageChange > threshold || percentageChange <= -threshold) {
          results.push(currentEntry);

          summary.push({
            itemCode,
            itemName: currentEntry["Item Name"],
            purchaseReferenceDate: currentEntry["Purchase Reference Date"],
            previousPrice,
            currentPrice,
            percentageChange,
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
      message: "Error processing data in suddenPurchasePriceSpike",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
