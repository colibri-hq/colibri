# OAuth Authorization Code Grant

## Description

The Authorization Code Grant is the primary OAuth 2.1 flow for web applications where a user authenticates and
authorizes a client application. This flow includes mandatory PKCE (Proof Key for Code Exchange) support as required by
OAuth 2.1, preventing authorization code interception attacks.

## Current Implementation Status

**Implemented:**

- ✅ Full authorization code grant flow (`grantTypes/authorizationCodeGrant.ts`)
- ✅ PKCE support with S256 method (SHA-256)
- ✅ PKCE plain method (for backwards compatibility)
- ✅ Authorization code generation and storage
- ✅ Code expiration (configurable, default 300s)
- ✅ One-time code usage (replay attack prevention)
- ✅ Redirect URI validation
- ✅ Scope validation and consent
- ✅ State parameter support
- ✅ Client authentication at token endpoint
- ✅ Access token and refresh token issuance
- ✅ OpenID Connect ID token support

**Routes Implemented:**

- ✅ `GET /auth/oauth/authorize` - Authorization endpoint (with user auth check)
- ✅ `POST /auth/oauth/authorize` - Authorization form submission
- ✅ `POST /auth/oauth/token` - Token exchange endpoint

**Partial Implementation:**

- ⚠️ Consent UI (basic implementation, needs polish)
- ⚠️ Response modes (query and fragment only, no form_post)

**Not Implemented:**

- ❌ Consent management UI (view/revoke consents)
- ❌ Prompt parameter handling (login, consent, none, select_account)
- ❌ Max_age parameter
- ❌ ACR/AMR claims
- ❌ Claims parameter for requesting specific claims
- ❌ UI localization

## Flow Diagram

```
┌──────────┐                              ┌──────────────┐
│  Client  │                              │    Server    │
└────┬─────┘                              └──────┬───────┘
     │                                           │
     │ 1. Authorization Request                  │
     │   (client_id, redirect_uri, scope,        │
     │    state, code_challenge, code_challenge_method)
     │ ─────────────────────────────────────────>│
     │                                           │
     │                              ┌────────────┴────────────┐
     │                              │ 2. User Authentication  │
     │                              │    & Consent            │
     │                              └────────────┬────────────┘
     │                                           │
     │ 3. Authorization Response                 │
     │   (code, state)                           │
     │ <─────────────────────────────────────────│
     │                                           │
     │ 4. Token Request                          │
     │   (code, redirect_uri, code_verifier,     │
     │    client_id, client_secret)              │
     │ ─────────────────────────────────────────>│
     │                                           │
     │ 5. Token Response                         │
     │   (access_token, refresh_token,           │
     │    token_type, expires_in, id_token)      │
     │ <─────────────────────────────────────────│
     │                                           │
```

## Implementation Plan

### Phase 1: Prompt Parameter Support

1. Implement prompt parameter handling:
   ```typescript
   type PromptValue = 'none' | 'login' | 'consent' | 'select_account';

   // prompt=none: Silent authentication (no UI)
   // prompt=login: Force re-authentication
   // prompt=consent: Force consent screen
   // prompt=select_account: Show account selector
   ```

2. Session management for prompt handling:
    - Track authentication time for `max_age`
    - Track consent grants per client/scope combination

### Phase 2: Enhanced Consent UI

1. Consent screen improvements:
    - Display requested scopes with descriptions
    - Show client application details (name, logo, URL)
    - Remember consent option
    - Granular scope selection (optional)

2. Consent management page:
    - List all granted consents
    - Revoke individual consents
    - View consent history

### Phase 3: Claims Support

1. Claims parameter for specific claim requests:
   ```typescript
   interface ClaimsRequest {
     userinfo?: Record<string, ClaimConfig>;
     id_token?: Record<string, ClaimConfig>;
   }

   interface ClaimConfig {
     essential?: boolean;
     value?: string;
     values?: string[];
   }
   ```

2. Voluntary claims vs essential claims handling

### Phase 4: Response Mode Extensions

1. Implement `form_post` response mode:
   ```html
   <form method="post" action="{redirect_uri}">
     <input type="hidden" name="code" value="{code}">
     <input type="hidden" name="state" value="{state}">
   </form>
   <script>document.forms[0].submit();</script>
   ```

2. Benefits: Avoids URL length limits, hides code from browser history

### Phase 5: Security Enhancements

1. ACR (Authentication Context Class Reference):
   ```typescript
   // Request specific authentication levels
   acr_values: 'urn:mace:incommon:iap:silver urn:mace:incommon:iap:bronze'
   ```

2. AMR (Authentication Methods References):
    - Track how user authenticated (password, passkey, mfa)
    - Include in ID token

3. Authentication time tracking:
    - `auth_time` claim in ID token
    - `max_age` parameter validation

### Phase 6: Internationalization

1. UI localization:
    - `ui_locales` parameter support
    - Translated consent screens
    - Translated error messages

2. Claims localization:
    - Localized claim values where applicable

## Database Schema

```sql
-- Authorization codes (existing)
CREATE TABLE oauth_authorization_code (
  code VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[],
  code_challenge VARCHAR(128) NOT NULL,
  code_challenge_method VARCHAR(10) NOT NULL,
  state VARCHAR(255),
  nonce VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  FOREIGN KEY (client_id) REFERENCES oauth_client(id),
  FOREIGN KEY (user_id) REFERENCES authentication.user(id)
);

-- User consents (new)
CREATE TABLE oauth_user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  scopes TEXT[] NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  UNIQUE (user_id, client_id),
  FOREIGN KEY (client_id) REFERENCES oauth_client(id),
  FOREIGN KEY (user_id) REFERENCES authentication.user(id)
);
```

## Configuration

```typescript
interface AuthorizationCodeGrantConfig {
  // Code settings
  codeTtl: number;              // Default: 300 (5 minutes)
  codeLength: number;           // Default: 32 bytes

  // PKCE
  requirePkce: boolean;         // Default: true (OAuth 2.1)
  allowedMethods: ('S256' | 'plain')[];  // Default: ['S256']

  // Consent
  requireConsent: boolean;      // Default: true
  rememberConsent: boolean;     // Default: true
  consentTtl: number;           // Default: 0 (forever)

  // Response modes
  allowedResponseModes: ('query' | 'fragment' | 'form_post')[];
  defaultResponseMode: string;  // Default: 'query'

  // Prompts
  allowedPrompts: PromptValue[];

  // OpenID Connect
  enableOidc: boolean;          // Default: true
  idTokenTtl: number;           // Default: 3600
}
```

## Open Questions

1. **Consent Storage**: Per-client or per-client-scope granularity?
2. **Consent Expiry**: Should consents expire automatically?
3. **Scope Upgrade**: Allow requesting additional scopes later?
4. **Silent Auth**: How to handle prompt=none with expired sessions?
5. **Select Account**: Multi-account support in Colibri?
6. **Claim Customization**: Allow applications to request custom claims?
7. **Step-up Auth**: Support for step-up authentication (increase ACR)?
8. **Offline Access**: `offline_access` scope for long-lived refresh tokens?
