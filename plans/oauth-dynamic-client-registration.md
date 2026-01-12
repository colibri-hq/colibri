> **GitHub Issue:** [#178](https://github.com/colibri-hq/colibri/issues/178)

# OAuth Dynamic Client Registration

## Description

Dynamic Client Registration (RFC 7591) allows OAuth clients to register themselves programmatically without manual
intervention. This is essential for scenarios like mobile apps, single-page applications, and automated client
provisioning. The companion Dynamic Client Management (RFC 7592) protocol allows clients to update and delete their
registrations.

## Current Implementation Status

**Implemented:**

- ✅ Registration endpoint stub exists (`/auth/oauth/register`)
- ✅ Client data model supports registration metadata
- ✅ Client table in database schema

**Not Implemented:**

- ❌ Client registration logic
- ❌ Client metadata validation
- ❌ Software statement support
- ❌ Registration access token issuance
- ❌ Client management endpoints (update/delete)
- ❌ Client authentication method registration
- ❌ Policy-based registration approval
- ❌ Admin UI for client management

## Implementation Plan

### Phase 1: Basic Registration

1. Client registration endpoint:

   ```typescript
   POST /auth/oauth/register

   // Request
   {
     "client_name": "My App",
     "redirect_uris": ["https://app.example.com/callback"],
     "grant_types": ["authorization_code", "refresh_token"],
     "response_types": ["code"],
     "token_endpoint_auth_method": "client_secret_basic",
     "scope": "openid profile email"
   }

   // Response
   {
     "client_id": "s6BhdRkqt3",
     "client_secret": "cf136dc3c1fc93f31185e5885805d",
     "client_id_issued_at": 1577858400,
     "client_secret_expires_at": 0,
     "registration_access_token": "reg-token-xyz",
     "registration_client_uri": "https://auth.example.com/register/s6BhdRkqt3",
     // ... echo back all registered metadata
   }
   ```

2. Client metadata validation:

   ```typescript
   const clientMetadataSchema = z.object({
     // Required
     redirect_uris: z.array(z.string().url()).min(1),

     // Recommended
     client_name: z.string().max(255).optional(),
     client_uri: z.string().url().optional(),
     logo_uri: z.string().url().optional(),
     tos_uri: z.string().url().optional(),
     policy_uri: z.string().url().optional(),

     // OAuth
     grant_types: z
       .array(
         z.enum([
           'authorization_code',
           'client_credentials',
           'refresh_token',
           'urn:ietf:params:oauth:grant-type:device_code',
         ]),
       )
       .optional(),
     response_types: z.array(z.enum(['code'])).optional(),
     scope: z.string().optional(),

     // Authentication
     token_endpoint_auth_method: z
       .enum([
         'none',
         'client_secret_basic',
         'client_secret_post',
         'private_key_jwt',
       ])
       .optional(),

     // JWKS for private_key_jwt
     jwks_uri: z.string().url().optional(),
     jwks: z.object({}).optional(),

     // Contacts
     contacts: z.array(z.string().email()).optional(),

     // Software statement
     software_id: z.string().optional(),
     software_version: z.string().optional(),
     software_statement: z.string().optional(),
   });
   ```

### Phase 2: Client Types

1. Public clients (no secret):

   ```typescript
   // For SPAs and native apps
   {
     "token_endpoint_auth_method": "none",
     "grant_types": ["authorization_code"],
     "application_type": "native"  // or "web"
   }
   ```

2. Confidential clients (with secret):

   ```typescript
   // For server-side apps
   {
     "token_endpoint_auth_method": "client_secret_basic",
     "grant_types": ["authorization_code", "client_credentials"]
   }
   ```

3. Automatic client type detection based on `token_endpoint_auth_method`

### Phase 3: Software Statements

1. Software statement JWT validation:

   ```typescript
   interface SoftwareStatement {
     software_id: string;
     software_version?: string;
     client_name: string;
     client_uri?: string;
     redirect_uris: string[];
     // ... other metadata
     iss: string; // Software publisher
     iat: number;
     exp?: number;
   }
   ```

2. Trusted software publishers:
   - Maintain list of trusted issuers
   - Validate software statement signatures
   - Auto-approve registrations from trusted publishers

3. Software statement benefits:
   - Pre-validated redirect URIs
   - Publisher accountability
   - Simplified approval workflow

### Phase 4: Client Management (RFC 7592)

1. Read client configuration:

   ```typescript
   GET /auth/oauth/register/{client_id}
   Authorization: Bearer {registration_access_token}

   // Returns current client configuration
   ```

2. Update client configuration:

   ```typescript
   PUT /auth/oauth/register/{client_id}
   Authorization: Bearer {registration_access_token}

   // Full replacement of client metadata
   // Must include client_id
   ```

3. Delete client:

   ```typescript
   DELETE /auth/oauth/register/{client_id}
   Authorization: Bearer {registration_access_token}

   // Returns 204 No Content
   ```

4. Rotate client secret:

   ```typescript
   POST /auth/oauth/register/{client_id}/rotate-secret
   Authorization: Bearer {registration_access_token}

   // Returns new client_secret
   ```

### Phase 5: Registration Policies

1. Policy engine:

   ```typescript
   interface RegistrationPolicy {
     // Who can register
     allowAnonymous: boolean;
     requireAuthentication: boolean;
     requireApproval: boolean;

     // What can be registered
     allowedGrantTypes: string[];
     allowedScopes: string[];
     allowedRedirectUriPatterns: RegExp[];
     maxRedirectUris: number;

     // Restrictions
     maxClientsPerUser: number;
     requireHttpsRedirectUris: boolean;
     allowLocalhostRedirectUris: boolean;
   }
   ```

2. Approval workflow:
   - Pending registrations queue
   - Admin review interface
   - Email notifications
   - Auto-approve for trusted domains

### Phase 6: Admin Interface

1. Client management UI:
   - List all registered clients
   - View client details
   - Enable/disable clients
   - Revoke client access
   - View client usage statistics

2. Bulk operations:
   - Export client list
   - Import clients from JSON
   - Bulk enable/disable

3. Audit log:
   - Registration events
   - Configuration changes
   - Access patterns

## Database Schema

```sql
-- OAuth clients (enhanced)
CREATE TABLE oauth_client (
  id VARCHAR(255) PRIMARY KEY,
  secret VARCHAR(255),
  secret_expires_at TIMESTAMPTZ,

  -- Metadata
  client_name VARCHAR(255),
  client_uri TEXT,
  logo_uri TEXT,
  tos_uri TEXT,
  policy_uri TEXT,
  contacts TEXT[],

  -- OAuth configuration
  redirect_uris TEXT[] NOT NULL,
  grant_types TEXT[] DEFAULT ARRAY['authorization_code'],
  response_types TEXT[] DEFAULT ARRAY['code'],
  scope TEXT,

  -- Authentication
  token_endpoint_auth_method VARCHAR(50) DEFAULT 'client_secret_basic',
  jwks_uri TEXT,
  jwks JSONB,

  -- Software
  software_id VARCHAR(255),
  software_version VARCHAR(50),
  software_statement TEXT,

  -- Registration
  registration_access_token VARCHAR(255),
  registered_by VARCHAR(255),
  registered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  active BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(255),
  approved_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  FOREIGN KEY (registered_by) REFERENCES authentication.user(id),
  FOREIGN KEY (approved_by) REFERENCES authentication.user(id)
);

-- Client usage statistics
CREATE TABLE oauth_client_stats (
  client_id VARCHAR(255) PRIMARY KEY,
  token_requests INTEGER DEFAULT 0,
  authorization_requests INTEGER DEFAULT 0,
  last_token_request TIMESTAMPTZ,
  last_authorization_request TIMESTAMPTZ,

  FOREIGN KEY (client_id) REFERENCES oauth_client(id)
);
```

## Configuration

```typescript
interface DynamicRegistrationConfig {
  // Enable/disable
  enabled: boolean; // Default: false

  // Access control
  allowAnonymousRegistration: boolean; // Default: false
  requireApproval: boolean; // Default: true
  trustedSoftwareIssuers: string[]; // Default: []

  // Defaults
  defaultGrantTypes: string[];
  defaultScopes: string[];
  defaultTokenEndpointAuthMethod: string;

  // Restrictions
  allowedGrantTypes: string[];
  allowedScopes: string[];
  allowedRedirectUriPatterns: string[]; // Regex patterns
  requireHttpsRedirectUris: boolean; // Default: true
  allowLocalhostRedirectUris: boolean; // Default: true (dev)

  // Limits
  maxClientsPerUser: number; // Default: 10
  maxRedirectUris: number; // Default: 10

  // Secrets
  clientSecretLength: number; // Default: 32
  clientSecretExpiration: number; // Default: 0 (never)
  registrationTokenExpiration: number; // Default: 0 (never)
}
```

## Security Considerations

1. **Redirect URI Validation**: Strict validation to prevent open redirector attacks
2. **Rate Limiting**: Prevent registration spam
3. **Secret Entropy**: High-entropy client secrets
4. **Token Binding**: Registration tokens bound to client
5. **Audit Trail**: Log all registration activities
6. **Scope Restrictions**: Limit available scopes for dynamic clients

## Open Questions

1. **Anonymous Registration**: Should we allow it at all?
2. **Approval Workflow**: Automatic vs manual approval?
3. **Secret Rotation**: Mandatory rotation period?
4. **Localhost**: Allow localhost redirects in production?
5. **Software Statements**: Required for certain client types?
6. **Migration**: How to migrate existing static clients?
7. **Quotas**: Per-user or global registration limits?
8. **Namespace**: Client ID format and namespace management?
