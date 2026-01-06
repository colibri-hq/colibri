# Work Ingestion & Duplicate Detection

## Description

A comprehensive ingestion system for adding ebooks to Colibri, handling metadata extraction, duplicate detection, entity
creation, and optional metadata enrichment from external sources. The core logic lives in the SDK to enable reuse across
CLI, webapp, API, and extensions.

## Implementation Status

### ✅ Fully Implemented

**Core Ingestion:**

- ✅ Metadata extraction from EPUB/MOBI/PDF (`packages/sdk/src/ebooks/`)
- ✅ Cover image processing with blurhash generation
- ✅ Work, edition, asset, and contribution record creation in transactions
- ✅ Asset deduplication by SHA-256 checksum
- ✅ Reusable SDK ingestion service (`packages/sdk/src/ingestion/`)

**Duplicate Detection:**

- ✅ Duplicate detection by checksum, ISBN, ASIN (`detect-duplicates.ts`)
- ✅ Duplicate detection by title+author with fuzzy matching (pg_trgm, 70% threshold)
- ✅ Pending ingestions persisted to database (survives server restarts)

**Entity Normalization:**

- ✅ Creator normalization with fuzzy matching (auto-merge >70% similarity)
- ✅ Publisher normalization with fuzzy matching (auto-merge >70% similarity)
- ✅ Name normalization utilities (`normalizeCreatorName`, `normalizePublisherName`)

**Metadata Extraction:**

- ✅ Series extraction from EPUB/MOBI metadata (Calibre + EPUB 3 formats)
- ✅ Subject/tag extraction from EPUB metadata (with BISAC parsing)
- ✅ Series and tag linking during ingestion (with fuzzy matching for series)

**CLI Commands:**

- ✅ Single file import: `colibri works add <file>` with `--enrich`, `--skip-duplicates`, `--force`
- ✅ Batch import: `colibri works import <pattern>` with glob support, dry-run, progress tracking
- ✅ User prompts for duplicate handling via interactive CLI

**SDK Functions:**

- ✅ `ingestWork()` - Single file ingestion with full duplicate detection
- ✅ `confirmIngestion()` - Handle pending duplicate confirmations
- ✅ `batchImport()` - Batch import with progress callbacks and error handling

**Testing:**

- ✅ 22 integration tests for ingestion workflow
- ✅ 97+ unit tests for normalization, fuzzy matching, series/tags

---

### ⚠️ Partial Implementation

| Feature             | Status                               | Notes                                                      |
|---------------------|--------------------------------------|------------------------------------------------------------|
| Metadata enrichment | Providers exist, not wired to import | `--enrich` flag exists but doesn't trigger enrichment      |
| Web app import      | Basic upload works                   | Missing enrichment UI, duplicate review modal improvements |

---

### ❌ Not Yet Implemented

| Feature                         | Priority | Description                                                              |
|---------------------------------|----------|--------------------------------------------------------------------------|
| Metadata enrichment integration | High     | Wire up OpenLibrary/WikiData providers to import flow                    |
| Enrichment UI                   | Medium   | Modal to review/accept enriched metadata after import                    |
| External identifier linking     | Medium   | Connect creators/publishers to VIAF/ISNI during enrichment               |
| Improved cover handling         | Low      | Fetch covers from OpenLibrary when embedded cover is missing/low quality |
| Language detection              | Low      | Detect language from text when metadata is missing                       |
| Calibre import                  | Low      | Import existing Calibre library with metadata preservation               |

---

## File Reference

### SDK Ingestion (`packages/sdk/src/ingestion/`)

| File                            | Description                                                          |
|---------------------------------|----------------------------------------------------------------------|
| `index.ts`                      | Main service: `ingestWork()`, `confirmIngestion()`, `batchImport()`  |
| `detect-duplicates.ts`          | 5-level duplicate detection (checksum → ISBN → ASIN → title → fuzzy) |
| `normalize.ts`                  | Name normalization for creators/publishers                           |
| `types.ts`                      | All TypeScript interfaces                                            |
| `ingestion.integration.test.ts` | 22 integration tests                                                 |

### SDK Resources (`packages/sdk/src/resources/`)

