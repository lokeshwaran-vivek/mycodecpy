/**
 * General Ledger Compliance Test: Seldom User Accounts
 *
 * Purpose:
 * This test identifies user accounts that show minimal transaction activity in the GL.
 * Low user activity might indicate:
 * - Dormant user accounts that should be deactivated
 * - Users who no longer need system access
 * - Potential segregation of duties issues
 * - Training needs for underutilized system access
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable minimum transactions threshold (default: 5)
 * 3. Groups entries by username and counts transactions
 * 4. For each user:
 *    - Counts number of transactions
 *    - If count is below threshold, includes in results
 * 5. Returns:
 *    - Full list of seldom-active users
 *    - Summary with transaction counts per user
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - User Prepared: User who prepared the journal entry
 * - Journal Entry Number: Unique number assigned to every journal entry
 */

import { log } from "../../lib/utils/log";

interface GLEntry {
  "User Prepared": string;
  "Journal Entry Number": string;
}

export interface SeldomUserAccountsResult {
  results: GLEntry[];
  summary: {
    userName: string;
    transactionCount: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface SeldomUserAccountsConfig {
  minimumTransactions: number;
}

export default function seldomUserAccounts(
  glData: GLEntry[],
  config: SeldomUserAccountsConfig = { minimumTransactions: 5 }
): SeldomUserAccountsResult {
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
    if (!entry["Journal Entry Number"]) {
      errors.push({
        message: "Invalid GL entry format: Journal Entry Number is missing",
        row: entry,
      });
    }
  }

  try {
    // Group transactions by User and count unique journal entries
    const userTransactionCounts = glData.reduce(
      (acc, entry) => {
        const userName = entry["User Prepared"];

        if (!acc[userName]) {
          acc[userName] = {
            userName,
            journalEntries: new Set(),
          };
        }

        acc[userName].journalEntries.add(entry["Journal Entry Number"]);
        return acc;
      },
      {} as Record<
        string,
        {
          userName: string;
          journalEntries: Set<string>;
        }
      >
    );

    // Filter users with transactions less than minimum threshold
    const seldomActiveUsers = Object.values(userTransactionCounts)
      .map((user) => {
        return {
          userName: user.userName,
          transactionCount: user.journalEntries.size,
        };
      })
      .filter((user) => user.transactionCount <= config.minimumTransactions)
      .sort((a, b) => {
        // First sort by transaction count
        const countDiff = a.transactionCount - b.transactionCount;
        if (countDiff !== 0) return countDiff;
        // If counts are equal, sort by username
        return a.userName.localeCompare(b.userName);
      });

    const results = glData.filter((entry) =>
      seldomActiveUsers.some((user) => user.userName === entry["User Prepared"])
    );

    return {
      results,
      summary: seldomActiveUsers,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in seldomUserAccounts",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
