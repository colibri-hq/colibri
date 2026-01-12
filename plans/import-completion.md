> **GitHub Issue:** [#134](https://github.com/colibri-hq/colibri/issues/134)

# Import Flow Completion

## Description

Complete the end-to-end import flow for adding ebooks to Colibri via drag-and-drop. The goal is a seamless user journey
where dropping an ebook file results in a fully normalized, de-duplicated, and enriched record. This plan addresses the
gaps between the existing upload infrastructure and the metadata/normalization systems.

## Current Implementation Status

### Upload Infrastructure

**Implemented:**

- ✅ `UploadOverlay.svelte` - Window-level drag-and-drop with file type filtering
- ✅ `QueueStatusWidget.svelte` - Real-time progress indicator
- ✅ `ImportSubscription.svelte` - SSE client for server events
- ✅ `DuplicatePrompt.svelte` - User-facing duplicate resolution toast
- ✅ `upload.worker.ts` - Web worker handling OPFS storage, checksums, S3 upload
- ✅ Resumable uploads via Origin Private File System (OPFS)
- ✅ SHA-256 checksum calculation before upload

### Server-Side Processing

**Implemented:**

- ✅ `packages/sdk/src/ingestion/index.ts` - Main ingestion orchestrator
- ✅ `packages/sdk/src/ingestion/detect-duplicates.ts` - Multi-tier duplicate detection
- ✅ Metadata extraction from EPUB/MOBI/PDF (`packages/sdk/src/ebooks/`)
- ✅ Cover image processing with blurhash generation
- ✅ Atomic database transactions for work/edition/asset creation
- ✅ tRPC routes: `getUploadUrl`, `ingest`, `confirmDuplicate`
- ✅ SSE events: `started`, `progress`, `completed`, `duplicate`, `skipped`, `failed`

### Duplicate Detection

**Implemented:**

- ✅ Exact asset match (SHA-256 checksum)
- ✅ ISBN-10/ISBN-13 matching
- ✅ ASIN matching
- ✅ Exact title + creator match
- ✅ Fuzzy title match via `pg_trgm` (60%+ similarity)

**Partial Implementation:**

- ⚠️ Creator/publisher records created but not deduplicated (same person can create multiple records)
- ⚠️ Pending ingestions stored in memory Map (lost on server restart)

### Metadata Providers

**Implemented:**

- ✅ OpenLibrary provider with search and work lookup
- ✅ WikiData provider with SPARQL queries
- ✅ Library of Congress provider (SRU protocol)
- ✅ ISNI/VIAF providers for author authority
- ✅ Caching system with LRU and TTL
- ✅ Rate limiting per provider
- ✅ Confidence scoring system

**Not Integrated:**

- ❌ `book-metadata.worker.ts` exists but not connected to import flow
- ❌ No automatic metadata enrichment during import
- ❌ No UI for selecting/reviewing enriched metadata

### Entity Normalization

**Not Implemented:**

- ❌ Creator deduplication (fuzzy name matching)
- ❌ Publisher deduplication
- ❌ External identifier linking (VIAF, ISNI, Wikidata IDs)
- ❌ Series detection and linking from EPUB metadata
- ❌ Subject/tag extraction from `dc:subject`
- ❌ Language table population and fallback detection

## Implementation Plan

### Phase 1: Persist Pending Ingestions

Store pending duplicate confirmations in the database instead of memory.

1. Add `pending_ingestion` table:

   ```sql
   CREATE TABLE pending_ingestion (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     upload_id TEXT NOT NULL,
     s3_key TEXT NOT NULL,
     checksum TEXT NOT NULL,
     extracted_metadata JSONB NOT NULL,
     duplicate_info JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now(),
     expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
   );
   ```

2. Update `ingestWork()` to store pending ingestion in database
3. Update `confirmIngestion()` to retrieve from database
4. Add cleanup job for expired pending ingestions

**Files:**

- `supabase/schemas/XX_pending_ingestion.sql` - NEW
- `packages/sdk/src/ingestion/index.ts` - Modify
- `packages/sdk/src/resources/pending-ingestion.ts` - NEW

### Phase 2: Creator Normalization

Prevent duplicate creator records through fuzzy matching.

1. Add name normalization function:

   ```typescript
   function normalizeCreatorName(name: string): string {
     // "Rowling, J.K." → "jk rowling"
     // "J. K. Rowling" → "jk rowling"
     // Handle: initials, suffixes (Jr., III), prefixes (Dr., Prof.)
   }
   ```

2. Add creator matching function using `pg_trgm`:

   ```typescript
   async function findSimilarCreators(
     database: Database,
     name: string,
     threshold: number = 0.7,
   ): Promise<Array<{ creator: Creator; similarity: number }>>;
   ```

3. Update `findOrCreateCreator()` to:
   - Normalize input name
   - Search for similar existing creators
   - If match found with >80% similarity, use existing
   - If match found with 60-80% similarity, create with `alias_of` link
   - Otherwise create new creator

4. Add `alias_of` column to creators table for linking alternate spellings

**Files:**

- `packages/sdk/src/resources/creator.ts` - Modify
- `packages/sdk/src/ingestion/normalize.ts` - NEW
- `supabase/schemas/09_creators.sql` - Add `alias_of` column

### Phase 3: Publisher Normalization

Similar to creator normalization.

1. Add publisher matching with fuzzy search
2. Handle common variations:
   - "Penguin Books" vs "Penguin" vs "Penguin Random House"
   - Imprint relationships (Plume → Penguin)

3. Add `parent_publisher_id` for imprint hierarchy

**Files:**

- `packages/sdk/src/resources/publisher.ts` - Modify
- `packages/sdk/src/ingestion/normalize.ts` - Extend
- `supabase/schemas/12_publishers.sql` - Add `parent_publisher_id`

### Phase 4: Series Detection

Extract and link series information from EPUB metadata.

1. Parse series metadata from EPUB:

   ```typescript
   // Calibre-style: calibre:series, calibre:series_index
   // EPUB 3: belongs-to-collection with collection-type="series"
   // Dublin Core: dc:relation with series info
   ```

2. Create `findOrCreateSeries()` function
3. Link editions to series during ingestion
4. Handle series position (support decimals for novellas)

**Files:**

- `packages/sdk/src/ebooks/epub.ts` - Add series extraction
- `packages/sdk/src/resources/series.ts` - NEW (basic CRUD)
- `packages/sdk/src/ingestion/index.ts` - Add series linking

### Phase 5: Subject/Tag Extraction

Parse and normalize subject headings from ebook metadata.

1. Extract `dc:subject` elements from EPUB
2. Normalize tags:
   - Lowercase
   - Remove leading articles
   - Split compound subjects ("Fiction / Fantasy / Epic")

3. Create or link to existing tags
4. Handle BISAC and LCSH subject headings

**Files:**

- `packages/sdk/src/ebooks/epub.ts` - Add subject extraction
- `packages/sdk/src/resources/tag.ts` - Add `findOrCreateTag()`
- `packages/sdk/src/ingestion/index.ts` - Add tag linking

### Phase 6: Automatic Metadata Enrichment

Connect metadata providers to the import flow.

1. After basic ingestion, trigger background enrichment:

   ```typescript
   async function enrichWorkMetadata(
     database: Database,
     workId: string,
     options: EnrichmentOptions,
   ): Promise<EnrichmentResult>;
   ```

2. Search providers using ISBN/title/author
3. Reconcile results with existing data:
   - Fill missing fields only (don't overwrite)
   - Download better cover if available
   - Add external identifiers (OpenLibrary ID, Wikidata QID)

4. Update SSE to emit enrichment progress

**Files:**

- `packages/sdk/src/ingestion/enrich.ts` - NEW
- `apps/app/src/lib/trpc/routes/books.ts` - Add enrichment trigger
- `apps/app/src/lib/server/import-events.ts` - Add enrichment events

### Phase 7: External Identifier Linking

Connect creators/publishers to authority databases.

1. During enrichment, lookup creator in VIAF/ISNI
2. Store external IDs in `creator_identifiers` table:

   ```sql
   CREATE TABLE creator_identifiers (
     creator_id UUID REFERENCES creators(id),
     type TEXT NOT NULL, -- 'viaf', 'isni', 'wikidata', 'loc'
     value TEXT NOT NULL,
     PRIMARY KEY (creator_id, type)
   );
   ```

3. Similarly for publishers with Wikidata IDs

**Files:**

- `supabase/schemas/XX_external_identifiers.sql` - NEW
- `packages/sdk/src/resources/creator.ts` - Add identifier methods
- `packages/sdk/src/ingestion/enrich.ts` - Add identifier lookup

### Phase 8: Enrichment UI

Add user-facing interface for reviewing enriched metadata.

1. Post-import toast with "Enhance metadata" action
2. Modal showing:
   - Current vs. enriched field comparison
   - Source attribution per field
   - Confidence scores
   - Apply/Skip per field

3. Batch enrichment for multiple works

**Files:**

- `apps/app/src/lib/components/Upload/EnrichmentModal.svelte` - NEW
- `apps/app/src/lib/components/Upload/ImportSubscription.svelte` - Handle enrichment events
- `apps/app/src/routes/(library)/works/[work=id]/+page.svelte` - Add "Enhance" button

### Phase 9: Improved Cover Handling

Enhance cover image acquisition.

1. Fallback chain for missing covers:
   - Extracted from ebook
   - OpenLibrary covers API
   - Google Books covers API

2. Cover quality assessment:
   - Minimum resolution check (400x600)
   - Aspect ratio validation
   - Placeholder detection

3. User option to select from multiple sources

**Files:**

- `packages/sdk/src/ingestion/covers.ts` - NEW
- `packages/sdk/src/metadata/open-library.ts` - Add cover fetch
- `apps/app/src/lib/components/Upload/CoverSelector.svelte` - NEW

### Phase 10: Language Handling

Proper language detection and normalization.

1. Populate language reference table:

   ```sql
   INSERT INTO languages (code, name, native_name) VALUES
     ('eng', 'English', 'English'),
     ('deu', 'German', 'Deutsch'),
     ...
   ```

2. Fallback language detection:
   - From ebook metadata (dc:language)
   - From text analysis (optional, using franc)
   - From user's default language

3. ISO 639-1 to 639-3 conversion

**Files:**

- `supabase/seeds/languages.sql` - NEW
- `packages/sdk/src/ingestion/language.ts` - NEW
- `packages/shared/src/languages.ts` - Add conversion utilities

## Import Flow Diagram

```
User drops file
      │
      ▼
┌─────────────────┐
│ UploadOverlay   │ Filter file types
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ upload.worker   │ Save to OPFS, calculate checksum
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ getUploadUrl    │ Pre-flight duplicate check
└────────┬────────┘
         │
    ┌────┴────┐
    │ Dupe?   │
    └────┬────┘
    Yes  │  No
    │    │
    ▼    ▼
  Skip  Upload to S3
         │
         ▼
┌─────────────────┐
│ ingest()        │ Download from S3
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ loadMetadata()  │ Extract EPUB/MOBI/PDF metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ detectDupes()   │ Check ISBN, ASIN, title
└────────┬────────┘
         │
    ┌────┴────┐
    │ Match?  │
    └────┬────┘
    Yes  │  No
    │    │
    ▼    ▼
  Prompt  Create work
    │         │
    ▼         ▼
┌─────────────────┐
│ normalize()     │ Dedupe creators, publishers ← Phase 2-3
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ linkSeries()    │ Detect and link series ← Phase 4
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ extractTags()   │ Parse dc:subject ← Phase 5
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ createRecords() │ Atomic transaction
└────────┬────────┘
         │
         ▼
   SSE: "completed"
         │
         ▼ (background)
┌─────────────────┐
│ enrichWork()    │ Fetch from OpenLibrary, Wikidata ← Phase 6
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ linkIdentifiers │ VIAF, ISNI for creators ← Phase 7
└────────┬────────┘
         │
         ▼
   SSE: "enriched"
         │
         ▼
   Toast: "Enhance metadata?"  ← Phase 8
```

## Files to Create/Modify

| File                                                        | Action | Phase |
| ----------------------------------------------------------- | ------ | ----- |
| `supabase/schemas/XX_pending_ingestion.sql`                 | NEW    | 1     |
| `packages/sdk/src/resources/pending-ingestion.ts`           | NEW    | 1     |
| `packages/sdk/src/ingestion/normalize.ts`                   | NEW    | 2-3   |
| `packages/sdk/src/resources/creator.ts`                     | Modify | 2     |
| `packages/sdk/src/resources/publisher.ts`                   | Modify | 3     |
| `packages/sdk/src/resources/series.ts`                      | NEW    | 4     |
| `packages/sdk/src/ebooks/epub.ts`                           | Modify | 4-5   |
| `packages/sdk/src/resources/tag.ts`                         | Modify | 5     |
| `packages/sdk/src/ingestion/enrich.ts`                      | NEW    | 6     |
| `supabase/schemas/XX_external_identifiers.sql`              | NEW    | 7     |
| `apps/app/src/lib/components/Upload/EnrichmentModal.svelte` | NEW    | 8     |
| `packages/sdk/src/ingestion/covers.ts`                      | NEW    | 9     |
| `apps/app/src/lib/components/Upload/CoverSelector.svelte`   | NEW    | 9     |
| `packages/sdk/src/ingestion/language.ts`                    | NEW    | 10    |
| `supabase/seeds/languages.sql`                              | NEW    | 10    |

## Testing Requirements

1. **Unit Tests:**
   - Name normalization functions
   - Fuzzy matching thresholds
   - Series metadata parsing
   - Subject/tag extraction

2. **Integration Tests:**
   - Full import flow with duplicate detection
   - Creator deduplication scenarios
   - Series linking from EPUB metadata
   - Enrichment with mocked providers

3. **E2E Tests (Playwright):**
   - Drag-and-drop upload
   - Duplicate prompt interaction
   - Enrichment modal workflow

## Open Questions

1. **Creator Merge UI**: When a potential duplicate creator is found, should we prompt the user or auto-merge?
2. **Enrichment Timing**: Should enrichment happen synchronously (blocking) or always in background?
3. **Confidence Thresholds**: What similarity scores should trigger auto-merge vs. prompt?
4. **Series Conflicts**: What if EPUB series metadata conflicts with existing series data?
5. **Tag Limits**: Should we limit the number of tags extracted per work?
6. **Cover Sources**: Which external cover source should be preferred?
7. **Language Fallback**: If no language metadata, should we analyze text content?
8. **Batch Enrichment**: Allow enriching multiple works at once after import?

## Related Plans

- [Work Ingestion](./work-ingestion.md) - Core ingestion implementation (mostly complete)
- [Metadata Discovery](./metadata-discovery.md) - Metadata provider system (implemented, not integrated)
- [Series Management](./series-management.md) - Series UI and SDK (not implemented)
- [Contributor Management](./contributor-management.md) - Creator/publisher management
- [Tags System](./tags-system.md) - Tag management and extraction
