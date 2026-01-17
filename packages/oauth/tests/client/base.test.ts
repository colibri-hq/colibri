import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthorizationCodeClient } from "../../src/client/authorization-code.js";
import {
  ConfigurationError,
  DiscoveryError,
  NetworkError,
  TokenExpiredError,
} from "../../src/client/errors.js";
import {
  createMockFetch,
  createJsonResponse,
  mockMetadata,
  mockTokenResponse,
  createMockTokenStore,
  createStoredTokens,
  createExpiredTokens,
  createFullMockFetch,
} from "./__helpers__/mock-server.js";

/**
 * Tests for OAuthClientBase using AuthorizationCodeClient as a concrete implementation
 */
describe("OAuthClientBase", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("discover", () => {
    it("should discover server metadata from .well-known endpoint", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
      });

      const metadata = await client.discover();

      expect(metadata.issuer).toBe("https://auth.example.com");
      expect(metadata.token_endpoint).toBe("https://auth.example.com/token");
    });

    it("should cache metadata after first discovery", async () => {
      const mockFetchWithCount = createMockFetch();
      let discoveryCount = 0;
      mockFetchWithCount.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          discoveryCount++;
          return createJsonResponse(mockMetadata);
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithCount,
      });

      await client.discover();
      await client.discover();
      await client.discover();

      expect(discoveryCount).toBe(1);
    });

    it("should deduplicate concurrent discovery requests", async () => {
      const mockFetchWithDelay = createMockFetch();
      let discoveryCount = 0;
      mockFetchWithDelay.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          discoveryCount++;
          await new Promise((resolve) => setTimeout(resolve, 100));
          return createJsonResponse(mockMetadata);
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithDelay,
      });

      // Start multiple concurrent discoveries
      const [result1, result2, result3] = await Promise.all([
        client.discover(),
        client.discover(),
        client.discover(),
      ]);

      expect(discoveryCount).toBe(1);
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should use provided serverMetadata and skip discovery", async () => {
      const mockFetchNeverCalled = createMockFetch();

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchNeverCalled,
        serverMetadata: mockMetadata,
      });

      const metadata = await client.discover();

      expect(metadata).toBe(mockMetadata);
      expect(mockFetchNeverCalled).not.toHaveBeenCalled();
    });

    it("should throw ConfigurationError when discovery is disabled and no metadata provided", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        useDiscovery: false,
      });

      await expect(client.createAuthorizationUrl()).rejects.toThrow(ConfigurationError);
    });
  });

  describe("getAccessToken", () => {
    it("should return stored access token when valid", async () => {
      const validTokens = createStoredTokens();
      mockTokenStore._store.set("test-client", validTokens);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const token = await client.getAccessToken();

      expect(token).toBe(validTokens.accessToken);
    });

    it("should return null when no tokens stored", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const token = await client.getAccessToken();

      expect(token).toBeNull();
    });

    it("should return null when token is expired", async () => {
      const expiredTokens = createExpiredTokens();
      mockTokenStore._store.set("test-client", expiredTokens);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const token = await client.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when valid token exists", async () => {
      const validTokens = createStoredTokens();
      mockTokenStore._store.set("test-client", validTokens);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.isAuthenticated();

      expect(result).toBe(true);
    });

    it("should return false when no token exists", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.isAuthenticated();

      expect(result).toBe(false);
    });

    it("should return false when token is expired", async () => {
      const expiredTokens = createExpiredTokens();
      mockTokenStore._store.set("test-client", expiredTokens);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe("getStoredTokens", () => {
    it("should return stored tokens", async () => {
      const validTokens = createStoredTokens();
      mockTokenStore._store.set("test-client", validTokens);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const tokens = await client.getStoredTokens();

      expect(tokens).toBe(validTokens);
    });

    it("should return null when no tokens stored", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const tokens = await client.getStoredTokens();

      expect(tokens).toBeNull();
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token using refresh_token grant", async () => {
      const tokensWithRefresh = createStoredTokens({ refreshToken: "refresh_token_123" });
      mockTokenStore._store.set("test-client", tokensWithRefresh);

      const newTokenResponse = mockTokenResponse();
      const mockFetchWithRefresh = createMockFetch();
      mockFetchWithRefresh.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            const body = init?.body as string;
            expect(body).toContain("grant_type=refresh_token");
            expect(body).toContain("refresh_token=refresh_token_123");
            return createJsonResponse(newTokenResponse);
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithRefresh,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.refreshAccessToken();

      expect(result.access_token).toBe(newTokenResponse.access_token);
    });

    it("should store new tokens after refresh", async () => {
      const tokensWithRefresh = createStoredTokens({ refreshToken: "refresh_token_123" });
      mockTokenStore._store.set("test-client", tokensWithRefresh);

      const newTokenResponse = mockTokenResponse();
      const mockFetchWithRefresh = createFullMockFetch({ tokenResponse: newTokenResponse });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithRefresh,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await client.refreshAccessToken();

      expect(mockTokenStore.set).toHaveBeenCalled();
    });

    it("should throw TokenExpiredError when no refresh token available", async () => {
      const tokensWithoutRefresh = createStoredTokens({ refreshToken: undefined });
      mockTokenStore._store.set("test-client", tokensWithoutRefresh);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await expect(client.refreshAccessToken()).rejects.toThrow(TokenExpiredError);
    });

    it("should throw TokenExpiredError when no tokens stored", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await expect(client.refreshAccessToken()).rejects.toThrow(TokenExpiredError);
    });
  });

  describe("revokeToken", () => {
    it("should call revocation endpoint", async () => {
      const mockFetchWithRevoke = createMockFetch();
      let revokeCalled = false;
      mockFetchWithRevoke.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/revoke")) {
          revokeCalled = true;
          const body = init?.body as string;
          expect(body).toContain("token=access_token_to_revoke");
          return new Response(null, { status: 200 });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithRevoke,
        serverMetadata: mockMetadata,
      });

      await client.revokeToken("access_token_to_revoke");

      expect(revokeCalled).toBe(true);
    });

    it("should include token_type_hint when provided", async () => {
      const mockFetchWithRevoke = createMockFetch();
      mockFetchWithRevoke.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/revoke")) {
          const body = init?.body as string;
          expect(body).toContain("token_type_hint=refresh_token");
          return new Response(null, { status: 200 });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithRevoke,
        serverMetadata: mockMetadata,
      });

      await client.revokeToken("refresh_token_123", "refresh_token");
    });

    it("should throw ConfigurationError when server doesn't support revocation", async () => {
      const metadataWithoutRevocation = { ...mockMetadata, revocation_endpoint: undefined };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: metadataWithoutRevocation,
      });

      await expect(client.revokeToken("token")).rejects.toThrow(ConfigurationError);
    });
  });

  describe("introspect", () => {
    it("should return introspection response", async () => {
      const mockFetchWithIntrospect = createMockFetch();
      mockFetchWithIntrospect.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/introspect")) {
          return createJsonResponse({
            active: true,
            scope: "openid profile",
            client_id: "test-client",
            exp: Math.floor(Date.now() / 1000) + 3600,
            sub: "user123",
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithIntrospect,
        serverMetadata: mockMetadata,
      });

      const result = await client.introspect("access_token_123");

      expect(result.active).toBe(true);
      expect(result.scope).toBe("openid profile");
      expect(result.sub).toBe("user123");
    });

    it("should throw ConfigurationError when server doesn't support introspection", async () => {
      const metadataWithoutIntrospection = { ...mockMetadata, introspection_endpoint: undefined };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: metadataWithoutIntrospection,
      });

      await expect(client.introspect("token")).rejects.toThrow(ConfigurationError);
    });
  });

  describe("logout", () => {
    it("should clear stored tokens", async () => {
      const validTokens = createStoredTokens();
      mockTokenStore._store.set("test-client", validTokens);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await client.logout();

      expect(mockTokenStore.clear).toHaveBeenCalledWith("test-client");
    });

    it("should attempt to revoke tokens before clearing", async () => {
      const tokensWithRefresh = createStoredTokens({ refreshToken: "refresh_token_123" });
      mockTokenStore._store.set("test-client", tokensWithRefresh);

      const revokedTokens: string[] = [];
      const mockFetchWithRevoke = createMockFetch();
      mockFetchWithRevoke.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/revoke")) {
          const body = init?.body as string;
          const tokenMatch = body.match(/token=([^&]+)/);
          if (tokenMatch) {
            revokedTokens.push(decodeURIComponent(tokenMatch[1]!));
          }
          return new Response(null, { status: 200 });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithRevoke,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await client.logout();

      expect(revokedTokens).toContain("refresh_token_123");
      expect(revokedTokens).toContain(tokensWithRefresh.accessToken);
    });

    it("should continue clearing tokens even if revocation fails", async () => {
      const validTokens = createStoredTokens();
      mockTokenStore._store.set("test-client", validTokens);

      const mockFetchWithFailingRevoke = createMockFetch();
      mockFetchWithFailingRevoke.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/revoke")) {
          return createJsonResponse({ error: "server_error" }, 500);
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithFailingRevoke,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await client.logout(); // Should not throw

      expect(mockTokenStore.clear).toHaveBeenCalled();
    });
  });

  describe("request error handling", () => {
    it("should throw DiscoveryError with NetworkError cause on fetch failure", async () => {
      const mockFetchWithNetworkError = createMockFetch();
      mockFetchWithNetworkError.mockRejectedValue(new Error("Network unreachable"));

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithNetworkError,
      });

      await expect(client.discover()).rejects.toThrow(DiscoveryError);

      try {
        await client.discover();
      } catch (error) {
        expect(error).toBeInstanceOf(DiscoveryError);
        // NetworkError is in the cause chain
        expect((error as DiscoveryError).cause).toBeInstanceOf(NetworkError);
      }
    });

    it("should preserve original error in cause chain", async () => {
      const originalError = new Error("Connection refused");
      const mockFetchWithError = createMockFetch();
      mockFetchWithError.mockRejectedValue(originalError);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithError,
      });

      try {
        await client.discover();
      } catch (error) {
        expect(error).toBeInstanceOf(DiscoveryError);
        const discoveryError = error as DiscoveryError;
        // The cause chain is: DiscoveryError -> NetworkError -> originalError
        expect(discoveryError.cause).toBeInstanceOf(NetworkError);
        expect((discoveryError.cause as NetworkError).cause).toBe(originalError);
      }
    });

    it("should throw DiscoveryError on non-JSON error response", async () => {
      const mockFetchWithHtmlError = createMockFetch();
      mockFetchWithHtmlError.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return new Response("<html>Server Error</html>", {
            status: 500,
            headers: { "Content-Type": "text/html" },
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithHtmlError,
      });

      await expect(client.discover()).rejects.toThrow(DiscoveryError);
    });

    it("should throw NetworkError on token request failure", async () => {
      // Test NetworkError directly by triggering error after discovery succeeds
      const mockFetch = createFullMockFetch({
        tokenResponse: undefined, // Will cause error
        tokenStatus: 500,
      });
      // Override to simulate network error on token request
      const originalFetch = mockFetch as ReturnType<typeof vi.fn>;
      originalFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        if (urlString.includes("/token")) {
          throw new Error("Network error during token request");
        }
        return new Response("Not Found", { status: 404 });
      });

      const mockTokenStore = createMockTokenStore();
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Set up tokens to trigger refresh
      mockTokenStore.get.mockResolvedValue({
        accessToken: "expired-token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() - 1000), // Expired
        refreshToken: "refresh-token",
      });

      await expect(client.refreshAccessToken()).rejects.toThrow(NetworkError);
    });
  });
});
