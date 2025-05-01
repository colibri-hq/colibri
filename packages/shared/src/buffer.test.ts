import { describe, expect, it } from 'vitest';
import {
  arrayBufferToHex,
  createArrayBufferFromStream,
  createStreamFromArrayBuffer,
  hexToArrayBuffer,
} from './buffer.js';

describe('buffer', () => {
  describe('arrayBufferToHex', () => {
    it('should convert ArrayBuffer to hex string', () => {
      const input = new TextEncoder().encode('Hello').buffer;
      const result = arrayBufferToHex(input);
      expect(result).toBe('48656c6c6f');
    });

    it('should convert Uint8Array to hex string', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]);
      const result = arrayBufferToHex(input);
      expect(result).toBe('48656c6c6f');
    });
  });

  describe('hexToArrayBuffer', () => {
    it('should convert hex string to ArrayBuffer', () => {
      const input = '48656c6c6f';
      const result = hexToArrayBuffer(input);
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(new TextDecoder().decode(result)).toBe('Hello');
    });
  });

  describe('createStreamFromArrayBuffer', () => {
    it('should create a ReadableStream from ArrayBuffer', async () => {
      const input = new TextEncoder().encode('Hello').buffer;
      const stream = createStreamFromArrayBuffer(input);
      expect(stream).toBeInstanceOf(ReadableStream);

      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const result = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      expect(new TextDecoder().decode(result)).toBe('Hello');
    });

    it('should respect chunk size parameter', async () => {
      const input = new TextEncoder().encode('Hello World').buffer;
      const stream = createStreamFromArrayBuffer(input, 2);
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(2));
    });
  });

  describe('createArrayBufferFromStream', () => {
    it('should create ArrayBuffer from ReadableStream', async () => {
      const input = new TextEncoder().encode('Hello').buffer;
      const stream = createStreamFromArrayBuffer(input);
      const result = await createArrayBufferFromStream(stream);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(new TextDecoder().decode(result)).toBe('Hello');
    });
  });
});
