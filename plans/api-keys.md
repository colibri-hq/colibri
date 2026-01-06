# API Keys / App Passwords

## Description

Allow users to create API keys (app passwords) for authenticating devices and applications that don't support OAuth or
Passkey authentication. These keys can be used with Basic Auth for programmatic access to the API, e-readers, and other
integrations.

## Current Implementation Status

**Not Implemented:**

- ❌ No API key generation
- ❌ No app password storage
- ❌ No Basic Auth support in API

**Existing Infrastructure:**

- ✅ Full OAuth 2.0 server implementation
- ✅ Access token and refresh token tables
- ✅ WebAuthn for interactive authentication

## Implementation Plan

### Phase 1: API Key Schema

1. Create api_key table:
   ```sql
   CREATE TABLE authentication.api_key (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES authentication.user(id),
     name VARCHAR(100) NOT NULL,
     key_hash VARCHAR(255) NOT NULL, -- bcrypt or argon2
     key_prefix VARCHAR(8) NOT NULL, -- For identification: "col_xxxx"
     scopes TEXT[], -- Optional scope restrictions
     last_used_at TIMESTAMPTZ,
     last_used_ip INET,
     expires_at TIMESTAMPTZ, -- Optional expiration
     created_at TIMESTAMPTZ DEFAULT now(),
     revoked_at TIMESTAMPTZ
   );
   ```

### Phase 2: Key Generation

1. Generate secure random key:
   ```typescript
   function generateApiKey(): { key: string; hash: string; prefix: string } {
     const key = `col_${generateRandomString(32)}`;
     const hash = await hashPassword(key);
     const prefix = key.substring(0, 8);
     return { key, hash, prefix };
   }
   ```

2. Show key only once at creation
3. Store only the hash

### Phase 3: Basic Auth Support

1. Add Basic Auth middleware:
   ```typescript
   function authenticateBasicAuth(request: Request) {
     const auth = request.headers.get('Authorization');
     if (!auth?.startsWith('Basic ')) return null;

     const [username, password] = decode(auth.slice(6)).split(':');
     // username = user email or ID
     // password = API key

     return validateApiKey(username, password);
   }
   ```

2. Apply to relevant API routes
3. Rate limiting per API key

### Phase 4: Key Management UI

1. Settings page for API keys
2. Create new key flow:
    - Enter name/description
    - Select scopes (optional)
    - Set expiration (optional)
    - Display key once (with copy button)

3. List existing keys:
    - Name, prefix, created date
    - Last used date/IP
    - Revoke button

### Phase 5: Scope Restrictions

1. Define available scopes:
    - `read:library` - Read book metadata
    - `write:library` - Add/edit books
    - `read:progress` - Read reading progress
    - `write:progress` - Update reading progress
    - `download` - Download ebook files
    - `admin` - Admin operations

2. Enforce scopes in API middleware

### Phase 6: Device Registration

1. Optional: Link API key to device:
   ```sql
   ALTER TABLE authentication.api_key ADD COLUMN
     device_name VARCHAR(100),
     device_type VARCHAR(50), -- ereader, app, script
     device_id VARCHAR(255);
   ```

2. Show device info in management UI

### Phase 7: Security Features

1. IP allowlist per key (optional)
2. Key rotation support
3. Automatic expiration reminders
4. Usage analytics per key

## API Key Format

```
col_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
│   └── 32 random characters (alphanumeric)
└── Prefix for identification
```

## Authentication Methods Summary

| Method    | Use Case           | Supported        |
|-----------|--------------------|------------------|
| Passkey   | Browser, apps      | ✅                |
| OAuth 2.0 | Third-party apps   | ✅                |
| API Key   | Scripts, e-readers | ❌ (this feature) |
| Session   | Browser (internal) | ✅                |

## Open Questions

1. **Key Display**: Show key once, or allow re-display with password?
2. **Rotation**: Support key rotation with grace period?
3. **Default Scopes**: All scopes by default, or explicit selection?
4. **Rate Limits**: Different limits per scope or key?
5. **Expiration**: Require expiration, or allow permanent keys?
6. **Revocation**: Immediate revocation, or grace period?
7. **Username Format**: Email, user ID, or both for Basic Auth?
8. **OPDS Integration**: Use API keys for OPDS feed authentication?
