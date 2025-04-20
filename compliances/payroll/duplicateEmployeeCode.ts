/**
 * Payroll Compliance Test: Duplicate Employee Codes
 *
 * Purpose:
 * This test identifies instances where the same employee code appears multiple times
 * within the same pay period, regardless of the employee name.
 *
 * How it works:
 * 1. **Input Data Validation:**
 *    - Checks if the input data is an array.
 *    - Validates each entry to ensure it contains the required fields.
 * 2. **Grouping by Employee Code and Pay Period:**
 *    - Groups entries by employee code and pay period.
 *    - Checks if the same employee code appears multiple times in the same period.
 * 3. **Duplicate Detection:**
 *    - Flags cases where an employee code appears more than once in the same pay period.
 *
 * Required Fields (Based on Pay Register Template):
 * - Employee Code
 * - Pay Period
 */

import { log } from "../../lib/utils/log";
import { formatPayPeriod } from "../../lib/utils/payroll-utils";
import { formatLocalDate } from "../../lib/utils/date-utils";
import { removePrecedingZeros } from "../../lib/utils";
interface Entry {
  "Employee Code"?: string;
  "Employee Name"?: string;
  "Pay Period"?: string;
}

export interface DuplicateEmployeeCodeResult {
  results: Entry[];
  summary: {
    employeeCode: string;
    payPeriod: string;
    occurrences: number;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface DuplicateEmployeeCodeConfig {
  // No specific config needed for this test
}

export default function duplicateEmployeeCode(
  data: Entry[],
  config: DuplicateEmployeeCodeConfig = {}
): DuplicateEmployeeCodeResult {
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

    if (!entry["Pay Period"]) {
      errors.push({
        message: "Pay Period is missing",
        row: entry,
      });
    }
  }

  try {
    // Group entries by employee code and pay period
    const employeeCodeGroups = new Map<string, Entry[]>();

    normalizedData.forEach((entry) => {
      const employeeCode = removePrecedingZeros(entry["Employee Code"] || "");
      const payPeriod = entry["Pay Period"]
        ? formatLocalDate(entry["Pay Period"])
        : entry["Pay Period"];

      if (!employeeCode || !payPeriod) return;

      // Format the pay period to a standardized format
      const formattedPayPeriod = formatPayPeriod(payPeriod);

      // Use a combined key for employee code and pay period
      const key = `${employeeCode}_${formattedPayPeriod}`;

      if (!employeeCodeGroups.has(key)) {
        employeeCodeGroups.set(key, []);
      }

      employeeCodeGroups.get(key)!.push(entry);
    });

    // Find duplicates - when same employee code appears multiple times in same period
    const duplicates: DuplicateEmployeeCodeResult["summary"] = [];

    employeeCodeGroups.forEach((entries, key) => {
      // Only consider it a duplicate if the same employee code appears more than once in the same period
      if (entries.length > 1) {
        const [employeeCode, payPeriod] = key.split("_");

        results.push(...entries);
        duplicates.push({
          employeeCode,
          payPeriod,
          occurrences: entries.length,
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
      message: "Error processing Duplicate Employee Code data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
