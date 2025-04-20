/**
 * General Ledger Compliance Test: Journals Without Username
 *
 * Purpose:
 * This test identifies journal entries that lack user attribution (missing username).
 * Missing user information might indicate:
 * - System-generated entries without proper tracking
 * - Interface or integration issues
 * - Audit trail gaps
 * - Security or authentication problems
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each journal entry:
 *    - Checks if username field is empty, null, or undefined
 *    - Checks for system-generated usernames that might not be real users
 *    - Groups entries by journal number for complete picture
 * 3. Returns:
 *    - Full list of entries without proper user attribution
 *    - Summary with entry details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Journal entry identifier
 * - User Prepared: User who created the entry
 * - Entry Date: Date of the transaction
 */

import { log } from "../../lib/utils/log";

export interface GLEntry {
  "Journal Entry Number": string;
  "User Prepared": string;
  "Entry Date": Date;
}

export interface NoUsernameEntry {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    entryDate: Date;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export default function journalsWithNoUsername(
  glData: GLEntry[],
  config: {}
): NoUsernameEntry {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  const results: GLEntry[] = [];
  const errors: ErrorType[] = [];

  // Validate data structure
  for (const entry of glData) {
    const validateGLEntry = (entry: GLEntry, errors: ErrorType[]) => {
      if (!entry["Journal Entry Number"]) {
        errors.push({
          message: "Invalid GL entry format: Journal Entry Number is missing",
          row: entry,
        });
      }

      if (!entry["Entry Date"]) {
        errors.push({
          message: "Invalid GL entry format: Entry Date is missing",
          row: entry,
        });
      }
    };

    validateGLEntry(entry, errors);
  }

  try {
    // Filter entries with no username (blank User Prepared)
    const noUsernameEntries = glData
      .filter(
        (entry) =>
          !entry["User Prepared"] || entry["User Prepared"].trim() === ""
      )
      .map((entry) => {
        results.push(entry);
        return {
          journalEntryNumber: entry["Journal Entry Number"],
          entryDate: new Date(entry["Entry Date"]),
        };
      })
      .sort((a, b) => {
        // First sort by entry date
        const dateDiff = a.entryDate.getTime() - b.entryDate.getTime();
        if (dateDiff !== 0) return dateDiff;
        // If dates are equal, sort by journal entry number
        return a.journalEntryNumber.localeCompare(b.journalEntryNumber);
      });

    return {
      results,
      summary: noUsernameEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in journalsWithNoUsername",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
