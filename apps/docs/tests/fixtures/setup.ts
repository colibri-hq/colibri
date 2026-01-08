/**
 * Vitest setup file for unit tests.
 * This file is run before each test file to set up mocks and global state.
 */
import { vi } from "vitest";

// Mock hash-wasm's md5 function for deterministic testing
vi.mock("hash-wasm", () => ({
  md5: vi.fn().mockImplementation(async (input: string) => {
    // Simple deterministic hash for testing - just use a fixed pattern
    // In real tests, we verify the URL format, not the actual hash
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    let hash = 0;
    for (const byte of data) {
      hash = ((hash << 5) - hash + byte) | 0;
    }
    return Math.abs(hash).toString(16).padStart(32, "0");
  }),
}));

// Global test utilities
declare global {
  // Add any global test utilities here
}

export {};
