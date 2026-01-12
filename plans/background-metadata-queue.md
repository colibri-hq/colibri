> **GitHub Issue:** [#118](https://github.com/colibri-hq/colibri/issues/118)

# Background Metadata Queue via Service Workers

## Description

Use Service Workers to process metadata enrichment jobs in the background, improving book metadata while the user's
browser is idle. Workers register with the server to receive jobs, process them client-side to reduce server load, and
report results back.

## Current Implementation Status

**Partially Implemented:**

- ✅ Service workers exist for upload handling
- ✅ Metadata providers implemented
- ✅ Caching system for metadata
- ❌ No job queue system
- ❌ No background processing
- ❌ No worker registration with server

## Implementation Plan

### Phase 1: Job Queue Schema

1. Create metadata job table:
   ```sql
   create table metadata_job (
     id uuid primary key default gen_random_uuid(),
     work_id uuid references work(id),
     edition_id uuid references edition(id),
     job_type varchar(50) not null, -- enrich_metadata, find_cover, verify_isbn
     status varchar(20) default 'pending', -- pending, processing, completed, failed
     priority integer default 5,
     assigned_to uuid, -- Worker ID
     assigned_at timestamptz,
     completed_at timestamptz,
     result jsonb,
     error text,
     retry_count integer default 0,
     created_at timestamptz default now()
   );
   ```

### Phase 2: Worker Registration

1. Service worker announces availability:

   ```typescript
   // In service worker
   async function registerAsWorker() {
     const registration = await fetch('/api/workers/register', {
       method: 'POST',
       body: JSON.stringify({
         capabilities: ['metadata', 'covers'],
         maxConcurrent: 2,
       }),
     });
     return registration.workerId;
   }
   ```

2. Server tracks active workers
3. Worker heartbeat to maintain registration

### Phase 3: Job Distribution

1. Workers poll for available jobs:

   ```typescript
   async function pollForJobs(workerId: string) {
     const job = await fetch(`/api/workers/${workerId}/jobs`);
     if (job) {
       processJob(job);
     }
   }
   ```

2. Alternative: Server-Sent Events (SSE)
3. Alternative: Web Push notifications

### Phase 4: Job Processing

1. Worker processes job client-side:

   ```typescript
   async function processJob(job: MetadataJob) {
     switch (job.type) {
       case 'enrich_metadata':
         const metadata = await searchProviders(job.edition);
         await reportResult(job.id, metadata);
         break;
       case 'find_cover':
         const cover = await findCoverImage(job.edition);
         await reportResult(job.id, cover);
         break;
     }
   }
   ```

2. Use existing metadata providers
3. Respect rate limits

### Phase 5: Result Handling

1. Worker reports results to server
2. Server validates and applies updates
3. Conflict resolution if book was edited

### Phase 6: Privacy Controls

1. Workers only process accessible content:
   - Public books: any worker
   - Shared books: family members only
   - Private books: owner only

2. Job filtering based on worker's user permissions

### Phase 7: Idle Detection

1. Use `requestIdleCallback` for timing
2. Pause during active use
3. Resume when idle
4. Battery-aware processing

### Phase 8: Duplicate Detection

1. Background job to find duplicates
2. Suggest merges to users
3. Automatic de-duplication (with approval)

## Job Types

| Type              | Description               | Priority |
| ----------------- | ------------------------- | -------- |
| enrich_metadata   | Fill missing metadata     | 5        |
| find_cover        | Find better cover image   | 4        |
| verify_isbn       | Validate ISBN checksums   | 3        |
| link_identifiers  | Find external IDs         | 3        |
| detect_duplicates | Find potential duplicates | 2        |
| update_stale      | Refresh old metadata      | 1        |

## Worker Lifecycle

```
1. Page loads → Service worker activates
2. Worker registers with server
3. Server assigns worker ID
4. Worker polls/listens for jobs
5. Worker processes jobs when idle
6. Worker reports results
7. Page closes → Worker unregisters (timeout)
```

## Open Questions

1. **Communication**: Polling vs. SSE vs. Web Push?
2. **Offline**: Queue jobs for offline processing?
3. **Conflicts**: Handle concurrent edits during processing?
4. **Quotas**: Limit jobs per worker per day?
5. **Verification**: Trust worker results, or verify server-side?
6. **Credits**: Track worker contributions (gamification)?
7. **Fallback**: Server-side processing if no workers available?
8. **Browser Support**: Handle browsers without service workers?
