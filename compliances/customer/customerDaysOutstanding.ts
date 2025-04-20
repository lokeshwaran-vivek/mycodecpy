/**
 * Receivables Compliance Test: Customer Days Outstanding
 *
 * Purpose:
 * This test calculates the average number of days receivables remain outstanding for each customer.
 * It works by comparing the total outstanding receivable value against the total invoice value for each customer.
 * A high number of days outstanding can indicate potential issues such as:
 * - Slow payment collection processes
 * - Customers facing financial difficulties
 * - Inefficient billing or invoice processing
 * - Overly lenient credit policies
 * - Potential problems in working capital management
 *
 * How it works:
 * 1. Validates the input data structure to ensure all required fields from the Customer Listing template are present in each entry.
 * 2. Groups the entries by 'Customer Code' to aggregate data for each customer.
 * 3. For each customer group:
 *    - Calculates the 'Total Invoice Value' which represents the total revenue from that customer.
 *    - Calculates the 'Total Outstanding Value' which is the sum of all outstanding receivables from that customer.
 *    - Computes the 'Days Outstanding' using the formula: (365 / Total Invoice Value) * Total Outstanding Value. This formula estimates how many days, on average, invoices remain unpaid.
 * 4. Returns:
 *    - A list of all processed entries.
 *    - A summary for each customer, including 'Customer Code', 'Customer Name', 'Total Invoice Value', 'Total Outstanding Value', and calculated 'Days Outstanding'.
 *    - A list of any validation errors encountered during data processing.
 *
 * Required Fields (based on Customer Listing Template):
 * - Customer Code: Unique code assigned to each customer
 * - Customer Name: Name of the customer
 * - Invoice Value: Total value of the sales invoice (Revenue)
 * - Outstanding Value: Amount outstanding for the invoice (Receivable Value)
 * - Invoice Date: Date when the sales invoice was issued (Optional)
 */

import { log } from "../../lib/utils/log";
import { isValidDate } from "../../lib/utils/date-utils";

interface CustomerListingEntry {
  "Customer Code": string;
  "Customer Name": string;
  "Outstanding Value": number;
  "Invoice Date"?: string; // Optional due date field
  "Due Date"?: string; // Optional due date field
}

interface SalesRegisterEntry {
  "Customer Code": string;
  "Customer Name": string;
  "Invoice Value": number;
  "Taxable Value": number;
  Discount: number;
  "Tax Value": number;
  Date?: string; // Optional date field for sales entries
}

type Entry = CustomerListingEntry | SalesRegisterEntry;

