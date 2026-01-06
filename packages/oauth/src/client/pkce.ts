import type { PkceCodeChallengeMethod } from "../types.js";

/**
 * Default length for code verifier (43-128 characters per RFC 7636)
 */
const DEFAULT_VERIFIER_LENGTH = 43;

/**
 * Characters allowed in code verifier per RFC 7636
 * unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
 */
const UNRESERVED_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Web Crypto API - available in all modern JS runtimes
 * (browsers, Node.js 15+, Deno, Cloudflare Workers, etc.)
 */
const webcrypto = globalThis.crypto;

/**
 * Generate a cryptographically secure code verifier for PKCE
 *
 * The code verifier is a high-entropy cryptographic random string using
 * unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~",
 * with a minimum length of 43 characters and a maximum length of 128 characters.
 *
 * @param length Length of the code verifier (default: 43, range: 43-128)
 * @returns A cryptographically secure code verifier string
 * @see RFC 7636, Section 4.1
 */
export function generateCodeVerifier(length: number = DEFAULT_VERIFIER_LENGTH): string {
  // Enforce RFC 7636 length requirements
  if (length < 43 || length > 128) {
    throw new RangeError("Code verifier length must be between 43 and 128 characters");
  }

  const randomValues = new Uint8Array(length);
  webcrypto.getRandomValues(randomValues);

  let verifier = "";
  for (let i = 0; i < length; i++) {
    // Use modulo to map random bytes to allowed characters
    verifier += UNRESERVED_CHARACTERS[randomValues[i]! % UNRESERVED_CHARACTERS.length];
  }

  return verifier;
}

/**
 * Generate a code challenge from a code verifier
 *
 * For S256: Base64-URL-encoded SHA-256 hash of the code verifier
 * For plain: The code verifier itself (not recommended, use only if S256 is unavailable)
 *
 * @param verifier The code verifier to generate a challenge from
 * @param method The challenge method (default: 'S256')
 * @returns The code challenge string
 * @see RFC 7636, Section 4.2
 */
export async function generateCodeChallenge(
  verifier: string,
  method: PkceCodeChallengeMethod = "S256",
): Promise<string> {
  if (!isValidCodeVerifier(verifier)) {
    throw new Error("Invalid code verifier format");
  }

  if (method === "plain") {
    return verifier;
  }

  // S256: BASE64URL(SHA256(code_verifier))
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await webcrypto.subtle.digest("SHA-256", data);

  return base64UrlEncode(digest);
}

/**
 * Generate a random state parameter for CSRF protection
 *
 * The state parameter is used to prevent CSRF attacks during the OAuth flow.
 * It should be stored before redirecting to the authorization endpoint and
 * validated when handling the callback.
 *
 * @param length Length of the state string (default: 32)
 * @returns A cryptographically secure random state string
 */
export function generateState(length: number = 32): string {
  const randomValues = new Uint8Array(length);
  webcrypto.getRandomValues(randomValues);
  return base64UrlEncode(randomValues.buffer);
}

/**
 * Generate an OpenID Connect nonce
 *
 * The nonce is used to associate a Client session with an ID Token and to
 * mitigate replay attacks. It should be stored before the authorization
 * request and validated when receiving the ID token.
 *
 * @param length Length of the nonce string (default: 32)
 * @returns A cryptographically secure random nonce string
 */
export function generateNonce(length: number = 32): string {
  const randomValues = new Uint8Array(length);
  webcrypto.getRandomValues(randomValues);
  return base64UrlEncode(randomValues.buffer);
}

/**
 * Validate that a code verifier has the correct format
 *
 * Per RFC 7636, a code verifier must:
 * - Be between 43 and 128 characters long
 * - Contain only unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 *
 * @param verifier The code verifier to validate
 * @returns True if the verifier is valid, false otherwise
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (typeof verifier !== "string") {
    return false;
  }

  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }

  // Check that all characters are in the allowed set
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(verifier);
}

/**
 * Verify that a code challenge matches a code verifier
 *
 * @param verifier The code verifier
 * @param challenge The code challenge to verify
 * @param method The challenge method used
 * @returns True if the challenge matches the verifier
 */
export async function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: PkceCodeChallengeMethod = "S256",
): Promise<boolean> {
  try {
    const expectedChallenge = await generateCodeChallenge(verifier, method);
    return timingSafeEqual(expectedChallenge, challenge);
  } catch {
    return false;
  }
}

/**
 * Base64-URL encode a buffer or ArrayBuffer
 *
 * Implements Base64-URL encoding per RFC 4648 Section 5:
 * - Uses URL-safe characters (- instead of +, _ instead of /)
 * - No padding (= characters are removed)
 *
 * @param buffer The buffer to encode
 * @returns Base64-URL encoded string without padding
 */
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  // Convert to base64, then make URL-safe and remove padding
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * Uses XOR comparison to ensure the comparison takes the same amount
 * of time regardless of where the strings differ.
 *
 * @param a First string
 * @param b Second string
 * @returns True if the strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
