/**
 * Purchase Compliance Test: Vendor Price Difference Detection
 *
 * Purpose:
 * This test identifies when the same item is purchased from different vendors at different prices within the same month.
 * It flags purchases where the price from a specific vendor differs from others in the same month,
 * based on a configurable percentage threshold.
 * This helps detect:
 * - Overpricing by certain vendors.
 * - Potential data entry errors in pricing.
 * - Opportunities to negotiate better rates with vendors.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present based on Purchase Register template.
 * 2. Groups purchase entries by 'Item Code' and month.
 * 3. For each 'Item Code' in each month, compares prices from different vendors.
 * 4. Calculates the percentage difference between vendor prices for the same item in the same month.
 * 5. Flags entries where the percentage difference exceeds the defined threshold.
 * 6. Returns:
 *    - Full list of entries identified as having a significant vendor price difference within the same month.
 *    - Summary of each price difference incident, including item details, vendor, dates, prices, and percentage difference.
 *    - Any validation errors encountered during data processing.
 *
 * Required Fields (based on Purchase Register Template):
 * - Purchase Reference Number: Unique identifier for each purchase transaction.
 * - Purchase Reference Date: Date of the purchase transaction.
 * - Vendor Number: Unique code assigned to the vendor.
 * - Vendor Name: Name of the vendor.
 * - Item Code: Unique code for the purchased item.
 * - Item Name: Name or description of the purchased item.
 * - Units: Quantity of items purchased.
 * - Rate: Price per unit of the item.
 * - Value: Total value of the purchase (Units * Rate).
 */
import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  formatCustom
} from "../../lib/utils/date-utils";

interface Entry {
  "Purchase Reference Number": string;
  "Purchase Reference Date": Date;
  "Vendor Number": string;
  "Vendor Name": string;
  "Item Code": string;
  "Item Name": string;
  Units: number;
  Rate: number;
  Value: number;
}

export interface VendorPriceDifferenceResult {
  results: Entry[];
  summary: {
    itemCode: string;
    vendorNumber: string;
    vendorName: string;
    purchaseReferenceDate: Date;
    rate: number;
    comparisonRate: number;  // Changed from averagePrice to comparisonRate
    percentageDifference: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface VendorPriceDifferenceConfig {
  threshold?: number;
}

export default function vendorPriceDifference(
  data: Entry[],
  config: VendorPriceDifferenceConfig = { threshold: 5 },
): VendorPriceDifferenceResult {
  const threshold = config.threshold || 5;
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
    "Purchase Reference Date": entry["Purchase Reference Date"] ? toDate(entry["Purchase Reference Date"]) : entry["Purchase Reference Date"]
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Purchase Reference Number"]) {
      errors.push({
        message: "Purchase Reference Number is missing",
        row: entry,
      });
    }
    if (!entry["Purchase Reference Date"]) {
      errors.push({
        message: "Purchase Reference Date is missing",
        row: entry,
      });
    } else if (!isValidDate(entry["Purchase Reference Date"])) {
      errors.push({
        message: "Purchase Reference Date is invalid",
        row: entry,
      });
    }
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
    if (!entry["Item Code"]) {
      errors.push({
        message: "Item Code is missing",
        row: entry,
      });
    }
    if (!entry["Item Name"]) {
      errors.push({
        message: "Item Name is missing",
        row: entry,
      });
    }
    if (entry["Rate"] === undefined) {
      errors.push({
        message: "Rate is missing",
        row: entry,
      });
    }
  }

  try {
    // Group entries by item code, month, and vendor
    const itemsByMonth = new Map<
      string, // Item code
      Map<
        string, // Month (YYYY-MM)
        Map<
          string, // Vendor number
          {
            entries: Entry[];
            totalRate: number;
            count: number;
          }
        >
      >
    >();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Item Code"];
      const date = entry["Purchase Reference Date"];
      const vendorNumber = entry["Vendor Number"];
      const rate = entry["Rate"];

      if (!itemCode || !date || !vendorNumber || rate === undefined) return;

      const monthKey = formatCustom(date, "yyyy-MM");

      if (!itemsByMonth.has(itemCode)) {
        itemsByMonth.set(itemCode, new Map());
      }

      const itemMonths = itemsByMonth.get(itemCode)!;
      if (!itemMonths.has(monthKey)) {
        itemMonths.set(monthKey, new Map());
      }

      const monthVendors = itemMonths.get(monthKey)!;
      if (!monthVendors.has(vendorNumber)) {
        monthVendors.set(vendorNumber, { entries: [], totalRate: 0, count: 0 });
      }

      const vendorData = monthVendors.get(vendorNumber)!;
      vendorData.entries.push(entry);
      vendorData.totalRate += rate;
      vendorData.count++;
    });

    // Find vendor price differences
    const summary: VendorPriceDifferenceResult["summary"] = [];

    // Iterate through each item code
    itemsByMonth.forEach((itemMonths, itemCode) => {
      // Iterate through each month for the item
      itemMonths.forEach((monthVendors, monthKey) => {
        // Skip if there's only one vendor for this item in this month
        if (monthVendors.size <= 1) return;

        // Calculate average rate for each vendor
        const vendorRates = Array.from(monthVendors.entries()).map(
          ([vendorNumber, data]) => ({
            vendorNumber,
            vendorName: data.entries[0]["Vendor Name"],
            averageRate: data.totalRate / data.count,
            entries: data.entries,
          })
        );

        // Calculate overall average rate for this item in this month across all vendors
        const totalRateSum = vendorRates.reduce(
          (sum, vendor) => sum + vendor.averageRate,
          0
        );
        const overallAverageRate = totalRateSum / vendorRates.length;

        // Check each vendor's average rate against the overall average
        vendorRates.forEach((vendor) => {
          const percentageDifference =
            ((vendor.averageRate - overallAverageRate) / overallAverageRate) * 100;

          // Include only if the difference exceeds the threshold
          if (Math.abs(percentageDifference) > threshold || percentageDifference <= -threshold) {
            results.push(...vendor.entries);
            
            summary.push({
              itemCode,
              vendorNumber: vendor.vendorNumber,
              vendorName: vendor.vendorName,
              purchaseReferenceDate: vendor.entries[0]["Purchase Reference Date"],
              rate: vendor.averageRate,
              comparisonRate: overallAverageRate,
              percentageDifference,
            });
          }
        });
      });
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in vendorPriceDifference",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
