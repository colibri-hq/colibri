/**
 * Extended Discovery Tests
 *
 * Tests for OAuth Authorization Server Metadata discovery edge cases
 * and advanced functionality per RFC 8414 and RFC 9700.
 *
 * @see https://datatracker.ietf.org/doc/rfc8414/
 * @see https://datatracker.ietf.org/doc/rfc9700/
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { AuthorizationServerMetadata } from "../../src/types.js";
import { AuthorizationCodeClient } from "../../src/client/authorization-code.js";
import {
  discoverServer,
  resolveEndpoint,
  getPushedAuthorizationRequestEndpoint,
  supportsGrantType,
  supportsCodeChallengeMethod,
  requiresPAR,
  getRevocationEndpoint,
  getIntrospectionEndpoint,
  getUserInfoEndpoint,
} from "../../src/client/discovery.js";
import { DiscoveryError } from "../../src/client/errors.js";
import { createMockTokenStore, createJsonResponse } from "./__helpers__/mock-server.js";

describe("Extended Discovery Tests", () => {
  const fullMetadata: AuthorizationServerMetadata = {
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/authorize",
    token_endpoint: "https://auth.example.com/token",
    device_authorization_endpoint: "https://auth.example.com/device/code",
    revocation_endpoint: "https://auth.example.com/revoke",
    introspection_endpoint: "https://auth.example.com/introspect",
    userinfo_endpoint: "https://auth.example.com/userinfo",
    pushed_authorization_request_endpoint: "https://auth.example.com/par",
    jwks_uri: "https://auth.example.com/.well-known/jwks.json",
    response_types_supported: ["code", "token", "id_token"],
    response_modes_supported: ["query", "fragment"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:device_code",
    ],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    require_pushed_authorization_requests: false,
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256", "ES256"],
    claims_supported: ["sub", "iss", "aud", "exp", "iat", "name", "email"],
  };

  let mockFetch: ReturnType<typeof vi.fn> & typeof fetch;

  beforeEach(() => {
    mockFetch = vi.fn<typeof fetch>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("metadata caching", () => {
    it("should cache metadata after first discovery", async () => {
      const mockTokenStore = createMockTokenStore();
      let fetchCount = 0;

      const countingFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          fetchCount++;
          return createJsonResponse(fullMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: countingFetch,
        tokenStore: mockTokenStore,
      });

      // First discovery
      await client.discover();
      expect(fetchCount).toBe(1);

      // Second call should use cache
      await client.discover();
      expect(fetchCount).toBe(1);

      // Third call should still use cache
      await client.discover();
      expect(fetchCount).toBe(1);
    });

    it("should deduplicate concurrent discovery requests", async () => {
      const mockTokenStore = createMockTokenStore();
      let fetchCount = 0;

      const slowFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          fetchCount++;
          // Simulate slow network request
          await new Promise((resolve) => setTimeout(resolve, 50));
          return createJsonResponse(fullMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: slowFetch,
        tokenStore: mockTokenStore,
      });

      // Start multiple concurrent discovery requests
      const [result1, result2, result3] = await Promise.all([
        client.discover(),
        client.discover(),
        client.discover(),
      ]);

      // Should only have made one fetch request
      expect(fetchCount).toBe(1);

      // All results should be the same
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it("should use provided serverMetadata instead of discovery", async () => {
      const mockTokenStore = createMockTokenStore();
      let fetchCalled = false;

      const trackingFetch = async () => {
        fetchCalled = true;
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: trackingFetch,
        tokenStore: mockTokenStore,
        serverMetadata: fullMetadata,
      });

      const metadata = await client.discover();

      expect(fetchCalled).toBe(false);
      expect(metadata).toEqual(fullMetadata);
    });
  });

  describe("timeout handling", () => {
    it("should timeout slow discovery requests", async () => {
      const slowFetch = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        // Simulate slow request that respects abort signal
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve(createJsonResponse(fullMetadata, 200));
          }, 5000);

          // Listen for abort signal
          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              const error = new Error("Aborted");
              error.name = "AbortError";
              reject(error);
            });
          }
        });
      };

      await expect(
        discoverServer("https://auth.example.com", {
          fetch: slowFetch,
          timeout: 100, // 100ms timeout
        }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should complete before timeout for fast responses", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", {
        fetch: mockFetch,
        timeout: 5000,
      });

      expect(result.issuer).toBe("https://auth.example.com");
    });
  });

  describe("endpoint URL resolution", () => {
    it("should resolve absolute URLs unchanged", () => {
      const endpoint = resolveEndpoint(
        "https://other.example.com/token",
        "https://auth.example.com",
      );
      expect(endpoint?.toString()).toBe("https://other.example.com/token");
    });

    it("should resolve relative paths against issuer", () => {
      const endpoint = resolveEndpoint("/oauth/token", "https://auth.example.com");
      expect(endpoint?.toString()).toBe("https://auth.example.com/oauth/token");
    });

    it("should return undefined for missing endpoints", () => {
      const endpoint = resolveEndpoint(undefined, "https://auth.example.com");
      expect(endpoint).toBeUndefined();
    });

    it("should handle URL objects as endpoint", () => {
      const endpoint = resolveEndpoint(
        new URL("https://other.example.com/token"),
        "https://auth.example.com",
      );
      expect(endpoint?.toString()).toBe("https://other.example.com/token");
    });

    it("should handle URL objects as issuer", () => {
      const endpoint = resolveEndpoint("/oauth/token", new URL("https://auth.example.com"));
      expect(endpoint?.toString()).toBe("https://auth.example.com/oauth/token");
    });
  });

  describe("optional endpoints graceful handling", () => {
    const minimalMetadata: AuthorizationServerMetadata = {
      issuer: "https://auth.example.com",
      authorization_endpoint: "https://auth.example.com/authorize",
      token_endpoint: "https://auth.example.com/token",
      response_types_supported: ["code"],
    };

    it("should return undefined for missing revocation endpoint", () => {
      const endpoint = getRevocationEndpoint(minimalMetadata, "https://auth.example.com");
      expect(endpoint).toBeUndefined();
    });

    it("should return undefined for missing introspection endpoint", () => {
      const endpoint = getIntrospectionEndpoint(minimalMetadata, "https://auth.example.com");
      expect(endpoint).toBeUndefined();
    });

    it("should return undefined for missing userinfo endpoint", () => {
      const endpoint = getUserInfoEndpoint(minimalMetadata, "https://auth.example.com");
      expect(endpoint).toBeUndefined();
    });

    it("should throw for missing PAR endpoint when required", () => {
      expect(() =>
        getPushedAuthorizationRequestEndpoint(minimalMetadata, "https://auth.example.com"),
      ).toThrow(DiscoveryError);
    });

    it("should return PAR endpoint when present", () => {
      const metadataWithPAR = {
        ...minimalMetadata,
        pushed_authorization_request_endpoint: "https://auth.example.com/par" as const,
      };
      const endpoint = getPushedAuthorizationRequestEndpoint(
        metadataWithPAR,
        "https://auth.example.com",
      );
      expect(endpoint.toString()).toBe("https://auth.example.com/par");
    });
  });

  describe("response_types_supported validation", () => {
    it("should reject metadata without response_types_supported", async () => {
      const invalidMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        // Missing response_types_supported
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(invalidMetadata) });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should reject metadata with non-array response_types_supported", async () => {
      const invalidMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: "code", // Should be an array
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(invalidMetadata) });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should accept metadata with valid response_types_supported array", async () => {
      const validMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(validMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.response_types_supported).toEqual(["code"]);
    });
  });

  describe("grant_types_supported validation", () => {
    it("should default to authorization_code when grant_types_supported not specified", () => {
      const metadata: AuthorizationServerMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
        // grant_types_supported not specified
      };

      expect(supportsGrantType(metadata, "authorization_code")).toBe(true);
      expect(supportsGrantType(metadata, "refresh_token")).toBe(false);
      expect(supportsGrantType(metadata, "client_credentials")).toBe(false);
    });

    it("should check explicit grant_types_supported", () => {
      expect(supportsGrantType(fullMetadata, "authorization_code")).toBe(true);
      expect(supportsGrantType(fullMetadata, "refresh_token")).toBe(true);
      expect(supportsGrantType(fullMetadata, "client_credentials")).toBe(true);
      expect(supportsGrantType(fullMetadata, "urn:ietf:params:oauth:grant-type:device_code")).toBe(
        true,
      );
      expect(supportsGrantType(fullMetadata, "password")).toBe(false);
      expect(supportsGrantType(fullMetadata, "implicit")).toBe(false);
    });
  });

  describe("code_challenge_methods_supported validation", () => {
    it("should return false when PKCE not supported", () => {
      const metadata: AuthorizationServerMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
        // No code_challenge_methods_supported
      };

      expect(supportsCodeChallengeMethod(metadata, "S256")).toBe(false);
      expect(supportsCodeChallengeMethod(metadata, "plain")).toBe(false);
    });

    it("should check supported PKCE methods", () => {
      expect(supportsCodeChallengeMethod(fullMetadata, "S256")).toBe(true);
      expect(supportsCodeChallengeMethod(fullMetadata, "plain")).toBe(true);
      expect(supportsCodeChallengeMethod(fullMetadata, "unsupported")).toBe(false);
    });

    it("should handle S256-only servers", () => {
      const s256Only: AuthorizationServerMetadata = {
        ...fullMetadata,
        code_challenge_methods_supported: ["S256"],
      };

      expect(supportsCodeChallengeMethod(s256Only, "S256")).toBe(true);
      expect(supportsCodeChallengeMethod(s256Only, "plain")).toBe(false);
    });
  });

  describe("require_pushed_authorization_requests", () => {
    it("should return false when not specified", () => {
      const metadata: AuthorizationServerMetadata = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
      };

      expect(requiresPAR(metadata)).toBe(false);
    });

    it("should return false when explicitly false", () => {
      const metadata: AuthorizationServerMetadata = {
        ...fullMetadata,
        require_pushed_authorization_requests: false,
      };

      expect(requiresPAR(metadata)).toBe(false);
    });

    it("should return true when required", () => {
      const metadata: AuthorizationServerMetadata = {
        ...fullMetadata,
        require_pushed_authorization_requests: true,
      };

      expect(requiresPAR(metadata)).toBe(true);
    });
  });

  describe("token_endpoint_auth_methods_supported", () => {
    it("should include supported authentication methods in metadata", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.token_endpoint_auth_methods_supported).toEqual([
        "client_secret_basic",
        "client_secret_post",
        "none",
      ]);
    });
  });

  describe("JWKS URI handling", () => {
    it("should include jwks_uri in discovered metadata", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.jwks_uri).toBe("https://auth.example.com/.well-known/jwks.json");
    });

    it("should handle missing jwks_uri gracefully", async () => {
      const metadataWithoutJwks = {
        issuer: "https://auth.example.com",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
        // No jwks_uri
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(metadataWithoutJwks),
      });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.jwks_uri).toBeUndefined();
    });
  });

  describe("issuer validation edge cases", () => {
    it("should reject empty issuer in metadata", async () => {
      const invalidMetadata = {
        issuer: "",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(invalidMetadata) });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should normalize trailing slashes in issuer comparison", async () => {
      const metadataWithTrailingSlash = {
        issuer: "https://auth.example.com/",
        token_endpoint: "https://auth.example.com/token",
        response_types_supported: ["code"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(metadataWithTrailingSlash),
      });

      // Issuer without trailing slash should match metadata with trailing slash
      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.issuer).toBe("https://auth.example.com/");
    });

    it("should handle path-based issuers", async () => {
      const metadataWithPath = {
        issuer: "https://example.com/auth",
        token_endpoint: "https://example.com/auth/token",
        response_types_supported: ["code"],
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(metadataWithPath) });

      const result = await discoverServer("https://example.com/auth", { fetch: mockFetch });

      expect(result.issuer).toBe("https://example.com/auth");
    });
  });

  describe("discovery URL construction", () => {
    it("should use OAuth discovery path first", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/.well-known/oauth-authorization-server",
        expect.any(Object),
      );
    });

    it("should fallback to OpenID Connect path on OAuth failure", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://auth.example.com/.well-known/oauth-authorization-server",
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://auth.example.com/.well-known/openid-configuration",
        expect.any(Object),
      );
    });

    it("should construct correct URL for path-based issuer", async () => {
      const pathBasedMetadata = {
        issuer: "https://example.com/tenant1",
        token_endpoint: "https://example.com/tenant1/token",
        response_types_supported: ["code"],
      };

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(pathBasedMetadata) });

      await discoverServer("https://example.com/tenant1", { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/.well-known/oauth-authorization-server",
        expect.any(Object),
      );
    });
  });

  describe("HTTP error handling", () => {
    it("should handle HTTP 500 errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch, fallbackToOpenId: false }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should handle HTTP 503 errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch, fallbackToOpenId: false }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should handle invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch, fallbackToOpenId: false }),
      ).rejects.toThrow(DiscoveryError);
    });
  });

  describe("scopes_supported", () => {
    it("should include scopes_supported in metadata", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.scopes_supported).toEqual(["openid", "profile", "email", "offline_access"]);
    });
  });

  describe("OpenID Connect specific fields", () => {
    it("should include subject_types_supported", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.subject_types_supported).toEqual(["public"]);
    });

    it("should include id_token_signing_alg_values_supported", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.id_token_signing_alg_values_supported).toEqual(["RS256", "ES256"]);
    });

    it("should include claims_supported", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.claims_supported).toEqual(["sub", "iss", "aud", "exp", "iat", "name", "email"]);
    });
  });

  describe("response_modes_supported", () => {
    it("should include response_modes_supported in metadata", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fullMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(result.response_modes_supported).toEqual(["query", "fragment"]);
    });
  });
});
