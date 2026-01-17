import { beforeEach, describe, expect, it } from "vitest";
import type { createMockPersistence } from "../utilities";
import {
  type AuthorizationServerOptions,
  type Entities,
  createAuthorizationServer,
} from "../../src";

describe("Pushed Authorization Requests Unit Tests", () => {
  let options: AuthorizationServerOptions;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(() => {
    persistence = createMockPersistence();

    options = { issuer: "http://localhost:3000", jwtSecret: "test-secret", persistence };
  });

  describe("Pushed Authorization Requests", () => {
    it("should store and return request URI", async () => {
      const server = createAuthorizationServer(options);

      const mockRequest: Entities.AuthorizationRequest = {
        identifier: "test-request-uri",
        client_id: "test-client",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
        created_at: new Date(),
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        scopes: ["read"],
        state: "test-state",
        used_at: null,
      };

      persistence.storeAuthorizationRequest.mockResolvedValue(mockRequest);

      const request = {
        client_id: "test-client",
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        scope: "read",
        state: "test-state",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
      };

      const result = await server.handlePushedAuthorizationRequest(request);
      expect(result).toEqual({ request_uri: "test-request-uri", expires_in: 600 });
    });

    it("should validate stored request", async () => {
      const server = createAuthorizationServer(options);

      const mockRequest: Entities.AuthorizationRequest = {
        identifier: "test-request-uri",
        client_id: "test-client",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
        created_at: new Date(),
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        scopes: ["read"],
        state: "test-state",
        used_at: null,
      };

      persistence.loadAuthorizationRequest.mockResolvedValue(mockRequest);

      const result = await server.validateAuthorizationRequest("test-request-uri");
      expect(result).toBe(true);
    });

    it("should reject expired request", async () => {
      const server = createAuthorizationServer(options);

      const mockRequest: Entities.AuthorizationRequest = {
        identifier: "test-request-uri",
        client_id: "test-client",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
        created_at: new Date(),
        expires_at: new Date(Date.now() - 1000), // Expired
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        scopes: ["read"],
        state: "test-state",
        used_at: null,
      };

      persistence.loadAuthorizationRequest.mockResolvedValue(mockRequest);

      const result = await server.validateAuthorizationRequest("test-request-uri");
      expect(result).toBe(false);
    });

    it("should reject used request", async () => {
      const server = createAuthorizationServer(options);

      const mockRequest: Entities.AuthorizationRequest = {
        identifier: "test-request-uri",
        client_id: "test-client",
        code_challenge: "test-challenge",
        code_challenge_method: "S256",
        created_at: new Date(),
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        redirect_uri: "https://example.com/callback",
        response_type: "code",
        scopes: ["read"],
        state: "test-state",
        used_at: new Date(), // Already used
      };

      persistence.loadAuthorizationRequest.mockResolvedValue(mockRequest);

      const result = await server.validateAuthorizationRequest("test-request-uri");
      expect(result).toBe(false);
    });

    it("should reject non-existent request", async () => {
      const server = createAuthorizationServer(options);

      persistence.loadAuthorizationRequest.mockResolvedValue(undefined);

      const result = await server.validateAuthorizationRequest("non-existent-uri");
      expect(result).toBe(false);
    });
  });
});
