import type { Database } from "../database.js";
import type {
  DuplicateCheckResult,
  ExtractedMetadata,
  IngestionWork,
  IngestionEdition,
  IngestionAsset,
} from "./types.js";
import {
  findAssetByChecksum,
  findEditionByISBN,
  findEditionByASIN,
  findWorksByTitle,
  findSimilarWorks,
} from "../resources/work.js";

/**
 * Perform comprehensive duplicate detection for an ebook file.
 *
 * Detection is performed in priority order:
 * 1. Exact asset match (by checksum) - highest priority
 * 2. ISBN match - exact identifier match
 * 3. ASIN match - exact identifier match
 * 4. Title + creator match - exact title match with same author
 * 5. Similar title - fuzzy title matching
 *
 * @param database - Database connection
 * @param checksum - SHA-256 checksum of the file
 * @param metadata - Extracted metadata from the ebook
 * @returns Duplicate check result
 */
export async function detectDuplicates(
  database: Database,
  checksum: Uint8Array,
  metadata: ExtractedMetadata,
): Promise<DuplicateCheckResult> {
  // 1. Check for exact asset match (same file)
  const exactMatch = await checkExactAsset(database, checksum);
  if (exactMatch.hasDuplicate) {
    return exactMatch;
  }

  // 2. Check for ISBN match
  const isbnMatch = await checkISBN(database, metadata);
  if (isbnMatch.hasDuplicate) {
    return isbnMatch;
  }

  // 3. Check for ASIN match
  const asinMatch = await checkASIN(database, metadata);
  if (asinMatch.hasDuplicate) {
    return asinMatch;
  }

  // 4. Check for exact title match with same creator
  const titleMatch = await checkExactTitle(database, metadata);
  if (titleMatch.hasDuplicate) {
    return titleMatch;
  }

  // 5. Check for similar titles (fuzzy matching)
  const similarMatch = await checkSimilarTitles(database, metadata);
  if (similarMatch.hasDuplicate) {
    return similarMatch;
  }

  // No duplicates found
  return { hasDuplicate: false, confidence: 0 };
}

/**
 * Convert a query result to IngestionWork
 */
