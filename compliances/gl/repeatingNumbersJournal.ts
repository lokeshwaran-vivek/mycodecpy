/**
 * General Ledger Compliance Test: Repeating Numbers in Journal
 *
 * Purpose:
 * This test identifies journal entries with suspicious patterns of repeating numbers
 * in transaction amounts. Such patterns might indicate:
 * - Fraudulent or manipulated entries
 * - Data entry errors
 * - System-generated dummy entries
 * - Testing or training data in production
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - Number of digits to analyze (default: 5) - This is user-configurable
 * 3. For each transaction amount:
 *    - Focuses on the last n digits of the debit or credit amount
 *    - Checks if those last n digits are all repeating (e.g., 12345555 where last 4 digits are all 5s)
 * 4. Returns:
 *    - Full list of suspicious entries
 *    - Summary with pattern details
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Unique number assigned to every journal entry
 * - Entry Date: Date when the journal entry was posted
 * - Debit In Reporting Currency: Debit amount in the company's reporting currency
 * - Credit In Reporting Currency: Credit amount in the company's reporting currency
 * - User Prepared: User who prepared the journal entry
 *
 * Configuration:
 * - digitCount: Number of last digits to check for repetition (user-configurable)
 */

import { log } from "../../lib/utils/log";

export interface GLEntry {
  "Journal Entry Number": string;
  "Entry Date": Date;
  "Debit In Reporting Currency"?: number;
  "Credit In Reporting Currency"?: number;
  "User Prepared": string;
}

export interface RepeatingNumberEntry {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    entryDate: Date;
    userPrepared: string;
    debitAmount: number | undefined;
    creditAmount: number | undefined;
    repeatingDigits: {
      debit: string | null;
      credit: string | null;
    };
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface RepeatingNumbersConfig {
  digitCount: number; // Number of last digits to check for repetition
}

export default function repeatingNumbersJournal(
  glData: GLEntry[],
  config: RepeatingNumbersConfig = { digitCount: 5 }
): RepeatingNumberEntry {
  const errors: ErrorType[] = [];
  // Input validation
  if (!Array.isArray(glData)) {
    errors.push({
      message: "GL data must be an array",
    });
  }

  if (config.digitCount < 1) {
    errors.push({
      message: "digitCount must be greater than 0",
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
    if (!entry["Entry Date"]) {
      errors.push({
        message: "Invalid GL entry format: Entry Date is missing",
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
  }

  try {
    // Helper function to check for repeating digits in the last n digits
    function findRepeatingDigits(number: number | undefined): string | null {
      // If number is undefined or null, return null
      if (number === undefined || number === null) {
        return null;
      }
      
      const numStr = Math.abs(number).toString();
      
      // If number has fewer digits than digitCount, return null
      if (numStr.length < config.digitCount) {
        return null;
      }
      
      // Extract the last n digits
      const lastNDigits = numStr.slice(-config.digitCount);
      
      // Check if all digits in lastNDigits are the same
      const firstDigit = lastNDigits[0];
      for (let i = 1; i < lastNDigits.length; i++) {
        if (lastNDigits[i] !== firstDigit) {
          return null;
        }
      }
      
      // All digits are the same in the last n digits
      return lastNDigits;
    }


    // Filter entries with repeating digits
    const repeatingEntries = glData
      .map((entry) => {
        const debitPattern = findRepeatingDigits(
          entry["Debit In Reporting Currency"]
        );
        const creditPattern = findRepeatingDigits(
          entry["Credit In Reporting Currency"]
        );

        if (!debitPattern && !creditPattern) return null;

        return {
          journalEntryNumber: entry["Journal Entry Number"],
          entryDate: new Date(entry["Entry Date"]),
          userPrepared: entry["User Prepared"],
          debitAmount: entry["Debit In Reporting Currency"],
          creditAmount: entry["Credit In Reporting Currency"],
          repeatingDigits: {
            debit: debitPattern,
            credit: creditPattern,
          },
        };
      })
      .filter((entry) => entry !== null)
      .sort((a, b) => {
        // First sort by entry date
        const dateDiff = a.entryDate.getTime() - b.entryDate.getTime();
        if (dateDiff !== 0) return dateDiff;
        // If dates are equal, sort by journal entry number
        return a.journalEntryNumber.localeCompare(b.journalEntryNumber);
      });

    return {
      results: glData.filter((entry) =>
        repeatingEntries.some(
          (re) => re.journalEntryNumber === entry["Journal Entry Number"]
        )
      ),
      summary: repeatingEntries,
      errors: errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in repeatingNumbersJournal",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
