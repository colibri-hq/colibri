import { describe, expect, it, beforeEach } from "vitest";
import type { StoredTokens } from "../../../src/client/types.js";
import { LocalStorageTokenStore } from "../../../src/client/storage/local-storage.js";

/**
 * Mock Storage implementation for testing
 */
function createMockStorage(): Storage {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] ?? null;
    },
    get length() {
      return storage.size;
    },
  };
}

/**
 * Create sample stored tokens for testing
 */
function createSampleTokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
  return {
    accessToken: "access_token_123",
    tokenType: "Bearer",
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    refreshToken: "refresh_token_456",
    scopes: ["read", "write"],
    ...overrides,
  };
}

describe("LocalStorageTokenStore", () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe("constructor", () => {
    it("should create store with default options", () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      expect(store).toBeInstanceOf(LocalStorageTokenStore);
    });

    it("should throw when localStorage is unavailable and no storage provided", () => {
      // Mock global localStorage as undefined
      const originalLocalStorage = globalThis.localStorage;
      // @ts-expect-error - intentionally setting to undefined for testing
      globalThis.localStorage = undefined;

      try {
        expect(() => new LocalStorageTokenStore()).toThrow("localStorage is not available");
      } finally {
        // Restore
        globalThis.localStorage = originalLocalStorage;
      }
    });

    it("should accept custom prefix", () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage, prefix: "custom_prefix_" });
      expect(store).toBeInstanceOf(LocalStorageTokenStore);
    });
  });

  describe("get", () => {
    it("should return null for missing tokens", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const result = await store.get("non-existent-client");
      expect(result).toBeNull();
    });

    it("should retrieve stored tokens", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();

      // Pre-populate storage
      mockStorage.setItem(
        "oauth_tokens_test-client",
        JSON.stringify({ ...tokens, expiresAt: tokens.expiresAt.toISOString() }),
      );

      const result = await store.get("test-client");
      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe(tokens.accessToken);
      expect(result?.refreshToken).toBe(tokens.refreshToken);
      expect(result?.tokenType).toBe(tokens.tokenType);
      expect(result?.expiresAt).toBeInstanceOf(Date);
      expect(result?.expiresAt.getTime()).toBe(tokens.expiresAt.getTime());
    });

    it("should handle corrupted JSON data gracefully", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });

      // Set invalid JSON
      mockStorage.setItem("oauth_tokens_test-client", "not-valid-json{{{");

      const result = await store.get("test-client");
      expect(result).toBeNull();

      // Should have cleaned up the corrupted data
      expect(mockStorage.getItem("oauth_tokens_test-client")).toBeNull();
    });

    it("should use custom prefix when retrieving", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage, prefix: "my_app_" });
      const tokens = createSampleTokens();

      mockStorage.setItem(
        "my_app_test-client",
        JSON.stringify({ ...tokens, expiresAt: tokens.expiresAt.toISOString() }),
      );

      const result = await store.get("test-client");
      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should convert ISO date string back to Date object", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const expiresAt = new Date("2025-06-15T12:00:00.000Z");

      mockStorage.setItem(
        "oauth_tokens_test-client",
        JSON.stringify({
          accessToken: "token",
          tokenType: "Bearer",
          expiresAt: expiresAt.toISOString(),
        }),
      );

      const result = await store.get("test-client");
      expect(result?.expiresAt).toBeInstanceOf(Date);
      expect(result?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
    });
  });

  describe("set", () => {
    it("should store tokens with correct key prefix", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);

      const stored = mockStorage.getItem("oauth_tokens_test-client");
      expect(stored).not.toBeNull();
    });

    it("should serialize Date objects as ISO strings", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const expiresAt = new Date("2025-06-15T12:00:00.000Z");
      const tokens = createSampleTokens({ expiresAt });

      await store.set("test-client", tokens);

      const stored = mockStorage.getItem("oauth_tokens_test-client");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.expiresAt).toBe(expiresAt.toISOString());
      expect(typeof parsed.expiresAt).toBe("string");
    });

    it("should overwrite existing tokens", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const oldTokens = createSampleTokens({ accessToken: "old_token" });
      const newTokens = createSampleTokens({ accessToken: "new_token" });

      await store.set("test-client", oldTokens);
      await store.set("test-client", newTokens);

      const result = await store.get("test-client");
      expect(result?.accessToken).toBe("new_token");
    });

    it("should use custom prefix when storing", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage, prefix: "custom_" });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);

      expect(mockStorage.getItem("custom_test-client")).not.toBeNull();
      expect(mockStorage.getItem("oauth_tokens_test-client")).toBeNull();
    });

    it("should store all token properties", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens: StoredTokens = {
        accessToken: "access_123",
        tokenType: "Bearer",
        expiresAt: new Date(),
        refreshToken: "refresh_456",
        scopes: ["read", "write", "profile"],
        idToken: "id_token_789",
      };

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(tokens.accessToken);
      expect(result?.tokenType).toBe(tokens.tokenType);
      expect(result?.refreshToken).toBe(tokens.refreshToken);
      expect(result?.scopes).toStrictEqual(tokens.scopes);
      expect(result?.idToken).toBe(tokens.idToken);
    });
  });

  describe("clear", () => {
    it("should remove tokens for specific client", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("client-1", tokens);
      await store.set("client-2", tokens);

      await store.clear("client-1");

      expect(await store.get("client-1")).toBeNull();
      expect(await store.get("client-2")).not.toBeNull();
    });

    it("should not throw for non-existent client", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });

      await expect(store.clear("non-existent")).resolves.not.toThrow();
    });

    it("should use custom prefix when clearing", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage, prefix: "custom_" });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      await store.clear("test-client");

      expect(mockStorage.getItem("custom_test-client")).toBeNull();
    });
  });

  describe("clearAll", () => {
    it("should remove all tokens with the prefix", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("client-1", tokens);
      await store.set("client-2", tokens);
      await store.set("client-3", tokens);

      await store.clearAll();

      expect(await store.get("client-1")).toBeNull();
      expect(await store.get("client-2")).toBeNull();
      expect(await store.get("client-3")).toBeNull();
    });

    it("should not remove keys with different prefix", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      mockStorage.setItem("other_prefix_data", "some data");

      await store.clearAll();

      expect(mockStorage.getItem("other_prefix_data")).toBe("some data");
    });

    it("should handle empty storage", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });

      await expect(store.clearAll()).resolves.not.toThrow();
    });

    it("should only remove keys with matching custom prefix", async () => {
      const store1 = new LocalStorageTokenStore({ storage: mockStorage, prefix: "app1_" });
      const store2 = new LocalStorageTokenStore({ storage: mockStorage, prefix: "app2_" });
      const tokens = createSampleTokens();

      await store1.set("client", tokens);
      await store2.set("client", tokens);

      await store1.clearAll();

      expect(await store1.get("client")).toBeNull();
      expect(await store2.get("client")).not.toBeNull();
    });
  });

  describe("sessionStorage support", () => {
    it("should work with sessionStorage-like implementation", async () => {
      const sessionStorage = createMockStorage();
      const store = new LocalStorageTokenStore({ storage: sessionStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string client ID", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("", tokens);
      const result = await store.get("");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should handle client IDs with special characters", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const tokens = createSampleTokens();
      const clientId = "client:with/special@chars#123";

      await store.set(clientId, tokens);
      const result = await store.get(clientId);

      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should handle tokens without optional fields", async () => {
      const store = new LocalStorageTokenStore({ storage: mockStorage });
      const minimalTokens: StoredTokens = {
        accessToken: "token",
        tokenType: "Bearer",
        expiresAt: new Date(),
        scopes: [],
      };

      await store.set("test-client", minimalTokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(minimalTokens.accessToken);
      expect(result?.refreshToken).toBeUndefined();
      expect(result?.scopes).toStrictEqual([]);
    });
  });
});
