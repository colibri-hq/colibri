import { beforeEach, describe, expect, it } from "vitest";
import type { createMockPersistence } from "../utilities";
import {
  type AuthorizationServerOptions,
  type Entities,
  createAuthorizationServer,
} from "../../src";

describe("User Info Endpoint Unit Tests", () => {
  let options: AuthorizationServerOptions;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(() => {
    persistence = createMockPersistence();

    options = { issuer: "http://localhost:3000", jwtSecret: "test-secret", persistence };
  });

  describe("User Info", () => {
    it("should return user information", async () => {
      const server = createAuthorizationServer(options);

      const mockToken: Entities.AccessToken = {
        token: "test-token",
        client_id: "test-client",
        user_id: "test-user",
        scopes: ["openid", "profile", "email"],
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        revoked_at: null,
      };

      persistence.loadTokenInfo.mockResolvedValue(mockToken);

      const mockUser = {
        id: "test-user",
        name: "Test User",
        email: "test@example.com",
        email_verified: true,
        birthdate: new Date("1990-01-01"),
        updated_at: new Date(),
        role: "user",
      };

      persistence.loadUserInfo.mockResolvedValue(mockUser);

      const request = { headers: { authorization: "Bearer test-token" } };

      const result = await server.handleUserInfoRequest(request);
      expect(result).toEqual({
        sub: "test-user",
        name: "Test User",
        email: "test@example.com",
        email_verified: true,
        birthdate: "1990-01-01",
        updated_at: Math.floor(mockUser.updated_at.getTime() / 1000),
        "http://localhost:3000/auth/oauth/claims/role": "user",
      });
    });

    it("should respect requested scopes", async () => {
      const server = createAuthorizationServer(options);

      const mockToken: Entities.AccessToken = {
        token: "test-token",
        client_id: "test-client",
        user_id: "test-user",
        scopes: ["openid", "email"], // Only email scope
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        revoked_at: null,
      };

      persistence.loadTokenInfo.mockResolvedValue(mockToken);

      const mockUser = {
        id: "test-user",
        name: "Test User",
        email: "test@example.com",
        email_verified: true,
        birthdate: new Date("1990-01-01"),
        updated_at: new Date(),
        role: "user",
      };

      persistence.loadUserInfo.mockResolvedValue(mockUser);

      const request = { headers: { authorization: "Bearer test-token" } };

      const result = await server.handleUserInfoRequest(request);
      expect(result).toEqual({ sub: "test-user", email: "test@example.com", email_verified: true });
    });

    it("should reject invalid token", async () => {
      const server = createAuthorizationServer(options);

      persistence.loadTokenInfo.mockResolvedValue(undefined);

      const request = { headers: { authorization: "Bearer invalid-token" } };

      await expect(server.handleUserInfoRequest(request)).rejects.toThrow();
    });

    it("should reject expired token", async () => {
      const server = createAuthorizationServer(options);

      const mockToken: Entities.AccessToken = {
        token: "test-token",
        client_id: "test-client",
        user_id: "test-user",
        scopes: ["openid", "profile", "email"],
        expires_at: new Date(Date.now() - 1000), // Expired
        revoked_at: null,
      };

      persistence.loadTokenInfo.mockResolvedValue(mockToken);

      const request = { headers: { authorization: "Bearer test-token" } };

      await expect(server.handleUserInfoRequest(request)).rejects.toThrow();
    });
  });
});
