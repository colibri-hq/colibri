# Favorites & Bookmarks System

## Description

Allow users to mark collections and creators as favorites for quick access. The database schema exists but lacks SDK
resources and UI for managing favorites.

## Current Implementation Status

**Database Schema Exists:**

- ✅ `user_collection_favorite` table
- ✅ `user_creator_favorite` table

**Not Implemented:**

- ❌ No SDK resource functions
- ❌ No tRPC routes
- ❌ No favorite button/icon on UI
- ❌ No "My Favorites" view
- ❌ No quick access to favorites

## Implementation Plan

### Phase 1: SDK Resource Functions

1. Create `packages/sdk/src/resources/favorite.ts`:
   ```typescript
   // Collection favorites
   export async function addCollectionFavorite(db, userId, collectionId);
   export async function removeCollectionFavorite(db, userId, collectionId);
   export async function isCollectionFavorite(db, userId, collectionId);
   export async function loadFavoriteCollections(db, userId);

   // Creator favorites
   export async function addCreatorFavorite(db, userId, creatorId);
   export async function removeCreatorFavorite(db, userId, creatorId);
   export async function isCreatorFavorite(db, userId, creatorId);
   export async function loadFavoriteCreators(db, userId);

   // Combined
   export async function loadAllFavorites(db, userId);
   ```

### Phase 2: tRPC Routes

1. Add to existing routes or create `favorites.ts`:
   ```typescript
   favorites.collections.add({ collectionId })
   favorites.collections.remove({ collectionId })
   favorites.collections.list()

   favorites.creators.add({ creatorId })
   favorites.creators.remove({ creatorId })
   favorites.creators.list()

   favorites.all()
   ```

### Phase 3: Favorite Toggle Component

1. Create FavoriteButton component:
   ```svelte
   <FavoriteButton
     type="collection"
     id={collection.id}
     isFavorite={collection.isFavorite}
     on:toggle={handleToggle}
   />
   ```

2. Heart/star icon with fill state
3. Optimistic UI update
4. Accessible labels

### Phase 4: UI Integration

1. Add favorite button to:
    - Collection cards
    - Collection detail header
    - Creator cards
    - Creator detail header

2. Show favorite indicator badge

### Phase 5: Favorites View

1. Add "Favorites" section to sidebar/navigation
2. Create favorites page with:
    - Favorite collections grid
    - Favorite creators list
    - Quick access cards

### Phase 6: Quick Access

1. Pin favorites to top of browse views
2. Favorites dropdown in header
3. Keyboard shortcut for favorites (F)

## Favorite Types

| Entity     | Use Case                              |
|------------|---------------------------------------|
| Collection | Quick access to reading lists, genres |
| Creator    | Follow favorite authors               |
| Work*      | Bookmark specific books (future)      |
| Series*    | Track series progress (future)        |

*Not in current schema but could be added

## UI States

```
○ Not favorite (outline heart)
● Is favorite (filled heart)
◐ Loading (spinner)
```

## Open Questions

1. **Works**: Should we add work favorites (distinct from "My Library")?
2. **Series**: Should series be favoritable?
3. **Ordering**: Can users reorder favorites?
4. **Limits**: Maximum favorites per user?
5. **Notifications**: Notify when favorite creator adds new book?
6. **Sync**: Include in local-first sync?
7. **Import**: Import favorites from Goodreads/LibraryThing?
8. **Public**: Can favorites be shared/public?
