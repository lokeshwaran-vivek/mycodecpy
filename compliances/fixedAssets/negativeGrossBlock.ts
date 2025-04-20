/**
 * Fixed Assets Compliance Test: Negative Gross Block
 *
 * Purpose:
 * This test identifies fixed assets that have a negative gross book value, which is typically
 * incorrect as the gross block (original cost) of an asset should not be negative. This helps
 * detect data entry errors or incorrect accounting entries.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries for the same asset
 * 3. For each asset:
 *    - Checks if gross book value is negative
 *    - If negative, includes in results with full details
 * 4. Returns:
 *    - Full list of problematic entries
 *    - Summary with asset details and negative values
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Description: Name/description of the asset
 * - Opening Book Value: Original cost/value of the asset
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Description": string;
  "Opening Book Value": number;
}

export interface NegativeGrossBlockResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    grossBookValue: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface NegativeGrossBlockConfig {
  // No specific config needed for this test
}

export default function negativeGrossBlock(
  data: Entry[],
  config: NegativeGrossBlockConfig = {},
): NegativeGrossBlockResult {
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
  }

  try {
    // Group entries by asset code
    const assetMap = new Map<
      string,
      {
        entries: Entry[];
        assetName: string;
        grossBookValue: number;
      }
    >();

    data.forEach((entry) => {
      const assetCode = entry["Fixed Asset Number"];
      const grossBookValue = entry["Opening Book Value"];
      const assetName = entry["Fixed Asset Description"];

      if (!assetCode || grossBookValue === undefined) return;

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: assetName,
          grossBookValue: grossBookValue,
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);
    });

    // Find assets with negative gross book value
    const negativeAssets: NegativeGrossBlockResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.grossBookValue < 0) {
        results.push(...data.entries);
        negativeAssets.push({
          assetCode,
          assetName: data.assetName,
          grossBookValue: data.grossBookValue,
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: negativeAssets,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in negativeGrossBlock",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