function toIngestionWork(row: {
  id: string;
  main_edition_id?: string | null;
  created_at?: Date;
  updated_at?: Date | null;
}): IngestionWork {
  return {
    id: row.id,
    main_edition_id: row.main_edition_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Convert a query result to IngestionEdition
 */
function toIngestionEdition(row: {
  id: string;
  work_id: string;
  title: string;
  isbn_10?: string | null;
  isbn_13?: string | null;
  asin?: string | null;
  language?: string | null;
  pages?: number | null;
  synopsis?: string | null;
}): IngestionEdition {
  return {
    id: row.id,
    work_id: row.work_id,
    title: row.title,
    isbn_10: row.isbn_10,
    isbn_13: row.isbn_13,
    asin: row.asin,
    language: row.language,
    pages: row.pages,
    synopsis: row.synopsis,
  };
}

/**
 * Convert a query result to IngestionAsset
 */
function toIngestionAsset(row: {
  id: string;
  edition_id: string;
  checksum: Buffer;
  filename: string;
  media_type: string;
  size: number;
}): IngestionAsset {
  return {
    id: row.id,
    edition_id: row.edition_id,
    checksum: row.checksum,
    filename: row.filename,
    media_type: row.media_type,
    size: row.size,
  };
}

/**
 * Check if an asset with the same checksum already exists
 */
async function checkExactAsset(
  database: Database,
  checksum: Uint8Array,
): Promise<DuplicateCheckResult> {
  const existingAsset = await findAssetByChecksum(database, checksum);

  if (existingAsset) {
    // Get the associated edition and work
    const edition = await database
      .selectFrom("edition")
      .innerJoin("work", "work.id", "edition.work_id")
      .selectAll("edition")
      .select("work.id as work_id")
      .where("edition.id", "=", existingAsset.edition_id)
      .executeTakeFirst();

    const work = edition
      ? await database
          .selectFrom("work")
          .selectAll()
          .where("id", "=", edition.work_id)
          .executeTakeFirst()
      : undefined;

    return {
      hasDuplicate: true,
      type: "exact-asset",
      existingAsset: toIngestionAsset(existingAsset as any),
      existingEdition: edition ? toIngestionEdition(edition as any) : undefined,
      existingWork: work ? toIngestionWork(work as any) : undefined,
      confidence: 1.0,
      description: "This exact file already exists in the library",
    };
  }

  return { hasDuplicate: false, confidence: 0 };
}

/**
 * Check if an edition with the same ISBN exists
 */
async function checkISBN(
  database: Database,
  metadata: ExtractedMetadata,
): Promise<DuplicateCheckResult> {
  const isbns =
    metadata.identifiers?.filter((id) => id.type === "isbn").map((id) => id.value) ?? [];

  if (isbns.length === 0) {
    return { hasDuplicate: false, confidence: 0 };
  }

  for (const isbn of isbns) {
    const existing = await findEditionByISBN(database, isbn);

    if (existing) {
      const work = await database
        .selectFrom("work")
        .selectAll()
        .where("id", "=", existing.work_id)
        .executeTakeFirst();

      // Determine if this is the same edition or a different format
      const isSameTitle =
        existing.title?.toLowerCase().trim() === metadata.title?.toLowerCase().trim();

      return {
        hasDuplicate: true,
        type: isSameTitle ? "same-isbn" : "different-format",
        existingEdition: toIngestionEdition(existing as any),
        existingWork: work ? toIngestionWork(work as any) : undefined,
        confidence: 1.0,
        description: isSameTitle
          ? `An edition with ISBN ${isbn} already exists`
          : `Found a different edition (ISBN: ${isbn}) of this work`,
      };
    }
  }

  return { hasDuplicate: false, confidence: 0 };
}

/**
 * Check if an edition with the same ASIN exists
 */
async function checkASIN(
  database: Database,
  metadata: ExtractedMetadata,
): Promise<DuplicateCheckResult> {
  const asins =
    metadata.identifiers?.filter((id) => id.type === "asin").map((id) => id.value) ?? [];

  if (asins.length === 0) {
    return { hasDuplicate: false, confidence: 0 };
  }

  for (const asin of asins) {
    const existing = await findEditionByASIN(database, asin);

    if (existing) {
      const work = await database
        .selectFrom("work")
        .selectAll()
        .where("id", "=", existing.work_id)
        .executeTakeFirst();

      return {
        hasDuplicate: true,
        type: "same-asin",
        existingEdition: toIngestionEdition(existing as any),
        existingWork: work ? toIngestionWork(work as any) : undefined,
        confidence: 1.0,
        description: `An edition with ASIN ${asin} already exists`,
      };
    }
  }

  return { hasDuplicate: false, confidence: 0 };
}

/**
 * Check for exact title match with the same creator
 */
async function checkExactTitle(
  database: Database,
  metadata: ExtractedMetadata,
): Promise<DuplicateCheckResult> {
  if (!metadata.title) {
    return { hasDuplicate: false, confidence: 0 };
  }

  // Get the primary creator name (first author)
  const primaryCreator = metadata.contributors?.find((c) => c.roles.includes("aut"))?.name;

  const matches = await findWorksByTitle(
    database,
    metadata.title,
    primaryCreator ? { creatorName: primaryCreator, limit: 1 } : { limit: 1 },
  );

  if (matches.length > 0) {
    const match = matches[0];
    const work = await database
      .selectFrom("work")
      .selectAll()
      .where("id", "=", match.work_id)
      .executeTakeFirst();

    return {
      hasDuplicate: true,
      type: "different-format",
      existingEdition: toIngestionEdition(match as any),
      existingWork: work ? toIngestionWork(work as any) : undefined,
      confidence: 0.95,
      description: `Found existing work "${match.title}" by the same author`,
    };
  }

  return { hasDuplicate: false, confidence: 0 };
}

/**
 * Check for similar titles using fuzzy matching
 */
async function checkSimilarTitles(
  database: Database,
  metadata: ExtractedMetadata,
): Promise<DuplicateCheckResult> {
  if (!metadata.title) {
    return { hasDuplicate: false, confidence: 0 };
  }

  // Get the primary creator name
  const primaryCreator = metadata.contributors?.find((c) => c.roles.includes("aut"))?.name;

  try {
    const matches = await findSimilarWorks(
      database,
      metadata.title,
      primaryCreator
        ? { creatorName: primaryCreator, limit: 1, minSimilarity: 0.6 }
        : { limit: 1, minSimilarity: 0.6 },
    );

    if (matches.length > 0) {
      const match = matches[0];
      const similarity = (match as any).title_similarity ?? 0.6;

      // Only report as duplicate if similarity is high enough
      if (similarity >= 0.6) {
        const work = await database
          .selectFrom("work")
          .selectAll()
          .where("id", "=", match.work_id)
          .executeTakeFirst();

        return {
          hasDuplicate: true,
          type: "similar-title",
          existingEdition: toIngestionEdition(match as any),
          existingWork: work ? toIngestionWork(work as any) : undefined,
          confidence: similarity,
          description: `Found similar work "${match.title}" (${Math.round(similarity * 100)}% match)`,
        };
      }
    }
  } catch (error) {
    // If pg_trgm extension is not available, similarity function will fail
    // This is expected and we should fall back to no match
    console.warn("Fuzzy title matching unavailable:", error);
  }

  return { hasDuplicate: false, confidence: 0 };
}

/**
 * Utility to check if two editions might be different formats of the same work
 * (e.g., hardcover vs paperback, ebook vs audiobook)
 */
export function isPossibleFormatVariant(
  existingEdition: {
    isbn_10?: string | null;
    isbn_13?: string | null;
    asin?: string | null;
    title: string;
  },
  metadata: ExtractedMetadata,
): boolean {
  // Different ISBNs but same/similar title suggests format variant
  const hasNewIsbn = metadata.identifiers?.some((id) => id.type === "isbn");
  const existingHasIsbn = existingEdition.isbn_10 || existingEdition.isbn_13;

  if (hasNewIsbn && existingHasIsbn) {
    const newIsbns = metadata.identifiers
      ?.filter((id) => id.type === "isbn")
      .map((id) => id.value.replace(/[-\s]/g, ""));

    const existingIsbns = [existingEdition.isbn_10, existingEdition.isbn_13].filter(Boolean);

    // If ISBNs are different, it's likely a format variant
    const hasMatch = newIsbns?.some((isbn) => existingIsbns.some((existing) => existing === isbn));

    return !hasMatch;
  }

  return false;
}