| File                   | Key Functions                                                                   |
|------------------------|---------------------------------------------------------------------------------|
| `pending-ingestion.ts` | `createPendingIngestion()`, `getPendingIngestion()`, `deletePendingIngestion()` |
| `creator.ts`           | `findSimilarCreators()` with pg_trgm fuzzy matching                             |
| `publisher.ts`         | `findSimilarPublishers()` with pg_trgm fuzzy matching                           |
| `series.ts`            | `findOrCreateSeries()` with fuzzy matching                                      |
| `tag.ts`               | `findOrCreateTags()` batch operations                                           |

### CLI Commands (`apps/cli/src/commands/works/`)

| File        | Command                  | Description                                 |
|-------------|--------------------------|---------------------------------------------|
| `add.ts`    | `works add <file>`       | Single file import with interactive prompts |
| `import.ts` | `works import <pattern>` | Batch import with glob support              |

### Database Schema

| File                                        | Table                                                        |
|---------------------------------------------|--------------------------------------------------------------|
| `supabase/schemas/20_pending_ingestion.sql` | `pending_ingestion` - Stores pending duplicate confirmations |

---

## Test Coverage

| Test File                            | Tests | Coverage                      |
|--------------------------------------|-------|-------------------------------|
| `ingestion.integration.test.ts`      | 22    | End-to-end ingestion workflow |
| `normalize.test.ts`                  | 37    | Name normalization            |
| `fuzzy-matching-integration.test.ts` | 22    | Fuzzy matching logic          |
| `series-tags.test.ts`                | 16    | Series/tag extraction         |
| `pending-ingestion.test.ts`          | 12    | Pending ingestion CRUD        |
| `epub-metadata.test.ts`              | 10    | EPUB metadata extraction      |

**Total: 119+ tests for ingestion-related functionality**

---

## CLI Usage Examples

```bash
# Single file import
colibri works add ./book.epub
colibri works add ./book.epub --skip-duplicates
colibri works add ./book.epub --force  # Override duplicate detection

# Batch import
colibri works import './books/*.epub'
colibri works import './library/**/*.{epub,mobi}' --skip-duplicates
colibri works import './new-books/' --dry-run
colibri works import './books/' --add-editions  # Add as editions when duplicates found

# Inspect metadata without importing
colibri works inspect ./book.epub
```

---

## Prerequisites

Before using the CLI import commands:

1. **Enable pg_trgm extension** (required for fuzzy matching):
   ```bash
   PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \
     -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
   ```

2. **Connect CLI to storage**:
   ```bash
   colibri storage connect \
     --access-key-id "YOUR_KEY" \
     --secret-access-key "YOUR_SECRET" \
     --endpoint "http://127.0.0.1:54321/storage/v1/s3" \
     --region "local" \
     --force-path-style
   ```

---

## Design Decisions

| Decision                  | Choice            | Rationale                                        |
|---------------------------|-------------------|--------------------------------------------------|
| Fuzzy matching algorithm  | pg_trgm (trigram) | Native PostgreSQL, fast, good for names          |
| Auto-merge threshold      | 70% similarity    | Balances catching duplicates vs. false positives |
| Batch processing          | Sequential        | Simpler, predictable, lower memory               |
| Progress reporting        | ora spinner       | Consistent with other CLI commands               |
| Pending ingestion storage | Database          | Survives server restarts                         |
| Transaction scope         | Per-file          | Allows partial success in batch imports          |

---

## Next Steps (Prioritized)

### 1. Metadata Enrichment Integration (High Priority)

Wire up the existing metadata providers to the import flow:

```typescript
// In ingestWork() after basic import:
if (options.enrich) {
  const enriched = await enrichWorkMetadata(work, {
    providers: ['open-library', 'wikidata'],
    fillMissing: true,  // Only fill missing fields
  });
  await updateWork(database, work.id, enriched);
}
```

**Files to modify:**

- `packages/sdk/src/ingestion/index.ts` - Add enrichment call
- `packages/sdk/src/ingestion/enrich.ts` - NEW: Enrichment orchestrator

### 2. Enrichment UI (Medium Priority)

Add a modal in the web app for reviewing enriched metadata:

- Show current vs. enriched field comparison
- Per-field accept/reject
- Source attribution (e.g., "from OpenLibrary")
- Confidence scores

### 3. External Identifier Linking (Medium Priority)

During enrichment, lookup and store external IDs:

- VIAF for creators
- ISNI for creators
- OpenLibrary IDs for works
- Wikidata QIDs

### 4. Calibre Import (Low Priority)

Import existing Calibre libraries:

- Parse `metadata.db` SQLite database
- Map Calibre fields to Colibri schema
- Preserve custom columns as metadata
