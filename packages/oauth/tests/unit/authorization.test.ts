import { beforeEach, describe, expect, it } from "vitest";
import {
  type AuthorizationServerOptions,
  type Entities,
  createAuthorizationServer,
  AuthorizationCodeGrant,
} from "../../src";
import type { createMockPersistence } from "../utilities";

describe("Authorization Server Unit Tests", () => {
  let options: AuthorizationServerOptions;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(() => {
    persistence = createMockPersistence();

    options = {
      issuer: "http://localhost:3000",
      jwtSecret: "test-secret",
      persistence,
    };
  });

  describe("Client Validation", () => {
    it("should validate client ID and secret", async () => {
      const server = createAuthorizationServer(options);

      // Mock a valid client
      const mockClient: Entities.Client = {
        id: "test-client",
        redirectUris: ["https://example.com/callback"],
        secret: "test-secret",
      };

      persistence.loadClient.mockResolvedValue(mockClient);

      const request = {
        client_id: "test-client",
        client_secret: "test-secret",
      };

      const result = await server.validateClient(request);
      expect(result).toBe(true);
      expect(persistence.loadClient).toHaveBeenCalledWith("test-client");
    });

    it("should reject invalid client ID", async () => {
      const server = createAuthorizationServer(options);

      persistence.loadClient.mockResolvedValue(null);

      const request = {
        client_id: "invalid-client",
        client_secret: "test-secret",
      };

      const result = await server.validateClient(request);
      expect(result).toBe(false);
    });

    it("should reject invalid client secret", async () => {
      const server = createAuthorizationServer(options);

      const mockClient: Entities.Client = {
        id: "test-client",
        redirectUris: ["https://example.com/callback"],
        secret: "test-secret",
      };

      persistence.loadClient.mockResolvedValue(mockClient);

      const request = {
        client_id: "test-client",
        client_secret: "wrong-secret",
      };

      const result = await server.validateClient(request);
      expect(result).toBe(false);
    });
  });

  describe("Authorization Code Grant", () => {
    it("should validate authorization code", async () => {
      const server = createAuthorizationServer(options);
      server.enableGrantType(AuthorizationCodeGrant, {
        loadAuthorizationCode: persistence.loadAuthorizationCode,
        storeAuthorizationCode: persistence.storeAuthorizationCode,
        authorizationCodeTtl: 600,
      });

      const mockCode: Entities.AuthorizationCode = {
        code: "test-code",
        clientId: "test-client",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        scopes: ["read"],
      };

      persistence.loadAuthorizationCode.mockResolvedValue(mockCode);

      const request = {
        grant_type: "authorization_code",
        code: "test-code",
        redirect_uri: "https://example.com/callback",
        client_id: "test-client",
      };

      const result = await server.validateAuthorizationCode(request);
      expect(result).toBe(true);
      expect(persistence.loadAuthorizationCode).toHaveBeenCalledWith(
        "test-code",
      );
    });

    it("should reject expired authorization code", async () => {
      const server = createAuthorizationServer(options);
      server.enableGrantType(AuthorizationCodeGrant, {
        loadAuthorizationCode: persistence.loadAuthorizationCode,
        storeAuthorizationCode: persistence.storeAuthorizationCode,
        ttl: 600,
      });

      const mockCode: Entities.AuthorizationCode = {
        code: "test-code",
        clientId: "test-client",
        redirectUri: "https://example.com/callback",
        expiresAt: new Date(Date.now() - 1000), // Expired
        scopes: ["read"],
      };

      persistence.loadAuthorizationCode.mockResolvedValue(mockCode);

      const request = {
        grant_type: "authorization_code",
        code: "test-code",
        redirect_uri: "https://example.com/callback",
        client_id: "test-client",
      };

      const result = await server.validateAuthorizationCode(request);
      expect(result).toBe(false);
    });
  });
});
