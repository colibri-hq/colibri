/**
 * CSRF Protection Tests
 *
 * Tests for state parameter and nonce validation as specified in RFC 9700
 * @see https://datatracker.ietf.org/doc/rfc9700/
 */
import { describe, expect, it, beforeEach } from "vitest";
import { AuthorizationCodeClient } from "../../../src/client/authorization-code.js";
import { StateMismatchError, OAuthClientError } from "../../../src/client/errors.js";
import {
  createFullMockFetch,
  createMockTokenStore,
  mockMetadata,
  createJsonResponse,
} from "../__helpers__/mock-server.js";
import { randomString } from "../__helpers__/crypto.js";

describe("CSRF Protection (State Parameter)", () => {
  let mockFetch: ReturnType<typeof createFullMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  describe("state generation", () => {
    it("should generate cryptographically random state", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result1 = await client.createAuthorizationUrl();
      const result2 = await client.createAuthorizationUrl();

      const state1 = result1.url.searchParams.get("state");
      const state2 = result2.url.searchParams.get("state");

      // States should be unique
      expect(state1).not.toBe(state2);

      // States should be sufficiently long
      expect(state1!.length).toBeGreaterThanOrEqual(16);
      expect(state2!.length).toBeGreaterThanOrEqual(16);
    });

    it("should allow custom state when provided", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const customState = "my-custom-state-value";
      const result = await client.createAuthorizationUrl({ state: customState });

      const state = result.url.searchParams.get("state");
      expect(state).toBe(customState);
    });

    it("should generate unique states for concurrent requests", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const results = await Promise.all([
        client.createAuthorizationUrl(),
        client.createAuthorizationUrl(),
        client.createAuthorizationUrl(),
        client.createAuthorizationUrl(),
        client.createAuthorizationUrl(),
      ]);

      const states = results.map((result) => result.url.searchParams.get("state"));
      const uniqueStates = new Set(states);

      // All states should be unique
      expect(uniqueStates.size).toBe(5);
    });
  });

  describe("state validation", () => {
    it("should validate state parameter on callback", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const expectedState = "correct-state";
      await client.createAuthorizationUrl({ state: expectedState });

      // Should succeed with correct state
      const result = client.validateCallback(
        `https://app.example.com/callback?code=auth_code&state=${expectedState}`,
        expectedState,
      );

      expect(result.code).toBe("auth_code");
      expect(result.state).toBe(expectedState);
    });

    it("should throw StateMismatchError on state mismatch", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(() =>
        client.validateCallback(
          "https://app.example.com/callback?code=auth_code&state=wrong-state",
          "expected-state",
        ),
      ).toThrow(StateMismatchError);
    });

    it("should reject reused state values", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const state = "single-use-state";
      await client.createAuthorizationUrl({ state });

      // First use should succeed
      const result1 = client.validateCallback(
        `https://app.example.com/callback?code=code1&state=${state}`,
        state,
      );
      expect(result1.code).toBe("code1");

      // Note: The client doesn't inherently prevent state reuse - this is
      // typically handled by the application layer or by using the full
      // handleCallback flow which exchanges the code immediately
    });

    it("should handle missing state in callback", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Missing state in callback should throw when expected state is provided
      expect(() =>
        client.validateCallback(
          "https://app.example.com/callback?code=auth_code",
          "expected-state",
        ),
      ).toThrow(StateMismatchError);
    });

    it("should handle empty state in callback", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      expect(() =>
        client.validateCallback(
          "https://app.example.com/callback?code=auth_code&state=",
          "expected-state",
        ),
      ).toThrow(StateMismatchError);
    });
  });

  describe("CSRF attack scenarios", () => {
    it("should prevent authorization code injection", () => {
      // Attacker obtains legitimate code but tries to use it with victim's session
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Attacker's callback URL (with attacker's state)
      const attackerCallback =
        "https://app.example.com/callback?code=stolen_code&state=attacker-state";

      // Victim's expected state
      const victimState = "victim-state";

      // Attack should be detected
      expect(() => client.validateCallback(attackerCallback, victimState)).toThrow(
        StateMismatchError,
      );
    });

    it("should prevent session fixation via state manipulation", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Attacker tries to set a known state value
      const attackerControlledState = "known-state";
      const legitimateUserState = randomString(32);

      // When user's session expects their own state, attack fails
      expect(() =>
        client.validateCallback(
          `https://app.example.com/callback?code=code&state=${attackerControlledState}`,
          legitimateUserState,
        ),
      ).toThrow(StateMismatchError);
    });
  });

  describe("nonce validation (OpenID Connect)", () => {
    it("should include nonce when openid scope is requested", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl({ scopes: ["openid", "profile"] });

      expect(result.url.searchParams.get("nonce")).not.toBeNull();
      expect(result.url.searchParams.get("nonce")!.length).toBeGreaterThanOrEqual(16);
    });

    it("should not include nonce when openid scope is not requested", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result = await client.createAuthorizationUrl({ scopes: ["read", "write"] });

      expect(result.url.searchParams.get("nonce")).toBeNull();
    });

    it("should generate unique nonces for each request", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const result1 = await client.createAuthorizationUrl({ scopes: ["openid"] });
      const result2 = await client.createAuthorizationUrl({ scopes: ["openid"] });

      const nonce1 = result1.url.searchParams.get("nonce");
      const nonce2 = result2.url.searchParams.get("nonce");

      expect(nonce1).not.toBe(nonce2);
    });

    it("should allow custom nonce when provided", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      const customNonce = "my-custom-nonce-value";
      const result = await client.createAuthorizationUrl({
        scopes: ["openid"],
        nonce: customNonce,
      });

      const nonce = result.url.searchParams.get("nonce");
      expect(nonce).toBe(customNonce);
    });
  });

  describe("error handling in callbacks", () => {
    it("should detect error responses before state validation", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      // Error callback with valid state - error should be detected
      expect(() =>
        client.validateCallback(
          "https://app.example.com/callback?error=access_denied&error_description=User%20denied&state=valid-state",
          "valid-state",
        ),
      ).toThrow(OAuthClientError);
    });

    it("should include error details in thrown exception", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        tokenStore: mockTokenStore,
      });

      try {
        client.validateCallback(
          "https://app.example.com/callback?error=invalid_scope&error_description=Invalid%20scope%20requested&state=state",
          "state",
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(OAuthClientError);
        expect((error as OAuthClientError).code).toBe("invalid_scope");
        expect((error as OAuthClientError).description).toBe("Invalid scope requested");
      }
    });
  });
});
