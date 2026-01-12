> **GitHub Issue:** [#143](https://github.com/colibri-hq/colibri/issues/143)

# Metadata Search

## Description

Users need to be able to find entities in Colibri by searching for them. This includes things like books, collections,
catalogs, authors, and so on.

As opposed to the book content search outlined in [Full-Text Search](./full-text-search.md), this feature refers to
searching things by their metadata, such as the name, description, tags, or related entity metadata (for example finding
books by the name of their author).

## Current Implementation Status

**Partially Implemented:**

- ✅ Basic book listing with filtering
- ✅ Collection filtering
- ✅ PostgreSQL available (supports full-text search)
- ❌ No unified search across entity types
- ❌ No fuzzy/typo-tolerant matching
- ❌ No search ranking or relevance scoring
- ❌ No search suggestions/autocomplete

**Existing Infrastructure:**

- ✅ Work, creator, publisher, collection tables
- ✅ tRPC API layer
- ✅ Visibility system planned (private/default/public)

## Implementation Plan

### Phase 1: Search Index Schema

1. Add tsvector columns to searchable entities:

   ```sql
   -- Works (books)
   alter table work
     add column search_vector tsvector
       generated always as (
         setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(title_sort, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(synopsis, '')), 'B') ||
         setweight(to_tsvector('simple', coalesce(series_name, '')), 'C')
       ) stored;

   create index idx_work_search on work using GIN (search_vector);

   -- Creators (authors)
   alter table creator
     add column search_vector tsvector
       generated always as (
         setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(name_sort, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(bio, '')), 'B')
       ) stored;

   create index idx_creator_search on creator using GIN (search_vector);

   -- Publishers
   alter table publisher
     add column search_vector tsvector
       generated always as (
         to_tsvector('simple', coalesce(name, ''))
       ) stored;

   create index idx_publisher_search on publisher using GIN (search_vector);

   -- Collections
   alter table collection
     add column search_vector tsvector
       generated always as (
         setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(description, '')), 'B')
       ) stored;

   create index idx_collection_search on collection using GIN (search_vector);
   ```

2. Use `simple` config for language-agnostic matching (no stemming)

### Phase 2: Unified Search API

1. Create search tRPC procedure:

   ```typescript
   search.metadata({
     query: string;
     types?: Array<'work' | 'creator' | 'publisher' | 'collection'>;
     filters?: {
       collections?: string[];
       visibility?: Visibility[];
       language?: string;
     };
     pagination: { cursor?: string; limit: number };
   })
   ```

2. Return unified results with type discrimination:

   ```typescript
   type SearchResult =
     | { type: 'work'; data: WorkSummary; rank: number }
     | { type: 'creator'; data: CreatorSummary; rank: number }
     | { type: 'publisher'; data: PublisherSummary; rank: number }
     | { type: 'collection'; data: CollectionSummary; rank: number };
   ```

3. Implement cross-entity search with UNION:
   ```typescript
   const results = await db
     .selectFrom('work')
     .select([
       sql`'work'`.as('type'),
       'id', 'title as name',
       sql`ts_rank(search_vector, query)`.as('rank')
     ])
     .where('search_vector', '@@', query)
     .unionAll(
       db.selectFrom('creator')
         .select([...])
         .where('search_vector', '@@', query)
     )
     .orderBy('rank', 'desc')
     .limit(limit)
     .execute();
   ```

### Phase 3: Fuzzy Matching

1. Add trigram extension for typo tolerance:

   ```sql
   create extension if not exists pg_trgm;

   create index idx_work_title_trgm on work using GIN (title gin_trgm_ops);
   create index idx_creator_name_trgm on creator using GIN (name gin_trgm_ops);
   ```

2. Implement fallback search when FTS yields no results:

   ```typescript
   // If exact FTS matches < threshold, try fuzzy
   if (ftsResults.length < 3) {
     const fuzzyResults = await db
       .selectFrom('work')
       .where(sql`title % ${query}`) // Trigram similarity
       .orderBy(sql`title <-> ${query}`) // Distance operator
       .limit(10)
       .execute();
   }
   ```

3. Combine FTS and trigram scores for ranking

### Phase 4: Related Entity Search

1. Find books by author name:

   ```typescript
   // Search for "Brandon Sanderson" should find his books
   const authorMatches = await db
     .selectFrom('creator')
     .where('search_vector', '@@', query)
     .select('id')
     .execute();

   const booksByAuthor = await db
     .selectFrom('work')
     .innerJoin('work_creator', 'work.id', 'work_creator.work_id')
     .where(
       'work_creator.creator_id',
       'in',
       authorMatches.map((a) => a.id),
     )
     .execute();
   ```

2. Find books by publisher, series, or collection name

3. Boost results where query matches related entities

### Phase 5: Search Suggestions

1. Create suggestion endpoint:

   ```typescript
   search.suggest({
     query: string;  // Partial input
     limit?: number; // Default 5
   })
   ```

2. Return suggestions from multiple sources:
   - Recent searches (per user)
   - Popular searches (instance-wide)
   - Entity name completions (prefix match)

3. Implement prefix search with trigrams:
   ```sql
   select name from creator
   where name ilike $1 || '%'
   order by similarity(name, $1) desc
   limit 5;
   ```

### Phase 6: Search UI

1. Global search bar in header:
   - Typeahead suggestions as user types
   - Show result type icons (book, author, collection)
   - Keyboard navigation (arrow keys, enter to select)

2. Search results page:
   - Grouped by entity type with counts
   - Filter tabs: All, Books, Authors, Publishers, Collections
   - Sort options: Relevance, Name, Date Added

3. "Did you mean?" for no-results with fuzzy suggestions

4. Highlight matching terms in results

### Phase 7: Advanced Search

1. Support search operators:
   - Quotes for exact phrase: `"fantasy novel"`
   - Minus for exclusion: `fantasy -dragons`
   - Field prefix: `author:sanderson`

2. Parse search query into structured form:

   ```typescript
   type ParsedQuery = {
     terms: string[];
     phrases: string[];
     excluded: string[];
     fields: Record<string, string>;
   };
   ```

3. Build appropriate tsquery from parsed input

## Open Questions

1. **Language Handling**: Use `simple` config everywhere, or detect language per entity?
2. **Ranking Weights**: How to weight title vs synopsis vs author name matches?
3. **Search History**: Store search history per user? Privacy implications?
4. **Indexing Identifiers**: Should ISBN, ASIN be searchable? (Exact match only?)
5. **Tag Search**: Include tags/subjects in search index?
6. **Search Scope**: Default to user's books only, or all accessible books?
7. **Public Search**: Allow anonymous users to search public books?
8. **Performance**: Separate search service for very large instances?
9. **Synonyms**: Support synonym expansion (e.g., "sci-fi" → "science fiction")?
