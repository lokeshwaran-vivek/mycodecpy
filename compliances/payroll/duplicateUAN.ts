/**
 * Payroll Compliance Test: Duplicate UAN Numbers
 *
 * Purpose:
 * This test identifies instances where the same Universal Account Number (UAN) is associated with different 
 * employee details within the same pay period. It ignores cases where the same UAN and employee details 
 * combination appears across different pay periods, as this is normal behavior.
 *
 * How it works:
 * 1. **Input Data Validation:**
 *    - Checks if the input data is an array.
 *    - Validates each entry to ensure it contains the required fields.
 * 2. **Grouping by UAN and Pay Period:**
 *    - Groups entries by UAN number and pay period.
 *    - Checks if the same UAN has different employee details in the same period.
 * 3. **Duplicate Detection:**
 *    - Only flags cases where a UAN has different employee details in the same pay period.
 *    - Ignores cases where the same UAN and employee details appear across different periods.
 *
 * Required Fields (Based on Pay Register Template):
 * - Employee Code
 * - Employee Name
 * - UAN Number (PF UAN)
 * - Pay Period
 */

import { log } from "../../lib/utils/log";
import { formatPayPeriod } from "../../lib/utils/payroll-utils";
import { formatLocalDate } from "../../lib/utils/date-utils";
import { removePrecedingZeros } from "../../lib/utils";
interface Entry {
  "Employee Code"?: string;
  "Employee Name"?: string;
  "PF UAN"?: string;
  "Pay Period"?: string;
}

export interface DuplicateUANResult {
  results: Entry[];
  summary: {
    uanNumber: string;
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

export interface DuplicateUANConfig {
  // No specific config needed for this test
}

export default function duplicateUAN(
  data: Entry[],
  config: DuplicateUANConfig = {},
): DuplicateUANResult {
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
    
    if (!entry["PF UAN"]) {
      errors.push({
        message: "UAN Number is missing",
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
    // Group entries by UAN number and pay period, then by employee details
    const uanGroups = new Map<string, Map<string, Entry[]>>();

    normalizedData.forEach((entry) => {
      const uanNumber = removePrecedingZeros(entry["PF UAN"] || "");
      const employeeCode = removePrecedingZeros(entry["Employee Code"] || "");
      const employeeName = entry["Employee Name"];
      const payPeriod = entry["Pay Period"] ? formatLocalDate(entry["Pay Period"]) : entry["Pay Period"];
      
      if (!uanNumber || !employeeCode || !employeeName || !payPeriod) return;

      // Format the pay period to a standardized format
      const formattedPayPeriod = formatPayPeriod(payPeriod);
      
      // Use a combined key for UAN number and pay period
      const key = `${uanNumber}_${formattedPayPeriod}`;

      if (!uanGroups.has(key)) {
        uanGroups.set(key, new Map());
      }

      // Use employee code and name as a combined key to identify unique employees
      const employeeKey = `${employeeCode}_${employeeName}`;
      const employeeGroup = uanGroups.get(key)!;
      
      if (!employeeGroup.has(employeeKey)) {
        employeeGroup.set(employeeKey, []);
      }
      employeeGroup.get(employeeKey)!.push(entry);
    });

    // Find duplicates - only when same UAN has different employee details in same period
    const duplicates: DuplicateUANResult["summary"] = [];

    uanGroups.forEach((employeeGroup, key) => {
      // Only consider it a duplicate if the same UAN has different employee details in the same period
      if (employeeGroup.size > 1) {
        const [uanNumber, payPeriod] = key.split("_");
        
        const entries: Entry[] = [];
        employeeGroup.forEach(empEntries => entries.push(...empEntries));
        
        results.push(...entries);
        duplicates.push({
          uanNumber,
          payPeriod,
          occurrences: Array.from(employeeGroup.values()).map(empEntries => ({
            employeeCode: empEntries[0]["Employee Code"]!,
            employeeName: empEntries[0]["Employee Name"]!,
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
      message: "Error processing Duplicate UAN data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
