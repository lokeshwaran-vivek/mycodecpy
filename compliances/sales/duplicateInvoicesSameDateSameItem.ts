/**
 * Invoice Compliance Test: Duplicate Invoice Entries with Same Details
 *
 * Purpose:
 * This test identifies instances where the same item code appears multiple times with identical
 * customer on the same date within the same invoice number and with the same quantity, which may indicate duplicate entries.
 * 
 * Invoice duplication violations might indicate:
 * - Double-entry of the same item in a single invoice
 * - System synchronization issues
 * - Double payments for the same goods or services
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each invoice:
 *    - Groups entries by date, customer, item code, invoice number, and quantity
 *    - Checks if any combination appears multiple times - indicating potential duplicates
 *    - Flags these entries as potential duplications that could lead to double payments
 * 3. Returns:
 *    - Full list of violating entries
 *    - Summary with violation details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Number: Unique invoice identifier
 * - Invoice Date: Transaction date
 * - Party Name: Customer name
 * - Item Code: Product or service code
 * - Sale Quantity: Number of items
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
  "Customer Code": string;
  "Item Code"?: string;
  "Sale Quantity"?: number;
  "Item Description"?: string;
  "Item Name"?: string;
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

export interface DuplicateSummary {
  key: string;
  count: number;
  details: {
    invoiceNumber: string;
    invoiceDate: string;
    customer: string;
    taxableValue: number;
    quantity: number;
    itemCode?: string;
    itemName?: string;
    itemDescription?: string;
  }[];
}

export default function duplicateInvoices(data: Entry[]): DuplicateInvoicesResult {
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

  try {
    // Normalize dates and validate entries
    const normalizedData = data.map((entry, index) => {
      const normalizedEntry = {
        ...entry,
        "Invoice Date": entry["Invoice Date"] ? toDate(entry["Invoice Date"]) : entry["Invoice Date"]
      };

      // Validation checks
      if (!normalizedEntry["Invoice Number"]) {
        errors.push({
          message: `Row ${index + 1}: Invoice Number is missing`,
          row: entry,
        });
      }
      
      if (!normalizedEntry["Invoice Date"] || !isValidDate(normalizedEntry["Invoice Date"])) {
        errors.push({
          message: `Row ${index + 1}: Invalid or missing Invoice Date`,
          row: entry,
        });
      }
      
      if (!normalizedEntry["Customer Code"]) {
        errors.push({
          message: `Row ${index + 1}: Customer Code is missing`,
          row: entry,
        });
      }
      
      if (!normalizedEntry["Item Code"]) {
        errors.push({
          message: `Row ${index + 1}: Item Code is missing`,
          row: entry,
        });
      }

      return normalizedEntry;
    });

    // If there are validation errors, return early
    if (errors.length > 0) {
      return { results, summary, errors };
    }

    // Group entries by date + customer + item code + invoice number + quantity
    const duplicateGroups = new Map<string, Entry[]>();

    normalizedData.forEach((entry) => {
      const invoiceDate = formatCustom(entry["Invoice Date"], "yyyy-MM-dd");
      const customerCode = entry["Customer Code"];
      const itemCode = entry["Item Code"] || "unknown";
      const invoiceNumber = removePrecedingZeros(entry["Invoice Number"] || "");
      const quantity = entry["Sale Quantity"] ?? 0;
      
      // Create a composite key: date + customer + item code + invoice number + quantity
      const key = `${invoiceDate}|${customerCode}|${itemCode}|${invoiceNumber}|${quantity}`;
      
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      
      duplicateGroups.get(key)!.push(entry);
    });

    // Find duplicate entries (same date, customer, item code, invoice number, and quantity)
    duplicateGroups.forEach((entries, key) => {
      // Only process groups with more than one entry
      if (entries.length > 1) {
        // Add all entries in the group to results
        results.push(...entries);
        
        // Parse the key back into its components
        const [date, customer, itemCode, invoiceNumber, quantity] = key.split('|');

        // Create summary for this group of duplicates
        summary.push({
          key,
          count: entries.length,
          details: entries.map((entry) => ({
            invoiceNumber: entry["Invoice Number"],
            invoiceDate: formatCustom(entry["Invoice Date"], "yyyy-MM-dd"),
            customer: entry["Customer Code"],
            taxableValue: entry["Taxable Value"],
            quantity: entry["Sale Quantity"] ?? 0,
            itemCode: entry["Item Code"],
            itemName: entry["Item Name"],
            itemDescription: entry["Item Description"],
          })),
        });
      }
    });

    return { results, summary, errors };
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
