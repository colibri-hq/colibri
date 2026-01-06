# OAuth Additional Grant Types

## Description

Additional OAuth 2.0/2.1 grant types beyond the core flows, including Client Credentials (already implemented), Refresh
Token (already implemented), and future extensions like Token Exchange (RFC 8693), JWT Bearer (RFC 7523), and SAML 2.0
Bearer (RFC 7522).

## Current Implementation Status

**Implemented:**

- ✅ Client Credentials Grant (`grantTypes/clientCredentialsGrant.ts`)
- ✅ Refresh Token Grant (`grantTypes/refreshTokenGrant.ts`)
- ✅ Configurable refresh token issuance for client credentials

**Not Implemented:**

- ❌ Token Exchange Grant (RFC 8693)
- ❌ JWT Bearer Assertion Grant (RFC 7523)
- ❌ SAML 2.0 Bearer Assertion Grant (RFC 7522)
- ❌ Resource Owner Password Credentials (deprecated in OAuth 2.1)

## Client Credentials Grant

### Current Implementation

```typescript
// Location: grantTypes/clientCredentialsGrant.ts

POST / auth / oauth / token
Content - Type
:
application / x - www - form - urlencoded

grant_type = client_credentials
& client_id = { client_id }
& client_secret = { client_secret }
& scope = { scope }

// Response
{
  "access_token"
:
  "...",
    "token_type"
:
  "Bearer",
    "expires_in"
:
  3600,
    "scope"
:
  "read write"
}
```

### Enhancements Planned

1. **Refresh token support** (configurable):
   ```typescript
   interface ClientCredentialsConfig {
     issueRefreshToken: boolean;  // Default: false (per OAuth 2.1)
     refreshTokenTtl?: number;
   }
   ```

2. **Scope restrictions per client**:
    - Define maximum scopes per client
    - Automatic scope intersection

3. **IP whitelist**:
    - Restrict client credentials to specific IPs
    - Useful for server-to-server auth

## Refresh Token Grant

### Current Implementation

```typescript
// Location: grantTypes/refreshTokenGrant.ts

POST / auth / oauth / token
Content - Type
:
application / x - www - form - urlencoded

grant_type = refresh_token
& refresh_token = { refresh_token }
& scope = { scope }  // Optional, for scope downgrade

// Response
{
  "access_token"
:
  "...",
    "token_type"
:
  "Bearer",
    "expires_in"
:
  3600,
    "refresh_token"
:
  "...",  // New refresh token (rotation)
    "scope"
:
  "read"
}
```

### Features

- ✅ Automatic token rotation
- ✅ Scope downgrading
- ✅ Old refresh token revocation

### Enhancements Planned

1. **Configurable rotation**:
   ```typescript
   interface RefreshTokenConfig {
     rotateOnUse: boolean;      // Default: true
     reuseInterval?: number;    // Grace period for race conditions
     absoluteExpiry?: number;   // Max lifetime regardless of rotation
   }
   ```

2. **Token families**:
    - Track refresh token lineage
    - Detect token theft via replay detection

## Token Exchange Grant (RFC 8693)

### Overview

Token Exchange allows a client to exchange one token for another, enabling:

- Delegation: Service A acts on behalf of user with Service B
- Impersonation: Admin acts as another user
- Token format conversion

### Implementation Plan

1. **Grant type registration**:
   ```typescript
   server.enableGrantType(TokenExchangeGrant, {
     allowImpersonation: false,
     allowDelegation: true,
     allowedActors: ['service-a', 'service-b'],
   });
   ```

2. **Request format**:
   ```typescript
   POST /auth/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=urn:ietf:params:oauth:grant-type:token-exchange
   &subject_token={token}
   &subject_token_type=urn:ietf:params:oauth:token-type:access_token
   &requested_token_type=urn:ietf:params:oauth:token-type:access_token
   &audience={target_service}
   &scope={requested_scopes}
   &actor_token={actor_token}  // Optional, for delegation
   &actor_token_type=urn:ietf:params:oauth:token-type:access_token
   ```

3. **Response**:
   ```typescript
   {
     "access_token": "...",
     "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
     "token_type": "Bearer",
     "expires_in": 3600,
     "scope": "read"
   }
   ```

4. **Token types supported**:
   ```typescript
   const tokenTypes = {
     'urn:ietf:params:oauth:token-type:access_token': validateAccessToken,
     'urn:ietf:params:oauth:token-type:refresh_token': validateRefreshToken,
     'urn:ietf:params:oauth:token-type:id_token': validateIdToken,
     'urn:ietf:params:oauth:token-type:jwt': validateJwt,
   };
   ```

5. **Delegation chain**:
   ```typescript
   // Issued token includes delegation info
   interface DelegatedToken {
     act: {
       sub: string;         // Actor subject
       client_id: string;   // Actor client
       act?: ActorClaim;    // Nested for chained delegation
     };
   }
   ```

