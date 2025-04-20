/**
 * Receivables Compliance Test: Negative Receivables
 *
 * Purpose:
 * This test identifies customers with negative receivable balances from a Customer Listing data set.
 * Negative balances can indicate various issues such as:
 * - Over-payments from customers
 * - Credit notes not properly applied
 * - Accounting errors in receivable postings
 * - System processing issues
 * - Potential fraud through duplicate collections
 *
 * How it works:
 * 1. Validates the input data structure to ensure it is an array and contains the required fields ('Customer Code', 'Customer Name', 'Outstanding Value') as defined in the Customer Listing template.
 * 2. Iterates through each entry in the data, checking for the presence and validity of required fields. Errors are logged for any missing or invalid fields.
 * 3. Groups entries by 'Customer Code' to aggregate receivable balances for each customer.
 * 4. For each customer group, it calculates the sum of 'Outstanding Value'.
 * 5. Identifies customers for whom the total 'Outstanding Value' is negative.
 * 6. Returns:
 *    - A list of all entries associated with customers having negative receivable balances.
 *    - A summary for each customer with a negative balance, including 'Customer Code', 'Customer Name', and the total negative 'Outstanding Value'.
 *    - A list of any validation errors encountered during data processing.
 *
 * Required Fields (based on Customer Listing Template):
 * - Customer Code: Unique code assigned to each customer
 * - Customer Name: Name of the customer
 * - Outstanding Value: Amount outstanding for the invoice (used as receivable balance in this test)
 */

import { log } from "../../lib/utils/log";

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
  "Overdue Days"?: number;
}

export interface NegativeReceivablesResult {
  results: Entry[];
  summary: {
    customerCode: string;
    customerName: string;
    receivableBalance: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface NegativeReceivablesConfig {
  // No specific config needed for this test
}

export default function negativeReceivables(
  data: Entry[],
  config: NegativeReceivablesConfig = {},
): NegativeReceivablesResult {
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

  // Validate data structure
  for (const entry of data) {
    if (!entry["Customer Code"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Customer Code",
        row: entry,
      });
    }
    if (!entry["Customer Name"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Customer Name",
        row: entry,
      });
    }
    if (entry["Outstanding Value"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Outstanding Value",
        row: entry,
      });
    }
  }

  try {
    // Group entries by customer
    const customerMap = new Map<
      string,
      {
        entries: Entry[];
        customerName: string;
        receivableBalance: number;
      }
    >();

    data.forEach((entry) => {
      if (!entry["Customer Code"] || entry["Outstanding Value"] === undefined)
        return;

      if (!customerMap.has(entry["Customer Code"])) {
        customerMap.set(entry["Customer Code"], {
          entries: [],
          customerName: entry["Customer Name"],
          receivableBalance: 0,
        });
      }

      const customerData = customerMap.get(entry["Customer Code"])!;
      customerData.entries.push(entry);
      customerData.receivableBalance += entry["Outstanding Value"];
    });

    // Find customers with negative receivable balances
    const negativeBalances: NegativeReceivablesResult["summary"] = [];

    customerMap.forEach((data, customerCode) => {
      if (data.receivableBalance < 0) {
        results.push(...data.entries);
        negativeBalances.push({
          customerCode,
          customerName: data.customerName,
          receivableBalance: data.receivableBalance,
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
      message: "Error processing Negative Receivables data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
