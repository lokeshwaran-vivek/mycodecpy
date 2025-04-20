/**
 * Purchase Compliance Test: Duplicate Period Invoices
 *
 * Purpose:
 * This test identifies instances where the same invoice number (Purchase Reference Number) appears multiple times for a vendor
 * on different dates. This indicates potential duplicate invoices that need investigation.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present based on Purchase Register template
 * 2. Groups entries by Vendor Number and Purchase Reference Number
 * 3. For each vendor-invoice combination:
 *    - Identifies if the same invoice number appears on different dates
 *    - Flags as violations those that appear on multiple dates for the same vendor
 *    - Records transaction details for each occurrence
 * 4. Returns:
 *    - Full list of entries with duplicate invoices
 *    - Summary of duplicates with transaction details
 *    - Any validation errors encountered
 *
 * Required Fields (based on Purchase Register Template):
 * - Purchase Reference Date: Date of the purchase transaction
 * - Value: Value of goods before taxes in purchase
 * - Vendor Number: Unique code assigned to each vendor
 * - Purchase Reference Number: Unique number assigned to every purchase transaction
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  formatCustom
} from "../../lib/utils/date-utils";
import { removePrecedingZeros } from "@/lib/utils";

interface Entry {
  "Purchase Reference Number": string;
  "Purchase Reference Date": Date;
  "PO Number": string;
  "PO Date": Date;
  "PO Quantity": number;
  "PO Rate": number;
  "PO Preparer": string;
  "PO Approver": string;
  "Purchase Preparer": string;
  "Purchase Approver": string;
  "Vendor Number": string;
  "Vendor Name": string;
  "Item Code": string;
  "Item Name": string;
  Units: number;
  UOM: string;
  Rate: number;
  Currency: string;
  Discount: number;
  Value: number;
  "Receipt Date": Date;
  "Delivery Challan Number": string;
  Location: string;
}

export interface DuplicatePeriodInvoicesResult {
  results: Entry[];
  summary: {
    vendorNumber: string;
    purchaseReferenceNumber: string;
    occurrences: {
      purchaseReferenceDate: Date;
      value: number;
    }[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DuplicatePeriodInvoicesConfig {
  // No specific config needed for this test
}

export default function duplicatePeriodInvoices(
  data: Entry[],
  config: DuplicatePeriodInvoicesConfig = {},
): DuplicatePeriodInvoicesResult {
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
    "Purchase Reference Date": entry["Purchase Reference Date"] ? toDate(entry["Purchase Reference Date"]) : entry["Purchase Reference Date"],
    "PO Date": entry["PO Date"] ? toDate(entry["PO Date"]) : entry["PO Date"],
    "Receipt Date": entry["Receipt Date"] ? toDate(entry["Receipt Date"]) : entry["Receipt Date"]
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
    if (!entry["Vendor Number"]) {
      errors.push({
        message: "Vendor Number is missing",
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
    if (typeof entry["Value"] !== "number") {
      errors.push({
        message: "Value must be a number",
        row: entry,
      });
    }
  }

  try {
    // Group entries by vendor and purchase reference number
    const vendorInvoiceMap = new Map<string, Map<string, Entry[]>>();

    normalizedData.forEach((entry) => {
      const vendorNumber = entry["Vendor Number"];
      const purchaseReferenceNumber = removePrecedingZeros(entry["Purchase Reference Number"] || "");
      
      if (!vendorNumber || !purchaseReferenceNumber) return;

      if (!vendorInvoiceMap.has(vendorNumber)) {
        vendorInvoiceMap.set(vendorNumber, new Map());
      }

      const vendorInvoices = vendorInvoiceMap.get(vendorNumber)!;
      
      if (!vendorInvoices.has(purchaseReferenceNumber)) {
        vendorInvoices.set(purchaseReferenceNumber, []);
      }

      vendorInvoices.get(purchaseReferenceNumber)!.push(entry);
    });

    // Find duplicates
    const duplicates: DuplicatePeriodInvoicesResult["summary"] = [];

    vendorInvoiceMap.forEach((vendorInvoices, vendorNumber) => {
      vendorInvoices.forEach((entries, purchaseReferenceNumber) => {
        // Get unique dates for this vendor-invoice combination
        const uniqueDates = new Set<string>();
        
        entries.forEach(entry => {
          if (entry["Purchase Reference Date"]) {
            uniqueDates.add(formatCustom(entry["Purchase Reference Date"], "yyyy-MM-dd"));
          }
        });

        // If same invoice appears on different dates for same vendor, it's a violation
        if (uniqueDates.size > 1) {
          results.push(...entries);
          
          duplicates.push({
            vendorNumber,
            purchaseReferenceNumber,
            occurrences: entries.map((entry) => ({
              purchaseReferenceDate: entry["Purchase Reference Date"],
              value: entry["Value"],
            })),
          });
        }
      });
    });

    return {
      results,
      summary: duplicates,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in duplicatePeriodInvoices",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
