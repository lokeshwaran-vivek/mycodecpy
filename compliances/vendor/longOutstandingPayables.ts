/**
 * Payables Compliance Test: Long Outstanding Payables
 *
 * Purpose:
 * This test identifies vendors with long outstanding payable balances.
 * It analyzes vendor data to find vendors with 'Outstanding Value' that has remained unpaid past the due date.
 * This helps in identifying potential issues like:
 * - Delayed payments to vendors
 * - Potential cash flow problems
 * - Need for better vendor payment management
 *
 * How it works:
 * 1. Validates the input data structure to ensure it is an array and contains the required fields ('Vendor Number', 'Vendor Name', 'Outstanding Value') as defined in the Vendors template.
 * 2. Iterates through each entry, checking for the presence and validity of required fields. Errors are logged for any missing or invalid fields.
 * 3. Calculates 'Ageing Days' as (cutOffDate - Due Date). Positive values indicate the entry is overdue.
 * 4. Groups entries by 'Vendor Number' to aggregate payable balances for each vendor.
 * 5. For each vendor, it filters payables based on 'Ageing Days' being greater than cutOffDays (meaning past due beyond the threshold).
 * 6. Calculates the total 'Outstanding Value' for long outstanding payables and the maximum 'Ageing Days'.
 * 7. Returns:
 *    - A list of all entries identified as long outstanding payables.
 *    - A summary for each vendor with long outstanding payables, including 'Vendor Number', 'Vendor Name', total 'Outstanding Value', and maximum 'Ageing Days'.
 *    - A list of any validation errors encountered during data processing.
 *
 * Required Fields (based on Vendors Template):
 * - Vendor Number: Unique code assigned to each vendor
 * - Vendor Name: Name of the vendor
 * - Outstanding Value: Total outstanding amount payable to the vendor
 * - Due Date: Due date for payment (used to calculate 'Ageing Days')
 *
 * Configuration:
 * - cutOffDate: The reference date for calculating ageing days
 * - cutOffDays: Threshold for determining long outstanding status (only entries with ageing days > cutOffDays are included)
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  getDaysDifference
} from "../../lib/utils/date-utils";

interface Entry {
  "Vendor Number": string;
  "Vendor Name": string;
  Currency?: string;
  Discount?: number;
  "Outstanding Value": number;
  "Due Date"?: Date;
  Location?: string;
  "Ageing Days"?: number;
}

export interface LongOutstandingPayablesResult {
  results: Entry[];
  summary: {
    vendorCode: string;
    vendorName: string;
    outstandingAmount: number;
    maxAgeingDays: number;
    transactions: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface LongOutstandingPayablesConfig {
  cutOffDate?: Date | string;
  cutOffDays?: number;
}

export default function longOutstandingPayables(
  data: Entry[],
  config: LongOutstandingPayablesConfig = { cutOffDate: new Date(), cutOffDays: 365 }
): LongOutstandingPayablesResult {
  // Convert cutOffDate to Date object if it's a string
  const cutOffDate = config.cutOffDate ? toDate(config.cutOffDate) : new Date();
  const cutOffDays = config.cutOffDays || 365;
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

    if (entry["Due Date"] === undefined) {
      errors.push({
        message: "Due Date is missing",
        row: entry,
      });
    } else if (!isValidDate(entry["Due Date"])) {
      errors.push({
        message: "Due Date is invalid",
        row: entry,
      });
    }

    // Calculate Ageing Days if Due Date is available
    if (entry["Due Date"] && isValidDate(entry["Due Date"])) {
      // Calculate the difference in days between cutOffDate and Due Date (ageing days)
      const ageingDays = getDaysDifference(cutOffDate, entry["Due Date"]);

      // Set Ageing Days to calculated value (positive means overdue, value > cutOffDays means beyond threshold)
      entry["Ageing Days"] = ageingDays;
    }
  }
  
  try {
    // Group entries by vendor
    const vendorMap = new Map<
      string,
      {
        payables: Entry[];
        vendorName: string;
      }
    >();

    normalizedData.forEach((entry) => {
      if (!entry["Vendor Number"] || entry["Outstanding Value"] === undefined)
        return;

      if (!vendorMap.has(entry["Vendor Number"])) {
        vendorMap.set(entry["Vendor Number"], {
          payables: [],
          vendorName: entry["Vendor Name"],
        });
      }

      const vendorData = vendorMap.get(entry["Vendor Number"])!;
      vendorData.payables.push(entry);
    });

    // Find vendors with long outstanding payables
    const longOutstanding: LongOutstandingPayablesResult["summary"] = [];

    vendorMap.forEach((data, vendorCode) => {
      // Filter to only include payables where ageing days > cutOffDays
      const oldPayables = data.payables.filter(
        (p) => (p["Ageing Days"] || 0) > cutOffDays
      );

      if (oldPayables.length > 0) {
        const outstandingAmount = oldPayables.reduce(
          (sum, p) => sum + (p["Outstanding Value"] || 0),
          0
        );
        const maxAgeingDays = Math.max(
          ...oldPayables.map((p) => p["Ageing Days"] || 0)
        );

        results.push(...oldPayables);
        longOutstanding.push({
          vendorCode,
          vendorName: data.vendorName,
          outstandingAmount,
          maxAgeingDays,
          transactions: [...oldPayables],
        });
      }
    });

    return {
      results,
      summary: longOutstanding,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in longOutstandingPayables",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
