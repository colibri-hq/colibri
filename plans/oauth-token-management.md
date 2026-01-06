# OAuth Token Management

## Description

Comprehensive token lifecycle management including token introspection (RFC 7662) for validating tokens, token
revocation (RFC 7009) for invalidating tokens, and JWT access token support for stateless validation. This covers the
full token lifecycle from issuance through expiration or revocation.

## Current Implementation Status

**Token Introspection (RFC 7662):**

- ✅ Introspection endpoint (`/auth/oauth/tokeninfo`)
- ✅ Active/inactive status reporting
- ✅ Token metadata (client_id, username, token_type, exp, iat, sub, aud, iss)
- ✅ Scope information
- ✅ Token type hint support
- ✅ Client authentication via Bearer token or client credentials
- ✅ Returns `{"active": false}` for invalid tokens (prevents info leakage)

**Token Revocation (RFC 7009):**

- ✅ Revocation endpoint (`/auth/oauth/token/revoke`)
- ✅ Access token revocation
- ✅ Refresh token revocation
- ✅ Token type hint parameter
- ✅ Cascading revocation (refresh → access tokens)
- ✅ Returns 200 OK regardless of token validity
- ✅ Client authentication required

**Partial Implementation:**

- ⚠️ Introspection endpoint is dev-only in production
- ⚠️ Token type hint not fully utilized

**Not Implemented:**

- ❌ JWT access tokens (using opaque tokens)
- ❌ Token binding (DPoP, mTLS)
- ❌ Token exchange (RFC 8693)
- ❌ Batch revocation
- ❌ Token activity logging
- ❌ Token analytics

## Token Types

### Current: Opaque Bearer Tokens

```
Access Token:  col_at_7f3d8a2b1c4e5f6g7h8i9j0k
Refresh Token: col_rt_9k8j7h6g5f4e3d2c1b0a
```

**Pros:**

- Simple implementation
- Token doesn't contain sensitive data
- Can be revoked instantly

**Cons:**

- Requires database lookup for every validation
- Higher latency for resource servers
- Single point of failure (auth server)

### Planned: JWT Access Tokens

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0yMDI0In0.
eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c2VyLTEyMyIs
ImF1ZCI6ImNsaWVudC00NTYiLCJleHAiOjE3MDk0ODMyMDAsImlhdCI6MTcwOTQ3OTYw
MCwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSIsImp0aSI6InRva2VuLTc4OSJ9.
signature
```

**Pros:**

- Stateless validation (no DB lookup)
- Resource servers can validate locally
- Reduced load on auth server

**Cons:**

- Larger token size
- Cannot be instantly revoked
- Contains claims (potential privacy concern)

## Implementation Plan

### Phase 1: JWT Access Tokens

1. JWT structure:
   ```typescript
   interface JwtAccessToken {
     // Header
     alg: 'RS256' | 'ES256';
     typ: 'at+jwt';  // RFC 9068
     kid: string;

     // Payload
     iss: string;        // Issuer
     sub: string;        // Subject (user ID)
     aud: string | string[];  // Audience (resource server)
     exp: number;        // Expiration
     iat: number;        // Issued at
     nbf?: number;       // Not before
     jti: string;        // Token ID (for revocation)
     client_id: string;  // Client that requested token
     scope: string;      // Space-separated scopes
     auth_time?: number; // Authentication time
   }
   ```

2. Configuration toggle:
   ```typescript
   interface TokenConfig {
     useJwtAccessTokens: boolean;  // Default: false
     jwtSigningAlgorithm: 'RS256' | 'ES256' | 'HS256';
     includeUserClaims: boolean;   // Include profile claims in JWT
   }
   ```

3. Hybrid approach:
    - Issue JWT access tokens when configured
    - Keep opaque refresh tokens (always require DB)
    - Store JWT ID (jti) for revocation checking

### Phase 2: Enhanced Introspection

1. Production-ready introspection:
    - Remove dev-only restriction
    - Add proper authorization (require specific scope or client)
    - Rate limiting

2. Additional response fields:
   ```typescript
   interface IntrospectionResponse {
     active: boolean;

     // Standard claims
     scope?: string;
     client_id?: string;
     username?: string;
     token_type?: string;
     exp?: number;
     iat?: number;
     nbf?: number;
     sub?: string;
     aud?: string;
     iss?: string;
     jti?: string;

     // Extensions
     token_introspection?: {
       auth_time?: number;
       acr?: string;
       amr?: string[];
     };
   }
   ```

3. Configurable claim exposure:
   ```typescript
   interface IntrospectionConfig {
     exposeUserClaims: boolean;
     exposedClaims: string[];
     requireClientAuth: boolean;
     allowedClients: string[];  // Empty = all clients
   }
   ```

### Phase 3: Token Binding

1. DPoP (Demonstration of Proof-of-Possession) support:
   ```typescript
   // Client generates key pair and sends DPoP proof
   POST /auth/oauth/token
   DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...

   // Access token is bound to the public key
   // Resource requests must include DPoP proof
   ```

2. DPoP validation:
   ```typescript
   interface DPoPProof {
     typ: 'dpop+jwt';
     alg: 'ES256' | 'RS256';
     jwk: JsonWebKey;  // Public key
     jti: string;      // Unique identifier
     htm: string;      // HTTP method
     htu: string;      // HTTP URI
     iat: number;      // Issued at
     ath?: string;     // Access token hash (for resource requests)
   }
   ```

3. Token response with DPoP:
   ```typescript
   {
     "access_token": "...",
     "token_type": "DPoP",  // Not "Bearer"
     "expires_in": 3600
   }
   ```

### Phase 4: Token Exchange (RFC 8693)

1. Token exchange endpoint:
   ```typescript
   POST /auth/oauth/token
   grant_type=urn:ietf:params:oauth:grant-type:token-exchange
   &subject_token={token}
   &subject_token_type=urn:ietf:params:oauth:token-type:access_token
   &requested_token_type=urn:ietf:params:oauth:token-type:access_token
   &audience={target_service}
   &scope={scope}
   ```

2. Use cases:
    - Delegation: Service A requests token to call Service B on behalf of user
    - Impersonation: Admin requests token as another user
    - Token type conversion: Exchange refresh token for access token

3. Token types:
   ```typescript
   const tokenTypes = {
     'urn:ietf:params:oauth:token-type:access_token': 'access_token',
     'urn:ietf:params:oauth:token-type:refresh_token': 'refresh_token',
     'urn:ietf:params:oauth:token-type:id_token': 'id_token',
     'urn:ietf:params:oauth:token-type:saml1': 'saml1',
     'urn:ietf:params:oauth:token-type:saml2': 'saml2',
     'urn:ietf:params:oauth:token-type:jwt': 'jwt',
   };
   ```

### Phase 5: Batch Operations

1. Batch revocation:
   ```typescript
   POST /auth/oauth/token/revoke-batch
   {
     "tokens": ["token1", "token2", "token3"],
     "token_type_hint": "access_token"
   }

   // Or revoke all tokens for a user/client
   POST /auth/oauth/token/revoke-all
   {
     "user_id": "user-123",      // Optional
     "client_id": "client-456"   // Optional
   }
   ```

2. User-initiated revocation:
    - "Sign out everywhere" functionality
    - Revoke all tokens for current user

### Phase 6: Token Analytics

1. Token activity tracking:
   ```typescript
   interface TokenActivity {
     tokenId: string;
     clientId: string;
     userId?: string;
     action: 'issued' | 'refreshed' | 'introspected' | 'revoked' | 'expired';
     timestamp: Date;
     metadata: {
       ip?: string;
       userAgent?: string;
       resourceServer?: string;
     };
   }
   ```

2. Analytics dashboard:
    - Token issuance rate
    - Active tokens by client
    - Revocation patterns
    - Token lifetime distribution

3. Anomaly detection:
    - Unusual token refresh patterns
    - Geographic anomalies
    - Concurrent usage detection

## Database Schema

```sql
-- Enhanced access tokens
CREATE TABLE oauth_access_token (
  token VARCHAR(255) PRIMARY KEY,  -- Or JWT ID (jti) for JWTs
  token_type VARCHAR(20) DEFAULT 'Bearer',  -- Bearer, DPoP
  client_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  scopes TEXT[],

  -- JWT specific
  is_jwt BOOLEAN DEFAULT false,
  jwt_id VARCHAR(64),

  -- DPoP binding
  dpop_jwk_thumbprint VARCHAR(64),

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  issued_from_ip INET,
  issued_user_agent TEXT,

  FOREIGN KEY (client_id) REFERENCES oauth_client(id),
  FOREIGN KEY (user_id) REFERENCES authentication.user(id)
);

