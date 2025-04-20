import { GLEntry } from "./types";
import { isValidDate, toDate, formatCustom } from "@/lib/utils/date-utils";

// Helper to check if a value might be a date
const mightBeDate = (value: unknown): boolean => {
  try {
    if (value instanceof Date) return true;
    if (typeof value === 'string') {
      // Only consider strings that match common date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{2}[-/]\d{2}[-/]\d{4}/;
      return dateRegex.test(value) && isValidDate(value);
    }
    return false;
  } catch {
    return false;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "N/A";

  // Handle numeric values first
  if (typeof value === 'number') {
    return String(value);
  }

  // Handle Date objects and date strings
  if (mightBeDate(value)) {
    try {
      const date = toDate(value);
      return formatCustom(date, "PPP"); // Format like "Apr 29, 2023"
    } catch {
      // If toDate fails, continue with other format options
    }
  }

  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const parseErrors = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any,
): Array<{ row?: GLEntry; message: string }> => {
  if (typeof errors === "string") {
    try {
      const parsed = JSON.parse(errors);
      return Array.isArray(parsed) ? parsed : [{ message: errors }];
    } catch {
      return [{ message: errors }];
    }
  }
  if (Array.isArray(errors)) {
    return errors.map((error) => {
      if (typeof error === "string") {
        return { message: error };
      }
      return error;
    });
  }
  return [];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paginateData = (data: any[], page: number, size: number) => {
  const start = (page - 1) * size;
  const end = start + size;
  return data.slice(start, end);
};
