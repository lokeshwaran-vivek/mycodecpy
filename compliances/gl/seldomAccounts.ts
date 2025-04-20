/**
 * General Ledger Compliance Test: Seldom Used Accounts
 *
 * Purpose:
 * This test identifies general ledger accounts that are rarely used in transactions.
 * Low transaction frequency might indicate:
 * - Obsolete or discontinued accounts that should be deactivated
 * - Misclassified transactions in other accounts
 * - Special purpose accounts that need review
 * - Potential consolidation opportunities
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable minimum transactions threshold (default: 5)
 * 3. Groups entries by account code and counts transactions
 * 4. For each account:
 *    - Counts number of transactions
 *    - If count is below threshold, includes in results
 * 5. Returns:
 *    - Full list of seldom-used accounts
 *    - Summary with transaction counts
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - accountCode: GL account identifier
 * - accountName: Description of the account
 *
 * Configuration:
 * - minimumTransactions: Threshold for minimum expected transactions
 */

import { log } from "../../lib/utils/log";

export interface GLEntry {
  "GL Code": string;
  "Journal Entry Number": string;
  "GL Description": string;
}

export interface SeldomAccountsResult {
  results: GLEntry[];
  summary: {
    glCode: string;
    glDescription: string;
    transactionCount: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface SeldomAccountsConfig {
  minimumTransactions: number;
}

export default function seldomAccounts(
  glData: GLEntry[],
  config: SeldomAccountsConfig = { minimumTransactions: 5 }
): SeldomAccountsResult {
  const errors: ErrorType[] = [];
  // Input validation
  if (!Array.isArray(glData)) {
    errors.push({
      message: "GL data must be an array",
    });
  }

  if (config.minimumTransactions <= 0) {
    errors.push({
      message: "minimumTransactions must be a positive number",
    });
  }

  // Validate data structure
  for (const entry of glData) {
    if (!entry["GL Code"]) {
      errors.push({
        message: "Invalid GL entry format: GL Code is missing",
        row: entry,
      });
    }
    if (!entry["Journal Entry Number"]) {
      errors.push({
        message: "Invalid GL entry format: Journal Entry Number is missing",
        row: entry,
      });
    }
    if (!entry["GL Description"]) {
      errors.push({
        message: "Invalid GL entry format: GL Description is missing",
        row: entry,
      });
    }
  }

  try {
    const results: GLEntry[] = [];
    // Group transactions by GL Code and count journal entries
    const glAccountUsage = glData.reduce(
      (acc, entry) => {
        const glCode = entry["GL Code"];

        if (!acc[glCode]) {
          acc[glCode] = {
            glCode,
            glDescription: entry["GL Description"],
            journalEntries: new Set(),
          };
        }

        acc[glCode].journalEntries.add(entry["Journal Entry Number"]);
        return acc;
      },
      {} as Record<
        string,
        {
          glCode: string;
          glDescription: string;
          journalEntries: Set<string>;
        }
      >
    );

    // Filter accounts with transactions less than minimum threshold
    const seldomUsedAccounts = Object.values(glAccountUsage)
      .map((account, idx) => {
        return {
          id: idx,
          glCode: account.glCode,
          glDescription: account.glDescription,
          transactionCount: account.journalEntries.size,
        };
      })
      .filter((account) => {
        if (account.transactionCount <= config.minimumTransactions) {
          results.push(glData[account.id]);
          return account;
        }
      })
      .sort((a, b) => {
        // First sort by transaction count
        const countDiff = a.transactionCount - b.transactionCount;
        if (countDiff !== 0) return countDiff;
        // If counts are equal, sort by GL Code
        return a.glCode.localeCompare(b.glCode);
      });

    return {
      results,
      summary: seldomUsedAccounts,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in seldomAccounts",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}

// Example usage:
/*
const glData = [
  {
    'GL Code': '1001',
    'Journal Entry Number': 'JE001',
    'GL Description': 'Cash Account'
  },
  // ... more entries
];

const results = seldomAccounts(glData, { minimumTransactions: 5 });
*/
