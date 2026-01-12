> **GitHub Issue:** [#163](https://github.com/colibri-hq/colibri/issues/163)

# User Reviews

## Description

Enable users to write, edit, and publish reviews for books in their library. Reviews should be rich text documents that
can be shared publicly or kept private, allowing users to express their thoughts about books they've read.

## Current Implementation Status

**Partially Implemented:**

- ✅ Database schema exists (`supabase/schema/13_reviews.sql`)
- ✅ `review` table with fields: `id`, `edition_id`, `author_id`, `content` (text), `created_at`, `updated_at`
- ✅ Foreign keys to `edition` and `user` tables
- ✅ Read-only display component exists in UI
- ❌ No CRUD API endpoints in tRPC
- ❌ No review creation/editing UI
- ❌ No visibility/sharing controls
- ❌ No rating integration with reviews

## Implementation Plan

### Phase 1: Backend API

1. Create tRPC router for reviews (`apps/app/src/lib/trpc/routes/reviews.ts`)
   - `create` - Create new review
   - `update` - Edit existing review
   - `delete` - Remove review
   - `getByEdition` - Get reviews for a book
   - `getByUser` - Get user's reviews
   - `publish`/`unpublish` - Toggle visibility

2. Add SDK resource functions (`packages/sdk/src/resources/review.ts`)
   - `createReview(database, { editionId, authorId, content })`
   - `updateReview(database, id, { content })`
   - `deleteReview(database, id)`
   - `loadReviewsForEdition(database, editionId)`
   - `loadReviewsByUser(database, userId)`

### Phase 2: Schema Updates

1. Add columns to `review` table:
   - `published` (boolean) - Whether review is publicly visible
   - `rating_id` (foreign key) - Link to associated rating
   - `title` (varchar) - Optional review title

### Phase 3: Frontend UI

1. Review creation form component
2. Review editing interface
3. Review display card with author info
4. Reviews section on book detail page
5. User's reviews list in profile

### Phase 4: Rich Text

1. Evaluate editor options (TipTap, ProseMirror, or Markdown)
2. Implement editor component
3. Add content sanitization

## Open Questions

1. **Content Format**: Should reviews be plain text, Markdown, or rich text (HTML)?
2. **Moderation**: Do we need admin moderation for public reviews?
3. **Spoiler Tags**: Should we support spoiler warnings/hidden content?
4. **Review Length**: Minimum/maximum character limits?
5. **One Review Per User**: Can users write multiple reviews for the same book, or one that they can update?
6. **Reactions**: Should other users be able to react to/like reviews?
7. **Rating Coupling**: Must a review include a rating, or are they independent?
