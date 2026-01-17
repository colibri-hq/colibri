# Metadata SDK

The Metadata SDK helps you discover, normalize, and reconcile book metadata from multiple sources. Query 14 different
providers—including Open Library, WikiData, Library of Congress, and Google Books—through a unified API, then merge
results into a single, high-confidence record.

## Installation

```bash
npm install @colibri-hq/sdk
# or
pnpm add @colibri-hq/sdk
```

## Quick start

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

## Core concepts

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

## Searching for metadata

### Search by ISBN

ISBN searches provide the highest confidence results. The SDK normalizes ISBNs automatically—you can pass ISBN-10 or
ISBN-13, with or without hyphens.

```typescript
// All of these work
await aggregator.searchByISBN("978-0-14-028329-7");
await aggregator.searchByISBN("9780140283297");
await aggregator.searchByISBN("0-14-028329-7");
```

### Search by title

Title searches are useful when you don't have an ISBN. Use `exactMatch` for precise matching or leave it off for fuzzy
search.

```typescript
const results = await aggregator.searchByTitle({ title: "The Great Gatsby", exactMatch: false });
```

### Search by author

Find all books by a specific author:

```typescript
const results = await aggregator.searchByCreator({
  name: "F. Scott Fitzgerald",
  fuzzy: true, // Match name variations
});
```

### Multi-criteria search

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

## Providers

### Free providers

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

### Authenticated providers

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

### Extracting metadata from files

If you have an ebook file (EPUB, MOBI, or PDF), extract its embedded metadata:

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

### ISBN normalization

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

### Author name normalization

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

### Creator name normalization

Normalize creator names for fuzzy matching and deduplication:

```typescript
import { normalizeCreatorName } from "@colibri-hq/sdk/ingestion";

// Handles initials, titles, suffixes, and punctuation
normalizeCreatorName("J.K. Rowling"); // "jk rowling"
normalizeCreatorName("J. K. Rowling"); // "jk rowling"
normalizeCreatorName("Rowling, J.K."); // "jk rowling"
normalizeCreatorName("Dr. John Smith"); // "john smith"
normalizeCreatorName("Martin Luther King Jr."); // "martin luther king"
normalizeCreatorName("José García"); // "jose garcia"
```

Supported transformations:

