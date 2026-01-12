> **GitHub Issue:** [#140](https://github.com/colibri-hq/colibri/issues/140)

# Local-First Sync with ElectricSQL

## Description

Implement local-first data synchronization using ElectricSQL, allowing the application to work offline and sync changes
when connectivity is restored. This provides a better user experience with instant UI updates and resilience to network
issues.

## Current Implementation Status

**Not Implemented:**

- ❌ No local database in the browser
- ❌ No offline support
- ❌ No sync infrastructure

**Current Architecture:**

- ✅ PostgreSQL via Supabase
- ✅ Kysely ORM for server-side queries
- ✅ tRPC for client-server communication
- ✅ Service workers exist for upload handling

## Implementation Plan

### Phase 1: Research & Evaluation

1. Evaluate ElectricSQL vs alternatives:
   - ElectricSQL (Postgres sync)
   - PowerSync
   - Triplit
   - Custom CRDT implementation
2. Assess compatibility with Supabase
3. Determine sync scope (which tables to sync)

### Phase 2: Infrastructure Setup

1. Deploy Electric sync service
2. Configure replication from Supabase Postgres
3. Set up shape subscriptions for filtered sync
4. Define sync rules per user role

### Phase 3: Client Integration

1. Add Electric client to web app
2. Create local SQLite database schema
3. Implement shape subscriptions:
   - User's collections
   - User's reading progress
   - Accessible works/editions
4. Handle conflict resolution

### Phase 4: UI Adaptation

1. Replace tRPC calls with local queries where applicable
2. Add optimistic updates
3. Show sync status indicator
4. Handle offline mode gracefully
5. Queue mutations for later sync

### Phase 5: Selective Sync

1. User-configurable sync preferences
2. Bandwidth-conscious sync (metadata only vs. full)
3. Device storage limits handling

## Data Sync Scope

**Always Sync:**

- User preferences
- Reading progress
- Collections (owned)
- Ratings and reviews (own)

**Sync on Demand:**

- Work/edition metadata
- Creator information
- Cover images (cached separately)

**Never Sync Locally:**

- Ebook file contents
- Other users' private data
- Admin/system settings

## Open Questions

1. **Sync Technology**: ElectricSQL specifically, or evaluate alternatives first?
2. **Conflict Resolution**: Last-write-wins, or user-prompted merge?
3. **Storage Limits**: How much data to cache locally? User-configurable?
4. **Initial Sync**: Full sync on first load, or lazy loading?
5. **Multi-Device**: How to handle same user on multiple devices?
6. **Supabase Compatibility**: Any limitations with Supabase's Postgres setup?
7. **Mobile Apps**: Will this architecture support future native apps?
8. **Security**: How to encrypt local database on client?
