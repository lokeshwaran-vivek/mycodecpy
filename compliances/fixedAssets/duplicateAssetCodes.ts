/**
 * Fixed Assets Compliance Test: Duplicate Asset Codes
 *
 * Purpose:
 * This test identifies instances where the same asset code appears multiple times
 * in the fixed assets register. Asset codes should be unique identifiers, and
 * duplicates might indicate:
 * - Data entry errors
 * - System migration issues
 * - Improper asset tracking
 * - Potential double-counting of assets
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries
 * 3. For each asset code:
 *    - Counts number of occurrences
 *    - If more than one occurrence exists:
 *      - Includes in results with occurrence count
 * 4. Returns:
 *    - Full list of duplicate entries
 *    - Summary sorted by number of occurrences (descending)
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Classification: Name/description of the asset
 * - Fixed Asset Description: Description of the asset
 */

import { removePrecedingZeros } from "@/lib/utils";
import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Classification": string;
  "Fixed Asset Description": string;
}

export interface DuplicateAssetCodesResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    occurrences: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DuplicateAssetCodesConfig {
  // No specific config needed for this test
}

export default function duplicateAssetCodes(
  data: Entry[],
  config: DuplicateAssetCodesConfig = {},
): DuplicateAssetCodesResult {
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
    if (!entry["Fixed Asset Description"]) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Fixed Asset Description",
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
      }
    >();

    data.forEach((entry) => {
      if (!entry["Fixed Asset Number"]) return;

      const assetCode = removePrecedingZeros(entry["Fixed Asset Number"]);

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: entry["Fixed Asset Description"],
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);
    });

    // Find duplicate asset codes
    const duplicateAssets: DuplicateAssetCodesResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.entries.length > 1) {
        results.push(...data.entries);
        duplicateAssets.push({
          assetCode,
          assetName: data.assetName,
          occurrences: data.entries.length,
          entries: data.entries,
        });
      }
    });

    // Sort by number of occurrences in descending order
    duplicateAssets.sort((a, b) => b.occurrences - a.occurrences);

    return {
      results,
      summary: duplicateAssets,
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
