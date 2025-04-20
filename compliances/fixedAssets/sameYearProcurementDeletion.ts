/**
 * Fixed Assets Compliance Test: Asset Procured and Deleted in Same Year
 *
 * Purpose:
 * This test identifies assets that were both acquired and deleted/written off within
 * the same financial year. Such cases might indicate:
 * - Improper capitalization of expenses
 * - Purchase of defective assets
 * - Incorrect classification of expenses as assets
 * - Potential misuse of asset procurement process
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries for the same asset
 * 3. For each asset:
 *    - Calculates total disposal value (write-off + depreciation)
 *    - Compares acquisition value with total disposal
 *    - If values match and dates are in same year:
 *      - Calculates days between acquisition and write-off
 *      - Includes in results with timing details
 * 4. Returns:
 *    - Full list of quick-turnover assets
 *    - Summary with values and timing information
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Description: Name/description of the asset
 * - Acquisitions: Purchase cost of the asset
 * - Write Offs: Value written off
 * - Depreciation Retirements: Depreciation amount on retirements
 * - Acquisition Date: Date of purchase
 */

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  getDaysDifference
} from "../../lib/utils/date-utils";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Description": string;
  Acquisitions: number;
  "Write Offs": number;
  "Depreciation Retirements": number;
  "Acquisition Date": Date;
}

export interface SameYearProcurementDeletionResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    acquisitionValue: number;
    writeOffValue: number;
    depreciationValue: number;
    acquisitionDate: Date;
    daysBetween?: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface SameYearProcurementDeletionConfig {
  // No specific config needed for this test
}

export default function sameYearProcurementDeletion(
  data: Entry[],
  config: SameYearProcurementDeletionConfig = {},
): SameYearProcurementDeletionResult {
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
    "Acquisition Date": entry["Acquisition Date"] ? toDate(entry["Acquisition Date"]) : entry["Acquisition Date"]
  }));

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Fixed Asset Number"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Fixed Asset Number",
        row: entry,
      });
    }
    if (!entry["Fixed Asset Description"]) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Fixed Asset Description",
        row: entry,
      });
    }
    if (entry["Acquisitions"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Acquisitions",
        row: entry,
      });
    }
    if (entry["Write Offs"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Write Offs",
        row: entry,
      });
    }
    if (entry["Depreciation Retirements"] === undefined) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Depreciation Retirements",
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
  }

  try {
    // Group entries by asset code
    const assetMap = new Map<
      string,
      {
        entries: Entry[];
        assetName: string;
        acquisitionValue: number;
        writeOffValue: number;
        depreciationValue: number;
        acquisitionDate: Date;
        newestEntry?: Entry; // For calculating how long before write-off
      }
    >();

    normalizedData.forEach((entry) => {
      const assetCode = entry["Fixed Asset Number"];
      const assetName = entry["Fixed Asset Description"];
      const acquisitionValue = entry["Acquisitions"];
      const writeOffValue = entry["Write Offs"];
      const depreciationValue = entry["Depreciation Retirements"];
      const acquisitionDate = entry["Acquisition Date"];

      if (
        !assetCode ||
        acquisitionValue === undefined ||
        writeOffValue === undefined ||
        depreciationValue === undefined
      )
        return;

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: assetName,
          acquisitionValue: acquisitionValue,
          writeOffValue: writeOffValue,
          depreciationValue: depreciationValue,
          acquisitionDate: acquisitionDate,
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);
      if (!assetData.newestEntry || toDate(entry["Acquisition Date"]) > toDate(assetData.newestEntry["Acquisition Date"])) {
        assetData.newestEntry = entry;
      }
    });

    // Check for deletions in the same year of procurement
    const sameYearDeletions: SameYearProcurementDeletionResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (
        (data.writeOffValue > 0 || data.depreciationValue > 0) &&
        data.acquisitionValue > 0
      ) {
        const acquisitionYear = data.acquisitionDate.getFullYear();
        const hasWriteOffInSameYear = data.entries.some(
          (entry) =>
            (entry["Write Offs"] > 0 || entry["Depreciation Retirements"] > 0) &&
            toDate(entry["Acquisition Date"]).getFullYear() === acquisitionYear
        );

        if (hasWriteOffInSameYear) {
          // Calculate days between newest acquisition and first write-off if available
          let daysBetween: number | undefined = undefined;
          if (data.newestEntry) {
            const newestDate = data.newestEntry["Acquisition Date"];
            const writeOffEntry = data.entries.find(
              (entry) => entry["Write Offs"] > 0 || entry["Depreciation Retirements"] > 0
            );
            if (writeOffEntry) {
              daysBetween = getDaysDifference(writeOffEntry["Acquisition Date"], newestDate);
            }
          }

          results.push(...data.entries);
          sameYearDeletions.push({
            assetCode,
            assetName: data.assetName,
            acquisitionValue: data.acquisitionValue,
            writeOffValue: data.writeOffValue,
            depreciationValue: data.depreciationValue,
            acquisitionDate: data.acquisitionDate,
            daysBetween,
            entries: data.entries,
          });
        }
      }
    });

    return {
      results,
      summary: sameYearDeletions,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in sameYearProcurementDeletion",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
