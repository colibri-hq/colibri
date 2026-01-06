---
title: OAuth Server
description: OAuth 2.0 authorization server implementation
date: 2024-01-01
order: 1
tags: [oauth, authentication, security, developers]
relevance: 60
---

# OAuth Server

The `@colibri-hq/oauth` package provides an OAuth 2.0 authorization server implementation for Colibri.

## Installation

```bash
npm install @colibri-hq/oauth
```

## Features

- OAuth 2.0 Authorization Code Grant
- Device Authorization Grant (RFC 8628)
- Pushed Authorization Requests (RFC 9126)
- PKCE support (RFC 7636)
- Token refresh and revocation
- Dynamic client registration

## Quick Start

```typescript
import { OAuthServer } from "@colibri-hq/oauth";

const oauth = new OAuthServer({
  issuer: "https://your-colibri-instance.com",
  signingKey: process.env.OAUTH_SIGNING_KEY,
});

// Register endpoints with your framework
app.post("/oauth/authorize", oauth.authorize);
app.post("/oauth/token", oauth.token);
app.post("/oauth/revoke", oauth.revoke);
```

## Client Registration

```typescript
const client = await oauth.registerClient({
  name: "My Application",
  redirectUris: ["https://app.example.com/callback"],
  grantTypes: ["authorization_code", "refresh_token"],
});
```

## Token Validation

```typescript
const token = await oauth.validateToken(accessToken);
if (token.valid) {
  console.log(token.claims.sub); // User ID
  console.log(token.claims.scope); // Granted scopes
}
```

## Scopes

Available scopes:

| Scope   | Description             |
| ------- | ----------------------- |
| `read`  | Read access to library  |
| `write` | Write access to library |
| `admin` | Administrative access   |
