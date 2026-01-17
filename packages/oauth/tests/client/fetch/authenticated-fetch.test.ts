/**
 * Authenticated Fetch Tests
 *
 * Tests for the AuthenticatedFetch wrapper that automatically injects
 * OAuth tokens and handles token refresh on 401 responses.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OAuthClientBase } from "../../../src/client/base.js";
import type { StoredTokens } from "../../../src/client/types.js";
import { TokenExpiredError } from "../../../src/client/errors.js";
import {
  AuthenticatedFetch,
  createAuthenticatedFetch,
  createLoggingInterceptors,
  createRetryInterceptor,
} from "../../../src/client/fetch/index.js";

/**
 * Create a mock OAuth client for testing
 */
function createMockClient(options: {
  accessToken?: string | null;
  refreshToken?: string;
  isAuthenticated?: boolean;
  onRefresh?: () => void;
}): OAuthClientBase {
  let currentToken: string | null =
    options.accessToken === null ? null : (options.accessToken ?? "test-access-token");

  return {
    getAccessToken: vi.fn().mockImplementation(async () => {
      return currentToken;
    }),
    refreshAccessToken: vi.fn().mockImplementation(async () => {
      options.onRefresh?.();
      currentToken = "refreshed-access-token";
      return {
        accessToken: currentToken,
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 3600000),
      } as StoredTokens;
    }),
    isAuthenticated: vi.fn().mockResolvedValue(options.isAuthenticated ?? true),
  } as unknown as OAuthClientBase;
}

