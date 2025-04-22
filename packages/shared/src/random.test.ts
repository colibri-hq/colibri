import { describe, it, expect, vi } from 'vitest';
import {
  generateRandomString,
  generateRandomBytes,
  generateRandomDigits,
  generateRandomUuid,
} from './random';

describe('random', () => {
  describe('generateRandomString', () => {
    it('should generate a string of the specified length', () => {
      const length = 10;
      const result = generateRandomString(length);
      expect(result).toHaveLength(length);
    });

    it('should use the provided alphabet when specified', () => {
      const alphabet = 'abc123';
      const result = generateRandomString(5, alphabet);
      expect(result).toMatch(/^[abc123]{5}$/);
    });
  });

  describe('generateRandomBytes', () => {
    it('should generate a hex string of the specified length', () => {
      const amount = 16;
      const result = generateRandomBytes(amount);
      expect(result).toMatch(/^[0-9a-f]{32}$/); // 16 bytes = 32 hex characters
    });
  });

  describe('generateRandomDigits', () => {
    it('should generate a string of random digits of the specified length', () => {
      const amount = 5;
      const result = generateRandomDigits(amount);
      expect(result).toMatch(/^\d{5}$/);
    });
  });

  describe('generateRandomUuid', () => {
    it('should generate a valid UUID', () => {
      const result = generateRandomUuid();
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });
}); 