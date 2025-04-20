/**
 * General Ledger Compliance Test: Round Number Analysis (Last N Digits Zeroes)
 *
 * Purpose:
 * This test identifies journal entries where the debit or credit amounts are round numbers,
 * specifically ending with N zeroes. This can help detect potential manual adjustments or
 * systematically generated entries that might warrant further review.
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present.
 * 2. Uses configurable digit count parameter (default: 5) to check for trailing zeroes.
 * 3. For each transaction amount:
 *    - Checks if the debit or credit amount is divisible by 10^digitCount.
 * 4. Identifies:
 *    - Entries with round debit amounts
 *    - Entries with round credit amounts
 * 5. Returns:
 *    - Full list of entries identified as having round debit or credit amounts.
 *    - Summary indicating which entries have round debit and/or credit amounts.
 *    - Any validation errors encountered.
 *
 * Required Fields:
 * - Journal Entry Number: Unique identifier for the entry
 * - Debit In Reporting Currency: Transaction debit amount
 * - Credit In Reporting Currency: Transaction credit amount
 *
 * Configuration:
 * - digitCount: Number of trailing digits (zeroes) to analyze.
 */

import { log } from "../../lib/utils/log";

interface GLEntry {
  "Journal Entry Number": string;
  "Debit In Reporting Currency"?: number;
  "Credit In Reporting Currency"?: number;
}

export interface Last5DigitsResult {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    debitAmount: number | undefined;
    creditAmount: number | undefined;
    isDebitRoundNumber: boolean;
    isCreditRoundNumber: boolean;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface Last5DigitsConfig {
  digitCount: number;
}

export default function last5Digits(
  glData: GLEntry[],
  config: Last5DigitsConfig = { digitCount: 5 },
): Last5DigitsResult {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  if (config.digitCount <= 0) {
    throw new Error("digitCount must be a positive number");
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
      if (entry["Debit In Reporting Currency"] !== undefined && 
          typeof entry["Debit In Reporting Currency"] !== "number") {
        errors.push({
          message:
            "Invalid GL entry format: Debit In Reporting Currency is not a number",
          row: entry,
        });
      }
      if (entry["Credit In Reporting Currency"] !== undefined && 
          typeof entry["Credit In Reporting Currency"] !== "number") {
        errors.push({
          message:
            "Invalid GL entry format: Credit In Reporting Currency is not a number",
          row: entry,
        });
      }
    };

    validateGLEntry(entry, errors);
  }

  try {
    // Check if last n digits are zero
    const isRoundNumber = (num: number | undefined, digitCount: number): boolean => {
      if (num === undefined || num === null) {
        return false;
      }
      
      // Convert number to string to check specific digits
      const numStr = Math.abs(num).toString();
      
      // Check if the number has at least digitCount digits
      if (numStr.length < digitCount) {
        return false;
      }
      
      // Check if the last digitCount digits are all zeros
      const lastDigits = numStr.slice(-digitCount);
      return lastDigits === '0'.repeat(digitCount);
    };

    glData.filter((entry) => {
      const isDebitRound = isRoundNumber(
        entry["Debit In Reporting Currency"],
        config.digitCount,
      );
      const isCreditRound = isRoundNumber(
        entry["Credit In Reporting Currency"],
        config.digitCount,
      );
      if (isDebitRound || isCreditRound) {
        results.push(entry);
        return true;
      }
      return false;
    });

    // Filter and map entries with round numbers
    const processedEntries = results
      .map((entry) => {
        const isDebitRoundNumber = isRoundNumber(
          entry["Debit In Reporting Currency"],
          config.digitCount,
        );
        const isCreditRoundNumber = isRoundNumber(
          entry["Credit In Reporting Currency"],
          config.digitCount,
        );

        return {
          journalEntryNumber: entry["Journal Entry Number"],
          debitAmount: entry["Debit In Reporting Currency"],
          creditAmount: entry["Credit In Reporting Currency"],
          isDebitRoundNumber: isDebitRoundNumber,
          isCreditRoundNumber: isCreditRoundNumber,
        };
      })
      .sort((a, b) => a.journalEntryNumber.localeCompare(b.journalEntryNumber));

    return {
      results,
      summary: processedEntries,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in last5Digits",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
