/**
 * Token Security Tests
 *
 * Tests for access token and refresh token security as specified in RFC 9700 Sections 4.10-4.13
 * @see https://datatracker.ietf.org/doc/rfc9700/
 */
import { describe, expect, it, beforeEach } from "vitest";
import type { StoredTokens } from "../../../src/client/types.js";
import { AuthorizationCodeClient } from "../../../src/client/authorization-code.js";
import { ClientCredentialsClient } from "../../../src/client/client-credentials.js";
import {
  createFullMockFetch,
  createMockTokenStore,
  mockMetadata,
  createJsonResponse,
} from "../__helpers__/mock-server.js";

describe("Token Security (RFC 9700 Sections 4.10-4.13)", () => {
  let mockFetch: ReturnType<typeof createFullMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  describe("access token handling", () => {
    it("should store access tokens securely", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Token should be stored via tokenStore.set
      expect(mockTokenStore.set).toHaveBeenCalled();
    });

    it("should not expose access token in URLs", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();
      const urlString = result.url.toString();

      // Access token should never appear in authorization URL
      expect(urlString).not.toContain("access_token");
      expect(urlString).not.toContain("bearer");
    });

    it("should track token expiration", async () => {
      const expiresIn = 3600; // 1 hour
      const mockFetchWithExpiry = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          return createJsonResponse(
            {
              access_token: "access_token_123",
              token_type: "Bearer",
              expires_in: expiresIn,
              refresh_token: "refresh_token",
            },
            200,
          );
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithExpiry,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Verify expiration was stored
      const storedTokens = mockTokenStore.set.mock.calls[0][1] as StoredTokens;
      expect(storedTokens.expiresAt).toBeInstanceOf(Date);

      // Expiration should be approximately expires_in seconds from now
      const expectedExpiry = Date.now() + expiresIn * 1000;
      const actualExpiry = storedTokens.expiresAt.getTime();
      expect(actualExpiry).toBeGreaterThan(expectedExpiry - 5000); // Allow 5s tolerance
      expect(actualExpiry).toBeLessThan(expectedExpiry + 5000);
    });

    it("should return null for expired access token", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Set up expired token
      mockTokenStore.get.mockResolvedValue({
        accessToken: "expired_token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        refreshToken: "refresh_token",
      });

      const token = await client.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe("refresh token handling", () => {
    it("should store refresh tokens securely", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Refresh token should be stored
      const storedTokens = mockTokenStore.set.mock.calls[0][1] as StoredTokens;
      expect(storedTokens.refreshToken).toBeDefined();
    });

    it("should handle refresh token rotation", async () => {
      let refreshCount = 0;
      const rotatingFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          const body = new URLSearchParams(init?.body as string);
          if (body.get("grant_type") === "refresh_token") {
            refreshCount++;
            // Return new refresh token (rotation)
            return createJsonResponse(
              {
                access_token: `access_token_${refreshCount}`,
                token_type: "Bearer",
                expires_in: 3600,
                refresh_token: `refresh_token_${refreshCount}`, // New token
              },
              200,
            );
          }
          return createJsonResponse(
            {
              access_token: "access_token_initial",
              token_type: "Bearer",
              expires_in: 3600,
              refresh_token: "refresh_token_0",
            },
            200,
          );
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: rotatingFetch,
        tokenStore: mockTokenStore,
      });

      // Initial token acquisition
      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Set up stored tokens to enable refresh
      mockTokenStore.get.mockResolvedValue({
        accessToken: "access_token_initial",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() - 1000), // Expired
        refreshToken: "refresh_token_0",
      });

      // Refresh
      await client.refreshAccessToken();

      // New tokens should be stored
      expect(mockTokenStore.set).toHaveBeenCalledTimes(2);
      const rotatedTokens = mockTokenStore.set.mock.calls[1][1] as StoredTokens;
      expect(rotatedTokens.accessToken).toBe("access_token_1");
      expect(rotatedTokens.refreshToken).toBe("refresh_token_1");
    });

    it("should not include refresh token in authorization URL", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();
      const urlString = result.url.toString();

      expect(urlString).not.toContain("refresh_token");
    });
  });

  describe("token revocation", () => {
    it("should revoke access token when requested", async () => {
      let revokedToken: string | null = null;

      const revokeFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/revoke")) {
          const body = new URLSearchParams(init?.body as string);
          revokedToken = body.get("token");
          return new Response("", { status: 200 });
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: revokeFetch,
        tokenStore: mockTokenStore,
      });

      await client.revokeToken("token_to_revoke");

      expect(revokedToken).toBe("token_to_revoke");
    });

    it("should clear stored tokens on logout", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      mockTokenStore.get.mockResolvedValue({
        accessToken: "access_token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 3600000),
        refreshToken: "refresh_token",
      });

      await client.logout();

      expect(mockTokenStore.clear).toHaveBeenCalled();
    });

    it("should include token_type_hint in revocation request", async () => {
      let capturedHint: string | null = null;

      const revokeFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/revoke")) {
          const body = new URLSearchParams(init?.body as string);
          capturedHint = body.get("token_type_hint");
          return new Response("", { status: 200 });
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: revokeFetch,
        tokenStore: mockTokenStore,
      });

      await client.revokeToken("token", "refresh_token");

      expect(capturedHint).toBe("refresh_token");
    });
  });

  describe("client credentials token handling", () => {
    it("should proactively refresh before expiration", async () => {
      let tokenRequestCount = 0;

      const clientCredentialsFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          tokenRequestCount++;
          return createJsonResponse(
            {
              access_token: `access_token_${tokenRequestCount}`,
              token_type: "Bearer",
              expires_in: 120, // 2 minutes
            },
            200,
          );
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: clientCredentialsFetch,
        tokenStore: mockTokenStore,
        refreshBuffer: 60, // Refresh 60 seconds before expiry
      });

      // First request - get new token
      await client.getValidToken();
      expect(tokenRequestCount).toBe(1);

      // Set up token that's within refresh buffer (59 seconds remaining)
      mockTokenStore.get.mockResolvedValue({
        accessToken: "access_token_1",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 59000), // 59 seconds from now
      });

      // Should proactively refresh
      await client.getValidToken();
      expect(tokenRequestCount).toBe(2);
    });

    it("should cache valid tokens", async () => {
      let tokenRequestCount = 0;

      const clientCredentialsFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          tokenRequestCount++;
          return createJsonResponse(
            {
              access_token: `access_token_${tokenRequestCount}`,
              token_type: "Bearer",
              expires_in: 3600, // 1 hour
            },
            200,
          );
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: clientCredentialsFetch,
        tokenStore: mockTokenStore,
      });

      // First request
      await client.getValidToken();
      expect(tokenRequestCount).toBe(1);

      // Set up valid cached token
      mockTokenStore.get.mockResolvedValue({
        accessToken: "access_token_1",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });

      // Should use cached token
      const cachedToken = await client.getValidToken();
      expect(tokenRequestCount).toBe(1); // No new request
      expect(cachedToken).toBe("access_token_1");
    });
  });

  describe("token validation", () => {
    it("should check token validity before use", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Valid token
      mockTokenStore.get.mockResolvedValue({
        accessToken: "valid_token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(await client.isAuthenticated()).toBe(true);

      // Expired token
      mockTokenStore.get.mockResolvedValue({
        accessToken: "expired_token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() - 1000),
      });

      expect(await client.isAuthenticated()).toBe(false);
    });

    it("should support token introspection", async () => {
      const introspectFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/introspect")) {
          const body = new URLSearchParams(init?.body as string);
          const token = body.get("token");
          return createJsonResponse(
            {
              active: token === "valid_token",
              token_type: "Bearer",
              scope: "read write",
              client_id: "test-client",
              exp: Math.floor(Date.now() / 1000) + 3600,
            },
            200,
          );
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: introspectFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.introspect("valid_token");
      expect(result.active).toBe(true);
    });
  });
});
