import { describe, it, expect, vi } from 'vitest';
import {
  sleep,
  uniqueBy,
  wrapArray,
  slugify,
  humanReadableFileSize,
  inferNameFromEmailAddress,
} from './utilities';

describe('utilities', () => {
  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates based on property', () => {
      const input = [
        { id: 1, name: 'John' },
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = uniqueBy(input, 'id');
      expect(result).toHaveLength(2);
      expect(result.map(item => item.id)).toEqual([1, 2]);
    });

    it('should remove duplicates based on function', () => {
      const input = [
        { id: 1, name: 'John' },
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = uniqueBy(input, item => item.name);
      expect(result).toHaveLength(2);
      expect(result.map(item => item.name)).toEqual(['John', 'Jane']);
    });
  });

  describe('wrapArray', () => {
    it('should wrap non-array value in array', () => {
      const input = 'single';
      const result = wrapArray(input);
      expect(result).toEqual(['single']);
    });

    it('should return array as-is', () => {
      const input = ['already', 'an', 'array'];
      const result = wrapArray(input);
      expect(result).toBe(input);
    });
  });

  describe('slugify', () => {
    it('should convert string to URL-friendly slug', () => {
      const input = 'Hello, World! This is a test.';
      const result = slugify(input);
      expect(result).toBe('hello-world-this-is-a-test');
    });

    it('should handle special characters', () => {
      const input = 'Test@#$%^&*()_+';
      const result = slugify(input);
      expect(result).toBe('test');
    });

    it('should handle multiple spaces and dashes', () => {
      const input = 'Hello   World--Test';
      const result = slugify(input);
      expect(result).toBe('hello-world-test');
    });
  });

  describe('humanReadableFileSize', () => {
    it('should format bytes correctly', () => {
      expect(humanReadableFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes correctly', () => {
      expect(humanReadableFileSize(1024 * 2)).toBe('2 kB');
    });

    it('should format megabytes correctly', () => {
      expect(humanReadableFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(humanReadableFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should handle zero bytes', () => {
      expect(humanReadableFileSize(0)).toBe('0 B');
    });
  });

  describe('inferNameFromEmailAddress', () => {
    it('should convert email to proper name format', () => {
      expect(inferNameFromEmailAddress('john.doe@example.com')).toBe('John Doe');
    });

    it('should handle plus addressing', () => {
      expect(inferNameFromEmailAddress('john.doe+test@example.com')).toBe('John Doe');
    });

    it('should handle generational suffixes', () => {
      expect(inferNameFromEmailAddress('john.smith.iii@example.com')).toBe('John Smith III');
    });

    it('should handle jr/sr suffixes', () => {
      expect(inferNameFromEmailAddress('john.smith.jr@example.com')).toBe('John Smith, Jr.');
    });

    it('should handle title prefixes', () => {
      expect(inferNameFromEmailAddress('dr.john.smith@example.com')).toBe('Dr. John Smith');
    });

    it('should handle special name patterns', () => {
      expect(inferNameFromEmailAddress('claire.smith@example.com')).toBe('Claire Smith');
      expect(inferNameFromEmailAddress('van.der.sar@example.com')).toBe('van der Sar');
      expect(inferNameFromEmailAddress("o'connor@example.com")).toBe('O\'Connor');
    });

    it('should handle Mc names', () => {
      expect(inferNameFromEmailAddress('marty.mcfly@example.com')).toBe('Marty McFly');
    });
  });
}); 