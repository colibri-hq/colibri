import { beforeAll, afterAll } from 'vitest';
import { cleanup } from '@oclif/test';

beforeAll(() => {
  // Any global setup before tests
});

afterAll(async () => {
  // Clean up after all tests
  await cleanup();
}); 