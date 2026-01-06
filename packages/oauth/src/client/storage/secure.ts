import type { StoredTokens, TokenStore } from "../types.js";

/**
 * Default storage key prefix for encrypted tokens
 */
const DEFAULT_PREFIX = "oauth_secure_";

/**
 * AES-GCM algorithm parameters
 */
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

/**
 * Web Crypto API - available in all modern JS runtimes
 * (browsers, Node.js 15+, Deno, Cloudflare Workers, etc.)
 */
const webcrypto = globalThis.crypto;

/**
 * Options for SecureTokenStore
 */
export interface SecureTokenStoreOptions {
  /**
   * Encryption key (must be 32 bytes for AES-256)
   *
   * Can be:
   * - A string (will be hashed to derive a key)
   * - A CryptoKey (already derived)
   * - A Uint8Array (raw key bytes)
   */
  key: string | CryptoKey | Uint8Array;

  /**
   * Prefix for storage keys
   *
   * @default "oauth_secure_"
   */
  prefix?: string | undefined;

  /**
   * Storage implementation to use
   *
   * Defaults to `localStorage`. Can be set to `sessionStorage` for
   * per-session encrypted token storage.
   */
  storage?: Storage | undefined;
}

/**
 * Encrypted token store using Web Crypto API
 *
 * Stores tokens encrypted with AES-256-GCM in the browser's localStorage.
 * Provides an additional layer of security over plain localStorage storage.
 *
 * **Security considerations:**
 * - The encryption key should be derived from a user-specific secret
 * - Consider using a key derivation function (PBKDF2) for password-based keys
 * - The key itself should never be stored in localStorage
 *
 * @example
 * ```typescript
 * // Using a password (will be hashed)
 * const store = new SecureTokenStore({
 *   key: "user-specific-secret",
 * });
 *
 * // Using a pre-derived CryptoKey
 * const cryptoKey = await crypto.subtle.importKey(
 *   "raw",
 *   keyBytes,
 *   { name: "AES-GCM" },
 *   false,
 *   ["encrypt", "decrypt"],
 * );
 * const store = new SecureTokenStore({ key: cryptoKey });
 * ```
 */
export class SecureTokenStore implements TokenStore {
  readonly #prefix: string;
  readonly #storage: Storage;
  #cryptoKey: CryptoKey | null = null;
  readonly #keySource: string | CryptoKey | Uint8Array;

  constructor(options: SecureTokenStoreOptions) {
    this.#prefix = options.prefix ?? DEFAULT_PREFIX;
    this.#keySource = options.key;

    // Use provided storage or default to localStorage
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
    const encrypted = this.#storage.getItem(key);

    if (!encrypted) {
      return null;
    }

    try {
      const cryptoKey = await this.#getCryptoKey();
      const decrypted = await this.#decrypt(encrypted, cryptoKey);
      const parsed = JSON.parse(decrypted) as StoredTokensJson;

      return {
        ...parsed,
        expiresAt: new Date(parsed.expiresAt),
      };
    } catch {
      // Invalid or corrupted data, clear it
      this.#storage.removeItem(key);
      return null;
    }
  }

  async set(clientId: string, tokens: StoredTokens): Promise<void> {
    const key = this.#getKey(clientId);

    const data: StoredTokensJson = {
      ...tokens,
      expiresAt: tokens.expiresAt.toISOString(),
    };

    const cryptoKey = await this.#getCryptoKey();
    const encrypted = await this.#encrypt(JSON.stringify(data), cryptoKey);

    this.#storage.setItem(key, encrypted);
  }

  async clear(clientId: string): Promise<void> {
    const key = this.#getKey(clientId);
    this.#storage.removeItem(key);
  }

  async clearAll(): Promise<void> {
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

  /**
   * Get or derive the CryptoKey for encryption/decryption
   */
  async #getCryptoKey(): Promise<CryptoKey> {
    if (this.#cryptoKey) {
      return this.#cryptoKey;
    }

    this.#cryptoKey = await this.#deriveKey(this.#keySource);
    return this.#cryptoKey;
  }

  /**
   * Derive a CryptoKey from various input types
   */
  async #deriveKey(source: string | CryptoKey | Uint8Array): Promise<CryptoKey> {
    // Already a CryptoKey
    if (source instanceof CryptoKey) {
      return source;
    }

    // Raw key bytes
    if (source instanceof Uint8Array) {
      // Create a fresh ArrayBuffer to avoid SharedArrayBuffer issues
      const buffer = new Uint8Array(source).buffer as ArrayBuffer;
      return webcrypto.subtle.importKey(
        "raw",
        buffer,
        { name: ALGORITHM },
        false,
        ["encrypt", "decrypt"],
      );
    }

    // String - derive key using PBKDF2
    return this.#deriveKeyFromPassword(source);
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  async #deriveKeyFromPassword(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await webcrypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    // Use a fixed salt (in production, consider per-user salts stored separately)
    // This salt is fine for our use case since we're not storing passwords
    const salt = encoder.encode("oauth_secure_token_store_v1");

    // Derive the actual encryption key
    return webcrypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    );
  }

  /**
   * Encrypt data using AES-GCM
   */
  async #encrypt(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate a random IV for each encryption
    const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encrypted = await webcrypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      dataBuffer,
    );

    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Encode as base64 for storage
    return base64Encode(combined);
  }

  /**
   * Decrypt data using AES-GCM
   */
  async #decrypt(encrypted: string, key: CryptoKey): Promise<string> {
    // Decode from base64
    const combined = base64Decode(encrypted);

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await webcrypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}

/**
 * Internal type for JSON serialization
 */
type StoredTokensJson = Omit<StoredTokens, "expiresAt"> & {
  expiresAt: string;
};

/**
 * Base64 encode a Uint8Array
 */
function base64Encode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary);
}

/**
 * Base64 decode a string to Uint8Array
 */
function base64Decode(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i);
  }
  return data;
}
