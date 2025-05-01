import { describe, expect, it } from 'vitest';
import { decodeFromBase64, encodeToBase64 } from './base64.js';

describe('base64', () => {
  describe('encodeToBase64', () => {
    it('should encode string input to base64', () => {
      const input = 'Hello, World!';
      const result = encodeToBase64(input);
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should encode ArrayBuffer input to base64', () => {
      const input = new TextEncoder().encode('Hello, World!').buffer;
      const result = encodeToBase64(input);
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should encode TypedArray input to base64', () => {
      const input = new Uint8Array([
        72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33,
      ]);
      const result = encodeToBase64(input);
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should encode to URL-safe base64 when urlSafe is true', () => {
      const input = 'Hello, World!';
      const result = encodeToBase64(input, true, false);
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ');
    });

    it('should encode without padding when padding is false', () => {
      const input = 'Hello, World!';
      const result = encodeToBase64(input, false, false);
      expect(result).toBe('SGVsbG8sIFdvcmxkIQ');
    });
  });

  describe('decodeFromBase64', () => {
    it('should decode base64 to Uint8Array by default', () => {
      const input = 'SGVsbG8sIFdvcmxkIQ==';
      const result = decodeFromBase64(input);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(result)).toBe('Hello, World!');
    });

    it('should decode base64 to string when stringOutput is true', () => {
      const input = 'SGVsbG8sIFdvcmxkIQ==';
      const result = decodeFromBase64(input, true);
      expect(result).toBe('Hello, World!');
    });

    it('should decode URL-safe base64', () => {
      const input = 'SGVsbG8sIFdvcmxkIQ';
      const result = decodeFromBase64(input);
      expect(new TextDecoder().decode(result)).toBe('Hello, World!');
    });

    it('should throw error for invalid base64 input', () => {
      const input = 'Invalid base64!';
      expect(() => decodeFromBase64(input)).toThrow('Not a valid base64 input');
    });
  });
});
