/**
 * Fixed Assets Compliance Test: Current Year Additions with Prior Year Capitalization
 *
 * Purpose:
 * This test identifies assets that are marked as current year additions but have
 * capitalization dates from the previous financial year. This helps detect potential
 * misclassification of assets or incorrect capitalization dates.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable financial year start date (defaults to April 1st)
 * 3. Groups entries by asset code to handle multiple entries for the same asset
 * 4. For each asset marked as current year addition:
 *    - Compares capitalization date with financial year start
 *    - If capitalization date is before financial year start, flags the asset
 * 5. Returns:
 *    - Full list of problematic entries
 *    - Summary with asset details and days before year start
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Description: Name/description of the asset
 * - Acquisition Date: Date when the asset was acquired
 *
 * Configuration:
 * - financialYearStart: Optional date to specify start of financial year
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  getDaysDifference,
  isDateBefore,
} from "../../lib/utils/date-utils";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Description": string;
  "Acquisition Date": Date;
  "Put to Use Date": Date;
  "Acquisitions": number;
}

export interface PriorYearCapitalizationResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    acquisitionDate: Date;
    daysBeforeYearStart: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface PriorYearCapitalizationConfig {
  financialYearStart?: Date;
}

export default function priorYearCapitalization(
  data: Entry[],
  config: PriorYearCapitalizationConfig = {}
): PriorYearCapitalizationResult {
  // Get financial year start
  let financialYearStart = config.financialYearStart || new Date();

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
  const normalizedData = data.map((entry) => ({
    ...entry,
    "Acquisition Date": entry["Acquisition Date"]
      ? toDate(entry["Acquisition Date"])
      : entry["Acquisition Date"],
    "Put to Use Date": entry["Put to Use Date"]
      ? toDate(entry["Put to Use Date"])
      : entry["Put to Use Date"],
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Fixed Asset Number"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Fixed Asset Number",
        row: entry,
      });
    }
    if (entry["Acquisitions"]) {
      errors.push({
        message: "Acquisitions  is invalid",
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
    } else if (!isValidDate(entry["Put to Use Date"])) {
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
        acquisitions: number;
        putToUseDate: Date;
      }
    >();

    normalizedData.forEach((entry) => {
      const assetCode = entry["Fixed Asset Number"];
      if (!assetCode) return;

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: entry["Fixed Asset Description"],
          acquisitionDate: entry["Acquisition Date"],
          acquisitions: entry["Acquisitions"],
          putToUseDate: entry["Put to Use Date"],
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);
    });

    // Find current year additions with prior year capitalization dates
    const invalidAssets: PriorYearCapitalizationResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.acquisitions > 0) {
        const acquisitionDate = data.acquisitionDate;

        const daysDifference = getDaysDifference(acquisitionDate, financialYearStart);

        if (daysDifference < 0) {
          results.push(...data.entries);
          invalidAssets.push({
            assetCode,
            assetName: data.assetName,
            acquisitionDate,
            daysBeforeYearStart: daysDifference,
            entries: data.entries,
          });
        }
      }
    });

    return {
      results,
      summary: invalidAssets,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in priorYearCapitalization",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
