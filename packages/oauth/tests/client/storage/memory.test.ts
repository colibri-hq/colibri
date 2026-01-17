import { describe, expect, it, beforeEach } from "vitest";
import type { StoredTokens } from "../../../src/client/types.js";
import { MemoryTokenStore } from "../../../src/client/storage/memory.js";

describe("MemoryTokenStore", () => {
  let store: MemoryTokenStore;

  const createTokens = (overrides?: Partial<StoredTokens>): StoredTokens => ({
    accessToken: "access_token_123",
    refreshToken: "refresh_token_456",
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    scopes: ["openid", "profile"],
    ...overrides,
  });

  beforeEach(() => {
    store = new MemoryTokenStore();
  });

  describe("get", () => {
    it("should return null for non-existent client", async () => {
      const result = await store.get("non-existent");
      expect(result).toBeNull();
    });

    it("should return stored tokens for existing client", async () => {
      const tokens = createTokens();
      await store.set("client1", tokens);

      const result = await store.get("client1");
      expect(result).toEqual(tokens);
    });
  });

  describe("set", () => {
    it("should store tokens for a client", async () => {
      const tokens = createTokens();
      await store.set("client1", tokens);

      const result = await store.get("client1");
      expect(result).toEqual(tokens);
    });

    it("should overwrite existing tokens", async () => {
      const tokens1 = createTokens({ accessToken: "token1" });
      const tokens2 = createTokens({ accessToken: "token2" });

      await store.set("client1", tokens1);
      await store.set("client1", tokens2);

      const result = await store.get("client1");
      expect(result?.accessToken).toBe("token2");
    });

    it("should store tokens for multiple clients", async () => {
      const tokens1 = createTokens({ accessToken: "token1" });
      const tokens2 = createTokens({ accessToken: "token2" });

      await store.set("client1", tokens1);
      await store.set("client2", tokens2);

      const result1 = await store.get("client1");
      const result2 = await store.get("client2");

      expect(result1?.accessToken).toBe("token1");
      expect(result2?.accessToken).toBe("token2");
    });
  });

  describe("clear", () => {
    it("should clear tokens for a specific client", async () => {
      const tokens = createTokens();
      await store.set("client1", tokens);
      await store.set("client2", tokens);

      await store.clear("client1");

      expect(await store.get("client1")).toBeNull();
      expect(await store.get("client2")).not.toBeNull();
    });

    it("should not throw when clearing non-existent client", async () => {
      await expect(store.clear("non-existent")).resolves.not.toThrow();
    });
  });

  describe("clearAll", () => {
    it("should clear all stored tokens", async () => {
      const tokens = createTokens();
      await store.set("client1", tokens);
      await store.set("client2", tokens);
      await store.set("client3", tokens);

      await store.clearAll();

      expect(await store.get("client1")).toBeNull();
      expect(await store.get("client2")).toBeNull();
      expect(await store.get("client3")).toBeNull();
    });

    it("should not throw when store is empty", async () => {
      await expect(store.clearAll()).resolves.not.toThrow();
    });
  });

  describe("token properties", () => {
    it("should preserve all token properties", async () => {
      const tokens = createTokens({
        accessToken: "access_123",
        refreshToken: "refresh_456",
        idToken: "id_token_789",
        tokenType: "DPoP",
        scopes: ["openid", "profile", "email"],
      });

      await store.set("client1", tokens);
      const result = await store.get("client1");

      expect(result?.accessToken).toBe("access_123");
      expect(result?.refreshToken).toBe("refresh_456");
      expect(result?.idToken).toBe("id_token_789");
      expect(result?.tokenType).toBe("DPoP");
      expect(result?.scopes).toEqual(["openid", "profile", "email"]);
    });

    it("should preserve Date objects", async () => {
      const expiresAt = new Date(Date.now() + 7200 * 1000);
      const tokens = createTokens({ expiresAt });

      await store.set("client1", tokens);
      const result = await store.get("client1");

      expect(result?.expiresAt).toEqual(expiresAt);
      expect(result?.expiresAt).toBeInstanceOf(Date);
    });

    it("should handle tokens without optional fields", async () => {
      const tokens: StoredTokens = {
        accessToken: "access_only",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: [],
      };

      await store.set("client1", tokens);
      const result = await store.get("client1");

      expect(result?.accessToken).toBe("access_only");
      expect(result?.refreshToken).toBeUndefined();
      expect(result?.idToken).toBeUndefined();
    });
  });
});
