import { subtle } from "node:crypto";
import type { Database } from "../database.js";
import type { ContributionRole, JsonObject } from "../schema.js";
import type {
  IngestWorkOptions,
  IngestWorkResult,
  ConfirmAction,
  ExtractedMetadata,
  DuplicateCheckResult,
  IngestionWork,
  IngestionEdition,
  IngestionAsset,
  BatchImportOptions,
  BatchImportResult,
} from "./types.js";
import { loadMetadata } from "../ebooks/index.js";
import { createAsset } from "../resources/asset.js";
import {
  createCreator,
  findCreatorByName,
  findSimilarCreators,
  createContribution,
} from "../resources/creator.js";
import { createImage } from "../resources/image.js";
import { loadLanguage } from "../resources/language.js";
import {
  createPendingIngestion,
  getPendingIngestion,
  deletePendingIngestion,
  deleteExpiredIngestions,
} from "../resources/pending-ingestion.js";
import {
  createPublisher,
  findPublisherByName,
  findSimilarPublishers,
} from "../resources/publisher.js";
import { findOrCreateSeries, addWorkToSeries } from "../resources/series.js";
import { findOrCreateTags, addTagsToWork } from "../resources/tag.js";
import { createWork, updateWork, createEdition } from "../resources/work.js";
import { detectDuplicates } from "./detect-duplicates.js";
import { enrichMetadata, mergeEnrichedMetadata } from "./enrich.js";
import { normalizeCreatorName, normalizePublisherName } from "./normalize.js";

// Re-export types and functions
export * from "./types.js";
export { detectDuplicates, isPossibleFormatVariant } from "./detect-duplicates.js";
export { normalizeCreatorName, normalizePublisherName } from "./normalize.js";
export { enrichMetadata, mergeEnrichedMetadata, type EnrichMetadataOptions } from "./enrich.js";
export {
  createPendingIngestion,
  getPendingIngestion,
  deletePendingIngestion,
  deleteExpiredIngestions,
  getPendingIngestionsForUser,
  type PendingIngestion,
  type CreatePendingIngestionData,
} from "../resources/pending-ingestion.js";

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

// Database-backed pending ingestions have replaced in-memory storage.
// Cleanup is now performed opportunistically when accessing pending ingestions.

/**
 * Ingest an ebook file into the library.
 *
 * This function handles the complete ingestion workflow:
 * 1. Extract metadata from the ebook
 * 2. Check for duplicates
 * 3. Create/find creators and publishers
 * 4. Create work, edition, and asset records
 * 5. Handle cover image processing
 *
 * @param database - Database connection
 * @param file - The ebook file to ingest
 * @param options - Ingestion options
 * @returns The result of the ingestion operation
 */
