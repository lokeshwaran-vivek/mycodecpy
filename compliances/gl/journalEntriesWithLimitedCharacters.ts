/**
 * General Ledger Compliance Test: Limited Character Entries
 *
 * Purpose:
 * This test identifies journal entries with insufficient descriptions (too few characters).
 * Limited descriptions might indicate:
 * - Inadequate documentation of transactions
 * - Rushed or careless data entry
 * - Attempts to obscure transaction nature
 * - System interface truncation issues
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable minimum character threshold (default: 10)
 * 3. For each journal entry:
 *    - Measures description length after trimming whitespace
 *    - If length is below threshold, flags the entry
 *    - Groups entries by journal number for complete picture
 * 4. Returns:
 *    - Full list of entries with limited descriptions
 *    - Summary with character counts
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - journalNumber: Journal entry identifier
 * - description: Transaction description/narration
 *
 * Configuration:
 * - minimumCharacters: Minimum required description length
 */

import { log } from "../../lib/utils/log";

interface GLEntry {
  "Journal Entry Number": string;
  "Journal Description": string;
}

export interface LimitedCharactersResult {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    description: string;
    characterCount: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface LimitedCharactersConfig {
  minimumCharacters: number;
}

export default function journalEntriesWithLimitedCharacters(
  glData: GLEntry[],
  config: LimitedCharactersConfig = { minimumCharacters: 5 },
): LimitedCharactersResult {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  if (config.minimumCharacters <= 0) {
    throw new Error("minimumCharacters must be a positive number");
  }

  const results: GLEntry[] = [];
  const errors: ErrorType[] = [];

  // Validate data structure
  for (const entry of glData) {
    const validateGLEntry = (entry: GLEntry, errors: ErrorType[]) => {
      if (!entry["Journal Entry Number"]) {
        errors.push({
          message:
            "Invalid GL entry format: Each entry must contain Journal Entry Number and Journal Description",
          row: entry,
        });
      }
      if (entry["Journal Description"] === undefined) {
        errors.push({
          message:
            "Invalid GL entry format: Each entry must contain Journal Entry Number and Journal Description",
          row: entry,
        });
      }
    };

    validateGLEntry(entry, errors);
  }

  try {
    // Filter and map entries with limited characters
    const limitedCharacterEntries = glData
      .map((entry) => {
        return {
          journalEntryNumber: entry["Journal Entry Number"],
          description: entry["Journal Description"],
          characterCount: entry["Journal Description"].trim().length,
        };
      })
      .filter((entry) => {
        if (entry.characterCount <= config.minimumCharacters) {
          results.push(
            ...glData.filter(
              (item) =>
                item["Journal Entry Number"] === entry.journalEntryNumber,
            ),
          );
        }
        return entry.characterCount <= config.minimumCharacters;
      })
      .sort((a, b) => {
        // First sort by character count
        const countDiff = a.characterCount - b.characterCount;
        if (countDiff !== 0) return countDiff;
        // If counts are equal, sort by journal entry number
        return a.journalEntryNumber.localeCompare(b.journalEntryNumber);
      });

    return {
      results,
      summary: limitedCharacterEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message:
        "Error processing GL data in journalEntriesWithLimitedCharacters",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
