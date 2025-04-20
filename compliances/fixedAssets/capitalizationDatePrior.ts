/**
 * Fixed Assets Compliance Test: Capitalization Date Prior to Acquisition
 *
 * Purpose:
 * This test identifies fixed assets where the capitalization date is earlier than the acquisition date,
 * which is logically incorrect as an asset cannot be capitalized before it is acquired.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries for the same asset
 * 3. For each asset:
 *    - Compares capitalization date with acquisition date
 *    - If capitalization date is before acquisition date, flags the asset
 * 4. Returns:
 *    - Full list of problematic entries
 *    - Summary with asset details and days difference between dates
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Classification: Name/description of the asset
 * - Acquisition Date: Date when the asset was acquired
 * - Capitalization Date: Date when the asset was capitalized
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  getDaysDifference,
  isDateBefore
} from "../../lib/utils/date-utils";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Classification": string;
  "Acquisition Date": Date;
  "Put to Use Date": Date;
}

export interface CapitalizationDatePriorResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    acquisitionDate: Date;
    putToUseDate: Date;
    daysDifference: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface CapitalizationDatePriorConfig {
  // No specific config needed for this test
}

export default function capitalizationDatePrior(
  data: Entry[],
  config: CapitalizationDatePriorConfig = {}
): CapitalizationDatePriorResult {
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
    "Acquisition Date": entry["Acquisition Date"] ? toDate(entry["Acquisition Date"]) : entry["Acquisition Date"],
    "Put to Use Date": entry["Put to Use Date"] ? toDate(entry["Put to Use Date"]) : entry["Put to Use Date"]
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Fixed Asset Number"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Fixed Asset Number",
        row: entry,
      });
    }
    if (!entry["Fixed Asset Classification"]) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Fixed Asset Classification",
        row: entry,
      });
    }
    if (!entry["Acquisition Date"]) {
      errors.push({
        message: "Acquisition Date is missing",
        row: entry,
      });
    } else if (!isValidDate(entry["Acquisition Date"])) {
      errors.push({
        message: "Acquisition Date is invalid",
        row: entry,
      });
    }

    if (!entry["Put to Use Date"]) {
      errors.push({
        message: "Put to Use Date is missing",
        row: entry,
      });
    }
    if (!isValidDate(entry["Put to Use Date"])) {
      errors.push({
        message: "Put to Use Date is invalid",
        row: entry,
      });
    }
    
  }

  try {
    // Group entries by asset code
    const assetMap = new Map<
      string,
      {
        entries: Entry[];
        assetName: string;
        acquisitionDate: Date;
        putToUseDate: Date;
      }
    >();

    normalizedData.forEach((entry) => {
      if (!entry["Fixed Asset Number"]) return;

      if (!assetMap.has(entry["Fixed Asset Number"])) {
        assetMap.set(entry["Fixed Asset Number"], {
          entries: [],
          assetName: entry["Fixed Asset Classification"],
          acquisitionDate: entry["Acquisition Date"],
          putToUseDate: entry["Put to Use Date"],
        });
      }

      const assetData = assetMap.get(entry["Fixed Asset Number"])!;
      assetData.entries.push(entry);
    });

    // Find assets where capitalization date is prior to acquisition date
    const invalidAssets: CapitalizationDatePriorResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      const acquisitionDate = data.acquisitionDate;
      const putToUseDate = data.putToUseDate;

      if (isDateBefore(putToUseDate, acquisitionDate)) {
        results.push(...data.entries);
        invalidAssets.push({
          assetCode,
          assetName: data.assetName,
          acquisitionDate: data.acquisitionDate,
          putToUseDate: data.putToUseDate,
          daysDifference: getDaysDifference(acquisitionDate, putToUseDate),
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: invalidAssets,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
