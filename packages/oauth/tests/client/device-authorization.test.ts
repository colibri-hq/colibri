import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DeviceAuthorizationClient } from "../../src/client/device-authorization.js";
import { AbortError, OAuthClientError, PollingTimeoutError } from "../../src/client/errors.js";
import {
  createMockFetch,
  createJsonResponse,
  mockMetadata,
  mockTokenResponse,
  createMockTokenStore,
} from "./__helpers__/mock-server.js";

describe("DeviceAuthorizationClient", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = createMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should create client with valid configuration", () => {
      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
      });

      expect(client.issuer.toString()).toBe("https://auth.example.com/");
      expect(client.clientId).toBe("cli-app");
    });

    it("should accept onPending callback", () => {
      const onPending = vi.fn();
      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        onPending,
      });

      expect(client).toBeInstanceOf(DeviceAuthorizationClient);
    });

    it("should accept onSlowDown callback", () => {
      const onSlowDown = vi.fn();
      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        onSlowDown,
      });

      expect(client).toBeInstanceOf(DeviceAuthorizationClient);
    });

    it("should accept custom polling timeout", () => {
      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        pollingTimeout: 600,
      });

      expect(client).toBeInstanceOf(DeviceAuthorizationClient);
    });
  });

  describe("requestDeviceAuthorization", () => {
    it("should return device code and user code", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          return createJsonResponse({
            device_code: "device_code_abc123",
            user_code: "ABCD-1234",
            verification_uri: "https://auth.example.com/device",
            verification_uri_complete: "https://auth.example.com/device?user_code=ABCD-1234",
            expires_in: 600,
            interval: 5,
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.requestDeviceAuthorization();

      expect(result.deviceCode).toBe("device_code_abc123");
      expect(result.userCode).toBe("ABCD-1234");
      expect(result.verificationUri).toBe("https://auth.example.com/device");
      expect(result.verificationUriComplete).toBe(
        "https://auth.example.com/device?user_code=ABCD-1234",
      );
      expect(result.expiresIn).toBe(600);
      expect(result.interval).toBe(5);
    });

    it("should include client_id in request", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          const body = init?.body as string;
          expect(body).toContain("client_id=cli-app");
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            interval: 5,
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      await client.requestDeviceAuthorization();
    });

    it("should include client_secret for confidential clients", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          const body = init?.body as string;
          expect(body).toContain("client_secret=confidential-secret");
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            interval: 5,
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        clientSecret: "confidential-secret",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      await client.requestDeviceAuthorization();
    });

    it("should include scopes in request", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          const body = init?.body as string;
          expect(body).toContain("scope=openid+profile");
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            interval: 5,
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      await client.requestDeviceAuthorization(["openid", "profile"]);
    });

    it("should use default interval of 5 when not provided", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            // No interval provided
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.requestDeviceAuthorization();

      expect(result.interval).toBe(5);
    });
  });

  describe("pollForToken", () => {
    it("should poll at correct interval and return token on success", async () => {
      let pollCount = 0;
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          pollCount++;
          if (pollCount < 3) {
            return createJsonResponse(
              { error: "authorization_pending", error_description: "User has not yet authorized" },
              400,
            );
          }
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const pollPromise = client.pollForToken("device_code_123", 1); // 1 second interval

      // Advance time for first poll
      await vi.advanceTimersByTimeAsync(1000);
      // Advance time for second poll
      await vi.advanceTimersByTimeAsync(1000);
      // Advance time for third poll (success)
      await vi.advanceTimersByTimeAsync(1000);

      const result = await pollPromise;

      expect(pollCount).toBe(3);
      expect(result.access_token).toBeTruthy();
    });

    it("should handle authorization_pending response", async () => {
      const onPending = vi.fn();
      let pollCount = 0;

      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          pollCount++;
          if (pollCount < 2) {
            return createJsonResponse(
              { error: "authorization_pending", error_description: "Pending" },
              400,
            );
          }
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
        onPending,
      });

      const pollPromise = client.pollForToken("device_code_123", 1);

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      await pollPromise;

      expect(onPending).toHaveBeenCalled();
    });

    it("should increase interval on slow_down response", async () => {
      const onSlowDown = vi.fn();
      let pollCount = 0;

      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          pollCount++;
          if (pollCount === 1) {
            return createJsonResponse({ error: "slow_down", error_description: "Slow down" }, 400);
          }
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
        onSlowDown,
      });

      const pollPromise = client.pollForToken("device_code_123", 5);

      // First poll after 5 seconds
      await vi.advanceTimersByTimeAsync(5000);
      // Second poll after 10 seconds (5 + 5 slow_down increase)
      await vi.advanceTimersByTimeAsync(10000);

      await pollPromise;

      expect(onSlowDown).toHaveBeenCalledWith(10); // 5 + 5 = 10
    });

    it("should throw PollingTimeoutError when timeout exceeded", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            { error: "authorization_pending", error_description: "Pending" },
            400,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
        pollingTimeout: 10, // 10 seconds
      });

      const pollPromise = client.pollForToken("device_code_123", 5);

      // Set up rejection handler before advancing timers to avoid unhandled rejection
      const expectation = expect(pollPromise).rejects.toThrow(PollingTimeoutError);

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(15000);

      await expectation;
    });

    it("should respect AbortSignal", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            { error: "authorization_pending", error_description: "Pending" },
            400,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const abortController = new AbortController();

      const pollPromise = client.pollForToken("device_code_123", 5, {
        signal: abortController.signal,
      });

      // Set up rejection handler before advancing timers to avoid unhandled rejection
      const expectation = expect(pollPromise).rejects.toThrow(AbortError);

      // Abort after first poll starts waiting
      await vi.advanceTimersByTimeAsync(2000);
      abortController.abort();
      await vi.advanceTimersByTimeAsync(1);

      await expectation;
    });

    it("should throw on access_denied", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            { error: "access_denied", error_description: "User denied access" },
            400,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const pollPromise = client.pollForToken("device_code_123", 1);

      // Set up rejection handler before advancing timers to avoid unhandled rejection
      const expectation = expect(pollPromise).rejects.toThrow(OAuthClientError);

      await vi.advanceTimersByTimeAsync(1000);

      await expectation;
    });

    it("should throw on expired_token", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            { error: "expired_token", error_description: "Device code expired" },
            400,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const pollPromise = client.pollForToken("device_code_123", 1);

      // Set up rejection handler before advancing timers to avoid unhandled rejection
      const expectation = expect(pollPromise).rejects.toThrow(OAuthClientError);

      await vi.advanceTimersByTimeAsync(1000);

      await expectation;
    });

    it("should call onPoll callback on each attempt", async () => {
      const onPoll = vi.fn();
      let pollCount = 0;

      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          pollCount++;
          if (pollCount < 3) {
            return createJsonResponse(
              { error: "authorization_pending", error_description: "Pending" },
              400,
            );
          }
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const pollPromise = client.pollForToken("device_code_123", 1, { onPoll });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      await pollPromise;

      expect(onPoll).toHaveBeenCalledTimes(3);
      expect(onPoll).toHaveBeenNthCalledWith(1, 1);
      expect(onPoll).toHaveBeenNthCalledWith(2, 2);
      expect(onPoll).toHaveBeenNthCalledWith(3, 3);
    });

    it("should store tokens after successful authorization", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const pollPromise = client.pollForToken("device_code_123", 1);

      await vi.advanceTimersByTimeAsync(1000);
      await pollPromise;

      expect(mockTokenStore.set).toHaveBeenCalled();
    });
  });

  describe("authorize", () => {
    it("should combine requestDeviceAuthorization and pollForToken", async () => {
      let deviceAuthCalled = false;
      let tokenCalled = false;

      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          deviceAuthCalled = true;
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            interval: 1,
          });
        }
        if (urlString.includes("/token")) {
          tokenCalled = true;
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const onUserCode = vi.fn();

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const authorizePromise = client.authorize(["openid"], { onUserCode });

      // Wait for device auth and first poll
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1);

      const result = await authorizePromise;

      expect(deviceAuthCalled).toBe(true);
      expect(tokenCalled).toBe(true);
      expect(onUserCode).toHaveBeenCalledWith({
        deviceCode: "device_code_123",
        userCode: "USER-CODE",
        verificationUri: "https://auth.example.com/device",
        expiresIn: 600,
        interval: 1,
      });
      expect(result.access_token).toBeTruthy();
    });

    it("should pass through scopes to requestDeviceAuthorization", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          const body = init?.body as string;
          expect(body).toContain("scope=openid+profile+email");
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            interval: 1,
          });
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(mockTokenResponse());
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const authorizePromise = client.authorize(["openid", "profile", "email"]);

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1);

      await authorizePromise;
    });

    it("should pass through AbortSignal to pollForToken", async () => {
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/device/code")) {
          return createJsonResponse({
            device_code: "device_code_123",
            user_code: "USER-CODE",
            verification_uri: "https://auth.example.com/device",
            expires_in: 600,
            interval: 1,
          });
        }
        if (urlString.includes("/token")) {
          return createJsonResponse(
            { error: "authorization_pending", error_description: "Pending" },
            400,
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const abortController = new AbortController();

      const client = new DeviceAuthorizationClient({
        issuer: "https://auth.example.com",
        clientId: "cli-app",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const authorizePromise = client.authorize(undefined, { signal: abortController.signal });

      // Set up rejection handler before advancing timers to avoid unhandled rejection
      const expectation = expect(authorizePromise).rejects.toThrow(AbortError);

      await vi.advanceTimersByTimeAsync(500);
      abortController.abort();
      await vi.advanceTimersByTimeAsync(1);

      await expectation;
    });
  });
});
