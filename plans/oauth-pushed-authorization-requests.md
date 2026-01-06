# OAuth Pushed Authorization Requests (PAR)

## Description

Pushed Authorization Requests (RFC 9126) allow OAuth clients to push authorization request parameters directly to the
authorization server before redirecting the user. This provides enhanced security by keeping request parameters
confidential and enables complex requests that might exceed URL length limits.

## Current Implementation Status

**Implemented:**

- ✅ PAR endpoint (`/auth/oauth/par`)
- ✅ Request URI generation
- ✅ Request URI consumption in authorization endpoint
- ✅ Request expiration
- ✅ Client authentication at PAR endpoint
- ✅ PKCE parameter forwarding

**Routes Implemented:**

- ✅ `POST /auth/oauth/par` - Push authorization request

**Partial Implementation:**

- ⚠️ Request URI format (simple, could be more robust)
- ⚠️ Error responses (basic implementation)

**Not Implemented:**

- ❌ Request object encryption
- ❌ Request object signing (RFC 9101)
- ❌ Require PAR mode (optional enforcement)
- ❌ Request URI caching optimization

## Flow Diagram

```
┌──────────┐                              ┌──────────────┐
│  Client  │                              │    Server    │
└────┬─────┘                              └──────┬───────┘
     │                                           │
     │ 1. Push Authorization Request             │
     │    (client_id, redirect_uri, scope,       │
     │     code_challenge, state, etc.)          │
     │ ─────────────────────────────────────────>│
     │                                           │
     │ 2. PAR Response                           │
     │    (request_uri, expires_in)              │
     │ <─────────────────────────────────────────│
     │                                           │
     │ 3. Redirect User with request_uri         │
     │    /authorize?client_id=X&request_uri=Y   │
     │ ─────────────────────────────────────────>│
     │                                           │
     │           [Standard OAuth flow continues] │
     │                                           │
```

## Implementation Plan

### Phase 1: Enhanced Request Validation

1. Comprehensive parameter validation:
   ```typescript
   const parRequestSchema = z.object({
     // Required
     client_id: z.string(),
     redirect_uri: z.string().url(),
     response_type: z.literal('code'),

     // PKCE (required for public clients)
     code_challenge: z.string().min(43).max(128),
     code_challenge_method: z.enum(['S256', 'plain']).default('S256'),

     // Recommended
     state: z.string().optional(),
     scope: z.string().optional(),

     // OpenID Connect
     nonce: z.string().optional(),
     prompt: z.enum(['none', 'login', 'consent', 'select_account']).optional(),
     max_age: z.number().optional(),
     ui_locales: z.string().optional(),
     acr_values: z.string().optional(),
     claims: z.string().optional(),  // JSON

     // PAR-specific
     request: z.string().optional(),  // JWT request object
   });
   ```

2. Pre-flight validation:
    - Validate all parameters before storing
    - Return errors immediately (not at authorization)
    - Prevents user confusion from invalid requests

### Phase 2: Request Object Support (RFC 9101)

1. Signed request objects:
   ```typescript
   // Client sends signed JWT
   POST /auth/oauth/par
   request={signed_jwt}

   // JWT payload contains authorization parameters
   {
     "iss": "client_id",
     "aud": "https://auth.example.com",
     "response_type": "code",
     "client_id": "s6BhdRkqt3",
     "redirect_uri": "https://client.example.org/callback",
     "scope": "openid profile",
     "state": "af0ifjsldkj",
     "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
     "code_challenge_method": "S256"
   }
   ```

2. Request object validation:
   ```typescript
   interface RequestObjectConfig {
     requireSignedRequests: boolean;
     allowedSigningAlgs: ('RS256' | 'ES256' | 'PS256')[];
     requireEncryption: boolean;
     allowedEncryptionAlgs: string[];
   }
   ```

3. Encrypted request objects:
    - Nested JWT (signed then encrypted)
    - Key management via JWKS

### Phase 3: Request URI Management

1. Improved request URI format:
   ```typescript
   // Current: Simple random string
   urn:ietf:params:oauth:request_uri:abc123

   // Enhanced: Include metadata
   urn:ietf:params:oauth:request_uri:{issuer_hash}:{random}:{checksum}
   ```

2. Request URI caching:
   ```typescript
   interface StoredAuthorizationRequest {
     identifier: string;
     clientId: string;
     parameters: AuthorizationParameters;
     createdAt: Date;
     expiresAt: Date;
     usedAt?: Date;
     requestObjectHash?: string;
   }
   ```

