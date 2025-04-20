/**
 * Payables Compliance Test: Supplier Days Outstanding
 *
 * Purpose:
 * This test calculates the average number of overdue days for each vendor based on outstanding payables.
 * It helps identify vendors for whom payments are frequently delayed, potentially indicating:
 * - Issues with payment processes
 * - Need for better vendor payment management
 * - Potential strain on vendor relationships
 *
 * How it works:
 * 1. Validates the input data structure to ensure it is an array and contains the required fields ('Vendor Number', 'Vendor Name', 'Outstanding Value', 'Overdue Days') as defined in the Vendors template.
 * 2. Iterates through each entry, checking for the presence and validity of required fields. Errors are logged for any missing or invalid fields.
 * 3. Groups entries by 'Vendor Number' to aggregate data for each vendor.
 * 4. Computes the 'Days Outstanding' using the formula: (365 / Total Invoice Value) * Total Outstanding Value. This formula estimates how many days, on average, invoices remain unpaid.
 * 5. Returns:
 *    - A list of all entries processed.
 *    - A summary for each vendor, including 'Vendor Number', 'Vendor Name', average 'Overdue Days', and total 'Outstanding Value'.
 *    - A list of any validation errors encountered during data processing.
 *
 * Required Fields (based on Vendors Template):
 * - Vendor Number: Unique code assigned to each vendor
 * - Vendor Name: Name of the vendor
 * - Outstanding Value: Total outstanding amount payable to the vendor
 * - Overdue Days: Number of days past the due date for payment
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  getDaysDifference,
  getCurrentDateString,
} from "../../lib/utils/date-utils";

interface VendorsEntry {
  "Vendor Number": string;
  "Vendor Name": string;
  "Outstanding Value": number;
  "Due Date"?: string; // Optional due date field
  "Invoice Date"?: string; // Optional invoice date field
}

interface PurchaseRegisterEntry {
  "Vendor Number": string;
  "Vendor Name": string;
  Value: number;
  Date?: string; // Optional date field for purchase entries
}

type Entry = VendorsEntry | PurchaseRegisterEntry;

export interface SupplierDaysOutstandingResult {
  results: Entry[];
  summary: {
    vendorCode: string;
    vendorName: string;
    totalOutstandingValue: number;
    totalValue: number;
    daysOutstanding: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface SupplierDaysOutstandingConfig {
  cutOffDays?: number; // Optional config for fiscal year days, defaults to 365
  periodOfTransaction?: number; // Optional config for period of transaction, defaults to 365
}

export default function supplierDaysOutstanding(
  data: {
    Vendors: VendorsEntry[];
    "Purchase Register": PurchaseRegisterEntry[];
  },
  config: SupplierDaysOutstandingConfig = {
    cutOffDays: 365,
    periodOfTransaction: 365,
  }
): SupplierDaysOutstandingResult {
  const { Vendors: vendors, "Purchase Register": purchaseRegister } = data;
  const cutOffDays = Number(config.cutOffDays);
  const periodOfTransaction = Number(config.periodOfTransaction);

  const errors: ErrorType[] = [];
  const results: Entry[] = [];

  // Input validation
  if (!Array.isArray(vendors) || !Array.isArray(purchaseRegister)) {
    errors.push({
      message: "Data must be an array",
    });
    return { results, summary: [], errors };
  }

  // Normalize data - if any dates are present
  const normalizedVendorData = vendors.map((entry) => {
    // Create a new object with all properties from the original entry
    const newEntry = { ...entry };

    // Process any date fields if they exist
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

    return newEntry;
  });

  const normalizedPurchaseRegisterData = purchaseRegister.map((entry) => {
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

    return newEntry;
  });

  // Validate data structure
  for (const entry of normalizedVendorData) {
    if (!entry["Vendor Number"]) {
      errors.push({
        message: "Vendor Number is missing in Vendors",
        row: entry,
      });
    }
    if (!entry["Vendor Name"]) {
      errors.push({
        message: "Vendor Name is missing in Vendors",
        row: entry,
      });
    }
    if (entry["Outstanding Value"] === undefined) {
      errors.push({
        message: "Outstanding Value is missing in Vendors",
        row: entry,
      });
    }
  }

  for (const entry of normalizedPurchaseRegisterData) {
    if (!entry["Vendor Number"]) {
      errors.push({
        message: "Vendor Number is missing in Purchase Register",
        row: entry,
      });
    }
    if (entry["Value"] === undefined) {
      errors.push({
        message: "Value is missing in Purchase Register",
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
        totalOutstandingValue: number;
        vendorName: string;
        count: number;
        totalValue: number;
      }
    >();

    // First, calculate the total value per vendor from Purchase Register
    const vendorTotalValues = new Map<string, number>();
    normalizedPurchaseRegisterData.forEach((purchaseEntry) => {
      if (
        !purchaseEntry["Vendor Number"] ||
        purchaseEntry["Value"] === undefined
      )
        return;

      const vendorNumber = purchaseEntry["Vendor Number"];
      const currentTotal = vendorTotalValues.get(vendorNumber) || 0;
      // Ensure we're adding a valid numeric value
      const entryValue =
        typeof purchaseEntry["Value"] === "number" ? purchaseEntry["Value"] : 0;
      vendorTotalValues.set(vendorNumber, currentTotal + entryValue);
    });

    // Now process the vendor data and accumulate outstanding values
    normalizedVendorData.forEach((entry) => {
      if (!entry["Vendor Number"] || entry["Outstanding Value"] === undefined)
        return;

      const vendorNumber = entry["Vendor Number"];
      // Ensure we're using a valid numeric outstanding value
      const outstandingValue =
        typeof entry["Outstanding Value"] === "number"
          ? entry["Outstanding Value"]
          : 0;

      if (!vendorMap.has(vendorNumber)) {
        vendorMap.set(vendorNumber, {
          entries: [],
          totalValue: vendorTotalValues.get(vendorNumber) || 0, // Set total value from pre-calculated map
          totalOutstandingValue: 0,
          vendorName: entry["Vendor Name"],
          count: 0,
        });
      }

      const vendorData = vendorMap.get(vendorNumber)!;
      vendorData.entries.push(entry);
      vendorData.totalOutstandingValue += outstandingValue;
      vendorData.count += 1;
    });

    // Calculate average days outstanding for each supplier
    const daysOutstandingSummary: SupplierDaysOutstandingResult["summary"] = [];

    // Group results by vendor number
    const groupedResults: Record<string, Entry[]> = {};

    vendorMap.forEach((data, vendorCode) => {
      // Ensure minimum value to prevent division issues (at least 1 currency unit)
      const minimumValue = 1;
      const effectiveTotalValue = Math.max(data.totalValue, minimumValue);

      if (effectiveTotalValue > 0) {
        // Use fiscalYearDays from config instead of hardcoded 365
        // The correct formula for Days Payable Outstanding (DPO):
        // DPO = (Outstanding Payable Value / Total Purchases) × Period of Transaction

        // Calculate raw days value for debugging
        let days = (data.totalOutstandingValue / effectiveTotalValue) * periodOfTransaction;

        // Round to 2 decimal places for better readability
        days = Math.round(days * 100) / 100;

        // Only include entries that meet the cutoff criteria
        if (days > cutOffDays) {
          // Group results by vendor number
          groupedResults[vendorCode] = data.entries;

          daysOutstandingSummary.push({
            vendorCode,
            vendorName: data.vendorName,
            totalValue: data.totalValue,
            totalOutstandingValue: data.totalOutstandingValue,
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

    // Sort summary by vendor code for better organization
    const sortedSummary = daysOutstandingSummary.sort((a, b) =>
      a.vendorCode.localeCompare(b.vendorCode)
    );

    // Final validation to filter out any potentially invalid results
    const validatedSummary = sortedSummary.filter((item) => {
      // Remove any entries with zero or negative values that shouldn't be possible
      if (item.totalValue <= 0 || item.totalOutstandingValue < 0) {
        log({
          message: `Filtered out vendor with invalid values: ${item.vendorCode}`,
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
        acc.totalOutstanding += item.totalOutstandingValue;
        acc.totalValue += item.totalValue;
        acc.count += 1;
        return acc;
      },
      { totalOutstanding: 0, totalValue: 0, count: 0 }
    );

    // Calculate overall average days outstanding
    if (totalStats.totalValue > 0) {
      const overallDaysOutstanding =
        (totalStats.totalOutstanding / totalStats.totalValue) * cutOffDays;
    }

    return {
      results: flattenedResults,
      summary: validatedSummary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in supplierDaysOutstanding",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
