/**
 * Token Storage
 * =============
 *
 * This module provides token storage implementations for persisting OAuth tokens.
 *
 * Available implementations:
 * - `MemoryTokenStore` - In-memory storage (default, good for testing/SSR)
 * - `LocalStorageTokenStore` - Browser localStorage storage
 * - `SecureTokenStore` - Encrypted localStorage storage using AES-256-GCM
 *
 * @example
 * ```typescript
 * import {
 *   MemoryTokenStore,
 *   LocalStorageTokenStore,
 *   SecureTokenStore,
 * } from "@colibri-hq/oauth/client/storage";
 *
 * // In-memory storage (testing, SSR)
 * const memoryStore = new MemoryTokenStore();
 *
 * // Browser localStorage
 * const localStore = new LocalStorageTokenStore();
 *
 * // Encrypted storage
 * const secureStore = new SecureTokenStore({
 *   key: "user-specific-secret",
 * });
 * ```
 *
 * @module
 */

export { MemoryTokenStore } from "./memory.js";
export { LocalStorageTokenStore } from "./local-storage.js";
export type { LocalStorageTokenStoreOptions } from "./local-storage.js";
export { SecureTokenStore } from "./secure.js";
export type { SecureTokenStoreOptions } from "./secure.js";

// Re-export types for convenience
export type { TokenStore, StoredTokens } from "../types.js";
