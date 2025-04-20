/**
 * Invoice Compliance Test: Duplicate Invoice Numbers on Different Dates
 *
 * Purpose:
 * This test identifies instances where the same invoice number appears on different dates,
 * which may indicate compliance issues. Multiple entries with the same invoice number on the SAME date are considered valid
 * and will be ignored.
 * 
 * Invoice number violations might indicate:
 * - Reuse of invoice numbers across different periods
 * - Invoice numbering system issues
 * - Potential fraudulent activities
 * - Manual override of controls
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each invoice:
 *    - Groups entries by invoice number
 *    - Checks if any invoice number appears on different dates
 *    - Only flags as violations those that appear on multiple dates
 * 3. Returns:
 *    - Full list of violating entries
 *    - Summary with violation details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Number: Unique invoice identifier
 * - Invoice Date: Transaction date
 * - Taxable Value: Invoice amount
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  formatCustom
} from "../../lib/utils/date-utils";
import { removePrecedingZeros } from "../../lib/utils";

interface Entry {
  "Invoice Number": string;
  "Invoice Date": Date;
  "Taxable Value": number;
  "Customer Code"?: string;
  [key: string]: any;
}

export interface DuplicateInvoicesResult {
  results: Entry[];
  summary: DuplicateSummary[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DuplicateInvoicesConfig {
  threshold?: number;
}

export interface DuplicateSummary {
  invoiceNumber: string;
  count: number;
  dates: string[];
  details: {
    invoiceDate: string;
    taxableValue: number;
    party: string;
  }[];
}

export default function duplicateInvoices(
  data: Entry[],
  config: DuplicateInvoicesConfig = {}
): DuplicateInvoicesResult {
  const errors: ErrorType[] = [];
  const results: Entry[] = [];
  const summary: DuplicateSummary[] = [];

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary, errors };
  }

  // Normalize data - ensure dates are properly converted
  const normalizedData = data.map(entry => ({
    ...entry,
    "Invoice Date": entry["Invoice Date"] ? toDate(entry["Invoice Date"]) : entry["Invoice Date"]
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Invoice Number"]) {
      errors.push({
        message: "Invoice Number is missing",
        row: entry,
      });
    }
    
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
    
    if (typeof entry["Taxable Value"] !== "number") {
      errors.push({
        message: "Taxable Value must be a number",
        row: entry,
      });
    }
  }

  try {
    // Group entries by invoice number
    const invoiceGroups = new Map<string, Entry[]>();

    normalizedData.forEach((entry) => {
      const invoiceNumber = removePrecedingZeros(entry["Invoice Number"] || "");
      if (!invoiceNumber) return;

      if (!invoiceGroups.has(invoiceNumber)) {
        invoiceGroups.set(invoiceNumber, []);
      }

      invoiceGroups.get(invoiceNumber)!.push(entry);
    });

    // Find violations (invoice numbers that appear on different dates)
    invoiceGroups.forEach((entries, invoiceNumber) => {
      // Skip if only one entry with this invoice number
      if (entries.length <= 1) return;

      // Check if this invoice number appears on different dates
      const uniqueDates = new Set<string>();
      
      entries.forEach(entry => {
        if (entry["Invoice Date"]) {
          uniqueDates.add(formatCustom(entry["Invoice Date"], "yyyy-MM-dd"));
        }
      });

      // If uniqueDates has more than one date, this is a violation
      if (uniqueDates.size > 1) {
        // Add all violating entries to results
        entries.forEach((entry) => {
          results.push(entry);
        });

        // Create summary for this group of violations
        summary.push({
          invoiceNumber,
          count: entries.length,
          dates: Array.from(uniqueDates),
          details: entries.map((entry) => ({
            invoiceDate: entry["Invoice Date"] ? formatCustom(entry["Invoice Date"], "yyyy-MM-dd") : "Invalid Date",
            taxableValue: entry["Taxable Value"],
            party: entry["Customer Code"] || "Unknown",
          })),
        });
      }
      // If all entries have the same date, this is valid and ignored
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in duplicateInvoices",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
