import { describe, expect, it } from "vitest";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  isValidCodeVerifier,
  verifyCodeChallenge,
} from "../../src/client/pkce.js";

describe("PKCE Utilities", () => {
  describe("generateCodeVerifier", () => {
    it("should generate a verifier with default length", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toHaveLength(43);
      expect(isValidCodeVerifier(verifier)).toBe(true);
    });

    it("should generate a verifier with custom length", () => {
      const verifier = generateCodeVerifier(128);
      expect(verifier).toHaveLength(128);
      expect(isValidCodeVerifier(verifier)).toBe(true);
    });

    it("should throw for length below 43", () => {
      expect(() => generateCodeVerifier(42)).toThrow(RangeError);
    });

    it("should throw for length above 128", () => {
      expect(() => generateCodeVerifier(129)).toThrow(RangeError);
    });

    it("should generate unique verifiers", () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it("should only contain unreserved characters", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });
  });

  describe("generateCodeChallenge", () => {
    it("should generate S256 challenge by default", async () => {
      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = await generateCodeChallenge(verifier);

      // Known S256 hash for this verifier
      expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    });

    it("should return verifier for plain method", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier, "plain");
      expect(challenge).toBe(verifier);
    });

    it("should throw for invalid verifier", async () => {
      await expect(generateCodeChallenge("short")).rejects.toThrow();
    });
  });

  describe("verifyCodeChallenge", () => {
    it("should verify S256 challenge correctly", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier, "S256");

      const isValid = await verifyCodeChallenge(verifier, challenge, "S256");
      expect(isValid).toBe(true);
    });

    it("should verify plain challenge correctly", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier, "plain");

      const isValid = await verifyCodeChallenge(verifier, challenge, "plain");
      expect(isValid).toBe(true);
    });

    it("should reject incorrect challenge", async () => {
      const verifier = generateCodeVerifier();
      const isValid = await verifyCodeChallenge(verifier, "wrong-challenge", "S256");
      expect(isValid).toBe(false);
    });

    it("should reject incorrect verifier", async () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier1, "S256");

      const isValid = await verifyCodeChallenge(verifier2, challenge, "S256");
      expect(isValid).toBe(false);
    });
  });

  describe("isValidCodeVerifier", () => {
    it("should accept valid verifier", () => {
      expect(isValidCodeVerifier(generateCodeVerifier())).toBe(true);
    });

    it("should reject too short verifier", () => {
      expect(isValidCodeVerifier("a".repeat(42))).toBe(false);
    });

    it("should reject too long verifier", () => {
      expect(isValidCodeVerifier("a".repeat(129))).toBe(false);
    });

    it("should reject verifier with invalid characters", () => {
      expect(isValidCodeVerifier("a".repeat(43) + "!")).toBe(false);
      expect(isValidCodeVerifier("a".repeat(43) + " ")).toBe(false);
      expect(isValidCodeVerifier("a".repeat(43) + "@")).toBe(false);
    });

    it("should accept verifier with all valid characters", () => {
      const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrs";
      expect(isValidCodeVerifier(validChars)).toBe(true);
    });

    it("should reject non-string input", () => {
      expect(isValidCodeVerifier(null as any)).toBe(false);
      expect(isValidCodeVerifier(undefined as any)).toBe(false);
      expect(isValidCodeVerifier(123 as any)).toBe(false);
    });
  });

  describe("generateState", () => {
    it("should generate a random state", () => {
      const state = generateState();
      expect(typeof state).toBe("string");
      expect(state.length).toBeGreaterThan(0);
    });

    it("should generate unique states", () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe("generateNonce", () => {
    it("should generate a random nonce", () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe("string");
      expect(nonce.length).toBeGreaterThan(0);
    });

    it("should generate unique nonces", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });
});
