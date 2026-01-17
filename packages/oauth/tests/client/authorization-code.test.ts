import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AuthorizationCodeClient } from "../../src/client/authorization-code.js";
import {
  ConfigurationError,
  IssuerMismatchError,
  OAuthClientError,
  StateMismatchError,
} from "../../src/client/errors.js";
import {
  createMockFetch,
  createJsonResponse,
  createErrorResponse,
  mockMetadata,
  mockTokenResponse,
  createMockTokenStore,
  createFullMockFetch,
} from "./__helpers__/mock-server.js";

describe("AuthorizationCodeClient", () => {
  let mockFetch: ReturnType<typeof createMockFetch>;
  let mockTokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    mockFetch = createFullMockFetch();
    mockTokenStore = createMockTokenStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with valid configuration", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
      });

      expect(client.issuer.toString()).toBe("https://auth.example.com/");
      expect(client.clientId).toBe("test-client");
    });

    it("should throw ConfigurationError when redirectUri is missing", () => {
      expect(() => {
        new AuthorizationCodeClient({
          issuer: "https://auth.example.com",
          clientId: "test-client",
          // @ts-expect-error - testing runtime validation
          redirectUri: undefined,
          fetch: mockFetch,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when issuer is missing", () => {
      expect(() => {
        new AuthorizationCodeClient({
          // @ts-expect-error - testing runtime validation
          issuer: undefined,
          clientId: "test-client",
          redirectUri: "https://app.example.com/callback",
          fetch: mockFetch,
        });
      }).toThrow(ConfigurationError);
    });

    it("should throw ConfigurationError when clientId is missing", () => {
      expect(() => {
        new AuthorizationCodeClient({
          issuer: "https://auth.example.com",
          // @ts-expect-error - testing runtime validation
          clientId: undefined,
          redirectUri: "https://app.example.com/callback",
          fetch: mockFetch,
        });
      }).toThrow(ConfigurationError);
    });

    it("should accept URL object for issuer", () => {
      const client = new AuthorizationCodeClient({
        issuer: new URL("https://auth.example.com"),
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
      });

      expect(client.issuer.toString()).toBe("https://auth.example.com/");
    });
  });

  describe("createAuthorizationUrl", () => {
    it("should generate valid authorization URL with PKCE", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.origin).toBe("https://auth.example.com");
      expect(result.url.pathname).toBe("/authorize");

      // Check required parameters
      expect(result.url.searchParams.get("response_type")).toBe("code");
      expect(result.url.searchParams.get("client_id")).toBe("test-client");
      expect(result.url.searchParams.get("redirect_uri")).toBe("https://app.example.com/callback");
      expect(result.url.searchParams.get("state")).toBe(result.state);

      // Check PKCE parameters
      expect(result.url.searchParams.get("code_challenge")).toBeTruthy();
      expect(result.url.searchParams.get("code_challenge_method")).toBe("S256");

      // Check return values
      expect(result.codeVerifier).toBeTruthy();
      expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(result.state).toBeTruthy();
    });

    it("should include state parameter for CSRF protection", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.state).toBeTruthy();
      expect(result.state.length).toBeGreaterThan(0);
      expect(result.url.searchParams.get("state")).toBe(result.state);
    });

    it("should use custom state when provided", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({ state: "custom-state-123" });

      expect(result.state).toBe("custom-state-123");
      expect(result.url.searchParams.get("state")).toBe("custom-state-123");
    });

    it("should include custom scopes", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid", "profile", "email"],
      });

      expect(result.url.searchParams.get("scope")).toBe("openid profile email");
    });

    it("should include nonce for OpenID Connect when openid scope is requested", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({ scopes: ["openid", "profile"] });

      expect(result.nonce).toBeTruthy();
      expect(result.url.searchParams.get("nonce")).toBe(result.nonce);
    });

    it("should use custom nonce when provided", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        scopes: ["openid"],
        nonce: "custom-nonce-456",
      });

      expect(result.nonce).toBe("custom-nonce-456");
      expect(result.url.searchParams.get("nonce")).toBe("custom-nonce-456");
    });

    it("should not include nonce when openid scope is not requested", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({ scopes: ["read", "write"] });

      expect(result.nonce).toBeUndefined();
      expect(result.url.searchParams.has("nonce")).toBe(false);
    });

    it("should include additional parameters", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl({
        additionalParams: { login_hint: "user@example.com", prompt: "consent" },
      });

      expect(result.url.searchParams.get("login_hint")).toBe("user@example.com");
      expect(result.url.searchParams.get("prompt")).toBe("consent");
    });

    it("should throw when server requires PAR but usePAR is false", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: { ...mockMetadata, require_pushed_authorization_requests: true },
        usePAR: false,
      });

      await expect(client.createAuthorizationUrl()).rejects.toThrow(ConfigurationError);
    });

    it("should use default scopes from configuration", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        scopes: ["openid", "profile"],
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.createAuthorizationUrl();

      expect(result.url.searchParams.get("scope")).toBe("openid profile");
    });

    it("should generate unique PKCE values for each call", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result1 = await client.createAuthorizationUrl();
      const result2 = await client.createAuthorizationUrl();

      expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
      expect(result1.state).not.toBe(result2.state);
    });
  });

  describe("pushAuthorizationRequest", () => {
    it("should send PAR request and return authorization URL with request_uri", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
        usePAR: true,
      });

      const result = await client.pushAuthorizationRequest();

      expect(result.requestUri).toBe("urn:ietf:params:oauth:request_uri:abc123");
      expect(result.expiresIn).toBe(60);
      expect(result.url.searchParams.get("client_id")).toBe("test-client");
      expect(result.url.searchParams.get("request_uri")).toBe(result.requestUri);
    });

    it("should include client_secret in PAR request when configured", async () => {
      const mockFetchWithPar = createMockFetch();
      mockFetchWithPar.mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/par")) {
          const body = init?.body as string;
          expect(body).toContain("client_secret=test-secret");
          return createJsonResponse({
            request_uri: "urn:ietf:params:oauth:request_uri:abc123",
            expires_in: 60,
          });
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithPar,
        serverMetadata: mockMetadata,
        usePAR: true,
      });

      await client.pushAuthorizationRequest();
    });

    it("should handle PAR error responses", async () => {
      const mockFetchWithError = createMockFetch();
      mockFetchWithError.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes("/.well-known/")) {
          return createJsonResponse(mockMetadata);
        }
        if (urlString.includes("/par")) {
          return createErrorResponse("invalid_request", "Missing required parameter", 400);
        }
        return new Response("Not Found", { status: 404 });
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithError,
        serverMetadata: mockMetadata,
        usePAR: true,
      });

      await expect(client.pushAuthorizationRequest()).rejects.toThrow(OAuthClientError);
    });
  });

  describe("exchangeCode", () => {
    it("should exchange authorization code for tokens", async () => {
      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithToken,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const result = await client.exchangeCode("auth-code-123", "code-verifier-456");

      expect(result.access_token).toBe(tokenResponse.access_token);
      expect(result.token_type).toBe("Bearer");
      expect(mockTokenStore.set).toHaveBeenCalled();
    });

    it("should send correct grant_type and code_verifier", async () => {
      const mockFetchWithValidation = createMockFetch();
      mockFetchWithValidation.mockImplementation(
        async (url: RequestInfo | URL, init?: RequestInit) => {
          const urlString = url.toString();
          if (urlString.includes("/.well-known/")) {
            return createJsonResponse(mockMetadata);
          }
          if (urlString.includes("/token")) {
            const body = init?.body as string;
            expect(body).toContain("grant_type=authorization_code");
            expect(body).toContain("code=auth-code-123");
            expect(body).toContain("code_verifier=code-verifier-456");
            expect(body).toContain("redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback");
            return createJsonResponse(mockTokenResponse());
          }
          return new Response("Not Found", { status: 404 });
        },
      );

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithValidation,
        serverMetadata: mockMetadata,
      });

      await client.exchangeCode("auth-code-123", "code-verifier-456");
    });

    it("should handle invalid grant errors", async () => {
      const mockFetchWithError = createFullMockFetch({
        tokenResponse: { error: "invalid_grant", error_description: "Code expired" },
        tokenStatus: 400,
      });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithError,
        serverMetadata: mockMetadata,
      });

      await expect(client.exchangeCode("expired-code", "verifier")).rejects.toThrow(
        OAuthClientError,
      );
    });
  });

  describe("handleCallback", () => {
    it("should extract code from callback URL and exchange for tokens", async () => {
      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithToken,
        tokenStore: mockTokenStore,
        serverMetadata: mockMetadata,
      });

      const callbackUrl =
        "https://app.example.com/callback?code=auth-code-123&state=expected-state";
      const result = await client.handleCallback(callbackUrl, "code-verifier", "expected-state");

      expect(result.access_token).toBe(tokenResponse.access_token);
    });

    it("should validate state parameter", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl = "https://app.example.com/callback?code=auth-code&state=wrong-state";

      await expect(
        client.handleCallback(callbackUrl, "code-verifier", "expected-state"),
      ).rejects.toThrow(StateMismatchError);
    });

    it("should handle error responses in callback URL", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl =
        "https://app.example.com/callback?error=access_denied&error_description=User+denied+access";

      await expect(client.handleCallback(callbackUrl, "code-verifier")).rejects.toThrow(
        OAuthClientError,
      );
    });

    it("should accept URL object as callback URL", async () => {
      const tokenResponse = mockTokenResponse();
      const mockFetchWithToken = createFullMockFetch({ tokenResponse });

      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetchWithToken,
        serverMetadata: mockMetadata,
      });

      const callbackUrl = new URL("https://app.example.com/callback?code=auth-code");
      const result = await client.handleCallback(callbackUrl, "code-verifier");

      expect(result.access_token).toBe(tokenResponse.access_token);
    });
  });

  describe("validateCallback", () => {
    it("should extract code and state from callback URL", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl = "https://app.example.com/callback?code=auth-code-123&state=test-state";
      const result = client.validateCallback(callbackUrl, "test-state");

      expect(result.code).toBe("auth-code-123");
      expect(result.state).toBe("test-state");
    });

    it("should throw StateMismatchError when state doesn't match", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl = "https://app.example.com/callback?code=auth-code&state=wrong-state";

      expect(() => client.validateCallback(callbackUrl, "expected-state")).toThrow(
        StateMismatchError,
      );
    });

    it("should throw OAuthClientError when error is in callback", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl =
        "https://app.example.com/callback?error=access_denied&error_description=User%20denied";

      expect(() => client.validateCallback(callbackUrl)).toThrow(OAuthClientError);
    });

    it("should throw when code is missing", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl = "https://app.example.com/callback?state=test-state";

      expect(() => client.validateCallback(callbackUrl, "test-state")).toThrow(OAuthClientError);
    });

    it("should validate issuer (RFC 9207) when iss is present", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl =
        "https://app.example.com/callback?code=auth-code&state=test&iss=https://auth.example.com";
      const result = client.validateCallback(callbackUrl, "test");

      expect(result.code).toBe("auth-code");
      expect(result.iss).toBe("https://auth.example.com");
    });

    it("should throw IssuerMismatchError when issuer doesn't match", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl =
        "https://app.example.com/callback?code=auth-code&state=test&iss=https://evil.example.com";

      expect(() => client.validateCallback(callbackUrl, "test")).toThrow(IssuerMismatchError);
    });

    it("should handle issuer with trailing slash normalization", () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com/",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const callbackUrl =
        "https://app.example.com/callback?code=auth-code&state=test&iss=https://auth.example.com";
      const result = client.validateCallback(callbackUrl, "test");

      expect(result.code).toBe("auth-code");
    });
  });

  describe("isPKCESupported", () => {
    it("should return true when S256 is supported", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: mockMetadata,
      });

      const result = await client.isPKCESupported();
      expect(result).toBe(true);
    });

    it("should return false when configured method is not supported", async () => {
      const client = new AuthorizationCodeClient({
        issuer: "https://auth.example.com",
        clientId: "test-client",
        redirectUri: "https://app.example.com/callback",
        fetch: mockFetch,
        serverMetadata: { ...mockMetadata, code_challenge_methods_supported: ["plain"] },
        codeChallengeMethod: "S256",
      });

      const result = await client.isPKCESupported();
      expect(result).toBe(false);
    });
  });
});
