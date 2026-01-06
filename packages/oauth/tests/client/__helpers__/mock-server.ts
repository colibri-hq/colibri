/**
 * Test helper utilities for mocking OAuth server responses
 */
import { vi } from "vitest";
import type { AuthorizationServerMetadata, OAuthErrorCode, TokenPayload } from "../../../src/types.js";
import type { OAuthErrorResponse, StoredTokens } from "../../../src/client/types.js";

/**
 * Mock authorization server metadata
 */
export const mockMetadata: AuthorizationServerMetadata = {
  issuer: "https://auth.example.com",
  authorization_endpoint: "https://auth.example.com/authorize",
  token_endpoint: "https://auth.example.com/token",
  device_authorization_endpoint: "https://auth.example.com/device/code",
  revocation_endpoint: "https://auth.example.com/revoke",
  introspection_endpoint: "https://auth.example.com/introspect",
  userinfo_endpoint: "https://auth.example.com/userinfo",
  pushed_authorization_request_endpoint: "https://auth.example.com/par",
  jwks_uri: "https://auth.example.com/.well-known/jwks.json",
  response_types_supported: ["code"],
  grant_types_supported: [
    "authorization_code",
    "refresh_token",
    "client_credentials",
    "urn:ietf:params:oauth:grant-type:device_code",
  ],
  code_challenge_methods_supported: ["S256", "plain"],
  token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
  scopes_supported: ["openid", "profile", "email", "read", "write"],
  require_pushed_authorization_requests: false,
};

/**
 * Create a mock token response
 */
export function mockTokenResponse(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    access_token: "access_token_" + Math.random().toString(36).slice(2),
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "refresh_token_" + Math.random().toString(36).slice(2),
    scope: "openid profile",
    ...overrides,
  };
}

/**
 * Create a mock error response
 */
export function mockErrorResponse(
  error: OAuthErrorCode | string,
  description?: string,
): OAuthErrorResponse {
  return {
    error,
    error_description: description ?? `Error: ${error}`,
  };
}

/**
 * Create stored tokens for testing
 */
export function createStoredTokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
  return {
    accessToken: "access_token_123",
    refreshToken: "refresh_token_456",
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    scopes: ["openid", "profile"],
    ...overrides,
  };
}

/**
 * Create expired stored tokens for testing
 */
export function createExpiredTokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
  return createStoredTokens({
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    ...overrides,
  });
}

/**
 * Create tokens that are about to expire
 */
export function createExpiringTokens(secondsRemaining: number = 30): StoredTokens {
  return createStoredTokens({
    expiresAt: new Date(Date.now() + secondsRemaining * 1000),
  });
}

/**
 * Create a mock fetch function that returns JSON responses
 */
export function createMockFetch() {
  return vi.fn<typeof fetch>();
}

/**
 * Create a successful fetch response
 */
export function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create an error fetch response
 */
export function createErrorResponse(
  error: OAuthErrorCode | string,
  description?: string,
  status = 400,
): Response {
  return createJsonResponse(mockErrorResponse(error, description), status);
}

/**
 * Create a mock discovery response
 */
export function createDiscoveryResponse(overrides: Partial<AuthorizationServerMetadata> = {}): Response {
  return createJsonResponse({ ...mockMetadata, ...overrides });
}

/**
 * Mock fetch that handles discovery and token endpoints
 */
export function createFullMockFetch(options: {
  tokenResponse?: TokenPayload | OAuthErrorResponse;
  discoveryResponse?: AuthorizationServerMetadata;
  tokenStatus?: number;
} = {}) {
  const mockFetch = createMockFetch();

  mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
    const urlString = url.toString();

    // Handle discovery
    if (urlString.includes("/.well-known/")) {
      return createJsonResponse(options.discoveryResponse ?? mockMetadata);
    }

    // Handle token endpoint
    if (urlString.includes("/token")) {
      const response = options.tokenResponse ?? mockTokenResponse();
      const status = options.tokenStatus ?? (("error" in response) ? 400 : 200);
      return createJsonResponse(response, status);
    }

    // Handle device authorization
    if (urlString.includes("/device/code")) {
      return createJsonResponse({
        device_code: "device_code_123",
        user_code: "USER-CODE",
        verification_uri: "https://auth.example.com/device",
        verification_uri_complete: "https://auth.example.com/device?user_code=USER-CODE",
        expires_in: 600,
        interval: 5,
      });
    }

    // Handle revocation (empty response)
    if (urlString.includes("/revoke")) {
      return new Response(null, { status: 200 });
    }

    // Handle introspection
    if (urlString.includes("/introspect")) {
      return createJsonResponse({
        active: true,
        scope: "openid profile",
        client_id: "test-client",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
    }

    // Handle PAR
    if (urlString.includes("/par")) {
      return createJsonResponse({
        request_uri: "urn:ietf:params:oauth:request_uri:abc123",
        expires_in: 60,
      });
    }

    // Default: 404
    return new Response("Not Found", { status: 404 });
  });

  return mockFetch;
}

/**
 * Create a mock token store for testing
 */
export function createMockTokenStore() {
  const store = new Map<string, StoredTokens>();

  return {
    get: vi.fn(async (clientId: string) => store.get(clientId) ?? null),
    set: vi.fn(async (clientId: string, tokens: StoredTokens) => {
      store.set(clientId, tokens);
    }),
    clear: vi.fn(async (clientId: string) => {
      store.delete(clientId);
    }),
    clearAll: vi.fn(async () => {
      store.clear();
    }),
    _store: store, // Expose for testing
  };
}

/**
 * Create mock localStorage for testing
 */
export function createMockStorage(): Storage {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}
