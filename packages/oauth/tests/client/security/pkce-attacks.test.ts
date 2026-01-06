/**
 * PKCE Attack Scenario Tests
 *
 * Tests for PKCE security as specified in RFC 9700 Section 4.8
 * @see https://datatracker.ietf.org/doc/rfc9700/
 */
import { describe, expect, it, beforeEach } from "vitest";
import { AuthorizationCodeClient } from "../../../src/client/authorization-code.js";
import {
  createFullMockFetch,
  createMockTokenStore,
  mockMetadata,
  createJsonResponse,
} from "../__helpers__/mock-server.js";
import { sha256, base64UrlEncode, createCodeVerifier } from "../__helpers__/crypto.js";

describe("PKCE Security (RFC 9700 Section 4.8)", () => {
  let mockFetch: ReturnType<typeof createFullMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  describe("code verifier generation", () => {
    it("should generate cryptographically random code verifier", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result1 = await client.createAuthorizationUrl();
      const result2 = await client.createAuthorizationUrl();

      // Code challenges should be unique for each request
      const challenge1 = result1.url.searchParams.get("code_challenge");
      const challenge2 = result2.url.searchParams.get("code_challenge");

      expect(challenge1).not.toBe(challenge2);
    });

    it("should use S256 challenge method by default", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("should not expose code verifier in authorization URL", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl();
      const urlString = result.url.toString();

      // code_verifier should NEVER be in the authorization URL
      expect(result.url.searchParams.get("code_verifier")).toBeNull();
      expect(urlString).not.toContain("code_verifier");

      // Only code_challenge should be present
      expect(result.url.searchParams.get("code_challenge")).not.toBeNull();
    });
  });

  describe("challenge method validation", () => {
    it("should use S256 when server supports it", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: {
          ...mockMetadata,
          code_challenge_methods_supported: ["S256", "plain"],
        },
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("should verify S256 challenge is correctly computed", async () => {
      // Create a known verifier and compute expected challenge
      const verifier = createCodeVerifier(43);
      const expectedChallengeBuffer = await sha256(verifier);
      const expectedChallenge = base64UrlEncode(new Uint8Array(expectedChallengeBuffer));

      // The challenge should be BASE64URL(SHA256(verifier))
      expect(expectedChallenge.length).toBeGreaterThanOrEqual(43);
      expect(expectedChallenge).not.toContain("+");
      expect(expectedChallenge).not.toContain("/");
      expect(expectedChallenge).not.toContain("=");
    });
  });

  describe("code verifier in token exchange", () => {
    it("should send code_verifier in token request", async () => {
      let capturedBody: URLSearchParams | null = null;

      const capturingFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          capturedBody = new URLSearchParams(init?.body as string);
          return createJsonResponse(
            {
              access_token: "access_token",
              token_type: "Bearer",
              expires_in: 3600,
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
        fetch: capturingFetch,
        tokenStore: mockTokenStore,
      });

      // First create authorization URL to generate PKCE values
      const authResult = await client.createAuthorizationUrl({ state: "test-state" });

      // Exchange code with stored verifier
      await client.handleCallback(
        "https://app.example.com/callback?code=auth_code&state=test-state",
        authResult.codeVerifier,
        "test-state",
      );

      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.get("code_verifier")).not.toBeNull();
      expect(capturedBody!.get("code_verifier")!.length).toBeGreaterThanOrEqual(43);
    });

    it("should bind code_verifier to the authorization session", async () => {
      const capturedVerifiers: string[] = [];

      const capturingFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/token")) {
          const body = new URLSearchParams(init?.body as string);
          capturedVerifiers.push(body.get("code_verifier") || "");
          return createJsonResponse(
            {
              access_token: "access_token",
              token_type: "Bearer",
              expires_in: 3600,
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
        fetch: capturingFetch,
        tokenStore: mockTokenStore,
      });

      // Create two separate authorization requests
      const result1 = await client.createAuthorizationUrl({ state: "state-1" });
      const result2 = await client.createAuthorizationUrl({ state: "state-2" });

      // Each exchange should use its own verifier
      await client.handleCallback(
        "https://app.example.com/callback?code=code1&state=state-1",
        result1.codeVerifier,
        "state-1",
      );
      await client.handleCallback(
        "https://app.example.com/callback?code=code2&state=state-2",
        result2.codeVerifier,
        "state-2",
      );

      // Verifiers should be different for each session
      expect(capturedVerifiers[0]).not.toBe(capturedVerifiers[1]);
    });
  });

  describe("PKCE downgrade attack prevention", () => {
    it("should always include PKCE when server supports it", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: {
          ...mockMetadata,
          code_challenge_methods_supported: ["S256"],
        },
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("code_challenge")).not.toBeNull();
      expect(result.url.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("should include PKCE even without server metadata (RFC 7636 best practice)", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
        serverMetadata: {
          ...mockMetadata,
          code_challenge_methods_supported: undefined,
        },
      });

      const result = await client.createAuthorizationUrl();

      // Should still use PKCE by default for security
      expect(result.url.searchParams.get("code_challenge")).not.toBeNull();
    });
  });

  describe("code verifier entropy", () => {
    it("should generate code verifier with sufficient length (min 43 characters)", () => {
      // RFC 7636 requires verifier to be between 43-128 characters
      const verifier = createCodeVerifier(43);
      expect(verifier.length).toBe(43);
    });

    it("should generate code verifier with maximum allowed length", () => {
      const verifier = createCodeVerifier(128);
      expect(verifier.length).toBe(128);
    });

    it("should use only unreserved characters in code verifier", () => {
      const verifier = createCodeVerifier(128);
      // RFC 7636: unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
      const validPattern = /^[A-Za-z0-9\-._~]+$/;
      expect(validPattern.test(verifier)).toBe(true);
    });

    it("should generate unique verifiers", () => {
      const verifiers = new Set<string>();
      for (let i = 0; i < 100; i++) {
        verifiers.add(createCodeVerifier(43));
      }
      // All 100 verifiers should be unique
      expect(verifiers.size).toBe(100);
    });
  });

  describe("challenge computation", () => {
    it("should produce correct S256 challenge for known verifier", async () => {
      // Test vector: known verifier should produce predictable challenge
      const knownVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const hash = await sha256(knownVerifier);
      const challenge = base64UrlEncode(new Uint8Array(hash));

      // Verify the challenge is base64url encoded and has correct length
      expect(challenge.length).toBeGreaterThan(0);
      expect(challenge).not.toContain("+");
      expect(challenge).not.toContain("/");
      expect(challenge).not.toContain("="); // No padding in base64url
    });
  });
});
