# Publisher Management

## Description

Complete management and browsing of publishers, including publisher profiles, discovery, and works listing. Publishers
exist in the schema but have minimal UI exposure.

## Current Implementation Status

**Implemented:**

- ✅ `publisher` table (name, description, image, url, wikipedia_url)
- ✅ `publisher_comment` table for discussions
- ✅ Publisher routes exist (`/publishers/[publisher]/`)
- ✅ CLI commands (list, inspect, edit)
- ✅ SDK resources

**Not Complete:**

- ❌ No publisher browse/search UI
- ❌ No publisher creation UI
- ❌ No publisher editing UI
- ❌ No publisher discovery features

## Implementation Plan

### Phase 1: Publisher Browse UI

1. Create `/publishers` route:
    - Alphabetical listing
    - Search by name
    - Work count display
    - Popular publishers section

### Phase 2: Publisher Detail Page

1. Enhance `/publishers/[id]`:
    - Publisher logo/image
    - Description
    - Website and Wikipedia links
    - All works by this publisher
    - Recent releases

### Phase 3: Publisher CRUD UI

1. Create publisher form:
    - Name
    - Description
    - Logo upload
    - Website URL
    - Wikipedia link

2. Edit existing publisher

### Phase 4: Publisher Discovery

1. "Major Publishers" section
2. "Indie Publishers" section
3. Publisher recommendations

### Phase 5: Publisher Integration

1. Auto-detect publisher from metadata
2. Link to publisher on edition detail
3. "More from this publisher" section

## Publisher Data Model

```typescript
type Publisher = {
  id: string;
  name: string;
  description?: string;
  image?: Image;
  url?: string;
  wikipediaUrl?: string;
  workCount: number;
};
```

## Open Questions

1. **Imprints**: Track publisher imprints separately?
2. **Mergers**: Handle publisher mergers/acquisitions?
3. **Verification**: Auto-verify with external data?
4. **Following**: Allow following publishers?
5. **Aggregation**: Aggregate parent/child publishers?
