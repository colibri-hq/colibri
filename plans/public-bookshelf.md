# Public Bookshelf & Visibility Controls

## Description

Colibri allows you to manage your eBook library, but is fundamentally geared towards private usage: Your library is only
accessible to the registered users of an instance.
However, sometimes you want to publish your current reading list, or refer to books in your personal collection, simply
allow others to peruse your library, or—let's be honest here—brag a little about your exquisite taste in books!

To enable all of these use cases, Colibri should support public shelves: An anonymously accessible landing page that
showcases select books. Public shelves are really only intended to present books, without distributing them; I have no
intention of transforming Colibri into a P2P file sharing tool in any way.
Every user can create their public shelf by explicitly updating the book's visibility. With that, there's three possible
values per book:

1. Private: The book is only visible to its owner, not to other members of the instance, public shelves, or OPDS feeds (
   see [Host OPDS feed for Colibri library #41](https://github.com/colibri-hq/colibri/issues/41)).
2. Default: The book is neither private nor public, and thus visible to all members of the instance, but no public
   shelves
   or feeds. Side note: This could need a better name.
3. Public: The book is visible to all members of the instance, on public shelves, and OPDS feeds.

## Endpoints

```
/~{{ userHandle }}
```

Every user will have their personal, public shelf available below their personal directory. This follows both classic
conventions of [Apache UserDir](https://httpd.apache.org/docs/2.4/howto/public_html.html), and also conveniently creates
a URI namespace that won't conflict with other application routes.
Additionally, we can nest other routes below the user's shelf, such as their OPDS feed (#41), their RSS
feed ([#48](https://github.com/colibri-hq/colibri/issues/48)), or an `llms.txt` endpoint describing their shelf.

## Settings

Instance admins should be able to globally toggle public shelves in the runtime settings. For individual users, the
shelf will be enabled when they mark a book public for the first time. At that time, the app should offer guidance on
publishing and modifying their shelf. In the shelf settings, they can also disable the shelf again.

## Current Implementation Status

**Partially Implemented:**

- ✅ `collection` table has `shared` boolean field
- ✅ Access control based on `shared` flag and `created_by`
- ✅ Age requirement field on collections
- ❌ No user handle system for `/~[handle]` URLs
- ❌ No three-tier visibility system (private/default/public)
- ❌ No per-book visibility field
- ❌ No public shelf routes
- ❌ No instance-level public toggle
- ❌ No per-user shelf enablement

## Implementation Plan

### Phase 1: Schema Updates

1. Add `handle` column to user table for public URLs:
   ```sql
   alter table "user"
     add column handle text unique;

   -- Handles must be URL-safe, lowercase alphanumeric with hyphens
   alter table "user"
     add constraint handle_format check (handle ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');
   ```

2. Add `visibility` enum to work table:
   ```sql
   create type visibility as enum ('private', 'default', 'public');

   alter table work
     add column visibility visibility default 'default';
   ```

3. Add instance and user settings:
   ```sql
   -- Instance-level toggle
   insert into setting (key, value)
   values ('public_shelves_enabled', 'false');

   -- Per-user shelf settings
   alter table "user"
     add column public_shelf_enabled boolean default false;
   ```

### Phase 2: Access Control Updates

1. Update Kysely query helpers:
   ```typescript
   function applyVisibility(query, viewerId, ownerId, isPublicRequest) {
     if (isPublicRequest) {
       // Anonymous: only public books from users with enabled shelves
       return query
         .where('visibility', '=', 'public')
         .where('owner.public_shelf_enabled', '=', true);
     }
     return query.where(eb => eb.or([
       eb('created_by', '=', viewerId), // Owner sees all
       eb.and([
         eb('visibility', '!=', 'private'),
         eb('created_by', 'in', familyUserIds) // Family sees default + public
       ])
     ]));
   }
   ```

2. Update tRPC procedures to respect visibility
3. Add middleware to check `public_shelves_enabled` instance setting

### Phase 3: User Handle System

1. Add handle selection during onboarding or in profile settings
2. Validate handle uniqueness and format (URL-safe, no reserved words)
3. Reserved handles: `admin`, `api`, `settings`, `login`, etc.
4. Optional: Auto-suggest handles based on display name

### Phase 4: Public Shelf Routes

1. Create route group for `/~[handle]`:
   ```
   /~[handle]              → Public shelf landing page
   /~[handle]/[work]       → Public book detail page
   /~[handle]/opds         → OPDS feed (see #41)
   /~[handle]/rss          → RSS feed (see #48)
   /~[handle]/llms.txt     → LLM-friendly shelf description
   ```

2. Public shelf landing page:
   - User's display name and optional bio
   - Grid/list of public books with covers
   - Filter by collection (if collections are also public)
   - No download/read access for anonymous users

3. Public book detail page:
   - Book metadata, cover, description
   - Link to Open Library/Wikidata entries
   - "Available in [User]'s library" attribution

4. SEO-friendly metadata (Open Graph, JSON-LD)

### Phase 5: UI for Visibility Management

1. Visibility selector on book edit page:
   - Private: "Only you can see this"
   - Default: "Visible to your household"
   - Public: "Visible on your public shelf"

2. Visibility indicator badges on book cards
3. Bulk visibility change in library view
4. "Preview public shelf" button in settings
5. First-time guidance when marking first book public

### Phase 6: Instance Settings

1. Admin toggle for public shelves feature
2. When disabled, all `/~` routes return 404
3. Option to require admin approval before shelf goes live
4. Rate limiting on public endpoints to prevent scraping

## Visibility Matrix

| Visibility | Owner  | Family   | Anonymous         |
|------------|--------|----------|-------------------|
| Private    | ✅ Full | ❌ Hidden | ❌ Hidden          |
| Default    | ✅ Full | ✅ View   | ❌ Hidden          |
| Public     | ✅ Full | ✅ View   | ✅ View*           |

*Requires: instance `public_shelves_enabled` = true AND user `public_shelf_enabled` = true

## Open Questions

1. **Inheritance**: Does collection visibility override book visibility, or vice versa?
2. **Default Policy**: What should the default be for new collections/books?
3. **Migration**: How to migrate existing `shared` boolean to new enum?
4. **Search Indexing**: Should public books be indexable by search engines?
5. **Rate Limiting**: Protect public endpoints from scraping?
6. **Analytics**: Track views on public collections?
7. **Social Features**: Allow comments/reactions on public books from logged-in users?
8. **Link Sharing**: Generate shareable links for specific views?
