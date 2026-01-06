# Scheduled Jobs (Cron)

## Description

Implement a system for running scheduled background tasks like metadata refresh, cleanup operations, notification
delivery, and report generation. Support both recurring schedules and one-time delayed jobs.

## Current Implementation Status

**Not Implemented:**

- ❌ No job scheduler
- ❌ No background task runner
- ❌ No cron-like functionality

**Existing Infrastructure:**

- ✅ PostgreSQL (could use pg_cron extension)
- ✅ Service workers (for client-side tasks)
- ✅ Supabase Edge Functions available

## Implementation Plan

### Phase 1: Job Scheduler Selection

1. Evaluate options:
    - **pg_cron** - PostgreSQL extension
    - **Supabase Edge Functions** - Serverless cron
    - **BullMQ** - Redis-based queue
    - **Agenda** - MongoDB-based (not ideal)
    - **node-cron** - In-process scheduler

2. Recommended: Supabase Edge Functions + pg_cron hybrid

### Phase 2: Job Definition Schema

1. Create scheduled job table:
   ```sql
   CREATE TABLE scheduled_job (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(100) UNIQUE NOT NULL,
     description TEXT,
     schedule VARCHAR(100) NOT NULL, -- Cron expression
     handler VARCHAR(100) NOT NULL, -- Function name
     parameters JSONB,
     enabled BOOLEAN DEFAULT true,
     last_run_at TIMESTAMPTZ,
     last_run_status VARCHAR(20),
     last_run_duration_ms INTEGER,
     next_run_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE TABLE job_execution (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     job_id UUID REFERENCES scheduled_job(id),
     started_at TIMESTAMPTZ DEFAULT now(),
     completed_at TIMESTAMPTZ,
     status VARCHAR(20), -- running, completed, failed
     result JSONB,
     error TEXT
   );
   ```

### Phase 3: Core Scheduled Jobs

1. **Metadata Refresh** (daily):
    - Update stale metadata
    - Fill missing fields
    - Refresh cover images

2. **Cleanup** (weekly):
    - Remove orphaned assets
    - Clean expired sessions
    - Purge old job logs

3. **Statistics** (hourly):
    - Update reading statistics
    - Calculate popular books
    - Aggregate ratings

4. **Notifications** (every 5 min):
    - Send pending emails
    - Process notification queue

### Phase 4: Job Runner

1. Edge Function approach:
   ```typescript
   // supabase/functions/job-runner/index.ts
   Deno.serve(async (req) => {
     const { jobId } = await req.json();
     const job = await getJob(jobId);

     await executeJob(job);

     return new Response('OK');
   });
   ```

2. pg_cron triggers Edge Function:
   ```sql
   SELECT cron.schedule(
     'metadata-refresh',
     '0 3 * * *', -- 3 AM daily
     $$SELECT net.http_post(
       'https://your-project.supabase.co/functions/v1/job-runner',
       '{"jobId": "metadata-refresh"}'
     )$$
   );
   ```

### Phase 5: Job Management UI

1. Admin dashboard for jobs:
    - List scheduled jobs
    - Enable/disable jobs
    - View execution history
    - Manual trigger button

2. Job detail view:
    - Execution logs
    - Error details
    - Performance metrics

### Phase 6: Alert System

1. Alert on job failure
2. Alert on long-running jobs
3. Alert on missed schedules
4. Notification via email/webhook

### Phase 7: Custom Jobs

1. Admin can create custom jobs
2. Schedule configuration UI
3. Parameter input

## Scheduled Jobs List

| Job                | Schedule     | Description                |
|--------------------|--------------|----------------------------|
| refresh_metadata   | 0 3 * * *    | Update book metadata       |
| cleanup_orphans    | 0 4 * * 0    | Remove orphaned files      |
| expire_sessions    | */15 * * * * | Clean expired sessions     |
| send_notifications | */5 * * * *  | Process notification queue |
| generate_stats     | 0 * * * *    | Update statistics          |
| backup_database    | 0 2 * * *    | Database backup            |
| refresh_tokens     | 0 */6 * * *  | Refresh OAuth tokens       |
| loan_reminders     | 0 9 * * *    | Library loan due reminders |

## Cron Expression Reference

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6)
│ │ │ │ │
* * * * *
```

## Open Questions

1. **Infrastructure**: pg_cron, Edge Functions, or external service?
2. **Retry Policy**: How many retries on failure?
3. **Concurrency**: Allow parallel job execution?
4. **Timeout**: Maximum job runtime before killing?
5. **Monitoring**: Integration with monitoring service?
6. **Logs Retention**: How long to keep execution logs?
7. **Time Zone**: UTC or configurable per job?
8. **User Jobs**: Allow users to schedule personal jobs?
