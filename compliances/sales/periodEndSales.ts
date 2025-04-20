/**
 * Invoice Compliance Test: Period End Sales Analysis
 *
 * Purpose:
 * This test analyzes sales patterns in the last few days of each period compared
 * to regular days. Unusual period-end activity might indicate:
 * - Revenue manipulation
 * - Premature revenue recognition
 * - Sales target pressure
 * - Window dressing
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - Number of end days to analyze
 *    - Period type (month/week)
 *    - Significance threshold
 *    - Minimum days required for analysis
 * 3. For each period:
 *    - Identifies period boundaries
 *    - Compares end-period vs regular days
 *    - Calculates statistical variations
 * 4. Returns:
 *    - Full list of period-end transactions
 *    - Summary with pattern analysis
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Date: Transaction date
 * - Invoice Value: Sales amount
 * - Tax Value: Tax amount
 * - Taxable Value: Value of goods before taxes
 *
 * Configuration:
 * - endDays: Number of days at period end to analyze
 * - periodType: Type of period to analyze (month/week)
 * - significanceThreshold: Percentage difference deemed significant
 * - minDaysRequired: Minimum days needed for reliable analysis
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  formatCustom,
  getEndOfMonth,
  getDaysDifference,
  getDatesBetween,
  addDaysToDate,
} from "../../lib/utils/date-utils";

interface Entry {
  "Invoice Date": Date;
  "Invoice Value": number;
  "Taxable Value": number;
}

export interface PeriodSummary {
  period: string;
  endPeriodAverage: number;
  regularDaysAverage: number;
  percentageDifference: number;
  endPeriodDays: number;
  regularDays: number;
  endPeriodCount: number;
  regularCount: number;
  endPeriodTotal: number;
  regularTotal: number;
  standardDeviation?: number;
  zScore?: number;
  isSignificant: boolean;
  /**
   * Per client requirements: Direct ratio of end period average to regular days average
   * expressed as a percentage (endPeriodAverage / regularDaysAverage * 100)
   */
  endToRegularRatio: number;
  /**
   * Ratio of period end sales to total sales for the period
   * expressed as a percentage (endPeriodTotal / (endPeriodTotal + regularTotal) * 100)
   */
  endToTotalRatio: number;
}

export interface PeriodEndSalesResult {
  results: Entry[];
  summary: PeriodSummary[];
  errors: ErrorType[];
  anomalyDetected: boolean;
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export type PeriodType = "month" | "week";

export interface PeriodEndSalesConfig {
  endDays?: number;
  periodType?: PeriodType;
  threshold?: number;
  minDaysRequired?: number;
}

/**
 * Get the last day of a week containing the given date
 * @param date The date in the week
 * @returns The date of the last day of the week (Saturday)
 */
function getEndOfWeek(date: Date): Date {
  const day = date.getDay();
  // Calculate days to add to get to Saturday (6 - current day)
  // If already Saturday (6), add 0 days
  const daysToAdd = day === 6 ? 0 : 6 - day;
  return addDaysToDate(date, daysToAdd);
}

/**
 * Safely get the transaction value from an entry
 */
function getTransactionValue(entry: Entry): number {
  // If Invoice Value is available and valid, use it
  if (
    typeof entry["Invoice Value"] === "number" &&
    !isNaN(entry["Invoice Value"])
  ) {
    return entry["Invoice Value"];
  }

  // Otherwise try to calculate from Taxable Value + Tax Value
  const taxableValue =
    typeof entry["Taxable Value"] === "number" && !isNaN(entry["Taxable Value"])
      ? entry["Taxable Value"]
      : 0;

  return taxableValue;
}

/**
 * Get the end date of a period based on period type
 */
function getPeriodEnd(date: Date, periodType: PeriodType): Date {
  if (periodType === "week") {
    return getEndOfWeek(date);
  }
  return getEndOfMonth(date);
}

/**
 * Format a period key based on period type
 */
function formatPeriodKey(date: Date, periodType: PeriodType): string {
  if (periodType === "week") {
    // Calculate week number
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((date.getTime() - firstDayOfYear.getTime()) / 86400000 +
        firstDayOfYear.getDay() +
        1) /
        7
    );
    // ISO week format: YYYY-Www
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
  }
  // Month format: YYYY-MM
  return formatCustom(date, "yyyy-MM");
}

