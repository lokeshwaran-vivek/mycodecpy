/**
 * Receivables Compliance Test: Long Outstanding Customers
 *
 * Purpose:
 * This test identifies customers with long outstanding receivables past their due dates.
 * It analyzes customer invoices and flags those with outstanding amounts that have remained unpaid past the due date.
 * This helps in identifying potential risks associated with delayed payments, such as:
 * - Increased risk of bad debts
 * - Need for tighter credit control
 * - Inefficiencies in collection processes
 *
 * How it works:
 * 1. Validates the input data structure to ensure it conforms to the expected 'Customer Listing' template, checking for required fields.
 * 2. Calculates 'Ageing Days' as (cutOffDate - Due Date). Positive values indicate the entry is overdue.
 * 3. Filters invoices to identify those where 'Ageing Days' is greater than cutOffDays (meaning past due beyond the threshold).
 * 4. Groups these long outstanding invoices by 'Customer Code' to provide a summary for each customer.
 * 5. Calculates the total outstanding amount for each customer from their long outstanding invoices.
 * 6. Returns:
 *    - A list of all entries identified as long outstanding receivables (beyond cutOffDays).
 *    - A summary for each customer, including 'Customer Code', 'Customer Name', 'Total Outstanding Amount', and 'Maximum Ageing Days'.
 *    - Any validation errors encountered during data processing.
 *
 * Required Fields (based on Customer Listing Template):
 * - Customer Code: Unique code assigned to each customer
 * - Customer Name: Name of the customer
 * - Outstanding Value: Amount outstanding for the invoice
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
  "Invoice Number"?: string;
  "Invoice Date"?: Date;
  "Customer Code": string;
  "Customer Name": string;
  "Customer Location"?: string;
  Currency?: string;
  "Invoice Value"?: number;
  "Write Off Value"?: number;
  "Outstanding Value": number;
  "Credit Limit"?: number;
  "Last Payment Date"?: Date;
  "Due Date"?: Date;
  "Ageing Days"?: number;
}

export interface LongOutstandingCustomersResult {
  results: Entry[];
  summary: {
    customerCode: string;
    customerName: string;
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

export interface LongOutstandingCustomersConfig {
  cutOffDate?: Date | string;
  cutOffDays?: number;
}

export default function longOutstandingCustomers(
  data: Entry[],
  config: LongOutstandingCustomersConfig = { cutOffDate: new Date(), cutOffDays: 365 }
): LongOutstandingCustomersResult {
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
    "Invoice Date": entry["Invoice Date"] ? toDate(entry["Invoice Date"]) : entry["Invoice Date"],
    "Last Payment Date": entry["Last Payment Date"] ? toDate(entry["Last Payment Date"]) : entry["Last Payment Date"],
    "Due Date": entry["Due Date"] ? toDate(entry["Due Date"]) : entry["Due Date"]
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Customer Code"]) {
      errors.push({
        message: "Customer Code is missing",
        row: entry,
      });
    }
    if (!entry["Customer Name"]) {
      errors.push({
        message: "Customer Name is missing",
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

    if (entry["Invoice Date"] && !isValidDate(entry["Invoice Date"])) {
      errors.push({
        message: "Invoice Date is invalid",
        row: entry,
      });
    }
    if (entry["Last Payment Date"] && !isValidDate(entry["Last Payment Date"])) {
      errors.push({
        message: "Last Payment Date is invalid",
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
    // Group entries by customer
    const customerMap = new Map<
      string,
      {
        receivables: Entry[];
        customerName: string;
      }
    >();

    normalizedData.forEach((entry) => {
      if (!entry["Customer Code"] || entry["Outstanding Value"] === undefined)
        return;

      if (!customerMap.has(entry["Customer Code"])) {
        customerMap.set(entry["Customer Code"], {
          receivables: [],
          customerName: entry["Customer Name"],
        });
      }

      const customerData = customerMap.get(entry["Customer Code"])!;
      customerData.receivables.push(entry);
    });

    // Find customers with long outstanding receivables beyond cutOffDays
    const longOutstanding: LongOutstandingCustomersResult["summary"] = [];

    customerMap.forEach((data, customerCode) => {
      // Filter to only include receivables where ageing days > cutOffDays
      const oldReceivables = data.receivables.filter(
        (r) => (r["Ageing Days"] || 0) > cutOffDays
      );

      if (oldReceivables.length > 0) {
        const outstandingAmount = oldReceivables.reduce(
          (sum, r) => sum + (r["Outstanding Value"] || 0),
          0
        );
        const maxAgeingDays = Math.max(
          ...oldReceivables.map((r) => r["Ageing Days"] || 0)
        );

        results.push(...oldReceivables);
        longOutstanding.push({
          customerCode,
          customerName: data.customerName,
          outstandingAmount,
          maxAgeingDays,
          transactions: [...oldReceivables],
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
      message: "Error processing Long Outstanding Customers data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
