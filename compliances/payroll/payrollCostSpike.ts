/**
 * Payroll Compliance Test: Payroll Cost Spike Analysis
 *
 * Purpose:
 * This test is designed to detect significant fluctuations in payroll costs from one month to the next, categorized by employee designation.
 * Identifying these 'cost spikes' can help in pinpointing potential issues such as:
 * - Unapproved or unexpected salary adjustments
 * - Errors in bonus or incentive payouts
 * - Mistakes during payroll processing
 * - Shifts in staffing levels that are not properly accounted for
 * - The financial impact of policy changes or regulatory updates on compensation
 *
 * How it works:
 * 1. **Data Input and Validation:**
 *    - Ensures the input data is correctly formatted as an array.
 *    - Validates each entry to confirm the presence of essential fields as defined in the Pay Register template:
 *      'Pay Period', 'Employee Code', 'Employee Name', 'Designation', and 'Gross pay'.
 *    - Records any validation failures, noting the specific entry and the missing field.
 * 2. **Cost Aggregation by Designation and Month:**
 *    - Organizes payroll data by 'Designation' and 'Pay Period' to calculate the total payroll cost for each designation in each month.
 *    - Uses a standardized format for the pay period to ensure consistent month-to-month comparisons.
 * 3. **Month-over-Month Cost Variation Analysis:**
 *    - For each 'Designation', it compares the total payroll cost between consecutive months.
 *    - Calculates the percentage change in cost from the previous month to the current month.
 * 4. **Spike Detection using Threshold:**
 *    - Applies a configurable 'threshold' (default is 5%) to identify significant cost variations.
 *    - Flags instances where the absolute percentage change exceeds the threshold as a 'cost spike'.
 * 5. **Output and Reporting:**
 *    - Returns a comprehensive `PayrollCostSpikeResult` object, which includes:
 *      - `results`: A list of all payroll entries from the months identified as having cost spikes.
 *      - `summary`: A detailed summary for each detected cost spike, including:
 *        - 'Designation' experiencing the spike.
 *        - 'previousMonth' and 'currentMonth' being compared.
 *        - 'previousCost' and 'currentCost' values.
 *        - 'percentageChange' observed.
 *        - 'entries' contributing to the cost spike in the current month.
 *      - `errors`: A list of any validation errors encountered during the data processing phase.
 *
 * Required Fields (Based on Pay Register Template):
 * - Pay Period: Period for which the salary is being paid (e.g., Month, Quarter)
 * - Employee Code: Unique code assigned to each employee
 * - Employee Name: Name of the employee
 * - Designation: Employee's job title or position
 * - Grosspay: Gross pay salary component
 *
 * Configuration:
 * - threshold: Percentage threshold to determine cost spikes (default: 5%)
 */

import { log } from "../../lib/utils/log";
import { formatPayPeriod } from "../../lib/utils/payroll-utils";
import { formatLocalDate } from "../../lib/utils/date-utils";
interface Entry {
  "Pay Period"?: string;
  "Employee Code"?: string;
  "Employee Name"?: string;
  Designation?: string;
  Grosspay?: number;
}

export interface PayrollCostSpikeResult {
  results: Entry[];
  summary: {
    designation: string;
    previousMonth: string;
    currentMonth: string;
    previousCost: number;
    currentCost: number;
    percentageChange: number;
    entries: Entry[];
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: Entry;
};

export interface PayrollCostSpikeConfig {
  threshold?: number;
}

export default function payrollCostSpike(
  data: Entry[],
  config: PayrollCostSpikeConfig = { threshold: 5 },
): PayrollCostSpikeResult {
  const threshold = config.threshold || 5;
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
    if (!entry["Pay Period"]) {
      errors.push({
        message: "Pay Period is missing",
        row: entry,
      });
    }
    if (!entry["Employee Code"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Employee Code",
        row: entry,
      });
    }
    if (!entry["Employee Name"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Employee Name",
        row: entry,
      });
    }
    if (!entry["Designation"]) {
      errors.push({
        message: "Invalid entry format: Entry must contain Designation",
        row: entry,
      });
    }
    if (entry["Grosspay"] === undefined) {
      // Allow 0 as valid value
      errors.push({
        message: "Invalid entry format: Entry must contain Gross pay",
        row: entry,
      });
    }
  }

  try {
    // Group payroll entries by designation and month
    const costByDesignationAndMonth = new Map<
      string,
      Map<string, { totalCost: number; entries: Entry[] }>
    >();

    normalizedData.forEach((entry) => {
      const designation = entry.Designation;
      const payPeriod = entry["Pay Period"] ? formatLocalDate(entry["Pay Period"]) : entry["Pay Period"];
      const grosspay = entry.Grosspay || 0;

      if (!designation || !payPeriod) return;

      // Standardize the pay period format
      const monthYear = formatPayPeriod(payPeriod);

      if (!costByDesignationAndMonth.has(designation)) {
        costByDesignationAndMonth.set(designation, new Map());
      }

      const designationMonths = costByDesignationAndMonth.get(designation)!;

      if (!designationMonths.has(monthYear)) {
        designationMonths.set(monthYear, { totalCost: 0, entries: [] });
      }

      const monthData = designationMonths.get(monthYear)!;
      monthData.totalCost += grosspay;
      monthData.entries.push(entry);
    });

    // Find cost spikes
    const costSpikes: PayrollCostSpikeResult["summary"] = [];

    costByDesignationAndMonth.forEach((months, designation) => {
      const sortedMonths = Array.from(months.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      );

      for (let i = 1; i < sortedMonths.length; i++) {
        const [currentMonth, currentData] = sortedMonths[i];
        const [previousMonth, previousData] = sortedMonths[i - 1];

        // Skip months with no costs to avoid division by zero
        if (previousData.totalCost === 0) continue;
        
        const percentageChange =
          ((currentData.totalCost - previousData.totalCost) /
            previousData.totalCost) *
          100;

        if (Math.abs(percentageChange) >= threshold) {
          results.push(...currentData.entries);
          costSpikes.push({
            designation,
            previousMonth,
            currentMonth,
            previousCost: previousData.totalCost,
            currentCost: currentData.totalCost,
            percentageChange,
            entries: currentData.entries,
          });
        }
      }
    });

    return {
      results,
      summary: costSpikes,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing Payroll Cost Spike data:",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing data: ${error.message}`);
    }
    throw new Error("Error processing data: An unknown error occurred");
  }
}
