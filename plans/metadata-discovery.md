# Metadata Discovery from Open Sources

## Description

Automatically fetch and reconcile book metadata from multiple open data sources when uploading or editing books. Similar
to Calibre's metadata download feature, but with better quality through multi-source reconciliation and user feedback
integration.

## Current Implementation Status

**Substantially Implemented:**

- ✅ Provider architecture with priority system
- ✅ OpenLibrary provider (priority 80, 100 req/min)
- ✅ WikiData provider (priority 85, SPARQL queries)
- ✅ Library of Congress provider (priority 85, SRU protocol)
- ✅ DNB provider (priority 80, German National Library)
- ✅ BNB provider (British National Bibliography)
- ✅ Google Books provider (optional API key)
- ✅ Internet Archive provider
- ✅ CrossRef provider (academic works)
- ✅ DOAB provider (open access books)
- ✅ ISNI provider (priority 70, author authority)
- ✅ VIAF provider (author clustering)
- ✅ Rate limiting per provider
- ✅ Timeout management
- ✅ Caching system (LRU, configurable TTL)
- ✅ Confidence scoring system
- ✅ Reconciliation engine for merging results (see Reconciliation Architecture below)
- ✅ Shared utility infrastructure (see below)
- ✅ Domain-specific reconcilers (date, publisher, subject, identifier, physical, content, series)
- ✅ Duplicate detection system
- ✅ Edition selection and scoring
- ✅ Series relationship analysis
- ✅ Conflict detection and display formatting
- ✅ Preview generation with quality assessment

**Not Yet Implemented:**

- ❌ UI for metadata search during upload
- ❌ Manual result selection interface
- ❌ Instance-configurable provider priority (admin UI)
- ❌ User feedback/telemetry collection
- ❌ Tiered search phases

## Infrastructure: Shared Utilities (Completed Dec 2025)

Consolidated duplicated logic across providers into shared modules in `packages/sdk/src/metadata/utils/`:

### Normalization Utilities (`normalization.ts`)
- `normalizeLanguageCode()` - ISO 639-2/3 to ISO 639-1 conversion (e.g., "ger" → "de")
- `cleanIsbn()`, `isValidIsbn10()`, `isValidIsbn13()`, `isbn10To13()`, `normalizeIsbn()` - ISBN validation and normalization
- `normalizeAuthorName()`, `parseAuthorName()`, `formatAuthorName()` - Author name parsing and normalization
- `normalizeTitle()` - Title normalization (article removal, diacritics, whitespace)
- `normalizePublisher()` - Publisher name normalization
- `normalizeDoi()` - DOI URL cleanup

### Date Parsing Utilities (`date-parsing.ts`)
- `parsePublicationDate()` - Handles YYYY, YYYY-MM, YYYY-MM-DD, written formats, circa dates
- `extractYear()` - Extract year from various date formats
- `formatParsedDate()` - Format parsed dates for output

### MARC Parser Utilities (`marc-parser.ts`)
- `parseMarcXmlRecords()` - Parse MARC21 XML from SRU responses
- `extractBibliographicData()` - Extract structured data from MARC records
- `extractSruRecordCount()` - Extract result count from SRU responses
- Helper functions for field/subfield extraction

### Providers Updated to Use Shared Utilities
- ✅ Library of Congress - Uses shared MARC parser, language normalization
- ✅ DNB (Deutsche Nationalbibliothek) - Uses shared MARC parser, language normalization
- ✅ Cache key generation - Uses shared normalization for consistent cache keys
- ✅ RetryableMetadataProvider - Uses shared utilities (deprecated wrappers for backwards compatibility)

## Reconciliation Architecture (Completed Dec 2025)

The reconciliation system merges metadata from multiple providers into unified, high-confidence records. Located in
`packages/sdk/src/metadata/reconciliation/`.

### Module Structure

