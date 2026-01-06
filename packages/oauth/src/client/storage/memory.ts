import type { StoredTokens, TokenStore } from "../types.js";

/**
 * In-memory token store
 *
 * Stores tokens in memory using a Map. Tokens are lost when the process
 * restarts. Useful for:
 * - Testing
 * - Server-side rendering (SSR)
 * - Short-lived applications
 *
 * For browser applications that need persistent storage, use
 * `LocalStorageTokenStore` or `SecureTokenStore` instead.
 */
export class MemoryTokenStore implements TokenStore {
  readonly #tokens: Map<string, StoredTokens>;

  constructor() {
    this.#tokens = new Map();
  }

  async get(clientId: string): Promise<StoredTokens | null> {
    const tokens = this.#tokens.get(clientId);
    return tokens ?? null;
  }

  async set(clientId: string, tokens: StoredTokens): Promise<void> {
    this.#tokens.set(clientId, tokens);
  }

  async clear(clientId: string): Promise<void> {
    this.#tokens.delete(clientId);
  }

  async clearAll(): Promise<void> {
    this.#tokens.clear();
  }
}
