---
title: Metadata SDK
description: Fetch and reconcile book metadata from multiple providers
date: 2024-01-01
order: 2
tags: [sdk, metadata, providers, developers]
relevance: 70
---

# Metadata SDK

The Metadata SDK helps you discover, normalize, and reconcile book metadata from multiple sources. Query 14+ different
providers—including Open Library, WikiData, Library of Congress, and Google Books—through a unified API, then merge
results into a single, high-confidence record.

## Installation

```bash
npm install @colibri-hq/sdk
# or
pnpm add @colibri-hq/sdk
```

## Quick Start

Search for a book by ISBN and get metadata from multiple sources:

```typescript
import {
  MetadataAggregator,
  OpenLibraryMetadataProvider,
  WikiDataMetadataProvider,
} from "@colibri-hq/sdk/metadata";

const aggregator = new MetadataAggregator([
  new OpenLibraryMetadataProvider(),
  new WikiDataMetadataProvider(),
]);

const { results, consensus } = await aggregator.searchByISBN("978-0-14-028329-7");

console.log(results[0].title); // "The Great Gatsby"
console.log(results[0].authors); // ["F. Scott Fitzgerald"]
console.log(consensus?.confidence); // 0.92
```

---

## Core Concepts

### Providers

A provider fetches metadata from a single source. Each provider implements the same interface, so you can mix and match
them freely.

```typescript
import { OpenLibraryMetadataProvider } from "@colibri-hq/sdk/metadata";

const provider = new OpenLibraryMetadataProvider();
const results = await provider.searchByISBN("978-0-14-028329-7");
```

### Aggregator

The aggregator queries multiple providers in parallel, deduplicates results, and calculates consensus confidence scores.

```typescript
import { MetadataAggregator } from "@colibri-hq/sdk/metadata";

const aggregator = new MetadataAggregator(providers, {
  timeout: 30_000, // Total timeout in milliseconds
  deduplicateByIsbn: true, // Merge records with matching ISBNs
  calculateConsensus: true, // Calculate agreement scores
});
```

### Records

Every search returns an array of `MetadataRecord` objects:

```typescript
interface MetadataRecord {
  id: string;
  source: string;
  confidence: number;
  timestamp: Date;

  title?: string;
  authors?: string[];
  isbn?: string[];
  publisher?: string;
  publicationDate?: Date;
  language?: string;
  pageCount?: number;
  subjects?: string[];
  description?: string;
  series?: { name: string; volume?: number };
  coverImage?: { url: string; width?: number; height?: number };
}
```

---

## Searching for Metadata

### Search by ISBN

ISBN searches provide the highest confidence results. The SDK normalizes ISBNs automatically—you can pass ISBN-10 or
ISBN-13, with or without hyphens.

```typescript
// All of these work
await aggregator.searchByISBN("978-0-14-028329-7");
await aggregator.searchByISBN("9780140283297");
await aggregator.searchByISBN("0-14-028329-7");
```

### Search by Title

Title searches are useful when you don't have an ISBN. Use `exactMatch` for precise matching or leave it off for fuzzy
search.

```typescript
const results = await aggregator.searchByTitle({ title: "The Great Gatsby", exactMatch: false });
```

### Search by Author

Find all books by a specific author:

```typescript
const results = await aggregator.searchByCreator({
  name: "F. Scott Fitzgerald",
  fuzzy: true, // Match name variations
});
```

### Multi-criteria Search

Combine multiple criteria for more targeted results. The aggregator uses the most specific criteria available.

```typescript
const results = await aggregator.searchMultiCriteria({
  title: "Gatsby",
  authors: ["Fitzgerald"],
  language: "en",
  yearRange: [1920, 1930],
});
```

---

## Available Providers

### Free Providers

These providers require no authentication:

