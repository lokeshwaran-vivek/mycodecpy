/**
 * Purchase Compliance Test: Sudden Purchase Volume Spike Detection
 *
 * Purpose:
 * This test identifies sudden increases in purchase volume (Units) for the same item compared to the immediately preceding period (month or week),
 * based on a configurable percentage threshold. It helps detect:
 * - Unusual spikes in demand or procurement.
 * - Potential inventory mismanagement or forecasting errors.
 * - Overstocking or unnecessary purchases.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present based on Purchase Register template.
 * 2. Groups purchase entries by 'Item Code' and then by the selected time period (month or week).
 * 3. Calculates the total 'Units' purchased for each item in each period.
 * 4. Compares the total volume of the current period with the volume of the immediately preceding period for the same 'Item Code'.
 * 5. Calculates the percentage change in volume between consecutive periods.
 * 6. Flags entries where the percentage volume increase exceeds the defined threshold.
 * 7. Returns:
 *    - Full list of entries identified as having a sudden volume spike.
 *    - Summary of each volume spike incident, including item details, periods, volumes, and percentage change.
 *    - Any validation errors encountered during data processing.
 *
 * Required Fields (based on Purchase Register Template):
 * - Purchase Reference Number: Unique identifier for each purchase transaction.
 * - Purchase Reference Date: Date of the purchase transaction.
 * - Vendor Number: Unique code assigned to the vendor.
 * - Vendor Name: Name of the vendor.
 * - Item Code: Unique code assigned to each item purchased.
 * - Item Name: Name or description of the item purchased.
 * - Units: Quantity of items purchased.
 * - Value: Total value of the purchase (Units * Rate).
 */
import { log } from "../../lib/utils/log";
import { toDate, formatCustom, isValidDate } from "../../lib/utils/date-utils";

interface Entry {
  "Purchase Reference Number": string;
  "Purchase Reference Date": Date;
  "Vendor Number": string;
  "Vendor Name": string;
  "Item Code": string;
  "Item Name": string;
  Units: number;
  Value: number;
}

type PeriodType = "month" | "week";

export interface SuddenPurchaseVolumeSpikeResult {
  results: Entry[];
  summary: {
    itemCode: string;
    previousPeriod: string;
    currentPeriod: string;
    previousVolume: number;
    currentVolume: number;
    percentageChange: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface SuddenPurchaseVolumeSpikeConfig {
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
      7
  );
  return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

function groupByPeriod(
  data: Entry[],
  periodType: PeriodType
): Map<
  string,
  Map<
    string,
    {
      volume: number;
      entries: Entry[];
    }
  >
> {
  const itemVolumes = new Map<
    string,
    Map<
      string,
      {
        volume: number;
        entries: Entry[];
      }
    >
  >();

  data.forEach((entry) => {
    const itemCode = entry["Item Code"];
    const units = entry["Units"];
    const purchaseReferenceDate = entry["Purchase Reference Date"];

    if (!itemCode || typeof units !== "number" || !purchaseReferenceDate) {
      return;
    }

    const date = toDate(purchaseReferenceDate);
    const periodKey =
      periodType === "week" ? getWeekKey(date) : getMonthKey(date);

    if (!itemVolumes.has(itemCode)) {
      itemVolumes.set(itemCode, new Map());
    }

    const itemPeriods = itemVolumes.get(itemCode)!;
    if (!itemPeriods.has(periodKey)) {
      itemPeriods.set(periodKey, { volume: 0, entries: [] });
    }

    const periodData = itemPeriods.get(periodKey)!;
    periodData.volume += units;
    periodData.entries.push(entry);
  });

  return itemVolumes;
}

function comparePeriodVolumes(
  itemVolumes: Map<
    string,
    Map<
      string,
      {
        volume: number;
        entries: Entry[];
      }
    >
  >,
  threshold: number
): { summary: SuddenPurchaseVolumeSpikeResult["summary"]; results: Entry[] } {
  const summary: SuddenPurchaseVolumeSpikeResult["summary"] = [];
  const results: Entry[] = [];

  itemVolumes.forEach((periods, itemCode) => {
    const sortedPeriods = Array.from(periods.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    for (let i = 1; i < sortedPeriods.length; i++) {
      const [currentPeriod, currentData] = sortedPeriods[i];
      const [previousPeriod, previousData] = sortedPeriods[i - 1];

      if (!previousData) continue; // Skip if no previous period to compare

      const percentageChange =
        ((currentData.volume - previousData.volume) / previousData.volume) *
        100;

      if (
        Math.abs(percentageChange) >= threshold ||
        percentageChange <= -threshold
      ) {
        results.push(...currentData.entries);
        summary.push({
          itemCode,
          previousPeriod,
          currentPeriod,
          previousVolume: previousData.volume,
          currentVolume: currentData.volume,
          percentageChange,
          entries: currentData.entries,
        });
      }
    }
  });

  return { summary, results };
}

export default function suddenPurchaseVolumeSpike(
  data: Entry[],
  config: SuddenPurchaseVolumeSpikeConfig = {
    threshold: 10,
    periodType: "month",
  }
): SuddenPurchaseVolumeSpikeResult {
  const threshold = config.threshold || 10;
  const periodType = config.periodType || "month";
  const errors: ErrorType[] = [];
  let results: Entry[] = [];
  let summary: SuddenPurchaseVolumeSpikeResult["summary"] = [];

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({ message: "Data must be an array", row: data as any });
    return { results: [], summary: [], errors };
  }

  // Normalize data - ensure dates are properly converted
  const normalizedData = data.map((entry) => ({
    ...entry,
    "Purchase Reference Date": entry["Purchase Reference Date"]
      ? toDate(entry["Purchase Reference Date"])
      : entry["Purchase Reference Date"],
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
      errors.push({ message: "Vendor Number is missing", row: entry });
    }
    if (!entry["Vendor Name"]) {
      errors.push({ message: "Vendor Name is missing", row: entry });
    }
    if (!entry["Item Code"]) {
      errors.push({ message: "Item Code is missing", row: entry });
    }
    if (!entry["Item Name"]) {
      errors.push({ message: "Item Name is missing", row: entry });
    }
    if (typeof entry["Units"] !== "number") {
      errors.push({ message: "Units must be a number", row: entry });
    }
    if (typeof entry["Value"] !== "number") {
      errors.push({ message: "Value must be a number", row: entry });
    }
  }

  try {
    // Group entries by item code and period
    const itemVolumes = groupByPeriod(normalizedData, periodType);

    // Find volume spikes
    const comparisonResult = comparePeriodVolumes(itemVolumes, threshold);
    summary = comparisonResult.summary;
    results = comparisonResult.results;

    return {
      results,
      summary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in suddenPurchaseVolumeSpike",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