-- Token activity log
CREATE TABLE oauth_token_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id VARCHAR(255),
  token_type VARCHAR(20),
  client_id VARCHAR(255),
  user_id VARCHAR(255),
  action VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  resource_server VARCHAR(255),
  details JSONB
);

-- Revoked JWT IDs (for JWT blacklist)
CREATE TABLE oauth_revoked_jwt (
  jti VARCHAR(64) PRIMARY KEY,
  revoked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL  -- Can be cleaned up after expiry
);

CREATE INDEX idx_revoked_jwt_expires ON oauth_revoked_jwt(expires_at);
```

## Configuration

```typescript
interface TokenManagementConfig {
  // Token format
  accessTokenFormat: 'opaque' | 'jwt';
  accessTokenTtl: number;           // Default: 3600
  refreshTokenTtl: number;          // Default: 604800

  // JWT settings
  jwt: {
    signingAlgorithm: 'RS256' | 'ES256' | 'HS256';
    includeUserClaims: boolean;
    audience: string | string[];
  };

  // Introspection
  introspection: {
    enabled: boolean;
    requireAuth: boolean;
    allowedClients: string[];
    exposedClaims: string[];
  };

  // Revocation
  revocation: {
    enabled: boolean;
    cascadeRefreshToken: boolean;  // Revoke access tokens when refresh is revoked
    allowBatchRevocation: boolean;
  };

  // Token binding
  dpop: {
    enabled: boolean;
    required: boolean;
    allowedAlgorithms: string[];
  };

  // Token exchange
  tokenExchange: {
    enabled: boolean;
    allowedActors: string[];
    allowImpersonation: boolean;
  };

  // Analytics
  analytics: {
    enabled: boolean;
    retentionDays: number;
    trackIntrospection: boolean;
  };
}
```

## Open Questions

1. **JWT Default**: Should JWT access tokens be the default?
2. **Revocation Strategy**: Short TTL + refresh vs long TTL + revocation list?
3. **DPoP Requirement**: Make DPoP mandatory for certain clients?
4. **Token Size**: Concerns about JWT size in headers?
5. **Clock Skew**: How much clock skew tolerance for JWT validation?
6. **Refresh Rotation**: Always rotate refresh tokens or make configurable?
7. **Analytics Privacy**: What token activity data to collect vs privacy?
8. **Token Exchange Trust**: How to establish trust for token exchange?
