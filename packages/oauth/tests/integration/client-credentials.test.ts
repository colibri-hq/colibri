import { beforeEach, describe, expect, it } from "vitest";
import { createMockPersistence, createTestServer } from "../utilities";
import { ClientCredentialsGrant, type Entities } from "../../src";
import type { FastifyInstance } from "fastify";

describe("Client Credentials Grant Integration Tests", () => {
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
      clientCredentials: {
        endpoint: "./token",
      },
      token: {
        endpoint: "./token",
        authMethodsSupported: ["client_secret_post"],
        authSigningAlgValuesSupported: ["RS256"],
      },
    });
  });

  describe("Token Request", () => {
    it("should handle successful token request", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "client_credentials",
          client_id: "test-client",
          client_secret: "test-secret",
          scope: "read",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("access_token");
      expect(body).toHaveProperty("token_type", "Bearer");
      expect(body).toHaveProperty("expires_in");
      expect(body).toHaveProperty("scope", "read");
    });

    it("should reject invalid client credentials", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "client_credentials",
          client_id: "test-client",
          client_secret: "wrong-secret",
          scope: "read",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_client");
    });

    it("should reject missing client credentials", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "client_credentials",
          scope: "read",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_request");
    });

    it("should reject invalid scope", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/token",
        payload: {
          grant_type: "client_credentials",
          client_id: "test-client",
          client_secret: "test-secret",
          scope: "invalid-scope",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("invalid_scope");
    });
  });
});