export async function ingestWork(
  database: Database,
  file: File,
  options: IngestWorkOptions = {},
): Promise<IngestWorkResult> {
  const warnings: string[] = [];
  let enrichmentSources: string[] | undefined;
  let enrichmentConfidence: Record<string, number> | undefined;

  // Calculate file checksum
  const fileBytes = await file.bytes();
  const checksum = new Uint8Array(await subtle.digest("SHA-256", fileBytes));

  // Extract metadata from the ebook
  let metadata: ExtractedMetadata;
  try {
    const rawMetadata = await loadMetadata(file);
    metadata = {
      title: rawMetadata.title,
      sortingKey: rawMetadata.sortingKey,
      synopsis: rawMetadata.synopsis,
      language: rawMetadata.language,
      datePublished: rawMetadata.datePublished,
      numberOfPages: rawMetadata.numberOfPages,
      legalInformation: rawMetadata.legalInformation,
      identifiers: rawMetadata.identifiers,
      contributors: rawMetadata.contributors,
      cover: rawMetadata.cover,
      properties: rawMetadata.properties,
      series: rawMetadata.series,
      subjects: rawMetadata.tags,
    };
  } catch (error) {
    throw new Error(`Failed to extract metadata from file: ${error}`, { cause: error });
  }

  // Enrich metadata if requested
  if (options.enrich) {
    try {
      const enrichmentOptions: {
        fillMissingOnly: boolean;
        timeout: number;
        minConfidence: number;
        providers?: string[];
      } = { fillMissingOnly: true, timeout: 30000, minConfidence: 0.6 };
      if (options.enrichProviders) {
        enrichmentOptions.providers = options.enrichProviders;
      }

      const enrichmentResult = await enrichMetadata(metadata, enrichmentOptions);

      // Merge enriched data into metadata using the helper
      metadata = mergeEnrichedMetadata(metadata, enrichmentResult);

      // Track enrichment sources and confidence
      if (enrichmentResult.sources.length > 0) {
        enrichmentSources = enrichmentResult.sources;
        enrichmentConfidence = enrichmentResult.confidence;
        warnings.push(`Enriched metadata from: ${enrichmentResult.sources.join(", ")}`);
      }
    } catch (error) {
      warnings.push(`Metadata enrichment failed: ${error}`);
      // Continue with original metadata
    }
  }

  // Check for duplicates
  const duplicateInfo = await detectDuplicates(database, checksum, metadata);

  if (duplicateInfo.hasDuplicate) {
    // Handle based on duplicate type and options
    const action = determineAction(duplicateInfo, options);

    switch (action) {
      case "skip":
        return {
          status: "skipped",
          work: duplicateInfo.existingWork,
          edition: duplicateInfo.existingEdition,
          asset: duplicateInfo.existingAsset,
          duplicateInfo,
          warnings: [duplicateInfo.description ?? "Duplicate found, skipping"],
          enrichmentSources,
          enrichmentConfidence,
        };

      case "prompt":
        // Store for later confirmation in database
        if (!options.userId) {
          throw new Error("userId is required for pending confirmations");
        }
        if (!options.uploadId) {
          throw new Error("uploadId is required for pending confirmations");
        }
        if (!options.s3Key) {
          throw new Error("s3Key is required for pending confirmations");
        }

        const pending = await createPendingIngestion(database, {
          userId: options.userId,
          uploadId: options.uploadId,
          s3Key: options.s3Key,
          checksum,
          extractedMetadata: metadata,
          duplicateInfo,
        });

        return {
          status: "needs-confirmation",
          duplicateInfo,
          pendingId: pending.id,
          warnings: [duplicateInfo.description ?? "Duplicate detected, awaiting confirmation"],
          enrichmentSources,
          enrichmentConfidence,
        };

      case "add-edition":
        // Continue to add as new edition of existing work
        if (duplicateInfo.existingWork) {
          return await createNewEdition(
            database,
            duplicateInfo.existingWork.id,
            file,
            checksum,
            metadata,
            options,
            warnings,
            enrichmentSources,
            enrichmentConfidence,
          );
        }
        // Fall through to create new work if no existing work
        break;
    }
  }

  // No duplicate or creating new - proceed with full ingestion
  return await createNewWork(
    database,
    file,
    checksum,
    metadata,
    options,
    warnings,
    enrichmentSources,
    enrichmentConfidence,
  );
}

/**
 * Confirm a pending ingestion after user review.
 *
 * @param database - Database connection
 * @param pendingId - ID of the pending ingestion
 * @param action - Action to take
 * @param file - The file to ingest (must be provided again as it's not stored in DB)
 * @returns The result of the ingestion operation
 */
