/**
 * OpenID Connect Tests
 *
 * Tests for OpenID Connect functionality in the OAuth client.
 * Covers nonce handling, ID token storage, openid scope, and userinfo endpoint.
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { AuthorizationCodeClient } from "../../../src/client/authorization-code.js";
import { getUserInfoEndpoint } from "../../../src/client/discovery.js";
import { generateNonce } from "../../../src/client/pkce.js";
import type { AuthorizationServerMetadata } from "../../../src/types.js";
import {
  createFullMockFetch,
  createMockTokenStore,
  mockMetadata,
  createJsonResponse,
} from "../__helpers__/mock-server.js";

describe("OpenID Connect", () => {
  let mockFetch: ReturnType<typeof createFullMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  describe("nonce generation", () => {
    it("should generate cryptographically random nonce", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      // Nonces should be different
      expect(nonce1).not.toBe(nonce2);

      // Nonces should be sufficiently long
      expect(nonce1.length).toBeGreaterThanOrEqual(32);
      expect(nonce2.length).toBeGreaterThanOrEqual(32);
    });

    it("should generate nonce with custom length", () => {
      const nonce = generateNonce(64);
      expect(nonce.length).toBeGreaterThanOrEqual(64);
    });

    it("should generate URL-safe nonce", () => {
      const nonce = generateNonce();

      // Should only contain URL-safe base64 characters
      expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe("nonce in authorization request", () => {
    it("should auto-generate nonce when openid scope is requested", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid", "profile"],
      });

      const nonce = result.url.searchParams.get("nonce");
      expect(nonce).not.toBeNull();
      expect(nonce!.length).toBeGreaterThan(0);
      expect(result.nonce).toBe(nonce);
    });

    it("should not include nonce when openid scope is not requested", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["read", "write"],
      });

      const nonce = result.url.searchParams.get("nonce");
      expect(nonce).toBeNull();
      expect(result.nonce).toBeUndefined();
    });

    it("should use provided nonce when specified", async () => {
      const customNonce = "my-custom-nonce-12345";
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid"],
        nonce: customNonce,
      });

      expect(result.url.searchParams.get("nonce")).toBe(customNonce);
      expect(result.nonce).toBe(customNonce);
    });

    it("should include nonce in PAR request when openid scope requested", async () => {
      let capturedBody: URLSearchParams | null = null;

      const parFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/par")) {
          capturedBody = new URLSearchParams(init?.body as string);
          return createJsonResponse(
            {
              request_uri: "urn:example:request_uri_12345",
              expires_in: 60,
            },
            201,
          );
        }
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(
            {
              ...mockMetadata,
              pushed_authorization_request_endpoint: "https://auth.example.com/par",
              require_pushed_authorization_requests: true,
            },
            200,
          );
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: parFetch,
        tokenStore: mockTokenStore,
      });

      await client.pushAuthorizationRequest({
        scopes: ["openid", "profile"],
      });

      // Verify nonce was included in the PAR request body
      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.get("nonce")).not.toBeNull();
      expect(capturedBody!.get("nonce")!.length).toBeGreaterThan(0);
    });
  });

  describe("ID token handling", () => {
    it("should store ID token when returned by token endpoint", async () => {
      const idToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJzdWIiOiJ1c2VyMTIzIiwiYXVkIjoidGVzdC1jbGllbnQiLCJleHAiOjE3MDAwMDAwMDAsImlhdCI6MTcwMDAwMDAwMCwibm9uY2UiOiJ0ZXN0LW5vbmNlIn0.signature";

      const tokenFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          return createJsonResponse(
            {
              access_token: "access_token_123",
              token_type: "Bearer",
              expires_in: 3600,
              refresh_token: "refresh_token_123",
              id_token: idToken,
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
        fetch: tokenFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Verify ID token was stored
      expect(mockTokenStore.set).toHaveBeenCalled();
      const storedTokens = mockTokenStore.set.mock.calls[0][1];
      expect(storedTokens.idToken).toBe(idToken);
    });

    it("should handle response without ID token", async () => {
      const tokenFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          return createJsonResponse(
            {
              access_token: "access_token_123",
              token_type: "Bearer",
              expires_in: 3600,
              // No id_token
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
        fetch: tokenFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Verify no ID token was stored
      const storedTokens = mockTokenStore.set.mock.calls[0][1];
      expect(storedTokens.idToken).toBeUndefined();
    });
  });

  describe("openid scope handling", () => {
    it("should include openid in scope when default scopes contain openid", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        scopes: ["openid", "profile", "email"],
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl();

      // Verify openid scope was included in authorization URL
      const scope = result.url.searchParams.get("scope");
      expect(scope).toContain("openid");
      expect(scope).toContain("profile");
      expect(scope).toContain("email");
    });

    it("should parse scope from token response", async () => {
      const tokenFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          return createJsonResponse(
            {
              access_token: "access_token_123",
              token_type: "Bearer",
              expires_in: 3600,
              scope: "openid profile email",
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
        fetch: tokenFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Verify scopes were parsed and stored
      const storedTokens = mockTokenStore.set.mock.calls[0][1];
      expect(storedTokens.scopes).toEqual(["openid", "profile", "email"]);
    });
  });

  describe("userinfo endpoint discovery", () => {
    it("should return userinfo endpoint when present in metadata", () => {
      const metadata: AuthorizationServerMetadata = {
        ...mockMetadata,
        userinfo_endpoint: "https://auth.example.com/userinfo",
      };

      const endpoint = getUserInfoEndpoint(metadata, "https://auth.example.com");
      expect(endpoint?.toString()).toBe("https://auth.example.com/userinfo");
    });

    it("should return undefined when userinfo endpoint not in metadata", () => {
      const metadata: AuthorizationServerMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
        // No userinfo_endpoint
      };

      const endpoint = getUserInfoEndpoint(metadata, "https://auth.example.com");
      expect(endpoint).toBeUndefined();
    });

    it("should resolve relative userinfo endpoint against issuer", () => {
      const metadata: AuthorizationServerMetadata = {
        ...mockMetadata,
        userinfo_endpoint: "/userinfo" as any,
      };

      const endpoint = getUserInfoEndpoint(metadata, "https://auth.example.com");
      expect(endpoint?.toString()).toBe("https://auth.example.com/userinfo");
    });
  });

  describe("OIDC metadata fields", () => {
    it("should discover OIDC-specific metadata fields", async () => {
      const oidcMetadata: AuthorizationServerMetadata = {
        ...mockMetadata,
        userinfo_endpoint: "https://auth.example.com/userinfo",
        jwks_uri: "https://auth.example.com/.well-known/jwks.json",
        scopes_supported: ["openid", "profile", "email", "address", "phone"],
        claims_supported: [
          "sub",
          "iss",
          "aud",
          "exp",
          "iat",
          "name",
          "given_name",
          "family_name",
          "email",
          "email_verified",
        ],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256", "ES256"],
        userinfo_signing_alg_values_supported: ["RS256", "none"],
      };

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(oidcMetadata),
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const metadata = await client.discover();

      expect(metadata.userinfo_endpoint).toBe("https://auth.example.com/userinfo");
      expect(metadata.jwks_uri).toBe("https://auth.example.com/.well-known/jwks.json");
      expect(metadata.scopes_supported).toContain("openid");
      expect(metadata.subject_types_supported).toEqual(["public"]);
      expect(metadata.id_token_signing_alg_values_supported).toContain("RS256");
    });

    it("should handle OIDC discovery fallback path", async () => {
      const mockFetchWithFallback = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockMetadata,
              userinfo_endpoint: "https://auth.example.com/userinfo",
            }),
        });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithFallback,
        tokenStore: mockTokenStore,
      });

      const metadata = await client.discover();

      // Should have tried both endpoints
      expect(mockFetchWithFallback).toHaveBeenCalledTimes(2);
      expect(mockFetchWithFallback).toHaveBeenNthCalledWith(
        2,
        "https://auth.example.com/.well-known/openid-configuration",
        expect.any(Object),
      );
      expect(metadata.userinfo_endpoint).toBe("https://auth.example.com/userinfo");
    });
  });

  describe("response_type code for OIDC", () => {
    it("should use response_type=code for authorization code flow with openid", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid", "profile"],
      });

      expect(result.url.searchParams.get("response_type")).toBe("code");
    });
  });

  describe("acr_values and claims parameters", () => {
    it("should include custom parameters in authorization URL", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid"],
        additionalParams: {
          acr_values: "urn:mace:incommon:iap:silver",
          claims: JSON.stringify({
            userinfo: {
              given_name: { essential: true },
              family_name: { essential: true },
            },
          }),
        },
      });

      expect(result.url.searchParams.get("acr_values")).toBe(
        "urn:mace:incommon:iap:silver",
      );
      expect(result.url.searchParams.get("claims")).toContain("given_name");
    });

    it("should include prompt parameter", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid"],
        additionalParams: {
          prompt: "consent",
        },
      });

      expect(result.url.searchParams.get("prompt")).toBe("consent");
    });

    it("should include login_hint parameter", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid"],
        additionalParams: {
          login_hint: "user@example.com",
        },
      });

      expect(result.url.searchParams.get("login_hint")).toBe("user@example.com");
    });
  });
});
