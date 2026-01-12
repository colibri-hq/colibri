> **GitHub Issue:** [#121](https://github.com/colibri-hq/colibri/issues/121)

# Comments & Discussions System

## Description

Comprehensive comment system allowing discussions on works, collections, creators, publishers, and series. The database
schema is complete with support for threaded replies and emoji reactions, but needs full API and UI implementation.

## Current Implementation Status

**Database Schema Exists:**

- ✅ `comment` table (content, author, parent_comment for threading)
- ✅ `work_comment`, `collection_comment`, `creator_comment`, `publisher_comment`, `series_comment` junction tables
- ✅ `comment_reaction` for emoji reactions

**Implemented:**

- ✅ Basic comments tRPC router exists
- ✅ CommentForm component exists
- ✅ CommentsPanel component exists
- ✅ ReactionButton component exists
- ✅ Threaded replies UI
- ✅ Comment moderation

**Not Complete:**

- ❌ Notification on replies
- ❌ Edit/delete functionality
- ❌ Rich text support

## Implementation Plan

### Phase 1: Complete SDK Resources

1. Enhance `packages/sdk/src/resources/comment.ts`:
   ```typescript
   export async function createComment(db, { entityType, entityId, content, parentId? });
   export async function updateComment(db, commentId, content);
   export async function deleteComment(db, commentId);
   export async function loadComments(db, entityType, entityId, options);
   export async function loadReplies(db, parentCommentId);
   export async function addReaction(db, commentId, userId, emoji);
   export async function removeReaction(db, commentId, userId, emoji);
   ```

### Phase 2: Complete tRPC Routes

1. Enhance comments router:
   ```typescript
   comments.create({ entityType, entityId, content, parentId? })
   comments.update({ id, content })
   comments.delete({ id })
   comments.list({ entityType, entityId, page?, limit? })
   comments.getReplies({ parentId })
   comments.react({ commentId, emoji })
   comments.unreact({ commentId, emoji })
   ```

### Phase 3: Threaded Comments UI

1. Comment thread component:
   - Nested replies (max depth: 3-5)
   - Collapse/expand threads
   - Reply button per comment
   - Indentation styling

2. Comment composer:
   - Textarea with character limit
   - Reply-to indicator
   - Cancel/Submit buttons

### Phase 4: Reactions Enhancement

1. Emoji picker integration
2. Reaction counts display
3. "Who reacted" tooltip
4. Custom emoji support (future)

### Phase 5: Comment Moderation

1. Report comment functionality
2. Admin moderation queue
3. Hide/delete moderated comments
4. User blocking (hide their comments)

### Phase 6: Notifications

1. Notify on reply to your comment
2. Notify on reaction to your comment
3. Notification preferences

### Phase 7: Rich Content (Optional)

1. Markdown support
2. @mentions
3. Book/author linking
4. Spoiler tags

## Comment Entity Types

| Entity     | Use Case               |
| ---------- | ---------------------- |
| Work       | Discuss specific books |
| Collection | Discuss reading lists  |
| Creator    | Discuss authors        |
| Publisher  | Discuss publishers     |
| Series     | Discuss book series    |

## Thread Structure

```
Comment (parent)
├── Reply 1
│   └── Reply 1.1
│       └── Reply 1.1.1 (max depth)
├── Reply 2
└── Reply 3
    └── Reply 3.1
```

## Reaction System

```typescript
// Common reactions
const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// Display format
{emoji}: {count} ({userNames if few})
```

## Open Questions

1. **Thread Depth**: Maximum nesting level (3? 5? Unlimited?)?
2. **Moderation**: Pre-moderation for child accounts?
3. **Editing**: Allow editing? With edit history?
4. **Deletion**: Soft delete or hard delete?
5. **Mentions**: Support @username mentions?
6. **Spoilers**: Built-in spoiler tag support?
7. **Length**: Maximum comment length?
8. **Markdown**: Full markdown or limited subset?
