/**
 * Types of duplicates that can be detected during ingestion
 */
export type DuplicateType =
  | "exact-asset" // Same file (checksum match)
  | "same-isbn" // Same ISBN, possibly different metadata
  | "same-asin" // Same ASIN
  | "similar-title" // Similar title and/or creator (fuzzy match)
  | "different-format"; // Different ISBN but same work (e.g., paperback vs ebook)

/**
 * Simplified work type for ingestion results
 */
export interface IngestionWork {
  id: string;
  main_edition_id?: string | null | undefined;
  created_at?: Date | undefined;
  updated_at?: Date | null | undefined;
}

/**
 * Simplified edition type for ingestion results
 */
export interface IngestionEdition {
  id: string;
  work_id: string;
  title: string;
  isbn_10?: string | null | undefined;
  isbn_13?: string | null | undefined;
  asin?: string | null | undefined;
  language?: string | null | undefined;
  pages?: number | null | undefined;
  synopsis?: string | null | undefined;
}

/**
 * Simplified asset type for ingestion results
 */
export interface IngestionAsset {
  id: string;
  edition_id: string;
  checksum: Buffer;
  filename: string;
  media_type: string;
  size: number;
}

/**
 * Result of duplicate detection check
 */
export interface DuplicateCheckResult {
  /** Whether any duplicate was found */
  hasDuplicate: boolean;
  /** Type of duplicate found */
  type?: DuplicateType | undefined;
  /** Existing work if found */
  existingWork?: IngestionWork | undefined;
  /** Existing edition if found */
  existingEdition?: IngestionEdition | undefined;
  /** Existing asset if found (for exact matches) */
  existingAsset?: IngestionAsset | undefined;
  /** Confidence score (0-1) for fuzzy matches */
  confidence: number;
  /** Human-readable description of the match */
  description?: string | undefined;
}

/**
 * Options for the ingestWork function
 */
export interface IngestWorkOptions {
  /** User ID performing the import */
  userId?: string | undefined;
  /** Client-side upload tracking ID */
  uploadId?: string | undefined;
  /** S3 key where the file is stored (for pending confirmations) */
  s3Key?: string | undefined;
  /** How to handle duplicate editions (same ISBN/ASIN) */
  onDuplicateEdition?: "skip" | "add-edition" | "prompt" | undefined;
  /** How to handle similar works (fuzzy title match) */
  onDuplicateWork?: "skip" | "add-edition" | "prompt" | undefined;
  /** Whether to enrich metadata from external sources */
  enrich?: boolean | undefined;
  /** Specific metadata providers to use for enrichment */
  enrichProviders?: string[] | undefined;
}

/**
 * Status of an ingestion operation
 */
export type IngestStatus =
  | "created" // New work and edition created
  | "added-edition" // New edition added to existing work
  | "skipped" // Skipped due to duplicate
  | "updated" // Existing metadata updated
  | "needs-confirmation"; // Requires user confirmation

/**
 * Result of an ingestion operation
 */
export interface IngestWorkResult {
  /** Status of the ingestion */
  status: IngestStatus;
  /** Created or matched work */
  work?: IngestionWork | undefined;
  /** Created or matched edition */
  edition?: IngestionEdition | undefined;
  /** Created asset */
  asset?: IngestionAsset | undefined;
  /** Duplicate information if relevant */
  duplicateInfo?: DuplicateCheckResult | undefined;
  /** Warnings generated during import */
  warnings: string[];
  /** ID for pending confirmation (when status is 'needs-confirmation') */
  pendingId?: string | undefined;
  /** Metadata providers that contributed enrichment data */
  enrichmentSources?: string[] | undefined;
  /** Confidence scores for enriched fields */
  enrichmentConfidence?: Record<string, number> | undefined;
}

/**
 * Actions available when confirming a pending ingestion
 */
export type ConfirmAction =
  | "create-work" // Create as a new work
  | "create-edition" // Add as new edition to existing work
  | "update-metadata" // Update existing edition's metadata
  | "skip"; // Skip the import

/**
 * Metadata extracted from an ebook file
 */
export interface ExtractedMetadata {
  title?: string | undefined;
  sortingKey?: string | undefined;
  synopsis?: string | undefined;
  language?: string | undefined;
  datePublished?: Date | undefined;
  numberOfPages?: number | undefined;
  legalInformation?: string | undefined;
  identifiers?: Array<{ type: string; value: string }> | undefined;
  contributors?:
    | Array<{
        name: string;
        roles: string[];
        sortingKey?: string | undefined;
      }>
    | undefined;
  cover?: Blob | File | undefined;
  properties?: Record<string, unknown> | undefined;
  series?:
    | {
        name: string;
        position?: number | undefined; // Support decimals for novellas (e.g., 1.5)
      }
    | undefined;
  subjects?: string[] | undefined;
}

/**
 * Result of metadata enrichment
 */
export interface EnrichmentResult {
  /** Enriched metadata fields */
  enriched: Partial<ExtractedMetadata>;
  /** Sources that provided data */
  sources: string[];
  /** Confidence scores by field */
  confidence: Record<string, number>;
}

/**
 * Batch import options
 */
export interface BatchImportOptions extends IngestWorkOptions {
  /** Continue processing after errors */
  continueOnError?: boolean | undefined;
  /** Dry run - don't actually import */
  dryRun?: boolean | undefined;
  /** Progress callback */
  onProgress?:
    | ((current: number, total: number, file: string) => void)
    | undefined;
  /** Result callback - called after each file is processed */
  onResult?: ((result: IngestWorkResult, file: string) => void) | undefined;
}

/**
 * Result of a batch import operation
 */
export interface BatchImportResult {
  /** Total files processed */
  total: number;
  /** Successfully imported */
  successful: Array<{ file: string; result: IngestWorkResult }>;
  /** Skipped (duplicates) */
  skipped: Array<{
    file: string;
    reason: string;
    duplicateInfo?: DuplicateCheckResult | undefined;
  }>;
  /** Failed imports */
  failed: Array<{ file: string; error: Error }>;
  /** Total duration in milliseconds */
  duration: number;
}
