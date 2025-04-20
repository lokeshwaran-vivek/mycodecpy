/**
 * Invoice Compliance Test: Duplicate Invoice Numbers with Different Customers on Same Date
 *
 * Purpose:
 * This test identifies instances where the same invoice number appears for different customers
 * on the same date, which may indicate compliance issues. Duplicate invoice numbers across
 * different dates are considered valid and will be ignored.
 * 
 * Invoice number violations might indicate:
 * - Incorrect customer assignment
 * - Potential fraudulent activities
 * - Manual override of controls
 * - Data entry errors
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each invoice:
 *    - Groups entries by invoice number and date
 *    - Checks if any invoice number appears on same date with different customers
 *    - Only flags as violations those that have multiple customers on the same date
 * 3. Returns:
 *    - Full list of violating entries
 *    - Summary with violation details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Number: Unique invoice identifier
 * - Invoice Date: Transaction date
 * - Taxable Value: Invoice amount
 * - Customer Code: Customer name
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
  "Customer Code": string;
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
  date: string;
  count: number;
  customers: string[];
  details: {
    invoiceDate: string;
    taxableValue: number;
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
    // Group entries by invoice number and date combined
    const invoiceGroups = new Map<string, Entry[]>();

    normalizedData.forEach((entry) => {
      const invoiceNumber = removePrecedingZeros(entry["Invoice Number"] || "");
      const invoiceDate = entry["Invoice Date"] ? formatCustom(entry["Invoice Date"], "yyyy-MM-dd") : null;
      
      if (!invoiceNumber || !invoiceDate) return;

      // Create a combined key of invoice number and date
      const key = `${invoiceNumber}_${invoiceDate}`;

      if (!invoiceGroups.has(key)) {
        invoiceGroups.set(key, []);
      }

      invoiceGroups.get(key)!.push(entry);
    });

    // Find violations (invoice numbers that appear with different customers on the same date)
    invoiceGroups.forEach((entries, key) => {
      // Skip if only one entry with this invoice number and date
      if (entries.length <= 1) return;

      // Extract invoice number and date from the key
      const [invoiceNumber, formattedDate] = key.split('_');
      
      // Check if there are different customers for this invoice number on the same date
      const uniqueCustomers = new Set<string>();
      
      entries.forEach(entry => {
        if (entry["Customer Code"]) {
          uniqueCustomers.add(entry["Customer Code"]);
        }
      });

      // If more than one unique customer, this is a violation
      if (uniqueCustomers.size > 1) {
        // Add all violating entries to results
        entries.forEach((entry) => {
          results.push(entry);
        });

        // Create summary for this group of violations
        summary.push({
          invoiceNumber,
          date: formattedDate,
          count: entries.length,
          customers: Array.from(uniqueCustomers),
          details: entries.map((entry) => ({
            invoiceDate: entry["Invoice Date"] ? formatCustom(entry["Invoice Date"], "yyyy-MM-dd") : "Invalid Date",
            taxableValue: entry["Taxable Value"],
          })),
        });
      }
      // If all entries have the same customer, this is valid and ignored
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
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unknown error occurred";
      
    errors.push({
      message: `Error processing data: ${errorMessage}`
    });
    
    return { results, summary, errors };
  }
}
