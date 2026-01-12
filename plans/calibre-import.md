> **GitHub Issue:** [#120](https://github.com/colibri-hq/colibri/issues/120)

# Calibre Library Import

## Description

Enable users to import their existing book libraries from Calibre, the popular open-source ebook management application.
Support multiple import methods: direct connection to Calibre Web/Content Server, SQLite database upload, and
drag-and-drop of Calibre book folders.

## Current Implementation Status

**Not Implemented:**

- ❌ No Calibre integration
- ❌ No bulk import functionality
- ❌ No SQLite parsing

**Existing Infrastructure:**

- ✅ Ebook parsing (EPUB, MOBI, PDF)
- ✅ Metadata extraction
- ✅ S3 storage for assets
- ✅ CLI exists for batch operations

## Implementation Plan

### Phase 1: Calibre Database Parser

1. Create Calibre SQLite schema parser:

   ```typescript
   // packages/sdk/src/import/calibre.ts
   type CalibreBook = {
     id: number;
     title: string;
     authors: string[];
     path: string;
     formats: string[];
     identifiers: Record<string, string>;
     tags: string[];
     series?: { name: string; index: number };
     publisher?: string;
     pubdate?: Date;
     rating?: number;
     comments?: string;
   };
   ```

2. Map Calibre schema to Colibri entities:
   - `books` → `work` + `edition`
   - `authors` → `creator`
   - `publishers` → `publisher`
   - `series` → `series`
   - `tags` → `tag`
   - `identifiers` → edition identifiers
   - `data` (formats) → `asset`

### Phase 2: Web UI Import Wizard

1. SQLite file upload interface
2. Preview imported data before committing
3. Conflict resolution UI (duplicate detection)
4. Progress tracking for large libraries
5. Import summary with success/error counts

### Phase 3: Calibre Web Integration

1. OPDS client for Calibre Content Server
2. Authentication handling
3. Incremental sync support
4. Book file download and storage

### Phase 4: Folder Import

1. Drag-and-drop folder upload
2. Calibre folder structure detection:
   ```
   Author Name/
     Book Title (123)/
       cover.jpg
       metadata.opf
       book.epub
       book.mobi
   ```
3. Parse `metadata.opf` for rich metadata
4. Batch file upload handling

### Phase 5: CLI Import Command

1. Add CLI command:

   ```bash
   colibri import calibre --database /path/to/metadata.db
   colibri import calibre --folder /path/to/Calibre\ Library
   colibri import calibre --server https://calibre.example.com
   ```

2. Options:
   - `--dry-run` - Preview without importing
   - `--skip-duplicates` - Skip books already in library
   - `--collection` - Import into specific collection
   - `--user` - Assign to specific user

### Phase 6: Calibre Plugin (Optional)

1. Develop Calibre plugin for direct sync
2. Bidirectional sync support
3. Push new books from Calibre to Colibri

## Calibre Schema Reference

Key tables in `metadata.db`:

- `books` - Core book records
- `authors` + `books_authors_link`
- `publishers` + `books_publishers_link`
- `series` + `books_series_link`
- `tags` + `books_tags_link`
- `identifiers` - ISBN, Amazon, etc.
- `data` - File formats and paths
- `comments` - Book descriptions
- `ratings`
- `custom_columns` - User-defined fields

## Open Questions

1. **Custom Columns**: Import Calibre custom columns? Map to Colibri custom fields?
2. **Covers**: Import Calibre-generated covers, or re-extract from ebooks?
3. **File Handling**: Copy files to S3, or reference original locations?
4. **Incremental Sync**: Support ongoing sync with Calibre, or one-time import?
5. **User Assignment**: Whose library do imported books belong to?
6. **Deduplication**: How to detect books already in Colibri?
7. **Virtual Libraries**: Import Calibre virtual library definitions as collections?
8. **Calibre Plugin**: Worth the development effort? Maintenance burden?
