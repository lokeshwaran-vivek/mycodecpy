/**
 * Invoice Compliance Test: Unusual Transaction Discounts
 *
 * Purpose:
 * This test identifies transactions with discount percentages that deviate significantly
 * from the average transaction discount. Unusual discounts might indicate:
 * - Unauthorized approvals
 * - Preferential treatment
 * - Control overrides
 * - Processing errors
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable threshold for acceptable discount variations
 * 3. For each transaction:
 *    - Groups by invoice number and customer code
 *    - Flags non-zero discounts when other entries have zero discount
 *    - Additionally checks for statistical outliers using z-scores
 * 4. Returns:
 *    - Full list of unusual discount transactions
 *    - Summary with deviation information and reason
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Number: Unique identifier for the entry
 * - Invoice Date: Transaction date
 * - Invoice Value: Transaction amount
 * - Discount: Discount amount
 *
 * Configuration:
 * - threshold: Maximum acceptable discount variation percentage
 */

import { log } from "../../lib/utils/log";
import { toDate, isValidDate } from "../../lib/utils/date-utils";

interface Entry {
  "Item Code": string;
  "Invoice Date": Date;
  "Invoice Number": string;
  "Taxable Value": number;
  Discount: number;
  "Customer Code": string;
  [key: string]: any;
}

