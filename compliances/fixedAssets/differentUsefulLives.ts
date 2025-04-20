/**
 * Fixed Assets Compliance Test: Different Useful Lives for Same Asset Class
 *
 * Purpose:
 * This test identifies inconsistencies in useful life assignments within the same asset class.
 * Assets of the same class should typically have consistent useful life periods for
 * depreciation. Different useful lives in the same class might indicate incorrect
 * classification or inconsistent depreciation policies.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Groups entries by asset class (not asset code)
 * 3. For each asset class:
 *    - Collects all unique useful life values
 *    - If more than one unique value exists:
 *      - Records all assets in that class
 *      - Lists the different useful life values
 * 4. Returns:
 *    - Full list of assets in affected classes
 *    - Summary showing each class's different useful lives
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Classification: Classification/category of the asset
 * - Useful Life: Expected life of the asset in years
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Classification": string;
  "Useful Life": number;
}

export interface DifferentUsefulLivesResult {
  results: Entry[];
  summary: {
    assetClass: string;
    usefulLives: number[];
    assets: {
      assetCode: string;
      assetName: string;
      usefulLife: number;
    }[];
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DifferentUsefulLivesConfig {
  // No specific config needed for this test
}

export default function differentUsefulLives(
  data: Entry[],
  config: DifferentUsefulLivesConfig = {},
): DifferentUsefulLivesResult {
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
    if (entry["Useful Life"] === undefined) {
      errors.push({
        message: "Invalid entry format: Entry must contain Useful Life",
        row: entry,
      });
    }
  }

  try {
    // Group entries by asset class
    const classMap = new Map<
      string,
      {
        entries: Entry[];
        usefulLives: Set<number>;
        assets: Map<
          string,
          {
            assetName: string;
            usefulLife: number;
          }
        >;
      }
    >();

    data.forEach((entry) => {
      if (
        !entry["Fixed Asset Classification"] ||
        entry["Useful Life"] === undefined
      )
        return;

      if (!classMap.has(entry["Fixed Asset Classification"])) {
        classMap.set(entry["Fixed Asset Classification"], {
          entries: [],
          usefulLives: new Set(),
          assets: new Map(),
        });
      }

      const classData = classMap.get(entry["Fixed Asset Classification"])!;
      classData.entries.push(entry);
      classData.usefulLives.add(entry["Useful Life"]);
      classData.assets.set(entry["Fixed Asset Number"], {
        assetName: entry["Fixed Asset Classification"],
        usefulLife: entry["Useful Life"],
      });
    });

    // Find asset classes with different useful lives
    const classesWithDifferences: DifferentUsefulLivesResult["summary"] = [];

    classMap.forEach((data, assetClass) => {
      if (data.usefulLives.size > 1) {
        results.push(...data.entries);
        classesWithDifferences.push({
          assetClass,
          usefulLives: Array.from(data.usefulLives).sort((a, b) => a - b),
          assets: Array.from(data.assets.entries()).map(
            ([assetCode, info]) => ({
              assetCode,
              assetName: info.assetName,
              usefulLife: info.usefulLife,
            }),
          ),
          entries: data.entries,
        });
      }
    });

    return {
      results,
      summary: classesWithDifferences,
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
