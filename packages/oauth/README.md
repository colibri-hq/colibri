Colibri OAuth
=============
> Colibri OAuth is a framework-agnostic OAuth 2.1 server, built with a focus on spec-compliance, extensibility, and
> security.

Overview
--------
Colibri OAuth provides a robust implementation of the OAuth 2.1 and OpenID Connect protocols, striving for full
implementation of all published specifications. It's designed to be framework-agnostic, allowing seamless integration
with any web framework that supports standard Web API interfaces.

### Key Features

- [x] Full OAuth 2.1 and OpenID Connect 1.0 compliance
- [x] Comprehensive test coverage
- [x] Support for all standard OAuth 2.1 grant types:
    - [x] Authorization Code ([RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-1.3.1),
      [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-1.3.1))
    - [x] Client Credentials ([RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-1.3.4),
      [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-1.3.4))
    - [x] Refresh Token ([RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749#section-1.5),
      [OAuth 2.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12#section-1.3.2))
    - [x] Device Authorization ([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628#section-1))
- [x] Support for defining custom grant types
- [x] PKCE: Proof Key for Code Exchange ([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636#section-1))
- [x] Token revocation ([RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009#section-1))
- [x] Token introspection ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662#section-1))
- [x] User Info endpoint ([OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html))
- [x] Authorization Server Metadata ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414))
- [x] Authorization Server Issuer Identification ([RFC 9207](https://datatracker.ietf.org/doc/html/rfc9207#section-1))
- [x] Pushed Authorization Requests (PAR) ([RFC 9200](https://datatracker.ietf.org/doc/html/rfc9200))
- [ ] Dynamic Client Registration ([RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591))
- [ ] Dynamic Client Management ([RFC 7592](https://datatracker.ietf.org/doc/html/rfc7592))
- [ ] JWT Authorization Request ([RFC 9101](https://datatracker.ietf.org/doc/html/rfc9101))
- [ ] Mutual TLS Bound Access Tokens ([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705))
- [ ] JWT-based access tokens

### Installation
Install the package using your favorite package manager:

```bash
npm install @colibri-hq/oauth
```

### Usage
To create a new authorization server instance, use the `createAuthorizationServer` function:

```typescript
import { createAuthorizationServer } from '@colibri-hq/oauth';

const server = createAuthorizationServer({
  issuer: process.env.OAUTH_ISSUER_URL,
  jwtSecret: process.env.OAUTH_JWT_SECRET,
  persistence: {
    // Methods to read and write data to your data store
  },
});
```

## Architecture

The module follows a clean, modular architecture:

- **Core Server**: Handles protocol-level operations and validation
- **Persistence Layer**: Abstract interface for data storage
- **Grant Types**: Modular implementations of different authorization flows
- **Utilities**: Helper functions for common operations
- **Types**: Comprehensive TypeScript definitions

### Core Components

- `AuthorizationServer`: Main server implementation
- `PersistenceAdapter`: Interface for data storage
- `GrantType`: Base class for authorization flows
- `TokenManager`: Handles token generation and validation
- `RequestValidator`: Validates incoming requests

## Supported Claims

The module supports standard OAuth and OpenID Connect claims:

### Standard Claims

- `sub` (Subject Identifier)
- `name`
- `email`
- `email_verified`
- `birthdate`
- `updated_at`
- Custom claims via the `http://localhost:3000/auth/oauth/claims/` namespace

## Endpoints

### Authorization Endpoints

- `/authorize`: Authorization endpoint
- `/token`: Token endpoint
- `/userinfo`: User Info endpoint
- `/introspect`: Token introspection
- `/revoke`: Token revocation
- `/device`: Device authorization
- `/register`: Dynamic client registration
- `/par`: Pushed Authorization Requests

## Adding Custom Grant Types

To add a custom grant type:

1. Create a new class extending `GrantType`:

```typescript
import { GrantType } from '@colibri-hq/oauth';

class CustomGrantType extends GrantType {
  async validateRequest(request: Request): Promise<void> {
    // Implement validation logic
  }

  async handleRequest(request: Request): Promise<Response> {
    // Implement request handling
  }
}
```

2. Register the grant type with the server:

```typescript
const server = createAuthorizationServer(options);
server.enableGrantType(CustomGrantType, {
  // Grant type specific options
});
```

## Contributing

We welcome contributions to the Colibri OAuth module! Here's how you can help:

### Development Setup

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Run tests:

```bash
pnpm test
```

### Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow the existing code style
- Ensure backward compatibility

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure they pass
5. Submit a pull request with a clear description

### Code of Conduct

Please be respectful and considerate of others when contributing. We follow
the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) code of conduct.

