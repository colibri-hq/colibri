# OAuth Client Library

## Description

A comprehensive OAuth 2.1 client library that complements the authorization server, providing a type-safe,
framework-agnostic client for consuming OAuth-protected resources. The client should support all grant types implemented
by the server and provide utilities for common OAuth flows.

## Current Implementation Status

**Implemented:**

- ✅ Client stub file exists (`packages/oauth/src/client.ts`)

**Not Implemented:**

- ❌ No actual client implementation
- ❌ No authorization code flow client
- ❌ No client credentials flow client
- ❌ No device authorization flow client
- ❌ No token management (storage, refresh)
- ❌ No automatic token refresh
- ❌ No PKCE utilities
- ❌ No server metadata discovery

## Implementation Plan

### Phase 1: Core Client

1. Create base OAuth client class:
   ```typescript
   interface OAuthClientConfig {
     issuer: string;
     clientId: string;
     clientSecret?: string;
     redirectUri?: string;
     scopes?: string[];

     // Auto-discovery
     useMetadataDiscovery?: boolean;

     // Token storage
     tokenStore?: TokenStore;
   }

   class OAuthClient {
     constructor(config: OAuthClientConfig);

     // Discovery
     async discover(): Promise<ServerMetadata>;

     // Token management
     async getAccessToken(): Promise<string | null>;
     async refreshToken(): Promise<TokenResponse>;
     async revokeToken(token: string): Promise<void>;

     // Introspection
     async introspect(token: string): Promise<IntrospectionResponse>;
   }
   ```

2. Server metadata discovery (RFC 8414):
   ```typescript
   async function discoverServer(issuer: string): Promise<ServerMetadata> {
     const response = await fetch(`${issuer}/.well-known/oauth-authorization-server`);
     return response.json();
   }
   ```

### Phase 2: Authorization Code Flow Client

1. Authorization URL generation:
   ```typescript
   class AuthorizationCodeClient extends OAuthClient {
     // Generate authorization URL with PKCE
     createAuthorizationUrl(options?: {
       state?: string;
       nonce?: string;
       scopes?: string[];
       additionalParams?: Record<string, string>;
     }): { url: string; codeVerifier: string; state: string };

     // Exchange code for tokens
     async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse>;

     // Handle callback
     async handleCallback(url: string | URL): Promise<TokenResponse>;
   }
   ```

2. PKCE utilities:
   ```typescript
   function generateCodeVerifier(): string;
   function generateCodeChallenge(verifier: string, method?: 'S256' | 'plain'): string;
   function generateState(): string;
   function generateNonce(): string;
   ```

3. PAR support:
   ```typescript
   async pushAuthorizationRequest(params: AuthorizationParams): Promise<{
     request_uri: string;
     expires_in: number;
   }>;
   ```

### Phase 3: Client Credentials Flow Client

1. Machine-to-machine client:
   ```typescript
   class ClientCredentialsClient extends OAuthClient {
     async getToken(scopes?: string[]): Promise<TokenResponse>;

     // Automatic token management
     async getValidToken(): Promise<string>;
   }
   ```

2. Automatic token caching and refresh:
   ```typescript
   interface TokenCache {
     get(key: string): Promise<CachedToken | null>;
     set(key: string, token: CachedToken): Promise<void>;
     delete(key: string): Promise<void>;
   }
   ```

### Phase 4: Device Authorization Flow Client

1. Device flow client:
   ```typescript
   class DeviceAuthorizationClient extends OAuthClient {
     // Start device authorization
     async requestDeviceAuthorization(scopes?: string[]): Promise<{
       device_code: string;
       user_code: string;
       verification_uri: string;
       verification_uri_complete?: string;
       expires_in: number;
       interval: number;
     }>;

     // Poll for token (with automatic interval handling)
     async pollForToken(deviceCode: string, options?: {
       interval?: number;
       timeout?: number;
       onPending?: () => void;
     }): Promise<TokenResponse>;
   }
   ```

### Phase 5: Token Storage

1. Token store interface:
   ```typescript
   interface TokenStore {
     getTokens(clientId: string): Promise<StoredTokens | null>;
     setTokens(clientId: string, tokens: StoredTokens): Promise<void>;
     clearTokens(clientId: string): Promise<void>;
   }

   interface StoredTokens {
     accessToken: string;
     refreshToken?: string;
     expiresAt: Date;
     scopes: string[];
   }
   ```

2. Built-in implementations:
    - `MemoryTokenStore` - In-memory (development)
    - `LocalStorageTokenStore` - Browser localStorage
    - `SecureTokenStore` - Encrypted storage
    - `DatabaseTokenStore` - Database persistence

### Phase 6: Fetch Wrapper

1. Authenticated fetch utility:
   ```typescript
   class AuthenticatedFetch {
     constructor(client: OAuthClient);

     // Automatic token injection and refresh
     async fetch(url: string, options?: RequestInit): Promise<Response>;

     // Interceptors
     addRequestInterceptor(fn: RequestInterceptor): void;
     addResponseInterceptor(fn: ResponseInterceptor): void;
   }
   ```

2. Error handling:
   ```typescript
   class OAuthClientError extends Error {
     code: string;
     description?: string;
     uri?: string;
   }

   class TokenExpiredError extends OAuthClientError {}
   class InvalidGrantError extends OAuthClientError {}
   class UnauthorizedClientError extends OAuthClientError {}
   ```

### Phase 7: Framework Integrations

1. React hooks:
   ```typescript
   function useOAuth(config: OAuthClientConfig): {
     isAuthenticated: boolean;
     user: User | null;
     login: () => void;
     logout: () => void;
     getAccessToken: () => Promise<string>;
   };
   ```

2. Svelte stores:
   ```typescript
   function createOAuthStore(config: OAuthClientConfig): {
     isAuthenticated: Readable<boolean>;
     user: Readable<User | null>;
     login: () => void;
     logout: () => void;
   };
   ```

## API Design

```typescript
// Simple usage
const client = new OAuthClient({
  issuer: 'https://auth.example.com',
  clientId: 'my-app',
  redirectUri: 'https://app.example.com/callback',
});

// Authorization code flow
const { url, codeVerifier } = client.createAuthorizationUrl();
// ... user redirects and returns with code
const tokens = await client.exchangeCode(code, codeVerifier);

// Client credentials flow
const ccClient = new ClientCredentialsClient({
  issuer: 'https://auth.example.com',
  clientId: 'service-account',
  clientSecret: 'secret',
});
const token = await ccClient.getValidToken();

// Device flow
const deviceClient = new DeviceAuthorizationClient({...});
const { user_code, verification_uri } = await deviceClient.requestDeviceAuthorization();
console.log(`Go to ${verification_uri} and enter: ${user_code}`);
const tokens = await deviceClient.pollForToken(device_code);
```

## Open Questions

1. **Bundle Size**: How to minimize bundle size for browser usage?
2. **Tree Shaking**: Ensure all features are tree-shakeable?
3. **Polyfills**: Which Web APIs to polyfill (fetch, crypto, etc.)?
4. **SSR**: How to handle server-side rendering scenarios?
5. **Native Apps**: Support for React Native / mobile apps?
6. **Popup/Iframe**: Support for popup and iframe-based flows?
7. **Silent Refresh**: Implement silent token refresh via hidden iframe?
8. **Session Sync**: Cross-tab session synchronization?
