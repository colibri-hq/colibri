/**
 * Similarity calculation utilities for metadata reconciliation
 *
 * This module provides shared similarity algorithms used by
 * duplicate detection, series analysis, and other reconciliation tasks.
 */

import type { PublicationDate, Publisher, Series } from "./types.js";

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance between the strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate string similarity using normalized Levenshtein distance
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score from 0 to 1 (1 = identical)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

/**
 * Calculate Jaccard similarity between two arrays of strings
 *
 * @param arr1 - First array of strings
 * @param arr2 - Second array of strings
 * @returns Similarity score from 0 to 1 (1 = identical sets)
 */
export function calculateArraySimilarity(arr1: string[], arr2: string[]): number {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;

  const set1 = new Set(arr1.map((s) => s.toLowerCase().trim()));
  const set2 = new Set(arr2.map((s) => s.toLowerCase().trim()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Calculate ISBN similarity (exact match only)
 *
 * @param isbn1 - First array of ISBNs
 * @param isbn2 - Second array of ISBNs
 * @returns 1 if any ISBNs match, 0 otherwise
 */
export function calculateIsbnSimilarity(isbn1?: string[], isbn2?: string[]): number {
  if (!isbn1 || !isbn2 || isbn1.length === 0 || isbn2.length === 0) return 0;

  // Normalize ISBNs (remove hyphens, spaces)
  const normalize = (isbn: string) => isbn.replace(/[-\s]/g, "");
  const set1 = new Set(isbn1.map(normalize));
  const set2 = new Set(isbn2.map(normalize));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  return intersection.size > 0 ? 1 : 0; // Exact match or no match
}

/**
 * Calculate publication date similarity
 *
 * @param date1 - First publication date
 * @param date2 - Second publication date
 * @returns Similarity score from 0 to 1
 */
export function calculateDateSimilarity(date1?: PublicationDate, date2?: PublicationDate): number {
  if (!date1 || !date2) return 0;

  // Compare years first (most important)
  if (date1.year && date2.year) {
    if (date1.year === date2.year) {
      // Same year, check month if available
      if (date1.month && date2.month) {
        if (date1.month === date2.month) {
          // Same month, check day if available
          if (date1.day && date2.day) {
            return date1.day === date2.day ? 1 : 0.8;
          }
          return 0.9; // Same year and month
        }
        return 0.7; // Same year, different month
      }
      return 0.8; // Same year, no month info
    }
    // Different years - check if close
    const yearDiff = Math.abs(date1.year - date2.year);
    if (yearDiff <= 1) return 0.6; // Within 1 year
    if (yearDiff <= 2) return 0.4; // Within 2 years
    return 0; // Too different
  }

  return 0;
}

/**
 * Calculate publisher similarity based on name
 *
 * @param pub1 - First publisher
 * @param pub2 - Second publisher
 * @returns Similarity score from 0 to 1
 */
export function calculatePublisherSimilarity(pub1?: Publisher, pub2?: Publisher): number {
  if (!pub1 || !pub2) return 0;
  return calculateStringSimilarity(pub1.name, pub2.name);
}

/**
 * Calculate series similarity, comparing names and volumes
 *
 * @param series1 - First array of series
 * @param series2 - Second array of series
 * @returns Maximum similarity score between any pair of series
 */
export function calculateSeriesSimilarity(series1?: Series[], series2?: Series[]): number {
  if (
    !series1 ||
    !series2 ||
    !Array.isArray(series1) ||
    !Array.isArray(series2) ||
    series1.length === 0 ||
    series2.length === 0
  ) {
    return 0;
  }

  let maxSimilarity = 0;
  for (const s1 of series1) {
    for (const s2 of series2) {
      const nameSimilarity = calculateStringSimilarity(s1.name, s2.name);
      const volumeSimilarity = s1.volume === s2.volume ? 1 : 0;
      const similarity = nameSimilarity * 0.8 + volumeSimilarity * 0.2;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }

  return maxSimilarity;
}
