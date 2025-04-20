/**
 * Invoice Compliance Test: Missing Invoice Sequence
 *
 * Purpose:
 * This test identifies gaps in invoice number sequences that could indicate missing
 * or skipped transactions. Missing sequences might indicate:
 * - Deleted or voided transactions
 * - System processing errors
 * - Manual number manipulation
 * - Lost or misplaced documents
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable prefix parameter for invoice number format
 * 3. For each invoice sequence:
 *    - Extracts numeric portions
 *    - Identifies gaps in numbering
 *    - Calculates missing numbers
 * 4. Returns:
 *    - Full list of entries before/after gaps
 *    - Summary with missing ranges
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Number: Unique invoice identifier
 * - Invoice Date: Transaction date
 * - Taxable Value: Invoice amount
 *
 * Configuration:
 * - prefix: Expected prefix for invoice numbers
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate
} from "../../lib/utils/date-utils";
import { removePrecedingZeros } from "../../lib/utils";

export interface Entry {
  "Invoice Number"?: string;
  "Invoice Date": Date;
  "Taxable Value": number;
}

export interface MissingInvoiceSequenceResult {
  results: Entry[];
  summary: {
    before: string;
    after: string;
    missingRange: string[];
    recentInvoices: string[]; // Last 4 invoice numbers for reference
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface MissingInvoiceSequenceConfig {
  prefix?: string;
}

export default function missingInvoiceSequence(
  data: Entry[],
  config: MissingInvoiceSequenceConfig = {},
): MissingInvoiceSequenceResult {
  const prefix = config.prefix || "";
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
    // Extract numeric portion of invoice numbers and sort
    const invoiceNumbers: { 
      number: string; 
      numericPart: number; 
      entry: Entry; 
    }[] = [];

    normalizedData.forEach((entry) => {
      const invoiceNumber = removePrecedingZeros(entry["Invoice Number"] || "");
      if (!invoiceNumber) return;
      
      // Remove the prefix if it exists
      const withoutPrefix = prefix && invoiceNumber.startsWith(prefix)
        ? invoiceNumber.substring(prefix.length)
        : invoiceNumber;
      
      // Extract numeric part (assumes numbers are at the end or make up the whole string after removing prefix)
      const numericMatch = withoutPrefix.match(/\d+/);
      
      if (numericMatch) {
        const numericPart = parseInt(numericMatch[0], 10);
        if (!isNaN(numericPart)) {
          invoiceNumbers.push({
            number: invoiceNumber,
            numericPart,
            entry,
          });
        }
      }
    });

    // Sort by numeric part
    invoiceNumbers.sort((a, b) => a.numericPart - b.numericPart);

    // Find gaps in sequence
    const gaps: MissingInvoiceSequenceResult["summary"] = [];
    
    for (let i = 1; i < invoiceNumbers.length; i++) {
      const current = invoiceNumbers[i];
      const previous = invoiceNumbers[i - 1];
      
      // Check if there's a gap
      if (current.numericPart - previous.numericPart > 1) {
        // Calculate missing range
        const missingRange: string[] = [];
        for (let j = previous.numericPart + 1; j < current.numericPart; j++) {
          const paddedNumber = j.toString().padStart(previous.number.length - prefix.length, '0');
          missingRange.push(`${prefix}${paddedNumber}`);
        }
        
        // Add to results
        results.push(previous.entry, current.entry);
        
        // Create summary
        gaps.push({
          before: previous.number,
          after: current.number,
          missingRange,
          recentInvoices: invoiceNumbers
            .slice(Math.max(0, i - 4), i + 1)
            .map(inv => inv.number),
        });
      }
    }

    return {
      results,
      summary: gaps,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in missingInvoiceSequence",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
