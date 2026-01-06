# Metadata Provider Search Strategy Guide

This guide explains the optimal strategies for querying metadata providers to achieve maximum coverage and data quality during the ingestion enrichment flow.

## Table of Contents

1. [Provider Comparison](#provider-comparison)
2. [Search Strategies by Data Type](#search-strategies-by-data-type)
3. [Conflict Resolution](#conflict-resolution)
4. [Performance Optimization](#performance-optimization)
5. [Code Examples](#code-examples)

---

## Provider Comparison

### Overview

| Provider                | Priority | Rate Limit       | Timeout | Best For                             |
| ----------------------- | -------- | ---------------- | ------- | ------------------------------------ |
| **WikiData**            | 85       | 60/min, 1s delay | 20s/60s | ISBN, Authors, Structured Data       |
| **Library of Congress** | 85       | 30/min, 2s delay | 25s/75s | ISBN, Cataloging, Subjects           |
| **Open Library**        | 80       | 100/min, 200ms   | 15s/45s | Cover Images, Editions, Availability |
| **ISNI**                | 70       | 50/min, 500ms    | 20s/60s | Author Identity, Disambiguation      |

### Provider Strengths and Weaknesses

#### WikiData

- **Strengths**
  - Highly structured, curated data
  - Excellent for exact matching (fast SPARQL queries)
  - Strong author authority data
  - ISO language codes
- **Weaknesses**
  - May not have all books (especially newer/obscure titles)
  - English-centric coverage
  - No cover images
- **Reliability Scores**
  - ISBN: 0.98
  - Authors: 0.95
  - Title: 0.92
  - Publication Date: 0.90

#### Library of Congress

- **Strengths**
  - Authoritative bibliographic data
  - Comprehensive US publications
  - Excellent subject classification
  - High-quality cataloging
- **Weaknesses**
  - Slower queries (SRU protocol)
  - Stricter rate limiting
  - US-centric coverage
- **Reliability Scores**
  - ISBN: 0.95
  - Subjects: 0.92
  - Title: 0.90
  - Authors: 0.88

#### Open Library

- **Strengths**
  - Broad international coverage
  - Multiple editions per work
  - Fast REST API
  - Cover image URLs
  - Edition availability data
- **Weaknesses**
  - Community-contributed data (variable quality)
  - Potential for duplicate/conflicting records
  - Less structured than WikiData/LoC
- **Reliability Scores**
  - Title: 0.95
  - Cover Images: 0.85
  - ISBN: 0.95
  - Authors: 0.90

#### ISNI

- **Strengths**
  - Author identity authority
  - Excellent for disambiguation
  - International coverage
  - Links to other systems (VIAF, WikiData)
- **Weaknesses**
  - Limited book metadata
  - Focused on people/organizations
  - Slower queries (SRU protocol)
- **Reliability Scores**
  - Author Identity: 0.95
  - Author Metadata: 0.85

---

## Search Strategies by Data Type

### 1. ISBN Searches - Most Reliable

**When to use:** You have an ISBN-10 or ISBN-13 from the ebook file

**Recommended Strategy: Parallel Query**

Query WikiData + Library of Congress in parallel for maximum speed and reliability:

```typescript
// Parallel ISBN search
const [wikidataResults, locResults, olResults] = await Promise.all([
  wikidataProvider.searchByISBN(isbn),
  locProvider.searchByISBN(isbn),
  openLibraryProvider.searchByISBN(isbn),
]);
```

**Priority Order:**

1. **WikiData** (Priority 85, Reliability 0.98) - Fast exact matching
2. **Library of Congress** (Priority 85, Reliability 0.95) - Authoritative
3. **Open Library** (Priority 80, Reliability 0.95) - Broad coverage

**Why parallel?**

- ISBN searches are fast (exact lookups)
- Cross-validation increases confidence
- Different providers may have different editions
- Total time ≈ slowest provider (not sum of all)

**Expected Confidence:**

- Single source: 0.85-0.92
- 2+ sources agreeing: 0.90-0.95
- 3+ sources agreeing: 0.95-0.98

### 2. Title + Author Searches

**When to use:** No ISBN, but you have title and author metadata

**Recommended Strategy: Parallel Query with Aggregation**

Query top 3 providers in parallel, then aggregate using consensus-based reconciliation:

```typescript
// Parallel multi-criteria search
const query: MultiCriteriaQuery = {
  title: "The Great Gatsby",
  authors: ["F. Scott Fitzgerald"],
  fuzzy: true,
};

const [wikidataResults, locResults, olResults] = await Promise.all([
  wikidataProvider.searchMultiCriteria(query),
  locProvider.searchMultiCriteria(query),
  openLibraryProvider.searchMultiCriteria(query),
]);

// Merge and reconcile
const merged = mergeMetadataRecords([
  ...wikidataResults,
  ...locResults,
  ...olResults,
]);
```

**Priority Order:**

1. **WikiData** (85) - Exact label matching, fast
2. **Library of Congress** (85) - Authoritative data
3. **Open Library** (80) - Fuzzy matching, broad coverage

**Expected Confidence:**

- Single source: 0.70-0.85
- 2+ sources agreeing: 0.80-0.90
- 3+ sources agreeing: 0.85-0.95

### 3. Title-Only Searches

**When to use:** You only have a title (no author or ISBN)

**Recommended Strategy: Sequential Query with Early Exit**

Try providers in order of reliability for title searches:

```typescript
// Sequential title search with early exit
let results: MetadataRecord[] = [];

// Try Open Library first (best for fuzzy title matching)
results = await openLibraryProvider.searchByTitle({ title, fuzzy: true });

if (results.length === 0 || results[0].confidence < 0.8) {
  // Try WikiData next
  results = await wikidataProvider.searchByTitle({ title, exactMatch: false });
}

if (results.length === 0 || results[0].confidence < 0.8) {
  // Try Library of Congress last
  results = await locProvider.searchByTitle({ title });
}
```

**Priority Order:**

1. **Open Library** (80) - Best fuzzy matching
2. **WikiData** (85) - Exact matching (may miss variations)
3. **Library of Congress** (85) - Comprehensive but slower

**Expected Confidence:**

- Title-only searches: 0.60-0.75 (lower due to ambiguity)
- Add language filter: +0.05 confidence
- Add year filter: +0.05 confidence

### 4. Author-Only Searches

**When to use:** You only have author metadata (no title or ISBN)

**Recommended Strategy: Sequential Query with Author Authority**

Use ISNI first for author identity, then search for books:

```typescript
// Sequential author search with identity resolution
const authorQuery: CreatorQuery = { name: "J.K. Rowling" };

// First, resolve author identity with ISNI
const isniResults = await isniProvider.searchByCreator(authorQuery);

// Then search for books by that author
const [wikidataResults, olResults] = await Promise.all([
  wikidataProvider.searchByCreator(authorQuery),
  openLibraryProvider.searchByCreator(authorQuery),
]);
```

**Priority Order:**

1. **ISNI** (70) - Author identity resolution
2. **WikiData** (85) - Structured author data
3. **Open Library** (80) - Broad coverage

**Expected Confidence:**

- Author-only searches: 0.65-0.75 (lower due to multiple works)
- With author ID (ISNI/VIAF): +0.10 confidence

---

## Conflict Resolution

When multiple providers return different values for the same field, use these strategies:

### 1. Source Reliability Weighting

Choose the value from the most reliable source **for that specific data type**.

```typescript
// Example: Conflicting publication dates
const dates = [
  { value: new Date("2020-01-15"), source: "WikiData", confidence: 0.9 },
  { value: new Date("2020-01-01"), source: "LoC", confidence: 0.85 },
  { value: new Date("2019-12-31"), source: "OpenLibrary", confidence: 0.8 },
];

// WikiData has highest reliability for publication dates (0.90)
// AND highest confidence (0.90)
// → Choose WikiData's value: 2020-01-15
```

**Reliability by Field:**

| Field    | WikiData | LoC  | Open Library |
| -------- | -------- | ---- | ------------ |
| ISBN     | 0.98     | 0.95 | 0.95         |
| Title    | 0.92     | 0.90 | 0.95         |
| Authors  | 0.95     | 0.88 | 0.90         |
| Pub Date | 0.90     | 0.88 | 0.85         |
| Subjects | 0.85     | 0.92 | 0.80         |
| Language | 0.95     | 0.88 | 0.85         |

### 2. Confidence-Based Selection

For each field, prefer the value with the highest **confidence score**:

```typescript
import { selectBestValue } from "./metadata-converter.js";

// Automatically selects value with highest confidence
const bestTitle = selectBestValue<string>(
  allRecords,
  "title",
  0.6, // minimum confidence threshold
);
```

### 3. Majority Vote

When 3+ sources agree, use consensus:

```typescript
// Example: 3 sources agree on language = "en"
const languages = [
  { value: "en", source: "WikiData" },
  { value: "en", source: "LoC" },
  { value: "en", source: "OpenLibrary" },
];

// Strong consensus → confidence boost: +0.10
```

### 4. Field-Specific Strategies

Different fields require different conflict resolution approaches:

#### Title

- Prefer **shortest** version if titles are similar
- Example: "The Great Gatsby" > "The Great Gatsby (Penguin Classics)"
- Rationale: Avoid edition-specific suffixes

#### Authors

- **Merge and deduplicate**, handling name variations
- Normalize: "Rowling, J.K." = "J.K. Rowling"
- Include all unique authors across sources

#### ISBN

- **Collect all unique ISBNs** (different editions are valid)
- Normalize: remove hyphens for comparison
- Keep both ISBN-10 and ISBN-13 if different

#### Publication Date

- Use **earliest date** if dates are close (within 1 year)
- Rationale: First edition date is canonical
- Format: Prefer full date over year-only

#### Description/Synopsis

- Prefer **longest/most complete** description
- Rationale: More information is better
- Combine if complementary (use reconciliation package)

#### Subjects

- **Merge all subjects**, deduplicate by normalization
- Normalize: lowercase, trim, remove punctuation
- Rationale: More subject tags = better discoverability

#### Publisher

- Use **most reliable source** in priority order:
  1. WikiData (0.88)
  2. Library of Congress (0.85)
  3. Open Library (0.80)
- Format: Prefer full publisher name over abbreviation

#### Series

- Choose **most complete** series data (name + volume)
- If only name differs, use highest confidence source
- If volume differs, prefer numerical volume over text

### 5. Advanced: Reconciliation Package Integration

For complex scenarios, use the `@colibri-hq/metadata-reconciliation` package:

```typescript
import {
  DateReconciler,
  PublisherReconciler,
} from "@colibri-hq/metadata-reconciliation";

// Date reconciliation with confidence scoring
const dateReconciler = new DateReconciler();
const reconciledDate = dateReconciler.reconcile(allRecords);

// Publisher reconciliation with entity merging
const publisherReconciler = new PublisherReconciler();
const reconciledPublisher = publisherReconciler.reconcile(allRecords);
```

**Available Reconcilers:**

- `DateReconciler` - Publication dates, date ranges
- `PublisherReconciler` - Publisher entity merging
- `AuthorReconciler` - Author name normalization
- `SubjectReconciler` - Subject/category merging
- `IdentifierReconciler` - ISBN, ASIN, OCLC, etc.
- `PhysicalReconciler` - Page count, dimensions
- `SeriesReconciler` - Series name & position

---

## Performance Optimization

### 1. Caching Strategy

Enable provider-level caching to reduce API calls:

```typescript
import { CacheableMetadataProvider } from "../metadata/cacheable-provider.js";

const cachedProvider = new CacheableMetadataProvider(wikidataProvider, {
  maxSize: 1000,
  defaultTtl: 300000, // 5 minutes
  evictionStrategy: "LRU",
});
```

**Cache Hit Rates:**

- ISBN searches: 40-60% (same books requested multiple times)
- Title searches: 20-30% (less exact, lower hit rate)

### 2. Rate Limiting

Respect provider rate limits to avoid throttling:

| Provider     | Max Requests | Window | Delay |
| ------------ | ------------ | ------ | ----- |
| WikiData     | 60           | 1 min  | 1s    |
| LoC          | 30           | 1 min  | 2s    |
| Open Library | 100          | 1 min  | 200ms |
| ISNI         | 50           | 1 min  | 500ms |

**Built-in rate limiting:**

```typescript
// Rate limiting is automatic via RateLimiter
// Configuration in provider.rateLimit
```

### 3. Timeout Management

Set appropriate timeouts to prevent hanging:

```typescript
const timeout = {
  requestTimeout: 20000, // 20s per request
  operationTimeout: 60000, // 60s total operation
};
```

**Recommended Timeouts:**

- WikiData: 20s request, 60s operation
- LoC: 25s request, 75s operation (slower SRU)
- Open Library: 15s request, 45s operation (fast REST)

### 4. Parallel Query Optimization

Query multiple providers concurrently, but limit parallelism:

```typescript
// Limit to 3 concurrent provider queries
const maxParallel = 3;
const chunks = chunkArray(providers, maxParallel);

for (const chunk of chunks) {
  const results = await Promise.all(chunk.map((p) => p.searchByISBN(isbn)));
  // Process results...
}
```

**Why limit parallelism?**

- Avoid overwhelming rate limiters
- Reduce memory usage
- Better error isolation

### 5. Early Exit Strategy

Stop querying when confidence is high enough:

```typescript
// Early exit on high-confidence ISBN match
for (const provider of providers) {
  const results = await provider.searchByISBN(isbn);

  if (results.length > 0 && results[0].confidence > 0.9) {
    // High confidence - stop searching
    return results;
  }
}
```

**Early Exit Thresholds:**

- ISBN match: 0.90+ confidence
- Title+Author match: 0.85+ confidence
- Title-only match: 0.80+ confidence

---

## Code Examples

### Example 1: Complete Enrichment Flow

```typescript
import { enrichMetadata } from "./enrich.js";
import {
  convertToExtractedMetadata,
  mergeMetadataRecords,
} from "./metadata-converter.js";
import { globalProviderRegistry } from "../metadata/registry.js";

// 1. Get providers (auto-sorted by priority)
const providers = globalProviderRegistry.getEnabledProviders();

// 2. Extract metadata from ebook
const ebookMetadata: ExtractedMetadata = {
  title: "The Great Gatsby",
  contributors: [{ name: "F. Scott Fitzgerald", roles: ["aut"] }],
  identifiers: [{ type: "isbn", value: "9780743273565" }],
  language: "en",
};

// 3. Enrich with providers
const enrichmentResult = await enrichMetadata(ebookMetadata, providers, {
  preferredLanguage: "en",
  maxParallel: 3,
  strategy: "merge-all",
});

// 4. Merge enriched data with original
const finalMetadata = {
  ...ebookMetadata,
  ...enrichmentResult.enriched,
};

console.log("Enriched metadata:", finalMetadata);
console.log("Data sources:", enrichmentResult.sources);
console.log("Field confidence:", enrichmentResult.confidence);
```

### Example 2: ISBN Search with Fallback

```typescript
async function searchWithFallback(isbn: string): Promise<MetadataRecord[]> {
  // Try WikiData first (highest priority + reliability for ISBN)
  const wikidataResults = await wikidataProvider.searchByISBN(isbn);

  if (wikidataResults.length > 0 && wikidataResults[0].confidence >= 0.9) {
    // High confidence - use WikiData result
    return wikidataResults;
  }

  // Parallel search with LoC and Open Library
  const [locResults, olResults] = await Promise.all([
    locProvider.searchByISBN(isbn),
    openLibraryProvider.searchByISBN(isbn),
  ]);

  // Merge all results
  return [...wikidataResults, ...locResults, ...olResults];
}
```

### Example 3: Conflict Resolution

```typescript
import { resolveConflict } from "./metadata-converter.js";

// Multiple providers return different publication dates
const allRecords: MetadataRecord[] = [
  { ...wikidataRecord, publicationDate: new Date("2020-01-15") },
  { ...locRecord, publicationDate: new Date("2020-01-01") },
  { ...olRecord, publicationDate: new Date("2019-12-31") },
];

// Resolve conflict automatically
const resolution = resolveConflict<Date>(
  allRecords,
  "publicationDate",
  (date) => date.getFullYear().toString(), // Normalize by year
);

console.log("Chosen date:", resolution.value);
console.log("Has conflict:", resolution.hasConflict);
console.log("Alternatives:", resolution.alternatives);
```

### Example 4: Custom Search Strategy

```typescript
async function customSearchStrategy(
  metadata: ExtractedMetadata,
): Promise<Partial<ExtractedMetadata>> {
  // Strategy 1: ISBN (if available)
  const isbn = metadata.identifiers?.find((i) => i.type === "isbn")?.value;
  if (isbn) {
    const records = await searchByISBNParallel(isbn);
    if (records.length > 0) {
      return mergeMetadataRecords(records);
    }
  }

  // Strategy 2: Title + Author (parallel)
  if (metadata.title && metadata.contributors?.length) {
    const records = await searchByTitleAuthorParallel(
      metadata.title,
      metadata.contributors[0].name,
    );
    if (records.length > 0) {
      return mergeMetadataRecords(records);
    }
  }

  // Strategy 3: Title only (sequential)
  if (metadata.title) {
    const records = await searchByTitleSequential(metadata.title);
    if (records.length > 0) {
      return mergeMetadataRecords(records);
    }
  }

  // No results
  return {};
}
```

---

## Summary

**Quick Reference:**

1. **Best for ISBN**: WikiData + LoC (parallel)
2. **Best for Title+Author**: WikiData + LoC + OpenLib (parallel)
3. **Best for Title only**: OpenLib → WikiData → LoC (sequential)
4. **Best for Author**: ISNI → WikiData → OpenLib (sequential)

**Conflict Resolution Priority:**

1. Source reliability for field type
2. Confidence score
3. Majority vote (3+ sources)
4. Field-specific rules

**Performance Tips:**

- Enable caching (5min TTL)
- Limit to 3 parallel queries
- Set timeouts: 20s/request, 60s/operation
- Early exit on 0.9+ confidence
