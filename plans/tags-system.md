# Tags & Taxonomy System

## Description

Complete implementation of the tagging system for organizing and discovering books by subjects, genres, themes, and
user-defined labels. The database schema exists but lacks SDK resources, API, and UI for tag management.

## Current Implementation Status

**Database Schema Exists:**

- ✅ `tag` table (name, description)
- ✅ `work_tag` junction table
- ✅ `collection_tag` junction table
- ✅ `series_tag` junction table

**Not Implemented:**

- ❌ No SDK resource functions for tags
- ❌ No tRPC routes for tag operations
- ❌ No tag management UI
- ❌ No tag browsing/filtering
- ❌ No tag suggestions during editing

## Implementation Plan

### Phase 1: SDK Resource Functions

1. Create `packages/sdk/src/resources/tag.ts`:
   ```typescript
   export async function loadTags(db, options);
   export async function loadTagById(db, tagId);
   export async function createTag(db, { name, description? });
   export async function updateTag(db, tagId, data);
   export async function deleteTag(db, tagId);
   export async function addTagToWork(db, workId, tagId);
   export async function removeTagFromWork(db, workId, tagId);
   export async function loadTagsForWork(db, workId);
   export async function loadWorksForTag(db, tagId, options);
   export async function searchTags(db, query);
   export async function getPopularTags(db, limit);
   ```

### Phase 2: tRPC Routes

1. Create `apps/app/src/lib/trpc/routes/tags.ts`:
   ```typescript
   tags.list({ query?, limit? })
   tags.get({ id })
   tags.create({ name, description? })
   tags.update({ id, name?, description? })
   tags.delete({ id })
   tags.search({ query })
   tags.popular({ limit })
   tags.addToWork({ workId, tagId })
   tags.removeFromWork({ workId, tagId })
   tags.getForWork({ workId })
   ```

### Phase 3: Tag Input Component

1. Create TagInput component:
    - Autocomplete with existing tags
    - Create new tags inline
    - Display as removable chips
    - Keyboard navigation

2. Integrate into work edit form

### Phase 4: Tag Browse UI

1. Create `/tags` route:
    - Tag cloud visualization
    - Alphabetical listing
    - Popular tags section
    - Tag search

2. Create `/tags/[tag]` route:
    - Tag description
    - All works with this tag
    - Related tags

### Phase 5: Tag Filtering

1. Add tag filter to library view
2. Multi-tag filtering (AND/OR)
3. Tag facets in search results
4. Quick tag filters on cards

### Phase 6: Tag Suggestions

1. Suggest tags from metadata providers
2. Suggest based on similar books
3. Show commonly paired tags
4. Machine learning suggestions (future)

### Phase 7: Tag Hierarchies (Optional)

1. Parent-child tag relationships
2. Tag synonyms/aliases
3. Tag merging for duplicates

## Tag Types

| Type    | Examples                     | Source        |
|---------|------------------------------|---------------|
| Genre   | Fiction, Mystery, Romance    | User/Metadata |
| Subject | History, Science, Philosophy | Metadata      |
| Theme   | Coming of age, Revenge       | User          |
| Mood    | Dark, Uplifting, Cozy        | User          |
| Form    | Short stories, Anthology     | Metadata      |
| Award   | Hugo Winner, Pulitzer        | Metadata      |

## UI Components Needed

```svelte
<!-- Tag input with autocomplete -->
<TagInput bind:tags={workTags} suggestions={popularTags} />

<!-- Tag display chips -->
<TagList tags={work.tags} />

<!-- Tag cloud for browsing -->
<TagCloud tags={allTags} weighted={true} />

<!-- Tag filter pills -->
<TagFilter selected={activeTags} available={availableTags} />
```

## Open Questions

1. **Controlled Vocabulary**: Allow free-form tags, or curated list only?
2. **Tag Limits**: Maximum tags per work?
3. **Permissions**: Who can create new tags? Edit tag descriptions?
4. **Duplicates**: How to handle "Science Fiction" vs "Sci-Fi" vs "SF"?
5. **Hierarchies**: Support parent tags (Fiction → Mystery → Cozy Mystery)?
6. **Import**: Map metadata subjects to tags automatically?
7. **Visibility**: Are tags per-user or shared across instance?
8. **Moderation**: Admin approval for new tags?