```
reconciliation/
├── index.ts                  # Public exports (~65 types, all components)
├── types.ts                  # Shared type definitions (620+ lines)
├── fields.ts                 # Field constants and weights
├── similarity.ts             # Similarity algorithms (6 functions)
│
├── reconcile.ts              # ReconciliationCoordinator - SDK wrapper
├── fetch.ts                  # MetadataCoordinator - multi-provider queries
├── preview.ts                # PreviewGenerator - unified previews (1100+ lines)
├── duplicates.ts             # DuplicateDetector - library duplicate detection
├── editions.ts               # EditionSelector - best edition scoring
├── series-analysis.ts        # SeriesAnalyzer - series relationships
├── conflicts.ts              # ConflictDetector - field conflicts
├── conflict-format.ts        # ConflictDisplayFormatter - UI formatting
├── query-strategy.ts         # QueryStrategyBuilder - query relaxation
├── quality.ts                # QualityAssessor - entry quality scoring
├── recommendations.ts        # RecommendationGenerator - user recommendations
│
├── dates.ts                  # DateReconciler - publication dates
├── publishers.ts             # PublisherReconciler - publisher names
├── places.ts                 # PlaceReconciler - publication places
├── publication.ts            # PublicationReconciler - combined pub info
├── subjects.ts               # SubjectReconciler - subjects/genres
├── identifiers.ts            # IdentifierReconciler - ISBN, DOI, etc.
├── physical.ts               # PhysicalReconciler - dimensions, format
├── content.ts                # ContentReconciler - description, TOC
├── series.ts                 # SeriesReconciler - series information
└── works.ts                  # WorkReconciler - work/edition clustering
```

Note: Author name handling is done inline within reconcilers using shared
normalization utilities from `packages/sdk/src/metadata/utils/normalization.ts`.

### Key Components

#### ReconciliationCoordinator
Main entry point for reconciling metadata from SDK providers:

```typescript
import { ReconciliationCoordinator, reconcileMetadata } from './reconciliation';

// Using the class
const coordinator = new ReconciliationCoordinator({
  reconcilePublishers: true,
  reconcileSubjects: true,
  reconcileSeries: true,
  minConfidenceThreshold: 0.5,
});
const result = await coordinator.reconcile(metadataRecords);

// Or use the convenience function
const result = await reconcileMetadata(records);
```

Returns `ReconciledMetadata` with:
- `publication` - Publisher, date, place
- `subjects` - Subjects and genres
- `identifiers` - ISBNs, DOIs, etc.
- `physical` - Page count, dimensions, format
- `content` - Description, TOC, reviews
- `series` - Series information
- `overallConfidence` - Aggregate confidence score
- `stats` - Processing statistics (sources, fields, conflicts, timing)

#### MetadataCoordinator
Orchestrates multi-provider queries with timeout and concurrency management:

```typescript
const coordinator = new MetadataCoordinator(providers, {
  timeout: 10000,
  maxConcurrency: 5,
});
const result = await coordinator.query({ title: 'The Great Gatsby' });
```

#### PreviewGenerator
Generates a unified metadata preview from multiple provider results:

```typescript
const generator = new PreviewGenerator();
const preview = generator.generatePreview(metadataRecords);
// Returns: MetadataPreview with all fields reconciled
```

Each field in the preview includes:
- `value` - The reconciled value
- `confidence` - Confidence score (0-1)
- `sources` - Array of contributing providers
- `conflicts` - Any conflicting values from sources

#### DuplicateDetector
Identifies potential duplicates when adding books to a library:

```typescript
const detector = new DuplicateDetector({ minSimilarityThreshold: 0.3 });
const matches = detector.detectDuplicates(proposedEntry, existingLibrary);
```

Returns matches with:
- `similarity` - Overall similarity score (weighted by field importance)
- `matchType` - 'exact' | 'likely' | 'possible' | 'different_edition' | 'related_work'
- `matchingFields` - Which fields matched and how strongly
- `confidence` - Confidence in the duplicate detection
- `recommendation` - 'skip' | 'merge' | 'add_as_new' | 'review_manually'
- `explanation` - Human-readable explanation of the match

Match type thresholds:
- `exact`: similarity >= 0.9
- `likely`: similarity >= 0.7
- `possible`: similarity >= 0.5
- `different_edition`: high ISBN or title+author match with lower overall
- `related_work`: some similarity but distinct entries

#### EditionSelector
Chooses the best edition from available metadata:

```typescript
const selector = new EditionSelector({ recentEditionYears: 5 });
const selection = selector.selectBestEdition(preview, rawMetadata);
```

Scoring factors:
- ISBN presence (+0.1)
- Publication date (+0.1)
- Publisher information (+0.1)
- Recent publication (+0.1)
- Standard format (hardcover/paperback)
- Language match with preview

#### SeriesAnalyzer
Detects series relationships with existing library entries:

```typescript
const analyzer = new SeriesAnalyzer();
const relationships = analyzer.detectSeriesRelationships(preview, existingLibrary);
```

