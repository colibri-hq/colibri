# Reading Progress & Position Tracking

## Description

Track users' reading progress across all ebook formats, including current position (EPUB CFI, page number, percentage),
reading sessions, time spent, and completion status. This is a core feature for any ebook library application and
enables features like "Continue Reading" and cross-device sync.

## Current Implementation Status

**Not Implemented:**

- ❌ No database schema for reading progress
- ❌ No reading position storage
- ❌ No time tracking
- ❌ No reading status (reading, completed, abandoned)

**Existing Infrastructure:**

- ✅ "Continue reading" placeholder on main page
- ✅ EPUB CFI parsing exists (`packages/sdk/src/ebooks/epub/cfi.ts`)
- ✅ User-edition relationships possible via ratings
- ✅ Local-first sync planned (could include progress)

## Implementation Plan

### Phase 1: Database Schema

1. Create reading progress tables:
   ```sql
   create table reading_progress (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references authentication.user(id),
     edition_id uuid not null references edition(id),

     -- Position tracking
     position_type varchar(20) not null, -- cfi, page, percentage
     position_value text not null,       -- EPUB CFI or page number
     percentage smallint,                -- 0-100 for quick display

     -- Status
     status varchar(20) default 'reading', -- not_started, reading, completed, abandoned
     started_at timestamptz,
     completed_at timestamptz,

     -- Metadata
     updated_at timestamptz default now(),
     device_id varchar(255),              -- For multi-device sync

     unique(user_id, edition_id)
   );

   create table reading_session (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references authentication.user(id),
     edition_id uuid not null references edition(id),
     started_at timestamptz default now(),
     ended_at timestamptz,
     duration_seconds integer,
     pages_read integer,
     start_position text,
     end_position text,
     device_id varchar(255)
   );
   ```

### Phase 2: SDK Resource Functions

1. Create `packages/sdk/src/resources/reading-progress.ts`:
   ```typescript
   export async function getProgress(db, userId, editionId);
   export async function updateProgress(db, userId, editionId, position);
   export async function startSession(db, userId, editionId);
   export async function endSession(db, sessionId, endPosition);
   export async function getRecentlyReading(db, userId, limit);
   export async function markAsCompleted(db, userId, editionId);
   export async function markAsAbandoned(db, userId, editionId);
   ```

### Phase 3: tRPC API

1. Create `apps/app/src/lib/trpc/routes/progress.ts`:
   ```typescript
   progress.get({ editionId })
   progress.update({ editionId, position, percentage })
   progress.startSession({ editionId })
   progress.endSession({ sessionId, endPosition })
   progress.getRecent({ limit })
   progress.setStatus({ editionId, status })
   ```

### Phase 4: Reader Integration

1. Auto-save position on page turn
2. Debounced position updates (every 30 seconds or on chapter change)
3. Session tracking with visibility API
4. Restore position on book open

### Phase 5: UI Components

1. Progress indicator on book cards (percentage bar)
2. "Continue Reading" section on home page
3. Reading status selector (reading/completed/abandoned)
4. Reading history view

### Phase 6: Cross-Device Sync

1. Position conflict resolution (latest wins or user choice)
2. Device identification
3. Sync status indicator

## Position Types

| Format    | Position Type | Example                 |
|-----------|---------------|-------------------------|
| EPUB      | CFI           | `/6/4[chap01]!/4/2/1:0` |
| PDF       | Page          | `42`                    |
| MOBI      | Location      | `1234`                  |
| Audiobook | Seconds       | `3600`                  |

## Status Flow

```
not_started → reading → completed
                ↓
            abandoned
```

## Open Questions

1. **Granularity**: Track every page turn, or only chapter boundaries?
2. **Sessions**: Is session tracking (time spent) necessary for MVP?
3. **Multiple Devices**: How to handle position conflicts?
4. **Offline**: Store progress in IndexedDB for offline reading?
5. **Privacy**: Allow users to hide reading activity?
6. **Statistics**: Calculate reading speed for time estimates?
7. **Goals**: Integrate with reading goals feature?
8. **Sharing**: Allow sharing "currently reading" status?