export interface CustomerDaysOutstandingResult {
  results: Entry[];
  summary: {
    customerCode: string;
    customerName: string;
    totalRevenue: number;
    totalReceivable: number;
    daysOutstanding: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface CustomerDaysOutstandingConfig {
  periodOfTransaction?: number;
  cutOffDays?: number;
}

export default function customerDaysOutstanding(
  data: {
    "Customer Listing": CustomerListingEntry[];
    "Sales Register": SalesRegisterEntry[];
  },
  config: CustomerDaysOutstandingConfig = {}
): CustomerDaysOutstandingResult {
  const {
    "Customer Listing": customerListing,
    "Sales Register": salesRegister,
  } = data;
  
  const periodOfTransaction: number = Number(config.periodOfTransaction);
  const cutOffDays: number = Number(config.cutOffDays);

  const errors: ErrorType[] = [];
  const results: Entry[] = [];

  // Input validation
  if (!Array.isArray(customerListing) || !Array.isArray(salesRegister)) {
    errors.push({
      message: "Data must be an array",
    });
    return { results, summary: [], errors };
  }

  // Normalize data - if any dates are present
  const normalizedCustomerListingData = customerListing.map((entry) => {
    // Create a new object with all properties from the original entry
    const newEntry = { ...entry };

    // Process any date fields if they exist
    if (
      newEntry["Invoice Date"] &&
      typeof newEntry["Invoice Date"] === "string"
    ) {
      try {
        // Validate the date format
        if (!isValidDate(newEntry["Invoice Date"])) {
          errors.push({
            message: `Invalid Invoice Date format: ${newEntry["Invoice Date"]}`,
            row: newEntry,
          });
        }
      } catch (e) {
        errors.push({
          message: `Error processing Invoice Date: ${newEntry["Invoice Date"]}`,
          row: newEntry,
        });
      }
    }

    if (newEntry["Due Date"] && typeof newEntry["Due Date"] === "string") {
      try {
        // Validate the date format
        if (!isValidDate(newEntry["Due Date"])) {
          errors.push({
            message: `Invalid Due Date format: ${newEntry["Due Date"]}`,
            row: newEntry,
          });
        }
      } catch (e) {
        errors.push({
          message: `Error processing Due Date: ${newEntry["Due Date"]}`,
          row: newEntry,
        });
      }
    }

    return newEntry;
  });

  const normalizedSalesRegisterData = salesRegister.map((entry) => {
    // Create a new object with all properties from the original entry
    const newEntry = { ...entry };

    // Process any date fields if they exist
    if (newEntry["Date"] && typeof newEntry["Date"] === "string") {
      try {
        // Validate the date format
        if (!isValidDate(newEntry["Date"])) {
          errors.push({
            message: `Invalid Date format: ${newEntry["Date"]}`,
            row: newEntry,
          });
        }
      } catch (e) {
        errors.push({
          message: `Error processing Date: ${newEntry["Date"]}`,
          row: newEntry,
        });
      }
    }

    if (newEntry["Invoice Value"] === undefined) {
      // Fix the calculation to properly handle the conditional and operator precedence
      const taxableValue = newEntry["Taxable Value"]
        ? newEntry["Taxable Value"]
        : 0;

      newEntry["Invoice Value"] = taxableValue;
    }

    return newEntry;
  });

  // Validate data structure
  for (const entry of normalizedCustomerListingData) {
    if (!entry["Customer Code"]) {
      errors.push({
        message: "Customer Code is missing in Customer Listing",
        row: entry,
      });
    }
    if (!entry["Customer Name"]) {
      errors.push({
        message: "Customer Name is missing in Customer Listing",
        row: entry,
      });
    }
    if (entry["Outstanding Value"] === undefined) {
      errors.push({
        message: "Outstanding Value is missing in Customer Listing",
        row: entry,
      });
    }
  }

  for (const entry of normalizedSalesRegisterData) {
    if (!entry["Customer Code"]) {
      errors.push({
        message: "Customer Code is missing in Sales Register",
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
        totalRevenue: number;
        totalReceivable: number;
        customerName: string;
        count: number;
      }
    >();

    // First, calculate the total revenue per customer from Sales Register
    const customerTotalRevenue = new Map<string, number>();
    normalizedSalesRegisterData.forEach((salesEntry) => {
      if (
        !salesEntry["Customer Code"] ||
        salesEntry["Invoice Value"] === undefined
      )
        return;

      const customerCode = salesEntry["Customer Code"];
      const currentTotal = customerTotalRevenue.get(customerCode) || 0;
      // Ensure we're adding a valid numeric value
      const invoiceValue =
        typeof salesEntry["Invoice Value"] === "number"
          ? salesEntry["Invoice Value"]
          : 0;
      customerTotalRevenue.set(customerCode, currentTotal + invoiceValue);
    });

    // Now process the customer listing data and accumulate outstanding values
    normalizedCustomerListingData.forEach((entry) => {
      if (!entry["Customer Code"] || entry["Outstanding Value"] === undefined)
        return;

      const customerCode = entry["Customer Code"];
      // Ensure we're using a valid numeric outstanding value
      const outstandingValue =
        typeof entry["Outstanding Value"] === "number"
          ? entry["Outstanding Value"]
          : 0;

      if (!customerMap.has(customerCode)) {
        customerMap.set(customerCode, {
          entries: [],
          totalRevenue: customerTotalRevenue.get(customerCode) || 0, // Set total revenue from pre-calculated map
          totalReceivable: 0,
          customerName: entry["Customer Name"],
          count: 0,
        });
      }

      const customerData = customerMap.get(customerCode)!;
      customerData.entries.push(entry);
      customerData.totalReceivable += outstandingValue;
      customerData.count += 1;
    });

    // Calculate days outstanding for each customer
    const daysOutstanding: CustomerDaysOutstandingResult["summary"] = [];

    // Group results by customer code
    const groupedResults: Record<string, Entry[]> = {};

    customerMap.forEach((data, customerCode) => {
      // Ensure minimum value to prevent division issues (at least 1 currency unit)
      const minimumValue = 1;
      const effectiveTotalRevenue = Math.max(data.totalRevenue, minimumValue);

      if (effectiveTotalRevenue > 0) {
        // Use fiscalYearDays from config instead of hardcoded 365
        // The correct formula for Days Sales Outstanding (DSO):
        // DSO = (Outstanding Receivable Value / Total Revenue) × Period of Transaction

        // Calculate days outstanding with proper safeguards
        let days =
          (data.totalReceivable / effectiveTotalRevenue) * periodOfTransaction;

        // Round to 2 decimal places for better readability
        days = Math.round(days * 100) / 100;

        // Only include entries that meet the cutoff criteria
        if (days > cutOffDays) {
          // Group results by customer code
          groupedResults[customerCode] = data.entries;

          daysOutstanding.push({
            customerCode,
            customerName: data.customerName,
            totalRevenue: data.totalRevenue,
            totalReceivable: data.totalReceivable,
            daysOutstanding: days,
          });
        }
      }
    });

    // Flatten the grouped results to maintain backward compatibility
    const flattenedResults: Entry[] = [];
    Object.values(groupedResults).forEach((entries) => {
      flattenedResults.push(...entries);
    });

    // Sort summary by customer code for better organization
    const sortedSummary = daysOutstanding.sort((a, b) =>
      a.customerCode.localeCompare(b.customerCode)
    );

    // Final validation to filter out any potentially invalid results
    const validatedSummary = sortedSummary.filter((item) => {
      // Remove any entries with zero or negative values that shouldn't be possible
      if (item.totalRevenue <= 0 || item.totalReceivable < 0) {
        log({
          message: `Filtered out customer with invalid values: ${item.customerCode}`,
          type: "info",
          data: item,
        });
        return false;
      }
      return true;
    });

    // Add summary statistics for debugging
    const totalStats = validatedSummary.reduce(
      (acc, item) => {
        acc.totalReceivable += item.totalReceivable;
        acc.totalRevenue += item.totalRevenue;
        acc.count += 1;
        return acc;
      },
      { totalReceivable: 0, totalRevenue: 0, count: 0 }
    );

    // Calculate overall average days outstanding
    if (totalStats.totalRevenue > 0) {
      const overallDaysOutstanding =
        (totalStats.totalReceivable / totalStats.totalRevenue) * cutOffDays;
    }

    return {
      results: flattenedResults,
      summary: validatedSummary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in customerDaysOutstanding",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
