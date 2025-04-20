/**
 * Payroll Compliance Test: Duplicate Aadhar
 *
 * Purpose:
 * This test aims to identify potential payroll irregularities by detecting duplicate Aadhar numbers across different employee records within the same pay period.
 * Duplicate Aadhar numbers can indicate various issues, including:
 * - **Identity Fraud:** Multiple employee profiles created with the same Aadhar number
 * - **Data Entry Errors:** Mistakes during data input can lead to incorrect Aadhar assignments
 * - **Employee Record Duplication:** The same employee might be recorded multiple times with different details but the same Aadhar number
 * - **System Integration Issues:** Problems in data synchronization between HR and payroll systems
 *
 * How it works:
 * 1. **Input Data Validation:**
 *    - Checks if the input data is an array.
 *    - Validates each entry to ensure it contains the required fields: 'Employee Code', 'Employee Name', 'Aadhar Number', and 'Pay Period' as defined in the Pay Register template.
 *    - Logs errors for any missing or invalid fields, including the specific row causing the error.
 * 2. **Grouping by Aadhar Number and Pay Period:**
 *    - Groups the entries based on 'Aadhar Number' and 'Pay Period'.
 *    - This approach accounts for monthly data uploads, ensuring duplicates are only flagged within the same pay period.
 * 3. **Duplicate Detection and Summary:**
 *    - Iterates through the grouped entries.
 *    - Identifies Aadhar numbers that are associated with more than one employee in the same pay period, indicating duplicates.
 *    - For each duplicate Aadhar number, it creates a summary record containing:
 *      - The duplicate 'Aadhar Number'.
 *      - The 'Pay Period'.
 *      - A list of 'occurrences', each detailing:
 *        - 'Employee Code'
 *        - 'Employee Name'
 * 4. **Output:**
 *    - Returns a `DuplicateAadharResult` object containing:
 *      - `results`: A list of all entries identified as having duplicate Aadhar numbers within the same pay period.
 *      - `summary`: A summary of each duplicate Aadhar number and its occurrences, including employee details and pay period.
 *      - `errors`: A list of validation errors encountered during data processing.
 *
 * Required Fields (Based on Pay Register Template):
 * - Employee Code
 * - Employee Name
 * - Aadhar Number
 * - Pay Period
 */

import { log } from "../../lib/utils/log";
import { formatPayPeriod } from "../../lib/utils/payroll-utils";
import { formatLocalDate, toDate } from "../../lib/utils/date-utils";
interface Entry {
  "Employee Code"?: string;
  "Employee Name"?: string;
  "Aadhar Number"?: string;
  "Pay Period"?: string;
}

export interface DuplicateAadharResult {
  results: Entry[];
  summary: {
    aadharNumber: string;
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

export interface DuplicateAadharConfig {
  // No specific config needed for this test
}

export default function duplicateAadhar(
  data: Entry[],
  config: DuplicateAadharConfig = {}
): DuplicateAadharResult {
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

    if (!entry["Aadhar Number"]) {
      errors.push({
        message: "Aadhar Number is missing",
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
    // Group entries by Aadhar number and pay period
    const aadharGroups = new Map<string, Entry[]>();

    normalizedData.forEach((entry) => {
      const aadharNumber = entry["Aadhar Number"];
      const payPeriod = entry["Pay Period"]
        ? formatLocalDate(entry["Pay Period"])
        : entry["Pay Period"];

      if (!aadharNumber || !payPeriod) return;

      // Format the pay period to a standardized format
      const formattedPayPeriod = formatPayPeriod(payPeriod);

      // Use a combined key for Aadhar number and pay period
      const key = `${aadharNumber}_${formattedPayPeriod}`;

      if (!aadharGroups.has(key)) {
        aadharGroups.set(key, []);
      }

      aadharGroups.get(key)!.push(entry);
    });

    // Find duplicates within the same pay period
    const duplicates: DuplicateAadharResult["summary"] = [];

    aadharGroups.forEach((entries, key) => {
      if (entries.length > 1) {
        // Extract components from the key (aadharNumber_payPeriod)
        const keyParts = key.split("_");
        const aadharNumber = keyParts[0];
        const payPeriod = keyParts.slice(1).join("_"); // In case pay period contains underscores

        results.push(...entries);
        duplicates.push({
          aadharNumber,
          payPeriod,
          occurrences: entries.map((entry) => ({
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
      message: "Error processing Duplicate Aadhar data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
