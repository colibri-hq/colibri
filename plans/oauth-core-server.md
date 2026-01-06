# OAuth 2.1 Core Server

## Description

A standalone, framework-agnostic OAuth 2.1 authorization server package (`@colibri-hq/oauth`) that can be used in any
ECMA runtime and framework. The server implements the OAuth 2.1 specification with a modular, plug-and-play architecture
allowing individual grant types and extensions to be enabled as needed.

## Current Implementation Status

**Implemented:**

- ✅ Core `AuthorizationServer` class with modular grant type registration
- ✅ Framework-agnostic design using Web API (Request/Response)
- ✅ Full TypeScript with strict mode and Zod validation
- ✅ Custom error hierarchy (`OAuthError`, `OAuthAuthorizationError`)
- ✅ Grant type factory pattern with `defineGrantType()`
- ✅ Authorization endpoint handling
- ✅ Token endpoint handling
- ✅ Server metadata publication (RFC 8414)
- ✅ Issuer identification (RFC 9207)
- ✅ Configurable token TTLs
- ✅ Client authentication (basic and post methods)
- ✅ Scope validation and management

**Partial Implementation:**

- ⚠️ JWKS endpoint (structure exists, but limited key management)
- ⚠️ Response modes (only `query` and `fragment`, no `form_post`)

**Not Implemented:**

- ❌ Asymmetric key management (JWKS rotation)
- ❌ Rate limiting (except device flow polling)
- ❌ Request object signing (RFC 9101)
- ❌ DPoP support (RFC 9449)
- ❌ Mutual TLS (RFC 8705)

## Architecture

```
packages/oauth/
├── src/
│   ├── server.ts              # Main AuthorizationServer class
│   ├── types.ts               # OAuth entities and type definitions
│   ├── errors.ts              # OAuthError, OAuthAuthorizationError
│   ├── utilities.ts           # Request/response helpers
│   ├── client.ts              # OAuth client (stub)
│   ├── grantTypes/            # Grant type implementations
│   │   ├── authorizationCodeGrant.ts
│   │   ├── clientCredentialsGrant.ts
│   │   ├── refreshTokenGrant.ts
│   │   └── deviceCodeGrant.ts
│   └── server/                # Protocol handlers
│       ├── token.ts           # Token endpoint
│       ├── introspection.ts   # Token introspection
│       ├── revocation.ts      # Token revocation
│       ├── metadata.ts        # Server metadata
│       └── assert.ts          # Assertion utilities
└── tests/                     # Unit and integration tests
```

## Implementation Plan

### Phase 1: Core Improvements

1. Add configurable response modes:
    - `query` (implemented)
    - `fragment` (implemented)
    - `form_post` (RFC 9207)

2. Improve error handling:
    - Structured error logging
    - Error event hooks for monitoring
    - Custom error message localization

### Phase 2: Key Management

1. JWKS endpoint improvements:
    - Asymmetric key pair generation
    - Key rotation support
    - Multiple key algorithms (RS256, ES256, PS256)
    - Key ID (kid) management

2. Key storage abstraction:
   ```typescript
   interface KeyStore {
     getSigningKey(algorithm: string): Promise<CryptoKey>;
     getVerificationKeys(): Promise<JWK[]>;
     rotateKeys(): Promise<void>;
   }
   ```

### Phase 3: Security Enhancements

1. Rate limiting framework:
   ```typescript
   interface RateLimiter {
     check(key: string, limit: number, window: number): Promise<boolean>;
     reset(key: string): Promise<void>;
   }
   ```

2. DPoP support (RFC 9449):
    - Proof-of-Possession token binding
    - DPoP header validation
    - Access token binding to client key

3. Mutual TLS (RFC 8705):
    - Certificate-bound access tokens
    - Client certificate validation

### Phase 4: Extensibility

1. Event system for hooks:
   ```typescript
   server.on('token:issued', (token, client, user) => {});
   server.on('token:revoked', (token) => {});
   server.on('authorization:granted', (code, client, user) => {});
   server.on('error', (error, request) => {});
   ```

2. Middleware pipeline:
   ```typescript
   server.use(async (ctx, next) => {
     // Pre-processing
     await next();
     // Post-processing
   });
   ```

3. Custom claim providers:
   ```typescript
   server.registerClaimProvider('custom', async (user, scopes) => ({
     custom_claim: 'value'
   }));
   ```

### Phase 5: Production Hardening

1. Comprehensive input validation
2. Security headers enforcement
3. Audit logging
4. Metrics collection interface
5. Health check endpoint

## Configuration Schema

```typescript
interface AuthorizationServerConfig {
  issuer: string;

  // Token configuration
  tokens: {
    accessTokenTtl: number;
    refreshTokenTtl: number;
    authorizationCodeTtl: number;
    deviceCodeTtl: number;
    useJwtAccessTokens: boolean;
  };

  // Security
  security: {
    requirePkce: boolean;
    allowedCodeChallengeMethods: ('S256' | 'plain')[];
    tokenEndpointAuthMethods: ('client_secret_basic' | 'client_secret_post' | 'private_key_jwt')[];
  };

  // Features
  features: {
    introspection: boolean;
    revocation: boolean;
    deviceFlow: boolean;
    par: boolean;
    dynamicClientRegistration: boolean;
  };

  // Persistence
  persistence: PersistenceLayer;

  // Optional
  rateLimiter?: RateLimiter;
  keyStore?: KeyStore;
  logger?: Logger;
}
```

## Open Questions

1. **Key Storage**: File-based, database, or HSM integration for production keys?
2. **Token Format**: Should JWT access tokens be opt-in or default?
3. **Backwards Compatibility**: How to handle breaking changes in the API?
4. **Versioning**: Semantic versioning strategy for the package?
5. **Runtime Support**: Which runtimes to officially support (Node, Deno, Bun, Cloudflare Workers)?
6. **Dependencies**: Minimize external dependencies or use well-tested libraries?
7. **Compliance Testing**: Integrate with OAuth conformance test suite?
8. **Namespace**: Keep `@colibri-hq/oauth` or publish as standalone package?
