import { describe, expect, it } from "vitest";
import {
  AbortError,
  AccessDeniedError,
  AuthorizationPendingError,
  ConfigurationError,
  DiscoveryError,
  InvalidGrantError,
  IssuerMismatchError,
  NetworkError,
  OAuthClientError,
  PollingTimeoutError,
  SlowDownError,
  StateMismatchError,
  TokenExpiredError,
} from "../../src/client/errors.js";

describe("OAuth Client Errors", () => {
  describe("OAuthClientError", () => {
    it("should create error with code and description", () => {
      const error = new OAuthClientError("invalid_request", "Missing parameter");
      expect(error.code).toBe("invalid_request");
      expect(error.description).toBe("Missing parameter");
      expect(error.message).toBe("invalid_request: Missing parameter");
      expect(error.statusCode).toBe(400);
    });

    it("should create error with URI", () => {
      const error = new OAuthClientError(
        "invalid_request",
        "Missing parameter",
        "https://example.com/docs",
      );
      expect(error.uri).toBe("https://example.com/docs");
    });

    it("should support cause option", () => {
      const cause = new Error("Original error");
      const error = new OAuthClientError("server_error", "Something went wrong", undefined, {
        cause,
      });
      expect(error.cause).toBe(cause);
    });

    it("should map error codes to status codes", () => {
      expect(new OAuthClientError("invalid_request").statusCode).toBe(400);
      expect(new OAuthClientError("invalid_client").statusCode).toBe(401);
      expect(new OAuthClientError("invalid_grant").statusCode).toBe(403);
      expect(new OAuthClientError("server_error").statusCode).toBe(500);
    });

    it("should create from response", () => {
      const error = OAuthClientError.fromResponse({
        error: "invalid_request",
        error_description: "Missing scope",
        error_uri: "https://example.com/errors",
      });

      expect(error.code).toBe("invalid_request");
      expect(error.description).toBe("Missing scope");
      expect(error.uri).toBe("https://example.com/errors");
    });

    it("should convert to JSON", () => {
      const error = new OAuthClientError(
        "invalid_request",
        "Missing parameter",
        "https://example.com",
      );
      const json = error.toJSON();

      expect(json).toEqual({
        error: "invalid_request",
        error_description: "Missing parameter",
        error_uri: "https://example.com",
      });
    });

    it("should check for specific error code", () => {
      const error = new OAuthClientError("invalid_grant");
      expect(OAuthClientError.isCode(error, "invalid_grant")).toBe(true);
      expect(OAuthClientError.isCode(error, "invalid_request")).toBe(false);
      expect(OAuthClientError.isCode(new Error(), "invalid_grant")).toBe(false);
    });
  });

  describe("TokenExpiredError", () => {
    it("should create with default message", () => {
      const error = new TokenExpiredError();
      expect(error.code).toBe("expired_token");
      expect(error.description).toBe("The token has expired");
      expect(error.name).toBe("TokenExpiredError");
    });

    it("should create with custom message", () => {
      const error = new TokenExpiredError("Custom message");
      expect(error.description).toBe("Custom message");
    });
  });

  describe("InvalidGrantError", () => {
    it("should create with default message", () => {
      const error = new InvalidGrantError();
      expect(error.code).toBe("invalid_grant");
      expect(error.description).toBe("The grant is invalid");
      expect(error.name).toBe("InvalidGrantError");
    });
  });

  describe("AuthorizationPendingError", () => {
    it("should create with correct code", () => {
      const error = new AuthorizationPendingError();
      expect(error.code).toBe("authorization_pending");
      expect(error.name).toBe("AuthorizationPendingError");
    });
  });

  describe("SlowDownError", () => {
    it("should calculate new interval", () => {
      const error = new SlowDownError(5);
      expect(error.code).toBe("slow_down");
      expect(error.newInterval).toBe(10); // 5 + 5
      expect(error.name).toBe("SlowDownError");
    });
  });

  describe("AccessDeniedError", () => {
    it("should create with default message", () => {
      const error = new AccessDeniedError();
      expect(error.code).toBe("access_denied");
      expect(error.name).toBe("AccessDeniedError");
    });
  });

  describe("NetworkError", () => {
    it("should create with message", () => {
      const error = new NetworkError("Connection failed");
      expect(error.code).toBe("server_error");
      expect(error.description).toBe("Connection failed");
      expect(error.name).toBe("NetworkError");
    });
  });

  describe("DiscoveryError", () => {
    it("should create with message", () => {
      const error = new DiscoveryError("Server not found");
      expect(error.code).toBe("server_error");
      expect(error.description).toBe("Discovery failed: Server not found");
      expect(error.name).toBe("DiscoveryError");
    });
  });

  describe("StateMismatchError", () => {
    it("should create with correct message", () => {
      const error = new StateMismatchError();
      expect(error.code).toBe("invalid_request");
      expect(error.description).toContain("State parameter mismatch");
      expect(error.name).toBe("StateMismatchError");
    });
  });

  describe("IssuerMismatchError", () => {
    it("should create with expected and received issuers", () => {
      const error = new IssuerMismatchError(
        "https://expected.com",
        "https://received.com",
      );
      expect(error.code).toBe("invalid_request");
      expect(error.description).toContain("expected.com");
      expect(error.description).toContain("received.com");
      expect(error.name).toBe("IssuerMismatchError");
    });
  });

  describe("PollingTimeoutError", () => {
    it("should create with timeout", () => {
      const error = new PollingTimeoutError(300);
      expect(error.code).toBe("expired_token");
      expect(error.description).toContain("300 seconds");
      expect(error.name).toBe("PollingTimeoutError");
    });
  });

  describe("AbortError", () => {
    it("should create with correct code", () => {
      const error = new AbortError();
      expect(error.code).toBe("invalid_request");
      expect(error.description).toBe("Operation was aborted");
      expect(error.name).toBe("AbortError");
    });
  });

  describe("ConfigurationError", () => {
    it("should create with message", () => {
      const error = new ConfigurationError("Missing clientId");
      expect(error.code).toBe("invalid_request");
      expect(error.description).toBe("Configuration error: Missing clientId");
      expect(error.name).toBe("ConfigurationError");
    });
  });
});
