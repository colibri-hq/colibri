import type {
  Conflict,
  MetadataSource,
  PublicationDate,
  PublicationInfoInput,
  ReconciledField,
} from "./types.js";

/**
 * Normalizes and validates publication dates from various formats
 */
export class DateReconciler {
  /**
   * Normalize a date string or object into a standardized PublicationDate
   */
  normalizeDate(input: string | PublicationDate): PublicationDate {
    if (typeof input === "object" && input !== null) {
      return this.validatePublicationDate(input);
    }

    return this.parseDateString(input);
  }

  /**
   * Reconcile multiple publication dates using conflict resolution rules
   */
  reconcileDates(inputs: PublicationInfoInput[]): ReconciledField<PublicationDate> {
    if (inputs.length === 0) {
      throw new Error("No publication dates to reconcile");
    }

    if (inputs.length === 1) {
      const normalized = this.normalizeDate(inputs[0].date || "");
      return {
        value: normalized,
        confidence: this.calculateDateConfidence(normalized, inputs[0].source),
        sources: [inputs[0].source],
        reasoning: "Single source",
      };
    }

    // Normalize all dates
    const normalizedDates = inputs.map((input) => ({
      date: this.normalizeDate(input.date || ""),
      source: input.source,
    }));

    // Group by precision and reliability
    const conflicts: Conflict[] = [];
    const candidates = normalizedDates
      .filter((item) => item.date.precision !== "unknown")
      .sort((a, b) => {
        // Sort by precision (more specific first), then by source reliability
        const precisionOrder = { day: 3, month: 2, year: 1, unknown: 0 };
        const precisionDiff = precisionOrder[b.date.precision] - precisionOrder[a.date.precision];
        if (precisionDiff !== 0) return precisionDiff;

        return b.source.reliability - a.source.reliability;
      });

    if (candidates.length === 0) {
      // All dates are unknown precision, return the first one
      return {
        value: normalizedDates[0].date,
        confidence: 0.1,
        sources: [normalizedDates[0].source],
        reasoning: "All dates have unknown precision, using first available",
      };
    }

    // Check for conflicts
    const uniqueDates = new Map<string, (typeof candidates)[0]>();
    for (const candidate of candidates) {
      const key = this.getDateKey(candidate.date);
      if (!uniqueDates.has(key)) {
        uniqueDates.set(key, candidate);
      } else {
        // Found a conflict
        const existing = uniqueDates.get(key)!;
        if (existing.source.reliability < candidate.source.reliability) {
          uniqueDates.set(key, candidate);
        }
      }
    }

    // If we have multiple different dates, record conflicts
    if (uniqueDates.size > 1) {
      conflicts.push({
        field: "publication_date",
        values: Array.from(uniqueDates.values()).map((item) => ({
          value: item.date,
          source: item.source,
        })),
        resolution: "Preferred most specific date from most reliable source",
      });
    }

    // Select the best candidate (first in sorted order)
    const bestCandidate = candidates[0];
    const confidence = this.calculateDateConfidence(bestCandidate.date, bestCandidate.source);

    return {
      value: bestCandidate.date,
      confidence,
      sources: [bestCandidate.source],
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      reasoning:
        conflicts.length > 0
          ? "Resolved conflict by preferring most specific date from most reliable source"
          : "Selected most specific date from most reliable source",
    };
  }

  /**
   * Parse various date string formats into PublicationDate
   */
  private parseDateString(dateStr: string): PublicationDate {
    // Try different date patterns
    const _patterns = [
      // YYYY-MM-DD or YYYY/MM/DD
      /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/,
      // MM-DD-YYYY or MM/DD/YYYY
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/,
      // DD-MM-YYYY or DD/MM/YYYY (European format)
      /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/,
      // YYYY-MM or YYYY/MM
      /^(\d{4})[-\/](\d{1,2})$/,
      // MM-YYYY or MM/YYYY
      /^(\d{1,2})[-\/](\d{4})$/,
      // Just year
      /^(\d{4})$/,
    ];

    // Try ISO date format first
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return {
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        raw: dateStr,
        precision: "day",
      };
    }

    // Try year-month format
    const yearMonthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
    if (yearMonthMatch) {
      const [, year, month] = yearMonthMatch;
      return {
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        raw: dateStr,
        precision: "month",
      };
    }

    // Try just year
    const yearMatch = dateStr.match(/^(\d{4})$/);
    if (yearMatch) {
      const [, year] = yearMatch;
      return { year: parseInt(year, 10), raw: dateStr, precision: "year" };
    }

    // Try to extract year from longer strings
    const yearInString = dateStr.match(/\b(19|20)\d{2}\b/);
    if (yearInString) {
      return { year: parseInt(yearInString[0], 10), raw: dateStr, precision: "year" };
    }

    // Fallback - return unknown precision
    return { raw: dateStr, precision: "unknown" };
  }

  /**
   * Validate and normalize a PublicationDate object
   */
  private validatePublicationDate(date: PublicationDate): PublicationDate {
    const result: PublicationDate = { raw: date.raw, precision: date.precision || "unknown" };

    // Validate year
    if (date.year !== undefined) {
      const year = Math.floor(date.year);
      if (year >= 1000 && year <= new Date().getFullYear() + 10) {
        result.year = year;
        if (result.precision === "unknown") {
          result.precision = "year";
        }
      }
    }

    // Validate month
    if (date.month !== undefined && result.year !== undefined) {
      const month = Math.floor(date.month);
      if (month >= 1 && month <= 12) {
        result.month = month;
        if (result.precision === "year") {
          result.precision = "month";
        }
      }
    }

    // Validate day
    if (date.day !== undefined && result.month !== undefined) {
      const day = Math.floor(date.day);
      const daysInMonth = new Date(result.year || 2000, result.month, 0).getDate();
      if (day >= 1 && day <= daysInMonth) {
        result.day = day;
        result.precision = "day";
      }
    }

    // If month was invalid, reset precision
    if (date.month !== undefined && result.month === undefined && result.precision !== "year") {
      result.precision = "year";
    }

    return result;
  }

  /**
   * Generate a key for date comparison
   */
  private getDateKey(date: PublicationDate): string {
    const parts = [];
    if (date.year) parts.push(date.year.toString());
    if (date.month) parts.push(date.month.toString().padStart(2, "0"));
    if (date.day) parts.push(date.day.toString().padStart(2, "0"));
    return parts.join("-") || "unknown";
  }

  /**
   * Calculate confidence score for a publication date
   */
  private calculateDateConfidence(date: PublicationDate, source: MetadataSource): number {
    let confidence = source.reliability;

    // Adjust based on precision
    switch (date.precision) {
      case "day":
        confidence *= 1.0;
        break;
      case "month":
        confidence *= 0.9;
        break;
      case "year":
        confidence *= 0.8;
        break;
      case "unknown":
        confidence *= 0.3;
        break;
    }

    // Adjust based on date validity
    if (date.year && date.year > 0 && date.year <= new Date().getFullYear() + 10) {
      confidence *= 1.0;
    } else {
      confidence *= 0.5;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
