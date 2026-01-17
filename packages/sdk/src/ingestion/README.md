# Ingestion & Enrichment System

This directory contains the ingestion pipeline and metadata enrichment system for importing ebooks into Colibri.

## Architecture Overview

```
Ebook File
    ↓
[Extract Metadata] (epub.ts, mobi parser, etc.)
    ↓
ExtractedMetadata
    ↓
[Enrich with Providers] (enrich.ts)
    ↓
Multiple MetadataRecords
    ↓
[Convert & Merge] (metadata-converter.ts)
    ↓
Final ExtractedMetadata
    ↓
[Ingest] (index.ts)
    ↓
Database (Work + Edition + Asset)
```

## Key Files

### `types.ts`

Type definitions for the ingestion system:

- `ExtractedMetadata` - Metadata from ebook files
- `IngestWorkOptions` - Configuration for ingestion
- `IngestWorkResult` - Result of ingestion operation
- `DuplicateCheckResult` - Duplicate detection results

### `enrich.ts`

Core enrichment functionality:

- `enrichMetadata()` - Main enrichment function
- Parallel provider queries
- Timeout and error handling
- Confidence-based field selection

### `metadata-converter.ts`

Conversion utilities between provider and ingestion formats:

- `convertToExtractedMetadata()` - Convert MetadataRecord → ExtractedMetadata
- `mergeMetadataRecords()` - Merge multiple provider results
- `selectBestValue()` - Choose best value by confidence
- `resolveConflict()` - Detect and resolve data conflicts
- `calculateAggregatedConfidence()` - Multi-source confidence scoring

### `detect-duplicates.ts`

Duplicate detection system:

- Exact asset matching (checksum)
- ISBN matching
- Fuzzy title/author matching
- Confidence scoring for matches

### `index.ts`

Main ingestion entry point:

- `ingestWork()` - Import ebook into database
- Duplicate handling strategies
- Transaction management
- Work/Edition creation

## Usage Examples

### Basic Enrichment

```typescript
import { enrichMetadata } from "./enrich.js";
import { globalProviderRegistry } from "../metadata/registry.js";

// Extract metadata from ebook
const ebookMetadata: ExtractedMetadata = {
  title: "The Great Gatsby",
  contributors: [{ name: "F. Scott Fitzgerald", roles: ["aut"] }],
  identifiers: [{ type: "isbn", value: "9780743273565" }],
};

// Get all enabled providers
const providers = globalProviderRegistry.getEnabledProviders();

// Enrich metadata
const result = await enrichMetadata(ebookMetadata, providers, {
  preferredLanguage: "en",
  strategy: "merge-all",
});

console.log("Enriched:", result.enriched);
console.log("Sources:", result.sources);
console.log("Confidence:", result.confidence);
```

### Manual Conversion

```typescript
import { convertToExtractedMetadata, mergeMetadataRecords } from "./metadata-converter.js";
import { WikiDataMetadataProvider } from "../metadata/wikidata.js";
import { OpenLibraryMetadataProvider } from "../metadata/open-library.js";

// Query providers manually
const wikidata = new WikiDataMetadataProvider();
const openlib = new OpenLibraryMetadataProvider();

const [wikidataResults, openlibResults] = await Promise.all([
  wikidata.searchByISBN("9780743273565"),
  openlib.searchByISBN("9780743273565"),
]);

// Merge results
const merged = mergeMetadataRecords([...wikidataResults, ...openlibResults]);

console.log("Merged metadata:", merged);
```

### Conflict Resolution

```typescript
import { resolveConflict } from "./metadata-converter.js";

// Multiple providers return different publication dates
const allRecords: MetadataRecord[] = [
  { ...wikidataRecord, publicationDate: new Date("2020-01-15") },
  { ...locRecord, publicationDate: new Date("2020-01-01") },
  { ...openlibRecord, publicationDate: new Date("2019-12-31") },
];

// Resolve conflict
const resolution = resolveConflict<Date>(allRecords, "publicationDate", (date) =>
  date.getFullYear().toString(),
);

if (resolution.hasConflict) {
  console.log("Conflict detected!");
  console.log("Chosen value:", resolution.value);
  console.log("Alternatives:", resolution.alternatives);
}
```

### Full Ingestion

```typescript
import { ingestWork } from "./index.js";

// Ingest with enrichment
const result = await ingestWork({
  file: ebookBuffer,
  filename: "gatsby.epub",
  metadata: extractedMetadata,
  userId: "user-123",
  enrich: true,
  enrichProviders: ["WikiData", "OpenLibrary"], // Optional: specific providers
  onDuplicateEdition: "prompt", // Handle duplicates
});

if (result.status === "needs-confirmation") {
  console.log("Duplicate found:", result.duplicateInfo);
  // Show user confirmation dialog
} else {
  console.log("Imported:", result.work, result.edition);
}
```

## Provider Search Strategies

See [`SEARCH_STRATEGY.md`](./SEARCH_STRATEGY.md) for detailed guidance on:

- Which providers to use for different search types
- When to query in parallel vs. sequential
- How to handle conflicting data
- Performance optimization tips
- Code examples for common scenarios

### Quick Reference

**Best for ISBN:**

- Strategy: Parallel
- Providers: WikiData + Library of Congress
- Confidence: 0.90-0.98

**Best for Title + Author:**

- Strategy: Parallel
- Providers: WikiData + LoC + Open Library
- Confidence: 0.80-0.95

**Best for Title only:**

- Strategy: Sequential
- Providers: Open Library → WikiData → LoC
- Confidence: 0.70-0.85

