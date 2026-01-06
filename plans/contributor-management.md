# Contributor & Creator Management

## Description

Comprehensive management of creators (authors, illustrators, editors, etc.) and their contributions to works. The
database has extensive MARC relator code support (300+ roles) but needs complete UI for browsing, editing, and
discovering creators.

## Current Implementation Status

**Implemented:**

- ✅ `creator` table with extensive fields (name, bio, image, birth/death dates)
- ✅ `contribution` table with MARC relator codes
- ✅ External IDs (goodreads_id, amazon_id, openlibrary_id)
- ✅ Creator routes exist (`/creators/[creator=id]/`)
- ✅ SDK resources for creators
- ✅ CLI commands for creators (add, list, inspect, edit)

**Not Complete:**

- ❌ No creator search/browse UI
- ❌ No contribution editing UI
- ❌ No creator merge/deduplication
- ❌ No creator following/favorites integration
- ❌ Limited role selection in forms

## Implementation Plan

### Phase 1: Creator Browse UI

1. Create `/creators` route:
    - Alphabetical listing
    - Search by name
    - Filter by role (authors, illustrators, etc.)
    - Popular creators section

2. Creator card component:
    - Photo
    - Name
    - Work count
    - Primary role

### Phase 2: Creator Detail Page Enhancement

1. Improve `/creators/[id]` page:
    - Full biography
    - Photo gallery
    - External links
    - All works by this creator
    - Works grouped by role
    - Series by this creator

### Phase 3: Contribution Editor

1. Create contribution editing UI:
    - Add/remove contributors to edition
    - MARC role selector with search
    - "Essential" contributor toggle
    - Reorder contributors

2. Role picker component:
   ```svelte
   <RolePicker
     selected={contribution.role}
     onSelect={handleRoleSelect}
   />
   <!-- Searchable list of 300+ MARC codes with descriptions -->
   ```

### Phase 4: Creator Editor

1. Create/edit creator form:
    - Name and sort name
    - Biography (rich text)
    - Photo upload
    - Birth/death dates and places
    - External identifiers
    - Website and Wikipedia links

### Phase 5: Creator Merge & Deduplication

1. Detect potential duplicates:
    - Similar names
    - Same external IDs
    - Works overlap

2. Merge UI:
    - Side-by-side comparison
    - Select primary record
    - Combine works and contributions
    - Redirect merged ID

### Phase 6: Creator Discovery

1. "Popular Authors" section
2. "New Authors" (recently added)
3. Author recommendations based on reading
4. Related authors (same genre/subjects)

### Phase 7: Creator Following

1. Integrate with favorites system
2. "Follow" button on creator page
3. Notifications for new works
4. "My Authors" section

## MARC Relator Codes (Common)

| Code | Role                   | Description          |
|------|------------------------|----------------------|
| aut  | Author                 | Primary writer       |
| edt  | Editor                 | Editorial work       |
| ill  | Illustrator            | Visual art           |
| trl  | Translator             | Translation          |
| nrt  | Narrator               | Audiobook            |
| aui  | Author of introduction | Foreword/intro       |
| aft  | Author of afterword    | Afterword            |
| ctb  | Contributor            | General contribution |

## Creator External IDs

| Platform    | Field          | Use Case          |
|-------------|----------------|-------------------|
| OpenLibrary | openlibrary_id | Metadata linking  |
| Goodreads   | goodreads_id   | Reviews/ratings   |
| Amazon      | amazon_id      | Purchase links    |
| VIAF        | viaf_id        | Authority records |
| ISNI        | isni_id        | International ID  |
| Wikidata    | wikidata_id    | Structured data   |

## Open Questions

1. **Pseudonyms**: Track author pseudonyms and pen names?
2. **Organizations**: Support corporate authors (publishers, organizations)?
3. **Authority Control**: Automatic linking to VIAF/ISNI?
4. **Merge History**: Track merged creators for redirects?
5. **Disambiguation**: Handle multiple creators with same name?
6. **Role Display**: Show all roles or just "Author" for simplicity?
7. **Photo Source**: Fetch photos from Wikipedia/OpenLibrary?
8. **Verification**: Mark "verified" creators vs. user-created?
