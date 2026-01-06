/**
 * Date parsing utilities for metadata
 *
 * Handles various date formats commonly found in book metadata:
 * - Full dates: YYYY-MM-DD, YYYY/MM/DD
 * - Partial dates: YYYY-MM, YYYY
 * - Written formats: "January 2020", "Jan 2020", "2020"
 * - Circa dates: "c. 1920", "circa 1920", "ca. 1920"
 * - Ranges: "1920-1925" (extracts first year)
 * - ISO 8601: "2020-01-15T00:00:00Z"
 */

/**
 * Parsed date structure
 */
export interface ParsedDate {
  /** Full year (e.g., 2020) */
  year: number;
  /** Month (1-12), if available */
  month?: number;
  /** Day of month (1-31), if available */
  day?: number;
  /** Original unparsed string */
  original: string;
  /** Whether the date is approximate (circa) */
  isApproximate?: boolean;
}

/**
 * Month name mappings (English)
 */
const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

/**
 * Patterns for circa/approximate dates
 */
const CIRCA_PATTERNS = /^(c\.?|ca\.?|circa|approx\.?|approximately)\s*/i;

/**
 * Parse a publication date string into structured form
 *
 * Handles many common formats:
 * - "2020" -> { year: 2020 }
 * - "2020-06" -> { year: 2020, month: 6 }
 * - "2020-06-15" -> { year: 2020, month: 6, day: 15 }
 * - "June 2020" -> { year: 2020, month: 6 }
 * - "Jun 15, 2020" -> { year: 2020, month: 6, day: 15 }
 * - "c. 1920" -> { year: 1920, isApproximate: true }
 * - "1920-1925" -> { year: 1920 } (range, takes first)
 *
 * @param dateStr - Date string to parse
 * @returns Parsed date or null if unparseable
 */
export function parsePublicationDate(dateStr: string): ParsedDate | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const original = dateStr.trim();
  if (!original) return null;

  let working = original;
  let isApproximate = false;

  // Check for circa/approximate indicators
  if (CIRCA_PATTERNS.test(working)) {
    isApproximate = true;
    working = working.replace(CIRCA_PATTERNS, "").trim();
  }

  // Try ISO 8601 full format first (YYYY-MM-DDTHH:mm:ss)
  const isoMatch = working.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T[\d:]+(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/,
  );
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (isValidDate(year, month, day)) {
      return { year, month, day, original, isApproximate };
    }
    // Date pattern matched but validation failed - return null for invalid dates
    return null;
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const fullDateMatch = working.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10);
    const day = parseInt(fullDateMatch[3], 10);

    if (isValidDate(year, month, day)) {
      return { year, month, day, original, isApproximate };
    }
    // Date pattern matched but validation failed - return null for invalid dates
    return null;
  }

  // Try YYYY-MM or YYYY/MM
  const yearMonthMatch = working.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = parseInt(yearMonthMatch[1], 10);
    const month = parseInt(yearMonthMatch[2], 10);

    if (isValidYear(year) && month >= 1 && month <= 12) {
      return { year, month, original, isApproximate };
    }
  }

  // Try "Month YYYY" or "Month DD, YYYY" or "DD Month YYYY"
  const writtenDateResult = parseWrittenDate(working, original, isApproximate);
  if (writtenDateResult) {
    return writtenDateResult;
  }

  // Try year-only (YYYY) - including from ranges like "1920-1925"
  const yearMatch = working.match(/\b(\d{4})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (isValidYear(year)) {
      return { year, original, isApproximate };
    }
  }

  return null;
}

/**
 * Parse written date formats like "June 2020" or "Jun 15, 2020"
 */
function parseWrittenDate(
  working: string,
  original: string,
  isApproximate: boolean,
): ParsedDate | null {
  const lower = working.toLowerCase();

  // "Month YYYY"
  const monthYearMatch = lower.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTH_NAMES[monthYearMatch[1]];
    const year = parseInt(monthYearMatch[2], 10);

    if (month && isValidYear(year)) {
      return { year, month, original, isApproximate };
    }
  }

  // "Month DD, YYYY" or "Month DD YYYY"
  const monthDayYearMatch = lower.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYearMatch) {
    const month = MONTH_NAMES[monthDayYearMatch[1]];
    const day = parseInt(monthDayYearMatch[2], 10);
    const year = parseInt(monthDayYearMatch[3], 10);

    if (month && isValidDate(year, month, day)) {
      return { year, month, day, original, isApproximate };
    }
  }

  // "DD Month YYYY"
  const dayMonthYearMatch = lower.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (dayMonthYearMatch) {
    const day = parseInt(dayMonthYearMatch[1], 10);
    const month = MONTH_NAMES[dayMonthYearMatch[2]];
    const year = parseInt(dayMonthYearMatch[3], 10);

    if (month && isValidDate(year, month, day)) {
      return { year, month, day, original, isApproximate };
    }
  }

  return null;
}

/**
 * Extract just the year from a date string
 *
 * More lenient than parsePublicationDate - extracts the first 4-digit year found.
 *
 * @param dateStr - Date string
 * @returns Year number or null if not found
 */
export function extractYear(dateStr: string): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const match = dateStr.match(/\b(\d{4})\b/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (isValidYear(year)) {
      return year;
    }
  }

  return null;
}

/**
 * Convert a ParsedDate to a JavaScript Date object
 *
 * @param parsed - Parsed date
 * @returns Date object (using first day of month/year if not specified)
 */
export function toDate(parsed: ParsedDate): Date {
  const month = parsed.month ?? 1;
  const day = parsed.day ?? 1;

  // Note: JavaScript months are 0-indexed
  return new Date(parsed.year, month - 1, day);
}

/**
 * Format a ParsedDate to a string
 *
 * @param parsed - Parsed date
 * @param format - Output format: 'iso' (YYYY-MM-DD), 'year-only' (YYYY), or 'full' (varies by available data)
 * @returns Formatted date string
 */
export function formatDate(
  parsed: ParsedDate,
  format: "iso" | "year-only" | "full" = "full",
): string {
  const prefix = parsed.isApproximate ? "c. " : "";

  switch (format) {
    case "year-only":
      return `${prefix}${parsed.year}`;

    case "iso":
      if (parsed.month && parsed.day) {
        return `${prefix}${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
      } else if (parsed.month) {
        return `${prefix}${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
      } else {
        return `${prefix}${parsed.year}`;
      }

    case "full":
    default:
      if (parsed.month && parsed.day) {
        return `${prefix}${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
      } else if (parsed.month) {
        return `${prefix}${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
      } else {
        return `${prefix}${parsed.year}`;
      }
  }
}

/**
 * Parse a date string directly to a JavaScript Date object
 *
 * This is a convenience function that combines parsePublicationDate and toDate.
 * For more control, use parsePublicationDate directly.
 *
 * @param dateStr - Date string to parse
 * @returns Date object or undefined if unparseable
 */
export function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  const parsed = parsePublicationDate(dateStr);
  if (parsed) {
    return toDate(parsed);
  }

  // Fallback: try native Date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return undefined;
}

/**
 * Check if a year is reasonable for a publication date
 */
function isValidYear(year: number): boolean {
  // Books from before 1000 AD are extremely rare, and future dates are invalid
  return year >= 1000 && year <= new Date().getFullYear() + 5;
}

/**
 * Check if a date is valid
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (!isValidYear(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}
