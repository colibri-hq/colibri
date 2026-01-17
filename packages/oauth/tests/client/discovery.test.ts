import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { AuthorizationServerMetadata } from "../../src/types.js";
import {
  discoverServer,
  getTokenEndpoint,
  getAuthorizationEndpoint,
  getDeviceAuthorizationEndpoint,
  getRevocationEndpoint,
  getIntrospectionEndpoint,
  getUserInfoEndpoint,
  supportsGrantType,
  supportsCodeChallengeMethod,
  requiresPAR,
} from "../../src/client/discovery.js";
import { DiscoveryError } from "../../src/client/errors.js";

describe("Server Discovery", () => {
  const mockMetadata: AuthorizationServerMetadata = {
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/authorize",
    token_endpoint: "https://auth.example.com/token",
    device_authorization_endpoint: "https://auth.example.com/device/code",
    revocation_endpoint: "https://auth.example.com/revoke",
    introspection_endpoint: "https://auth.example.com/introspect",
    userinfo_endpoint: "https://auth.example.com/userinfo",
    jwks_uri: "https://auth.example.com/.well-known/jwks.json",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
  };

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("discoverServer", () => {
    it("should discover server metadata from OAuth path", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/.well-known/oauth-authorization-server",
        expect.any(Object),
      );
      expect(result).toEqual(mockMetadata);
    });

    it("should fall back to OpenID Connect discovery path", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetadata) });

      const result = await discoverServer("https://auth.example.com", { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://auth.example.com/.well-known/openid-configuration",
        expect.any(Object),
      );
      expect(result).toEqual(mockMetadata);
    });

    it("should throw DiscoveryError when both paths fail", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should throw DiscoveryError on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should handle URL with trailing slash", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMetadata) });

      await discoverServer("https://auth.example.com/", { fetch: mockFetch });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/.well-known/oauth-authorization-server",
        expect.any(Object),
      );
    });

    it("should validate issuer matches", async () => {
      const mismatchedMetadata = { ...mockMetadata, issuer: "https://different.example.com" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mismatchedMetadata),
      });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should validate required fields exist", async () => {
      const incompleteMetadata = {
        issuer: "https://auth.example.com",
        response_types_supported: ["code"],
        // Missing token_endpoint
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(incompleteMetadata),
      });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch }),
      ).rejects.toThrow(DiscoveryError);
    });

    it("should not fallback when fallbackToOpenId is false", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" });

      await expect(
        discoverServer("https://auth.example.com", { fetch: mockFetch, fallbackToOpenId: false }),
      ).rejects.toThrow(DiscoveryError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTokenEndpoint", () => {
    it("should return token endpoint from metadata", () => {
      const endpoint = getTokenEndpoint(mockMetadata, "https://auth.example.com");
      expect(endpoint.toString()).toBe("https://auth.example.com/token");
    });

    it("should throw when endpoint not in metadata", () => {
      const metadata = { ...mockMetadata, token_endpoint: undefined };
      expect(() =>
        getTokenEndpoint(metadata as AuthorizationServerMetadata, "https://auth.example.com"),
      ).toThrow(DiscoveryError);
    });
  });

  describe("getAuthorizationEndpoint", () => {
    it("should return authorization endpoint from metadata", () => {
      const endpoint = getAuthorizationEndpoint(mockMetadata, "https://auth.example.com");
      expect(endpoint.toString()).toBe("https://auth.example.com/authorize");
    });

    it("should throw when endpoint not in metadata", () => {
      const metadata = { ...mockMetadata, authorization_endpoint: undefined };
      expect(() =>
        getAuthorizationEndpoint(
          metadata as AuthorizationServerMetadata,
          "https://auth.example.com",
        ),
      ).toThrow(DiscoveryError);
    });
  });

  describe("getDeviceAuthorizationEndpoint", () => {
    it("should return device authorization endpoint from metadata", () => {
      const endpoint = getDeviceAuthorizationEndpoint(mockMetadata, "https://auth.example.com");
      expect(endpoint.toString()).toBe("https://auth.example.com/device/code");
    });

    it("should throw when endpoint not in metadata", () => {
      const metadata = { ...mockMetadata, device_authorization_endpoint: undefined };
      expect(() =>
        getDeviceAuthorizationEndpoint(
          metadata as AuthorizationServerMetadata,
          "https://auth.example.com",
        ),
      ).toThrow(DiscoveryError);
    });
  });

  describe("getRevocationEndpoint", () => {
    it("should return revocation endpoint from metadata", () => {
      const endpoint = getRevocationEndpoint(mockMetadata, "https://auth.example.com");
      expect(endpoint?.toString()).toBe("https://auth.example.com/revoke");
    });

    it("should return undefined when endpoint not in metadata", () => {
      const metadata = { ...mockMetadata, revocation_endpoint: undefined };
      const endpoint = getRevocationEndpoint(
        metadata as AuthorizationServerMetadata,
        "https://auth.example.com",
      );
      expect(endpoint).toBeUndefined();
    });
  });

  describe("getIntrospectionEndpoint", () => {
    it("should return introspection endpoint from metadata", () => {
      const endpoint = getIntrospectionEndpoint(mockMetadata, "https://auth.example.com");
      expect(endpoint?.toString()).toBe("https://auth.example.com/introspect");
    });

    it("should return undefined when endpoint not in metadata", () => {
      const metadata = { ...mockMetadata, introspection_endpoint: undefined };
      const endpoint = getIntrospectionEndpoint(
        metadata as AuthorizationServerMetadata,
        "https://auth.example.com",
      );
      expect(endpoint).toBeUndefined();
    });
  });

  describe("getUserInfoEndpoint", () => {
    it("should return userinfo endpoint from metadata", () => {
      const endpoint = getUserInfoEndpoint(mockMetadata, "https://auth.example.com");
      expect(endpoint?.toString()).toBe("https://auth.example.com/userinfo");
    });

    it("should return undefined when endpoint not in metadata", () => {
      const metadata = { ...mockMetadata, userinfo_endpoint: undefined };
      const endpoint = getUserInfoEndpoint(
        metadata as AuthorizationServerMetadata,
        "https://auth.example.com",
      );
      expect(endpoint).toBeUndefined();
    });
  });

  describe("supportsGrantType", () => {
    it("should return true for supported grant type", () => {
      expect(supportsGrantType(mockMetadata, "authorization_code")).toBe(true);
      expect(supportsGrantType(mockMetadata, "refresh_token")).toBe(true);
    });

    it("should return false for unsupported grant type", () => {
      expect(supportsGrantType(mockMetadata, "client_credentials")).toBe(false);
    });

    it("should default to authorization_code when not specified", () => {
      const metadata = { ...mockMetadata, grant_types_supported: undefined };
      expect(supportsGrantType(metadata as AuthorizationServerMetadata, "authorization_code")).toBe(
        true,
      );
      expect(supportsGrantType(metadata as AuthorizationServerMetadata, "refresh_token")).toBe(
        false,
      );
    });
  });

  describe("supportsCodeChallengeMethod", () => {
    it("should return true for supported method", () => {
      expect(supportsCodeChallengeMethod(mockMetadata, "S256")).toBe(true);
    });

    it("should return false for unsupported method", () => {
      expect(supportsCodeChallengeMethod(mockMetadata, "plain")).toBe(false);
    });

    it("should return false when PKCE not supported", () => {
      const metadata = { ...mockMetadata, code_challenge_methods_supported: undefined };
      expect(supportsCodeChallengeMethod(metadata as AuthorizationServerMetadata, "S256")).toBe(
        false,
      );
    });
  });

  describe("requiresPAR", () => {
    it("should return false when not required", () => {
      expect(requiresPAR(mockMetadata)).toBe(false);
    });

    it("should return true when required", () => {
      const metadata = { ...mockMetadata, require_pushed_authorization_requests: true };
      expect(requiresPAR(metadata)).toBe(true);
    });
  });
});
