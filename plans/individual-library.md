# Individual Library Per User

## Description

Give each user their own personal library view containing only books they're interested in, while maintaining access to
the shared family bookshelf. Users add books from the shared pool to their personal library, similar to how reading
lists work but as the primary library view.

## Current Implementation Status

**Partially Implemented:**

- ✅ Collections exist for organizing books
- ✅ Reading list concept available
- ❌ No "My Library" separate from family library
- ❌ No user-specific book associations
- ❌ No "add to my library" action

## Implementation Plan

### Phase 1: User Library Concept

1. Create user_library junction table:
   ```sql
   CREATE TABLE user_library (
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     work_id UUID NOT NULL REFERENCES work(id),
     added_at TIMESTAMPTZ DEFAULT now(),
     source VARCHAR(50), -- manual, imported, shared, purchased
     PRIMARY KEY (user_id, work_id)
   );
   ```

2. Define library relationship:
    - Personal Library = books user has explicitly added
    - Family Shelf = all books in the instance
    - Reading List = subset of Personal Library, ordered

### Phase 2: Add/Remove from Library

1. "Add to My Library" action on books
2. "Remove from Library" (doesn't delete book)
3. Bulk add from collections
4. Auto-add on purchase/import

### Phase 3: Library Views

1. **My Library** (default view):
    - Only books user has added
    - Personal organization
    - Primary navigation destination

2. **Family Bookshelf**:
    - All shared books
    - Browse and add to personal library
    - Secondary navigation

3. **Discover**:
    - Books not in personal library
    - Recommendations
    - External catalogs

### Phase 4: UI Navigation

1. Sidebar structure:
   ```
   📚 My Library (primary)
   📖 Currently Reading
   ⭐ Favorites
   📑 Reading List
   ---
   👨‍👩‍👧 Family Bookshelf
   🔍 Discover
   📁 Collections
   ```

2. Book card indicators:
    - "In your library" badge
    - "Add to library" button

### Phase 5: Library Sync

1. Cross-device library sync
2. Reading progress per user
3. Personal ratings don't affect family ratings

### Phase 6: Child Library Management

1. Parents can add books to child's library
2. Children can add from allowed content
3. Parent approval for new additions (optional)

## Library Relationships

```
┌─────────────────────────────────────────────┐
│           Instance (Family Shelf)           │
│  ┌─────────────────────────────────────┐   │
│  │        User A's Library              │   │
│  │   ┌─────────┐  ┌─────────┐          │   │
│  │   │Book 1   │  │Book 2   │          │   │
│  │   └─────────┘  └─────────┘          │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │        User B's Library              │   │
│  │   ┌─────────┐  ┌─────────┐          │   │
│  │   │Book 2   │  │Book 3   │          │   │
│  │   └─────────┘  └─────────┘          │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │Book 1   │  │Book 2   │  │Book 3   │    │
│  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────┘
```

## Open Questions

1. **Default View**: Personal library or family shelf as default?
2. **Auto-Add**: Automatically add books user interacts with?
3. **Empty State**: What shows when personal library is empty?
4. **Collections**: Are collections personal or shared?
5. **Ratings**: Personal ratings vs family aggregates?
6. **Child Libraries**: Can children manage their own library?
7. **Migration**: How to handle existing users (no personal library)?
8. **Deletion**: What happens when book is deleted from family shelf?