3. Configurable expiration:
   ```typescript
   interface ParConfig {
     requestUriTtl: number;      // Default: 60 seconds
     allowReuse: boolean;        // Default: false (one-time use)
   }
   ```

### Phase 4: Require PAR Mode

1. Per-client PAR requirement:
   ```typescript
   interface OAuthClient {
     // ...
     require_pushed_authorization_requests: boolean;
   }
   ```

2. Server-wide PAR enforcement:
   ```typescript
   interface ParConfig {
     requirePar: boolean;        // Default: false
     requireParForPublicClients: boolean;  // Default: false
   }
   ```

3. Error handling for non-PAR requests:
   ```typescript
   // When PAR required but client uses direct authorization
   {
     "error": "invalid_request",
     "error_description": "Pushed Authorization Request required"
   }
   ```

### Phase 5: Security Enhancements

1. Request binding:
    - Bind request URI to client certificate (mTLS)
    - Bind to DPoP proof

2. Request object integrity:
    - Hash verification on consumption
    - Signature timestamp validation

3. Replay prevention:
    - One-time request URI usage
    - Unique request object `jti` claim

### Phase 6: Performance Optimization

1. Request caching:
    - In-memory cache for active requests
    - Database for persistence
    - Cleanup job for expired requests

2. Request compression:
    - Compress large request objects
    - Efficient storage

## Database Schema

```sql
-- Authorization requests (PAR)
CREATE TABLE oauth_authorization_request (
  identifier VARCHAR(128) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,

  -- Request parameters
  redirect_uri TEXT NOT NULL,
  response_type VARCHAR(20) NOT NULL,
  scope TEXT,
  state VARCHAR(255),
  nonce VARCHAR(255),

  -- PKCE
  code_challenge VARCHAR(128) NOT NULL,
  code_challenge_method VARCHAR(10) NOT NULL,

  -- OpenID Connect
  prompt VARCHAR(50),
  max_age INTEGER,
  ui_locales VARCHAR(100),
  acr_values TEXT,
  claims JSONB,

  -- Request object
  request_object TEXT,
  request_object_hash VARCHAR(64),

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- Binding
  client_cert_thumbprint VARCHAR(64),
  dpop_jkt VARCHAR(64),

  FOREIGN KEY (client_id) REFERENCES oauth_client(id)
);

CREATE INDEX idx_par_expires ON oauth_authorization_request(expires_at);
CREATE INDEX idx_par_client ON oauth_authorization_request(client_id);
```

## Configuration

```typescript
interface PushedAuthorizationRequestsConfig {
  // Enable/disable
  enabled: boolean;                     // Default: true

  // Request URI
  requestUriTtl: number;               // Default: 60 seconds
  requestUriPrefix: string;            // Default: 'urn:ietf:params:oauth:request_uri:'
  allowRequestUriReuse: boolean;       // Default: false

  // Enforcement
  requirePar: boolean;                  // Default: false
  requireParForPublicClients: boolean;  // Default: false

  // Request objects
  supportRequestObject: boolean;        // Default: true
  requireSignedRequestObject: boolean;  // Default: false
  allowedRequestObjectAlgs: string[];   // Default: ['RS256', 'ES256']
  requireEncryptedRequestObject: boolean;  // Default: false
  allowedRequestObjectEncAlgs: string[];

  // Security
  requireClientAuthentication: boolean; // Default: true
  bindToClientCert: boolean;           // Default: false
  bindToDPoP: boolean;                 // Default: false
}
```

## Benefits of PAR

1. **Security**:
    - Request parameters not exposed in URL/browser history
    - Pre-validation prevents user-facing errors
    - Enables request object signing/encryption

2. **Privacy**:
    - Sensitive parameters (claims, scopes) hidden from user agent
    - Request URI doesn't leak information

3. **Reliability**:
    - No URL length limits
    - Complex requests supported
    - Rich error responses at PAR time

4. **Compliance**:
    - Required for some high-security profiles (FAPI)
    - Recommended for financial-grade APIs

## Open Questions

1. **Request URI Format**: Human-readable or opaque?
2. **Storage Backend**: Database, Redis, or both?
3. **Request Object Keys**: Per-client or shared JWKS?
4. **Cleanup Strategy**: TTL-based or scheduled job?
5. **Rate Limiting**: Separate limits for PAR endpoint?
6. **Monitoring**: Metrics for PAR usage and failures?
7. **FAPI Compliance**: Full FAPI 2.0 profile support?
8. **Request Forwarding**: Support forwarding to upstream IdP?
