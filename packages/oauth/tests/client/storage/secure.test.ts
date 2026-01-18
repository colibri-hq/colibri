import { beforeEach, describe, expect, it } from "vitest";
import type { StoredTokens } from "../../../src/client/types.js";
import { SecureTokenStore } from "../../../src/client/storage/secure.js";
import { generateTestEncryptionKey, generateTestKeyBytes } from "../__helpers__/crypto.js";

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
    expiresAt: new Date(Date.now() + 3600 * 1000),
    refreshToken: "refresh_token_456",
    scopes: ["read", "write"],
    ...overrides,
  };
}

describe("SecureTokenStore", () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe("constructor", () => {
    it("should create store with string key", () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      expect(store).toBeInstanceOf(SecureTokenStore);
    });

    it("should create store with CryptoKey", async () => {
      const cryptoKey = await generateTestEncryptionKey();
      const store = new SecureTokenStore({ key: cryptoKey, storage: mockStorage });
      expect(store).toBeInstanceOf(SecureTokenStore);
    });

    it("should create store with Uint8Array key bytes", () => {
      const keyBytes = generateTestKeyBytes();
      const store = new SecureTokenStore({ key: keyBytes, storage: mockStorage });
      expect(store).toBeInstanceOf(SecureTokenStore);
    });

    it("should throw when localStorage is unavailable and no storage provided", () => {
      const originalLocalStorage = globalThis.localStorage;
      // @ts-expect-error - intentionally setting to undefined for testing
      globalThis.localStorage = undefined;

      try {
        expect(() => new SecureTokenStore({ key: "test-key" })).toThrow(
          "localStorage is not available",
        );
      } finally {
        globalThis.localStorage = originalLocalStorage;
      }
    });

    it("should accept custom prefix", () => {
      const store = new SecureTokenStore({
        key: "test-key",
        storage: mockStorage,
        prefix: "custom_secure_",
      });
      expect(store).toBeInstanceOf(SecureTokenStore);
    });
  });

  describe("encryption and decryption", () => {
    it("should encrypt tokens before storage", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);

      const stored = mockStorage.getItem("oauth_secure_test-client");
      expect(stored).not.toBeNull();
      // Encrypted data should not be readable as JSON
      expect(() => JSON.parse(stored!)).toThrow();
      // Should not contain plain text token
      expect(stored).not.toContain(tokens.accessToken);
    });

    it("should decrypt tokens on retrieval", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe(tokens.accessToken);
      expect(result?.refreshToken).toBe(tokens.refreshToken);
      expect(result?.tokenType).toBe(tokens.tokenType);
    });

    it("should produce different ciphertext with different keys", async () => {
      const store1 = new SecureTokenStore({ key: "password-1", storage: mockStorage });
      const store2 = new SecureTokenStore({ key: "password-2", storage: createMockStorage() });
      const tokens = createSampleTokens();

      await store1.set("test-client", tokens);
      await store2.set("test-client", tokens);

      // Create a new store with wrong key pointing to same storage
      const wrongKeyStore = new SecureTokenStore({ key: "wrong-password", storage: mockStorage });

      // Should not be able to decrypt with wrong key
      const result = await wrongKeyStore.get("test-client");
      expect(result).toBeNull();
    });

    it("should use unique IV for each encryption", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("client-1", tokens);
      await store.set("client-2", tokens);

      const encrypted1 = mockStorage.getItem("oauth_secure_client-1");
      const encrypted2 = mockStorage.getItem("oauth_secure_client-2");

      // Even with same plaintext, ciphertext should differ due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("key types", () => {
    it("should work with string key (PBKDF2 derivation)", async () => {
      const store = new SecureTokenStore({ key: "my-secure-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should work with CryptoKey directly", async () => {
      const cryptoKey = await generateTestEncryptionKey();
      const store = new SecureTokenStore({ key: cryptoKey, storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should work with Uint8Array key bytes", async () => {
      const keyBytes = generateTestKeyBytes();
      const store = new SecureTokenStore({ key: keyBytes, storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should cache derived CryptoKey for performance", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      // Multiple operations should reuse the same derived key
      await store.set("client-1", tokens);
      await store.set("client-2", tokens);
      await store.get("client-1");
      await store.get("client-2");

      // If it didn't cache, these would be slower (PBKDF2 is intentionally slow)
      // We can't directly verify caching, but we verify the operations work
      expect(await store.get("client-1")).not.toBeNull();
      expect(await store.get("client-2")).not.toBeNull();
    });
  });

  describe("get", () => {
    it("should return null for missing tokens", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const result = await store.get("non-existent");
      expect(result).toBeNull();
    });

    it("should return null and clear corrupted data", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });

      // Set corrupted data directly
      mockStorage.setItem("oauth_secure_test-client", "not-valid-encrypted-data");

      const result = await store.get("test-client");
      expect(result).toBeNull();

      // Should have cleaned up the corrupted data
      expect(mockStorage.getItem("oauth_secure_test-client")).toBeNull();
    });

    it("should return null for data encrypted with different key", async () => {
      const store1 = new SecureTokenStore({ key: "password-1", storage: mockStorage });
      const tokens = createSampleTokens();

      await store1.set("test-client", tokens);

      // Try to read with different key
      const store2 = new SecureTokenStore({ key: "password-2", storage: mockStorage });

      const result = await store2.get("test-client");
      expect(result).toBeNull();
    });

    it("should convert ISO date string back to Date object", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const expiresAt = new Date("2025-06-15T12:00:00.000Z");
      const tokens = createSampleTokens({ expiresAt });

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.expiresAt).toBeInstanceOf(Date);
      expect(result?.expiresAt.toISOString()).toBe(expiresAt.toISOString());
    });
  });

  describe("set", () => {
    it("should store tokens with correct key prefix", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);

      expect(mockStorage.getItem("oauth_secure_test-client")).not.toBeNull();
    });

    it("should use custom prefix when storing", async () => {
      const store = new SecureTokenStore({
        key: "test-password",
        storage: mockStorage,
        prefix: "my_secure_",
      });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);

      expect(mockStorage.getItem("my_secure_test-client")).not.toBeNull();
      expect(mockStorage.getItem("oauth_secure_test-client")).toBeNull();
    });

    it("should overwrite existing tokens", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const oldTokens = createSampleTokens({ accessToken: "old_token" });
      const newTokens = createSampleTokens({ accessToken: "new_token" });

      await store.set("test-client", oldTokens);
      await store.set("test-client", newTokens);

      const result = await store.get("test-client");
      expect(result?.accessToken).toBe("new_token");
    });

    it("should store all token properties", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
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
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("client-1", tokens);
      await store.set("client-2", tokens);

      await store.clear("client-1");

      expect(await store.get("client-1")).toBeNull();
      expect(await store.get("client-2")).not.toBeNull();
    });

    it("should not throw for non-existent client", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });

      await expect(store.clear("non-existent")).resolves.not.toThrow();
    });
  });

  describe("clearAll", () => {
    it("should remove all tokens with the prefix", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
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
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      mockStorage.setItem("other_prefix_data", "some data");

      await store.clearAll();

      expect(mockStorage.getItem("other_prefix_data")).toBe("some data");
    });

    it("should handle empty storage", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });

      await expect(store.clearAll()).resolves.not.toThrow();
    });
  });

  describe("sessionStorage support", () => {
    it("should work with sessionStorage-like implementation", async () => {
      const sessionStorage = createMockStorage();
      const store = new SecureTokenStore({ key: "test-password", storage: sessionStorage });
      const tokens = createSampleTokens();

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string client ID", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens();

      await store.set("", tokens);
      const result = await store.get("");

      expect(result?.accessToken).toBe(tokens.accessToken);
    });

    it("should handle tokens without optional fields", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
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
    });

    it("should handle very long tokens", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const longToken = "a".repeat(10000);
      const tokens = createSampleTokens({ accessToken: longToken });

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.accessToken).toBe(longToken);
    });

    it("should handle tokens with unicode characters", async () => {
      const store = new SecureTokenStore({ key: "test-password", storage: mockStorage });
      const tokens = createSampleTokens({ scopes: ["read write 日本語 emoji:🔐"] });

      await store.set("test-client", tokens);
      const result = await store.get("test-client");

      expect(result?.scopes).toStrictEqual(tokens.scopes);
    });
  });
});
