import {
  formatDistanceToNow,
  isValid,
  parse,
  parseISO,
  addDays,
  addMonths,
  addYears,
  isSameDay,
  isAfter,
  isBefore,
  differenceInDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWeekend,
} from "date-fns";
import {
  formatInTimeZone,
  toZonedTime,
  fromZonedTime,
  getTimezoneOffset,
} from "date-fns-tz";
import { log } from "./log";

// Type for date input that can handle various formats
export type DateInput = Date | string | number;

// Default timezone - can be overridden by environment variables or user preferences
export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";

/**
 * Converts any date input to a Date object
 */
export function toDate(input: DateInput): Date {
  if (input instanceof Date) {
    return input;
  }
  
  if (typeof input === "string") {
    // Try to parse ISO date
    const parsedDate = parseISO(input);
    if (isValid(parsedDate)) {
      return parsedDate;
    }
    
    // Try to parse other date formats
    const formats = ["yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy"];
    for (const dateFormat of formats) {
      try {
        const parsed = parse(input, dateFormat, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (e) {
        log({
          message: `Error parsing date: ${input}`,
          type: "error",
          data: e,
        });
        // Continue trying other formats
      }
    }
  }
  
  // As a fallback, try to create Date directly
  const date = new Date(input);
  if (isValid(date)) {
    return date;
  }
  
  throw new Error(`Invalid date input: ${input}`);
}

/**
 * Format a date in a consistent local format (YYYY-MM-DD)
 * @param input The date to format
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function formatLocalDate(input: DateInput, timezone = DEFAULT_TIMEZONE): string {
  const date = toDate(input);
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/**
 * Format a date with time (YYYY-MM-DD HH:mm:ss)
 * @param input The date to format
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function formatDateTime(input: DateInput, timezone = DEFAULT_TIMEZONE): string {
  const date = toDate(input);
  return formatInTimeZone(date, timezone, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Format a date with a custom format string
 * @param input The date to format
 * @param formatString The format string to use
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function formatCustom(
  input: DateInput, 
  formatString: string, 
  timezone = DEFAULT_TIMEZONE
): string {
  const date = toDate(input);
  return formatInTimeZone(date, timezone, formatString);
}

/**
 * Formats a date to a relative time string (e.g., "3 hours ago")
 */
export function formatRelativeTime(input: DateInput): string {
  return formatDistanceToNow(toDate(input), { addSuffix: true });
}

/**
 * Get the day of week (0-6, where 0 is Sunday)
 * @param input The date to get the day of week for
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getDayOfWeek(input: DateInput, timezone = DEFAULT_TIMEZONE): number {
  const date = toZonedTime(toDate(input), timezone);
  return date.getDay();
}

/**
 * Get day name (e.g., "Monday")
 * @param input The date to get the day name for
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getDayName(input: DateInput, timezone = DEFAULT_TIMEZONE): string {
  const date = toDate(input);
  return formatInTimeZone(date, timezone, "EEEE");
}

/**
 * Check if a date is a weekend
 * @param input The date to check
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function isWeekendDay(input: DateInput, timezone = DEFAULT_TIMEZONE): boolean {
  const date = toZonedTime(toDate(input), timezone);
  return isWeekend(date);
}

/**
 * Check if a date is a holiday (based on provided holiday dates)
 */
export function isHoliday(
  input: DateInput, 
  holidayDates: string[] = []
): boolean {
  const dateStr = formatLocalDate(input);
  return holidayDates.includes(dateStr);
}

/**
 * Compare if two dates are the same day
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function isSameDate(
  date1: DateInput, 
  date2: DateInput, 
  timezone = DEFAULT_TIMEZONE
): boolean {
  const d1 = toZonedTime(toDate(date1), timezone);
  const d2 = toZonedTime(toDate(date2), timezone);
  return isSameDay(d1, d2);
}

/**
 * Check if date1 is after date2
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function isDateAfter(
  date1: DateInput, 
  date2: DateInput, 
  timezone = DEFAULT_TIMEZONE
): boolean {
  const d1 = toZonedTime(toDate(date1), timezone);
  const d2 = toZonedTime(toDate(date2), timezone);
  return isAfter(d1, d2);
}

/**
 * Check if date1 is before date2
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function isDateBefore(
  date1: DateInput, 
  date2: DateInput, 
  timezone = DEFAULT_TIMEZONE
): boolean {
  const d1 = toZonedTime(toDate(date1), timezone);
  const d2 = toZonedTime(toDate(date2), timezone);
  return isBefore(d1, d2);
}

/**
 * Get days difference between two dates
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getDaysDifference(
  date1: DateInput, 
  date2: DateInput, 
  timezone = DEFAULT_TIMEZONE
): number {
  const d1 = toZonedTime(toDate(date1), timezone);
  const d2 = toZonedTime(toDate(date2), timezone);
  return differenceInDays(d1, d2);
}

/**
 * Add days to a date
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function addDaysToDate(
  input: DateInput, 
  days: number, 
  timezone = DEFAULT_TIMEZONE
): Date {
  const date = toZonedTime(toDate(input), timezone);
  return addDays(date, days);
}

/**
 * Add months to a date
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function addMonthsToDate(
  input: DateInput, 
  months: number, 
  timezone = DEFAULT_TIMEZONE
): Date {
  const date = toZonedTime(toDate(input), timezone);
  return addMonths(date, months);
}

/**
 * Add years to a date
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function addYearsToDate(
  input: DateInput, 
  years: number, 
  timezone = DEFAULT_TIMEZONE
): Date {
  const date = toZonedTime(toDate(input), timezone);
  return addYears(date, years);
}

/**
 * Get start of day
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getStartOfDay(input: DateInput, timezone = DEFAULT_TIMEZONE): Date {
  const date = toZonedTime(toDate(input), timezone);
  return startOfDay(date);
}

/**
 * Get end of day
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getEndOfDay(input: DateInput, timezone = DEFAULT_TIMEZONE): Date {
  const date = toZonedTime(toDate(input), timezone);
  return endOfDay(date);
}

/**
 * Get start of month
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getStartOfMonth(input: DateInput, timezone = DEFAULT_TIMEZONE): Date {
  const date = toZonedTime(toDate(input), timezone);
  return startOfMonth(date);
}

/**
 * Get end of month
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getEndOfMonth(input: DateInput, timezone = DEFAULT_TIMEZONE): Date {
  const date = toZonedTime(toDate(input), timezone);
  return endOfMonth(date);
}

/**
 * Get start of year
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getStartOfYear(input: DateInput, timezone = DEFAULT_TIMEZONE): Date {
  const date = toZonedTime(toDate(input), timezone);
  return startOfYear(date);
}

/**
 * Get end of year
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getEndOfYear(input: DateInput, timezone = DEFAULT_TIMEZONE): Date {
  const date = toZonedTime(toDate(input), timezone);
  return endOfYear(date);
}

/**
 * Validate if input is a valid date
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isValidDate(input: any): boolean {
  if (input instanceof Date) {
    return isValid(input);
  }
  
  if (typeof input === "string") {
    return isValid(parseISO(input));
  }
  
  return isValid(new Date(input));
}

/**
 * Convert UTC date to local date string
 * This ensures consistent date handling across timezones
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function utcToLocalDateString(
  utcDate: DateInput, 
  timezone = DEFAULT_TIMEZONE
): string {
  const date = toDate(utcDate);
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/**
 * Parse a date string in YYYY-MM-DD format to a Date
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function parseLocalDate(dateString: string, timezone = DEFAULT_TIMEZONE): Date {
  const parsedDate = parse(dateString, "yyyy-MM-dd", new Date());
  return toZonedTime(parsedDate, timezone);
}

/**
 * Get current date as YYYY-MM-DD
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getCurrentDateString(timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

/**
 * Get an array of dates between two dates (inclusive)
 * @param timezone Optional timezone, defaults to DEFAULT_TIMEZONE
 */
export function getDatesBetween(
  startDate: DateInput, 
  endDate: DateInput,
  timezone = DEFAULT_TIMEZONE
): Date[] {
  const start = toZonedTime(toDate(startDate), timezone);
  const end = toZonedTime(toDate(endDate), timezone);
  const dateArray: Date[] = [];
  
  let currentDate = start;
  while (currentDate <= end) {
    dateArray.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dateArray;
}

/**
 * Convert a date from one timezone to another
 */
export function convertTimezone(
  date: DateInput, 
  fromTimezone: string, 
  toTimezone: string
): Date {
  const zonedDate = toZonedTime(toDate(date), fromTimezone);
  return toZonedTime(fromZonedTime(zonedDate, fromTimezone), toTimezone);
}

/**
 * Get timezone offset in minutes for a specific timezone
 */
export function getTimezoneOffsetMinutes(timezone: string, date = new Date()): number {
  return getTimezoneOffset(timezone, date) / 60000; // Convert ms to minutes
}

/**
 * Format a date with timezone information (e.g., "2023-01-01 12:00:00 GMT+0200")
 */
export function formatWithTimezone(
  input: DateInput, 
  timezone = DEFAULT_TIMEZONE
): string {
  const date = toDate(input);
  return formatInTimeZone(date, timezone, "yyyy-MM-dd HH:mm:ss zzz");
} 