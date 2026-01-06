---
title: tRPC API Reference
description: Internal tRPC API documentation
date: 2024-01-01
order: 2
tags: [api, trpc, developers, reference]
relevance: 65
---

# tRPC API Reference

Colibri uses tRPC for type-safe communication between the client and server. This reference documents the available procedures.

> **Note**: This is the internal API used by the web application. For external API access, use the [CLI](/user-guide/cli).

## Understanding tRPC

tRPC provides end-to-end type safety:

```typescript
// Server defines procedures
const router = {
  works: {
    list: procedure.query(async () => { ... }),
    create: procedure.mutation(async () => { ... })
  }
}

// Client gets full types
const works = await trpc.works.list.query()
//    ^? Work[]
```

## Router Structure

The API is organized into routers by domain:

- `accounts` - User account management
- `books` - Book/work operations
- `collections` - Collection management
- `comments` - Comments and reviews
- `creators` - Authors and contributors
- `notifications` - Notification management
- `publishers` - Publisher operations
- `search` - Search functionality
- `settings` - Instance and user settings
- `users` - User administration

## Common Patterns

### Pagination

Most list endpoints support cursor-based pagination:

```typescript
interface PaginationInput {
  limit?: number; // Default: 20, Max: 100
  cursor?: string; // Opaque cursor from previous response
}

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

### Filtering

Filter by common fields:

```typescript
interface FilterInput {
  search?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}
```

### Sorting

Sort by specific fields:

```typescript
type SortField = "title" | "createdAt" | "updatedAt";
type SortOrder = "asc" | "desc";