Identifies:
- Previous/next works in series
- Related works in same series
- Missing volumes
- Series completion status

#### Similarity Functions
Shared algorithms in `similarity.ts`:

| Function | Description |
|----------|-------------|
| `levenshteinDistance()` | Edit distance between strings |
| `calculateStringSimilarity()` | Normalized string similarity (0-1) |
| `calculateArraySimilarity()` | Jaccard coefficient for arrays |
| `calculateIsbnSimilarity()` | ISBN matching with normalization |
| `calculateDateSimilarity()` | Publication date comparison |
| `calculatePublisherSimilarity()` | Publisher name matching |
| `calculateSeriesSimilarity()` | Series name and volume matching |

#### Field Constants
Centralized in `fields.ts`:

```typescript
export const METADATA_FIELDS = [
  'title', 'authors', 'isbn', 'publicationDate', 'subjects',
  'description', 'language', 'publisher', 'series', 'identifiers',
  'physicalDescription', 'coverImage', 'work', 'edition', 'relatedWorks',
] as const;

export const CORE_FIELDS = ['title', 'authors', 'isbn', 'publicationDate'];

export const DUPLICATE_FIELD_WEIGHTS = {
  title: 0.3, authors: 0.25, isbn: 0.2,
  publicationDate: 0.1, publisher: 0.05, series: 0.1,
};
```

### Domain-Specific Reconcilers

Each reconciler handles a specific metadata domain with specialized logic:

| Reconciler | File | Purpose | Key Features |
|------------|------|---------|--------------|
| `DateReconciler` | dates.ts | Publication dates | Handles partial dates, circa dates, date ranges |
| `PublisherReconciler` | publishers.ts | Publisher names | Normalizes imprints, corporate suffixes (~25 major publishers) |
| `PlaceReconciler` | places.ts | Publication places | City/country normalization |
| `PublicationReconciler` | publication.ts | Combined pub info | Orchestrates date, publisher, place reconciliation |
| `SubjectReconciler` | subjects.ts | Subjects/genres | Dewey mapping (80 classifications), deduplication |
| `IdentifierReconciler` | identifiers.ts | ISBNs, DOIs, etc. | Validates ISBN/OCLC/LCCN/DOI/Goodreads/Amazon/Google |
| `PhysicalReconciler` | physical.ts | Physical description | Page count, dimensions, format, language codes |
| `ContentReconciler` | content.ts | Description, TOC | Quality scoring, description merging, cover selection |
| `SeriesReconciler` | series.ts | Series information | Pattern matching, volume normalization |
| `WorkReconciler` | works.ts | Work/edition clustering | Groups editions under works |

### Conflict Detection

The `ConflictDetector` identifies disagreements between sources:

```typescript
const detector = new ConflictDetector();
const result = detector.detectConflicts(preview);
// result.conflicts: DetailedConflict[]
// result.summary: { totalConflicts, criticalCount, warningCount, infoCount }
```

Conflict types (8 total):
- `value_mismatch` - Different values for same field
- `format_difference` - Same data, different format
- `precision_difference` - Different levels of detail
- `completeness_difference` - Varying data completeness
- `quality_difference` - Quality score variations
- `temporal_difference` - Date/time discrepancies
- `source_disagreement` - Sources explicitly disagree
- `normalization_conflict` - Normalization produces different results

Severity levels (4 total):
- `critical` - Core fields (title, authors, ISBN)
- `major` - Important fields needing attention
- `minor` - Less important discrepancies
- `informational` - FYI-level differences

Each conflict includes:
- Impact assessment with affected areas
- Auto-resolvable vs manual review categorization
- Grouping by severity, type, and field

### Query Strategy

The `QueryStrategyBuilder` generates progressive fallback queries when initial searches return no results:

```typescript
const builder = new QueryStrategyBuilder();
const strategies = builder.buildStrategies(originalQuery);
// Returns array of progressively relaxed queries
```

Fallback rules (8 total, applied sequentially):
1. Enable fuzzy matching
2. Remove language constraint
3. Broaden author search (keep primary only)
4. Remove subjects constraint
5. Remove publisher constraint
6. Broaden year range (expand by 50% or 5 years minimum)
7. Remove year range entirely
8. Title-only search (most permissive)

### Known Limitations

