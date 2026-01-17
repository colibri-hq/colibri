export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export function encodeToBase64(
  input: ArrayBufferLike | TypedArray | Buffer | string,
  urlSafe: boolean = false,
  padding: boolean = true,
): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input as ArrayBuffer);
  const chunkSize = 0x8000;
  const values = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    values.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize))));
  }

  let base64 = btoa(values.join(""));

  if (urlSafe) {
    base64 = base64ToBase64url(base64);
  }

  if (!padding) {
    base64 = removeBase64Padding(base64);
  }

  return base64;
}

export function decodeFromBase64(base64: string): Uint8Array;
export function decodeFromBase64(base64: string, stringOutput: undefined): Uint8Array;
export function decodeFromBase64(base64: string, stringOutput: false): Uint8Array;
export function decodeFromBase64(base64: string, stringOutput: true): string;
export function decodeFromBase64(base64: string, stringOutput: boolean): Uint8Array | string;
export function decodeFromBase64(
  base64: string,
  stringOutput: undefined | boolean = false,
): Uint8Array | string {
  let urlSafe = false;

  if (/^[0-9a-zA-Z_-]+={0,2}$/.test(base64)) {
    urlSafe = true;
  } else if (!/^[0-9a-zA-Z+/]*={0,2}$/.test(base64)) {
    throw new Error("Not a valid base64 input");
  }

  if (urlSafe) {
    base64 = base64urlToBase64(base64);
  }

  const bytes = new Uint8Array(
    atob(base64)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );

  return stringOutput ? new TextDecoder().decode(bytes) : bytes;
}

function base64ToBase64url(value: string) {
  return value.replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlToBase64(value: string) {
  return value.replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");
}

function removeBase64Padding(value: string) {
  return value.replace(/=/g, "");
}
