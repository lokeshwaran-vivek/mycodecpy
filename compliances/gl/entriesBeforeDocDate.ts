/**
 * General Ledger Compliance Test: Entries Before Document Date
 *
 * Purpose:
 * This test identifies journal entries where the recording date is earlier than
 * the document date. Such timing discrepancies might indicate:
 * - Backdated transactions
 * - Document date manipulation
 * - Improper period-end adjustments
 * - System date/time configuration issues
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each journal entry:
 *    - Compares transaction recording date with document date
 *    - If recording date is earlier, flags the entry
 *    - Calculates days difference between dates
 * 3. Groups entries by journal number for complete picture
 * 4. Returns:
 *    - Full list of entries with date discrepancies
 *    - Summary with timing details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Journal entry identifier
 * - Document Date: Date on the source document
 * - Entry Date: Date when entry was recorded
 */

import { log } from "../../lib/utils/log";

interface GLJournalEntry {
  "Journal Entry Number": string;
  "Entry Date": Date;
  "Document Date": Date;
  [key: string]: any; // Allow other fields from GL dump
}

interface DateViolation {
  results: GLJournalEntry[];
  summary: GLJournalEntry[];
  errors: ErrorType[];
}
type ErrorType = {
  message: string;
  row: GLJournalEntry;
};

export default function findEntriesBeforeDocDate(
  entries: GLJournalEntry[],
): DateViolation {
  // Validate input structure
  if (!Array.isArray(entries)) {
    throw new Error("Invalid input: Expected array of journal entries");
  }

  const results: GLJournalEntry[] = [];
  const errors: ErrorType[] = [];

  const violations: GLJournalEntry[] = [];

  try {
    for (const entry of entries) {
      // Validate required fields
      if (!entry["Journal Entry Number"] || !entry["Entry Date"]) {
        errors.push({
          message:
            "Missing required fields in journal entry: Journal Entry Number, Entry Date",
          row: entry,
        });
        continue; // Skip to the next entry if required fields are missing
      }

      // Document Date is optional, but if present, validate it
      let docDate: Date | undefined;
      if (entry["Document Date"]) {
        docDate =
          entry["Document Date"] instanceof Date
            ? entry["Document Date"]
            : new Date(entry["Document Date"]);

        if (isNaN(docDate.getTime())) {
          errors.push({
            message: "Invalid date format for Document Date in journal entry",
            row: entry,
          });
          continue; // Skip to the next entry if Document Date is invalid
        }
      }

      const entryDate =
        entry["Entry Date"] instanceof Date
          ? entry["Entry Date"]
          : new Date(entry["Entry Date"]);

      if (isNaN(entryDate.getTime())) {
        errors.push({
          message: "Invalid date format for Entry Date in journal entry",
          row: entry,
        });
        continue; // Skip to the next entry if Entry Date is invalid
      }

      // Check if entry date is prior to document date, if document date is present
      if (docDate && entryDate < docDate) {
        results.push(entry);
        violations.push({
          "Journal Entry Number": entry["Journal Entry Number"],
          "Entry Date": entryDate,
          "Document Date": docDate,
        });
      }
    }

    // Group violations by journal entry number and keep the earliest occurrence
    const groupedViolations = Array.from(
      violations
        .reduce((acc, violation) => {
          const key = violation["Journal Entry Number"];
          const existing = acc.get(key);

          // Keep only the earliest dated violation per journal entry
          if (!existing || violation["Entry Date"] < existing["Entry Date"]) {
            acc.set(key, violation);
          }
          return acc;
        }, new Map<string, GLJournalEntry>())
        .values(),
    );

    return {
      results,
      summary: groupedViolations,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in findEntriesBeforeDocDate",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