interface SortInput {
  field: SortField;
  order: SortOrder;
}
```

## Works Router

### `works.list`

List works in the library.

```typescript
trpc.works.list.query({
  limit: 20,
  cursor?: string,
  filter?: {
    search?: string,
    creatorId?: string,
    publisherId?: string,
    seriesId?: string,
    tags?: string[],
    language?: string
  },
  sort?: {
    field: 'title' | 'createdAt' | 'publicationDate',
    order: 'asc' | 'desc'
  }
})
```

### `works.get`

Get a single work by ID.

```typescript
trpc.works.get.query({
  id: string,
});
```

### `works.create`

Create a new work.

```typescript
trpc.works.create.mutate({
  title: string,
  subtitle?: string,
  description?: string,
  publicationDate?: string,
  language?: string,
  creators?: Array<{
    id?: string,
    name: string,
    role: 'author' | 'editor' | 'translator'
  }>,
  publishers?: Array<{
    id?: string,
    name: string
  }>,
  series?: {
    id?: string,
    name: string,
    position?: number
  },
  tags?: string[]
})
```

### `works.update`

Update work metadata.

```typescript
trpc.works.update.mutate({
  id: string,
  title?: string,
  subtitle?: string,
  description?: string,
  publicationDate?: string,
  // ... other fields
})
```

### `works.delete`

Delete a work.

```typescript
trpc.works.delete.mutate({
  id: string,
});
```

### `works.enrich`

Fetch metadata from external providers.

```typescript
trpc.works.enrich.mutate({
  id: string,
  providers?: string[]  // Optional: specific providers
})
```

## Collections Router

### `collections.list`

List user's collections.

```typescript
trpc.collections.list.query({
  limit?: number,
  cursor?: string
})
```

### `collections.get`

Get a single collection.

```typescript
trpc.collections.get.query({
  id: string,
});
```

### `collections.create`

Create a new collection.

```typescript
trpc.collections.create.mutate({
  name: string,
  description?: string,
  icon?: string,
  color?: string,
  visibility?: 'private' | 'public'
})
```

### `collections.update`

Update collection metadata.

```typescript
trpc.collections.update.mutate({
  id: string,
  name?: string,
  description?: string,
  icon?: string,
  color?: string,
  visibility?: 'private' | 'public'
})
```

### `collections.delete`

Delete a collection.

```typescript
trpc.collections.delete.mutate({
  id: string,
});
```

### `collections.addWork`

Add a work to a collection.

```typescript
trpc.collections.addWork.mutate({
  collectionId: string,
  workId: string,
  position?: number
})
```

### `collections.removeWork`

Remove a work from a collection.

```typescript
trpc.collections.removeWork.mutate({
  collectionId: string,
  workId: string,
});
```

## Comments Router

### `comments.list`

List comments for a work.

```typescript
trpc.comments.list.query({
  workId: string,
  limit?: number,
  cursor?: string
})
```

### `comments.create`

Create a comment or review.

```typescript
trpc.comments.create.mutate({
  workId: string,
  content: string,
  rating?: number,        // 1-5 stars
  isReview?: boolean,
  parentId?: string       // For replies
})
```

### `comments.update`

Update a comment.

```typescript
trpc.comments.update.mutate({
  id: string,
  content?: string,
  rating?: number
})
```

### `comments.delete`

Delete a comment.

```typescript
trpc.comments.delete.mutate({
  id: string,
});
```

### `comments.react`

Add a reaction to a comment.

```typescript
trpc.comments.react.mutate({
  commentId: string,
  emoji: string, // e.g., "👍", "❤️"
});
```

### `comments.report`

Report inappropriate content.

```typescript
trpc.comments.report.mutate({
  commentId: string,
  reason: 'spam' | 'offensive' | 'off-topic' | 'other',
  details?: string
})
```

## Creators Router

### `creators.list`

List all creators.

```typescript
trpc.creators.list.query({
  limit?: number,
  cursor?: string,
  search?: string
})
```

### `creators.get`

Get a single creator.

```typescript
trpc.creators.get.query({
  id: string,
});
```

### `creators.create`

Create a new creator.

```typescript
trpc.creators.create.mutate({
  name: string,
  sortName?: string,
  biography?: string,
  birthDate?: string,
  deathDate?: string
})
```

### `creators.update`

Update creator information.

```typescript
trpc.creators.update.mutate({
  id: string,
  name?: string,
  sortName?: string,
  biography?: string
})
```

## Search Router

### `search.query`

Perform a search across all resources.

```typescript
trpc.search.query.query({
  q: string,
  type?: 'works' | 'creators' | 'publishers' | 'all',
  limit?: number,
  filters?: {
    language?: string,
    tags?: string[],
    minRating?: number
  }
})
```

### `search.suggest`

Get search suggestions.

```typescript
trpc.search.suggest.query({
  q: string,
  limit?: number
})
```

## Notifications Router

### `notifications.list`

List user notifications.

```typescript
trpc.notifications.list.query({
  limit?: number,
  cursor?: string,
  unreadOnly?: boolean
})
```

### `notifications.markRead`

Mark notification as read.

```typescript
trpc.notifications.markRead.mutate({
  id: string,
});
```

### `notifications.markAllRead`

Mark all notifications as read.

```typescript
trpc.notifications.markAllRead.mutate();
```

### `notifications.subscribe`

Subscribe to notifications for a work.

```typescript
trpc.notifications.subscribe.mutate({
  workId: string,
  types: Array<"comments" | "updates" | "all">,
});
```

## Settings Router

### `settings.get`

Get instance or user settings.

```typescript
trpc.settings.get.query({
  scope: 'instance' | 'user',
  key?: string  // Specific setting or all if omitted
})
```

### `settings.update`

Update settings.

```typescript
trpc.settings.update.mutate({
  scope: "instance" | "user",
  key: string,
  value: any,
});
```

### `settings.getMetadataProviders`

Get configured metadata providers.

```typescript
trpc.settings.getMetadataProviders.query();
```

### `settings.updateMetadataProviders`

Update metadata provider configuration.

```typescript
trpc.settings.updateMetadataProviders.mutate({
  providers: Array<{
    name: string;
    enabled: boolean;
    apiKey?: string;
    priority?: number;
  }>,
});
```

## Users Router (Admin)

### `users.list`

List all users (admin only).

```typescript
trpc.users.list.query({
  limit?: number,
  cursor?: string,
  role?: 'admin' | 'adult' | 'child'
})
```

### `users.get`

Get user details.

```typescript
trpc.users.get.query({
  id: string,
});
```

### `users.update`

Update user information.

```typescript
trpc.users.update.mutate({
  id: string,
  role?: 'admin' | 'adult' | 'child',
  name?: string
})
```

### `users.delete`

Delete a user.

```typescript
trpc.users.delete.mutate({
  id: string,
  purgeContent?: boolean
})
```

## Accounts Router

### `accounts.profile`

Get current user's profile.

```typescript
trpc.accounts.profile.query();
```

### `accounts.updateProfile`

Update current user's profile.

```typescript
trpc.accounts.updateProfile.mutate({
  name?: string,
  email?: string,
  avatar?: string
})
```

### `accounts.listPasskeys`

List current user's registered Passkeys.

```typescript
trpc.accounts.listPasskeys.query();
```

### `accounts.deletePasskey`

Delete a Passkey.

```typescript
trpc.accounts.deletePasskey.mutate({
  id: string,
});
```

## Error Handling

tRPC errors include:

```typescript
interface TRPCError {
  code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "INTERNAL_SERVER_ERROR";
  message: string;
  data?: {
    // Additional error context
  };
}
```

### Example

```typescript
try {
  await trpc.works.get.query({ id: "invalid" });
} catch (error) {
  if (error.data?.code === "NOT_FOUND") {
    console.error("Work not found");
  }
}
```

## Authentication

All procedures require authentication via session cookies (set by Passkey login).

## Rate Limiting

Rate limits apply per user:

- **Queries**: 100 requests/minute
- **Mutations**: 60 requests/minute
- **Uploads**: 10 requests/minute

## Subscriptions

Real-time updates via WebSocket:

```typescript
// Subscribe to notifications
trpc.notifications.onNew.subscribe(undefined, {
  onData: (notification) => {
    console.log("New notification:", notification);
  },
});
```

## Best Practices

### Pagination

Always use pagination for lists:

```typescript
// Good
const { items, nextCursor } = await trpc.works.list.query({ limit: 20 });

// Bad - fetches everything
const { items } = await trpc.works.list.query({ limit: 1000 });
```

### Error Handling

Handle specific error codes:

```typescript
try {
  await trpc.works.create.mutate(data);
} catch (error) {
  switch (error.data?.code) {
    case "UNAUTHORIZED":
      // Redirect to login
      break;
    case "BAD_REQUEST":
      // Show validation errors
      break;
    default:
    // Generic error message
  }
}
```

### Caching

Use query invalidation for mutations:

```typescript
const utils = trpc.useContext();

await trpc.works.create.mutate(data);

// Invalidate list to refetch
await utils.works.list.invalidate();
```

## Type Safety

Import types from the router:

```typescript
import type { RouterOutput } from "$lib/trpc/router";

type Work = RouterOutput["works"]["get"];
type WorkList = RouterOutput["works"]["list"];
```

## Development

### Testing Procedures

```typescript
import { createCaller } from "./router";

const caller = createCaller({ user: mockUser });
const result = await caller.works.list({ limit: 10 });
```

### Debugging

Enable tRPC logging:

```typescript
const trpc = createTRPCClient({
  // ...
  links: [
    loggerLink({
      enabled: (opts) => process.env.NODE_ENV === "development",
    }),
  ],
});
```