/**
 * Calculate standard deviation for a set of values
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

export default function periodEndSales(
  data: Entry[],
  config: PeriodEndSalesConfig = {
    endDays: 3,
    periodType: "month",
    threshold: 10,
  }
): PeriodEndSalesResult {
  // Destructure config with defaults
  const {
    endDays = 3,
    periodType = "month",
    threshold = 10,
    minDaysRequired = 5,
  } = config;

  const errors: ErrorType[] = [];
  let results: Entry[] = [];

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors, anomalyDetected: false };
  }

  // Normalize data - ensure dates are properly converted
  const normalizedData = data.map((entry) => ({
    ...entry,
    "Invoice Date": entry["Invoice Date"]
      ? toDate(entry["Invoice Date"])
      : entry["Invoice Date"],
  }));

  // Validate data structure
  const validData: Entry[] = [];
  for (const entry of normalizedData) {
    if (!entry["Invoice Date"]) {
      errors.push({
        message: "Invoice Date is missing",
        row: entry,
      });
      continue;
    }

    if (!isValidDate(entry["Invoice Date"])) {
      errors.push({
        message: "Invoice Date is invalid",
        row: entry,
      });
      continue;
    }

    // Check if we have either Invoice Value or both Tax Value and Taxable Value
    if (
      typeof entry["Taxable Value"] !== "number" ||
      isNaN(entry["Taxable Value"])
    ) {
      errors.push({
        message: "Entry is missing valid transaction values",
        row: entry,
      });
      continue;
    }

    validData.push(entry);
  }

  try {
    // Group entries by period
    const salesByPeriod = new Map<
      string,
      {
        endPeriodSales: Entry[];
        regularSales: Entry[];
        periodEnd: Date;
        dailySalesAmounts: Map<string, number[]>;
      }
    >();

    validData.forEach((entry) => {
      const date = entry["Invoice Date"];
      if (!date) return;

      // Get period string
      const periodKey = formatPeriodKey(date, periodType);

      if (!salesByPeriod.has(periodKey)) {
        // Calculate period end date
        const periodEnd = getPeriodEnd(date, periodType);

        salesByPeriod.set(periodKey, {
          endPeriodSales: [],
          regularSales: [],
          periodEnd,
          dailySalesAmounts: new Map(), // For tracking daily sales for standard deviation
        });
      }

      const periodData = salesByPeriod.get(periodKey)!;

      // Check if the entry is in the end period
      const daysFromPeriodEnd = getDaysDifference(periodData.periodEnd, date);

      // Format date for daily tracking
      const dateKey = formatCustom(date, "yyyy-MM-dd");

      // Track sales amount by day for statistical analysis
      const amount = getTransactionValue(entry);
      if (!periodData.dailySalesAmounts.has(dateKey)) {
        periodData.dailySalesAmounts.set(dateKey, []);
      }
      periodData.dailySalesAmounts.get(dateKey)!.push(amount);

      // Categorize as end period or regular
      // Per client requirement: Use actual last N days with sales data
      if (daysFromPeriodEnd < endDays) {
        periodData.endPeriodSales.push(entry);
      } else {
        periodData.regularSales.push(entry);
      }
    });

    // Calculate statistics for each period
    const summary: PeriodSummary[] = [];
    let anomalyDetected = false;

    salesByPeriod.forEach((periodData, period) => {
      const endPeriodEntries = periodData.endPeriodSales;
      const regularEntries = periodData.regularSales;

      // Calculate unique days with actual sales data
      // Per client requirement: Count actual dates with sales, not calendar days
      const endPeriodDays = new Set([
        ...endPeriodEntries.map((e) =>
          formatCustom(e["Invoice Date"], "yyyy-MM-dd")
        ),
      ]).size;

      const regularDays = new Set([
        ...regularEntries.map((e) =>
          formatCustom(e["Invoice Date"], "yyyy-MM-dd")
        ),
      ]).size;

      // Skip periods with insufficient data
      if (
        endPeriodEntries.length === 0 ||
        regularEntries.length === 0 ||
        regularDays < minDaysRequired
      )
        return;

      // Calculate total sales for each group
      const endPeriodTotal = endPeriodEntries.reduce(
        (sum, entry) => sum + getTransactionValue(entry),
        0
      );

      const regularTotal = regularEntries.reduce(
        (sum, entry) => sum + getTransactionValue(entry),
        0
      );

      // Calculate total sales for the entire period
      const totalSales = endPeriodTotal + regularTotal;

      // Calculate average sales per day - using actual sales days only
      const endPeriodAverage = endPeriodTotal / endPeriodDays;
      const regularDaysAverage = regularTotal / regularDays;

      // Per client requirement: Calculate the direct ratio as a percentage
      const endToRegularRatio = (endPeriodAverage / regularDaysAverage) * 100;

      // Calculate the ratio of end period sales to total sales
      const endToTotalRatio = (endPeriodTotal / totalSales) * 100;

      // Calculate percentage difference (for statistical significance)
      const percentageDifference =
        ((endPeriodAverage - regularDaysAverage) / regularDaysAverage) * 100;

      // Calculate standard deviation of daily sales averages for regular days
      const dailyAverages: number[] = [];

      periodData.dailySalesAmounts.forEach((amounts, dateKey) => {
        // Only include regular days, not end period
        const date = toDate(dateKey);
        const daysFromPeriodEnd = getDaysDifference(periodData.periodEnd, date);

        if (daysFromPeriodEnd >= endDays) {
          const dailyTotal = amounts.reduce((sum, amount) => sum + amount, 0);
          dailyAverages.push(dailyTotal);
        }
      });

      const standardDeviation = calculateStandardDeviation(dailyAverages);

      // Calculate Z-score (how many standard deviations away from the mean)
      const zScore =
        standardDeviation > 0
          ? (endPeriodAverage - regularDaysAverage) / standardDeviation
          : 0;

      // Determine if this is significant
      const isSignificant =
        Math.abs(percentageDifference) > threshold &&
        (standardDeviation > 0 ? Math.abs(zScore) > 1.5 : true);

      // Update anomaly flag
      if (endToTotalRatio > threshold) {
        anomalyDetected = true;

        // Add end period entries to results
        results.push(...endPeriodEntries);
        // Add to summary
        summary.push({
          period,
          endPeriodAverage,
          regularDaysAverage,
          percentageDifference,
          endPeriodDays,
          regularDays,
          endPeriodCount: endPeriodEntries.length,
          regularCount: regularEntries.length,
          endPeriodTotal,
          regularTotal,
          standardDeviation,
          zScore,
          isSignificant,
          endToRegularRatio,
          endToTotalRatio,
        });
      }
    });

    // Sort summary by significance and percentage difference
    summary.sort((a, b) => {
      // First by significance
      if (a.isSignificant !== b.isSignificant) {
        return a.isSignificant ? -1 : 1;
      }
      // Then by absolute percentage difference
      return (
        Math.abs(b.percentageDifference) - Math.abs(a.percentageDifference)
      );
    });

    return {
      results,
      summary,
      errors,
      anomalyDetected,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in periodEndSales",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