## Metadata Field Mapping

### Provider → Ingestion

| Provider Field    | Ingestion Field   | Notes          |
| ----------------- | ----------------- | -------------- |
| `title`           | `title`           | Direct mapping |
| `authors[]`       | `contributors[]`  | Role = 'aut'   |
| `isbn[]`          | `identifiers[]`   | Type = 'isbn'  |
| `description`     | `synopsis`        | Direct mapping |
| `publicationDate` | `datePublished`   | Date object    |
| `pageCount`       | `numberOfPages`   | Number         |
| `subjects[]`      | `subjects[]`      | Direct mapping |
| `language`        | `language`        | ISO 639-1 code |
| `publisher`       | `contributors[]`  | Role = 'pbl'   |
| `series.name`     | `series.name`     | Direct mapping |
| `series.volume`   | `series.position` | Number         |

### Name Sorting Keys

The system automatically generates sorting keys for names:

| Input                     | Sorting Key               |
| ------------------------- | ------------------------- |
| "John Smith"              | "Smith, John"             |
| "J.K. Rowling"            | "Rowling, J.K."           |
| "Ludwig van Beethoven"    | "Beethoven, Ludwig van"   |
| "García Márquez, Gabriel" | "García Márquez, Gabriel" |

## Confidence Scoring

Confidence scores indicate the reliability of metadata:

| Range     | Tier        | Meaning                                              |
| --------- | ----------- | ---------------------------------------------------- |
| 0.95-1.00 | Exceptional | Very high confidence, multiple authoritative sources |
| 0.90-0.95 | Strong      | High confidence, reliable data                       |
| 0.70-0.90 | Good        | Good confidence, likely accurate                     |
| 0.50-0.70 | Moderate    | Moderate confidence, may need verification           |
| 0.30-0.50 | Weak        | Low confidence, verification recommended             |
| 0.00-0.30 | Poor        | Very low confidence, likely unreliable               |

### Confidence Calculation

Confidence scores are calculated based on:

1. **Base Confidence**: Provider's initial confidence (0.5-0.9)
2. **Source Count Boost**: +0.05 per additional source (max +0.15)
3. **Agreement Boost**: +0.10 when sources agree on values
4. **Reliability Boost**: +0.08 for high-quality providers
5. **Disagreement Penalty**: -0.10 to -0.20 for conflicting data

Example:

```
WikiData alone: 0.90
+ LoC agreeing: 0.95 (+0.05 source boost)
+ OpenLib agreeing: 0.98 (+0.03 source boost, +0.05 agreement boost)
```

## Duplicate Detection

The system detects duplicates using multiple strategies:

### 1. Exact Asset Match

- Compares file checksums (SHA-256)
- Confidence: 1.0 (perfect match)
- Action: Skip or prompt

### 2. ISBN Match

- Compares ISBN-10 or ISBN-13
- Confidence: 0.95+ (different editions possible)
- Action: Add as new edition or prompt

### 3. Fuzzy Title/Author Match

- Uses Levenshtein distance
- Normalizes titles (lowercase, remove punctuation)
- Confidence: 0.70-0.90 (depending on similarity)
- Action: Prompt for confirmation

## Error Handling

The enrichment system handles errors gracefully:

```typescript
// Provider failures don't stop enrichment
const result = await enrichMetadata(metadata, providers);
// If WikiData fails, other providers still run
// If all providers fail, returns empty enrichment

// Ingestion continues even if enrichment fails
const ingestResult = await ingestWork({
  file,
  metadata,
  enrich: true, // Enrichment is best-effort
});
// Work is created with ebook metadata even if providers are unavailable
```

## Performance Considerations

### Caching

Enable provider caching to reduce API calls:

```typescript
import { CacheableMetadataProvider } from "../metadata/cacheable-provider.js";

const cached = new CacheableMetadataProvider(provider, {
  maxSize: 1000,
  defaultTtl: 300000, // 5 minutes
});
```

### Rate Limiting

Providers automatically handle rate limiting:

- WikiData: 60 requests/min, 1s delay
- LoC: 30 requests/min, 2s delay
- Open Library: 100 requests/min, 200ms delay

### Timeouts

Set appropriate timeouts to prevent hanging:

```typescript
const result = await enrichMetadata(metadata, providers, {
  timeout: 30000, // 30 seconds total
});
```

### Parallel vs Sequential

- **Parallel**: Faster, use for ISBN or Title+Author
- **Sequential**: Slower but more reliable, use for title-only

## Testing

Run tests with:

```bash
pnpm test metadata-converter.test.ts
```

Tests cover:

- Field conversion
- Name sorting key generation
- Record merging
- Conflict detection and resolution
- Confidence calculation
- Array deduplication

## Future Enhancements

- [ ] Machine learning for better duplicate detection
- [ ] User feedback loop for confidence calibration
- [ ] Background enrichment queue
- [ ] Provider health monitoring
- [ ] Advanced reconciliation with @colibri-hq/metadata-reconciliation
- [ ] Support for more identifier types (ASIN, OCLC, etc.)
- [ ] Cover image download and storage
- [ ] Series detection from titles

## Related Documentation

- [`../metadata/README.md`](../metadata/README.md) - Provider system
- [`../../README.md`](../../README.md) - SDK overview
- [`SEARCH_STRATEGY.md`](./SEARCH_STRATEGY.md) - Search strategies
- [`../metadata/reconciliation/README.md`](../metadata/reconciliation/README.md) - Reconciliation
