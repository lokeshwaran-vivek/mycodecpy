/**
 * Fixed Assets Compliance Test: Additions to Existing Assets
 *
 * Purpose:
 * This test identifies fixed assets that have both an opening gross value and additions
 * during the period. This helps track significant modifications or improvements to
 * existing assets and ensures proper capitalization of subsequent expenditure.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries for the same asset
 * 3. For each asset:
 *    - Checks if opening gross value is greater than 0
 *    - Checks if additions value is greater than 0
 *    - If both conditions are met, includes in results
 * 4. Returns:
 *    - Full list of assets with additions
 *    - Summary with opening values and addition amounts
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Description: Name/description of the asset
 * - Opening Book Value: Opening balance of the asset
 * - Acquisitions: Value of additions during the period
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Description": string;
  "Opening Book Value": number;
  Acquisitions: number;
}

export interface ExistingAssetAdditionsResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    openingGrossValue: number;
    additions: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface ExistingAssetAdditionsConfig {
  // No specific config needed for this test
}

export default function existingAssetAdditions(
  data: Entry[],
  config: ExistingAssetAdditionsConfig = {},
): ExistingAssetAdditionsResult {
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
    if (!entry["Fixed Asset Description"]) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Fixed Asset Description",
        row: entry,
      });
    }
    if (entry["Opening Book Value"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Opening Book Value",
        row: entry,
      });
    }
    if (entry["Acquisitions"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Acquisitions",
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
        openingGrossValue: number;
        additions: number;
      }
    >();

    data.forEach((entry) => {
      const assetCode = entry["Fixed Asset Number"];
      const openingGrossValue = entry["Opening Book Value"];
      const additions = entry["Acquisitions"];

      if (
        !assetCode ||
        openingGrossValue === undefined ||
        additions === undefined
      )
        return;

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: entry["Fixed Asset Description"],
          openingGrossValue: openingGrossValue,
          additions: additions,
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);
    });

    // Find assets with both opening value and additions
    const assetsWithAdditions: ExistingAssetAdditionsResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.openingGrossValue > 0 && data.additions > 0) {
        results.push(...data.entries);
        assetsWithAdditions.push({
          assetCode,
          assetName: data.assetName,
          openingGrossValue: data.openingGrossValue,
          additions: data.additions,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: assetsWithAdditions,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in existingAssetAdditions",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
