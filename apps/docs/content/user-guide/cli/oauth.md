---
title: OAuth Commands
description: CLI commands for managing OAuth 2.0 clients
date: 2024-01-01
order: 7
tags: [cli, oauth, authentication, reference]
relevance: 60
---

# OAuth Commands

Manage OAuth 2.0 clients for API access and third-party integrations.

> **Note**: OAuth commands require administrator privileges.

## Overview

Colibri implements OAuth 2.0 for secure API access, supporting:

- **Authorization Code Flow**: For web applications
- **Device Authorization Flow**: For CLI tools and devices
- **Client Credentials Flow**: For server-to-server communication

## colibri oauth clients list

List all registered OAuth clients.

```bash
colibri oauth clients list [options]
```

### Options

| Option   | Description    |
| -------- | -------------- |
| `--json` | Output as JSON |

### Output

Displays:

- Client ID
- Client name
- Grant types
- Redirect URIs
- Created date
- Active status

### Examples

```bash
# List all clients
colibri oauth clients list

# JSON output
colibri oauth clients list --json
```

## colibri oauth clients create

Register a new OAuth client.

```bash
colibri oauth clients create <name>
```

### Options

| Option           | Description                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| `--grant-type`   | Grant types: authorization_code, device_code, client_credentials (comma-separated) |
| `--redirect-uri` | Redirect URIs (can specify multiple times)                                         |
| `--scope`        | Allowed scopes (comma-separated)                                                   |
| `--confidential` | Create confidential client (requires secret)                                       |

### Examples

```bash
# Web application client
colibri oauth clients create "My Web App" \
  --grant-type authorization_code \
  --redirect-uri "https://myapp.com/callback" \
  --confidential

# CLI tool client
colibri oauth clients create "CLI Tool" \
  --grant-type device_code

# Server-to-server client
colibri oauth clients create "Background Service" \
  --grant-type client_credentials \
  --confidential
```

### Output

Returns:

- Client ID
- Client Secret (if confidential)
- Configuration details

> **Important**: Save the Client Secret immediately. It cannot be retrieved later.

## colibri oauth clients inspect

View details of a specific OAuth client.

```bash
colibri oauth clients inspect <client-id>
```

### Output

Displays:

- Client configuration
- Allowed grant types
- Redirect URIs
- Scopes
- Usage statistics (token count, last used)

### Examples

```bash
# View client details
colibri oauth clients inspect abc123

# JSON output
colibri oauth clients inspect abc123 --json
```

## colibri oauth clients edit

Update an OAuth client configuration.

```bash
colibri oauth clients edit <client-id> [options]
```

### Options

| Option                  | Description           |
| ----------------------- | --------------------- |
| `--name`                | Update client name    |
| `--redirect-uri`        | Add redirect URI      |
| `--remove-redirect-uri` | Remove redirect URI   |
| `--scope`               | Update allowed scopes |

### Examples

```bash
# Update name
colibri oauth clients edit abc123 --name "New Name"

# Add redirect URI
colibri oauth clients edit abc123 \
  --redirect-uri "https://myapp.com/new-callback"

# Remove redirect URI
colibri oauth clients edit abc123 \
  --remove-redirect-uri "https://old.com/callback"
```

## colibri oauth clients rotate-secret

Rotate the client secret for a confidential client.

```bash
colibri oauth clients rotate-secret <client-id>
```

### Behavior

- Generates a new client secret
- Invalidates the old secret after grace period (default: 24 hours)
- Returns the new secret

### Options

| Option           | Description                                  |
| ---------------- | -------------------------------------------- |
| `--grace-period` | Hours to keep old secret valid (default: 24) |
| `--immediate`    | Invalidate old secret immediately            |

### Examples

```bash
# Rotate with 24-hour grace period
colibri oauth clients rotate-secret abc123

# Immediate rotation
colibri oauth clients rotate-secret abc123 --immediate
```

> **Warning**: Save the new secret immediately. Update your application before the grace period expires.

## colibri oauth clients delete

Delete an OAuth client.

```bash
colibri oauth clients delete <client-id>
```

### Behavior

- Revokes all active tokens
- Removes client registration
- Cannot be undone

### Options

| Option      | Description              |
| ----------- | ------------------------ |
| `--confirm` | Skip confirmation prompt |

### Examples

```bash
# Delete client (interactive)
colibri oauth clients delete abc123

# Skip confirmation
colibri oauth clients delete abc123 --confirm
```

## colibri oauth tokens list

List active OAuth tokens.

```bash
colibri oauth tokens list [options]
```

### Options

| Option        | Description                 |
| ------------- | --------------------------- |
| `--client-id` | Filter by client            |
| `--user-id`   | Filter by user              |
| `--type`      | Token type: access, refresh |
| `--json`      | Output as JSON              |

### Examples

```bash
# List all tokens
colibri oauth tokens list

# Tokens for specific client
colibri oauth tokens list --client-id abc123

# Tokens for specific user
colibri oauth tokens list --user-id user-xyz
```

## colibri oauth tokens revoke

Revoke a specific OAuth token.

```bash
colibri oauth tokens revoke <token-id>
```

### Examples

```bash
# Revoke token
colibri oauth tokens revoke token-xyz
```

## colibri oauth tokens cleanup

Remove expired tokens.

```bash
colibri oauth tokens cleanup
```

### Behavior

- Removes expired access tokens
- Removes expired refresh tokens
- Shows count of removed tokens

### Examples

```bash
# Clean up expired tokens
colibri oauth tokens cleanup
```

## OAuth Grant Types

