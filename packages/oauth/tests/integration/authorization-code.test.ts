import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { type Entities } from "../../src/index.js";
import { createMockPersistence, createTestServer } from "../utilities";

// TODO: These tests require mock functions not yet in createMockPersistence
describe.skip("Authorization Code Grant Integration Tests", () => {
  let server: FastifyInstance;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(async () => {
    persistence = createMockPersistence();

    // Mock a client
    const mockClient: Entities.Client = {
      id: "test-client",
      redirectUris: ["https://example.com/callback"],
      secret: "test-secret",
    };

    persistence.loadClient.mockResolvedValue(mockClient);

    // Create test server with new configuration structure
    server = await createTestServer({
      issuer: "http://localhost:3000",
      jwtSecret: "test-secret",
      loadClient: persistence.loadClient,
      loadAccessToken: persistence.loadAccessToken,
      loadScopes: persistence.loadScopes,
      issueTokens: persistence.issueTokens,
      authorizationCode: {
        loadAuthorizationCode: persistence.loadAuthorizationCode,
        storeAuthorizationCode: persistence.storeAuthorizationCode,
        ttl: 600,
        endpoint: "./authorize",
        responseTypesSupported: ["code"],
        responseModesSupported: ["query"],
        codeChallengeMethodsSupported: ["S256"],
      },
      token: {
        endpoint: "./token",
        authMethodsSupported: ["client_secret_post"],
        authSigningAlgValuesSupported: ["RS256"],
      },
    });
  });

  describe("Authorization Request", () => {
    it("should handle successful authorization request", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/authorize",
        query: {
          response_type: "code",
          client_id: "test-client",
          redirect_uri: "https://example.com/callback",
          scope: "read",
          state: "test-state",
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain("https://example.com/callback");
      expect(response.headers.location).toContain("code=");
      expect(response.headers.location).toContain("state=test-state");
    });

    it("should handle authorization request with PKCE", async () => {
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

      const response = await server.inject({
        method: "GET",
        url: "/authorize",
        query: {
          response_type: "code",
          client_id: "test-client",
          redirect_uri: "https://example.com/callback",
          scope: "read",
          state: "test-state",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain("https://example.com/callback");
      expect(response.headers.location).toContain("code=");
      expect(response.headers.location).toContain("state=test-state");
    });

    it("should reject invalid client ID", async () => {
      persistence.loadClient.mockResolvedValue(undefined);

      const response = await server.inject({
        method: "GET",
        url: "/authorize",
        query: {
          response_type: "code",
          client_id: "invalid-client",
          redirect_uri: "https://example.com/callback",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_client");
    });

    it("should reject invalid redirect URI", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/authorize",
        query: {
          response_type: "code",
          client_id: "test-client",
          redirect_uri: "https://evil.com/callback",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_request");
    });
  });

  describe("Token Request", () => {
    it("should handle successful token request", async () => {
      // Mock authorization code
      const mockCode: Entities.AuthorizationCode = {
        code: "test-code",
        clientId: "test-client",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        scopes: ["read"],
      };

      persistence.loadAuthorizationCode.mockResolvedValue(mockCode);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "authorization_code",
          code: "test-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "test-secret",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("refresh_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in");
      expect(body).toHaveProperty("scope", "read");
    });

    it("should handle token request with PKCE", async () => {
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

      // Mock authorization code with PKCE
      const mockCode: Entities.AuthorizationCode = {
        code: "test-code",
        clientId: "test-client",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        scopes: ["read"],
        codeChallenge,
        codeChallengeMethod: "S256",
      };

      persistence.loadAuthorizationCode.mockResolvedValue(mockCode);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "authorization_code",
          code: "test-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "test-secret",
          code_verifier: codeVerifier,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("refresh_token");
    });

    it("should reject expired authorization code", async () => {
      const mockCode: Entities.AuthorizationCode = {
        code: "test-code",
        clientId: "test-client",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() - 1000), // Expired
        scopes: ["read"],
      };

      persistence.loadAuthorizationCode.mockResolvedValue(mockCode);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "authorization_code",
          code: "test-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "test-secret",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_grant");
    });

    it("should reject invalid client credentials", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "authorization_code",
          code: "test-code",
          redirect_uri: "https://example.com/callback",
          client_id: "test-client",
          client_secret: "wrong-secret",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_client");
    });
  });
});
