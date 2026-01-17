import { beforeEach, describe, expect, it } from "vitest";
import {
  type AuthorizationServerOptions,
  type Entities,
  createAuthorizationServer,
  DeviceAuthorizationGrant,
} from "../../src";
import { createMockPersistence } from "../utilities";

// TODO: These tests are for server-side methods that haven't been implemented yet
describe.skip("Device Authorization Grant Unit Tests", () => {
  let options: AuthorizationServerOptions;
  let persistence: ReturnType<typeof createMockPersistence>;

  beforeEach(() => {
    persistence = createMockPersistence();

    options = { issuer: "http://localhost:3000", jwtSecret: "test-secret", persistence };
  });

  describe("Device Challenge Creation", () => {
    it("should create a device challenge", async () => {
      const server = createAuthorizationServer(options);
      server.enableGrantType(DeviceAuthorizationGrant, {
        storeDeviceChallenge: persistence.storeDeviceChallenge,
        loadDeviceChallenge: persistence.loadDeviceChallenge,
        deviceCodeTtl: 600,
        pollingInterval: 5,
      });

      const mockChallenge: Entities.DeviceChallenge = {
        device_code: "test-device-code",
        user_code: "test-user-code",
        client_id: "test-client",
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        scopes: ["read"],
        approved: null,
        last_poll_at: null,
        used_at: null,
      };

      persistence.storeDeviceChallenge.mockResolvedValue(mockChallenge);

      const request = { client_id: "test-client", scope: "read" };

      const result = await server.handleDeviceAuthorizationRequest(request);
      expect(result).toEqual({
        device_code: mockChallenge.device_code,
        user_code: mockChallenge.user_code,
        verification_uri: "http://localhost:3000/device",
        verification_uri_complete: "http://localhost:3000/device?user_code=test-user-code",
        expires_in: 600,
        interval: 5,
      });
    });

    it("should validate device code", async () => {
      const server = createAuthorizationServer(options);
      server.enableGrantType(DeviceAuthorizationGrant, {
        storeDeviceChallenge: persistence.storeDeviceChallenge,
        loadDeviceChallenge: persistence.loadDeviceChallenge,
        deviceCodeTtl: 600,
        pollingInterval: 5,
      });

      const mockChallenge: Entities.DeviceChallenge = {
        device_code: "test-device-code",
        user_code: "test-user-code",
        client_id: "test-client",
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        scopes: ["read"],
        approved: true,
        last_poll_at: new Date(),
        used_at: null,
      };

      persistence.loadDeviceChallenge.mockResolvedValue(mockChallenge);

      const request = {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: "test-device-code",
        client_id: "test-client",
      };

      const result = await server.validateDeviceCode(request);
      expect(result).toBe(true);
    });

    it("should reject expired device code", async () => {
      const server = createAuthorizationServer(options);
      server.enableGrantType(DeviceAuthorizationGrant, {
        storeDeviceChallenge: persistence.storeDeviceChallenge,
        loadDeviceChallenge: persistence.loadDeviceChallenge,
        deviceCodeTtl: 600,
        pollingInterval: 5,
      });

      const mockChallenge: Entities.DeviceChallenge = {
        device_code: "test-device-code",
        user_code: "test-user-code",
        client_id: "test-client",
        expires_at: new Date(Date.now() - 1000), // Expired
        scopes: ["read"],
        approved: true,
        last_poll_at: new Date(),
        used_at: null,
      };

      persistence.loadDeviceChallenge.mockResolvedValue(mockChallenge);

      const request = {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: "test-device-code",
        client_id: "test-client",
      };

      const result = await server.validateDeviceCode(request);
      expect(result).toBe(false);
    });

    it("should handle polling too frequently", async () => {
      const server = createAuthorizationServer(options);
      server.enableGrantType(DeviceAuthorizationGrant, {
        storeDeviceChallenge: persistence.storeDeviceChallenge,
        loadDeviceChallenge: persistence.loadDeviceChallenge,
        deviceCodeTtl: 600,
        pollingInterval: 5,
      });

      const mockChallenge: Entities.DeviceChallenge = {
        device_code: "test-device-code",
        user_code: "test-user-code",
        client_id: "test-client",
        expires_at: new Date(Date.now() + 1000 * 60 * 10),
        scopes: ["read"],
        approved: null,
        last_poll_at: new Date(Date.now() - 1000), // Polled recently
        used_at: null,
      };

      persistence.loadDeviceChallenge.mockResolvedValue(mockChallenge);

      const request = {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: "test-device-code",
        client_id: "test-client",
      };

      const result = await server.validateDeviceCode(request);
      expect(result).toBe(false);
    });
  });
});
