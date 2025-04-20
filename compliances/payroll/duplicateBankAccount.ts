/**
 * Payroll Compliance Test: Duplicate Bank Accounts
 *
 * Purpose:
 * This test aims to identify instances where the same bank account number appears multiple times 
 * within the same pay period, which could indicate potential issues with payroll processing.
 *
 * How it works:
 * 1. **Input Data Validation:**
 *    - Checks if the input data is an array.
 *    - Validates each entry to ensure it contains the required fields.
 * 2. **Grouping by Bank Account and Pay Period:**
 *    - Groups entries by bank account number and pay period.
 *    - Flags any case where the same bank account appears multiple times in the same period.
 * 3. **Duplicate Detection:**
 *    - Identifies and reports all instances of duplicate bank accounts within the same period.
 *
 * Required Fields (Based on Pay Register Template):
 * - Employee Code
 * - Employee Name
 * - Employee Bank Account Number
 * - Employee Bank Name
 * - Pay Period
 */

import { log } from "../../lib/utils/log";
import { formatPayPeriod } from "../../lib/utils/payroll-utils";
import { formatLocalDate } from "../../lib/utils/date-utils";
interface Entry {
  "Employee Code"?: string;
  "Employee Name"?: string;
  "Employee Bank Account Number"?: string;
  "Employee Bank Name"?: string;
  "Pay Period"?: string;
}

export interface DuplicateBankAccountResult {
  results: Entry[];
  summary: {
    bankAccountNumber: string;
    bankName: string;
    payPeriod: string;
    occurrences: {
      employeeCode: string;
      employeeName: string;
    }[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DuplicateBankAccountConfig {
  // No specific config needed for this test
}

export default function duplicateBankAccount(
  data: Entry[],
  config: DuplicateBankAccountConfig = {},
): DuplicateBankAccountResult {
  const errors: ErrorType[] = [];
  let results: Entry[] = [];

  // Input validation
  if (!Array.isArray(data)) {
    errors.push({
      message: "Data must be an array",
      row: data as any,
    });
    return { results, summary: [], errors };
  }

  // Normalize data
  const normalizedData = [...data];

  // Validate data structure
  for (const entry of normalizedData) {
    if (!entry["Employee Code"]) {
      errors.push({
        message: "Employee Code is missing",
        row: entry,
      });
    }
    
    if (!entry["Employee Name"]) {
      errors.push({
        message: "Employee Name is missing",
        row: entry,
      });
    }
    
    if (!entry["Employee Bank Account Number"]) {
      errors.push({
        message: "Employee Bank Account Number is missing",
        row: entry,
      });
    }
    
    if (!entry["Employee Bank Name"]) {
      errors.push({
        message: "Employee Bank Name is missing",
        row: entry,
      });
    }
    
    if (!entry["Pay Period"]) {
      errors.push({
        message: "Pay Period is missing",
        row: entry,
      });
    }
  }

  try {
    // Group entries by bank account details and pay period
    const bankAccountGroups = new Map<string, Entry[]>();

    normalizedData.forEach((entry) => {
      const bankAccountNumber = entry["Employee Bank Account Number"];
      const bankName = entry["Employee Bank Name"];
      const payPeriod = entry["Pay Period"] ? formatLocalDate(entry["Pay Period"]) : entry["Pay Period"];
      
      if (!bankAccountNumber || !bankName || !payPeriod) return;

      // Format the pay period to a standardized format
      const formattedPayPeriod = formatPayPeriod(payPeriod);
      
      // Use a combined key for bank account + bank name + pay period
      const key = `${bankAccountNumber}_${bankName}_${formattedPayPeriod}`;

      if (!bankAccountGroups.has(key)) {
        bankAccountGroups.set(key, []);
      }

      bankAccountGroups.get(key)!.push(entry);
    });

    // Find duplicates - any bank account that appears more than once in the same period
    const duplicates: DuplicateBankAccountResult["summary"] = [];

    bankAccountGroups.forEach((entries, key) => {
      // Flag if the same bank account appears more than once in the same period
      if (entries.length > 1) {
        const [bankAccountNumber, bankName, payPeriod] = key.split("_");
        
        results.push(...entries);
        duplicates.push({
          bankAccountNumber,
          bankName,
          payPeriod,
          occurrences: entries.map(entry => ({
            employeeCode: entry["Employee Code"]!,
            employeeName: entry["Employee Name"]!,
          })),
        });
      }
    });

    return {
      results,
      summary: duplicates,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing Duplicate Bank Account data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
