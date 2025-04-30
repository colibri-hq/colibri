import { beforeEach, describe, expect, it } from "vitest";
import { createMockPersistence, createTestServer } from "../utilities";
import { type Entities } from "../../src";
import type { FastifyInstance } from "fastify";

describe("OAuth Integration Tests", () => {
  let server: FastifyInstance;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(async () => {
    persistence = createMockPersistence();

    // Mock a client
    const mockClient: Entities.Client = {
      id: "test-client",
      redirect_uris: ["https://example.com/callback"],
      secret: "test-secret",
      active: false,
      revoked: false,
      scopes: [],
    };

    persistence.loadClient.mockResolvedValue(mockClient);

    // Mock authorization code
    const mockCode: Entities.AuthorizationCode = {
      code: "test-code",
      client_id: "test-client",
      redirect_uri: "https://example.com/callback",
      expires_at: new Date(Date.now() + 1000 * 60 * 10),
      scopes: ["read"],
      user_id: "",
      used_at: null,
      challenge: "test-challenge",
      challenge_method: "S256",
    };

    persistence.loadAuthorizationCode.mockResolvedValue(mockCode);

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

  it("should handle authorization request", async () => {
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

  it("should handle token request", async () => {
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
  });
});
