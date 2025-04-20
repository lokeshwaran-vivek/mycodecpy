/**
 * Invoice Compliance Test: Sudden Volume Changes
 *
 * Purpose:
 * This test identifies significant changes in sales volume for products between
 * periods. Volume spikes might indicate:
 * - Unusual buying patterns
 * - Channel stuffing
 * - Seasonal variations
 * - Data entry errors
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - Threshold for volume changes
 *    - Period type (month/week)
 * 3. For each product:
 *    - Groups transactions by period
 *    - Calculates volume changes
 *    - Identifies spikes above threshold
 * 4. Returns:
 *    - Full list of volume spike transactions
 *    - Summary with change percentages
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Invoice Date: Transaction date
 * - Invoice Value: Transaction value
 * - Tax Value: Tax amount
 * - Taxable Value: Value of goods before taxes
 * - Item Code: Product identifier
 * - Sale Quantity: Sales quantity
 *
 * Configuration:
 * - threshold: Maximum acceptable volume change percentage
 * - periodType: Type of period to analyze (month/week)
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  formatCustom
} from "../../lib/utils/date-utils";

interface Entry {
  "Invoice Date": Date;
  "Item Code": string;
  "Sale Quantity": number;
  "Invoice Value": number;
  "Tax Value": number;
  "Taxable Value": number;
}

type PeriodType = "month" | "week";

export interface SuddenVolumeSpikeResult {
  results: Entry[];
  summary: {
    itemCode: string;
    previousPeriod: string;
    currentPeriod: string;
    previousVolume: number;
    currentVolume: number;
    percentageChange: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface SuddenVolumeSpikeConfig {
  threshold?: number;
  periodType?: PeriodType;
}

function getMonthKey(date: Date): string {
  return formatCustom(date, "yyyy-MM");
}

function getWeekKey(date: Date): string {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((date.getTime() - firstDayOfYear.getTime()) / 86400000 +
      firstDayOfYear.getDay() +
      1) /
      7,
  );
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

export default function suddenVolumeSpike(
  data: Entry[],
  config: SuddenVolumeSpikeConfig = { threshold: 10, periodType: "month" },
): SuddenVolumeSpikeResult {
  const threshold = config.threshold || 10;
  const periodType = config.periodType || "month";
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
    "Invoice Date": entry["Invoice Date"] ? toDate(entry["Invoice Date"]) : entry["Invoice Date"]
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
    if (typeof entry["Sale Quantity"] !== "number") {
      errors.push({
        message: "Sale Quantity must be a number",
        row: entry,
      });
    }
  }

  try {
    // Group entries by item code and period
    const itemPeriodVolumes = new Map<
      string,
      Map<
        string,
        {
          volume: number;
          entries: Entry[];
        }
      >
    >();

    normalizedData.forEach((entry) => {
      const itemCode = entry["Item Code"];
      const saleQuantity = entry["Sale Quantity"];
      const date = entry["Invoice Date"];

      if (!itemCode || typeof saleQuantity !== "number" || !date) return;

      const periodKey = periodType === "week" ? getWeekKey(date) : getMonthKey(date);

      if (!itemPeriodVolumes.has(itemCode)) {
        itemPeriodVolumes.set(itemCode, new Map());
      }

      const itemPeriods = itemPeriodVolumes.get(itemCode)!;
      if (!itemPeriods.has(periodKey)) {
        itemPeriods.set(periodKey, { volume: 0, entries: [] });
      }

      const periodData = itemPeriods.get(periodKey)!;
      periodData.volume += saleQuantity;
      periodData.entries.push(entry);
    });

    // Compare volumes across periods and find spikes
    const summary: SuddenVolumeSpikeResult["summary"] = [];

    itemPeriodVolumes.forEach((periods, itemCode) => {
      // Sort periods chronologically
      const sortedPeriods = Array.from(periods.entries()).sort(
        ([a], [b]) => a.localeCompare(b)
      );

      // Compare each period with the previous one
      for (let i = 1; i < sortedPeriods.length; i++) {
        const [currentPeriod, currentData] = sortedPeriods[i];
        const [previousPeriod, previousData] = sortedPeriods[i - 1];

        // Calculate percentage change
        const percentageChange =
          ((currentData.volume - previousData.volume) / previousData.volume) * 100;

        // Check if the change exceeds the threshold
        if (percentageChange > threshold || percentageChange < -threshold) {
          results.push(...currentData.entries);
          
          summary.push({
            itemCode,
            previousPeriod,
            currentPeriod,
            previousVolume: previousData.volume,
            currentVolume: currentData.volume,
            percentageChange,
          });
        }
      }
    });

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in suddenVolumeSpike",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