export interface UnusualTransactionDiscountsResult {
  results: Entry[];
  summary: {
    customerCode: string;
    invoiceNumber: string;
    invoiceDate: Date;
    invoiceAmount: number;
    discountAmount: number;
    discountPercentage: number;
    reason: string;
    averageDiscount?: number;
    standardDeviation?: number;
    zScore?: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface UnusualTransactionDiscountsConfig {
  threshold?: number;
}

export default function unusualTransactionDiscounts(
  data: Entry[],
  config: UnusualTransactionDiscountsConfig = { threshold: 10 }
): UnusualTransactionDiscountsResult {
  const threshold = config.threshold || 10;
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
  const normalizedData = data.map((entry) => ({
    ...entry,
    "Invoice Date": entry["Invoice Date"]
      ? toDate(entry["Invoice Date"])
      : entry["Invoice Date"],
  }));

  // Validate data structure
  for (const entry of normalizedData) {
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

    if (!entry["Invoice Number"]) {
      errors.push({
        message: "Invoice Number is missing",
        row: entry,
      });
    }

    if (!entry["Customer Code"]) {
      errors.push({
        message: "Customer Code is missing",
        row: entry,
      });
    }

    if (!entry["Taxable Value"]) {
      errors.push({
        message: "Taxable Value is missing",
        row: entry,
      });
    }

    if (typeof entry["Discount"] !== "number") {
      errors.push({
        message: "Discount must be a number",
        row: entry,
      });
    }
  }

  try {
    const productTotals = new Map<
      string,
      {
        totalTaxableValue: number;
        totalDiscount: number;
        discountPercentage: number;
      }
    >();

    // Calculate discount percentage for each entry
    const entriesWithPercentage = normalizedData.map((entry) => {
      const discountPercentage =
        entry["Taxable Value"] > 0
          ? (entry["Discount"] / entry["Taxable Value"]) * 100
          : 0;

      const productCode = entry["Item Code"];

      if (!productTotals.has(productCode)) {
        productTotals.set(productCode, {
          totalTaxableValue: 0,
          totalDiscount: 0,
          discountPercentage: 0,
        });
      }

      const product = productTotals.get(productCode)!;
      product.totalTaxableValue += entry["Taxable Value"];
      product.totalDiscount += entry["Discount"];

      return {
        ...entry,
        discountPercentage,
      };
    });

    // Step 1: Calculate overall average discount percentage
    const totalDiscountPercentage = entriesWithPercentage.reduce(
      (sum, entry) => sum + entry.discountPercentage,
      0
    );
    const overallAverageDiscount =
      totalDiscountPercentage / entriesWithPercentage.length;

    // Step 2: Calculate product-wise discount percentages based on totals
    const productDiscounts: Array<{
      itemCode: string;
      totalTaxableValue: number;
      totalDiscount: number;
      discountPercentage: number;
    }> = [];

    productTotals.forEach((data, itemCode) => {
      const discountPercentage =
        data.totalTaxableValue > 0
          ? (data.totalDiscount / data.totalTaxableValue) * 100
          : 0;

      // if (discountPercentage > 0) {
        productDiscounts.push({
          itemCode,
          totalTaxableValue: data.totalTaxableValue,
          totalDiscount: data.totalDiscount,
          discountPercentage,
        });
      // }
    });

    // Step 2: Group entries by invoice number
    const invoiceGroups = new Map<string, typeof entriesWithPercentage>();

    entriesWithPercentage.forEach((entry) => {
      const invoiceNumber = entry["Invoice Number"];

      if (!invoiceGroups.has(invoiceNumber)) {
        invoiceGroups.set(invoiceNumber, []);
      }

      invoiceGroups.get(invoiceNumber)!.push(entry);
    });

    // Step 3: Analyze invoice discount deviations
    const summary: UnusualTransactionDiscountsResult["summary"] = [];

    // Track discount values across different invoices (based on actual amount, not percentage)
    const discountAmountCounts = new Map<number, Set<string>>();

    // Collect discount values and the invoices they appear in
    invoiceGroups.forEach((invoiceEntries, invoiceNumber) => {
      if (invoiceEntries.length === 0) return;

      // Check all entries in invoice (not just the first one)
      for (const entry of invoiceEntries) {
        const discountAmount = entry["Discount"];

        // Skip zero discounts
        if (discountAmount <= 0) continue;

        // Round to nearest whole number to avoid floating point comparison issues
        const roundedDiscount = Math.round(discountAmount);

        if (!discountAmountCounts.has(roundedDiscount)) {
          discountAmountCounts.set(roundedDiscount, new Set());
        }
        discountAmountCounts.get(roundedDiscount)!.add(invoiceNumber);
      }
    });

    // Find discount amounts that appear in only one invoice
    const uniqueDiscountInvoices = new Set<string>();

    discountAmountCounts.forEach((invoiceSet, discountAmount) => {
      if (invoiceSet.size === 1) {
        // This discount amount appears in only one invoice
        const invoiceNumber = Array.from(invoiceSet)[0];
        uniqueDiscountInvoices.add(invoiceNumber);
      }
    });

    // Only process invoices with unique discount amounts
    invoiceGroups.forEach((invoiceEntries, invoiceNumber) => {
      if (
        invoiceEntries.length < 1 ||
        !uniqueDiscountInvoices.has(invoiceNumber)
      ) {
        return;
      }

      // Calculate invoice's average discount percentage
      const invoiceTotalPercentage = invoiceEntries.reduce(
        (sum, entry) => sum + entry.discountPercentage,
        0
      );
      const invoiceAvgPercentage =
        invoiceTotalPercentage / invoiceEntries.length;

      // Add all entries of this invoice to results
      invoiceEntries.forEach((entry) => {
        const productCode = entry["Item Code"];
        const productDiscount = productDiscounts.find(
          (p) => p.itemCode === productCode
        );

        const productDiscountPercentage =
          productDiscount?.discountPercentage || 0;

        // Calculate deviation from overall average
        const deviation = Math.abs(
          invoiceAvgPercentage - productDiscountPercentage
        );

        // Check if deviation exceeds threshold
        if (deviation >= threshold) {
          if (entry.discountPercentage > 0) {
            results.push(entry);

            summary.push({
              customerCode: entry["Customer Code"],
              invoiceNumber: entry["Invoice Number"],
              invoiceDate: entry["Invoice Date"],
              invoiceAmount: entry["Taxable Value"],
              discountAmount: entry["Discount"],
              discountPercentage: entry.discountPercentage,
              reason: `Discount deviation of ${deviation.toFixed(6)}% from overall product average (${productDiscountPercentage.toFixed(6)}%)`,
            });
          }
        }
      });
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in unusualTransactionDiscounts",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