### Authorization Code Flow

For web applications with a backend:

1. **Register client**

```bash
colibri oauth clients create "My Web App" \
  --grant-type authorization_code \
  --redirect-uri "https://myapp.com/callback" \
  --confidential
```

2. **Authorization URL**

```
https://library.example.com/auth/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://myapp.com/callback&
  response_type=code&
  scope=read+write
```

3. **Exchange code for token**

```bash
curl -X POST https://library.example.com/auth/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_SECRET" \
  -d "redirect_uri=https://myapp.com/callback"
```

### Device Authorization Flow

For CLI tools and devices:

1. **Register client**

```bash
colibri oauth clients create "CLI Tool" \
  --grant-type device_code
```

2. **Request device code**

```bash
curl -X POST https://library.example.com/auth/oauth/device \
  -d "client_id=YOUR_CLIENT_ID"
```

3. **User visits verification URL**

Returns:

```json
{
  "device_code": "DEVICE_CODE",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://library.example.com/auth/oauth/device",
  "expires_in": 900
}
```

4. **Poll for token**

```bash
curl -X POST https://library.example.com/auth/oauth/token \
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
  -d "device_code=DEVICE_CODE" \
  -d "client_id=YOUR_CLIENT_ID"
```

### Client Credentials Flow

For server-to-server authentication:

1. **Register client**

```bash
colibri oauth clients create "Background Service" \
  --grant-type client_credentials \
  --confidential
```

2. **Request token**

```bash
curl -X POST https://library.example.com/auth/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_SECRET"
```

## Scopes

Available OAuth scopes:

| Scope    | Description                 |
| -------- | --------------------------- |
| `read`   | Read access to library      |
| `write`  | Create and update resources |
| `delete` | Delete resources            |
| `admin`  | Administrative access       |

### Examples

```bash
# Read-only client
colibri oauth clients create "Read Only" \
  --grant-type client_credentials \
  --scope read

# Full access client
colibri oauth clients create "Full Access" \
  --grant-type client_credentials \
  --scope read,write,delete
```

## Security Best Practices

### Client Secrets

- Store secrets securely (environment variables, secret managers)
- Never commit secrets to version control
- Rotate secrets regularly
- Use different clients for different environments

### Redirect URIs

- Use HTTPS in production (HTTP only for localhost)
- Whitelist exact URIs (no wildcards)
- Validate state parameter to prevent CSRF

### Token Management

- Use short-lived access tokens (1 hour)
- Use refresh tokens for long-lived access
- Revoke tokens when no longer needed
- Clean up expired tokens regularly

### Scopes

- Request minimum required scopes
- Different clients for different purposes
- Audit scope usage regularly

## Workflows

### Setting Up a Web Application

```bash
# 1. Create client
CLIENT=$(colibri oauth clients create "My Web App" \
  --grant-type authorization_code \
  --redirect-uri "https://myapp.com/callback" \
  --scope read,write \
  --confidential \
  --json)

# 2. Extract credentials
CLIENT_ID=$(echo $CLIENT | jq -r '.client_id')
CLIENT_SECRET=$(echo $CLIENT | jq -r '.client_secret')

# 3. Store in your app's environment
echo "OAUTH_CLIENT_ID=$CLIENT_ID" >> .env
echo "OAUTH_CLIENT_SECRET=$CLIENT_SECRET" >> .env
```

### Setting Up a CLI Tool

```bash
# 1. Create device flow client
colibri oauth clients create "My CLI" \
  --grant-type device_code \
  --scope read

# 2. Use in your CLI
# (implement device flow as shown above)
```

### Revoking Access

```bash
# 1. List client's tokens
colibri oauth tokens list --client-id abc123

# 2. Revoke all by deleting client
colibri oauth clients delete abc123

# Or revoke individual tokens
colibri oauth tokens revoke token-xyz
```

### Security Audit

```bash
# List all clients
colibri oauth clients list

# Check active tokens
colibri oauth tokens list

# Clean up expired tokens
colibri oauth tokens cleanup
```

## Testing

### Test Authorization Flow

```bash
# 1. Start authorization
open "https://library.example.com/auth/oauth/authorize?client_id=abc123&redirect_uri=http://localhost:3000/callback&response_type=code"

# 2. After authorization, you'll be redirected with a code
# http://localhost:3000/callback?code=AUTH_CODE

# 3. Exchange for token
curl -X POST https://library.example.com/auth/oauth/token \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "client_id=abc123" \
  -d "client_secret=SECRET" \
  -d "redirect_uri=http://localhost:3000/callback"
```

### Test API Access

```bash
# Get token
TOKEN=$(curl -X POST https://library.example.com/auth/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=abc123" \
  -d "client_secret=SECRET" | jq -r '.access_token')

# Use token
curl https://library.example.com/api/works \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Invalid Client

**Error**: `invalid_client`

**Causes**:

- Wrong client ID
- Wrong client secret
- Client deleted

**Solution**: Verify credentials with `colibri oauth clients inspect`

### Invalid Redirect URI

**Error**: `invalid_redirect_uri`

**Causes**:

- URI not registered
- Typo in redirect URI
- HTTP vs HTTPS mismatch

**Solution**: Check registered URIs with `colibri oauth clients inspect`

### Invalid Grant

**Error**: `invalid_grant`

**Causes**:

- Authorization code expired
- Code already used
- Code revoked

**Solution**: Start authorization flow again

### Access Denied

**Error**: `access_denied`

**Causes**:

- User declined authorization
- Client doesn't have required scope

**Solution**: Check client scopes and user permissions
