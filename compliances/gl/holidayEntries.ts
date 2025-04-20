/**
 * General Ledger Compliance Test: Holiday Transaction Entries
 *
 * Purpose:
 * This test identifies journal entries recorded during holidays or non-business days.
 * Transactions on holidays might indicate:
 * - Unauthorized access to systems
 * - Backdated entries
 * - System timing issues
 * - Special processing requirements
 *
 * How it works:
 * 1. Validates input data structure ensuring required fields are present
 * 2. Uses configurable parameters:
 *    - Array of holiday day numbers (0 = Sunday, default)
 *    - Can include specific holiday dates
 * 3. For each journal entry:
 *    - Checks if transaction date falls on holiday/weekend
 *    - Groups entries by date for pattern analysis
 * 4. Returns:
 *    - Full list of holiday/weekend entries
 *    - Summary grouped by date
 *    - Any validation errors encountered
 *
 * Required Fields:
 * - Journal Entry Number: Journal entry identifier
 * - Entry Date: Date of the transaction
 * - User Prepared: User who created the entry
 *
 * Configuration:
 * - holidayDays: Array of day numbers (0-6) to consider as holidays
 * - holidayDates: Array of specific dates (YYYY-MM-DD) to consider as holidays
 */

import { log } from "../../lib/utils/log";
import {
  formatLocalDate,
  getDayOfWeek,
  getDayName,
  isHoliday as isDateHoliday,
} from "../../lib/utils/date-utils";

export interface GLEntry {
  "Journal Entry Number": string;
  "Entry Date": Date;
  "User Prepared": string;
}

export interface HolidayEntry {
  results: GLEntry[];
  summary: {
    journalEntryNumber: string;
    entryDate: Date;
    userPrepared: string;
    dayOfWeek: string;
    isHoliday: boolean;
    isSunday: boolean;
  }[];
  errors: ErrorType[];
}

export type ErrorType = {
  message: string;
  row?: GLEntry;
};

export interface HolidayEntriesConfig {
  holidayDays?: number[]; // 0 = Sunday, 1 = Monday, etc. - Optional, default to Sunday
  holidayDates?: string[]; // Specific dates in 'YYYY-MM-DD' format - Optional
  timezone?: string; // Timezone to use for date calculations
}

export default function holidayEntries(
  glData: GLEntry[],
  config: HolidayEntriesConfig = {
    holidayDays: [],
    holidayDates: [],
    timezone: "Asia/Kolkata", // Default to Kolkata timezone
  } // Default to Sunday and no specific dates
): HolidayEntry {
  // Input validation
  if (!Array.isArray(glData)) {
    throw new Error("GL data must be an array");
  }

  const holidayDays = config.holidayDays || []; // Default to empty array if not provided
  const holidayDates = config.holidayDates || []; // Default to empty array if not provided
  const timezone = config.timezone || "Asia/Kolkata"; // Default to Kolkata timezone

  if (!Array.isArray(holidayDates)) {
    throw new Error("holidayDates must be an array");
  }

  const results: GLEntry[] = [];
  const errors: ErrorType[] = [];

  // Validate holiday days are between 0-6
  if (holidayDays.some((day) => day < 0 || day > 6)) {
    throw new Error("holidayDays must be between 0 and 6");
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
  }

  try {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Convert holidayDates to Set for efficient lookup
    const holidayDatesSet = new Set(holidayDates);

    // Filter and map entries made on holidays
    const holidayEntriesSummary = glData
      .map((entry) => {
        const entryDate =
          entry["Entry Date"] instanceof Date
            ? entry["Entry Date"]
            : new Date(entry["Entry Date"]);

        // Adjust date for the specified timezone
        const options = { timeZone: timezone };
        const dateInTimezone = new Date(
          entryDate.toLocaleString("en-US", options)
        );

        // Use our centralized date utility with the timezone-adjusted date
        const entryDateString = formatLocalDate(dateInTimezone);
        const dayOfWeek = dateInTimezone.getDay(); // Get day directly with timezone consideration
        const isSpecificHolidayDate = holidayDatesSet.has(entryDateString);

        return {
          journalEntryNumber: entry["Journal Entry Number"],
          entryDate,
          userPrepared: entry["User Prepared"] ?? "",
          dayOfWeek: dayNames[dayOfWeek],
          isHoliday:
            holidayDays.length > 0
              ? holidayDays.includes(dayOfWeek) || isSpecificHolidayDate
              : isSpecificHolidayDate,
          isSunday: dayOfWeek === 0,
        };
      })
      .filter((entry) => entry.isHoliday)
      .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

    holidayEntriesSummary.forEach((holidayEntrySum) => {
      const originalEntry = glData.find(
        (item) =>
          item["Journal Entry Number"] === holidayEntrySum.journalEntryNumber
      );
      if (originalEntry) {
        results.push(originalEntry);
      }
    });

    return {
      results,
      summary: holidayEntriesSummary,
      errors,
    };
  } catch (error: unknown) {
    log({
      message: "Error processing GL data in holidayEntries",
      type: "error",
      data: error,
    });
    if (error instanceof Error) {
      throw new Error(`Error processing GL data: ${error.message}`);
    }
    throw new Error("Error processing GL data: An unknown error occurred");
  }
}