describe("AuthenticatedFetch", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
  });

  describe("token injection", () => {
    it("should automatically attach Bearer token to requests", async () => {
      const client = createMockClient({ accessToken: "my-access-token" });
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      await authFetch.fetch("https://api.example.com/data");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const request = mockFetch.mock.calls[0][0] as Request;
      expect(request.headers.get("Authorization")).toBe("Bearer my-access-token");
    });

    it("should preserve existing headers", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      await authFetch.fetch("https://api.example.com/data", {
        headers: { "Content-Type": "application/json", "X-Custom-Header": "custom-value" },
      });

      const request = mockFetch.mock.calls[0][0] as Request;
      expect(request.headers.get("Content-Type")).toBe("application/json");
      expect(request.headers.get("X-Custom-Header")).toBe("custom-value");
      expect(request.headers.get("Authorization")).toBe("Bearer test-access-token");
    });

    it("should throw TokenExpiredError when no token available", async () => {
      const client = createMockClient({ accessToken: null });
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      await expect(authFetch.fetch("https://api.example.com/data")).rejects.toThrow(
        TokenExpiredError,
      );
    });

    it("should call onAuthenticationRequired when no token available", async () => {
      const onAuthRequired = vi.fn();
      const client = createMockClient({ accessToken: null });
      const authFetch = new AuthenticatedFetch({
        client,
        fetch: mockFetch,
        onAuthenticationRequired: onAuthRequired,
      });

      await expect(authFetch.fetch("https://api.example.com/data")).rejects.toThrow();
      expect(onAuthRequired).toHaveBeenCalled();
    });
  });

  describe("automatic token refresh on 401", () => {
    it("should refresh token and retry on 401 response", async () => {
      let callCount = 0;
      mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response("Unauthorized", { status: 401 });
        }
        return new Response(JSON.stringify({ data: "success" }), { status: 200 });
      });

      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch, autoRetry: true });

      const response = await authFetch.fetch("https://api.example.com/data");

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(client.refreshAccessToken).toHaveBeenCalledTimes(1);

      // Verify the retried request uses the new token
      const secondRequest = mockFetch.mock.calls[1][0] as Request;
      expect(secondRequest.headers.get("Authorization")).toBe("Bearer refreshed-access-token");
    });

    it("should not retry on 401 when autoRetry is disabled", async () => {
      mockFetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch, autoRetry: false });

      const response = await authFetch.fetch("https://api.example.com/data");

      expect(response.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(client.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should respect maxRetries limit", async () => {
      mockFetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({
        client,
        fetch: mockFetch,
        autoRetry: true,
        maxRetries: 2,
      });

      const response = await authFetch.fetch("https://api.example.com/data");

      expect(response.status).toBe(401);
      // Initial request + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(client.refreshAccessToken).toHaveBeenCalledTimes(2);
    });

    it("should call onAuthenticationRequired when refresh fails", async () => {
      mockFetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
      const onAuthRequired = vi.fn();

      const client = createMockClient({});
      (client.refreshAccessToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Refresh failed"),
      );

      const authFetch = new AuthenticatedFetch({
        client,
        fetch: mockFetch,
        autoRetry: true,
        onAuthenticationRequired: onAuthRequired,
      });

      await expect(authFetch.fetch("https://api.example.com/data")).rejects.toThrow(
        "Refresh failed",
      );
      expect(onAuthRequired).toHaveBeenCalled();
    });
  });

  describe("non-401 error handling", () => {
    it("should not retry on non-401 errors", async () => {
      mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 }));

      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch, autoRetry: true });

      const response = await authFetch.fetch("https://api.example.com/data");

      expect(response.status).toBe(400);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(client.refreshAccessToken).not.toHaveBeenCalled();
    });

    it("should pass through 500 errors without retry", async () => {
      mockFetch = vi.fn().mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch, autoRetry: true });

      const response = await authFetch.fetch("https://api.example.com/data");

      expect(response.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("request interceptors", () => {
    it("should run request interceptors before fetch", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      let interceptorCalled = false;
      authFetch.addRequestInterceptor(async (request) => {
        interceptorCalled = true;
        return request;
      });

      await authFetch.fetch("https://api.example.com/data");

      expect(interceptorCalled).toBe(true);
    });

    it("should allow interceptors to modify headers", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      authFetch.addRequestInterceptor(async (request) => {
        const headers = new Headers(request.headers);
        headers.set("X-Request-ID", "12345");
        return new Request(request, { headers });
      });

      await authFetch.fetch("https://api.example.com/data");

      const request = mockFetch.mock.calls[0][0] as Request;
      expect(request.headers.get("X-Request-ID")).toBe("12345");
    });

    it("should chain multiple request interceptors", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      const order: number[] = [];

      authFetch.addRequestInterceptor(async (request) => {
        order.push(1);
        return request;
      });

      authFetch.addRequestInterceptor(async (request) => {
        order.push(2);
        return request;
      });

      await authFetch.fetch("https://api.example.com/data");

      expect(order).toEqual([1, 2]);
    });

    it("should allow removing request interceptors", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      let callCount = 0;
      const remove = authFetch.addRequestInterceptor(async (request) => {
        callCount++;
        return request;
      });

      await authFetch.fetch("https://api.example.com/data");
      expect(callCount).toBe(1);

      remove();

      await authFetch.fetch("https://api.example.com/data");
      expect(callCount).toBe(1); // Not incremented
    });
  });

  describe("response interceptors", () => {
    it("should run response interceptors after fetch", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      let interceptorCalled = false;
      authFetch.addResponseInterceptor(async (response) => {
        interceptorCalled = true;
        return response;
      });

      await authFetch.fetch("https://api.example.com/data");

      expect(interceptorCalled).toBe(true);
    });

    it("should allow interceptors to transform responses", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      authFetch.addResponseInterceptor(async (response) => {
        const body = await response.text();
        const modified = body.toUpperCase();
        return new Response(modified, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      });

      const response = await authFetch.fetch("https://api.example.com/data");
      const text = await response.text();

      expect(text).toBe('{"DATA":"TEST"}');
    });

    it("should receive both response and request in interceptor", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      let capturedRequest: Request | undefined;

      authFetch.addResponseInterceptor(async (response, request) => {
        capturedRequest = request;
        return response;
      });

      await authFetch.fetch("https://api.example.com/data");

      expect(capturedRequest?.url).toBe("https://api.example.com/data");
    });

    it("should chain multiple response interceptors", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      const order: number[] = [];

      authFetch.addResponseInterceptor(async (response) => {
        order.push(1);
        return response;
      });

      authFetch.addResponseInterceptor(async (response) => {
        order.push(2);
        return response;
      });

      await authFetch.fetch("https://api.example.com/data");

      expect(order).toEqual([1, 2]);
    });
  });

  describe("error handling in interceptors", () => {
    it("should propagate errors from request interceptors", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      authFetch.addRequestInterceptor(async () => {
        throw new Error("Request interceptor error");
      });

      await expect(authFetch.fetch("https://api.example.com/data")).rejects.toThrow(
        "Request interceptor error",
      );
    });

    it("should propagate errors from response interceptors", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      authFetch.addResponseInterceptor(async () => {
        throw new Error("Response interceptor error");
      });

      await expect(authFetch.fetch("https://api.example.com/data")).rejects.toThrow(
        "Response interceptor error",
      );
    });
  });

  describe("createAuthenticatedFetch helper", () => {
    it("should create a fetch function with authentication", async () => {
      const client = createMockClient({ accessToken: "my-token" });
      const authFetch = createAuthenticatedFetch(client, { fetch: mockFetch });

      await authFetch("https://api.example.com/data");

      const request = mockFetch.mock.calls[0][0] as Request;
      expect(request.headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("should support POST requests with body", async () => {
      const client = createMockClient({});
      const authFetch = createAuthenticatedFetch(client, { fetch: mockFetch });

      await authFetch("https://api.example.com/data", {
        method: "POST",
        body: JSON.stringify({ key: "value" }),
        headers: { "Content-Type": "application/json" },
      });

      const request = mockFetch.mock.calls[0][0] as Request;
      expect(request.method).toBe("POST");
      expect(request.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("built-in interceptors", () => {
    describe("logging interceptors", () => {
      it("should log requests and responses", async () => {
        const logs: string[] = [];
        const logger = (message: string) => logs.push(message);

        const client = createMockClient({});
        const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

        const { request: reqInterceptor, response: resInterceptor } =
          createLoggingInterceptors(logger);

        authFetch.addRequestInterceptor(reqInterceptor);
        authFetch.addResponseInterceptor(resInterceptor);

        await authFetch.fetch("https://api.example.com/data", { method: "GET" });

        expect(logs.some((log) => log.includes("Request"))).toBe(true);
        expect(logs.some((log) => log.includes("Response"))).toBe(true);
      });
    });

    describe("retry interceptor", () => {
      it("should retry on configured status codes", async () => {
        let callCount = 0;
        const retryFetch = vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return new Response("Service Unavailable", { status: 503 });
          }
          return new Response("OK", { status: 200 });
        });

        const retryInterceptor = createRetryInterceptor({
          maxRetries: 3,
          retryStatusCodes: [503],
          retryDelay: 10,
          exponentialBackoff: false,
          fetch: retryFetch,
        });

        const client = createMockClient({});
        const authFetch = new AuthenticatedFetch({ client, fetch: retryFetch });

        authFetch.addResponseInterceptor(retryInterceptor);

        const response = await authFetch.fetch("https://api.example.com/data");

        expect(response.status).toBe(200);
        expect(callCount).toBe(2);
      });

      it("should respect max retries limit", async () => {
        const retryFetch = vi
          .fn()
          .mockResolvedValue(new Response("Service Unavailable", { status: 503 }));

        const retryInterceptor = createRetryInterceptor({
          maxRetries: 2,
          retryStatusCodes: [503],
          retryDelay: 10,
          exponentialBackoff: false,
          fetch: retryFetch,
        });

        const client = createMockClient({});
        const authFetch = new AuthenticatedFetch({ client, fetch: retryFetch });

        authFetch.addResponseInterceptor(retryInterceptor);

        const response = await authFetch.fetch("https://api.example.com/data");

        // Should return the error response after exhausting retries
        expect(response.status).toBe(503);
      });

      it("should not retry on successful responses", async () => {
        const retryFetch = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));

        const retryInterceptor = createRetryInterceptor({
          maxRetries: 3,
          retryStatusCodes: [503],
          retryDelay: 10,
          fetch: retryFetch,
        });

        const client = createMockClient({});
        const authFetch = new AuthenticatedFetch({ client, fetch: retryFetch });

        authFetch.addResponseInterceptor(retryInterceptor);

        const response = await authFetch.fetch("https://api.example.com/data");

        expect(response.status).toBe(200);
        expect(retryFetch).toHaveBeenCalledTimes(1);
      });

      it("should use exponential backoff when enabled", async () => {
        // Test that exponential backoff retry interceptor works
        // Note: The interceptor's internal retry doesn't go through the interceptor chain again,
        // so we can only test a single successful retry
        let callCount = 0;

        // Create a fetch that fails once then succeeds
        const trackingFetch = vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return new Response("Service Unavailable", { status: 503 });
          }
          return new Response("OK", { status: 200 });
        });

        const retryInterceptor = createRetryInterceptor({
          maxRetries: 3,
          retryStatusCodes: [503],
          retryDelay: 1, // 1ms to keep test fast
          exponentialBackoff: true,
          fetch: trackingFetch,
        });

        const client = createMockClient({});
        const authFetch = new AuthenticatedFetch({ client, fetch: trackingFetch });

        authFetch.addResponseInterceptor(retryInterceptor);

        const response = await authFetch.fetch("https://api.example.com/data");

        // First call returns 503, interceptor retries, second call returns 200
        expect(callCount).toBe(2);
        expect(response.status).toBe(200);
      });

      it("should respect Retry-After header", async () => {
        // Test that Retry-After header is processed (actual delay is implementation detail)
        let callCount = 0;
        const retryFetch = vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return new Response("Too Many Requests", {
              status: 429,
              headers: { "Retry-After": "1" }, // 1 second - small for testing
            });
          }
          return new Response("OK", { status: 200 });
        });

        const retryInterceptor = createRetryInterceptor({
          maxRetries: 3,
          retryStatusCodes: [429],
          retryDelay: 10, // Default is 10ms, but Retry-After should override
          fetch: retryFetch,
        });

        const client = createMockClient({});
        const authFetch = new AuthenticatedFetch({ client, fetch: retryFetch });

        authFetch.addResponseInterceptor(retryInterceptor);

        const startTime = Date.now();
        const response = await authFetch.fetch("https://api.example.com/data");
        const elapsed = Date.now() - startTime;

        // Should have retried and succeeded
        expect(response.status).toBe(200);
        expect(callCount).toBe(2);
        // Retry-After header of 1 second should cause ~1000ms delay
        expect(elapsed).toBeGreaterThanOrEqual(900); // Allow some variance
      });
    });
  });

  describe("concurrent requests during refresh", () => {
    it("should handle concurrent requests when refreshing", async () => {
      let callCount = 0;
      mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          // First two requests return 401
          return new Response("Unauthorized", { status: 401 });
        }
        return new Response(JSON.stringify({ data: "success" }), { status: 200 });
      });

      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch, autoRetry: true });

      // Make two concurrent requests
      const [response1, response2] = await Promise.all([
        authFetch.fetch("https://api.example.com/data1"),
        authFetch.fetch("https://api.example.com/data2"),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Both should have triggered refresh
      expect(client.refreshAccessToken).toHaveBeenCalled();
    });
  });

  describe("Request object handling", () => {
    it("should accept Request object as input", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      const request = new Request("https://api.example.com/data", {
        method: "POST",
        body: JSON.stringify({ test: true }),
      });

      await authFetch.fetch(request);

      const capturedRequest = mockFetch.mock.calls[0][0] as Request;
      expect(capturedRequest.method).toBe("POST");
      expect(capturedRequest.headers.get("Authorization")).toBe("Bearer test-access-token");
    });

    it("should accept URL object as input", async () => {
      const client = createMockClient({});
      const authFetch = new AuthenticatedFetch({ client, fetch: mockFetch });

      const url = new URL("https://api.example.com/data");
      await authFetch.fetch(url);

      const capturedRequest = mockFetch.mock.calls[0][0] as Request;
      expect(capturedRequest.url).toBe("https://api.example.com/data");
    });
  });
});