- Titles: Dr, Prof, Sir, Dame, Lord, Lady, Rev, Father, Mother, Brother, Sister, Saint, St, Pope
- Suffixes: Jr, Sr, Junior, Senior, I-XV (Roman numerals), PhD, MD, Esq
- Accents and diacritics are normalized to ASCII
- Apostrophes removed (O'Brien → obrien)
- Hyphens preserved in hyphenated names

### Publisher name normalization

Normalize publisher names for matching:

```typescript
import { normalizePublisherName } from "@colibri-hq/sdk/ingestion";

// Removes business suffixes and common words
normalizePublisherName("Penguin Books Ltd."); // "penguin"
normalizePublisherName("The Penguin Press"); // "penguin"
normalizePublisherName("O'Reilly Media"); // "oreilly media"
normalizePublisherName("McGraw-Hill"); // "mcgraw-hill"
```

Supported transformations:

- Business suffixes: Ltd, LLC, Inc, Corp, Co, Company
- Publishing words: Publishing, Publishers, Book(s), Press, Group
- Geographic terms: International, Worldwide
- Parentheticals removed (e.g., "Penguin (US)" → "penguin")

### Fuzzy matching

Find similar creators or publishers in the database using PostgreSQL's trigram similarity:

```typescript
import { findSimilarCreators, findSimilarPublishers } from "@colibri-hq/sdk";

// Find creators with similar names (default threshold: 70%)
const similar = await findSimilarCreators(database, "J. K. Rowling", 0.7);
// Returns: [{ creator: { name: "J.K. Rowling", ... }, similarity: 0.92 }]

// Find publishers with similar names
const matches = await findSimilarPublishers(database, "Penguin Books", 0.7);
// Returns: [{ publisher: { name: "Penguin", ... }, similarity: 0.87 }]
```

During book ingestion, fuzzy matching is applied automatically to prevent duplicates.

### Language code normalization

Convert language codes to ISO 639-1:

```typescript
import { normalizeLanguageCode } from "@colibri-hq/sdk/metadata";

normalizeLanguageCode("eng"); // "en"
normalizeLanguageCode("English"); // "en"
normalizeLanguageCode("de"); // "de"
```

### Date parsing

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

### Automatic reconciliation

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

### Consensus scoring

The SDK calculates confidence based on multiple factors:

| Factor            | Description                                     |
| ----------------- | ----------------------------------------------- |
| Source count      | More sources agreeing increases confidence      |
| Source quality    | Higher-priority providers carry more weight     |
| Field agreement   | Fields matching across sources boost confidence |
| Data completeness | More complete records score higher              |

Confidence tiers:

| Tier        | Score     | Interpretation                             |
| ----------- | --------- | ------------------------------------------ |
| Exceptional | 0.95+     | Very high agreement, authoritative sources |
| Strong      | 0.90–0.95 | Good consensus across multiple sources     |
| Good        | 0.80–0.90 | Moderate agreement                         |
| Moderate    | 0.65–0.80 | Some disagreement between sources          |
| Weak        | 0.50–0.65 | Limited agreement                          |
| Poor        | <0.50     | Significant conflicts                      |

### Author reconciliation

The SDK includes specialized author name matching:

```typescript
import { AuthorReconciler, areNamesEquivalent } from "@colibri-hq/sdk/metadata";

// Check if two names refer to the same person
areNamesEquivalent("F. Scott Fitzgerald", "Fitzgerald, Francis Scott"); // true
areNamesEquivalent("J.R.R. Tolkien", "John Ronald Reuel Tolkien"); // true

// Reconcile author lists from multiple sources
const reconciler = new AuthorReconciler();
const unified = reconciler.reconcile([
  ["F. Scott Fitzgerald"],
  ["Fitzgerald, F. Scott"],
  ["Francis Scott Fitzgerald"],
]);
// ['F. Scott Fitzgerald']
```

### Domain-specific reconcilers

The SDK provides specialized reconcilers for different metadata domains:

```typescript
import {
  DateReconciler,
  PublisherReconciler,
  SubjectReconciler,
  IdentifierReconciler,
  PhysicalReconciler,
  ContentReconciler,
  SeriesReconciler,
} from "@colibri-hq/sdk/metadata";

// Reconcile publication dates from multiple sources
const dateReconciler = new DateReconciler();
const reconciledDate = dateReconciler.reconcile([
  { year: 2020, month: 3 },
  { year: 2020, month: 3, day: 15 },
  { year: 2020 },
]);
// { value: { year: 2020, month: 3, day: 15 }, confidence: 0.95, sources: [...] }

// Reconcile subjects/categories
const subjectReconciler = new SubjectReconciler();
const reconciledSubjects = subjectReconciler.reconcile([
  [{ term: "Fiction", type: "genre" }],
  [{ term: "Literary Fiction", type: "genre" }],
]);
```

### Preview generation

Generate a unified preview from multiple metadata sources:

```typescript
import { PreviewGenerator } from "@colibri-hq/sdk/metadata";

const generator = new PreviewGenerator();
const preview = generator.generatePreview(metadataRecords);

// Each field includes value, confidence, and source attribution
console.log(preview.title.value); // "The Great Gatsby"
console.log(preview.title.confidence); // 0.95
console.log(preview.title.sources); // ["OpenLibrary", "WikiData"]

// Check for conflicts between sources
if (preview.title.conflicts?.length > 0) {
  console.log("Title conflicts detected:", preview.title.conflicts);
}
```

### Duplicate detection

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

### Edition selection

Choose the best edition from available metadata:

```typescript
import { EditionSelector } from "@colibri-hq/sdk/metadata";

const selector = new EditionSelector({ recentEditionYears: 5, maxAlternatives: 3 });

const selection = selector.selectBestEdition(preview, rawMetadata);

console.log(`Selected: ${selection.selectedEdition.title}`);
console.log(`Reason: ${selection.selectionReason}`);
console.log(`Confidence: ${selection.confidence}`);

// View alternatives
for (const alt of selection.alternatives) {
  console.log(`Alternative: ${alt.edition.title}`);
  console.log(`Reason: ${alt.reason}`);
  console.log(`Advantages: ${alt.advantages.join(", ")}`);
}
```

### Series analysis

Detect series relationships in your library:

```typescript
import { SeriesAnalyzer } from "@colibri-hq/sdk/metadata";

const analyzer = new SeriesAnalyzer({ minSeriesNameSimilarity: 0.8 });

const relationships = analyzer.detectSeriesRelationships(preview, existingLibrary);

for (const rel of relationships) {
  console.log(`Series: ${rel.series.name}`);
  console.log(`Position: ${rel.position}`);

  if (rel.previousWork) {
    console.log(`Previous: ${rel.previousWork.title}`);
  }
  if (rel.nextWork) {
    console.log(`Next: ${rel.nextWork.title}`);
  }
  if (rel.missingWorks.length > 0) {
    console.log(`Missing: ${rel.missingWorks.map((w) => w.title).join(", ")}`);
  }
}
```

### Conflict detection

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

### Similarity algorithms

Use the built-in similarity functions for custom matching:

```typescript
import {
  calculateStringSimilarity,
  calculateArraySimilarity,
  calculateIsbnSimilarity,
  calculateDateSimilarity,
  levenshteinDistance,
} from "@colibri-hq/sdk/metadata";

// String similarity (0-1 scale)
calculateStringSimilarity("The Great Gatsby", "Great Gatsby, The"); // 0.85

// Array similarity (Jaccard coefficient)
calculateArraySimilarity(["Fiction", "Classic"], ["Fiction", "Literature"]); // 0.33

// ISBN similarity
calculateIsbnSimilarity(["9780140283297"], ["9780140283297", "0140283297"]); // 1.0

// Date similarity
calculateDateSimilarity({ year: 2020, month: 3 }, { year: 2020 }); // 0.9
```

---

## Provider selection

Choose providers strategically based on your needs.

### By priority

Select high-quality providers:

```typescript
import { selectProviders } from "@colibri-hq/sdk/metadata";

const selected = selectProviders(allProviders, query, "priority", {
  maxProviders: 3,
  minReliabilityScore: 0.8,
});
```

### By speed

Select fast providers for user-facing features:

```typescript
const selected = selectProviders(allProviders, query, "fastest", {
  maxProviders: 2,
  performanceMonitor: globalPerformanceMonitor,
});
```

### For consensus

Select diverse providers for cross-validation:

```typescript
const selected = selectProviders(allProviders, query, "consensus", { maxProviders: 4 });
```

### Filter by capability

Select providers that support specific data types:

```typescript
import { MetadataType, filterByDataTypeSupport } from "@colibri-hq/sdk/metadata";

const withCovers = filterByDataTypeSupport(providers, [MetadataType.COVER_IMAGE]);
```

---

## Error handling

### Graceful degradation

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

### Retry behavior

Providers automatically retry on transient failures:

- Network timeouts
- Connection errors
- Server errors (5xx)

Retries use exponential backoff with jitter. Non-retryable errors (4xx client errors) fail immediately.

### Rate limiting

All providers respect rate limits automatically. The SDK queues requests and waits when necessary:

```typescript
// Rate limits are enforced per-provider
// OpenLibrary: 100 requests/minute
// WikiData: 60 requests/minute
// Amazon: 1 request/second
```

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

### Parallel queries

The aggregator queries all providers in parallel by default. Use `maxProviders` to limit concurrency:

```typescript
const selected = selectProviders(providers, query, "priority", {
  maxProviders: 3, // Only query top 3 providers
});
```

---

## TypeScript

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

## Examples

### Enrich ebook metadata

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

### Build a book lookup service

Create a simple API endpoint:

```typescript
import {
  MetadataAggregator,
  OpenLibraryMetadataProvider,
  GoogleBooksMetadataProvider,
  cleanIsbn,
  isValidIsbn,
} from "@colibri-hq/sdk/metadata";

const aggregator = new MetadataAggregator([
  new OpenLibraryMetadataProvider(),
  new GoogleBooksMetadataProvider({ apiKey: process.env.GOOGLE_API_KEY }),
]);

async function lookupBook(isbn: string) {
  const cleaned = cleanIsbn(isbn);

  if (!isValidIsbn(cleaned)) {
    throw new Error("Invalid ISBN");
  }

  const { results, consensus, errors } = await aggregator.searchByISBN(cleaned);

  if (results.length === 0) {
    return null;
  }

  return {
    ...results[0],
    confidence: consensus?.confidence,
    sources: results.map(({ source }) => source),
    warnings: Array.from(errors.entries()).map(
      ([provider, error]) => `${provider}: ${error.message}`,
    ),
  };
}
```

### Batch processing

Process multiple ISBNs efficiently:

```typescript
import { MetadataAggregator } from "@colibri-hq/sdk/metadata";

async function batchLookup(isbns: string[]) {
  const results = new Map();

  // Process sequentially to respect rate limits
  for (const isbn of isbns) {
    try {
      const { results: records } = await aggregator.searchByISBN(isbn);
      results.set(isbn, records[0] ?? null);
    } catch (error) {
      results.set(isbn, { error: error.message });
    }
  }

  return results;
}
```

---

## Series management

The SDK provides functions to manage book series and their relationships.

### Finding and creating series

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

### Fuzzy series matching

Series names are fuzzy-matched to prevent duplicates like "Harry Potter" and "The Harry Potter Series":

```typescript
import { findSeriesByFuzzyName } from "@colibri-hq/sdk";

// Find series with similar names (default threshold: 70%)
const matches = await findSeriesByFuzzyName(database, "Harry Potter", 0.7);
```

### Loading series works

```typescript
import { loadSeriesWorks } from "@colibri-hq/sdk";

// Get all works in a series, ordered by position
const works = await loadSeriesWorks(database, seriesId);
```

---

## Tag management

Tags (subjects/genres) are normalized and deduplicated automatically.

### Creating and linking tags

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

### Tag normalization

Tags are automatically normalized:

- Converted to lowercase
- Trimmed of whitespace
- Deduplicated

### BISAC subject handling

BISAC (Book Industry Standards and Communications) subjects are automatically parsed during ebook ingestion:

```
Input:  "FICTION / Romance / Historical / Scottish"
Output: ["fiction", "romance", "historical", "scottish"]
```

Each component becomes a separate tag, making books discoverable across multiple categories.

---

## Provider initialization

For authenticated providers (Amazon PAAPI, ISBNdb, Google Books), credentials must be configured before use.

### Automatic initialization

The SDK provides a helper to initialize all configured providers:

```typescript
import { initializeMetadataProviders } from "@colibri-hq/sdk/metadata";

// Initialize providers from database settings
await initializeMetadataProviders(database);
```

This reads credentials from the settings database and registers providers with the global registry.

### Manual provider configuration

For direct provider instantiation:

```typescript
import {
  AmazonPaapiMetadataProvider,
  ISBNdbMetadataProvider,
  GoogleBooksMetadataProvider,
} from "@colibri-hq/sdk/metadata";

// Amazon PAAPI (requires affiliate account)
const amazon = new AmazonPaapiMetadataProvider({
  region: "us", // us, uk, de, fr, jp, ca, it, es, au
  accessKey: process.env.AMAZON_ACCESS_KEY,
  secretKey: process.env.AMAZON_SECRET_KEY,
  partnerTag: process.env.AMAZON_PARTNER_TAG,
});

// ISBNdb (reads credentials from database)
const isbndb = new ISBNdbMetadataProvider(database);

// Google Books
const googleBooks = new GoogleBooksMetadataProvider({ apiKey: process.env.GOOGLE_BOOKS_API_KEY });
```

### Provider settings

Credentials are stored as instance settings:

| Setting URN                                        | Provider | Description    |
| -------------------------------------------------- | -------- | -------------- |
| `urn:colibri:settings:metadata:amazon-access-key`  | Amazon   | AWS access key |
| `urn:colibri:settings:metadata:amazon-secret-key`  | Amazon   | AWS secret key |
| `urn:colibri:settings:metadata:amazon-partner-tag` | Amazon   | Associate tag  |
| `urn:colibri:settings:metadata:amazon-region`      | Amazon   | Marketplace    |
| `urn:colibri:settings:metadata:isbndb-api-key`     | ISBNdb   | API key        |
| `urn:colibri:settings:metadata:google-books-key`   | Google   | API key        |

---

## API reference

For complete API documentation, see the TypeScript definitions in your IDE or the source files:

- `provider.ts` — Base provider interface
- `aggregator.ts` — Multi-provider aggregation
- `strategy.ts` — Provider selection
- `utils/normalization.ts` — ISBN, author, language normalization
- `utils/date-parsing.ts` — Publication date parsing
- `reconciliation/` — Metadata reconciliation and author matching
- `providers/` — Individual metadata provider implementations
