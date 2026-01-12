> **GitHub Issue:** [#115](https://github.com/colibri-hq/colibri/issues/115)

# API Keys / App Passwords

## Description

Allow users to create API keys (app passwords) for authenticating devices and applications that don't support OAuth or
Passkey authentication. These keys can be used with Basic or Bearer Auth for programmatic access to the API, e-readers,
and other integrations.

## Current Implementation Status

**Implemented:**

- ✅ API key database schema with expiration, scopes, rotation tracking
- ✅ Secure key generation (SHA-256 hashing, cryptographically secure random)
- ✅ Key management SDK functions (create, list, revoke, rotate, validate)
- ✅ Scope system with hierarchical inheritance (`admin` → all, `write` → `read`)
- ✅ tRPC routes for key management
- ✅ Settings UI with key creation modal
- ✅ Key rotation with 15-minute grace period
- ✅ Unified API authentication (Basic Auth + Bearer Token + Session)
- ✅ RLS policies for api_key table

**Existing Infrastructure:**

- ✅ Full OAuth 2.0 server implementation
- ✅ Access token and refresh token tables
- ✅ WebAuthn for interactive authentication

**Future Enhancements:**

- ⚠️ Rate limiting (removed for now, can be re-added when needed)
- ⚠️ Background job for cleanup (expired keys, grace periods)

## Implementation Phases

### Phase 1: API Key Schema ✅ COMPLETE

Database table created in `supabase/migrations/20260108120000_api_keys.sql`:

- `id` (bigint, auto-increment primary key)
- `user_id` (foreign key to user, cascade delete)
- `name` (varchar 100, user-provided identifier)
- `key_hash` (SHA-256 hash, plain text never stored)
- `key_prefix` (first 12 chars for identification)
- `scopes` (text array, empty = all scopes)
- `last_used_at`, `last_used_ip` (usage tracking)
- `expires_at`, `revoked_at` (lifecycle management)
- `rotated_from_id`, `rotated_at` (rotation tracking)

### Phase 2: Key Generation ✅ COMPLETE

Implemented in `packages/sdk/src/resources/authentication/api-key.ts`:

- Format: `col_` + 28 random alphanumeric characters (32 total)
- SHA-256 hashing with timing-safe comparison
- Plain text shown only once at creation
- Prefix stored for UI identification

### Phase 3: Basic Auth Support ✅ COMPLETE

Implemented in `apps/app/src/lib/server/api-auth.ts`:

- Unified authentication supporting Basic Auth, Bearer tokens, and session cookies
- Username = user email, Password = API key
- IP extraction for logging (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`)
- Integrated into all `/api/*` routes via hooks.server.ts

### Phase 4: Key Management UI ✅ COMPLETE

Settings page components in `apps/app/src/routes/(library)/instance/settings/`:

- `ApiKeysSettings.svelte` - List, rotate, revoke keys
- `CreateApiKeyModal.svelte` - Create with name, scopes, expiration
- Copy button with one-time key display
- Usage instructions with curl example

### Phase 5: Scope Restrictions ✅ COMPLETE

Scope registry in `packages/sdk/src/scopes/`:

| Scope              | Description              | Category | Implies          |
| ------------------ | ------------------------ | -------- | ---------------- |
| `library:read`     | Read library books       | library  | -                |
| `library:write`    | Add/edit/delete books    | library  | `library:read`   |
| `library:download` | Download book files      | library  | `library:read`   |
| `progress:read`    | Read reading progress    | progress | -                |
| `progress:write`   | Update reading progress  | progress | `progress:read`  |
| `instance:read`    | Read instance settings   | system   | (OAuth only)     |
| `instance:write`   | Modify instance settings | system   | (OAuth only)     |
| `admin`            | Full admin access        | admin    | All of the above |

Scope checking available via `hasRequiredScope()` in api-auth.ts. Individual routes can enforce scopes as needed.

### Phase 6: Device Registration ❌ NOT IMPLEMENTED (DEFERRED)

Originally planned device tracking columns have been deferred. Can be added later if needed for OPDS e-reader
integration.

### Phase 7: Security Features ✅ MOSTLY COMPLETE

**Completed:**

- ✅ Key rotation with 15-minute grace period
- ✅ RLS policies for api_key table (migration `20260110120000_api_keys_rls.sql`)
- ✅ Removed overly permissive database grants (anon no longer has access)

**Future Enhancements:**

- IP allowlist per key (optional)
- Background cleanup job for expired/rotated keys
- Audit logging for key operations
- Rate limiting (removed for now, can be re-added with Redis for multi-instance)

## API Key Format

```
col_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
│   └── 28 random alphanumeric characters
└── Prefix for identification
```

## Authentication Methods Summary

| Method    | Use Case           | Supported |
| --------- | ------------------ | --------- |
| Passkey   | Browser, apps      | ✅        |
| OAuth 2.0 | Third-party apps   | ✅        |
| API Key   | Scripts, e-readers | ✅        |
| Session   | Browser (internal) | ✅        |

## Resolved Questions

1. **Key Display**: Show once, allow rotating to get a new key
2. **Rotation**: 15-minute grace period for old key
3. **Default Scopes**: All API-allowed scopes selected by default
4. **Rate Limits**: Per-key (100 requests/minute default)
5. **Expiration**: Optional, permanent keys allowed
6. **Revocation**: Immediate (no grace period)
7. **Username Format**: Email for Basic Auth
8. **OPDS Integration**: API keys will work for OPDS access

## Remaining Work

### Future Enhancements

1. **Background cleanup job** - Clean expired grace periods and auto-revoke expired keys
2. **Audit logging** - Log create/rotate/revoke operations
3. **Device registration** - Track which device uses which key
4. **IP allowlist** - Restrict key usage to specific IPs
5. **Rate limiting** - Re-add with Redis for multi-instance deployments
6. **Scope editing** - Allow modifying scopes without rotation

## File Locations

```
packages/sdk/src/
├── resources/authentication/api-key.ts  # Core CRUD operations
├── scopes/
│   ├── index.ts                         # Public exports
│   ├── registry.ts                      # Scope definitions
│   └── service.ts                       # Scope utilities

apps/app/src/
├── lib/server/
│   └── api-auth.ts                      # Unified API auth (Basic + Bearer + Session)
├── lib/trpc/routes/api-keys.ts          # tRPC routes
├── hooks.server.ts                      # API auth hook
└── routes/(library)/instance/settings/
    ├── ApiKeysSettings.svelte           # Settings UI
    └── CreateApiKeyModal.svelte         # Creation modal

supabase/migrations/
├── 20260108120000_api_keys.sql          # Schema
├── 20260109120000_rename_scopes.sql     # Scope name migration
└── 20260110120000_api_keys_rls.sql      # RLS policies
```
