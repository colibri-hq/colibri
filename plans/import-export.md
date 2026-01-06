# Import & Export Framework

## Description

Generic framework for importing and exporting library data in various formats, enabling data portability,
backup/restore, and integration with other systems. Calibre import is covered separately; this covers other formats and
the general framework.

## Current Implementation Status

**Not Implemented:**

- ❌ No export functionality
- ❌ No generic import framework
- ❌ No data portability
- ❌ No backup/restore of user data

**Related:**

- ✅ Calibre import planned separately
- ✅ OPDS catalog support exists

## Implementation Plan

### Phase 1: Export Formats

1. Define export format handlers:
   ```typescript
   interface ExportHandler {
     format: string;
     mimeType: string;
     extension: string;
     export(data: ExportData, options: ExportOptions): Promise<Blob>;
   }
   ```

2. Supported formats:
    - JSON (complete data)
    - CSV (tabular data)
    - OPDS 2.0 (catalog)
    - BibTeX (citations)

### Phase 2: Export API

1. tRPC procedures:
   ```typescript
   export.works({ format, workIds?, collectionId? })
   export.collections({ format, collectionIds? })
   export.library({ format })  // Full library export
   export.annotations({ format, editionId? })
   export.ratings({ format })
   export.progress({ format })
   ```

2. Export options:
    - Include/exclude fields
    - Include related data
    - Date range filter

### Phase 3: Export UI

1. Export dialog:
    - Format selector
    - Scope selector (all, selected, collection)
    - Options checkboxes
    - Download button

2. Bulk export:
    - Progress indicator
    - Background processing for large exports
    - Email link when ready

### Phase 4: Import Framework

1. Define import handler interface:
   ```typescript
   interface ImportHandler {
     format: string;
     mimeTypes: string[];
     extensions: string[];
     validate(file: File): Promise<ValidationResult>;
     preview(file: File): Promise<PreviewData>;
     import(file: File, options: ImportOptions): Promise<ImportResult>;
   }
   ```

2. Import pipeline:
    - File upload
    - Format detection
    - Validation
    - Preview
    - Conflict resolution
    - Import execution

### Phase 5: Import Formats

1. JSON import (from Colibri export)
2. CSV import (spreadsheet)
3. Goodreads export (CSV)
4. LibraryThing export
5. OPDS catalog import

### Phase 6: Import UI

1. Import wizard:
    - File upload step
    - Preview step (show detected data)
    - Mapping step (for CSV)
    - Conflict resolution step
    - Progress step
    - Summary step

2. Field mapping for CSV:
    - Source column → Target field
    - Custom transformations
    - Skip unmapped columns

### Phase 7: Conflict Resolution

1. Duplicate detection:
    - By ISBN
    - By title + author
    - By external ID

2. Resolution options:
    - Skip duplicate
    - Overwrite existing
    - Merge data
    - Create duplicate

### Phase 8: Background Processing

1. Queue large imports/exports
2. Progress tracking
3. Email notification on completion
4. Error reporting

## Export Data Structure

```typescript
type ExportData = {
  version: string;
  exportedAt: string;
  user?: User;

  works: Work[];
  editions: Edition[];
  creators: Creator[];
  publishers: Publisher[];
  series: Series[];
  collections: Collection[];

  // User data
  ratings?: Rating[];
  reviews?: Review[];
  progress?: ReadingProgress[];
  annotations?: Annotation[];
  favorites?: Favorite[];
};
```

## Import Sources

| Source       | Format    | Data                    |
|--------------|-----------|-------------------------|
| Colibri      | JSON      | Full                    |
| Goodreads    | CSV       | Books, ratings, reviews |
| LibraryThing | TSV       | Books, tags, reviews    |
| StoryGraph   | CSV       | Books, ratings          |
| Bookwyrm     | JSON      | Books, reviews          |
| OPDS         | Atom/JSON | Catalog entries         |

## CSV Field Mapping

| CSV Column | Maps To                       |
|------------|-------------------------------|
| Title      | work.title                    |
| Author     | creator.name                  |
| ISBN       | edition.isbn                  |
| Rating     | work_rating.rating            |
| Date Read  | reading_progress.completed_at |
| Shelves    | collection membership         |

## Open Questions

1. **File Size**: Maximum import file size?
2. **Async**: Always async, or sync for small imports?
3. **Rollback**: Can failed imports be rolled back?
4. **Scheduling**: Support scheduled exports (daily backup)?
5. **Streaming**: Stream large exports instead of generating in memory?
6. **Privacy**: Include/exclude personal data option?
7. **Versioning**: Handle different export versions?
8. **Encryption**: Option to encrypt exports?
