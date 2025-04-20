/**
 * Fixed Assets Compliance Test: Narrations with Certain Keywords
 *
 * Purpose:
 * This test identifies fixed assets whose descriptions contain specific keywords that might
 * indicate improper capitalization (e.g., interest, processing fees, transport, insurance).
 * These costs might need to be expensed rather than capitalized depending on accounting policies.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - List of keywords to search for
 *    - Case sensitivity option for search
 * 3. Default keywords include:
 *    - interest
 *    - processing fees
 *    - transport
 *    - insurance
 *    - prepaid
 *    - pre-operative
 * 4. Groups entries by asset code and searches descriptions for keywords
 * 5. Returns:
 *    - Full list of matching entries
 *    - Summary with matched keywords for each asset
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Fixed Asset Number: Unique identifier for the asset
 * - Fixed Asset Classification: Name/description of the asset
 * - Fixed Asset Description: Detailed description/narration of the asset
 *
 * Configuration:
 * - keywords: Array of keywords to search for
 * - caseSensitive: Boolean for case-sensitive search
 */

import { log } from "../../lib/utils/log";

interface Entry {
  "Fixed Asset Number": string;
  "Fixed Asset Classification": string;
  "Fixed Asset Description": string;
}

export interface KeywordNarrationsResult {
  results: Entry[];
  summary: {
    assetCode: string;
    assetName: string;
    matchedKeywords: string[];
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface KeywordNarrationsConfig {
  keywords?: string[];
  caseSensitive?: boolean;
}

export default function keywordNarrations(
  data: Entry[],
  config: KeywordNarrationsConfig = {}
): KeywordNarrationsResult {
  const errors: ErrorType[] = [];
  const results: Entry[] = [];

  // Set default configuration values
  let keywords = config.keywords || [
    "interest",
    "processing fees",
    "transport",
    "insurance",
    "prepaid",
    "pre-operative",
  ];

  // Filter out empty keywords and trim whitespace
  keywords = keywords.filter((k) => k && k.trim() !== "").map((k) => k.trim());
  if (keywords.length === 0) {
    errors.push({
      message: "No valid keywords provided for search",
    });
    return { results, summary: [], errors };
  }

  const caseSensitive = config.caseSensitive || false;

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Validate data structure
  let validData = true;
  for (const entry of data) {
    if (!entry) {
      errors.push({
        message: "Invalid entry: Entry is null or undefined",
      });
      validData = false;
      continue;
    }

    if (!entry["Fixed Asset Number"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Fixed Asset Number",
        row: entry,
      });
      validData = false;
    }
    if (!entry["Fixed Asset Classification"]) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Fixed Asset Classification",
        row: entry,
      });
      validData = false;
    }
    if (!entry["Fixed Asset Description"]) {
      errors.push({
        message:
          "Invalid entry format: Entry must contain Fixed Asset Description",
        row: entry,
      });
      validData = false;
    }
  }

  try {
    // Group entries by asset code
    const assetMap = new Map<
      string,
      {
        entries: Entry[];
        assetName: string;
        matchedKeywords: Set<string>;
      }
    >();

    data.forEach((entry) => {
      // Skip invalid entries
      if (
        !entry ||
        !entry["Fixed Asset Number"] ||
        !entry["Fixed Asset Description"]
      )
        return;

      const assetCode = entry["Fixed Asset Number"];
      const assetDescription = entry["Fixed Asset Description"] || "";
      const assetClassification = entry["Fixed Asset Classification"] || "";

      if (!assetMap.has(assetCode)) {
        assetMap.set(assetCode, {
          entries: [],
          assetName: assetClassification,
          matchedKeywords: new Set(),
        });
      }

      const assetData = assetMap.get(assetCode)!;
      assetData.entries.push(entry);

      // Improved keyword matching
      const description = caseSensitive
        ? assetDescription
        : assetDescription.toLowerCase();

      // Create a word boundary pattern for more accurate keyword matching
      keywords.forEach((keyword) => {
        if (keyword.trim() === "") return; // Skip empty keywords

        const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();

        // Skip keywords that are too short or could cause regex issues
        if (searchKeyword.trim().length < 2) {
          return;
        }

        // Use more precise word boundary matching
        // This ensures "interest" matches "interest" but not "interesting"
        // And ensures multi-word phrases like "processing fees" are matched properly
        let isMatch = false;

        try {
          // For single words, use standard word boundary
          const wordBoundaryPattern = new RegExp(
            `\\b${escapeRegExp(searchKeyword)}\\b`,
            caseSensitive ? "" : "i"
          );
          isMatch = wordBoundaryPattern.test(description);

          if (isMatch) {
            assetData.matchedKeywords.add(keyword);
          }
        } catch (e: unknown) {
          // Log regex errors but continue processing
          if (e instanceof Error) {
            console.error(
              `Error processing keyword "${keyword}": ${e.message}`
            );
          } else {
            console.error(`Unknown error processing keyword "${keyword}"`);
          }
        }
      });
    });

    // Find assets with matching keywords
    const matchingAssets: KeywordNarrationsResult["summary"] = [];

    assetMap.forEach((data, assetCode) => {
      if (data.matchedKeywords.size > 0) {
        // Only add entries that actually matched keywords
        const matchedEntries: Entry[] = [];

        // For each entry in this asset, check if it contains any of the matched keywords
        data.entries.forEach((entry) => {
          const description = caseSensitive
            ? entry["Fixed Asset Description"] || ""
            : (entry["Fixed Asset Description"] || "").toLowerCase();

          // Check if this specific entry matches any of the keywords
          let entryMatches = false;
          for (const keyword of data.matchedKeywords) {
            const searchKeyword = caseSensitive
              ? keyword
              : keyword.toLowerCase();

            try {
              if (searchKeyword.includes(" ")) {
                // For multi-word phrases
                const phrasePattern = new RegExp(
                  searchKeyword
                    .split(/\s+/)
                    .map((word) => {
                      if (word.trim().length < 2) return "";
                      return `\\b${escapeRegExp(word)}\\b`;
                    })
                    .filter(Boolean)
                    .join("[\\s\\-,.;:]+"),
                  caseSensitive ? "" : "i"
                );
                if (phrasePattern.test(description)) {
                  entryMatches = true;
                  break;
                }
              } else {
                // For single words
                const wordBoundaryPattern = new RegExp(
                  `\\b${escapeRegExp(searchKeyword)}\\b`,
                  caseSensitive ? "" : "i"
                );
                if (wordBoundaryPattern.test(description)) {
                  entryMatches = true;
                  break;
                }
              }
            } catch (e: unknown) {
              // Skip problematic patterns
              continue;
            }
          }

          if (entryMatches) {
            matchedEntries.push(entry);
          }
        });

        // Only add entries that actually matched
        results.push(...matchedEntries);

        matchingAssets.push({
          assetCode,
          assetName: data.assetName,
          matchedKeywords: Array.from(data.matchedKeywords),
          entries: matchedEntries, // Only include entries that matched
        });
      }
    });

    return {
      results,
      summary: matchingAssets,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing data in keywordNarrations",
      type: "error",
      data: error,
    });

    // Add the error to the errors array
    if (error instanceof Error) {
      errors.push({
        message: `Error processing data: ${error.message}`,
      });
    } else {
      errors.push({
        message: "Error processing data: An unknown error occurred",
      });
    }

    return {
      results,
      summary: [],
      errors,
    };
  }
}

// Helper function to escape special characters in regular expressions
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
