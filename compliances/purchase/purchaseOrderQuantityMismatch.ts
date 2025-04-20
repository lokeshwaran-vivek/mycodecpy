/**
 * Purchase Compliance Test: Purchase Order Quantity Mismatch Detection
 *
 * Purpose:
 * This test identifies discrepancies between the quantity of items recorded in purchase orders (PO)
 * and the actual units received or recorded in the purchase register.
 * It helps detect:
 * - Data entry errors in PO quantities or received units.
 * - Potential over or under delivery by vendors.
 * - Issues in inventory management and tracking.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present based on Purchase Register template.
 * 2. For each line item, it aggregates the 'PO Quantity' from the PO and the 'Units' from the purchase entries.
 * 3. Flags POs where the 'Units' - 'PO Quantity' is more than zero.
 *
 * Required Fields (based on Purchase Register Template):
 * - Purchase Reference Date: Date of the purchase transaction.
 * - Purchase Reference Number: Unique identifier for each purchase transaction.
 * - PO Quantity: Quantity of items ordered in the Purchase Order.
 * - Units: Quantity of items received or recorded in the purchase register.
 * - Value: Total value of the purchase.
 */
import { log } from "../../lib/utils/log";
import { toDate, isValidDate } from "../../lib/utils/date-utils";

interface Entry {
  "Purchase Reference Date": Date;
  "Purchase Reference Number": string;
  "PO Quantity"?: number;
  Units: number;
  Value: number;
}

export interface PurchaseOrderQuantityMismatchResult {
  results: Entry[];
  summary: {
    purchaseReferenceNumber: string;
    poQuantity: number;
    units: number;
    difference: number;
    entry: Entry;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface PurchaseOrderQuantityMismatchConfig {}

export default function purchaseOrderQuantityMismatch(
  data: Entry[],
  config: PurchaseOrderQuantityMismatchConfig = {}
): PurchaseOrderQuantityMismatchResult {
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
  const normalizedData = data.map((entry) => ({
    ...entry,
    "Purchase Reference Date": entry["Purchase Reference Date"]
      ? toDate(entry["Purchase Reference Date"])
      : entry["Purchase Reference Date"],
  }));

  // Validate data structure
  for (const entry of normalizedData) {
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
    if (!entry["Purchase Reference Number"]) {
      errors.push({
        message: "Purchase Reference Number is missing",
        row: entry,
      });
    }
    if (typeof entry["Units"] !== "number") {
      errors.push({
        message: "Units must be a number",
        row: entry,
      });
    }
    if (typeof entry["Value"] !== "number") {
      errors.push({
        message: "Value must be a number",
        row: entry,
      });
    }
  }

  try {
    const summary: PurchaseOrderQuantityMismatchResult["summary"] = [];

    // Check each line item for quantity mismatch
    normalizedData.forEach((entry) => {
      const poQuantity = entry["PO Quantity"];
      const units = entry["Units"];

      // Skip if PO Quantity is not provided
      if (typeof poQuantity !== "number") {
        errors.push({
          message: "PO Quantity is missing or invalid",
          row: entry,
        });
        return;
      }

      // Check if units exceed PO quantity
      if (units > poQuantity) {
        results.push(entry);
        summary.push({
          purchaseReferenceNumber: entry["Purchase Reference Number"],
          poQuantity,
          units,
          difference: units - poQuantity,
          entry,
        });
      }
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in purchaseOrderQuantityMismatch",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
