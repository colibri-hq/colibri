# Series Management

## Description

Complete implementation of book series support, allowing users to organize books into series with proper ordering, track
reading progress through a series, and discover related books. The database schema is complete but lacks SDK resources
and UI.

## Current Implementation Status

**Database Schema Exists:**

- ✅ `series` table (name, description, image, total_entries)
- ✅ `series_entry` table (work_id, position)
- ✅ `series_comment` table
- ✅ `series_tag` table

**Not Implemented:**

- ❌ No SDK resource functions (`resources/series.ts`)
- ❌ No tRPC routes for series CRUD
- ❌ No series UI (browse, detail, management)
- ❌ No series in work detail pages
- ❌ No "next in series" recommendations

## Implementation Plan

### Phase 1: SDK Resource Functions

1. Create `packages/sdk/src/resources/series.ts`:
   ```typescript
   export async function loadSeries(db, options);
   export async function loadSeriesById(db, seriesId);
   export async function createSeries(db, data);
   export async function updateSeries(db, seriesId, data);
   export async function deleteSeries(db, seriesId);
   export async function addWorkToSeries(db, seriesId, workId, position);
   export async function removeWorkFromSeries(db, seriesId, workId);
   export async function reorderSeriesEntries(db, seriesId, entries);
   export async function loadSeriesForWork(db, workId);
   ```

### Phase 2: tRPC Routes

1. Create `apps/app/src/lib/trpc/routes/series.ts`:
   ```typescript
   series.list({ query?, page?, limit? })
   series.get({ id })
   series.create({ name, description? })
   series.update({ id, name?, description?, image? })
   series.delete({ id })
   series.addWork({ seriesId, workId, position })
   series.removeWork({ seriesId, workId })
   series.reorder({ seriesId, entries })
   series.getForWork({ workId })
   ```

### Phase 3: Series Browse UI

1. Create `/series` route for browsing all series
2. Series card component with:
    - Cover montage (first 3-4 books)
    - Series name
    - Entry count
    - Completion progress (if user has read any)

### Phase 4: Series Detail Page

1. Create `/series/[id]` route showing:
    - Series metadata (name, description, image)
    - All entries in order
    - Reading progress through series
    - "Start series" / "Continue series" action
    - Series comments

### Phase 5: Work Integration

1. Show series badge on work cards
2. "Part of series" section on work detail page
3. "Next in series" recommendation
4. "Previous/Next" navigation between series entries

### Phase 6: Series Management UI

1. Create series dialog/page
2. Add works to series (search and select)
3. Drag-and-drop reordering
4. Position number editing
5. Bulk add from collection

### Phase 7: Series Discovery

1. "Popular series" section
2. Series search
3. Filter works by series
4. "Complete this series" recommendations

## Series Entry Ordering

```
Series: "The Lord of the Rings"
├── 1. The Fellowship of the Ring
├── 2. The Two Towers
└── 3. The Return of the King

Series: "Discworld" (with sub-series)
├── 1. The Colour of Magic
├── 2. The Light Fantastic
...
```

## Data Model

```typescript
type Series = {
  id: string;
  name: string;
  description?: string;
  image?: Image;
  totalEntries: number;
  entries: SeriesEntry[];
};

type SeriesEntry = {
  work: Work;
  position: number;  // Can be decimal for insertions: 1.5
};
```

## Open Questions

1. **Sub-Series**: Support nested series (e.g., Discworld → Watch sub-series)?
2. **Numbering**: Support non-integer positions (1.5 for novellas)?
3. **Multiple Series**: Can a work belong to multiple series?
4. **Prequels/Spin-offs**: How to handle publication vs. chronological order?
5. **Incomplete Series**: Track "ongoing" vs. "complete" series?
6. **Auto-Detection**: Detect series from metadata during import?
7. **External IDs**: Link to Goodreads/OpenLibrary series IDs?
8. **Covers**: Generate series cover from entries, or require upload?
