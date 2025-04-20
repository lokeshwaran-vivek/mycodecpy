/**
 * General Ledger Compliance Test: Records Without Approvals
 *
 * Purpose:
 * This test identifies journal entries that have been recorded but lack proper approval.
 * Missing approvals might indicate:
 * - Breakdown in internal controls
 * - Unauthorized transactions
 * - Incomplete workflow processes
 * - System configuration issues
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. For each journal entry:
 *    - Checks if approval user field is empty or null
 *    - Checks if approval date field is empty or null
 *    - If either is missing, flags the entry
 * 3. Groups entries by journal number for complete picture
 * 4. Returns:
 *    - Full list of unapproved entries
 *    - Summary with entry details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Journal entry identifier
 * - User Prepared: User who created the entry
 * - User Approved: Username of approver
 * - Entry Date: Date of the transaction
 */

import { log } from "../../lib/utils/log";

export interface GLEntry {
  "Journal Entry Number": string;
  "User Prepared": string;
  "User Approved": string;
  "Entry Date": Date;
}

export interface UnapprovedEntry {
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

export default function recordWithNoApprovals(
  glData: GLEntry[]
): UnapprovedEntry {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }
  const errors: ErrorType[] = [];

  // Validate data structure
  for (const entry of glData) {
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
  }

  try {
    const results: GLEntry[] = [];
    // Filter entries with no approvals (blank User Approved)
    const unapprovedEntries = glData
      .filter((entry) => {
        // Check if User Approved is empty or doesn't exist
        const isUnapproved = !entry["User Approved"] || entry["User Approved"].trim() === "";
        if (isUnapproved) {
          // Add this entry to results directly
          results.push(entry);
        }
        return isUnapproved;
      })
      .map((entry) => {
        return {
          journalEntryNumber: entry["Journal Entry Number"],
          entryDate: new Date(entry["Entry Date"]),
        };
      });

    return {
      results: results,
      summary: unapprovedEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in recordWithNoApprovals",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
