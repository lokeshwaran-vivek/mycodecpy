/**
 * Payables Compliance Test: Negative Payables
 *
 * Purpose:
 * This test identifies vendors with negative payable balances from a Vendors data set.
 * Negative balances can indicate various issues such as:
 * - Over-payments to vendors
 * - Credit notes not properly applied
 * - Accounting errors in payable postings
 * - System processing issues
 * - Potential fraud through duplicate payments
 *
 * How it works:
 * 1. Validates the input data structure to ensure it is an array and contains the required fields ('Vendor Number', 'Vendor Name', 'Outstanding Value') as defined in the Vendors template.
 * 2. Iterates through each entry in the data, checking for the presence and validity of required fields. Errors are logged for any missing or invalid fields.
 * 3. Groups entries by 'Vendor Number' to aggregate payable balances for each vendor.
 * 4. For each vendor group, it calculates the sum of 'Outstanding Value'.
 * 5. Identifies vendors for whom the total 'Outstanding Value' is negative.
 * 6. Returns:
 *    - A list of all entries associated with vendors having negative payable balances.
 *    - A summary for each vendor with a negative balance, including 'Vendor Number', 'Vendor Name', and the total negative 'Outstanding Value'.
 *    - A list of any validation errors encountered during data processing.
 *
 * Required Fields (based on Vendors Template):
 * - Vendor Number: Unique code assigned to each vendor
 * - Vendor Name: Name of the vendor
 * - Outstanding Value: Total outstanding amount payable to the vendor
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate
} from "../../lib/utils/date-utils";

interface Entry {
  "Vendor Number": string;
  "Vendor Name": string;
  Currency?: string;
  Discount?: number;
  "Outstanding Value": number;
  "Due Date"?: Date;
  "Overdue Days"?: number;
  Location?: string;
}

export interface NegativePayablesResult {
  results: Entry[];
  summary: {
    vendorCode: string;
    vendorName: string;
    payableBalance: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface NegativePayablesConfig {
  // No specific config needed for this test
}

export default function negativePayables(
  data: Entry[],
  config: NegativePayablesConfig = {},
): NegativePayablesResult {
  const errors: ErrorType[] = [];
  const results: Entry[] = [];

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
    "Due Date": entry["Due Date"] ? toDate(entry["Due Date"]) : entry["Due Date"]
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Vendor Number"]) {
      errors.push({
        message: "Vendor Number is missing",
        row: entry,
      });
    }
    if (!entry["Vendor Name"]) {
      errors.push({
        message: "Vendor Name is missing",
        row: entry,
      });
    }
    if (entry["Outstanding Value"] === undefined) {
      errors.push({
        message: "Outstanding Value is missing",
        row: entry,
      });
    }
    
    // Validate Due Date if present
    if (entry["Due Date"] && !isValidDate(entry["Due Date"])) {
      errors.push({
        message: "Due Date is invalid",
        row: entry,
      });
    }
  }

  try {
    // Group entries by vendor
    const vendorMap = new Map<
      string,
      {
        entries: Entry[];
        vendorName: string;
        payableBalance: number;
      }
    >();

    normalizedData.forEach((entry) => {
      if (!entry["Vendor Number"] || entry["Outstanding Value"] === undefined)
        return;

      if (!vendorMap.has(entry["Vendor Number"])) {
        vendorMap.set(entry["Vendor Number"], {
          entries: [],
          vendorName: entry["Vendor Name"],
          payableBalance: 0,
        });
      }

      const vendorData = vendorMap.get(entry["Vendor Number"])!;
      vendorData.entries.push(entry);
      vendorData.payableBalance += entry["Outstanding Value"];
    });

    // Find vendors with negative payable balances
    const negativeBalances: NegativePayablesResult["summary"] = [];

    vendorMap.forEach((data, vendorCode) => {
      if (data.payableBalance < 0) {
        results.push(...data.entries);
        negativeBalances.push({
          vendorCode,
          vendorName: data.vendorName,
          payableBalance: data.payableBalance,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: negativeBalances,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in negativePayables",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
