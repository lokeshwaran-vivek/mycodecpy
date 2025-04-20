import { log } from "../../lib/utils/log";

export interface GLEntry {
  "Journal Entry Number": string;
  "User Prepared": string;
  "User Approved"?: string;
}

export interface SameUserEntry {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    userName: string;
    userApproved?: string;
  }[];
  errors: ErrorType[];
}
export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export default function recordedAndApprovedBySame(
  glData: GLEntry[]
): SameUserEntry {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  const errors: ErrorType[] = [];
  const results: GLEntry[] = [];

  try {
    // Filter entries where prepared and approved users are the same (case insensitive)
    const sameUserEntries = glData
      .map((entry, idx) => {
        return {
          id: idx,
          journalEntryNumber: entry["Journal Entry Number"],
          userName: entry["User Prepared"],
          userApproved: entry["User Approved"],
        };
      })
      .filter((entry) => {
        if (
          entry["userApproved"] &&
          entry["userName"]?.toLowerCase() ===
            entry["userApproved"]?.toLowerCase()
        ) {
          results.push(glData[entry.id]);

          return entry;
        }
      })
      .sort((a, b) => a.journalEntryNumber.localeCompare(b.journalEntryNumber));

    return {
      results,
      summary: sameUserEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in recordedAndApprovedBySame",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
