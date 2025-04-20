/**
 * Utility functions for payroll compliance tests
 */
import {
  parseLocalDate,
  formatLocalDate
} from "./date-utils";

/**
 * Extract and format the month and year from a Pay Period string
 * 
 * @param payPeriod - The pay period string to format (e.g. "Jan 2023", "01/2023", "2023-01")
 * @returns A standardized string representation of the month and year (YYYY-MM format)
 */
export function formatPayPeriod(payPeriod: string): string {
  // Try to parse the payPeriod as a date if it might be a date string
  try {
    // Check if it contains date-like elements
    if (payPeriod.includes('/') || payPeriod.includes('-') || 
        payPeriod.match(/[A-Za-z]{3}\s+\d{4}/)) { // Match formats like "Jan 2023"
      const date = parseLocalDate(payPeriod);
      return formatLocalDate(date).substring(0, 7); // Get YYYY-MM format
    }
  } catch (error) {
    console.error(`Error parsing pay period: ${payPeriod}`, error);
    // If parsing fails, continue with the original string
  }
  
  // If not parsed as date, just return the original
  return payPeriod;
}

/**
 * Group entries by employee and pay period
 * Used for tracking month-wise payments to each employee
 * 
 * @param data - Array of payment entries
 * @returns Map with employee code + pay period as key and array of entries as value
 */
export function groupByEmployeeAndPayPeriod<T extends { 
  "Employee Code"?: string;
  "Pay Period"?: string;
}>(data: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  data.forEach((entry) => {
    const employeeCode = entry["Employee Code"];
    const payPeriod = entry["Pay Period"];
    
    if (!employeeCode || !payPeriod) return;

    // Format the pay period
    const formattedPayPeriod = formatPayPeriod(payPeriod);
    
    // Create a unique key for employee + pay period
    const key = `${employeeCode}_${formattedPayPeriod}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(entry);
  });

  return groups;
} 