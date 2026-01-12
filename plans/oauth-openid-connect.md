> **GitHub Issue:** [#170](https://github.com/colibri-hq/colibri/issues/170)

# OpenID Connect 1.0 Support

## Description

OpenID Connect (OIDC) is an identity layer built on top of OAuth 2.0 that provides user authentication and identity
information. It extends OAuth with ID tokens (JWTs containing user claims), a UserInfo endpoint, and standardized claim
semantics. Full OIDC compliance enables Colibri to serve as a single sign-on (SSO) provider.

## Current Implementation Status

**Implemented:**

- ✅ ID token generation with standard claims
- ✅ UserInfo endpoint (`/auth/oauth/userinfo`)
- ✅ `openid` scope support
- ✅ Standard claims: sub, name, email, email_verified, birthdate, updated_at
- ✅ Custom namespace claims (role)
- ✅ Both GET and POST methods for UserInfo
- ✅ JSON and JWT response formats for UserInfo
- ✅ Content negotiation via Accept header
- ✅ Bearer token authentication

**Partial Implementation:**

- ⚠️ Discovery document (missing some OIDC-specific metadata)
- ⚠️ Nonce validation (structure exists, needs verification)
- ⚠️ ID token signing (HS256 only, no asymmetric keys)

**Not Implemented:**

- ❌ Full OIDC Discovery (`.well-known/openid-configuration`)
- ❌ JWKS endpoint for ID token verification
- ❌ `profile`, `address`, `phone` scope claims
- ❌ Aggregated and distributed claims
- ❌ Claim localization
- ❌ `acr` and `amr` claims
- ❌ `auth_time` claim
- ❌ Session management
- ❌ Front-channel logout
- ❌ Back-channel logout
- ❌ RP-Initiated logout

## Implementation Plan

### Phase 1: OIDC Discovery

1. Create `.well-known/openid-configuration` endpoint:

   ```typescript
   {
     "issuer": "https://auth.example.com",
     "authorization_endpoint": "https://auth.example.com/auth/oauth/authorize",
     "token_endpoint": "https://auth.example.com/auth/oauth/token",
     "userinfo_endpoint": "https://auth.example.com/auth/oauth/userinfo",
     "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
     "registration_endpoint": "https://auth.example.com/auth/oauth/register",
     "end_session_endpoint": "https://auth.example.com/auth/oauth/logout",

     "scopes_supported": ["openid", "profile", "email", "address", "phone", "offline_access"],
     "response_types_supported": ["code"],
     "response_modes_supported": ["query", "fragment", "form_post"],
     "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
     "subject_types_supported": ["public"],

     "id_token_signing_alg_values_supported": ["RS256", "HS256"],
     "userinfo_signing_alg_values_supported": ["RS256", "HS256", "none"],
     "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],

     "claims_supported": [
       "sub", "name", "given_name", "family_name", "middle_name", "nickname",
       "preferred_username", "profile", "picture", "website", "email",
       "email_verified", "gender", "birthdate", "zoneinfo", "locale",
       "phone_number", "phone_number_verified", "address", "updated_at"
     ],

     "claim_types_supported": ["normal"],
     "claims_parameter_supported": true,
     "request_parameter_supported": false,
     "request_uri_parameter_supported": true
   }
   ```

2. Merge with OAuth metadata or serve separately

### Phase 2: Complete Claims Support

1. Standard OIDC scopes and claims:

   ```typescript
   const scopeClaims = {
     openid: ['sub'],
     profile: [
       'name',
       'family_name',
       'given_name',
       'middle_name',
       'nickname',
       'preferred_username',
       'profile',
       'picture',
       'website',
       'gender',
       'birthdate',
       'zoneinfo',
       'locale',
       'updated_at',
     ],
     email: ['email', 'email_verified'],
     address: ['address'],
     phone: ['phone_number', 'phone_number_verified'],
   };
   ```

2. Address claim structure:

   ```typescript
   interface AddressClaim {
     formatted?: string;
     street_address?: string;
     locality?: string;
     region?: string;
     postal_code?: string;
     country?: string;
   }
   ```

3. User profile extensions in database:
   ```sql
   ALTER TABLE authentication.user ADD COLUMN
     given_name VARCHAR(100),
     family_name VARCHAR(100),
     middle_name VARCHAR(100),
     nickname VARCHAR(100),
     preferred_username VARCHAR(100),
     profile_url TEXT,
     picture_url TEXT,
     website TEXT,
     gender VARCHAR(20),
     zoneinfo VARCHAR(50),
     locale VARCHAR(10),
     phone_number VARCHAR(50),
     phone_number_verified BOOLEAN DEFAULT false,
     address JSONB;
   ```

### Phase 3: ID Token Enhancements

1. Asymmetric signing (RS256):

   ```typescript
   interface IdToken {
     // Required
     iss: string; // Issuer
     sub: string; // Subject (user ID)
     aud: string; // Audience (client ID)
     exp: number; // Expiration
     iat: number; // Issued at

     // Recommended
     auth_time?: number; // Time of authentication
     nonce?: string; // Replay attack prevention
     acr?: string; // Authentication Context Class
     amr?: string[]; // Authentication Methods

     // Optional standard claims
     name?: string;
     email?: string;
     // ... other claims based on scopes
   }
   ```

2. `auth_time` tracking:
   - Record authentication timestamp in session
   - Include in ID token when requested

3. ACR/AMR support:

   ```typescript
   const authenticationMethods = {
     pwd: 'Password',
     hwk: 'Hardware key (Passkey)',
     otp: 'One-time password',
     mfa: 'Multi-factor authentication',
   };

   const authenticationContextClasses = {
     'urn:colibri:acr:passkey': 'Passkey authentication',
     'urn:colibri:acr:password': 'Password authentication',
     'urn:colibri:acr:mfa': 'Multi-factor authentication',
   };
   ```

### Phase 4: JWKS Endpoint

1. Create JWKS endpoint:

   ```typescript
   GET /.well-known/jwks.json

   {
     "keys": [
       {
         "kty": "RSA",
         "use": "sig",
         "kid": "key-2024-01",
         "alg": "RS256",
         "n": "...",
         "e": "AQAB"
       }
     ]
   }
   ```

2. Key rotation strategy:
   - Generate new key pair periodically
   - Keep old keys for token verification (grace period)
   - Automatic key ID assignment
   - Secure private key storage

### Phase 5: Session Management

1. Session state tracking:

   ```typescript
   interface OidcSession {
     sessionId: string;
     userId: string;
     clientIds: string[]; // Clients with active sessions
     authTime: Date;
     lastActivity: Date;
   }
   ```

2. Check session iframe:

   ```typescript
   GET / auth / oauth / checksession;

   // Returns HTML page with postMessage-based session checking
   ```

3. Session state parameter in authorization response

### Phase 6: Logout

1. RP-Initiated Logout (End Session Endpoint):

   ```typescript
   GET /auth/oauth/logout
   ?id_token_hint={id_token}
   &post_logout_redirect_uri={uri}
   &state={state}
   &client_id={client_id}  // Required if no id_token_hint

   // Terminates session and redirects
   ```

2. Front-channel logout:

   ```typescript
   // Register frontchannel_logout_uri in client metadata
   // Server renders iframes to all registered URIs

   <iframe src="{frontchannel_logout_uri}?sid={session_id}&iss={issuer}">
   ```

3. Back-channel logout:

   ```typescript
   // Register backchannel_logout_uri in client metadata
   // Server POSTs logout token to all registered URIs

   POST {backchannel_logout_uri}
   Content-Type: application/x-www-form-urlencoded

   logout_token={jwt}
   ```

4. Logout token structure:
   ```typescript
   interface LogoutToken {
     iss: string;
     sub?: string;
     aud: string;
     iat: number;
     jti: string;
     events: {
       'http://schemas.openid.net/event/backchannel-logout': {};
     };
     sid?: string;
   }
   ```

### Phase 7: Claims Request Parameter

1. Support `claims` parameter in authorization:

   ```typescript
   {
     "userinfo": {
       "given_name": { "essential": true },
       "nickname": null,
       "email": { "essential": true },
       "picture": null
     },
     "id_token": {
       "auth_time": { "essential": true },
       "acr": { "values": ["urn:colibri:acr:passkey"] }
     }
   }
   ```

2. Essential vs voluntary claims handling

## Configuration

```typescript
interface OpenIdConnectConfig {
  // Basic
  enabled: boolean; // Default: true

  // ID Tokens
  idTokenTtl: number; // Default: 3600
  idTokenSigningAlg: 'RS256' | 'HS256'; // Default: RS256

  // Claims
  supportedScopes: string[]; // Default: ['openid', 'profile', 'email']
  supportedClaims: string[]; // Auto-derived from scopes
  claimsParameterSupported: boolean; // Default: true

  // Session
  sessionManagement: boolean; // Default: false
  checkSessionIframe: boolean; // Default: false

  // Logout
  frontChannelLogout: boolean; // Default: false
  backChannelLogout: boolean; // Default: false
  rpInitiatedLogout: boolean; // Default: true

  // Keys
  keyRotationInterval: number; // Default: 86400 (1 day)
  keyRetentionPeriod: number; // Default: 604800 (7 days)
}
```

## Database Schema Additions

```sql
-- OIDC sessions
CREATE TABLE oidc_session (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  auth_time TIMESTAMPTZ NOT NULL,
  auth_methods TEXT[],
  acr VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  FOREIGN KEY (user_id) REFERENCES authentication.user(id)
);

-- Session-client associations
CREATE TABLE oidc_session_client (
  session_id VARCHAR(64) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (session_id, client_id),
  FOREIGN KEY (session_id) REFERENCES oidc_session(id),
  FOREIGN KEY (client_id) REFERENCES oauth_client(id)
);

-- Signing keys
CREATE TABLE oidc_signing_key (
  kid VARCHAR(64) PRIMARY KEY,
  algorithm VARCHAR(10) NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,  -- Encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

## Open Questions

1. **Pairwise Subject**: Support pairwise subject identifiers for privacy?
2. **Sector Identifier**: How to handle sector identifier URIs?
3. **Encryption**: Support encrypted ID tokens (JWE)?
4. **Hybrid Flow**: Support hybrid response types (code id_token)?
5. **Request Objects**: Support signed/encrypted request objects?
6. **Claims Aggregation**: Support aggregated/distributed claims?
7. **Voluntary vs Essential**: UI for essential claims consent?
8. **OIDC Certification**: Pursue official OIDC certification?
