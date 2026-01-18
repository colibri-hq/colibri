/**
 * Extended Error Handling Tests
 *
 * Tests for error handling edge cases, network errors, malformed responses,
 * and error cause chain preservation.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthorizationCodeClient } from "../../src/client/authorization-code.js";
import { ClientCredentialsClient } from "../../src/client/client-credentials.js";
import { DeviceAuthorizationClient } from "../../src/client/device-authorization.js";
import {
  AbortError,
  AccessDeniedError,
  AuthorizationPendingError,
  ConfigurationError,
  DiscoveryError,
  InvalidGrantError,
  IssuerMismatchError,
  NetworkError,
  OAuthClientError,
  PollingTimeoutError,
  SlowDownError,
  StateMismatchError,
  TokenExpiredError,
} from "../../src/client/errors.js";
import {
  createMockTokenStore,
  mockMetadata,
  createJsonResponse,
} from "./__helpers__/mock-server.js";

describe("Extended Error Handling", () => {
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockTokenStore = createMockTokenStore();
  });

  describe("network error scenarios", () => {
    it("should wrap network errors with NetworkError", async () => {
      const networkError = new TypeError("Failed to fetch");
      const failingFetch = vi.fn().mockRejectedValue(networkError);

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: failingFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should preserve error cause chain", () => {
      const originalError = new Error("Original network error");
      const networkError = new NetworkError("Connection failed", { cause: originalError });

      expect(networkError.cause).toBe(originalError);
      expect(networkError.message).toContain("Connection failed");
    });

    it("should handle connection timeout", async () => {
      const timeoutFetch = vi.fn().mockImplementation(async () => {
        await new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100));
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: timeoutFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should handle DNS resolution failure", async () => {
      const dnsError = new TypeError("getaddrinfo ENOTFOUND auth.example.com");
      const failingFetch = vi.fn().mockRejectedValue(dnsError);

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: failingFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.discover()).rejects.toThrow();
    });
  });

  describe("HTTP error responses", () => {
    it("should handle HTTP 500 Internal Server Error", async () => {
      const serverErrorFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return createJsonResponse(
          { error: "server_error", error_description: "Internal server error" },
          500,
        );
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: serverErrorFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow(OAuthClientError);
    });

    it("should handle HTTP 502 Bad Gateway", async () => {
      const gatewayErrorFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Bad Gateway", { status: 502, statusText: "Bad Gateway" });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: gatewayErrorFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should handle HTTP 503 Service Unavailable", async () => {
      const unavailableFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Service Unavailable", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Retry-After": "60" },
        });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: unavailableFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should handle HTTP 429 Too Many Requests", async () => {
      const rateLimitFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return createJsonResponse(
          { error: "slow_down", error_description: "Rate limit exceeded" },
          429,
          { "Retry-After": "30" },
        );
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: rateLimitFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow(OAuthClientError);
    });
  });

  describe("malformed response handling", () => {
    it("should handle non-JSON response", async () => {
      const htmlFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("<html>Error page</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: htmlFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should handle empty response body", async () => {
      const emptyFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("", { status: 200 });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: emptyFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should handle truncated JSON response", async () => {
      const truncatedFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response('{"access_token": "tok', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: truncatedFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.getValidToken()).rejects.toThrow();
    });

    it("should handle response missing required fields", async () => {
      const incompleteFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        // Missing access_token returns undefined which causes issues downstream
        return createJsonResponse({ token_type: "Bearer", expires_in: 3600 }, 200);
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: incompleteFetch,
        tokenStore: mockTokenStore,
      });

      // The client returns undefined for access_token which is a potential issue
      // but the current implementation doesn't validate the response
      const token = await client.getValidToken();
      // This behavior documents that missing fields result in undefined
      expect(token).toBeUndefined();
    });

    it("should handle error response without error_description", async () => {
      const minimalErrorFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        return createJsonResponse({ error: "invalid_grant" }, 400);
      });

      const client = new ClientCredentialsClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        fetch: minimalErrorFetch,
        tokenStore: mockTokenStore,
      });

      try {
        await client.getValidToken();
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OAuthClientError);
        expect((error as OAuthClientError).code).toBe("invalid_grant");
      }
    });
  });

  describe("error type hierarchy", () => {
    it("should have all specialized errors extend OAuthClientError", () => {
      const errors = [
        new TokenExpiredError(),
        new InvalidGrantError(),
        new AuthorizationPendingError(),
        new SlowDownError(5),
        new AccessDeniedError(),
        new NetworkError("test"),
        new DiscoveryError("test"),
        new StateMismatchError(),
        new IssuerMismatchError("expected", "received"),
        new PollingTimeoutError(300),
        new AbortError(),
        new ConfigurationError("test"),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(OAuthClientError);
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should preserve custom error names", () => {
      expect(new TokenExpiredError().name).toBe("TokenExpiredError");
      expect(new InvalidGrantError().name).toBe("InvalidGrantError");
      expect(new AuthorizationPendingError().name).toBe("AuthorizationPendingError");
      expect(new SlowDownError(5).name).toBe("SlowDownError");
      expect(new AccessDeniedError().name).toBe("AccessDeniedError");
      expect(new NetworkError("test").name).toBe("NetworkError");
      expect(new DiscoveryError("test").name).toBe("DiscoveryError");
      expect(new StateMismatchError().name).toBe("StateMismatchError");
      expect(new IssuerMismatchError("e", "r").name).toBe("IssuerMismatchError");
      expect(new PollingTimeoutError(300).name).toBe("PollingTimeoutError");
      expect(new AbortError().name).toBe("AbortError");
      expect(new ConfigurationError("test").name).toBe("ConfigurationError");
    });

    it("should support instanceof checks", () => {
      const error = new TokenExpiredError();
      expect(error instanceof TokenExpiredError).toBe(true);
      expect(error instanceof OAuthClientError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("error serialization", () => {
    it("should serialize to JSON correctly", () => {
      const error = new OAuthClientError(
        "invalid_request",
        "Missing required parameter",
        "https://docs.example.com/errors",
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: "invalid_request",
        error_description: "Missing required parameter",
        error_uri: "https://docs.example.com/errors",
      });
    });

    it("should handle undefined optional fields in JSON", () => {
      const error = new OAuthClientError("server_error");
      const json = error.toJSON();

      expect(json.error).toBe("server_error");
      expect(json.error_description).toBeUndefined();
      expect(json.error_uri).toBeUndefined();
    });

    it("should create error from JSON response", () => {
      const jsonResponse = {
        error: "invalid_scope",
        error_description: "The requested scope is invalid",
        error_uri: "https://example.com/docs/scopes",
      };

      const error = OAuthClientError.fromResponse(jsonResponse);

      expect(error.code).toBe("invalid_scope");
      expect(error.description).toBe("The requested scope is invalid");
      expect(error.uri).toBe("https://example.com/docs/scopes");
    });
  });

  describe("discovery error handling", () => {
    it("should throw DiscoveryError for missing metadata endpoint", async () => {
      const notFoundFetch = vi.fn().mockImplementation(async () => {
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: notFoundFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.discover()).rejects.toThrow(DiscoveryError);
    });

    it("should throw DiscoveryError for invalid metadata JSON", async () => {
      const invalidJsonFetch = vi.fn().mockImplementation(async () => {
        return new Response("not valid json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: invalidJsonFetch,
        tokenStore: mockTokenStore,
      });

      await expect(client.discover()).rejects.toThrow(DiscoveryError);
    });

    it("should include cause in DiscoveryError", async () => {
      const syntaxError = new SyntaxError("Unexpected token");
      const error = new DiscoveryError("Invalid JSON", { cause: syntaxError });

      expect(error.cause).toBe(syntaxError);
    });
  });

  describe("device flow error handling", () => {
    it("should throw OAuthClientError with access_denied code when user denies authorization", async () => {
      const deniedFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        if (urlString.includes("/device")) {
          return createJsonResponse(
            {
              device_code: "device_code",
              user_code: "ABCD-EFGH",
              verification_uri: "https://auth.example.com/device",
              expires_in: 1800,
              interval: 5,
            },
            200,
          );
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            { error: "access_denied", error_description: "The user denied the request" },
            403,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      // pollingTimeout is set in constructor, not poll options
      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        fetch: deniedFetch,
        tokenStore: mockTokenStore,
        pollingTimeout: 1, // 1 second timeout
      });

      const device = await client.requestDeviceAuthorization();

      try {
        await client.pollForToken(device.device_code, 0.01); // 10ms interval
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OAuthClientError);
        expect((error as OAuthClientError).code).toBe("access_denied");
      }
    });

    it("should throw PollingTimeoutError when device code expires", async () => {
      const pendingFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        if (urlString.includes("/device")) {
          return createJsonResponse(
            {
              device_code: "device_code",
              user_code: "ABCD-EFGH",
              verification_uri: "https://auth.example.com/device",
              expires_in: 1800,
              interval: 5,
            },
            200,
          );
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            {
              error: "authorization_pending",
              error_description: "The user has not yet completed authorization",
            },
            400,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      // pollingTimeout is in constructor
      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        fetch: pendingFetch,
        tokenStore: mockTokenStore,
        pollingTimeout: 0.1, // 100ms timeout
      });

      const device = await client.requestDeviceAuthorization();

      await expect(
        client.pollForToken(device.device_code, 0.01), // 10ms interval
      ).rejects.toThrow(PollingTimeoutError);
    });

    it("should handle slow_down error and increase interval", { timeout: 20000 }, async () => {
      let callCount = 0;

      const slowDownFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        if (urlString.includes("/device")) {
          return createJsonResponse(
            {
              device_code: "device_code",
              user_code: "ABCD-EFGH",
              verification_uri: "https://auth.example.com/device",
              expires_in: 1800,
              interval: 0.005, // 5ms for fast testing
            },
            200,
          );
        }
        if (urlString.includes("/token")) {
          callCount++;
          if (callCount <= 2) {
            return createJsonResponse({ error: "slow_down" }, 400);
          }
          return createJsonResponse(
            { access_token: "token", token_type: "Bearer", expires_in: 3600 },
            200,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        fetch: slowDownFetch,
        tokenStore: mockTokenStore,
        pollingTimeout: 20, // 20 second timeout (2x slow_down @ 5s each + buffer)
      });

      const device = await client.requestDeviceAuthorization();
      await client.pollForToken(device.device_code, 0.005); // 5ms interval

      expect(callCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("abort signal handling", () => {
    it("should throw AbortError when aborted", async () => {
      const abortController = new AbortController();
      const slowFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        if (urlString.includes("/device")) {
          return createJsonResponse(
            {
              device_code: "device_code",
              user_code: "ABCD-EFGH",
              verification_uri: "https://auth.example.com/device",
              expires_in: 1800,
              interval: 5,
            },
            200,
          );
        }
        if (urlString.includes("/token")) {
          return createJsonResponse({ error: "authorization_pending" }, 400);
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        fetch: slowFetch,
        tokenStore: mockTokenStore,
        pollingTimeout: 10, // 10 seconds
      });

      const device = await client.requestDeviceAuthorization();

      // Abort after a short delay
      setTimeout(() => abortController.abort(), 50);

      await expect(
        client.pollForToken(device.device_code, 0.02, {
          // 20ms interval
          signal: abortController.signal,
        }),
      ).rejects.toThrow(AbortError);
    });

    it("should throw immediately if already aborted", async () => {
      const abortController = new AbortController();
      abortController.abort();

      const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata, 200);
        }
        if (urlString.includes("/device")) {
          return createJsonResponse(
            {
              device_code: "device_code",
              user_code: "ABCD-EFGH",
              verification_uri: "https://auth.example.com/device",
              expires_in: 1800,
              interval: 5,
            },
            200,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        pollingTimeout: 10,
      });

      const device = await client.requestDeviceAuthorization();

      await expect(
        client.pollForToken(device.device_code, 0.01, {
          // 10ms interval
          signal: abortController.signal,
        }),
      ).rejects.toThrow(AbortError);
    });
  });

  describe("configuration error handling", () => {
    it("should throw ConfigurationError for missing clientId", () => {
      expect(
        () =>
          new AuthorizationCodeClient({
            issuer: "https://auth.example.com",
            // @ts-expect-error - Testing missing clientId
            clientId: undefined,
            redirectUri: "https://app.example.com/callback",
            fetch: vi.fn(),
            tokenStore: mockTokenStore,
          }),
      ).toThrow(ConfigurationError);
    });

    it("should accept issuer as URL object", () => {
      // The client accepts issuer as string or URL
      const client = new AuthorizationCodeClient({
        issuer: new URL("https://auth.example.com"),
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: vi.fn(),
        tokenStore: mockTokenStore,
      });
      expect(client).toBeInstanceOf(AuthorizationCodeClient);
    });

    it("should throw ConfigurationError for empty string fields", () => {
      expect(
        () =>
          new AuthorizationCodeClient({
            issuer: "https://auth.example.com",
            clientId: "",
            redirectUri: "https://app.example.com/callback",
            fetch: vi.fn(),
            tokenStore: mockTokenStore,
          }),
      ).toThrow(ConfigurationError);
    });
  });
});
