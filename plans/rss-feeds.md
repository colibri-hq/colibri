# RSS Feeds

## Description

On a Colibri instance actively used by multiple users, there's going to be quite some activity: Books being added and
read, reviews written, author pages updated, comments added, and so on. To keep up with this, support for RSS feeds
should be added. This is also well in line
with [Host OPDS feed for Colibri library #41](https://github.com/colibri-hq/colibri/issues/41), which also requires
feed handling and event sourcing.

## Current Implementation Status

**Not Implemented:**

- ❌ No RSS/Atom feed generation
- ❌ No activity event tracking
- ❌ No feed subscription management

**Existing Infrastructure:**

- ✅ Book and collection data models with timestamps
- ✅ User handle system planned (`/~[handle]`)
- ✅ Reading progress tracking planned
- ✅ Reviews/comments system planned

## Implementation Plan

### Phase 1: Activity Event Model

1. Create activity event table:
   ```sql
   create type activity_type as enum (
     'book_added',
     'book_updated',
     'reading_started',
     'reading_finished',
     'review_posted',
     'comment_added',
     'collection_created',
     'collection_updated'
   );

   create table activity_event (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references "user"(id),
     activity_type activity_type not null,

     -- Polymorphic reference to the subject
     subject_type text not null,  -- 'work', 'collection', 'review', etc.
     subject_id uuid not null,

     -- Denormalized for feed generation
     title text not null,
     summary text,

     -- Visibility inherited from subject or explicit
     visibility visibility default 'default',

     created_at timestamptz default now()
   );

   create index idx_activity_user on activity_event(user_id, created_at desc);
   create index idx_activity_public on activity_event(created_at desc)
     where visibility = 'public';
   ```

2. Emit events on relevant actions:
   - Hook into book creation/update
   - Hook into reading progress updates
   - Hook into review/comment creation

### Phase 2: RSS Feed Generation

1. Create RSS 2.0 serialization:
   ```typescript
   interface RssItem {
     title: string;
     link: string;
     description: string;
     pubDate: Date;
     guid: string;
     author?: string;
     categories?: string[];
     enclosure?: { url: string; type: string; length: number };
   }

   interface RssFeed {
     title: string;
     link: string;
     description: string;
     language?: string;
     lastBuildDate: Date;
     items: RssItem[];
   }

   function serializeRssFeed(feed: RssFeed): string;
   ```

2. Also support Atom format for compatibility

### Phase 3: Feed Routes

1. Create route group for RSS endpoints:
   ```
   /~[handle]/rss              → All activity feed
   /~[handle]/rss/books        → New books only
   /~[handle]/rss/reading      → Reading activity
   /~[handle]/rss/reviews      → Reviews and comments
   /~[handle]/rss/[collection] → Collection-specific feed
   ```

2. Instance-wide feeds (if enabled):
   ```
   /feeds/recent              → Recently added (public)
   /feeds/activity            → All public activity
   ```

3. Support standard feed discovery:
   ```html
   <link rel="alternate" type="application/rss+xml"
         title="Moritz's Library" href="/~moritz/rss" />
   ```

### Phase 4: Feed Customization

1. Query parameters for filtering:
   ```
   /~[handle]/rss?type=book_added,reading_finished
   /~[handle]/rss?collection=fiction
   /~[handle]/rss?limit=50
   ```

2. Support authenticated feeds for private activity:
   - Token-based feed URLs: `/~[handle]/rss?token=[feedToken]`
   - Generate unique feed tokens per user

### Phase 5: Feed Discovery Page

1. Create `/~[handle]/rss` landing page (when accessed via browser):
   - List available feeds with descriptions
   - One-click subscribe buttons for common readers
   - Copy feed URL buttons
   - Token management for private feeds

### Phase 6: Settings UI

1. User settings:
   - Enable/disable activity feed
   - Choose which activities to include
   - Regenerate feed token
   - Set feed visibility (public/authenticated only)

2. Instance settings (admin):
   - Enable/disable RSS feeds globally
   - Enable/disable public activity feeds
   - Set maximum feed item count

## Open Questions

1. **Event Retention**: How long to keep activity events? Prune after 90 days?
2. **Feed Frequency**: Real-time events, or batch updates (hourly/daily)?
3. **Rich Content**: Include book covers as enclosures? Inline HTML descriptions?
4. **WebSub**: Support WebSub (PubSubHubbub) for real-time notifications?
5. **Feed Token Security**: One token per user, or per-feed tokens?
6. **Reading Progress Privacy**: Should reading activity be opt-in for feeds?
7. **Aggregation**: Support following other users' feeds within Colibri?
8. **JSON Feed**: Also support JSON Feed format alongside RSS/Atom?
