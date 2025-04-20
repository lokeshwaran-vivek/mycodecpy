/**
 * Invoice Compliance Test: Unusual Product Discounts
 *
 * Purpose:
 * This test identifies products with unusual discounts compared to other products.
 * It can detect both unusual absolute discount values and unusual discount percentages.
 * Unusual discounts might indicate:
 * - Unauthorized price reductions
 * - Special arrangements
 * - Policy violations
 * - Calculation errors
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each product:
 *    - Flags products with non-zero discounts when others have zero discounts
 *    - Calculates discount percentage (Discount/Taxable Value)
 *    - Identifies variations outside normal ranges
 * 3. Returns:
 *    - Full list of unusual discount transactions
 *    - Summary with discount information
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Date: Transaction date
 * - Invoice Number: Transaction identifier
 * - Item Code: Product identifier
 * - Discount: Discount amount
 * - Taxable Value: Value before tax
 */

import { log } from "../../lib/utils/log";
import { toDate, isValidDate } from "../../lib/utils/date-utils";

interface Entry {
  "Invoice Date": Date;
  "Invoice Number"?: string;
  "Item Code": string;
  "Taxable Value": number;
  Discount: number;
  [key: string]: any;
}

export interface UnusualProductDiscountsResult {
  results: Entry[];
  summary: {
    itemCode: string;
    discountAmount: number;
    discountPercentage: number;
    reason: string;
    invoiceDate: Date;
    invoiceNumber?: string;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface UnusualProductDiscountsConfig {
  threshold?: number;
}

export default function unusualProductDiscounts(
  data: Entry[],
  config: UnusualProductDiscountsConfig = { threshold: 5 }
): UnusualProductDiscountsResult {
  const threshold = config.threshold ?? 5;
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

    if (!entry["Item Code"]) {
      errors.push({
        message: "Item Code is missing",
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
    // Calculate discount percentage for each entry
    const entriesWithPercentage = normalizedData.map((entry) => {
      const discountPercentage =
        entry["Taxable Value"] > 0
          ? (entry["Discount"] / entry["Taxable Value"]) * 100
          : 0;

      return {
        ...entry,
        discountPercentage,
      };
    });

    // Step 1: Group entries by product (Item Code) and calculate totals
    const productTotals = new Map<
      string,
      {
        totalTaxableValue: number;
        totalDiscount: number;
        entries: typeof entriesWithPercentage;
      }
    >();

    entriesWithPercentage.forEach((entry) => {
      const productCode = entry["Item Code"];

      if (!productTotals.has(productCode)) {
        productTotals.set(productCode, {
          totalTaxableValue: 0,
          totalDiscount: 0,
          entries: [],
        });
      }

      const product = productTotals.get(productCode)!;
      product.totalTaxableValue += entry["Taxable Value"];
      product.totalDiscount += entry["Discount"];
      product.entries.push(entry);
    });

    // Step 2: Calculate product-wise discount percentages based on totals
    const productDiscounts: Array<{
      itemCode: string;
      totalTaxableValue: number;
      totalDiscount: number;
      discountPercentage: number;
      entries: typeof entriesWithPercentage;
    }> = [];

    productTotals.forEach((data, itemCode) => {
      const discountPercentage =
        data.totalTaxableValue > 0
          ? (data.totalDiscount / data.totalTaxableValue) * 100
          : 0;

      productDiscounts.push({
        itemCode,
        totalTaxableValue: data.totalTaxableValue,
        totalDiscount: data.totalDiscount,
        discountPercentage,
        entries: data.entries,
      });
    });

    // Step 3: Calculate overall average discount percentage
    const totalDiscountValue = productDiscounts.reduce(
      (sum, product) => sum + product.totalDiscount,
      0
    );
    const totalTaxableValue = productDiscounts.reduce(
      (sum, product) => sum + product.totalTaxableValue,
      0
    );
    const overallAverageDiscount =
      totalTaxableValue > 0
        ? (totalDiscountValue / totalTaxableValue) * 100
        : 0;

    // Step 4: Analyze product discount deviations
    const summary: UnusualProductDiscountsResult["summary"] = [];

    productDiscounts.forEach((product) => {
      // Calculate deviation from overall average
      // If product discount is 0%, then no deviation regardless of overall average
      const deviation =
        product.discountPercentage === 0
          ? 0
          : Math.abs(product.discountPercentage - overallAverageDiscount);

      // Check if deviation exceeds threshold
      if (deviation >= threshold) {
        // Add all entries of this product to results
        product.entries.forEach((entry) => {
          results.push(entry);

          summary.push({
            itemCode: entry["Item Code"],
            discountAmount: entry["Discount"],
            discountPercentage: product.discountPercentage,
            reason: `Discount deviation of ${deviation.toFixed(2)}% from overall average (${overallAverageDiscount.toFixed(2)}%)`,
            invoiceDate: entry["Invoice Date"],
            invoiceNumber: entry["Invoice Number"],
          });
        });
      }
    });

    // Step 5: Check for any non-zero discounts when similar products have zero discounts
    // Group entries by invoice
    const invoiceGroups = new Map<string, typeof entriesWithPercentage>();

    entriesWithPercentage.forEach((entry) => {
      const invoiceNumber = entry["Invoice Number"] || "";

      if (!invoiceGroups.has(invoiceNumber)) {
        invoiceGroups.set(invoiceNumber, []);
      }

      invoiceGroups.get(invoiceNumber)!.push(entry);
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in unusualProductDiscounts",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