### Use Cases

1. **Microservices**: Service mesh token exchange
2. **API Gateway**: Convert external tokens to internal
3. **Impersonation**: Admin support scenarios
4. **Federation**: Exchange external IdP tokens

## JWT Bearer Assertion Grant (RFC 7523)

### Overview

Allows clients to authenticate using a JWT assertion instead of client credentials, useful for:

- Workload identity (Kubernetes, cloud platforms)
- Cross-organization authentication
- Service accounts with asymmetric keys

### Implementation Plan

1. **Grant request**:
   ```typescript
   POST /auth/oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
   &assertion={jwt}
   &scope={scope}
   ```

2. **JWT assertion format**:
   ```typescript
   interface JwtBearerAssertion {
     // Header
     alg: 'RS256' | 'ES256';
     typ: 'JWT';

     // Payload
     iss: string;        // Client ID or trusted issuer
     sub: string;        // Subject (client or user)
     aud: string;        // Token endpoint URL
     exp: number;        // Expiration (short-lived)
     iat: number;        // Issued at
     jti?: string;       // JWT ID (for replay detection)
   }
   ```

3. **Validation**:
    - Verify signature against client's registered JWKS
    - Check audience matches token endpoint
    - Validate expiration (typically < 5 minutes)
    - Check for replay (optional jti tracking)

4. **Configuration**:
   ```typescript
   interface JwtBearerConfig {
     trustedIssuers: string[];
     maxAssertionAge: number;   // Default: 300 seconds
     requireJti: boolean;       // Default: false
     clockSkew: number;         // Default: 30 seconds
   }
   ```

### Use Cases

1. **Kubernetes workloads**: Service account tokens
2. **GCP/AWS**: Cloud platform service accounts
3. **GitHub Actions**: Workload identity federation
4. **Azure AD**: Application authentication

## Custom Grant Type Extension

### Grant Type Interface

```typescript
interface GrantType<TInput, TConfig> {
  // Grant type identifier
  grantType: string;

  // Input validation schema
  schema: ZodSchema<TInput>;

  // Additional validation
  validate?(
    input: TInput,
    context: GrantContext
  ): Promise<void>;

  // Token generation
  handle(
    input: TInput,
    context: GrantContext
  ): Promise<TokenResponse>;

  // Configuration processing
  configure?(config: TConfig): void;
}
```

### Example: Custom Grant

```typescript
const customGrant = defineGrantType({
  grantType: 'urn:example:custom-grant',

  schema: z.object({
    custom_param: z.string(),
  }),

  async validate(input, ctx) {
    // Custom validation logic
    if (!isValid(input.custom_param)) {
      throw new OAuthError('invalid_grant', 'Invalid custom param');
    }
  },

  async handle(input, ctx) {
    const user = await resolveUser(input.custom_param);

    return {
      accessToken: await ctx.issueAccessToken(user),
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  },
});

server.enableGrantType(customGrant, { /* config */ });
```

## Deprecated Grants

### Resource Owner Password Credentials (ROPC)

**Status**: Not implemented, intentionally excluded per OAuth 2.1

**Reason**:

- Exposes user credentials to client
- No support for MFA
- Phishing risk
- Removed from OAuth 2.1 specification

**Migration Path**:

- Use Authorization Code with PKCE instead
- For legacy systems: implement as custom grant with warnings

### Implicit Grant

**Status**: Not implemented, intentionally excluded per OAuth 2.1

**Reason**:

- Access token exposed in URL fragment
- No refresh tokens
- Vulnerable to token leakage
- Removed from OAuth 2.1 specification

**Migration Path**:

- Use Authorization Code with PKCE
- SPAs should use PKCE flow

## Configuration

```typescript
interface GrantTypesConfig {
  // Core grants (always available)
  authorizationCode: AuthorizationCodeConfig;
  refreshToken: RefreshTokenConfig;

  // Optional grants
  clientCredentials?: ClientCredentialsConfig;
  deviceCode?: DeviceCodeConfig;

  // Extension grants
  tokenExchange?: TokenExchangeConfig;
  jwtBearer?: JwtBearerConfig;

  // Custom grants
  custom?: CustomGrantConfig[];
}
```

## Open Questions

1. **Token Exchange Trust**: How to establish trust between services?
2. **Delegation Depth**: Limit delegation chain depth?
3. **JWT Bearer Keys**: Require pre-registered keys or allow discovery?
4. **ROPC Legacy**: Provide as optional extension for migration?
5. **Grant Discovery**: Advertise available grants in metadata?
6. **Audit Trail**: Track token exchange and delegation chains?
7. **Rate Limits**: Different limits per grant type?
8. **Scope Inheritance**: How do scopes flow through delegation?