| Provider                            | Best for                         |
| ----------------------------------- | -------------------------------- |
| `OpenLibraryMetadataProvider`       | General book metadata, covers    |
| `WikiDataMetadataProvider`          | Authority data, linked entities  |
| `LibraryOfCongressMetadataProvider` | Authoritative bibliographic data |
| `ISNIMetadataProvider`              | Author identification            |
| `ViafMetadataProvider`              | Virtual authority records        |
| `InternetArchiveMetadataProvider`   | Public domain, historical works  |
| `CrossrefMetadataProvider`          | Academic works, DOI resolution   |
| `DOABMetadataProvider`              | Open access academic books       |
| `DNBMetadataProvider`               | German publications              |
| `BNBMetadataProvider`               | British publications             |

```typescript
import {
  OpenLibraryMetadataProvider,
  WikiDataMetadataProvider,
  LibraryOfCongressMetadataProvider,
} from "@colibri-hq/sdk/metadata";

const aggregator = new MetadataAggregator([
  new OpenLibraryMetadataProvider(),
  new WikiDataMetadataProvider(),
  new LibraryOfCongressMetadataProvider(),
]);
```

### Authenticated Providers

These providers require API keys:

| Provider                         | Registration                                                  |
| -------------------------------- | ------------------------------------------------------------- |
| `GoogleBooksMetadataProvider`    | [Google Cloud Console](https://console.cloud.google.com/)     |
| `SpringerNatureMetadataProvider` | [Springer Nature API Portal](https://dev.springernature.com/) |
| `ISBNdbMetadataProvider`         | [ISBNdb](https://isbndb.com/apidocs)                          |
| `AmazonPaapiMetadataProvider`    | [Amazon Associates](https://affiliate-program.amazon.com/)    |

```typescript
import { GoogleBooksMetadataProvider } from "@colibri-hq/sdk/metadata";

const googleBooks = new GoogleBooksMetadataProvider({ apiKey: process.env.GOOGLE_BOOKS_API_KEY });
```

### Embedded Metadata

Extract metadata from ebook files (EPUB, MOBI, or PDF):

```typescript
import { EmbeddedMetadataProvider } from "@colibri-hq/sdk/metadata";

const provider = new EmbeddedMetadataProvider();
const record = await provider.extractFromFile(file);

// Use the embedded data to search for additional metadata
if (record.isbn?.[0]) {
  const enriched = await aggregator.searchByISBN(record.isbn[0]);
}
```

---

## Normalization

The SDK provides utilities to normalize metadata into consistent formats.

### ISBN Normalization

Convert any ISBN format to a canonical form:

```typescript
import { cleanIsbn, isValidIsbn, normalizeIsbn } from "@colibri-hq/sdk/metadata";

// Remove formatting
cleanIsbn("978-0-14-028329-7"); // "9780140283297"

// Validate and convert to ISBN-13
normalizeIsbn("0-14-028329-7"); // "9780140283297"

// Check validity
isValidIsbn("9780140283297"); // true
isValidIsbn("1234567890"); // false
```

### Author Name Normalization

Standardize author name formats:

```typescript
import { normalizeAuthorName, parseAuthorName, formatAuthorName } from "@colibri-hq/sdk/metadata";

// Convert "Last, First" to "First Last"
normalizeAuthorName("Fitzgerald, F. Scott"); // "F. Scott Fitzgerald"

// Parse into components
const parsed = parseAuthorName("F. Scott Fitzgerald");
// { first: 'F. Scott', last: 'Fitzgerald', middle: [] }

// Format as needed
formatAuthorName(parsed, "last-first"); // "Fitzgerald, F. Scott"
```

### Language Code Normalization

Convert language codes to ISO 639-1:

```typescript
import { normalizeLanguageCode } from "@colibri-hq/sdk/metadata";

normalizeLanguageCode("eng"); // "en"
normalizeLanguageCode("English"); // "en"
normalizeLanguageCode("de"); // "de"
```

### Date Parsing

Parse publication dates from various formats:

```typescript
import { parsePublicationDate, extractYear } from "@colibri-hq/sdk/metadata";

parsePublicationDate("2020-03-15"); // { year: 2020, month: 3, day: 15 }
parsePublicationDate("March 2020"); // { year: 2020, month: 3 }
parsePublicationDate("c. 1925"); // { year: 1925, approximate: true }

extractYear("Published in 2020"); // 2020
```

---

## Reconciliation

When multiple providers return data for the same book, the SDK reconciles differences to produce a unified record.

### Automatic Reconciliation

The aggregator handles reconciliation automatically when you enable deduplication:

```typescript
const aggregator = new MetadataAggregator(providers, {
  deduplicateByIsbn: true,
  calculateConsensus: true,
});

const { results, consensus } = await aggregator.searchByISBN(isbn);

// Results are deduplicated and merged
// Consensus contains agreement metrics
console.log(consensus?.confidence); // 0.92
console.log(consensus?.agreementScore); // 0.88
```

### Confidence Scoring

The SDK calculates confidence based on multiple factors:

| Factor            | Description                                     |
| ----------------- | ----------------------------------------------- |
| Source count      | More sources agreeing increases confidence      |
| Source quality    | Higher-priority providers carry more weight     |
| Field agreement   | Fields matching across sources boost confidence |
| Data completeness | More complete records score higher              |

**Confidence Tiers:**

| Tier        | Score     | Interpretation                             |
| ----------- | --------- | ------------------------------------------ |
| Exceptional | 0.95+     | Very high agreement, authoritative sources |
| Strong      | 0.90–0.95 | Good consensus across multiple sources     |
| Good        | 0.80–0.90 | Moderate agreement                         |
| Moderate    | 0.65–0.80 | Some disagreement between sources          |
| Weak        | 0.50–0.65 | Limited agreement                          |
| Poor        | &lt; 0.50 | Significant conflicts                      |

### Conflict Detection

Detect and analyze conflicts between metadata sources:

```typescript
import { ConflictDetector, ConflictDisplayFormatter } from "@colibri-hq/sdk/metadata";

const detector = new ConflictDetector();
const conflicts = detector.detectConflicts(preview);

console.log(`Total conflicts: ${conflicts.summary.totalConflicts}`);
console.log(`Critical: ${conflicts.summary.criticalCount}`);

// Format conflicts for display
const formatter = new ConflictDisplayFormatter();
const formatted = formatter.formatConflicts(conflicts.conflicts);

for (const conflict of formatted) {
  console.log(`Field: ${conflict.fieldName}`);
  console.log(`Severity: ${conflict.severity}`);
  for (const value of conflict.values) {
    console.log(`  ${value.source}: ${value.displayValue}`);
  }
}
```

---

## Error Handling

### Graceful Degradation

The aggregator continues if some providers fail. Check the `errors` map to see which providers encountered issues:

```typescript
const { results, errors } = await aggregator.searchByISBN(isbn);

if (errors.size > 0) {
  for (const [provider, error] of errors) {
    console.warn(`${provider}: ${error.message}`);
  }
}

// Results from successful providers are still available
console.log(`Got ${results.length} results`);
```

### Retry Behavior

Providers automatically retry on transient failures:

- Network timeouts
- Connection errors
- Server errors (5xx)

Retries use exponential backoff with jitter. Non-retryable errors (4xx client errors) fail immediately.

### Rate Limiting

All providers respect rate limits automatically. The SDK queues requests and waits when necessary:

- **Open Library**: 100 requests/minute
- **WikiData**: 60 requests/minute
- **Amazon PAAPI**: 1 request/second

---

## Performance

### Caching

Enable caching to avoid redundant API calls:

```typescript
import { MetadataCache } from "@colibri-hq/sdk/metadata";

const cache = new MetadataCache({
  maxSize: 1000,
  ttl: 3600000, // 1 hour
});

// Check cache before querying
const cached = await cache.get(cacheKey);
if (cached) {
  return cached;
}

const results = await aggregator.searchByISBN(isbn);
await cache.set(cacheKey, results);
```

### Timeouts

Configure timeouts to prevent slow responses:

```typescript
const aggregator = new MetadataAggregator(providers, {
  timeout: 15000, // 15 seconds total
});
```

### Parallel Queries

The aggregator queries all providers in parallel by default. Use `maxProviders` to limit concurrency:

```typescript
const selected = selectProviders(providers, query, "priority", {
  maxProviders: 3, // Only query top 3 providers
});
```

---

## Advanced Features

### Series Management

Find and manage book series:

```typescript
import { findOrCreateSeries, addWorkToSeries } from "@colibri-hq/sdk";

// Find existing series or create a new one
const series = await findOrCreateSeries(database, "The Wheel of Time", {
  language: "eng",
  userId: "user-123",
});

// Add a work to the series with optional position
await addWorkToSeries(database, workId, series.id, 1); // Position 1
```

### Tag Management

Tags (subjects/genres) are normalized and deduplicated automatically:

```typescript
import { findOrCreateTags, addTagsToWork } from "@colibri-hq/sdk";

// Batch create or find tags (optimized for multiple tags)
const tags = await findOrCreateTags(database, ["epic fantasy", "magic", "adventure"], {
  userId: "user-123",
});

// Batch link tags to a work
await addTagsToWork(
  database,
  workId,
  tags.map(({ id }) => id),
);
```

### Duplicate Detection

Detect potential duplicates in your library:

```typescript
import { DuplicateDetector, detectDuplicates } from "@colibri-hq/sdk/metadata";

const detector = new DuplicateDetector({ minSimilarityThreshold: 0.7 });

const duplicates = detector.detectDuplicates(proposedEntry, existingLibrary);

for (const match of duplicates) {
  console.log(`Match: ${match.entry.title}`);
  console.log(`Similarity: ${match.similarity}`);
  console.log(`Type: ${match.matchType}`); // 'exact' | 'likely' | 'possible'
  console.log(`Recommendation: ${match.recommendation}`); // 'skip' | 'merge' | 'review_manually'
}
```

---

## TypeScript Support

The SDK is written in TypeScript and exports all types:

```typescript
import type {
  MetadataRecord,
  MetadataProvider,
  TitleQuery,
  CreatorQuery,
  MultiCriteriaQuery,
  AggregatedResult,
  ConfidenceFactors,
} from "@colibri-hq/sdk/metadata";
```

---

## Example: Complete Enrichment Flow

Extract metadata from a file and enrich it with external sources:

```typescript
import {
  EmbeddedMetadataProvider,
  MetadataAggregator,
  OpenLibraryMetadataProvider,
  WikiDataMetadataProvider,
} from "@colibri-hq/sdk/metadata";

async function enrichEbook(file: File) {
  // Extract embedded metadata
  const embedded = new EmbeddedMetadataProvider();
  const fileRecord = await embedded.extractFromFile(file);

  // Search external sources
  const aggregator = new MetadataAggregator([
    new OpenLibraryMetadataProvider(),
    new WikiDataMetadataProvider(),
  ]);

  let externalRecords = [];

  if (fileRecord.isbn?.[0]) {
    const { results } = await aggregator.searchByISBN(fileRecord.isbn[0]);
    externalRecords = results;
  } else if (fileRecord.title) {
    const { results } = await aggregator.searchByTitle({ title: fileRecord.title });
    externalRecords = results;
  }

  // Merge: prefer embedded for core fields, external for enrichment
  return {
    title: fileRecord.title,
    authors: fileRecord.authors,
    isbn: fileRecord.isbn,
    pageCount: fileRecord.pageCount,
    // Enrich with external data
    subjects: externalRecords[0]?.subjects,
    description: externalRecords[0]?.description,
    series: externalRecords[0]?.series,
  };
}
```

---

## Related Documentation

- [Ingestion SDK](/packages/sdk/ingestion) - Ebook ingestion pipeline
- [SDK Overview](/packages/sdk) - Core SDK features
- [Open Library Client](/packages/open-library-client) - Open Library API client
