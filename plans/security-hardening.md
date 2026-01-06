# Security Hardening

## Description

Comprehensive security measures including CSRF protection, input validation, rate limiting on API endpoints, audit
logging, and security headers. Currently security is partial with WebAuthn implemented but missing many standard
protections.

## Current Implementation Status

**Implemented:**

- ✅ WebAuthn/Passkey authentication
- ✅ OAuth 2.0 with PKCE
- ✅ Row Level Security (RLS) on database tables
- ✅ Rate limiting for metadata providers

**Not Implemented:**

- ❌ No CSRF token protection
- ❌ No API rate limiting
- ❌ No input validation framework
- ❌ No security headers configuration
- ❌ No audit logging
- ❌ No brute force protection
- ❌ No secrets management

## Implementation Plan

### Phase 1: Input Validation Framework

1. Create validation schemas with Zod:
   ```typescript
   // packages/shared/src/validation/schemas.ts
   export const workSchema = z.object({
     title: z.string().min(1).max(500),
     isbn: z.string().regex(/^\d{10}|\d{13}$/).optional(),
     // ...
   });

   export const userSchema = z.object({
     email: z.string().email(),
     name: z.string().min(1).max(100),
     // ...
   });
   ```

2. Apply to all tRPC procedures
3. Sanitize HTML inputs

### Phase 2: CSRF Protection

1. Implement CSRF tokens for state-changing operations:
   ```typescript
   // Generate token
   const csrfToken = generateCsrfToken(sessionId);

   // Validate on mutation
   if (!validateCsrfToken(request.headers['x-csrf-token'], sessionId)) {
     throw new ForbiddenError('Invalid CSRF token');
   }
   ```

2. Include token in forms and AJAX requests
3. SameSite cookie configuration

### Phase 3: API Rate Limiting

1. Implement rate limiter middleware:
   ```typescript
   const rateLimiter = createRateLimiter({
     windowMs: 60 * 1000,  // 1 minute
     max: 100,              // requests per window
     keyGenerator: (req) => req.user?.id || req.ip,
   });
   ```

2. Different limits per endpoint:
   | Endpoint | Limit |
   |----------|-------|
   | Auth | 10/min |
   | Search | 30/min |
   | CRUD | 60/min |
   | Read | 200/min |

### Phase 4: Security Headers

1. Configure security headers:
   ```typescript
   // SvelteKit hooks
   const securityHeaders = {
     'Content-Security-Policy': "default-src 'self'; script-src 'self'",
     'X-Content-Type-Options': 'nosniff',
     'X-Frame-Options': 'DENY',
     'X-XSS-Protection': '1; mode=block',
     'Referrer-Policy': 'strict-origin-when-cross-origin',
     'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
     'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
   };
   ```

### Phase 5: Audit Logging

1. Create audit log table:
   ```sql
   CREATE TABLE audit_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES authentication.user(id),
     action VARCHAR(50) NOT NULL,
     entity_type VARCHAR(50),
     entity_id UUID,
     old_value JSONB,
     new_value JSONB,
     ip_address INET,
     user_agent TEXT,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Log sensitive operations:
    - User authentication events
    - Permission changes
    - Data modifications
    - Admin actions

### Phase 6: Brute Force Protection

1. Account lockout after failed attempts:
   ```sql
   ALTER TABLE authentication.user ADD COLUMN
     failed_login_attempts INTEGER DEFAULT 0,
     locked_until TIMESTAMPTZ;
   ```

2. Progressive delays
3. CAPTCHA after threshold

### Phase 7: Secrets Management

1. Validate required environment variables
2. Use Supabase Vault for sensitive data
3. Rotate secrets periodically
4. Document secrets inventory

### Phase 8: Dependency Security

1. Enable Dependabot alerts
2. Regular dependency audits
3. Lock file integrity checks

## Security Checklist

| Category  | Item                   | Status       |
|-----------|------------------------|--------------|
| Auth      | Passkeys               | ✅            |
| Auth      | OAuth PKCE             | ✅            |
| Auth      | Session management     | Partial      |
| Input     | Validation             | ❌            |
| Input     | Sanitization           | ❌            |
| Transport | HTTPS only             | ✅            |
| Headers   | CSP                    | ❌            |
| Headers   | HSTS                   | ❌            |
| API       | Rate limiting          | ❌            |
| API       | CSRF                   | ❌            |
| Data      | Encryption at rest     | ✅ (Supabase) |
| Audit     | Logging                | ❌            |
| Deps      | Vulnerability scanning | ❌            |

## Open Questions

1. **CSP**: Strict CSP vs. allowing inline scripts for SvelteKit?
2. **Rate Limiting**: Redis-based or in-memory?
3. **CAPTCHA**: hCaptcha, reCAPTCHA, or Turnstile?
4. **Audit Retention**: How long to keep audit logs?
5. **Secrets Rotation**: Automatic or manual?
6. **Penetration Testing**: Schedule regular pen tests?
7. **Bug Bounty**: Establish a bug bounty program?
8. **Compliance**: GDPR, SOC2, or other compliance needs?
