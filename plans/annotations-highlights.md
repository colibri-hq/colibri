# Annotations & Highlights

## Description

Enable users to highlight text passages, add margin notes, and create bookmarks while reading. Annotations should sync
across devices and optionally be exportable.

## Current Implementation Status

**Not Implemented:**

- ❌ No database schema
- ❌ No annotation storage
- ❌ No highlight rendering in reader
- ❌ No notes interface

**Existing Infrastructure:**

- ✅ EPUB CFI parsing for position references
- ✅ User-edition relationships
- ✅ Reading progress tracking (planned)

## Implementation Plan

### Phase 1: Database Schema

1. Create annotation tables:
   ```sql
   CREATE TYPE annotation_type AS ENUM ('highlight', 'note', 'bookmark');

   CREATE TABLE annotation (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     edition_id UUID NOT NULL REFERENCES edition(id),

     type annotation_type NOT NULL,

     -- Position (EPUB CFI or page reference)
     start_position TEXT NOT NULL,
     end_position TEXT,            -- NULL for bookmarks/point notes

     -- Content
     highlighted_text TEXT,        -- The selected text
     note_content TEXT,            -- User's note
     color VARCHAR(20),            -- Highlight color

     -- Metadata
     chapter_title VARCHAR(255),   -- For display without loading book
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now(),

     -- Sync
     device_id VARCHAR(255),
     synced_at TIMESTAMPTZ
   );

   CREATE INDEX idx_annotation_user_edition ON annotation(user_id, edition_id);
   CREATE INDEX idx_annotation_position ON annotation(edition_id, start_position);
   ```

### Phase 2: SDK Resource Functions

1. Create `packages/sdk/src/resources/annotation.ts`:
   ```typescript
   export async function createAnnotation(db, data);
   export async function updateAnnotation(db, id, data);
   export async function deleteAnnotation(db, id);
   export async function loadAnnotationsForEdition(db, userId, editionId);
   export async function loadAnnotationsForUser(db, userId, options);
   export async function exportAnnotations(db, userId, editionId, format);
   ```

### Phase 3: tRPC Routes

1. Create annotation routes:
   ```typescript
   annotations.create({ editionId, type, startPosition, ... })
   annotations.update({ id, noteContent?, color? })
   annotations.delete({ id })
   annotations.listForBook({ editionId })
   annotations.listAll({ page?, limit? })
   annotations.export({ editionId, format })
   ```

### Phase 4: Reader Integration - Highlights

1. Text selection handling in EPUB reader
2. Highlight color picker (yellow, green, blue, pink, orange)
3. Render highlights over text
4. Remove highlight on tap

### Phase 5: Reader Integration - Notes

1. "Add note" action on highlight
2. Margin note indicator
3. Note popover on click
4. Full note editor panel

### Phase 6: Reader Integration - Bookmarks

1. Bookmark icon in reader toolbar
2. Bookmark list panel
3. Jump to bookmark
4. Named bookmarks

### Phase 7: Annotations View

1. All annotations page per book
2. Filter by type (highlights, notes, bookmarks)
3. Sort by position or date
4. Search within annotations
5. Export options

### Phase 8: Export & Import

1. Export formats:
    - Markdown
    - JSON
    - PDF with highlights
    - Kindle-compatible format

2. Import from:
    - Kindle highlights
    - Apple Books
    - Readwise

## Annotation Types

| Type      | Has Range | Has Note | Use Case                |
|-----------|-----------|----------|-------------------------|
| Highlight | ✅         | Optional | Mark important passages |
| Note      | ✅ or ❌    | ✅        | Add thoughts            |
| Bookmark  | ❌         | Optional | Mark position           |

## Highlight Colors

```css
--highlight-yellow: oklch(95% 0.15 90);
--highlight-green: oklch(90% 0.15 140);
--highlight-blue: oklch(90% 0.15 240);
--highlight-pink: oklch(90% 0.15 350);
--highlight-orange: oklch(92% 0.15 60);
```

## Open Questions

1. **Storage**: Store highlighted text, or just positions?
2. **Sharing**: Allow sharing annotations publicly?
3. **Collaboration**: Multiple users annotate same book?
4. **Format Support**: Annotations for PDF? MOBI?
5. **Sync**: Real-time sync or on-demand?
6. **Readwise**: Integration with Readwise for export?
7. **AI**: Summarize annotations with AI?
8. **Social**: See what others highlighted (opt-in)?
