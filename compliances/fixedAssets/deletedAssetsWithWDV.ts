/**
 * Fixed Assets Compliance Test: Deleted Assets with Written Down Value (WDV)
 *
 * Purpose:
 * This test identifies fixed assets that have been deleted/disposed of but still show
 * a closing book value (Written Down Value) greater than 0. This indicates potential
 * incomplete disposal entries or incorrect accounting of asset disposals.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries for the same asset
 * 3. For each asset:
 *    - Checks if deletion value is greater than 0 (asset is deleted)
 *    - Checks if closing book value is greater than 0
 *    - If both conditions are true, flags potential issue
 * 4. Returns:
 *    - Full list of problematic entries
 *    - Summary with closing values and deletion amounts
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Classification: Name/description of the asset
 * - Closing Book Value: Written Down Value at period end
 * - Retirements: Value of deletions/disposals
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Classification": string;
  "Closing Book Value": number;
  Retirements: number;
}

export interface DeletedAssetsWithWDVResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    closingBookValue: number;
    deletionValue: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DeletedAssetsWithWDVConfig {
  // No specific config needed for this test
}

export default function deletedAssetsWithWDV(
  data: Entry[],
  config: DeletedAssetsWithWDVConfig = {},
): DeletedAssetsWithWDVResult {
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

  // Validate data structure
  for (const entry of data) {
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
    if (entry["Closing Book Value"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Closing Book Value",
        row: entry,
      });
    }
    if (entry["Retirements"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Retirements",
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
        closingBookValue: number;
        deletionValue: number;
      }
    >();

    data.forEach((entry) => {
      if (
        !entry["Fixed Asset Number"] ||
        entry["Closing Book Value"] === undefined ||
        entry["Retirements"] === undefined
      )
        return;

      if (!assetMap.has(entry["Fixed Asset Number"])) {
        assetMap.set(entry["Fixed Asset Number"], {
          entries: [],
          assetName: entry["Fixed Asset Classification"],
          closingBookValue: entry["Closing Book Value"],
          deletionValue: entry["Retirements"],
        });
      }

      const assetData = assetMap.get(entry["Fixed Asset Number"])!;
      assetData.entries.push(entry);
    });

    // Find deleted assets with remaining WDV
    const deletedAssetsWithWDV: DeletedAssetsWithWDVResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.deletionValue > 0 && data.closingBookValue > 0) {
        results.push(...data.entries);
        deletedAssetsWithWDV.push({
          assetCode,
          assetName: data.assetName,
          closingBookValue: data.closingBookValue,
          deletionValue: data.deletionValue,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: deletedAssetsWithWDV,
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
