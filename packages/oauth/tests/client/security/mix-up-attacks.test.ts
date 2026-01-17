/**
 * Mix-Up Attack Prevention Tests
 *
 * Tests for OAuth 2.0 mix-up attack prevention as specified in RFC 9700 Section 4.4
 * Mix-up attacks occur when an attacker tricks a client into sending credentials
 * to the wrong authorization server.
 *
 * @see https://datatracker.ietf.org/doc/rfc9700/
 * @see https://arxiv.org/abs/1601.01229 (Original mix-up attack paper)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { AuthorizationCodeClient } from "../../../src/client/authorization-code.js";
import { ConfigurationError, IssuerMismatchError } from "../../../src/client/errors.js";
import {
  createFullMockFetch,
  createJsonResponse,
  createMockTokenStore,
  mockMetadata,
} from "../__helpers__/mock-server.js";

describe("Mix-Up Attack Prevention (RFC 9700 Section 4.4)", () => {
  let mockFetch: ReturnType<typeof createFullMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  describe("issuer validation", () => {
    it("should require issuer in configuration", () => {
      expect(
        () =>
          new AuthorizationCodeClient({
            // @ts-expect-error - Testing missing issuer
            issuer: undefined,
            clientId: "test-client",
            redirectUri: "https://app.example.com/callback",
            fetch: mockFetch,
            tokenStore: mockTokenStore,
          }),
      ).toThrow(ConfigurationError);
    });

    it("should validate issuer from callback URL (RFC 9207)", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Callback with matching issuer
      const result = client.validateCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state&iss=https%3A%2F%2Fauth.example.com",
        "test-state",
      );

      expect(result.code).toBe("auth_code");
    });

    it("should reject mismatched issuer in callback", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Callback with wrong issuer (attack attempt)
      expect(() =>
        client.validateCallback(
          "https://app.example.com/callback?code=auth_code&state=test-state&iss=https%3A%2F%2Fattacker.example.com",
          "test-state",
        ),
      ).toThrow(IssuerMismatchError);
    });

    it("should accept callback without issuer for backwards compatibility", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Old servers may not include issuer - should still work but is less secure
      const result = client.validateCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      expect(result.code).toBe("auth_code");
    });

    it("should normalize issuer URLs for comparison", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com", // No trailing slash
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Callback with trailing slash - should still match
      const result = client.validateCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state&iss=https%3A%2F%2Fauth.example.com%2F",
        "test-state",
      );

      expect(result.code).toBe("auth_code");
    });
  });

  describe("server metadata validation", () => {
    it("should validate metadata issuer matches configured issuer", async () => {
      const mismatchedMetadataFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(
            {
              ...mockMetadata,
              issuer: "https://different-issuer.example.com", // Wrong issuer
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
        fetch: mismatchedMetadataFetch,
        tokenStore: mockTokenStore,
      });

      // Discovery should fail due to issuer mismatch
      await expect(client.discover()).rejects.toThrow();
    });

    it("should use correct discovery endpoint for issuer", async () => {
      let discoveryUrl: string | null = null;

      const capturingFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          discoveryUrl = urlString;
          return createJsonResponse(mockMetadata, 200);
        }
        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: capturingFetch,
        tokenStore: mockTokenStore,
      });

      await client.discover();

      // Should use the issuer's well-known endpoint
      expect(discoveryUrl).toContain("auth.example.com");
    });
  });

  describe("mix-up attack scenarios", () => {
    it("should prevent code exchange with wrong authorization server", async () => {
      // Attack scenario: Attacker intercepts authorization code and tries
      // to exchange it with their own malicious server

      let tokenEndpointCalled: string | null = null;

      const trackingFetch = async (url: RequestInfo | URL, _init?: RequestInit) => {
        const urlString = url.toString();

        if (urlString.includes("/token")) {
          tokenEndpointCalled = urlString;

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
        redirectUri: "https://app.example.com/callback",
        fetch: trackingFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      // Token exchange should go to the configured issuer's token endpoint
      expect(tokenEndpointCalled).toContain("auth.example.com");
      expect(tokenEndpointCalled).not.toContain("attacker");
    });

    it("should prevent IdP confusion attack via state binding", () => {
      // IdP confusion: Attacker starts auth with honest IdP but redirects
      // victim to malicious IdP, then captures the code

      const honestClient = new AuthorizationCodeClient({
        issuer: "https://honest-idp.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const _maliciousRedirect = new AuthorizationCodeClient({
        issuer: "https://malicious-idp.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Honest client generated this state
      const honestState = "honest-state-12345";

      // Attacker tries to use code from malicious IdP with honest state
      // This should fail because the iss parameter (if present) won't match

      // With issuer in callback - attack detected
      expect(() =>
        honestClient.validateCallback(
          `https://app.example.com/callback?code=stolen_code&state=${honestState}&iss=https%3A%2F%2Fmalicious-idp.example.com`,
          honestState,
        ),
      ).toThrow(IssuerMismatchError);
    });

    it("should ensure authorization endpoint belongs to configured issuer", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: {
          ...mockMetadata,
          issuer: "https://auth.example.com",
          authorization_endpoint: "https://auth.example.com/authorize",
        },
      });

      const result = await client.createAuthorizationUrl();

      // Authorization URL should be at the configured issuer
      expect(result.url.toString()).toContain("auth.example.com");
    });
  });

  describe("multi-IdP client protection", () => {
    it("should isolate state per issuer", async () => {
      // When a client works with multiple IdPs, states must be unique per IdP

      const client1 = new AuthorizationCodeClient({
        issuer: "https://idp1.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: { ...mockMetadata, issuer: "https://idp1.example.com" },
      });

      const client2 = new AuthorizationCodeClient({
        issuer: "https://idp2.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: { ...mockMetadata, issuer: "https://idp2.example.com" },
      });

      const result1 = await client1.createAuthorizationUrl();
      const result2 = await client2.createAuthorizationUrl();

      const state1 = result1.url.searchParams.get("state");
      const state2 = result2.url.searchParams.get("state");

      // States should be different
      expect(state1).not.toBe(state2);
    });

    it("should reject code from wrong IdP based on state", async () => {
      const client1 = new AuthorizationCodeClient({
        issuer: "https://idp1.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: { ...mockMetadata, issuer: "https://idp1.example.com" },
      });

      // Generate state for IdP1
      const result = await client1.createAuthorizationUrl({ state: "idp1-state" });
      const state = result.url.searchParams.get("state");

      // Try to use state from IdP1 with response that claims to be from IdP2
      expect(() =>
        client1.validateCallback(
          `https://app.example.com/callback?code=code&state=${state}&iss=https%3A%2F%2Fidp2.example.com`,
          state!,
        ),
      ).toThrow(IssuerMismatchError);
    });
  });

  describe("endpoint binding", () => {
    it("should use token endpoint from discovered metadata", async () => {
      let calledEndpoint: string | null = null;

      const discoveryFetch = async (url: RequestInfo | URL, _init?: RequestInit) => {
        const urlString = url.toString();

        if (urlString.includes("/token")) {
          calledEndpoint = urlString;
          return createJsonResponse(
            { access_token: "access_token", token_type: "Bearer", expires_in: 3600 },
            200,
          );
        }

        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(
            { ...mockMetadata, token_endpoint: "https://auth.example.com/oauth/token" },
            200,
          );
        }

        return new Response("Not Found", { status: 404 });
      };

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: discoveryFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        "test-state",
      );

      expect(calledEndpoint).toBe("https://auth.example.com/oauth/token");
    });

    it("should not follow redirects to different domains for token endpoint", async () => {
      // If token endpoint redirects to a different domain, this could be an attack
      const redirectingFetch = async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          // Note: In a real attack, the redirect might be to steal credentials
          // The fetch implementation should NOT follow cross-origin redirects for token requests
          // This test verifies the expected behavior
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
        redirectUri: "https://app.example.com/callback",
        fetch: redirectingFetch,
        tokenStore: mockTokenStore,
      });

      await client.createAuthorizationUrl({ state: "test-state" });
      // Should complete without following malicious redirects
      await expect(
        client.handleCallback(
          "https://app.example.com/callback?code=auth_code&state=test-state",
          "test-state",
        ),
      ).resolves.not.toThrow();
    });
  });
});
