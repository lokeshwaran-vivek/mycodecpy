/**
 * Fixed Assets Compliance Test: Blank Asset Descriptions
 *
 * Purpose:
 * This test identifies fixed assets that have missing or blank descriptions/narrations.
 * Proper asset descriptions are crucial for asset tracking, auditing, and compliance.
 * Missing descriptions can lead to difficulties in asset identification and management.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset code to handle multiple entries for the same asset
 * 3. For each asset:
 *    - Checks if description is undefined, null, empty, or only whitespace
 *    - If description is missing/blank, includes in results
 * 4. Returns:
 *    - Full list of entries with missing descriptions
 *    - Summary grouped by asset code
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Classification: Name/description of the asset
 * - Fixed Asset Description: Detailed description/narration of the asset
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Classification": string;
  "Fixed Asset Description": string;
}

export interface BlankNarrationsResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface BlankNarrationsConfig {
  // No specific config needed for this test
}

export default function blankNarrations(
  data: Entry[],
  config: BlankNarrationsConfig = {}
): BlankNarrationsResult {
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
    if (entry["Fixed Asset Description"] === undefined) {
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

      if (!assetMap.has(entry["Fixed Asset Number"])) {
        assetMap.set(entry["Fixed Asset Number"], {
          entries: [],
          assetName: entry["Fixed Asset Classification"],
        });
      }

      const assetData = assetMap.get(entry["Fixed Asset Number"])!;
      assetData.entries.push(entry);
    });

    // Find assets with blank descriptions
    const blankDescriptionAssets: BlankNarrationsResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      // Track entries with blank descriptions
      const entriesWithBlankDescription: Entry[] = [];
      
      data.entries.forEach((entry) => {
        const isDescriptionBlank = !entry["Fixed Asset Description"]?.trim();
        if (isDescriptionBlank) {
          // Only add entries that actually have blank descriptions
          entriesWithBlankDescription.push(entry);
        }
      });

      if (entriesWithBlankDescription.length > 0) {
        // Only add entries with blank descriptions to results
        results.push(...entriesWithBlankDescription);
        blankDescriptionAssets.push({
          assetCode,
          assetName: data.assetName,
          entries: entriesWithBlankDescription,
        });
      }
    });

    return {
      results,
      summary: blankDescriptionAssets,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in blankNarrations",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
