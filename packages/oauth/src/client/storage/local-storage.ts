import type { StoredTokens, TokenStore } from "../types.js";

/**
 * Default storage key prefix
 */
const DEFAULT_PREFIX = "oauth_tokens_";

/**
 * Options for LocalStorageTokenStore
 */
export interface LocalStorageTokenStoreOptions {
  /**
   * Prefix for storage keys
   *
   * @default "oauth_tokens_"
   */
  prefix?: string | undefined;

  /**
   * Storage implementation to use
   *
   * Defaults to `localStorage`. Can be set to `sessionStorage` for
   * per-session token storage.
   */
  storage?: Storage | undefined;
}

/**
 * Browser localStorage-based token store
 *
 * Stores tokens in the browser's localStorage (or sessionStorage).
 * Tokens persist across page reloads and browser sessions.
 *
 * **Security considerations:**
 * - Tokens stored in localStorage are accessible to any JavaScript on the page
 * - Do not use this store for highly sensitive applications
 * - Consider using `SecureTokenStore` for encrypted storage
 *
 * @example
 * ```typescript
 * // Use localStorage (default)
 * const store = new LocalStorageTokenStore();
 *
 * // Use sessionStorage
 * const sessionStore = new LocalStorageTokenStore({
 *   storage: sessionStorage,
 * });
 *
 * // Custom prefix
 * const customStore = new LocalStorageTokenStore({
 *   prefix: "my_app_oauth_",
 * });
 * ```
 */
export class LocalStorageTokenStore implements TokenStore {
  readonly #prefix: string;
  readonly #storage: Storage;

  constructor(options: LocalStorageTokenStoreOptions = {}) {
    this.#prefix = options.prefix ?? DEFAULT_PREFIX;

    // Use provided storage or default to localStorage
    // Check if we're in a browser environment
    if (options.storage) {
      this.#storage = options.storage;
    } else if (typeof localStorage !== "undefined") {
      this.#storage = localStorage;
    } else {
      throw new Error(
        "localStorage is not available. " +
          "Either provide a storage implementation or use MemoryTokenStore.",
      );
    }
  }

  async get(clientId: string): Promise<StoredTokens | null> {
    const key = this.#getKey(clientId);
    const data = this.#storage.getItem(key);

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data) as StoredTokensJson;

      // Convert ISO date strings back to Date objects
      return {
        ...parsed,
        expiresAt: new Date(parsed.expiresAt),
      };
    } catch {
      // Invalid data, clear it
      this.#storage.removeItem(key);
      return null;
    }
  }

  async set(clientId: string, tokens: StoredTokens): Promise<void> {
    const key = this.#getKey(clientId);

    // Convert Date to ISO string for JSON serialization
    const data: StoredTokensJson = {
      ...tokens,
      expiresAt: tokens.expiresAt.toISOString(),
    };

    this.#storage.setItem(key, JSON.stringify(data));
  }

  async clear(clientId: string): Promise<void> {
    const key = this.#getKey(clientId);
    this.#storage.removeItem(key);
  }

  async clearAll(): Promise<void> {
    // Find and remove all keys with our prefix
    const keysToRemove: string[] = [];

    for (let i = 0; i < this.#storage.length; i++) {
      const key = this.#storage.key(i);
      if (key?.startsWith(this.#prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.#storage.removeItem(key);
    }
  }

  #getKey(clientId: string): string {
    return `${this.#prefix}${clientId}`;
  }
}

/**
 * Internal type for JSON serialization (Date as ISO string)
 */
type StoredTokensJson = Omit<StoredTokens, "expiresAt"> & {
  expiresAt: string;
};