export async function confirmIngestion(
  database: Database,
  pendingId: string,
  action: ConfirmAction,
  file?: File,
): Promise<IngestWorkResult> {
  // Opportunistically clean up expired records
  await deleteExpiredIngestions(database);

  // Retrieve pending ingestion from database
  const pending = await getPendingIngestion(database, pendingId);
  if (!pending) {
    throw new Error(`Pending ingestion not found: ${pendingId}`);
  }

  // Remove from database after retrieval
  await deletePendingIngestion(database, pendingId);

  const warnings: string[] = [];

  switch (action) {
    case "skip":
      return {
        status: "skipped",
        work: pending.duplicateInfo.existingWork,
        edition: pending.duplicateInfo.existingEdition,
        duplicateInfo: pending.duplicateInfo,
        warnings: ["Skipped by user"],
      };

    case "create-work":
      if (!file) {
        throw new Error("File is required to create work");
      }
      return await createNewWork(
        database,
        file,
        pending.checksum,
        pending.extractedMetadata,
        { userId: pending.userId },
        warnings,
      );

    case "create-edition":
      if (!pending.duplicateInfo.existingWork) {
        throw new Error("Cannot create edition: no existing work found");
      }
      if (!file) {
        throw new Error("File is required to create edition");
      }
      return await createNewEdition(
        database,
        pending.duplicateInfo.existingWork.id,
        file,
        pending.checksum,
        pending.extractedMetadata,
        { userId: pending.userId },
        warnings,
      );

    case "update-metadata":
      // TODO: Implement metadata update
      throw new Error("Metadata update not yet implemented");

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Determine the action to take based on duplicate info and options
 */
function determineAction(
  duplicateInfo: DuplicateCheckResult,
  options: IngestWorkOptions,
): "skip" | "prompt" | "add-edition" {
  switch (duplicateInfo.type) {
    case "exact-asset":
      // Always skip exact duplicates
      return "skip";

    case "same-isbn":
    case "same-asin":
      // Use edition duplicate handling option
      return options.onDuplicateEdition ?? "prompt";

    case "different-format":
      // Different format of same work - usually add as edition
      return options.onDuplicateWork ?? "add-edition";

    case "similar-title":
      // Fuzzy match - prompt by default
      return options.onDuplicateWork ?? "prompt";

    default:
      return "prompt";
  }
}

/**
 * Create a new work with all related entities
 */
async function createNewWork(
  database: Database,
  file: File,
  _checksum: Uint8Array,
  metadata: ExtractedMetadata,
  options: IngestWorkOptions,
  warnings: string[],
  enrichmentSources?: string[],
  enrichmentConfidence?: Record<string, number>,
): Promise<IngestWorkResult> {
  return await database.transaction().execute(async (trx) => {
    // Process contributors (creators and publishers)
    const { contributions, publisherIds } = await processContributors(trx, metadata, warnings);

    // Process cover image
    const coverId = metadata.cover
      ? await processCoverImage(trx, metadata.cover, metadata.title ?? "Untitled")
      : undefined;

    // Resolve language
    const language = metadata.language
      ? (await loadLanguage(trx, metadata.language))?.iso_639_3
      : undefined;

    // Create work
    let work = await createWork(trx, undefined, options.userId);

    // Find ISBN and ASIN from identifiers
    const isbn = metadata.identifiers?.find((id) => id.type === "isbn")?.value;
    const asin = metadata.identifiers?.find((id) => id.type === "asin")?.value;

    // Create edition
    const edition = await createEdition(trx, work.id, {
      title: metadata.title ?? "Untitled",
      isbn,
      asin,
      coverId,
      language,
      legalInformation: metadata.legalInformation,
      pages: metadata.numberOfPages,
      publishedAt: metadata.datePublished,
      publisherId: publisherIds.values().next().value,
      sortingKey: metadata.sortingKey,
      synopsis: metadata.synopsis,
    });

    // Update work with main edition
    work = await updateWork(trx, work.id, edition.id, options.userId);

    // Create asset
    const asset = await createAsset(trx, file, edition.id, {
      userId: options.userId,
      metadata: metadata.properties as JsonObject | undefined,
    });

    // Create contributions
    for (const [role, creatorIds] of contributions.entries()) {
      for (const creatorId of creatorIds) {
        await createContribution(
          trx,
          creatorId,
          edition.id,
          role,
          role === "aut", // Authors are essential
        );
      }
    }

    // Process series information
    if (metadata.series) {
      try {
        const series = await findOrCreateSeries(trx, metadata.series.name, {
          language,
          userId: options.userId,
        });

        await addWorkToSeries(trx, work.id, series.id, metadata.series.position);
      } catch (error) {
        warnings.push(`Failed to link series: ${error}`);
      }
    }

    // Process subjects/tags
    if (metadata.subjects && metadata.subjects.length > 0) {
      try {
        const tags = await findOrCreateTags(trx, metadata.subjects, { userId: options.userId });

        await addTagsToWork(
          trx,
          work.id,
          tags.map((t) => t.id),
        );
      } catch (error) {
        warnings.push(`Failed to add tags: ${error}`);
      }
    }

    return {
      status: "created" as const,
      work: toIngestionWork(work as any),
      edition: toIngestionEdition(edition as any),
      asset: toIngestionAsset(asset as any),
      warnings,
      enrichmentSources,
      enrichmentConfidence,
    };
  });
}

/**
 * Create a new edition for an existing work
 */
async function createNewEdition(
  database: Database,
  workId: string,
  file: File,
  _checksum: Uint8Array,
  metadata: ExtractedMetadata,
  options: IngestWorkOptions,
  warnings: string[],
  enrichmentSources?: string[],
  enrichmentConfidence?: Record<string, number>,
): Promise<IngestWorkResult> {
  return await database.transaction().execute(async (trx) => {
    // Process contributors
    const { contributions, publisherIds } = await processContributors(trx, metadata, warnings);

    // Process cover image
    const coverId = metadata.cover
      ? await processCoverImage(trx, metadata.cover, metadata.title ?? "Untitled")
      : undefined;

    // Resolve language
    const language = metadata.language
      ? (await loadLanguage(trx, metadata.language))?.iso_639_3
      : undefined;

    // Find ISBN and ASIN
    const isbn = metadata.identifiers?.find((id) => id.type === "isbn")?.value;
    const asin = metadata.identifiers?.find((id) => id.type === "asin")?.value;

    // Create edition linked to existing work
    const edition = await createEdition(trx, workId, {
      title: metadata.title ?? "Untitled",
      isbn,
      asin,
      coverId,
      language,
      legalInformation: metadata.legalInformation,
      pages: metadata.numberOfPages,
      publishedAt: metadata.datePublished,
      publisherId: publisherIds.values().next().value,
      sortingKey: metadata.sortingKey,
      synopsis: metadata.synopsis,
    });

    // Create asset
    const asset = await createAsset(trx, file, edition.id, {
      userId: options.userId,
      metadata: metadata.properties as JsonObject | undefined,
    });

    // Create contributions
    for (const [role, creatorIds] of contributions.entries()) {
      for (const creatorId of creatorIds) {
        await createContribution(trx, creatorId, edition.id, role, role === "aut");
      }
    }

    // Process series information (only if not already linked to this work)
    if (metadata.series) {
      try {
        const series = await findOrCreateSeries(trx, metadata.series.name, {
          language,
          userId: options.userId,
        });

        // Check if work is already in this series
        const existingEntry = await trx
          .selectFrom("series_entry")
          .selectAll()
          .where("work_id", "=", workId)
          .where("series_id", "=", series.id)
          .executeTakeFirst();

        if (!existingEntry) {
          await addWorkToSeries(trx, workId, series.id, metadata.series.position);
        }
      } catch (error) {
        warnings.push(`Failed to link series: ${error}`);
      }
    }

    // Process subjects/tags (avoid duplicates)
    if (metadata.subjects && metadata.subjects.length > 0) {
      try {
        // Get existing tags for this work
        const existingTags = await trx
          .selectFrom("work_tag")
          .innerJoin("tag", "work_tag.tag_id", "tag.id")
          .select("tag.value")
          .where("work_tag.work_id", "=", workId)
          .execute();

        const existingTagValues = new Set(existingTags.map((t) => t.value.toLowerCase()));

        // Filter out tags that already exist on this work
        const newSubjects = metadata.subjects.filter(
          (subject) => !existingTagValues.has(subject.toLowerCase()),
        );

        if (newSubjects.length > 0) {
          // Batch create/find tags
          const tags = await findOrCreateTags(trx, newSubjects, { userId: options.userId });

          // Batch add to work
          await addTagsToWork(
            trx,
            workId,
            tags.map((t) => t.id),
          );
        }
      } catch (error) {
        warnings.push(`Failed to add tags: ${error}`);
      }
    }

    // Get the existing work
    const work = await trx
      .selectFrom("work")
      .selectAll()
      .where("id", "=", workId)
      .executeTakeFirstOrThrow();

    return {
      status: "added-edition" as const,
      work: toIngestionWork(work as any),
      edition: toIngestionEdition(edition as any),
      asset: toIngestionAsset(asset as any),
      warnings,
      enrichmentSources,
      enrichmentConfidence,
    };
  });
}

/**
 * Process contributors and return creator/publisher mappings
 */
async function processContributors(
  database: Database,
  metadata: ExtractedMetadata,
  _warnings: string[],
): Promise<{ contributions: Map<ContributionRole, string[]>; publisherIds: Set<string> }> {
  const contributions = new Map<ContributionRole, string[]>();
  const publisherIds = new Set<string>();

  for (const contributor of metadata.contributors ?? []) {
    const { name, roles, sortingKey } = contributor;

    // Check if this is a publisher
    if (roles.includes("bkp") || roles.includes("pbl")) {
      const publisher = await findOrCreatePublisher(database, name, sortingKey);
      publisherIds.add(publisher.id);
      continue;
    }

    // Create/find creator
    const creator = await findOrCreateCreator(database, name, sortingKey);

    // Map roles to contributions
    for (const role of roles) {
      if (!contributions.has(role as ContributionRole)) {
        contributions.set(role as ContributionRole, []);
      }
      contributions.get(role as ContributionRole)?.push(creator.id);
    }
  }

  return { contributions, publisherIds };
}

/**
 * Find or create a publisher by name with fuzzy matching.
 *
 * Strategy:
 * 1. Try exact match (case-insensitive)
 * 2. If no match, normalize the name and search for similar publishers (>70% similarity)
 * 3. If similar publisher found, auto-merge by returning existing publisher
 * 4. Otherwise, create new publisher
 */
async function findOrCreatePublisher(database: Database, name: string, sortingKey?: string) {
  // Try exact match first
  const exact = await findPublisherByName(database, name);
  if (exact) {
    return exact;
  }

  // Try fuzzy matching with normalized name
  const normalizedName = normalizePublisherName(name);
  if (normalizedName) {
    const similar = await findSimilarPublishers(database, normalizedName, 0.7);
    if (similar.length > 0) {
      const match = similar[0];
      console.log(
        `[Ingestion] Auto-merged publisher "${name}" → "${match.publisher.name}" (${Math.round(match.similarity * 100)}% similarity)`,
      );
      return match.publisher;
    }
  }

  // No match found, create new publisher
  return await createPublisher(database, name, { sortingKey: sortingKey ?? name });
}

/**
 * Find or create a creator by name with fuzzy matching.
 *
 * Strategy:
 * 1. Try exact match (case-insensitive)
 * 2. If no match, normalize the name and search for similar creators (>70% similarity)
 * 3. If similar creator found, auto-merge by returning existing creator
 * 4. Otherwise, create new creator
 */
async function findOrCreateCreator(database: Database, name: string, sortingKey?: string) {
  // Try exact match first
  const exact = await findCreatorByName(database, name);
  if (exact) {
    return exact;
  }

  // Try fuzzy matching with normalized name
  const normalizedName = normalizeCreatorName(name);
  if (normalizedName) {
    const similar = await findSimilarCreators(database, normalizedName, 0.7);
    if (similar.length > 0) {
      const match = similar[0];
      console.log(
        `[Ingestion] Auto-merged creator "${name}" → "${match.creator.name}" (${Math.round(match.similarity * 100)}% similarity)`,
      );
      return match.creator;
    }
  }

  // No match found, create new creator
  return await createCreator(database, name, { sortingKey: sortingKey ?? name });
}

/**
 * Process and store a cover image
 */
async function processCoverImage(
  database: Database,
  cover: Blob | File,
  title: string,
): Promise<string> {
  // Dynamic import for sharp and blurhash (these are heavy deps)
  const sharp = (await import("sharp")).default;
  const { encodeImageToBlurHash } = await import("@colibri-hq/shared");

  const bytes = await cover.bytes();
  const image = sharp(bytes);
  const { format, width, height } = await image.metadata();

  // Generate blurhash
  const {
    data,
    info: { height: resizedHeight, width: resizedWidth },
  } = await sharp(bytes)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  const blurhash = await encodeImageToBlurHash(new Blob([new Uint8Array(data)]), {
    height: resizedHeight,
    width: resizedWidth,
  });

  // Create image record
  const imageRecord = await createImage(
    database,
    new File([cover], `${title}.${format ?? "jpg"}`, { type: `image/${format ?? "jpeg"}` }),
    { width: width ?? 0, height: height ?? 0, blurhash },
  );

  return imageRecord.id;
}

/**
 * Batch import multiple ebook files into the library.
 *
 * This function processes multiple files sequentially, calling the provided
 * callbacks for progress tracking and result handling.
 *
 * @param database - Database connection
 * @param files - Array of ebook files to import
 * @param options - Batch import options
 * @returns Summary of the batch import operation
 */
export async function batchImport(
  database: Database,
  files: File[],
  options: BatchImportOptions = {},
): Promise<BatchImportResult> {
  const startTime = Date.now();
  const successful: Array<{ file: string; result: IngestWorkResult }> = [];
  const skipped: Array<{ file: string; reason: string; duplicateInfo?: DuplicateCheckResult }> = [];
  const failed: Array<{ file: string; error: Error }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.name;

    // Call progress callback
    if (options.onProgress) {
      options.onProgress(i + 1, files.length, fileName);
    }

    try {
      let result: IngestWorkResult;

      if (options.dryRun) {
        // Dry run mode: extract metadata only, don't persist
        const fileBytes = await file.bytes();
        const checksum = new Uint8Array(await subtle.digest("SHA-256", fileBytes));
        const rawMetadata = await loadMetadata(file);
        const metadata: ExtractedMetadata = {
          title: rawMetadata.title,
          sortingKey: rawMetadata.sortingKey,
          synopsis: rawMetadata.synopsis,
          language: rawMetadata.language,
          datePublished: rawMetadata.datePublished,
          numberOfPages: rawMetadata.numberOfPages,
          legalInformation: rawMetadata.legalInformation,
          identifiers: rawMetadata.identifiers,
          contributors: rawMetadata.contributors,
          cover: rawMetadata.cover,
          properties: rawMetadata.properties,
          series: rawMetadata.series,
          subjects: rawMetadata.tags,
        };

        // Check for duplicates
        const duplicateInfo = await detectDuplicates(database, checksum, metadata);

        if (duplicateInfo.hasDuplicate) {
          result = {
            status: "skipped",
            work: duplicateInfo.existingWork,
            edition: duplicateInfo.existingEdition,
            asset: duplicateInfo.existingAsset,
            duplicateInfo,
            warnings: [duplicateInfo.description ?? "Duplicate found (dry run)"],
          };
        } else {
          result = { status: "created", warnings: ["Would create new work (dry run)"] };
        }
      } else {
        // Normal mode: full ingestion
        result = await ingestWork(database, file, options);
      }

      // Call result callback
      if (options.onResult) {
        options.onResult(result, fileName);
      }

      // Categorize result
      if (result.status === "needs-confirmation") {
        // In batch mode, treat needs-confirmation as a skip
        const entry: { file: string; reason: string; duplicateInfo?: DuplicateCheckResult } = {
          file: fileName,
          reason: "Requires manual confirmation",
        };
        if (result.duplicateInfo) {
          entry.duplicateInfo = result.duplicateInfo;
        }
        skipped.push(entry);
      } else if (result.status === "skipped") {
        const entry: { file: string; reason: string; duplicateInfo?: DuplicateCheckResult } = {
          file: fileName,
          reason: result.warnings[0] ?? "Skipped",
        };
        if (result.duplicateInfo) {
          entry.duplicateInfo = result.duplicateInfo;
        }
        skipped.push(entry);
      } else {
        successful.push({ file: fileName, result });
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      failed.push({ file: fileName, error: errorObj });

      // Stop on first error if continueOnError is false
      if (!options.continueOnError) {
        break;
      }
    }
  }

  const duration = Date.now() - startTime;

  return { total: files.length, successful, skipped, failed, duration };
}
