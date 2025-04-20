/**
 * @deprecated - Use date-utils.ts instead
 */

import { formatRelativeTime as formatRelativeTimeFromUtils } from "./date-utils";

/**
 * Formats a date to a relative time string like "3 hours ago" or "2 days ago"
 * @deprecated - Use date-utils.ts instead
 */
export function formatRelativeTime(date: Date): string {
  return formatRelativeTimeFromUtils(date);
}
