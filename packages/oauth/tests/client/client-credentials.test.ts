import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ClientCredentialsClient } from "../../src/client/client-credentials.js";
import { ConfigurationError } from "../../src/client/errors.js";
import {
  createMockFetch,
  createJsonResponse,
  mockMetadata,
  mockTokenResponse,
  createMockTokenStore,
  createFullMockFetch,
  createStoredTokens,
  createExpiredTokens,
  createExpiringTokens,
} from "./__helpers__/mock-server.js";

describe("ClientCredentialsClient", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with valid configuration", () => {
      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
      });

      expect(client.issuer.toString()).toBe("https://auth.example.com/");
      expect(client.clientId).toBe("service-account");
    });

    it("should throw ConfigurationError when clientSecret is missing", () => {
      expect(() => {
        new ClientCredentialsClient({
          issuer: "https://auth.example.com",
          clientId: "service-account",
          // @ts-expect-error - testing runtime validation
          clientSecret: undefined,
          fetch: mockFetch,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when clientSecret is empty", () => {
      expect(() => {
        new ClientCredentialsClient({
          issuer: "https://auth.example.com",
          clientId: "service-account",
          clientSecret: "",
          fetch: mockFetch,
        });
      }).toThrow(ConfigurationError);
    });

    it("should accept custom refresh buffer", () => {
      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        refreshBuffer: 120,
        fetch: mockFetch,
      });

      expect(client).toBeInstanceOf(ClientCredentialsClient);
    });

    it("should accept autoRefresh option", () => {
      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        autoRefresh: false,
        fetch: mockFetch,
      });

      expect(client).toBeInstanceOf(ClientCredentialsClient);
    });
  });

  describe("getToken", () => {
    it("should request token with correct grant_type", async () => {
      const mockFetchWithValidation = createMockFetch();
      mockFetchWithValidation.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            const body = init?.body as string;
            expect(body).toContain("grant_type=client_credentials");
            expect(body).toContain("client_id=service-account");
            expect(body).toContain("client_secret=test-secret");
            return createJsonResponse(mockTokenResponse());
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithValidation,
        serverMetadata: mockMetadata,
      });

      await client.getToken();
    });

    it("should include client authentication in request", async () => {
      const mockFetchWithAuth = createMockFetch();
      mockFetchWithAuth.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          const body = init?.body as string;
          expect(body).toContain("client_secret=test-secret");
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithAuth,
        serverMetadata: mockMetadata,
      });

      await client.getToken();
    });

    it("should return token response", async () => {
      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithToken,
        serverMetadata: mockMetadata,
      });

      const result = await client.getToken();

      expect(result.access_token).toBe(tokenResponse.access_token);
      expect(result.token_type).toBe("Bearer");
    });

    it("should include scopes in request", async () => {
      const mockFetchWithScopes = createMockFetch();
      mockFetchWithScopes.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          const body = init?.body as string;
          expect(body).toContain("scope=read+write");
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithScopes,
        serverMetadata: mockMetadata,
      });

      await client.getToken(["read", "write"]);
    });

    it("should use default scopes when not specified", async () => {
      const mockFetchWithDefaultScopes = createMockFetch();
      mockFetchWithDefaultScopes.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            const body = init?.body as string;
            expect(body).toContain("scope=api%3Aread+api%3Awrite");
            return createJsonResponse(mockTokenResponse());
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        scopes: ["api:read", "api:write"],
        fetch: mockFetchWithDefaultScopes,
        serverMetadata: mockMetadata,
      });

      await client.getToken();
    });

    it("should store tokens after successful request", async () => {
      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithToken,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      await client.getToken();

      expect(mockTokenStore.set).toHaveBeenCalled();
    });
  });

  describe("getValidToken", () => {
    it("should return cached token when valid", async () => {
      const validTokens = createStoredTokens();
      mockTokenStore._store.set("service-account", validTokens);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const token = await client.getValidToken();

      expect(token).toBe(validTokens.accessToken);
      // Should not call token endpoint
      expect(
        mockFetch.mock.calls.filter((call) => call[0].toString().includes("/token")),
      ).toHaveLength(0);
    });

    it("should request new token when no cached token exists", async () => {
      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithToken,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const token = await client.getValidToken();

      expect(token).toBe(tokenResponse.access_token);
    });

    it("should request new token when cached token is expired", async () => {
      const expiredTokens = createExpiredTokens();
      mockTokenStore._store.set("service-account", expiredTokens);

      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithToken,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const token = await client.getValidToken();

      expect(token).toBe(tokenResponse.access_token);
    });

    it("should proactively refresh when token is within refresh buffer", async () => {
      // Token expires in 30 seconds, but buffer is 60 seconds (default)
      const expiringTokens = createExpiringTokens(30);
      mockTokenStore._store.set("service-account", expiringTokens);

      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithToken,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
      });

      const token = await client.getValidToken();

      expect(token).toBe(tokenResponse.access_token);
    });

    it("should not refresh when token is outside refresh buffer", async () => {
      // Token expires in 120 seconds, buffer is 60 seconds
      const validTokens = createExpiringTokens(120);
      mockTokenStore._store.set("service-account", validTokens);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
      });

      const token = await client.getValidToken();

      expect(token).toBe(validTokens.accessToken);
    });

    it("should try refresh token first when available", async () => {
      const expiringTokens = createExpiringTokens(30);
      expiringTokens.refreshToken = "refresh_token_123";
      mockTokenStore._store.set("service-account", expiringTokens);

      const mockFetchWithRefresh = createMockFetch();
      let refreshCalled = false;
      mockFetchWithRefresh.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            const body = init?.body as string;
            if (body.includes("grant_type=refresh_token")) {
              refreshCalled = true;
            }
            return createJsonResponse(mockTokenResponse());
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithRefresh,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
        autoRefresh: true,
      });

      await client.getValidToken();

      expect(refreshCalled).toBe(true);
    });

    it("should fallback to new token when refresh fails", async () => {
      const expiringTokens = createExpiringTokens(30);
      expiringTokens.refreshToken = "refresh_token_123";
      mockTokenStore._store.set("service-account", expiringTokens);

      const mockFetchWithFailedRefresh = createMockFetch();
      let callCount = 0;
      mockFetchWithFailedRefresh.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            callCount++;
            const body = init?.body as string;
            if (body.includes("grant_type=refresh_token")) {
              // Refresh fails
              return createJsonResponse(
                { error: "invalid_grant", error_description: "Refresh token expired" },
                400,
              );
            }
            // New token succeeds
            return createJsonResponse(mockTokenResponse());
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithFailedRefresh,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
        autoRefresh: true,
      });

      const token = await client.getValidToken();

      expect(callCount).toBe(2); // Refresh attempt + new token
      expect(token).toBeTruthy();
    });

    it("should not try refresh when autoRefresh is disabled", async () => {
      const expiringTokens = createExpiringTokens(30);
      expiringTokens.refreshToken = "refresh_token_123";
      mockTokenStore._store.set("service-account", expiringTokens);

      const mockFetchWithNoRefresh = createMockFetch();
      mockFetchWithNoRefresh.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            const body = init?.body as string;
            expect(body).toContain("grant_type=client_credentials");
            expect(body).not.toContain("grant_type=refresh_token");
            return createJsonResponse(mockTokenResponse());
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetchWithNoRefresh,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
        autoRefresh: false,
      });

      await client.getValidToken();
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return true when no token exists", async () => {
      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.isTokenExpiringSoon();
      expect(result).toBe(true);
    });

    it("should return true when token is within refresh buffer", async () => {
      const expiringTokens = createExpiringTokens(30);
      mockTokenStore._store.set("service-account", expiringTokens);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
      });

      const result = await client.isTokenExpiringSoon();
      expect(result).toBe(true);
    });

    it("should return false when token is not expiring soon", async () => {
      const validTokens = createExpiringTokens(120);
      mockTokenStore._store.set("service-account", validTokens);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
        refreshBuffer: 60,
      });

      const result = await client.isTokenExpiringSoon();
      expect(result).toBe(false);
    });
  });

  describe("getTokenExpiresIn", () => {
    it("should return 0 when no token exists", async () => {
      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.getTokenExpiresIn();
      expect(result).toBe(0);
    });

    it("should return remaining seconds when token exists", async () => {
      const validTokens = createExpiringTokens(3600);
      mockTokenStore._store.set("service-account", validTokens);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.getTokenExpiresIn();
      expect(result).toBeGreaterThan(3590);
      expect(result).toBeLessThanOrEqual(3600);
    });

    it("should return 0 when token is expired", async () => {
      const expiredTokens = createExpiredTokens();
      mockTokenStore._store.set("service-account", expiredTokens);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "service-account",
        clientSecret: "test-secret",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.getTokenExpiresIn();
      expect(result).toBe(0);
    });
  });
});
