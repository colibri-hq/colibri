# Full-Text Search

## Description

Implement comprehensive search functionality that goes beyond metadata to search within the actual content of ebooks.
Users should be able to find books based on text passages, quotes, or specific content they remember.
Searching for books by their synopsis and title is good, but searching for partial content would be better!

### The goals

- Search across all books by word, phrase, or sentence
- Show matching books, with snippets highlighting the matched paragraphs
- Allow jumping directly into the book at the correct location

Searching for a book in Colibri should obviously allow for fuzzy matching a book by its title, synopsis, author, tags,
and so on; but much more importantly, we also want to allow searching for a word or a sentence *within the book!*
Sometimes you remember only a few words, or a particularly elegant phrase, an aphorism. I explicitly want Colibri to be
able to help you find it.

To make this possible, we'll apply a hybrid search mechanism that combines full-text search (using
[`tsquery`](https://www.postgresql.org/docs/current/textsearch-controls.html)), and vector embeddings (powered by
[`pgvector`](https://github.com/pgvector/pgvector)).  
For every book, we'll extract individual plain-text chunks, ideally paragraphs, and store both their lexemes and their
vector embedding value in the database. When searching, we first perform a FTS query to find matching paragraphs from
all books, then do a kNN search over the embeddings of those paragraphs to rank them by relevance (and find the match
positions). Finally, we group the matches by book, and display annotated snippets to the user; when they click on a
match, we can open the book in the reader with the approximate match position (as indicated by the matched paragraph
ID). If the initial FTS query doesn't yield results, we can still run the kNN query to find semantically similar
matches!

That allows us to find both exact and fuzzy/semantically related matches ("big dragon") vs ("huge drake"), works across
all kinds of ebook formats, allows to navigate to results in the source files, fully works within Postgres, and should
be fairly scalable for our use case.

### Concept

- **Create a table for book chunks:** This table will hold
    - a bigint ID (we'll have *lots* of records),
    - a foreign key to a book asset (and through that, an edition),
    - a `tsvector` representation of the chunk content (in the edition's language, if known),
    - a `vector` embedding for the chunk content, and
    - a source pointer to map the chunk back to its location in the source asset.
      It also needs a GIN index (for FTS) and a HNSW (or IVFFlat?) index for kNN.
- **Extract chunks during book import:** When importing books, we'll need to extract the source into individual chunks,
  precompute lexemes and embeddings, and create entries in the chunk table. What qualifies as a chunk probably varies by
  format, and depends on what is uniquely identifyable. Paragraphs are probably a good assumption; only fall back on
  larger containers (pages, sections, chapters) if necessary.
- **Implement FTS:** Add an endpoint to perform a (pure) full text search over all stored book chunks, leaving the
  embeddings out for the time being.
- **Implement semantic search:** Add kNN queries to the search endpoint to re-rank matched paragraphs and support
  fallback search if no exact matches are found.
- **Add search interface:** Add the search interface in the app that allows searching for book content. This should
  probably initially be an explicit toggle to let users decide between metadata and content search. In FTS results,
  users should see matched chunks per book, presented as snippets with the search term highlighted.
- **Add result deep links:** Finally, allow clicking on individual results to open the reader with the chunk target
  passed along, to open the book at the correct location.

## Current Implementation Status

**Not Implemented:**

- ❌ No content extraction pipeline
- ❌ No full-text index
- ❌ No content search API

**Existing Infrastructure:**

- ✅ EPUB/MOBI/PDF parsing extracts text content
- ✅ PostgreSQL available (supports full-text search)
- ✅ Synopsis field exists and could be searched

## Implementation Plan

### Phase 1: Schema Setup

1. Create chunk table for searchable content:
   ```sql
   create table book_chunk (
     id bigint generated always as identity primary key,
     asset_id uuid not null references asset(id) on delete cascade,

     -- Content and search vectors
     content text not null,
     content_search tsvector not null,
     content_embedding vector(1536),  -- OpenAI ada-002 dimensions

     -- Source location for deep linking
     source_pointer jsonb not null,  -- Format varies by ebook type
     chunk_index int not null,       -- Order within asset

     -- Metadata
     language text,                  -- ISO 639-1 code for stemming
     created_at timestamptz default now()
   );

   -- Indexes
   create index idx_chunk_asset on book_chunk(asset_id);
   create index idx_chunk_fts on book_chunk using GIN (content_search);
   create index idx_chunk_embedding on book_chunk using HNSW (content_embedding vector_cosine_ops);
   ```

2. Add indexing status to asset table:
   ```sql
   alter table asset
     add column search_indexed_at timestamptz,
     add column search_index_error text;
   ```

### Phase 2: Content Extraction Pipeline

1. Implement chunk extraction per format:
   ```typescript
   type BookChunk = {
     content: string;
     sourcePointer: EpubPointer | MobiPointer | PdfPointer;
     chunkIndex: number;
   };

   // EPUB: Use CFI (Canonical Fragment Identifier)
   type EpubPointer = { type: 'epub'; cfi: string; spineIndex: number };

   // MOBI: Use record index + offset
   type MobiPointer = { type: 'mobi'; recordIndex: number; offset: number };

   // PDF: Use page number + text offset
   type PdfPointer = { type: 'pdf'; page: number; offset: number };
   ```

2. Chunking strategy:
   - Prefer paragraph boundaries
   - Fallback to sentence boundaries for long paragraphs
   - Max chunk size: ~500 words (fits embedding context)
   - Overlap: Include last sentence of previous chunk for context

3. Create background job for indexing:
   - Process on book import (async)
   - Re-index on asset update
   - Track progress for large books

### Phase 3: Embedding Generation

1. Implement embedding provider abstraction:
   ```typescript
   interface EmbeddingProvider {
     embed(text: string): Promise<number[]>;
     embedBatch(texts: string[]): Promise<number[][]>;
     dimensions: number;
   }
   ```

2. Provider options:
   - OpenAI `text-embedding-ada-002` (1536 dims, hosted)
   - Local models via Ollama (configurable dims)
   - Disable embeddings entirely (FTS-only mode)

3. Batch processing for efficiency (embed multiple chunks per API call)

### Phase 4: Hybrid Search Implementation

1. Search flow:
   ```typescript
   async function searchContent(query: string, options: SearchOptions) {
     // Step 1: Full-text search for exact/lexeme matches
     const ftsResults = await db
       .selectFrom('book_chunk')
       .where('content_search', '@@', toTsQuery(query, options.language))
       .select(['id', 'asset_id', 'content', 'source_pointer'])
       .limit(100)
       .execute();

     // Step 2: If FTS yields results, re-rank with embeddings
     if (ftsResults.length > 0 && embeddingsEnabled) {
       const queryEmbedding = await embedder.embed(query);
       return reRankByEmbedding(ftsResults, queryEmbedding);
     }

     // Step 3: Fallback to pure semantic search if no FTS matches
     if (ftsResults.length === 0 && embeddingsEnabled) {
       const queryEmbedding = await embedder.embed(query);
       return semanticSearch(queryEmbedding, options.limit);
     }

     return ftsResults;
   }
   ```

2. tRPC procedures:
   ```typescript
   search.content({
     query: string;
     mode: 'exact' | 'semantic' | 'hybrid';  // Default: hybrid
     filters?: {
       collections?: string[];
       languages?: string[];
       visibility?: Visibility[];
     };
     pagination: { cursor?: string; limit: number };
   })
   ```

3. Group results by book, return with snippets and highlights

### Phase 5: Search UI

1. Search input with mode toggle:
   - "Exact" for precise phrase matching
   - "Semantic" for conceptual similarity
   - "Hybrid" (default) for best of both

2. Results display:
   - Group matches by book (show book card with match count)
   - Expandable snippet list per book
   - Highlighted matching terms in snippets
   - Click snippet → open reader at location

3. "Search within this book" feature on book detail page

4. Filters: collections, languages, date range

### Phase 6: Deep Linking to Reader

1. Extend reader route to accept position parameter:
   ```
   /read/[assetId]?position=[encodedPointer]
   ```

2. Implement position navigation per format:
   - EPUB: Jump to CFI location
   - MOBI: Jump to record/offset
   - PDF: Jump to page and scroll to offset

3. Highlight search term in reader view

### Phase 7: Synopsis Search (Quick Win)

1. Add tsvector column to work table for synopsis:
   ```sql
   alter table work
     add column synopsis_search tsvector
       generated always as (to_tsvector('english', coalesce(synopsis, ''))) stored;

   create index idx_work_synopsis_search on work using GIN (synopsis_search);
   ```

2. Include in unified search with lower weight than content matches

## Open Questions

1. **Scope**: Should content search respect book visibility? (Private books excluded from family searches?)
2. **Embedding Provider**: Default to OpenAI, or require explicit configuration? Cost implications for large libraries.
3. **FTS-Only Mode**: How gracefully degrade when embeddings are disabled? Skip re-ranking entirely?
4. **Language Detection**: Auto-detect chunk language, or inherit from book metadata?
5. **Multi-Language Stemming**: Use language-specific dictionaries, or default to `simple` config?
6. **Chunk Overlap**: How much context to include from adjacent chunks for better embedding quality?
7. **Index Scheduling**: Index on import (blocking?), background job queue, or scheduled batch?
8. **Storage Growth**: Estimate chunk table size per book. Pruning strategy for deleted assets?
9. **Public Search**: If public shelves are enabled, should anonymous users search public book content?
10. **Rate Limiting**: Limit embedding API calls per user/time to control costs?
11. **Re-Indexing**: When to re-index? Asset update, language change, embedding model upgrade?
