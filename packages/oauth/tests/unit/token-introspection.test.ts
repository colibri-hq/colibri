import { beforeEach, describe, expect, it } from "vitest";
import type { createMockPersistence } from "../utilities";
import {
  type AuthorizationServerOptions,
  type Entities,
  createAuthorizationServer,
} from "../../src";

describe("Token Introspection Unit Tests", () => {
  let options: AuthorizationServerOptions;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(() => {
    options = { issuer: "http://localhost:3000", jwtSecret: "test-secret" };
  });

  describe("Token Introspection", () => {
    it("should return active token information", async () => {
      const server = createAuthorizationServer(options);

      const mockToken: Entities.AccessToken = {
        token: "test-token",
        client_id: "test-client",
        user_id: "test-user",
        scopes: ["read"],
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        revoked_at: null,
      };

      persistence.loadTokenInfo.mockResolvedValue(mockToken);

      const request = { token: "test-token", token_type_hint: "access_token" };

      const result = await server.handleTokenIntrospectionRequest(request);
      expect(result).toEqual({
        active: true,
        client_id: "test-client",
        exp: Math.floor(mockToken.expires_at.getTime() / 1000),
        scope: "read",
        sub: "test-user",
        token_type: "Bearer",
      });
    });

    it("should return inactive for expired token", async () => {
      const server = createAuthorizationServer(options);

      const mockToken: Entities.AccessToken = {
        token: "test-token",
        client_id: "test-client",
        user_id: "test-user",
        scopes: ["read"],
        expires_at: new Date(Date.now() - 1000), // Expired
        revoked_at: null,
      };

      persistence.loadTokenInfo.mockResolvedValue(mockToken);

      const request = { token: "test-token", token_type_hint: "access_token" };

      const result = await server.handleTokenIntrospectionRequest(request);
      expect(result).toEqual({ active: false });
    });

    it("should return inactive for revoked token", async () => {
      const server = createAuthorizationServer(options);

      const mockToken: Entities.AccessToken = {
        token: "test-token",
        client_id: "test-client",
        user_id: "test-user",
        scopes: ["read"],
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        revoked_at: new Date(), // Revoked
      };

      persistence.loadTokenInfo.mockResolvedValue(mockToken);

      const request = { token: "test-token", token_type_hint: "access_token" };

      const result = await server.handleTokenIntrospectionRequest(request);
      expect(result).toEqual({ active: false });
    });

    it("should return inactive for non-existent token", async () => {
      const server = createAuthorizationServer(options);

      persistence.loadTokenInfo.mockResolvedValue(undefined);

      const request = { token: "non-existent-token", token_type_hint: "access_token" };

      const result = await server.handleTokenIntrospectionRequest(request);
      expect(result).toEqual({ active: false });
    });
  });
});
