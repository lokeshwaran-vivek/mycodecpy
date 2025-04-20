/**
 * General Ledger Compliance Test: Keyword Detection in Journals
 *
 * Purpose:
 * This test searches for specific keywords in journal entry descriptions that might
 * indicate unusual, sensitive, or high-risk transactions. Keywords might identify:
 * - Error corrections or adjustments
 * - Personal or unauthorized expenses
 * - Management override entries
 * - Non-standard transactions
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - List of keywords to search for
 *    - Case sensitivity option
 * 3. Default keywords include:
 *    - adjustment, correction, error, reverse
 *    - fraud, bribe
 *    - instruction of MD, MD family
 *    - personal trip, secret
 * 4. For each journal entry:
 *    - Searches description for keywords
 *    - If matches found, records which keywords matched
 * 5. Returns:
 *    - Full list of matching entries
 *    - Summary with matched keywords
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Journal entry identifier
 * - Journal Description: Transaction description/narration
 * - Entry Date: Date of the transaction
 * - User Prepared: User who created the entry
 *
 * Configuration:
 * - keywords: Array of keywords to search for
 * - caseSensitive: Boolean for case-sensitive search
 */

import { log } from "../../lib/utils/log";

export interface GLEntry {
  "Journal Entry Number": string;
  "Journal Description": string;
  "Entry Date": Date;
  "User Prepared": string;
}

export interface KeywordEntry {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    description: string;
    entryDate: Date;
    userPrepared: string;
    matchedKeywords: string[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface KeywordsConfig {
  keywords: string[];
  caseSensitive?: boolean;
}

const DEFAULT_KEYWORDS = [
  "Fraud",
  "Bribe",
  "instruction of MD",
  "MD family",
  "Personal trip",
  "Secret",
];

export default function journalsContainingKeywords(
  glData: GLEntry[],
  config: KeywordsConfig = { keywords: DEFAULT_KEYWORDS, caseSensitive: false },
): KeywordEntry {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  if (!Array.isArray(config.keywords) || config.keywords.length === 0) {
    throw new Error("keywords must be a non-empty array");
  }

  const results: GLEntry[] = [];
  const errors: ErrorType[] = [];

  // Validate data structure
  for (const entry of glData) {
    if (!entry["Journal Entry Number"]) {
      errors.push({
        message: "Invalid GL entry format: Journal Entry Number is missing",
        row: entry,
      });
    }
    if (!entry["Journal Description"]) {
      errors.push({
        message: "Invalid GL entry format: Journal Description is missing",
        row: entry,
      });
    }
    if (!entry["Entry Date"]) {
      errors.push({
        message: "Invalid GL entry format: Entry Date is missing",
        row: entry,
      });
    }
  }

  try {
    // Prepare keywords for search
    const searchKeywords = config.caseSensitive
      ? config.keywords
      : config.keywords.map((k) => k.toLowerCase());

    // Filter entries containing keywords
    const keywordEntries = glData
      .map((entry) => {
        const description = config.caseSensitive
          ? entry["Journal Description"]
          : entry["Journal Description"].toLowerCase();

        const matches = searchKeywords.filter((keyword) =>
          description.includes(keyword),
        );

        if (matches.length === 0) return null;

        return {
          journalEntryNumber: entry["Journal Entry Number"],
          description: entry["Journal Description"],
          entryDate: new Date(entry["Entry Date"]),
          userPrepared: entry["User Prepared"],
          matchedKeywords: config.caseSensitive
            ? matches
            : matches.map((m) => config.keywords[searchKeywords.indexOf(m)]),
        };
      })
      .filter((entry) => entry !== null)
      .map((entry) => {
        results.push(
          glData.find(
            (item) => item["Journal Entry Number"] === entry.journalEntryNumber,
          )!,
        );
        return entry;
      })
      .sort((a, b) => {
        // First sort by entry date
        const dateDiff = a.entryDate.getTime() - b.entryDate.getTime();
        if (dateDiff !== 0) return dateDiff;
        // If dates are equal, sort by journal entry number
        const numA = parseInt(a.journalEntryNumber.replace(/\D/g, ""));
        const numB = parseInt(b.journalEntryNumber.replace(/\D/g, ""));
        return numA - numB;
      });

    return {
      results,
      summary: keywordEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in journalsContainingKeywords",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
