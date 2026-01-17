import { arrayBufferToHex, hexToArrayBuffer } from "./buffer.js";
import { generateRandomBytes } from "./random.js";

async function generateSignature(message: string, key: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));

  return arrayBufferToHex(signature);
}

async function verifySignature(message: string, signature: string, key: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return await crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    hexToArrayBuffer(signature),
    encoder.encode(message),
  );
}

export function generateNonce() {
  return generateRandomBytes(8);
}

export async function hash(message: string, algorithm: AlgorithmIdentifier = "SHA-256") {
  const buffer = new TextEncoder().encode(message);

  return await crypto.subtle.digest(algorithm, buffer);
}

export async function timingSafeEqual(a: BufferSource | string, b: BufferSource | string) {
  const encoder = new TextEncoder();
  a = typeof a === "string" ? encoder.encode(a) : a;
  b = typeof b === "string" ? encoder.encode(b) : b;

  const algorithm: HmacKeyGenParams = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.generateKey(algorithm, false, ["sign", "verify"]);
  const hmac = await crypto.subtle.sign(algorithm, key, a);

  return await crypto.subtle.verify(algorithm, key, hmac, b);
}

export async function signUrl(url: string | URL, secretKey: string) {
  const nonce = generateNonce();
  const signature = await generateSignature(`${url}${nonce}`, secretKey);
  const signedUrl = new URL(url);

  signedUrl.searchParams.append("nonce", nonce);
  signedUrl.searchParams.append("signature", signature);

  return signedUrl.toString();
}

export async function verifySignedUrl(signedUrl: string, secretKey: string) {
  const url = new URL(signedUrl);
  const nonce = url.searchParams.get("nonce");
  const signature = url.searchParams.get("signature");

  if (!nonce || !signature) {
    throw new Error("Missing nonce or signature");
  }

  // Recreate the original URL without nonce and signature parameters
  url.searchParams.delete("nonce");
  url.searchParams.delete("signature");

  return await verifySignature(`${url}${nonce}`, signature, secretKey);
}

export async function signPayload<T extends Record<string, unknown>>(
  payload: T extends { signature?: unknown; nonce?: unknown } ? never : T,
  secretKey: string,
) {
  const nonce = generateNonce();
  const signature = await generateSignature(JSON.stringify({ ...payload, nonce }), secretKey);

  return { ...payload, nonce, signature };
}

export async function verifySignedPayload<T extends Record<string, unknown>>(
  payload: T & { nonce: string; signature: string },
  secretKey: string,
) {
  const { nonce, signature, ...data } = payload;
  const verified = await verifySignature(JSON.stringify({ ...data, nonce }), signature, secretKey);

  if (!verified) {
    throw new Error("Invalid signature");
  }

  return data;
}
