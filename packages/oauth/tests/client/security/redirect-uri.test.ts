/**
 * Redirect URI Security Tests
 *
 * Tests for redirect_uri validation as specified in RFC 9700 Section 4.1
 * @see https://datatracker.ietf.org/doc/rfc9700/
 */
import { describe, expect, it, beforeEach } from "vitest";
import { AuthorizationCodeClient } from "../../../src/client/authorization-code.js";
import { ConfigurationError } from "../../../src/client/errors.js";
import {
  createFullMockFetch,
  createMockTokenStore,
  mockMetadata,
  createJsonResponse,
} from "../__helpers__/mock-server.js";

describe("Redirect URI Security (RFC 9700 Section 4.1)", () => {
  let mockFetch: ReturnType<typeof createFullMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  describe("redirect_uri configuration", () => {
    it("should require redirect_uri in configuration", () => {
      expect(
        () =>
          new AuthorizationCodeClient({
            issuer: "https://auth.example.com",
            clientId: "test-client",
            // @ts-expect-error - Testing missing redirectUri
            redirectUri: undefined,
            fetch: mockFetch,
            tokenStore: mockTokenStore,
          }),
      ).toThrow(ConfigurationError);
    });

    it("should reject empty redirect_uri", () => {
      expect(
        () =>
          new AuthorizationCodeClient({
            issuer: "https://auth.example.com",
            clientId: "test-client",
            redirectUri: "",
            fetch: mockFetch,
            tokenStore: mockTokenStore,
          }),
      ).toThrow(ConfigurationError);
    });

    it("should accept valid HTTPS redirect_uri", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(client).toBeInstanceOf(AuthorizationCodeClient);
    });

    it("should accept localhost redirect_uri for development", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "http://localhost:3000/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(client).toBeInstanceOf(AuthorizationCodeClient);
    });

    it("should accept 127.0.0.1 redirect_uri for development", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "http://127.0.0.1:8080/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(client).toBeInstanceOf(AuthorizationCodeClient);
    });

    it("should accept custom scheme redirect_uri for native apps", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "myapp://callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(client).toBeInstanceOf(AuthorizationCodeClient);
    });
  });

  describe("redirect_uri in authorization request", () => {
    it("should include exact redirect_uri in authorization URL", async () => {
      const redirectUri = "https://app.example.com/oauth/callback";
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri,
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("redirect_uri")).toBe(redirectUri);
    });

    it("should preserve query parameters in redirect_uri", async () => {
      const redirectUri = "https://app.example.com/callback?extra=param";
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri,
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("redirect_uri")).toBe(redirectUri);
    });

    it("should preserve port in redirect_uri", async () => {
      const redirectUri = "https://app.example.com:8443/callback";
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri,
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("redirect_uri")).toBe(redirectUri);
    });
  });

  describe("redirect_uri in token exchange", () => {
    it("should include same redirect_uri in token request", async () => {
      let capturedBody: URLSearchParams | null = null;
      const redirectUri = "https://app.example.com/callback";

      const capturingFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          capturedBody = new URLSearchParams(init?.body as string);
          return createJsonResponse(
            { access_token: "access_token", token_type: "Bearer", expires_in: 3600 },
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
        redirectUri,
        fetch: capturingFetch,
        tokenStore: mockTokenStore,
      });

      const { codeVerifier } = await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        `${redirectUri}?code=auth_code&state=test-state`,
        codeVerifier,
        "test-state",
      );

      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.get("redirect_uri")).toBe(redirectUri);
    });
  });

  describe("callback URL validation", () => {
    it("should accept callback with configured redirect_uri base", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Callback URL includes the configured redirect_uri as base
      const result = client.validateCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      expect(result.code).toBe("auth_code");
    });

    it("should extract authorization code from callback URL", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = client.validateCallback(
        "https://app.example.com/callback?code=abc123&state=test-state",
        "test-state",
      );

      expect(result.code).toBe("abc123");
    });

    it("should handle URL-encoded parameters in callback", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Code with special characters that would be URL-encoded
      const result = client.validateCallback(
        "https://app.example.com/callback?code=abc%2B123%3D&state=test-state",
        "test-state",
      );

      expect(result.code).toBe("abc+123=");
    });
  });

  describe("open redirector prevention", () => {
    it("should not allow dynamic redirect_uri modification", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // The client uses a fixed redirect_uri from configuration
      const result = await client.createAuthorizationUrl();

      // Should always use the configured redirect_uri
      expect(result.url.searchParams.get("redirect_uri")).toBe("https://app.example.com/callback");
    });
  });

  describe("URI normalization", () => {
    it("should handle trailing slash consistently", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback/",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      // Should preserve the trailing slash exactly as configured
      expect(result.url.searchParams.get("redirect_uri")).toBe("https://app.example.com/callback/");
    });

    it("should preserve case in redirect_uri path", async () => {
      const redirectUri = "https://app.example.com/OAuth/Callback";
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri,
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      // Case should be preserved
      expect(result.url.searchParams.get("redirect_uri")).toBe(redirectUri);
    });
  });

  describe("special redirect_uri scenarios", () => {
    it("should handle IPv6 localhost", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "http://[::1]:3000/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(client).toBeInstanceOf(AuthorizationCodeClient);
    });

    it("should handle loopback address with dynamic port", async () => {
      // RFC 8252 allows native apps to use loopback with any port
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "http://127.0.0.1:12345/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:12345/callback");
    });

    it("should handle private-use URI scheme", async () => {
      // RFC 8252 private-use URI scheme for native apps
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "com.example.myapp:/oauth2redirect",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("redirect_uri")).toBe("com.example.myapp:/oauth2redirect");
    });
  });
});
