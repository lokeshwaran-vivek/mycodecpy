/**
 * Fixed Assets Compliance Test: Low-value Items Capitalized
 *
 * Purpose:
 * This test identifies fixed assets that have been capitalized despite having a low gross value,
 * which might be below the organization's capitalization threshold. This helps ensure proper
 * classification of expenses vs. capital items.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - Value threshold (default: INR 25,000)
 *    - Maximum assets to report (default: 5)
 *    - Number of recent transactions to show (default: 5)
 * 3. Groups entries by asset code to handle multiple entries for the same asset
 * 4. For each asset:
 *    - Checks if gross value is below threshold
 *    - Sorts transactions by date to get most recent ones
 * 5. Returns:
 *    - Full list of problematic entries
 *    - Summary with asset details and recent transactions
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Description: Name/description of the asset
 * - Acquisitions: Total value of the asset
 * - Acquisition Date: Date of the transaction
 *
 * Configuration:
 * - valueThreshold: Minimum value for capitalization
 * - maxAssets: Maximum number of assets to report
 * - recentTransactionsCount: Number of recent transactions to include
 */

// 

import { log } from "../../lib/utils/log";
import {
  toDate,
  isValidDate,
  isDateAfter
} from "../../lib/utils/date-utils";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Description": string;
  Acquisitions: number;
  "Acquisition Date": Date;
}

export interface LowValueCapitalizationResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    grossValue: number;
    recentTransactions: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface LowValueCapitalizationConfig {
  valueThreshold?: number;
  maxAssets?: number;
  recentTransactionsCount?: number;
}

export default function lowValueCapitalization(
  data: Entry[],
  config: LowValueCapitalizationConfig = {},
): LowValueCapitalizationResult {
  const errors: ErrorType[] = [];
  const results: Entry[] = [];

  // Set default configuration values
  const valueThreshold = config.valueThreshold || 25000;
  const maxAssets = config.maxAssets || 5;
  const recentTransactionsCount = config.recentTransactionsCount || 5;

  // Normalize data - ensure dates are properly converted
  const normalizedData = data.map(entry => ({
    ...entry,
    "Acquisition Date": entry["Acquisition Date"] ? toDate(entry["Acquisition Date"]) : entry["Acquisition Date"]
  }));

  // Input validation
  if (!Array.isArray(normalizedData)) {
    errors.push({
      message: "Data must be an array",
      row: normalizedData as any,
    });
    return { results, summary: [], errors };
  }

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
        grossValue: number;
      }
    >();

    normalizedData.forEach((entry) => {
      const assetCode = entry["Fixed Asset Number"];
      const grossValue = entry["Acquisitions"];
      if (!assetCode || grossValue === undefined) return;

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: entry["Fixed Asset Description"],
          grossValue: grossValue,
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);
    });

    // Find low-value capitalized items
    const lowValueAssets: LowValueCapitalizationResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.grossValue > 0 && data.grossValue < valueThreshold) {
        // Sort entries by transaction date in descending order
        const sortedEntries = data.entries.sort(
          (a, b) => isDateAfter(a["Acquisition Date"], b["Acquisition Date"]) ? -1 : 1
        );

        results.push(...sortedEntries);
        lowValueAssets.push({
          assetCode,
          assetName: data.assetName,
          grossValue: data.grossValue,
          recentTransactions: sortedEntries.slice(0, recentTransactionsCount),
        });
      }
    });

    // Sort low-value assets by gross value in ascending order and limit to maxAssets
    lowValueAssets.sort((a, b) => a.grossValue - b.grossValue);
    const limitedAssets = lowValueAssets.slice(0, maxAssets);

    return {
      results: results.filter((entry) =>
        limitedAssets.some(
          (asset) => asset.assetCode === entry["Fixed Asset Number"],
        ),
      ),
      summary: limitedAssets,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in lowValueCapitalization",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
