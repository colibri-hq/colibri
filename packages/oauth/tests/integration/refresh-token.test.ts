import type { FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach } from "vitest";
import { type Entities } from "../../src/index.js";
import { createTestServer, createMockPersistence } from "../utilities";

// TODO: These tests require mock functions not yet in createMockPersistence
describe.skip("Refresh Token Grant Integration Tests", () => {
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
      refreshToken: {
        loadRefreshToken: persistence.loadRefreshToken,
        revokeRefreshToken: persistence.revokeRefreshToken,
        ttl: 86400, // 24 hours
      },
      token: {
        endpoint: "./token",
        authMethodsSupported: ["client_secret_post"],
        authSigningAlgValuesSupported: ["RS256"],
      },
    });
  });

  describe("Token Request", () => {
    it("should handle successful refresh token request", async () => {
      // Mock refresh token
      const mockRefreshToken: Entities.RefreshToken = {
        token: "test-refresh-token",
        clientId: "test-client",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        scopes: ["read"],
      };

      persistence.loadRefreshToken.mockResolvedValue(mockRefreshToken);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "refresh_token",
          refresh_token: "test-refresh-token",
          client_id: "test-client",
          client_secret: "test-secret",
          scope: "read",
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

    it("should reject expired refresh token", async () => {
      const mockRefreshToken: Entities.RefreshToken = {
        token: "test-refresh-token",
        clientId: "test-client",
        expiresAt: new Date(Date.now() - 1000), // Expired
        scopes: ["read"],
      };

      persistence.loadRefreshToken.mockResolvedValue(mockRefreshToken);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "refresh_token",
          refresh_token: "test-refresh-token",
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
          grant_type: "refresh_token",
          refresh_token: "test-refresh-token",
          client_id: "test-client",
          client_secret: "wrong-secret",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_client");
    });

    it("should reject invalid scope", async () => {
      const mockRefreshToken: Entities.RefreshToken = {
        token: "test-refresh-token",
        clientId: "test-client",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        scopes: ["read"],
      };

      persistence.loadRefreshToken.mockResolvedValue(mockRefreshToken);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "refresh_token",
          refresh_token: "test-refresh-token",
          client_id: "test-client",
          client_secret: "test-secret",
          scope: "write", // Not in original token
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_scope");
    });

    it("should revoke old refresh token after successful refresh", async () => {
      const mockRefreshToken: Entities.RefreshToken = {
        token: "test-refresh-token",
        clientId: "test-client",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        scopes: ["read"],
      };

      persistence.loadRefreshToken.mockResolvedValue(mockRefreshToken);

      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "refresh_token",
          refresh_token: "test-refresh-token",
          client_id: "test-client",
          client_secret: "test-secret",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(persistence.revokeRefreshToken).toHaveBeenCalledWith("test-refresh-token");
    });
  });
});
