/**
 * General Ledger Compliance Test: Compound Journal Entries
 *
 * Purpose:
 * This test identifies complex journal entries with multiple line items that exceed
 * a specified threshold. Complex entries might indicate:
 * - Sophisticated financial transactions
 * - Attempts to obscure transaction nature
 * - System-generated adjustment entries
 * - Period-end allocation entries
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable line item threshold (default: 5)
 * 3. For each journal entry:
 *    - Counts number of line items
 *    - If count exceeds threshold, flags the entry
 *    - Groups by journal number for complete picture
 * 4. Returns:
 *    - Full list of complex entries
 *    - Summary with line item counts
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Journal entry identifier
 * - GL Code: General Ledger code
 *
 * Configuration:
 * - threshold: Maximum number of line items before flagging
 */

import { log } from "../../lib/utils/log";

interface GLEntry {
  "Journal Entry Number": string;
  "GL Code": string;
  [key: string]: any;
}

export interface CompoundJournalEntry {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    uniqueGLCodesCount: number;
  }[];
  errors: ErrorType[];
}
type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface CompoundJournalConfig {
  threshold?: number;
}

export default function findCompoundJournalEntries(
  glData: GLEntry[],
  config: CompoundJournalConfig = { threshold: 15 }
): CompoundJournalEntry {
  // Validate input structure
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  const { threshold = 15 } = config;

  if (
    threshold !== undefined &&
    (threshold < 0 || !Number.isInteger(threshold))
  ) {
    throw new Error("Threshold must be a non-negative integer");
  }

  const results: GLEntry[] = [];
  const errors: ErrorType[] = [];

  // Validate data structure and required fields
  for (const entry of glData) {
    if (!entry["Journal Entry Number"]) {
      errors.push({
        message: "Invalid GL entry format: Missing Journal Entry Number",
        row: entry,
      });
    }
    if (!entry["GL Code"]) {
      errors.push({
        message: "Invalid GL entry format: Missing GL Code",
        row: entry,
      });
    }
  }

  try {
    // Group entries by Journal Entry Number and count all GL Codes (including duplicates)
    const journalEntries = new Map<string, GLEntry[]>();
    
    // Group all entries by Journal Entry Number
    glData.forEach(entry => {
      const key = entry["Journal Entry Number"];
      if (!journalEntries.has(key)) {
        journalEntries.set(key, []);
      }
      journalEntries.get(key)?.push(entry);
    });
    
    // Calculate summary with all GL Codes (not just unique ones)
    const compoundJournalEntries = Array.from(journalEntries.entries())
      .map(([journalEntryNumber, entries]) => ({
        journalEntryNumber,
        uniqueGLCodesCount: entries.length, // Count all line items, not just unique GL codes
      }))
      .filter(entry => entry.uniqueGLCodesCount >= threshold)
      .sort((a, b) => {
        // Primary sort by count descending, secondary by journal number
        return (
          b.uniqueGLCodesCount - a.uniqueGLCodesCount ||
          a.journalEntryNumber.localeCompare(b.journalEntryNumber)
        );
      });
    
    // Collect entries that meet the threshold
    compoundJournalEntries.forEach(summary => {
      const entriesForJournal = journalEntries.get(summary.journalEntryNumber) || [];
      results.push(...entriesForJournal);
    });

    return {
      results,
      summary: compoundJournalEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in findCompoundJournalEntries",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: Unknown error occurred");
  }
}
