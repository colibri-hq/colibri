/**
 * Crypto test helpers for OAuth testing
 */

/**
 * Simple Base64URL encoder for test assertions
 */
export function base64UrlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Simple Base64URL decoder for test assertions
 */
export function base64UrlDecode(encoded: string): Uint8Array {
  // Add padding if needed
  const padded = encoded + "===".slice(0, (4 - (encoded.length % 4)) % 4);
  // Replace URL-safe characters
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a SHA-256 hash for testing PKCE
 */
export async function sha256(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  return crypto.subtle.digest("SHA-256", buffer);
}

/**
 * Create a test ID token (unsigned, for testing purposes only)
 */
export function createTestIdToken(claims: {
  iss: string;
  sub: string;
  aud: string | string[];
  exp?: number;
  iat?: number;
  nonce?: string;
  at_hash?: string;
  c_hash?: string;
}): string {
  const header = { alg: "none", typ: "JWT" };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: claims.iss,
    sub: claims.sub,
    aud: claims.aud,
    exp: claims.exp ?? now + 3600,
    iat: claims.iat ?? now,
    ...claims,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));

  // Unsigned JWT (alg: none)
  return `${headerB64}.${payloadB64}.`;
}

/**
 * Decode a JWT without verification (for testing only)
 */
export function decodeJwt(token: string): { header: unknown; payload: unknown } {
  const [headerB64, payloadB64] = token.split(".");
  if (!headerB64 || !payloadB64) {
    throw new Error("Invalid JWT format");
  }

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

  return { header, payload };
}

/**
 * Calculate at_hash or c_hash claim value
 *
 * Per OpenID Connect spec, this is the left-half of the SHA-256 hash
 * of the access_token or code, base64url encoded.
 */
export async function calculateTokenHash(token: string): Promise<string> {
  const hash = await sha256(token);
  const leftHalf = new Uint8Array(hash.slice(0, 16)); // Left 128 bits for SHA-256
  return base64UrlEncode(leftHalf);
}

/**
 * Create a random string for testing
 */
export function randomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

/**
 * Create a valid PKCE code verifier
 */
export function createCodeVerifier(length: number = 43): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

/**
 * Generate test encryption key for SecureTokenStore testing
 */
export async function generateTestEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/**
 * Generate raw key bytes for testing
 */
export function generateTestKeyBytes(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32)); // 256 bits
}