1. **Author name matching**: The `calculateArraySimilarity` function uses Jaccard similarity
   with exact string matching. Author name variations (e.g., "F. Scott Fitzgerald" vs
   "Francis Scott Key Fitzgerald") are treated as different authors. This can lower
   duplicate detection scores when providers return different name forms.

2. **Date format conversion**: Dates from providers may not convert cleanly to
   `PublicationDate` objects, affecting date-based similarity calculations.

3. **ISBN coverage**: Not all editions have ISBNs, especially older or non-English works.
   The system falls back to title/author matching when ISBNs are unavailable.

## Implementation Plan

### Phase 1: Search Integration UI

1. Add metadata search to edition create/edit:
    - Search by title + author
    - Search by ISBN
    - Display results from all providers
    - Show confidence scores per result

2. Result preview card showing:
    - Title, authors, publisher
    - Cover image
    - Source provider
    - Confidence indicator

### Phase 2: Manual Selection Interface

1. Side-by-side comparison view
2. Field-by-field selection (mix sources)
3. Preview merged result
4. "Apply selected" action

### Phase 3: Tiered Search Phases

1. Implement sequential search strategy:
   ```typescript
   const searchPhases = [
     { fields: ['isbn'], minResults: 1 },
     { fields: ['title', 'author'], minResults: 3 },
     { fields: ['author', 'title'], minResults: 3 }, // swapped
     { fields: ['title'], minResults: 5 },
   ];
   ```

2. Progress through phases until sufficient results
3. Show which phase found results

### Phase 4: Instance Configuration

1. Admin UI for provider settings:
    - Enable/disable providers
    - Adjust priority order
    - Configure rate limits
    - API key management (if needed)

2. Per-user provider preferences (optional)

### Phase 5: Quality Feedback System

1. Allow users to rate result quality:
    - Correct / Mostly correct / Incorrect
    - Flag specific field errors

2. Collect anonymized telemetry:
    - Provider accuracy per field type
    - Search success rates
    - Common failure patterns

3. Use feedback to adjust confidence weights

### Phase 6: Background Enhancement

1. Service worker metadata enrichment
2. Automatically fill missing fields
3. Update outdated information
4. Cover image improvement

## Provider Priority Defaults

| Provider            | Priority | Strength                    | Weakness                  | Auth Required |
|---------------------|----------|-----------------------------|---------------------------|---------------|
| Library of Congress | 85       | Authority data, MARC        | Older books               | No            |
| WikiData            | 85       | Structured data, linked     | Coverage varies           | No            |
| DNB                 | 80       | German publications         | German-focused            | No            |
| BNB                 | 80       | British publications        | UK-focused                | No            |
| OpenLibrary         | 80       | Coverage, covers            | Data quality varies       | No            |
| Google Books        | 75       | Coverage, previews          | Rate limits               | Optional      |
| Internet Archive    | 75       | Public domain, historical   | Limited modern books      | No            |
| CrossRef            | 70       | Academic works, DOIs        | Non-academic limited      | No            |
| DOAB                | 70       | Open access academic        | Academic only             | No            |
| ISNI                | 70       | Author identification       | No book metadata          | No            |
| VIAF                | 60       | Author clustering           | No book data              | No            |
| Springer Nature     | 60       | Academic, scientific        | Academic only             | Yes           |
| ISBNdb              | 50       | ISBN coverage               | Subscription required     | Yes           |
| Amazon PAAPI        | 50       | Commercial data             | Strict rate limits        | Yes           |

## Open Questions

1. **Selection UX**: Modal dialog, side panel, or inline?
2. **Auto-Apply**: Automatically apply high-confidence results?
3. **Provider Plugins**: Allow third-party provider plugins?
4. **Telemetry Privacy**: How to collect feedback anonymously?
5. **Batch Operations**: Search metadata for multiple books at once?
6. **Offline Mode**: Cache provider data for offline use?

## Resolved Questions

1. ✅ **Conflict Resolution**: Implemented via `ConflictDetector` with severity levels and `ConflictDisplayFormatter` for UI presentation
2. ✅ **Cover Priority**: Handled by `PreviewGenerator` with confidence-based selection from multiple sources
3. ✅ **Duplicate Handling**: Implemented via `DuplicateDetector` with configurable similarity thresholds and match type classification
4. ✅ **Edition Selection**: Implemented via `EditionSelector` with scoring algorithm considering recency, completeness, and format
5. ✅ **Series Detection**: Implemented via `SeriesAnalyzer` to identify series relationships with existing library entries
