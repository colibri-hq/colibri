# Error Handling & Logging Infrastructure

## Description

Establish consistent error handling patterns and structured logging across the entire application. Currently logging is
basic console-based with no production-ready infrastructure.

## Current Implementation Status

**Basic Implementation:**

- ✅ Simple logging function in `apps/app/src/lib/logging.ts`
- ✅ Console-based output
- ✅ Request logging in development

**Not Implemented:**

- ❌ No structured logging (JSON format)
- ❌ No log levels (debug, info, warn, error)
- ❌ No log aggregation
- ❌ No error tracking service
- ❌ No production logging configuration
- ❌ No sensitive data redaction

## Implementation Plan

### Phase 1: Logging Library

1. Select and integrate logging library:
    - **pino** (recommended for Node.js performance)
    - **winston** (more features)
    - **console** wrapper (minimal)

2. Create shared logger (`packages/shared/src/logging.ts`):
   ```typescript
   export const logger = createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
     redact: ['password', 'token', 'secret', 'authorization'],
   });

   export const createChildLogger = (context: Record<string, unknown>) =>
     logger.child(context);
   ```

### Phase 2: Structured Logging Format

1. Define log format:
   ```json
   {
     "timestamp": "2024-01-15T10:30:00.000Z",
     "level": "error",
     "message": "Failed to fetch metadata",
     "context": {
       "service": "metadata",
       "provider": "openlibrary",
       "workId": "123"
     },
     "error": {
       "name": "TimeoutError",
       "message": "Request timed out",
       "stack": "..."
     },
     "requestId": "abc-123"
   }
   ```

2. Implement across all packages

### Phase 3: Error Types

1. Define application error hierarchy:
   ```typescript
   class AppError extends Error {
     constructor(
       message: string,
       public code: string,
       public statusCode: number = 500,
       public isOperational: boolean = true,
       public context?: Record<string, unknown>
     ) {
       super(message);
     }
   }

   class ValidationError extends AppError { ... }
   class AuthenticationError extends AppError { ... }
   class AuthorizationError extends AppError { ... }
   class NotFoundError extends AppError { ... }
   class ConflictError extends AppError { ... }
   class ExternalServiceError extends AppError { ... }
   ```

### Phase 4: Error Handling Middleware

1. Global error handler for tRPC:
   ```typescript
   const errorHandler = t.middleware(async ({ next }) => {
     try {
       return await next();
     } catch (error) {
       logger.error('Request failed', { error });
       throw mapToTRPCError(error);
     }
   });
   ```

2. Consistent error responses

### Phase 5: Request Context

1. Add request ID to all requests
2. Propagate context through async operations
3. Include in all log entries

### Phase 6: Error Tracking Integration

1. Integrate with error tracking service:
    - **Sentry** (popular, full-featured)
    - **Highlight.io** (open-source friendly)
    - **Self-hosted** (Glitchtip)

2. Capture:
    - Unhandled exceptions
    - Rejected promises
    - Custom error events

### Phase 7: Log Aggregation

1. Configure log shipping:
    - stdout → container logs → aggregator
    - Direct integration (Loki, Elasticsearch)

2. Dashboard for log search and analysis

### Phase 8: Monitoring Alerts

1. Alert on error rate spikes
2. Alert on specific error types
3. Daily error summary

## Log Levels

| Level | Use Case                     |
|-------|------------------------------|
| debug | Development details          |
| info  | Normal operations            |
| warn  | Recoverable issues           |
| error | Failures requiring attention |
| fatal | Application crash            |

## Error Codes

```typescript
const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'E1001',
  AUTH_SESSION_EXPIRED: 'E1002',
  AUTH_INSUFFICIENT_PERMISSIONS: 'E1003',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'E2001',
  VALIDATION_INVALID_FORMAT: 'E2002',

  // Resources
  RESOURCE_NOT_FOUND: 'E3001',
  RESOURCE_CONFLICT: 'E3002',

  // External Services
  EXTERNAL_SERVICE_UNAVAILABLE: 'E4001',
  EXTERNAL_SERVICE_TIMEOUT: 'E4002',
};
```

## Open Questions

1. **Library**: pino, winston, or custom?
2. **Aggregation**: Self-hosted (Loki) or SaaS (Datadog)?
3. **Error Tracking**: Sentry, Highlight, or self-hosted?
4. **Retention**: How long to keep logs?
5. **PII**: What constitutes sensitive data to redact?
6. **Client Logging**: Capture frontend errors too?
7. **Performance**: Log sampling for high-volume routes?
8. **Alerts**: Email, Slack, PagerDuty?
